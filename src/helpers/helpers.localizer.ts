import * as THREE from 'three';
/** * Imports ***/
import ModelsStack from '../models/models.stack';
import ShadersFragment from '../shaders/shaders.localizer.fragment';
import ShadersUniform from '../shaders/shaders.localizer.uniform';
import ShadersVertex from '../shaders/shaders.localizer.vertex';
import type { ShaderUniforms } from '../shaders/shaders.types';

/**
 * @module helpers/localizer
 */
const helpersLocalizer = (three: typeof THREE = window.THREE!) => {
  if (three === undefined || three.Object3D === undefined) {
    return null;
  }

  const Constructor = three.Object3D;
  return class HelpersLocalizer extends Constructor {
    _stack: ModelsStack | null;
    _referencePlane: THREE.Vector4 | null;
    _plane1: THREE.Vector4 | null;
    _color1: THREE.ColorRepresentation | null;
    _plane2: THREE.Vector4 | null;
    _color2: THREE.ColorRepresentation | null;
    _plane3: THREE.Vector4 | null;
    _color3: THREE.ColorRepresentation | null;
    _canvasWidth: number;
    _canvasHeight: number;
    _shadersFragment: typeof ShadersFragment | null;
    _shadersVertex: typeof ShadersVertex | null;
    _uniforms: ShaderUniforms | null;
    _material: THREE.ShaderMaterial | null;
    _geometry: THREE.BufferGeometry | null;
    _mesh: THREE.Mesh | null;

    constructor(stack: ModelsStack, geometry: THREE.BufferGeometry, referencePlane: THREE.Vector4) {
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
      this._mesh.applyMatrix4(this._stack.ijk2LPS);
      this.add(this._mesh);
    }

    _prepareMaterial() {
      if (!this._material) {
        // reference plane
        this._uniforms.uSlice.value = this._referencePlane;

        // localizer planes
        // Three.js r180: vec3 uniforms require [r,g,b] arrays, not THREE.Color or raw hex numbers
        // (see the color1/2/3 setters below) - match that conversion here too.
        if (this._plane1) {
          this._uniforms.uPlane1.value = this._plane1;
          const c1 = new three.Color(this._color1!);
          this._uniforms.uPlaneColor1.value = [c1.r, c1.g, c1.b];
        }

        if (this._plane2) {
          this._uniforms.uPlane2.value = this._plane2;
          const c2 = new three.Color(this._color2!);
          this._uniforms.uPlaneColor2.value = [c2.r, c2.g, c2.b];
        }

        if (this._plane3) {
          this._uniforms.uPlane3.value = this._plane3;
          const c3 = new three.Color(this._color3!);
          this._uniforms.uPlaneColor3.value = [c3.r, c3.g, c3.b];
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
        this._mesh!.geometry = null;
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
      this._mesh!.geometry = null;
      (this._mesh!.material as THREE.Material).dispose();
      this._mesh!.material = null;
      this._mesh = null;

      this._geometry.dispose();
      this._geometry = null;
      this._material!.vertexShader = null;
      this._material!.fragmentShader = null;
      this._material!.uniforms = null;
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
        this._mesh!.geometry = null;
        this._mesh = null;

        this._geometry.dispose();
        this._geometry = null;
      }

      this._geometry = geometry;

      this._create();
    }

    get referencePlane() {
      return this._referencePlane;
    }

    set referencePlane(referencePlane: THREE.Vector4) {
      this._referencePlane = referencePlane;
      this._uniforms.uSlice.value = this._referencePlane;
    }

    get plane1() {
      return this._plane1;
    }

    set plane1(plane1: THREE.Vector4) {
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

    set plane2(plane2: THREE.Vector4) {
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

    set plane3(plane3: THREE.Vector4) {
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
