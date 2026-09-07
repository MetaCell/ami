/**
 * Localizer fragment shader
 */
export default class ShadersFragment {
  private _uniforms: Record<string, any>;
  private _functions: Record<string, string>;
  private _main: string;

  /**
   *
   */
  constructor(uniforms: Record<string, any>) {
    this._uniforms = uniforms;
    this._functions = {};
    this._main = '';
  }

  /**
   *
   */
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

  /**
   *
   */
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

  /**
   *
   */
  main(): void {
    // need to pre-call main to fill up the functions list
    this._main = `
void intersectionProjection(
  in vec4 plane,
  in vec4 slice,
  out vec3 intersectionProjection){

      vec3 intersectionDirection = normalize(cross(plane.xyz, slice.xyz));
      vec3 intersectionPoint =
        cross(intersectionDirection,slice.xyz) * plane.w +
        cross(plane.xyz, intersectionDirection) * slice.w;

      intersectionProjection =
        intersectionPoint.xyz +
        (dot(vPos.xyz - intersectionPoint, intersectionDirection)
          * intersectionDirection);

}

void main(void) {
      vec4 c1 = vec4(0., 0., 0., 0.);
      vec4 c2 = vec4(0., 0., 0., 0.);
      vec4 c3 = vec4(0., 0., 0., 0.);

      // localizer #1
      // must be normalized!
      if(length(uPlane1.xyz) > 0.5) {
        vec3 projection1 = vec3(1.);
        intersectionProjection(
          uPlane1,
          uSlice,
          projection1
        );

        vec4 projInter1 = (vProjectionViewMatrix * vec4(projection1, 1.));
        vec3 ndc1 = projInter1.xyz / projInter1.w;
        // uViewportOffset is the viewport's lower-left corner in full-canvas device
        // pixels so that screenSpace aligns with gl_FragCoord (also device pixels).
        vec2 screenSpace1 = (ndc1.xy * .5 + .5) * vec2(uCanvasWidth, uCanvasHeight) + uViewportOffset;

        float d1 = distance(gl_FragCoord.xy, screenSpace1.xy);
        // 0.5–1.5 device-pixel threshold → ~0.5 CSS pixel — thin, crisp localizer line
        c1 = vec4(uPlaneColor1, 1. - smoothstep(0.5, 1.5, d1));
      }

      // localizer #2
      if(length(uPlane2.xyz) > 0.5) {
        vec3 projection2 = vec3(1.);
        intersectionProjection(
          uPlane2,
          uSlice,
          projection2
        );

        vec4 projInter2 = (vProjectionViewMatrix * vec4(projection2, 1.));
        vec3 ndc2 = projInter2.xyz / projInter2.w;
        vec2 screenSpace2 = (ndc2.xy * .5 + .5) * vec2(uCanvasWidth, uCanvasHeight) + uViewportOffset;

        float d2 = distance(gl_FragCoord.xy, screenSpace2.xy);
        c2 = vec4(uPlaneColor2, 1. - smoothstep(0.5, 1.5, d2));
      }

      // localizer #3
      if(length(uPlane3.xyz) > 0.5) {
        vec3 projection3 = vec3(1.);
        intersectionProjection(
          uPlane3,
          uSlice,
          projection3
        );

        vec4 projInter3 = (vProjectionViewMatrix * vec4(projection3, 1.));
        vec3 ndc3 = projInter3.xyz / projInter3.w;
        vec2 screenSpace3 = (ndc3.xy * .5 + .5) * vec2(uCanvasWidth, uCanvasHeight) + uViewportOffset;

        float d3 = distance(gl_FragCoord.xy, screenSpace3.xy);
        c3 = vec4(uPlaneColor3, 1. - smoothstep(0.5, 1.5, d3));
      }

      // float uBorderDashLength = 10.0;
      // float uBorderWidth = 2.0;
      // float valueX = mod(gl_FragCoord.x, 2. * uBorderDashLength);
      // float valueY = mod(gl_FragCoord.y, 2. * uBorderDashLength);
      // if( valueX < uBorderDashLength || valueY < uBorderDashLength ){
        vec3 colorMix = c1.xyz*c1.w + c2.xyz*c2.w + c3.xyz*c3.w;
        // Full opacity — previously *0.5 made lines hard to see, especially on Retina displays
        gl_FragColor = vec4(colorMix, max(max(c1.w, c2.w),c3.w));
        return;
      // }

      // gl_FragColor = vec4(0., 0., 0., 0.);
      // return;
}
   `;
  }

  /**
   *
   */
  compute(): string {
    return `
// uniforms
${this.uniforms()}

// varying (should fetch it from vertex directly)
varying vec4 vPos;
varying mat4 vProjectionViewMatrix;

// tailored functions
${this.functions()}

// main loop
${this._main}
      `;
  }
}
