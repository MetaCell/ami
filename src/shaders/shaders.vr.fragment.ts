import shadersIntersectBox from './helpers/shaders.helpers.intersectBox';
import shadersInterpolation from './interpolation/shaders.interpolation';

export default class ShadersFragment {
  private _uniforms: Record<string, any>;
  private _functions: Record<string, string>;
  private _main: string;

  // pass uniforms object
  constructor(uniforms: Record<string, any>) {
    this._uniforms = uniforms;
    this._functions = {};
    this._main = '';
  }

  functions(): string {
    if (this._main === '') {
      // if main is empty, functions can not have been computed
      this.main();
    }

    let content = '';
    for (const property in this._functions) {
      content += this._functions[property] + '\n';
    }

    return content;
  }

  uniforms(): string {
    let content = '';
    for (const property in this._uniforms) {
      const uniform = this._uniforms[property];
      content += `uniform ${uniform.typeGLSL} ${property}`;

      if (uniform && uniform.length) {
        content += `[${uniform.length}]`;
      }

      content += ';\n';
    }

    return content;
  }

  main(): void {
    // need to pre-call main to fill up the functions list
    this._main = `
void getIntensity(in vec3 dataCoordinates, out float intensity, out vec3 gradient){

  vec4 dataValue = vec4(0., 0., 0., 0.);
  ${shadersInterpolation(this, 'dataCoordinates', 'dataValue', 'gradient')}

  intensity = dataValue.r;

  // rescale/slope
  intensity = intensity*uRescaleSlopeIntercept[0] + uRescaleSlopeIntercept[1];
  // window level
  float windowMin = uWindowCenterWidth[0] - uWindowCenterWidth[1] * 0.5;
  intensity = ( intensity - windowMin ) / uWindowCenterWidth[1];
}


/**
 * Adapted from original sources
 *
 * Original code:
 * http://jamie-wong.com/2016/07/15/ray-marching-signed-distance-functions/
 * https://www.shadertoy.com/view/lt33z7
 *
 * The vec3 returned is the RGB color of the light's contribution.
 *
 * k_a: Ambient color
 * k_d: Diffuse color
 * k_s: Specular color
 * alpha: Shininess coefficient
 * p: position of point being lit
 * eye: the position of the camera
 * lightPos: the position of the light
 * lightIntensity: color/intensity of the light
 *
 * See https://en.wikipedia.org/wiki/Phong_reflection_model#Description
 */
vec3 phongShading(vec3 k_a, vec3 k_d, vec3 k_s, float shininess, vec3 p, vec3 eye,
  vec3 lightPos, vec3 lightIntensity, vec3 normal) {
  vec3 N = normal;
  vec3 L = lightPos - p;
  if (length(L) > 0.) {
    L = L / length(L);
  }
  vec3 V = eye - p;
  if (length(V) > 0.) {
    V = V / length(V);
  }
  vec3 R = reflect(-L, N);
  if (length(R) > 0.) {
    R = R / length(R);
  }

  // https://en.wikipedia.org/wiki/Blinn%E2%80%93Phong_shading_model
  vec3 h = L + V;
  vec3 H = h;
  if (length(h) > 0.) {
    H = H / length(h);
  }

  float dotLN = dot(L, N);
  float dotRV = dot(R, V);

  if (dotLN < 0.) {
    // Light not visible from this point on the surface
    return k_a;
  }

  if (dotRV < 0.) {
    // Light reflection in opposite direction as viewer, apply only diffuse
    // component
    return k_a + lightIntensity * (k_d * dotLN);
  }

  float specAngle = max(dot(H, normal), 0.0);
  float specular = pow(dotRV, shininess); //pow(specAngle, shininess); //
  return k_a + lightIntensity * (k_d * dotLN  + k_s * specular);
}

const float PI = 3.14159265358979323846264 * 0.1;

// expects values in the range of [0,1]x[0,1], returns values in the [0,1] range.
// do not collapse into a single function per: http://byteblacksmith.com/improvements-to-the-canonical-one-liner-glsl-rand-for-opengl-es-2-0/
highp float rand( const in vec2 uv) {
  const highp float a = 12.9898;
  const highp float b = 78.233;
  const highp float c = 43758.5453;
  highp float dt = dot(uv.xy, vec2(a, b)), sn = mod(dt, PI);
  return fract(sin(sn) * c);
}

void main(void) {
  const int maxSteps = 1024;

  // the ray
  vec3 rayOrigin = cameraPosition;
  vec3 rayDirection = normalize(vPos.xyz - rayOrigin);

  vec3 lightOrigin = uLightPositionInCamera == 1 ? cameraPosition : uLightPosition;

  // the Axe-Aligned B-Box
  vec3 AABBMin = vec3(uWorldBBox[0], uWorldBBox[2], uWorldBBox[4]);
  vec3 AABBMax = vec3(uWorldBBox[1], uWorldBBox[3], uWorldBBox[5]);

  // Intersection ray/bbox
  float tNear, tFar;
  bool intersect = false;
  ${shadersIntersectBox.api(
    this,
    'rayOrigin',
    'rayDirection',
    'AABBMin',
    'AABBMax',
    'tNear',
    'tFar',
    'intersect'
  )}
  if (tNear < 0.0) tNear = 0.0;

  // x / y should be within o-1
  // should
  float offset = rand(gl_FragCoord.xy);

  // init the ray marching
  float tStep = (tFar - tNear) / float(uSteps);
  float tCurrent = tNear + offset * tStep;
  vec4 accumulatedColor = vec4(0.0);
  float accumulatedAlpha = 0.0;

  // MIP volume rendering
  float maxIntensity = 0.0;

  mat4 dataToWorld = inverse(uWorldToData);

  // rayOrigin -= rayDirection * 0.1; // gold_noise(vPos.xz, vPos.y) / 100.;

  for(int rayStep = 0; rayStep < maxSteps; rayStep++){
    vec3 currentPosition = rayOrigin + rayDirection * tCurrent;
    // some non-linear FUN
    // some occlusion issue to be fixed
    vec3 transformedPosition = currentPosition; //transformPoint(currentPosition, uAmplitude, uFrequence);
    // world to data coordinates
    // rounding trick
    // first center of first voxel in data space is CENTERED on (0,0,0)
    vec4 dataCoordinatesRaw = uWorldToData * vec4(transformedPosition, 1.0);
    vec3 currentVoxel = vec3(dataCoordinatesRaw.x, dataCoordinatesRaw.y, dataCoordinatesRaw.z);
    float intensity = 0.0;
    vec3 gradient = vec3(0., 0., 0.);
    getIntensity(currentVoxel, intensity, gradient);
    // map gradient to world space and normalize before using
    // we avoid to call "normalize" as it may be undefined if vector length == 0.
    gradient = (vec3(dataToWorld * vec4(gradient, 0.)));
    if (length(gradient) > 0.0) {
      gradient = normalize(gradient);
    }

    vec4 colorSample;
    float alphaSample;
    if(uLut == 1){
      vec4 colorFromLUT = texture2D( uTextureLUT, vec2( intensity, 1.0) );
      // 256 colors
      colorSample = colorFromLUT;
      alphaSample = colorFromLUT.a;
    }
    else{
      alphaSample = intensity;
      colorSample.r = colorSample.g = colorSample.b = intensity;
    }

    // ray marching algorithm
    // shading on
    // interpolation on
    if (uAlgorithm == 0 && uShading == 1 && uInterpolation != 0) {
      //  && alphaSample > .3
      vec3 ambientComponent = uSampleColorToAmbient == 1 ? colorSample.xyz : uAmbientColor;
      ambientComponent *= uAmbient;
      vec3 diffuseComponent = uSampleColorToDiffuse == 1 ? colorSample.xyz : uDiffuseColor;
      diffuseComponent *= uDiffuse;
      vec3 specularComponent = uSpecular * uSpecularColor;
      float shininess = uShininess;
      vec3 vIntensity = uIntensity;

      colorSample.xyz += phongShading(
        ambientComponent,
        diffuseComponent,
        specularComponent,
        shininess,
        currentPosition.xyz,
        rayOrigin.xyz,
        lightOrigin.xyz,
        vIntensity,
        gradient);
    }

    alphaSample = 1.0 - pow((1.0- alphaSample),tStep*uAlphaCorrection);
    alphaSample *= (1.0 - accumulatedAlpha);

    accumulatedColor += alphaSample * colorSample;
    accumulatedAlpha += alphaSample;

    tCurrent += tStep;

    if (tCurrent > tFar || (uAlgorithm == 0 && accumulatedAlpha >= 1.0)) break;

    if (uAlgorithm == 1 && (intensity >= maxIntensity)) {
      maxIntensity = intensity;
      accumulatedColor = colorSample;
      accumulatedAlpha = 1.;
    }
  }

  gl_FragColor = vec4(accumulatedColor.xyz, accumulatedAlpha);
}
   `;
  }

  compute(): string {
    const shaderInterpolation = '';
    // shaderInterpolation.inline(args) //true/false
    // shaderInterpolation.functions(args)

    return `
// uniforms
${this.uniforms()}

// varying (should fetch it from vertex directly)
varying vec4      vPos;

// tailored functions
${this.functions()}

// main loop
${this._main}
      `;
  }
}
