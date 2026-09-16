import { Matrix4, Texture, Vector2, Vector4 } from 'three';

/**
 * The runtime value a uniform entry can hold. Textures start as an empty array in the
 * *.uniform.ts defaults and get reassigned to real Texture/Texture[] values by the
 * helpers/ classes that own the material (see helpers.material.mixin.ts). Vector4 backs
 * the localizer's vec4 plane-equation uniforms (see helpers.localizer.ts / cartesianEquation).
 */
export type UniformValue = number | number[] | Matrix4 | Vector2 | Vector4 | Texture | Texture[];

export interface ShaderUniform {
  type: string;
  value: UniformValue;
  typeGLSL: string;
  length?: number;
}

export type ShaderUniforms = Record<string, ShaderUniform>;

/**
 * Shape shared by every *.fragment.ts's ShadersFragment class - the thing the
 * shaders/helpers/* and shaders/interpolation/* modules read/write via `_base`
 * (see shaders.base.ts) to look up uniform values and register generated GLSL functions.
 */
export interface BaseFragment {
  _uniforms: ShaderUniforms;
  _functions: Record<string, string>;
}
