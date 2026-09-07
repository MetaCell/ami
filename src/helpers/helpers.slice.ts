import * as THREE from 'three';
/** * Imports ***/
import { geometriesSlice } from '../geometries/geometries.slice';
import { helpersMaterialMixin } from '../helpers/helpers.material.mixin';
import ShadersFragment from '../shaders/shaders.data.fragment';
import ShadersUniform from '../shaders/shaders.data.uniform';
import ShadersVertex from '../shaders/shaders.data.vertex';

/**
 * @module helpers/slice
 */

const helpersSlice = (three: typeof THREE = window.THREE!) => {
  if (three === undefined || three.Object3D === undefined) {
    return null;
  }

  const Constructor = helpersMaterialMixin(three)!;
  return class HelpersSlice extends Constructor {
    _invert: boolean;

    _lut: string;
    _lutTexture: THREE.Texture | null;
    _intensityAuto: boolean;
    _interpolation: number;
    _index: number;
    _windowWidth: number | null;
    _windowCenter: number | null;
    _opacity: number;
    _rescaleSlope: number | null;
    _rescaleIntercept: number | null;
    _spacing: number;
    _thickness: number;
    _thicknessMethod: number;

    _lowerThreshold: number | null;
    _upperThreshold: number | null;

    _canvasWidth: number;
    _canvasHeight: number;
    _borderColor: any;

    _planePosition: THREE.Vector3;
    _planeDirection: THREE.Vector3;
    _aaBBspace: string;
    _geometry: any;
    _mesh: THREE.Mesh | null;
    _visible: boolean;

    _halfDimensions: any;
    _center: any;
    _toAABB: THREE.Matrix4 | null;

    constructor(
      stack: any,
      index: number = 0,
      position: THREE.Vector3 = new three.Vector3(0, 0, 0),
      direction: THREE.Vector3 = new three.Vector3(0, 0, 1),
      aabbSpace: string = 'IJK'
    ) {
      //
      super();

      // private vars
      this._stack = stack;

      // image settings
      // index only used to grab window/level and intercept/slope
      this._invert = this._stack.invert;

      this._lut = 'none';
      this._lutTexture = null;
      // if auto === true, get from index
      // else from stack which holds the default values
      this._intensityAuto = true;
      this._interpolation = 1; // default to trilinear interpolation
      // starts at 0
      this._index = index;
      this._windowWidth = null;
      this._windowCenter = null;
      this._opacity = 1;
      this._rescaleSlope = null;
      this._rescaleIntercept = null;
      this._spacing = 1;
      this._thickness = 0;
      this._thicknessMethod = 0; // default to MIP (Maximum Intensity Projection); 1 - Mean; 2 - MinIP

      // threshold
      this._lowerThreshold = null;
      this._upperThreshold = null;

      this._canvasWidth = 0;
      this._canvasHeight = 0;
      this._borderColor = null;

      // Object3D settings
      // shape
      this._planePosition = position;
      this._planeDirection = direction;
      // change aaBBSpace changes the box dimensions
      // also changes the transform
      // there is also a switch to move back mesh to LPS space automatically
      this._aaBBspace = aabbSpace; // or LPS -> different transforms, esp for the geometry/mesh
      this._material = null;
      this._textures = [];
      this._shadersFragment = ShadersFragment;
      this._shadersVertex = ShadersVertex;
      this._uniforms = ShadersUniform.uniforms();
      this._geometry = null;
      this._mesh = null;
      this._visible = true;

      this._halfDimensions = null;
      this._center = null;
      this._toAABB = null;

      // update dimensions, center, etc.
      // depending on aaBBSpace
      this._init();

      // update object
      this._create();
    }

    // getters/setters

    get stack() {
      return this._stack;
    }

    set stack(stack: any) {
      this._stack = stack;
    }

    get spacing() {
      return this._spacing;
    }

    set spacing(spacing: number) {
      this._spacing = spacing;
      this._uniforms.uSpacing.value = this._spacing;
    }

    get thickness() {
      return this._thickness;
    }

    set thickness(thickness: number) {
      this._thickness = thickness;
      this._uniforms.uThickness.value = this._thickness;
    }

    get thicknessMethod() {
      return this._thicknessMethod;
    }

    set thicknessMethod(thicknessMethod: number) {
      this._thicknessMethod = thicknessMethod;
      this._uniforms.uThicknessMethod.value = this._thicknessMethod;
    }
    get windowWidth() {
      return this._windowWidth;
    }

    set windowWidth(windowWidth: number | null) {
      this._windowWidth = windowWidth;
      this.updateIntensitySettingsUniforms();
    }

    get windowCenter() {
      return this._windowCenter;
    }

    set windowCenter(windowCenter: number | null) {
      this._windowCenter = windowCenter;
      this.updateIntensitySettingsUniforms();
    }

    get opacity() {
      return this._opacity;
    }

    set opacity(opacity: number) {
      this._opacity = opacity;
      this.updateIntensitySettingsUniforms();
    }

    // adding thresholding method
    get upperThreshold() {
      return this._upperThreshold;
    }

    set upperThreshold(upperThreshold: number | null) {
      this._upperThreshold = upperThreshold;
      this.updateIntensitySettingsUniforms();
    }

    get lowerThreshold() {
      return this._lowerThreshold;
    }

    set lowerThreshold(lowerThreshold: number | null) {
      this._lowerThreshold = lowerThreshold;
      this.updateIntensitySettingsUniforms();
    }
    get rescaleSlope() {
      return this._rescaleSlope;
    }

    set rescaleSlope(rescaleSlope: number | null) {
      this._rescaleSlope = rescaleSlope;
      this.updateIntensitySettingsUniforms();
    }

    get rescaleIntercept() {
      return this._rescaleIntercept;
    }

    set rescaleIntercept(rescaleIntercept: number | null) {
      this._rescaleIntercept = rescaleIntercept;
      this.updateIntensitySettingsUniforms();
    }

    get invert() {
      return this._invert;
    }

    set invert(invert: boolean) {
      this._invert = invert;
      this.updateIntensitySettingsUniforms();
    }

    get lut() {
      return this._lut;
    }

    set lut(lut: string) {
      this._lut = lut;
    }

    get lutTexture() {
      return this._lutTexture;
    }

    set lutTexture(lutTexture: THREE.Texture | null) {
      this._lutTexture = lutTexture;
      this.updateIntensitySettingsUniforms();
    }

    get intensityAuto() {
      return this._intensityAuto;
    }

    set intensityAuto(intensityAuto: boolean) {
      this._intensityAuto = intensityAuto;
      this.updateIntensitySettings();
      this.updateIntensitySettingsUniforms();
    }

    get interpolation() {
      return this._interpolation;
    }

    set interpolation(interpolation: number) {
      this._interpolation = interpolation;
      this.updateIntensitySettingsUniforms();
      this._updateMaterial();
    }

    get index() {
      return this._index;
    }

    set index(index: number) {
      this._index = index;
      this._update();
    }

    set planePosition(position: THREE.Vector3) {
      this._planePosition = position;
      this._update();
    }

    get planePosition() {
      return this._planePosition;
    }

    set planeDirection(direction: THREE.Vector3) {
      this._planeDirection = direction;
      this._update();
    }

    get planeDirection() {
      return this._planeDirection;
    }

    set halfDimensions(halfDimensions: any) {
      this._halfDimensions = halfDimensions;
    }

    get halfDimensions() {
      return this._halfDimensions;
    }

    set center(center: any) {
      this._center = center;
    }

    get center() {
      return this._center;
    }

    set aabbSpace(aabbSpace: string) {
      this._aaBBspace = aabbSpace;
      this._init();
    }

    get aabbSpace() {
      return this._aaBBspace;
    }

    set mesh(mesh: THREE.Mesh | null) {
      this._mesh = mesh;
    }

    get mesh() {
      return this._mesh;
    }

    set geometry(geometry: any) {
      this._geometry = geometry;
    }

    get geometry() {
      return this._geometry;
    }

    set canvasWidth(canvasWidth: number) {
      this._canvasWidth = canvasWidth;
      this._uniforms.uCanvasWidth.value = this._canvasWidth;
    }

    get canvasWidth() {
      return this._canvasWidth;
    }

    set canvasHeight(canvasHeight: number) {
      this._canvasHeight = canvasHeight;
      this._uniforms.uCanvasHeight.value = this._canvasHeight;
    }

    get canvasHeight() {
      return this._canvasHeight;
    }

    set borderColor(borderColor: any) {
      this._borderColor = borderColor;
      // Three.js r180 setValueV3f no longer accepts THREE.Color (r/g/b) for vec3 uniforms —
      // it checks v.x !== undefined and falls through to uniform3fv with a non-array.
      // Convert to [r, g, b] array which works across all Three.js versions.
      const _c = new three.Color(borderColor);
      this._uniforms.uBorderColor.value = [_c.r, _c.g, _c.b];
    }

    get borderColor() {
      return this._borderColor;
    }

    _init() {
      if (!this._stack || !this._stack._prepared || !this._stack._packed) {
        return;
      }

      if (this._aaBBspace === 'IJK') {
        this._halfDimensions = this._stack.halfDimensionsIJK;
        this._center = new three.Vector3(
          this._stack.halfDimensionsIJK.x - 0.5,
          this._stack.halfDimensionsIJK.y - 0.5,
          this._stack.halfDimensionsIJK.z - 0.5
        );
        this._toAABB = new three.Matrix4();
      } else {
        // LPS
        const aaBBox = this._stack.AABBox();
        this._halfDimensions = aaBBox.clone().multiplyScalar(0.5);
        this._center = this._stack.centerAABBox();
        this._toAABB = this._stack.lps2AABB;
      }
    }

    // private methods
    _create() {
      if (!this._stack || !this._stack.prepared || !this._stack.packed) {
        return;
      }

      // Convenience vars
      try {
        const SliceGeometryContructor = geometriesSlice(three)!;
        this._geometry = new SliceGeometryContructor(
          this._halfDimensions,
          this._center,
          this._planePosition,
          this._planeDirection,
          this._toAABB
        );
      } catch (e) {
        window.console.log(e);
        window.console.log('invalid slice geometry - exiting...');
        return;
      }

      if (!this._geometry.attributes || !this._geometry.attributes.position) {
        return;
      }

      if (!this._material) {
        //
        this._uniforms.uTextureSize.value = this._stack.textureSize;
        this._uniforms.uDataDimensions.value = [
          this._stack.dimensionsIJK.x,
          this._stack.dimensionsIJK.y,
          this._stack.dimensionsIJK.z,
        ];
        this._uniforms.uWorldToData.value = this._stack.lps2IJK;
        this._uniforms.uNumberOfChannels.value = this._stack.numberOfChannels;
        this._uniforms.uPixelType.value = this._stack.pixelType;
        this._uniforms.uBitsAllocated.value = this._stack.bitsAllocated;
        this._uniforms.uPackedPerPixel.value = this._stack.packedPerPixel;
        this._uniforms.uSpacing.value = this._spacing;
        this._uniforms.uThickness.value = this._thickness;
        this._uniforms.uThicknessMethod.value = this._thicknessMethod;
        // compute texture if material exist
        this._prepareTexture();
        this._uniforms.uTextureContainer.value = this._textures;
        if (this._stack.textureUnits > 8) {
          this._uniforms.uTextureContainer.length = 14;
        }

        this._createMaterial({
          side: three.DoubleSide,
        });
      }

      // update intensity related stuff
      this.updateIntensitySettings();
      this.updateIntensitySettingsUniforms();

      // create the mesh!
      this._mesh = new three.Mesh(this._geometry, this._material);
      if (this._aaBBspace === 'IJK') {
        this._mesh.applyMatrix4(this._stack.ijk2LPS);
      }

      this._mesh.visible = this._visible;

      // and add it!
      this.add(this._mesh);
    }

    updateIntensitySettings() {
      // if auto, get from frame index
      if (this._intensityAuto) {
        this.updateIntensitySetting('windowCenter');
        this.updateIntensitySetting('windowWidth');
        this.updateIntensitySetting('rescaleSlope');
        this.updateIntensitySetting('rescaleIntercept');
      } else {
        if (this._windowCenter === null) {
          this._windowCenter = this._stack.windowCenter;
        }

        if (this._windowWidth === null) {
          this._windowWidth = this._stack.windowWidth;
        }

        if (this._rescaleSlope === null) {
          this._rescaleSlope = this._stack.rescaleSlope;
        }

        if (this._rescaleIntercept === null) {
          this._rescaleIntercept = this._stack.rescaleIntercept;
        }
      }

      // adding thresholding
      if (this._upperThreshold === null) {
        this._upperThreshold = this._stack._minMax[1];
      }

      if (this._lowerThreshold === null) {
        this._lowerThreshold = this._stack._minMax[0];
      }
    }

    updateIntensitySettingsUniforms() {
      // compensate for the offset to only pass > 0 values to shaders
      // models > models.stack.js : _packTo8Bits
      let offset = 0;
      if (this._stack._minMax[0] < 0) {
        offset -= this._stack._minMax[0];
      }

      // set slice window center and width
      this._uniforms.uRescaleSlopeIntercept.value = [this._rescaleSlope, this._rescaleIntercept];
      this._uniforms.uWindowCenterWidth.value = [offset + this._windowCenter, this._windowWidth];

      // set slice opacity
      this._uniforms.uOpacity.value = this._opacity;

      // set slice upper/lower threshold
      this._uniforms.uLowerUpperThreshold.value = [
        offset + this._lowerThreshold,
        offset + this._upperThreshold,
      ];

      // invert
      this._uniforms.uInvert.value = this._invert === true ? 1 : 0;

      // interpolation
      this._uniforms.uInterpolation.value = this._interpolation;

      // lut
      if (this._lut === 'none') {
        this._uniforms.uLut.value = 0;
      } else {
        this._uniforms.uLut.value = 1;
        this._uniforms.uTextureLUT.value = this._lutTexture;
      }
    }

    updateIntensitySetting(setting: string) {
      if (this._stack.frame[this._index] && this._stack.frame[this._index][setting]) {
        (this as any)['_' + setting] = this._stack.frame[this._index][setting];
      } else {
        (this as any)['_' + setting] = this._stack[setting];
      }
    }

    _update() {
      // update slice
      if (this._mesh) {
        this.remove(this._mesh);
        this._mesh.geometry.dispose();
        (this._mesh as any).geometry = null;
        // we do not want to dispose the texture!
        // this._mesh.material.dispose();
        // this._mesh.material = null;
        this._mesh = null;
      }

      this._create();
    }

    dispose() {
      // Release memory
      for (let j = 0; j < this._textures.length; j++) {
        this._textures[j].dispose();
        this._textures[j] = null;
      }
      this._textures = null;
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
      this._geometry = null;
      this._material.vertexShader = null;
      this._material.fragmentShader = null;
      this._material.uniforms = null;
      this._material.dispose();
      this._material = null;

      this._stack = null;
    }

    cartesianEquation(): THREE.Vector4 {
      // Make sure we have a geometry
      const posAttr = this._geometry && this._geometry.attributes && this._geometry.attributes.position;
      if (!posAttr || posAttr.count < 3) {
        return new three.Vector4();
      }

      const dataToWorld = this._stack.ijk2LPS;
      const p1 = new three.Vector3().fromBufferAttribute(posAttr, 0).applyMatrix4(dataToWorld);
      const p2 = new three.Vector3().fromBufferAttribute(posAttr, 1).applyMatrix4(dataToWorld);
      const p3 = new three.Vector3().fromBufferAttribute(posAttr, 2).applyMatrix4(dataToWorld);
      const v1 = new three.Vector3();
      const v2 = new three.Vector3();
      const normal = v1
        .subVectors(p3, p2)
        .cross(v2.subVectors(p1, p2))
        .normalize();

      return new three.Vector4(normal.x, normal.y, normal.z, -normal.dot(p1));
    }
  };
};

export { helpersSlice };
export default helpersSlice(THREE);
