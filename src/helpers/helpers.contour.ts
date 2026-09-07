import * as THREE from 'three';
/** * Imports ***/
import ShadersFragment from '../shaders/shaders.contour.fragment';
import ShadersUniform from '../shaders/shaders.contour.uniform';
import ShadersVertex from '../shaders/shaders.contour.vertex';

/**
 * @module helpers/contour
 */
const helpersContour = (three: typeof THREE = window.THREE!) => {
  if (three === undefined || three.Object3D === undefined) {
    return null;
  }

  const Constructor = three.Object3D;
  return class HelpersContour extends Constructor {
    _stack: any;
    _textureToFilter: THREE.Texture | null;
    _contourWidth: number;
    _contourOpacity: number;
    _canvasWidth: number;
    _canvasHeight: number;
    _shadersFragment: any;
    _shadersVertex: any;
    _uniforms: any;
    _material: THREE.ShaderMaterial | null;
    _geometry: THREE.BufferGeometry;
    _mesh: THREE.Mesh | null;

    constructor(stack: any, geometry: THREE.BufferGeometry, texture: THREE.Texture | null) {
      //
      super();

      this._stack = stack;
      this._textureToFilter = texture;
      this._contourWidth = 1;
      this._contourOpacity = 1;
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
        // contour default width
        this._uniforms.uWidth.value = this._contourWidth;
        this._uniforms.uOpacity.value = this._contourOpacity;

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
          transparent: true,
        });
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
      if (this._textureToFilter !== null) {
        this._textureToFilter.dispose();
        this._textureToFilter = null;
      }

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

    get textureToFilter() {
      return this._textureToFilter;
    }

    set textureToFilter(texture: THREE.Texture | null) {
      this._textureToFilter = texture;
      this._uniforms.uTextureFilled.value = texture;
      this._material!.needsUpdate = true;
    }

    get contourOpacity() {
      return this._contourOpacity;
    }

    set contourOpacity(contourOpacity: number) {
      this._contourOpacity = contourOpacity;
      this._uniforms.uOpacity.value = this._contourOpacity;
    }

    get contourWidth() {
      return this._contourWidth;
    }

    set contourWidth(contourWidth: number) {
      this._contourWidth = contourWidth;
      this._uniforms.uWidth.value = this._contourWidth;
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

// export factory
export { helpersContour };
// default export to
export default helpersContour(THREE);
