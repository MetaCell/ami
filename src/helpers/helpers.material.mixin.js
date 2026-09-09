import * as THREE from 'three';

/**
 * Helpers material mixin.
 *
 * @module helpers/material/mixin
 */

const helpersMaterialMixin = (three = window.THREE) => {
  if (three === undefined || three.Object3D === undefined) {
    return null;
  }

  const Constructor = three.Object3D;
  return class extends Constructor {
    _createMaterial(extraOptions) {
      // generate shaders on-demand!
      const fs = new this._shadersFragment(this._uniforms);
      const vs = new this._shadersVertex();

      // material
      const globalOptions = {
        uniforms: this._uniforms,
        vertexShader: vs.compute(),
        fragmentShader: fs.compute(),
      };

      const options = Object.assign(extraOptions, globalOptions);
      this._material = new three.ShaderMaterial(options);
      this._material.needsUpdate = true;
    }

    _updateMaterial() {
      // generate shaders on-demand!
      const fs = new this._shadersFragment(this._uniforms);
      const vs = new this._shadersVertex();

      this._material.vertexShader = vs.compute();
      this._material.fragmentShader = fs.compute();

      this._material.needsUpdate = true;
    }

    _prepareTexture() {
      this._textures = [];
      for (let m = 0; m < this._stack._rawData.length; m++) {
        const tex = new three.DataTexture(
          this._stack.rawData[m],
          this._stack.textureSize,
          this._stack.textureSize,
          this._stack.textureType,
          three.UnsignedByteType,
          three.UVMapping,
          three.ClampToEdgeWrapping,
          three.ClampToEdgeWrapping,
          three.NearestFilter,
          three.NearestFilter
        );
        tex.needsUpdate = true;
        tex.flipY = false;
        this._textures.push(tex);
      }
      // No padding: the shader now declares exactly _textures.length slots (see
      // shaders.helpers.texture3d and helpers.slice), so there are no unbound entries for WebGL2 to
      // fault on. The 1x1 dummies that used to fill a fixed 7- or 14-slot array also cost a real
      // texture2D call each, on every interpolation sample.
    }
  };
};

export { helpersMaterialMixin };
export default helpersMaterialMixin(THREE);
