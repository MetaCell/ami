import type { Camera, Matrix4, Mesh, Vector2, Vector3 } from 'three';
import { COLORS } from '../core/core.colors';
import CoreUtils from '../core/core.utils';
import type { UltrasoundRegion } from '../models/models.types';
import type ModelsStack from '../models/models.stack';
import WidgetsCss from './widgets.css';

export interface WidgetControls {
  object: Camera;
  domElement: HTMLElement;
}

export interface WidgetParameter {
  calibrationFactor?: number;
  frameIndex?: number;
  hideMesh?: boolean;
  hideHandleMesh?: boolean;
  ijk2LPS?: Matrix4;
  lps2IJK?: Matrix4;
  pixelSpacing?: number;
  stack?: ModelsStack;
  ultrasoundRegions?: UltrasoundRegion[];
  worldPosition?: Vector3;
}

export interface USRegion {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
  axisX: number;
  axisY: number;
  deltaX: number;
  deltaY: number;
}

/**
 * @module Abstract Widget
 */
// Deliberately untyped: none of the 17 widgets/ files declare instance fields - every field is a
// bare `this._x = ...`. This class (and every widget built on it) only compiles because it
// extends a value of type `any` (Constructor below), which suppresses member-existence checking
// for the whole hierarchy. Giving `three` its real type here turns that into hard TS2339 errors
// across every widget file, since none of them declare their fields - out of scope for this pass.
const widgetsBase = (three = (window as any).THREE) => {
  if (three === undefined || three.Object3D === undefined) {
    return null;
  }

  const Constructor = three.Object3D;
  return class extends Constructor {
    constructor(targetMesh: Mesh, controls: WidgetControls, params: WidgetParameter) {
      super();

      this._widgetType = 'Base';

      this._params = params;
      if (params.hideMesh === true) {
        this.visible = false;
      }

      const elementStyle = document.getElementById('ami-widgets');
      if (elementStyle === null) {
        const styleEl = document.createElement('style');
        styleEl.id = 'ami-widgets';
        styleEl.innerHTML = WidgetsCss.code;
        document.head.appendChild(styleEl);
      }

      this._enabled = true;
      this._selected = false;
      this._hovered = true;
      this._active = true;

      this._colors = {
        default: COLORS.blue,
        active: COLORS.yellow,
        hover: COLORS.red,
        select: COLORS.green,
        text: COLORS.white,
        error: COLORS.lightRed,
      };
      this._color = this._colors.default;

      this._dragged = false;
      // can not call it visible because it conflicts with THREE.Object3D
      this._displayed = true;

      this._targetMesh = targetMesh;
      this._controls = controls;
      this._camera = controls.object;
      this._container = controls.domElement;

      this._worldPosition = new three.Vector3(); // LPS position
      if (params.worldPosition) {
        this._worldPosition.copy(params.worldPosition);
      } else if (this._targetMesh !== null) {
        this._worldPosition.copy(this._targetMesh.position);
      }
    }

    public initOffsets(): void {
      const box = this._container.getBoundingClientRect();

      const body = document.body;
      const docEl = document.documentElement;

      const scrollTop = window.pageYOffset || docEl.scrollTop || body.scrollTop;
      const scrollLeft = window.pageXOffset || docEl.scrollLeft || body.scrollLeft;

      const clientTop = docEl.clientTop || body.clientTop || 0;
      const clientLeft = docEl.clientLeft || body.clientLeft || 0;

      this._offsets = {
        top: Math.round(box.top + scrollTop - clientTop),
        left: Math.round(box.left + scrollLeft - clientLeft),
      };
    }

    public getMouseOffsets(
      event: MouseEvent,
      container: HTMLDivElement
    ): { x: number; y: number; screenX: number; screenY: number } {
      return {
        x: ((event.clientX - this._offsets.left) / container.offsetWidth) * 2 - 1,
        y: -((event.clientY - this._offsets.top) / container.offsetHeight) * 2 + 1,
        screenX: event.clientX - this._offsets.left,
        screenY: event.clientY - this._offsets.top,
      };
    }

    /**
     * Get area of polygon.
     *
     * @param {Array} points Ordered vertices' coordinates
     *
     * @returns {Number}
     */
    public getArea(points: Vector3[]): number {
      let area = 0;
      let j = points.length - 1; // the last vertex is the 'previous' one to the first

      for (let i = 0; i < points.length; i++) {
        area += (points[j].x + points[i].x) * (points[j].y - points[i].y);
        j = i; // j is the previous vertex to i
      }

      return Math.abs(area / 2);
    }

    /**
     * Get index of ultrasound region by data coordinates.
     *
     * @param {Array}   regions US regions
     * @param {Vector3} point   Data coordinates
     *
     * @returns {Number|null}
     */
    public getRegionByXY(regions: USRegion[], point: Vector3): number | null {
      let result = null;

      regions.some((region, ind) => {
        if (
          point.x >= region.x0 &&
          point.x <= region.x1 &&
          point.y >= region.y0 &&
          point.y <= region.y1
        ) {
          result = ind;

          return true;
        }
      });

      return result;
    }

    /**
     * Get point inside ultrasound region by data coordinates.
     *
     * @param {Object}  region US region data
     * @param {Vector3} point  Data coordinates
     *
     * @returns {Vector2|null}
     */
    public getPointInRegion(region: USRegion, point: Vector3): Vector2 | null {
      if (!region) {
        return null;
      }

      return new three.Vector2(
        (point.x - region.x0 - (region.axisX || 0)) * region.deltaX,
        (point.y - region.y0 - (region.axisY || 0)) * region.deltaY
      );
    }

    /**
     * Get point's ultrasound coordinates by data coordinates.
     *
     * @param {Array}   regions US regions
     * @param {Vector3} point   Data coordinates
     *
     * @returns {Vector2|null}
     */
    public getUsPoint(regions: USRegion[], point: Vector3): Vector2 | null {
      return this.getPointInRegion(regions[this.getRegionByXY(regions, point)!], point);
    }

    /**
     * Get distance between points inside ultrasound region.
     *
     * @param {Vector3} pointA Begin data coordinates
     * @param {Vector3} pointB End data coordinates
     *
     * @returns {Number|null}
     */
    public getUsDistance(pointA: Vector3, pointB: Vector3): number | null {
      const regions = this._params.ultrasoundRegions || [];

      if (regions.length < 1) {
        return null;
      }

      const regionA = this.getRegionByXY(regions, pointA);
      const regionB = this.getRegionByXY(regions, pointB);

      if (
        regionA === null ||
        regionB === null ||
        regionA !== regionB ||
        regions[regionA].unitsX !== 'cm' ||
        regions[regionA].unitsY !== 'cm'
      ) {
        return null;
      }

      return this.getPointInRegion(regions[regionA], pointA).distanceTo(
        this.getPointInRegion(regions[regionA], pointB)
      );
    }

    /**
     * Get distance between points
     *
     * @param {Vector3} pointA Begin world coordinates
     * @param {Vector3} pointB End world coordinates
     * @param {number}  cf     Calibration factor
     *
     * @returns {Object}
     */
    public getDistanceData(
      pointA: Vector3,
      pointB: Vector3,
      calibrationFactor: number
    ): { distance: number | null; units: string | null } {
      let distance = null;
      let units = null;

      if (calibrationFactor) {
        distance = pointA.distanceTo(pointB) * calibrationFactor;
      } else if (this._params.ultrasoundRegions && this._params.lps2IJK) {
        const usDistance = this.getUsDistance(
          CoreUtils.worldToData(this._params.lps2IJK, pointA),
          CoreUtils.worldToData(this._params.lps2IJK, pointB)
        );

        if (usDistance !== null) {
          distance = usDistance * 10;
          units = 'mm';
        } else {
          distance = pointA.distanceTo(pointB);
          units = this._params.pixelSpacing ? 'mm' : 'units';
        }
      } else {
        distance = pointA.distanceTo(pointB);
      }

      return {
        distance,
        units,
      };
    }

    public getLineData(
      pointA: Vector3,
      pointB: Vector3
    ): {
      line: Vector3;
      length: number;
      transformX: number;
      transformY: number;
      transformAngle: number;
      center: Vector3;
    } {
      const line = pointB.clone().sub(pointA);
      const center = pointB
        .clone()
        .add(pointA)
        .multiplyScalar(0.5);
      const length = line.length();
      const angle = line.angleTo(new three.Vector3(1, 0, 0));

      return {
        line,
        length,
        transformX: center.x - length / 2,
        transformY: center.y - this._container.offsetHeight,
        transformAngle: pointA.y < pointB.y ? angle : -angle,
        center,
      };
    }

    public getRectData(
      pointA: Vector3,
      pointB: Vector3
    ): {
      width: number;
      height: number;
      transformX: number;
      transformY: number;
      paddingVector: Vector3;
    } {
      const line = pointB.clone().sub(pointA);
      const vertical = line.clone().projectOnVector(new three.Vector3(0, 1, 0));
      const min = pointA.clone().min(pointB); // coordinates of the top left corner

      return {
        width: line
          .clone()
          .projectOnVector(new three.Vector3(1, 0, 0))
          .length(),
        height: vertical.length(),
        transformX: min.x,
        transformY: min.y - this._container.offsetHeight,
        paddingVector: vertical.clone().normalize(),
      };
    }

    /**
     * @param {HTMLElement} label
     * @param {Vector3}     point  label's center coordinates (default)
     * @param {Boolean}     corner if true, then point is the label's top left corner coordinates
     */
    public adjustLabelTransform(
      label: HTMLDivElement,
      point: Vector3,
      corner: boolean = false
    ): Vector2 {
      let x = Math.round(point.x - (corner ? 0 : label.offsetWidth / 2));
      let y =
        Math.round(point.y - (corner ? 0 : label.offsetHeight / 2)) - this._container.offsetHeight;

      if (x < 0) {
        x = x > -label.offsetWidth ? 0 : x + label.offsetWidth;
      } else if (x > this._container.offsetWidth - label.offsetWidth) {
        x =
          x < this._container.offsetWidth
            ? this._container.offsetWidth - label.offsetWidth
            : x - label.offsetWidth;
      }

      if (y < -this._container.offsetHeight) {
        y =
          y > -this._container.offsetHeight - label.offsetHeight
            ? -this._container.offsetHeight
            : y + label.offsetHeight;
      } else if (y > -label.offsetHeight) {
        y = y < 0 ? -label.offsetHeight : y - label.offsetHeight;
      }

      return new three.Vector2(x, y);
    }

    public worldToScreen(worldCoordinate: Vector3): Vector3 {
      const screenCoordinates = worldCoordinate.clone();
      screenCoordinates.project(this._camera);

      screenCoordinates.x = Math.round(
        ((screenCoordinates.x + 1) * this._container.offsetWidth) / 2
      );
      screenCoordinates.y = Math.round(
        ((-screenCoordinates.y + 1) * this._container.offsetHeight) / 2
      );
      screenCoordinates.z = 0;

      return screenCoordinates;
    }

    public update(): void {
      // to be overloaded
      window.console.log('update() should be overloaded!');
    }

    public updateColor(): void {
      if (this._active) {
        this._color = this._colors.active;
      } else if (this._hovered) {
        this._color = this._colors.hover;
      } else if (this._selected) {
        this._color = this._colors.select;
      } else {
        this._color = this._colors.default;
      }
    }

    public setDefaultColor(color: string): void {
      this._colors.default = color;
      if (this._handles) {
        this._handles.forEach(elem => (elem._colors.default = color));
      }
      this.update();
    }

    public show(): void {
      this.showDOM();
      this.showMesh();
      this.update();
      this._displayed = true;
    }

    public hide(): void {
      this.hideDOM();
      this.hideMesh();
      this._displayed = false;
    }

    public hideDOM(): void {
      // to be overloaded
      window.console.log('hideDOM() should be overloaded!');
    }

    public showDOM(): void {
      // to be overloaded
      window.console.log('showDOM() should be overloaded!');
    }

    public hideMesh(): void {
      this.visible = false;
    }

    public showMesh(): void {
      if (this._params.hideMesh === true) {
        return;
      }

      this.visible = true;
    }

    public free(): void {
      this._camera = null;
      this._container = null;
      this._controls = null;
      this._params = null;
      this._targetMesh = null;
    }

    get widgetType(): string {
      return this._widgetType;
    }

    get targetMesh(): Mesh | null {
      return this._targetMesh;
    }

    set targetMesh(targetMesh: Mesh) {
      this._targetMesh = targetMesh;
      this.update();
    }

    get worldPosition(): Vector3 {
      return this._worldPosition;
    }

    set worldPosition(worldPosition: Vector3) {
      this._worldPosition.copy(worldPosition);
      this.update();
    }

    get enabled(): boolean {
      return this._enabled;
    }

    set enabled(enabled: boolean) {
      this._enabled = enabled;
      this.update();
    }

    get selected(): boolean {
      return this._selected;
    }

    set selected(selected: boolean) {
      this._selected = selected;
      this.update();
    }

    get hovered(): boolean {
      return this._hovered;
    }

    set hovered(hovered: boolean) {
      this._hovered = hovered;
      this.update();
    }

    get dragged(): boolean {
      return this._dragged;
    }

    set dragged(dragged: boolean) {
      this._dragged = dragged;
      this.update();
    }

    get displayed(): boolean {
      return this._displayed;
    }

    set displayed(displayed: boolean) {
      this._displayed = displayed;
      this.update();
    }

    get active(): boolean {
      return this._active;
    }

    set active(active: boolean) {
      this._active = active;
      this.update();
    }

    get color(): string {
      return this._color;
    }

    set color(color: string) {
      this._color = color;
      this.update();
    }
  };
};

export { widgetsBase };
export default widgetsBase();
