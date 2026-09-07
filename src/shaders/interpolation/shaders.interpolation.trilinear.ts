import ShadersBase from '../shaders.base';
import InterpolationIdentity from './shaders.interpolation.identity';

class InterpolationTrilinear extends ShadersBase {
  private _currentVoxel: string;
  private _dataValue: string;
  private _gradient: string;

  constructor() {
    super();
    this.name = 'interpolationTrilinear';

    // default properties names
    this._currentVoxel = 'currentVoxel';
    this._dataValue = 'dataValue';
    this._gradient = 'gradient';
  }

  api(
    baseFragment: any = this._base,
    currentVoxel: string = this._currentVoxel,
    dataValue: string = this._dataValue,
    gradient: string = this._gradient
  ): string {
    this._base = baseFragment;
    return this.compute(currentVoxel, dataValue, gradient);
  }

  compute(currentVoxel: string, dataValue: string, gradient: string): string {
    this.computeDefinition();
    this._base._functions[this._name] = this._definition;
    return `${this._name}(${currentVoxel}, ${dataValue}, ${gradient});`;
  }

  computeDefinition(): void {
    this._definition = `
void trilinearInterpolation(
  in vec3 normalizedPosition,
  out vec4 interpolatedValue,
  in vec4 v000, in vec4 v100,
  in vec4 v001, in vec4 v101,
  in vec4 v010, in vec4 v110,
  in vec4 v011, in vec4 v111) {
  // https://en.wikipedia.org/wiki/Trilinear_interpolation
  vec4 c00 = v000 * ( 1.0 - normalizedPosition.x ) + v100 * normalizedPosition.x;
  vec4 c01 = v001 * ( 1.0 - normalizedPosition.x ) + v101 * normalizedPosition.x;
  vec4 c10 = v010 * ( 1.0 - normalizedPosition.x ) + v110 * normalizedPosition.x;
  vec4 c11 = v011 * ( 1.0 - normalizedPosition.x ) + v111 * normalizedPosition.x;

  // c0 and c1
  vec4 c0 = c00 * ( 1.0 - normalizedPosition.y) + c10 * normalizedPosition.y;
  vec4 c1 = c01 * ( 1.0 - normalizedPosition.y) + c11 * normalizedPosition.y;

  // c
  vec4 c = c0 * ( 1.0 - normalizedPosition.z) + c1 * normalizedPosition.z;
  interpolatedValue = c;
}

void ${this._name}(in vec3 currentVoxel, out vec4 dataValue, out vec3 gradient){

  // currentVoxel is a continuous IJK position from an arbitrary (possibly rotated) world-to-data
  // transform - it commonly falls outside this volume's own extent (e.g. a reslice plane sized to a
  // different, larger base volume). Texture3d's atlas index (dataCoordinates.x + y*dims.x + z*dims.y*dims.x)
  // has no bounds checking of its own: an out-of-range coordinate silently aliases into whatever
  // texel the overflowed flat index lands on - a different slice, or unrelated data - rather than
  // reading "nothing here". Zero-filling instead matches dipy's server-side resampling, which
  // zero-fills genuinely out-of-bounds samples, keeping the live preview equivalent to the saved result.
  // Returns rather than discards: this function is also called from the thickness/slab loop in
  // shaders.data.fragment.js, where discard would throw away the whole fragment - including every
  // in-bounds sample already accumulated - and punch a hole through any slab that merely grazes the
  // volume edge. Callers that want the fragment dropped entirely test the bounds themselves (see the
  // single-sample branch there, which still discards so out-of-volume stays transparent, not black).
  vec3 dataDimensionsF = vec3(uDataDimensions);
  if (any(lessThan(currentVoxel, vec3(0.))) || any(greaterThan(currentVoxel, dataDimensionsF - vec3(1.)))) {
    dataValue = vec4(0.);
    gradient = vec3(1.);
    return;
  }

  vec3 lower_bound = floor(currentVoxel);
  lower_bound = max(vec3(0.), lower_bound);

  // Clamped to the last valid voxel, not lower_bound + 1: the guard above admits currentVoxel
  // exactly equal to dims-1, where an unclamped +1 indexes dims and overflows the flat atlas index
  // into a neighbouring slice - the very aliasing the guard exists to prevent. Clamping makes that
  // edge sample interpolate the last voxel against itself, which returns its exact value.
  vec3 higher_bound = min(lower_bound + vec3(1.), dataDimensionsF - vec3(1.));

  vec3 normalizedPosition = (currentVoxel - lower_bound);
  normalizedPosition =  max(vec3(0.), normalizedPosition);

  vec4 interpolatedValue = vec4(0.);

  //
  // fetch values required for interpolation
  //
  vec4 v000 = vec4(0.0, 0.0, 0.0, 0.0);
  vec3 c000 = vec3(lower_bound.x, lower_bound.y, lower_bound.z);
  ${InterpolationIdentity.api(this._base, 'c000', 'v000')}

  //
  vec4 v100 = vec4(0.0, 0.0, 0.0, 0.0);
  vec3 c100 = vec3(higher_bound.x, lower_bound.y, lower_bound.z);
  ${InterpolationIdentity.api(this._base, 'c100', 'v100')}

  //
  vec4 v001 = vec4(0.0, 0.0, 0.0, 0.0);
  vec3 c001 = vec3(lower_bound.x, lower_bound.y, higher_bound.z);
  ${InterpolationIdentity.api(this._base, 'c001', 'v001')}

  //
  vec4 v101 = vec4(0.0, 0.0, 0.0, 0.0);
  vec3 c101 = vec3(higher_bound.x, lower_bound.y, higher_bound.z);
  ${InterpolationIdentity.api(this._base, 'c101', 'v101')}

  //
  vec4 v010 = vec4(0.0, 0.0, 0.0, 0.0);
  vec3 c010 = vec3(lower_bound.x, higher_bound.y, lower_bound.z);
  ${InterpolationIdentity.api(this._base, 'c010', 'v010')}

  vec4 v110 = vec4(0.0, 0.0, 0.0, 0.0);
  vec3 c110 = vec3(higher_bound.x, higher_bound.y, lower_bound.z);
  ${InterpolationIdentity.api(this._base, 'c110', 'v110')}

  //
  vec4 v011 = vec4(0.0, 0.0, 0.0, 0.0);
  vec3 c011 = vec3(lower_bound.x, higher_bound.y, higher_bound.z);
  ${InterpolationIdentity.api(this._base, 'c011', 'v011')}

  vec4 v111 = vec4(0.0, 0.0, 0.0, 0.0);
  vec3 c111 = vec3(higher_bound.x, higher_bound.y, higher_bound.z);
  ${InterpolationIdentity.api(this._base, 'c111', 'v111')}

  // compute interpolation at position
  trilinearInterpolation(normalizedPosition, interpolatedValue ,v000, v100, v001, v101, v010,v110, v011,v111);
  dataValue = interpolatedValue;

  // That breaks shading in volume rendering
  // if (gradient.x == 1.) { // skip gradient calculation for slice helper
  //  return;
  // }

  // compute gradient
  float gradientStep = 0.005;

  // x axis
  vec3 g100 = vec3(1., 0., 0.);
  vec3 ng100 = normalizedPosition + g100 * gradientStep;
  ng100.x = min(1., ng100.x);

  vec4 vg100 = vec4(0.);
  trilinearInterpolation(ng100, vg100 ,v000, v100, v001, v101, v010,v110, v011,v111);

  vec3 go100 = -g100;
  vec3 ngo100 = normalizedPosition + go100 * gradientStep;
  ngo100.x = max(0., ngo100.x);

  vec4 vgo100 = vec4(0.);
  trilinearInterpolation(ngo100, vgo100 ,v000, v100, v001, v101, v010,v110, v011,v111);

  gradient.x = (g100.x * vg100.x + go100.x * vgo100.x);

  // y axis
  vec3 g010 = vec3(0., 1., 0.);
  vec3 ng010 = normalizedPosition + g010 * gradientStep;
  ng010.y = min(1., ng010.y);

  vec4 vg010 = vec4(0.);
  trilinearInterpolation(ng010, vg010 ,v000, v100, v001, v101, v010,v110, v011,v111);

  vec3 go010 = -g010;
  vec3 ngo010 = normalizedPosition + go010 * gradientStep;
  ngo010.y = max(0., ngo010.y);

  vec4 vgo010 = vec4(0.);
  trilinearInterpolation(ngo010, vgo010 ,v000, v100, v001, v101, v010,v110, v011,v111);

  gradient.y = (g010.y * vg010.x + go010.y * vgo010.x);

  // z axis
  vec3 g001 = vec3(0., 0., 1.);
  vec3 ng001 = normalizedPosition + g001 * gradientStep;
  ng001.z = min(1., ng001.z);

  vec4 vg001 = vec4(0.);
  trilinearInterpolation(ng001, vg001 ,v000, v100, v001, v101, v010,v110, v011,v111);

  vec3 go001 = -g001;
  vec3 ngo001 = normalizedPosition + go001 * gradientStep;
  ngo001.z = max(0., ngo001.z);

  vec4 vgo001 = vec4(0.);
  trilinearInterpolation(ngo001, vgo001 ,v000, v100, v001, v101, v010,v110, v011,v111);

  gradient.z = (g001.z * vg001.x + go001.z * vgo001.x);

  // normalize gradient
  // +0.0001  instead of if?
  float gradientMagnitude = length(gradient);
  if (gradientMagnitude > 0.0) {
    gradient = -(1. / gradientMagnitude) * gradient;
  }
}
    `;
  }
}

export default new InterpolationTrilinear();
