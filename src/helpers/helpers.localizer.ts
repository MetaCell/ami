import * as THREE from 'three';
/** * Imports ***/
import ShadersFragment from '../shaders/shaders.localizer.fragment';
import ShadersUniform from '../shaders/shaders.localizer.uniform';
import ShadersVertex from '../shaders/shaders.localizer.vertex';

/**
 * @module helpers/localizer
 */
const helpersLocalizer = (three: typeof THREE = window.THREE!) => {
  if (three === undefined || three.Object3D === undefined) {
    return null;
  }

  const Constructor = three.Object3D;
  return class HelpersLocalizer extends Constructor {
    _stack: any;
    _referencePlane: any;
    _plane1: any;
    _color1: THREE.ColorRepresentation | null;
    _plane2: any;
    _color2: THREE.ColorRepresentation | null;
    _plane3: any;
    _color3: THREE.ColorRepresentation | null;
    _canvasWidth: number;
    _canvasHeight: number;
    _shadersFragment: any;
    _shadersVertex: any;
    _uniforms: any;
    _material: THREE.ShaderMaterial | null;
    _geometry: THREE.BufferGeometry;
    _mesh: THREE.Mesh | null;

    constructor(stack: any, geometry: THREE.BufferGeometry, referencePlane: any) {
      //
      super();

      this._stack = stack;
      this._referencePlane = referencePlane;
      this._plane1 = null;
      this._color1 = null;
      this._plane2 = null;
      this._color2 = null;
      this._plane3 = null;
      this._color3 = null;
      this._canvasWidth = 0;
      this._canvasHeight = 0;
      this._shadersFragment = ShadersFragment;
      this._shadersVertex = ShadersVertex;
      this._uniforms = ShadersUniform.uniforms();
      this._material = null;
      this._geometry = geometry;
      this._mesh = null;

      this._create();
    }

    _create() {
      this._prepareMaterial();
      this._mesh = new three.Mesh(this._geometry, this._material!);
      this._mesh.applyMatrix4(this._stack._ijk2LPS);
      this.add(this._mesh);
    }

    _prepareMaterial() {
      if (!this._material) {
        // reference plane
        this._uniforms.uSlice.value = this._referencePlane;

        // localizer planes
        if (this._plane1) {
          this._uniforms.uPlane1.value = this._plane1;
          this._uniforms.uPlaneColor1.value = this._color1;
        }

        if (this._plane2) {
          this._uniforms.uPlane2.value = this._plane2;
          this._uniforms.uPlaneColor2.value = this._color2;
        }

        if (this._plane3) {
          this._uniforms.uPlane3.value = this._plane3;
          this._uniforms.uPlaneColor3.value = this._color3;
        }

        //
        this._uniforms.uCanvasWidth.value = this._canvasWidth;
        this._uniforms.uCanvasHeight.value = this._canvasHeight;

        // generate material
        const fs = new ShadersFragment(this._uniforms);
        const vs = new ShadersVertex();
        this._material = new three.ShaderMaterial({
          side: three.DoubleSide,
          uniforms: this._uniforms,
          vertexShader: vs.compute(),
          fragmentShader: fs.compute(),
        });
        this._material.transparent = true;
      }
    }

    update() {
      if (this._mesh) {
        this.remove(this._mesh);
        this._mesh.geometry.dispose();
        (this._mesh as any).geometry = null;
        this._mesh = null;
      }

      this._create();
    }

    dispose() {
      //
      this._referencePlane = null;
      this._plane1 = null;
      this._color1 = null;
      this._plane2 = null;
      this._color2 = null;
      this._plane3 = null;
      this._color3 = null;

      this._shadersFragment = null;
      this._shadersVertex = null;

      this._uniforms = null;

      // material, geometry and mesh
      this.remove(this._mesh!);
      this._mesh!.geometry.dispose();
      (this._mesh as any).geometry = null;
      (this._mesh!.material as THREE.Material).dispose();
      (this._mesh as any).material = null;
      this._mesh = null;

      this._geometry.dispose();
      this._geometry = null as any;
      (this._material as any).vertexShader = null;
      (this._material as any).fragmentShader = null;
      (this._material as any).uniforms = null;
      this._material!.dispose();
      this._material = null;

      this._stack = null;
    }

    get geometry() {
      return this._geometry;
    }

    set geometry(geometry: THREE.BufferGeometry) {
      if (this._mesh) {
        this.remove(this._mesh);
        this._mesh.geometry.dispose();
        (this._mesh as any).geometry = null;
        this._mesh = null;

        this._geometry.dispose();
        this._geometry = null as any;
      }

      this._geometry = geometry;

      this._create();
    }

    get referencePlane() {
      return this._referencePlane;
    }

    set referencePlane(referencePlane: any) {
      this._referencePlane = referencePlane;
      this._uniforms.uSlice.value = this._referencePlane;
    }

    get plane1() {
      return this._plane1;
    }

    set plane1(plane1: any) {
      this._plane1 = plane1;
      this._uniforms.uPlane1.value = this._plane1;
    }

    get color1() {
      return this._color1;
    }

    set color1(color1: THREE.ColorRepresentation) {
      this._color1 = color1;
      // Three.js r180: vec3 uniforms require [r,g,b] arrays, not THREE.Color or raw hex numbers.
      const _c1 = new three.Color(color1);
      this._uniforms.uPlaneColor1.value = [_c1.r, _c1.g, _c1.b];
    }

    get plane2() {
      return this._plane2;
    }

    set plane2(plane2: any) {
      this._plane2 = plane2;
      this._uniforms.uPlane2.value = this._plane2;
    }

    get color2() {
      return this._color2;
    }

    set color2(color2: THREE.ColorRepresentation) {
      this._color2 = color2;
      const _c2 = new three.Color(color2);
      this._uniforms.uPlaneColor2.value = [_c2.r, _c2.g, _c2.b];
    }

    get plane3() {
      return this._plane3;
    }

    set plane3(plane3: any) {
      this._plane3 = plane3;
      this._uniforms.uPlane3.value = this._plane3;
    }

    get color3() {
      return this._color3;
    }

    set color3(color3: THREE.ColorRepresentation) {
      this._color3 = color3;
      const _c3 = new three.Color(color3);
      this._uniforms.uPlaneColor3.value = [_c3.r, _c3.g, _c3.b];
    }

    get canvasWidth() {
      return this._canvasWidth;
    }

    set canvasWidth(canvasWidth: number) {
      this._canvasWidth = canvasWidth;
      this._uniforms.uCanvasWidth.value = this._canvasWidth;
    }

    get canvasHeight() {
      return this._canvasHeight;
    }

    set canvasHeight(canvasHeight: number) {
      this._canvasHeight = canvasHeight;
      this._uniforms.uCanvasHeight.value = this._canvasHeight;
    }
  };
};

export { helpersLocalizer };
export default helpersLocalizer(THREE);
