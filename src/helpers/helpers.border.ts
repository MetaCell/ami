import * as THREE from 'three';
import { helpersSlice } from '../helpers/helpers.slice';

/**
 * @module helpers/border
 */

type HelpersSliceInstance = InstanceType<NonNullable<ReturnType<typeof helpersSlice>>>;

const helpersBorder = (three: typeof THREE = window.THREE!) => {
  if (three === undefined || three.Object3D === undefined) {
    return null;
  }

  const Constructor = three.Object3D;
  return class HelpersBorder extends Constructor {
    _helpersSlice: HelpersSliceInstance;
    _visible: boolean;
    _color: THREE.ColorRepresentation;
    _material: THREE.LineBasicMaterial | null;
    _geometry: THREE.BufferGeometry | null;
    _mesh: THREE.Line | null;

    constructor(helpersSlice: HelpersSliceInstance) {
      //
      super();

      this._helpersSlice = helpersSlice;

      this._visible = true;
      this._color = 0xff0000;
      this._material = null;
      this._geometry = null;
      this._mesh = null;

      this._create();
    }

    set helpersSlice(helpersSlice: HelpersSliceInstance) {
      this._helpersSlice = helpersSlice;
      this._update();
    }

    get helpersSlice() {
      return this._helpersSlice;
    }

    // @ts-expect-error THREE.Object3D declares `visible` as a plain property; we
    // intentionally override it as an accessor to sync mesh visibility on write.
    set visible(visible: boolean) {
      this._visible = visible;
      if (this._mesh) {
        this._mesh.visible = this._visible;
      }
    }

    get visible() {
      return this._visible;
    }

    set color(color: THREE.ColorRepresentation) {
      this._color = color;
      if (this._material) {
        this._material.color.set(this._color);
      }
    }

    get color() {
      return this._color;
    }

    _create() {
      if (!this._material) {
        this._material = new three.LineBasicMaterial({
          color: this._color,
          linewidth: 1,
        });
      }

      const slicePosAttr = this._helpersSlice.geometry.attributes.position;
      if (!slicePosAttr) {
        return;
      }

      this._geometry = new three.BufferGeometry();

      // set vertices positions (outline vertices + closing vertex)
      const nbOfVertices = slicePosAttr.count;
      const positions = new Float32Array((nbOfVertices + 1) * 3);
      positions.set(slicePosAttr.array, 0);
      positions[nbOfVertices * 3] = slicePosAttr.getX(0);
      positions[nbOfVertices * 3 + 1] = slicePosAttr.getY(0);
      positions[nbOfVertices * 3 + 2] = slicePosAttr.getZ(0);
      this._geometry.setAttribute('position', new three.Float32BufferAttribute(positions, 3));

      this._mesh = new three.Line(this._geometry, this._material);
      if (this._helpersSlice.aabbSpace === 'IJK') {
        this._mesh.applyMatrix4(this._helpersSlice.stack.ijk2LPS);
      }
      this._mesh.visible = this._visible;

      // and add it!
      this.add(this._mesh);
    }

    _update() {
      // update slice
      if (this._mesh) {
        this.remove(this._mesh);
        this._mesh.geometry.dispose();
        this._mesh = null;
      }

      this._create();
    }

    dispose() {
      (this._mesh!.material as THREE.Material).dispose();
      this._mesh!.material = null;
      this._geometry!.dispose();
      this._geometry = null;
      this._material!.dispose();
      this._material = null;
    }
  };
};

// export factory
export { helpersBorder };
// default export to
export default helpersBorder(THREE);
