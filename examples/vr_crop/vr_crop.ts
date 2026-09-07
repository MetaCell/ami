import * as THREE from 'three';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
/* globals Stats, dat*/

import ControlsTrackball from 'base/controls/controls.trackball';
import HelpersLut from 'base/helpers/helpers.lut';
import HelpersVR from 'base/helpers/helpers.volumerendering';
import HelpersStack from 'base/helpers/helpers.stack';
import LoadersVolume from 'base/loaders/loaders.volume';
import VRUniforms from 'base/shaders/shaders.vr.secondpass.uniform';
import VRFragment from 'base/shaders/shaders.vr.secondpass.fragment';
import VRVertex from 'base/shaders/shaders.vr.secondpass.vertex';

// ThreeBSP (CSG) was never actually loaded by this example (no script tag,
// no import) - the points.length === 10 branch below has always been dead
// code. Declared only so this file type-checks; preserved as-is.
declare const ThreeBSP: any;

// standard global letiables
let controls: any;
let threeD: HTMLElement;
let renderer: THREE.WebGLRenderer;
let stats: any;
let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let sceneT: THREE.Scene;
let vrHelper: any;
let lut: any;
let ready = false;
let modified = false;
let wheel: number | null = null;
let wheelTO: any = null;
let points: THREE.Vector3[] = [];
let baseMesh: THREE.Mesh | null = null;
let boxMeshSecondPass: THREE.Mesh | null = null;
let containerMesh: THREE.Mesh | null = null;
let materialFirstPass: THREE.ShaderMaterial | null = null;
let uniformsSecondPass: any = null;
let materialSecondPass: THREE.ShaderMaterial | null = null;
let rtTexture: THREE.WebGLRenderTarget | null = null;

const myStack = {
  lut: 'random',
  opacity: 'random',
  steps: 256,
  alphaCorrection: 0.5,
  frequence: 0,
  amplitude: 0,
  interpolation: 1,
};

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function onMouseMove(event: MouseEvent) {
  // calculate mouse position in normalized device coordinates
  // (-1 to +1) for both components

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

window.addEventListener('mousemove', onMouseMove, false);

function onStart(event: any) {
  // compute intersections
  // update the picking ray with the camera and mouse position
  console.log(mouse);
  console.log(scene);
  raycaster.setFromCamera(mouse, camera);

  // calculate objects intersecting the picking ray
  let intersects = raycaster.intersectObject(containerMesh!, false);
  console.log(intersects);

  for (let i = 0; i < intersects.length; i++) {
    console.log(intersects[i]);
    const geometry = new THREE.SphereGeometry(5, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const sphere = new THREE.Mesh(geometry, material);
    const point = intersects[i].point;
    points.push(point);
    sphere.position.set(point.x, point.y, point.z);
    scene.add(sphere);
    // intersects[i].object.material.color.set(0xff0000);
  }

  // smae in othre direction
  raycaster.ray.direction.multiplyScalar(-1);
  intersects = raycaster.intersectObject(containerMesh!, false);
  console.log(intersects);

  for (let i = 0; i < intersects.length; i++) {
    console.log(intersects[i]);
    const geometry = new THREE.SphereGeometry(5, 32, 32);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    const sphere = new THREE.Mesh(geometry, material);
    const point = intersects[i].point;
    points.push(point);
    sphere.position.set(point.x, point.y, point.z);
    scene.add(sphere);
    // intersects[i].object.material.color.set(0xff0000);
  }

  if (points.length === 10) {
    console.log(points);
    const geometry = new ConvexGeometry(points);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const mesh = new THREE.Mesh(geometry, material);

    const sphere_bsp = new ThreeBSP(mesh);
    const currentMesh = baseMesh;
    const base_bsp = new ThreeBSP(currentMesh);
    const subtract_bsp = base_bsp.intersect(sphere_bsp);
    const result = subtract_bsp.toMesh(materialFirstPass);
    result.geometry.computeVertexNormals();
    // sceneT.remove(currentMesh);
    // baseMesh = result;
    // sceneT.add(result);

    scene.remove(boxMeshSecondPass!);
    const currentMesh2 = boxMeshSecondPass;
    const base_bsp2 = new ThreeBSP(currentMesh2);
    const subtract_bsp2 = base_bsp2.subtract(sphere_bsp);
    const result2 = subtract_bsp2.toMesh(materialSecondPass);
    result2.geometry.computeVertexNormals();

    scene.remove(currentMesh2!);
    boxMeshSecondPass = result2;
    scene.add(result2);

    points = [];

    // scene.add(mesh);
  }

  if (vrHelper && uniformsSecondPass && !wheel) {
    uniformsSecondPass.uSteps.value = Math.floor(myStack.steps / 2);
    vrHelper.interpolation = 0;
    modified = true;
  }
}

function onEnd(event: any) {
  if (vrHelper && uniformsSecondPass && !wheel) {
    uniformsSecondPass.uSteps.value = myStack.steps;
    vrHelper.interpolation = myStack.interpolation;
    modified = true;
  }
}

function onWheel() {
  if (!wheel) {
    uniformsSecondPass.uSteps.value = Math.floor(myStack.steps / 2);
    vrHelper.interpolation = 0;
    wheel = Date.now();
  }

  if (Date.now() - wheel < 300) {
    clearTimeout(wheelTO);
    wheelTO = setTimeout(() => {
      uniformsSecondPass.uSteps.value = myStack.steps;
      vrHelper.interpolation = myStack.interpolation;
      wheel = null;
      modified = true;
    }, 300);
  }

  modified = true;
}

function onWindowResize() {
  // update the camera
  camera.aspect = threeD.offsetWidth / threeD.offsetHeight;
  camera.updateProjectionMatrix();

  // notify the renderer of the size change
  renderer.setSize(threeD.offsetWidth, threeD.offsetHeight);
  modified = true;
}

function buildGUI() {
  const gui = new dat.GUI({
    autoPlace: false,
  });

  const customContainer = document.getElementById('my-gui-container')!;
  customContainer.appendChild(gui.domElement);

  const stackFolder = gui.addFolder('Settings');
  const lutUpdate = stackFolder.add(myStack, 'lut', lut.lutsAvailable());
  lutUpdate.onChange((value: string) => {
    lut.lut = value;
    uniformsSecondPass.uTextureLUT.value.dispose();
    uniformsSecondPass.uTextureLUT.value = lut.texture;
    modified = true;
  });
  // init LUT
  lut.lut = myStack.lut;
  uniformsSecondPass.uTextureLUT.value.dispose();
  uniformsSecondPass.uTextureLUT.value = lut.texture;

  const opacityUpdate = stackFolder.add(myStack, 'opacity', lut.lutsAvailable('opacity'));
  opacityUpdate.onChange((value: string) => {
    lut.lutO = value;
    uniformsSecondPass.uTextureLUT.value.dispose();
    uniformsSecondPass.uTextureLUT.value = lut.texture;
    modified = true;
  });

  const stepsUpdate = stackFolder.add(myStack, 'steps', 0, 512).step(1);
  stepsUpdate.onChange((value: number) => {
    if (uniformsSecondPass) {
      uniformsSecondPass.uSteps.value = value;
      modified = true;
    }
  });

  const alphaCorrrectionUpdate = stackFolder.add(myStack, 'alphaCorrection', 0, 1).step(0.01);
  alphaCorrrectionUpdate.onChange((value: number) => {
    if (uniformsSecondPass) {
      uniformsSecondPass.uAlphaCorrection.value = value;
      modified = true;
    }
  });

  const interpolationUpdate = stackFolder.add(vrHelper, 'interpolation', 0, 1).step(1);
  interpolationUpdate.onChange((value: number) => {
    if (uniformsSecondPass) {
      modified = true;
    }
  });

  stackFolder.open();
}

function init() {
  // this function is executed on each animation frame
  function animate() {
    // render
    controls.update();

    if (ready && modified) {
      renderer.setRenderTarget(rtTexture);
      renderer.clear();
      renderer.render(sceneT, camera);
      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
      modified = false;
    }

    stats.update();

    // request new frame
    requestAnimationFrame(() => {
      animate();
    });
  }

  // renderer
  threeD = document.getElementById('r3d')!;
  renderer = new THREE.WebGLRenderer({
    alpha: true,
  });
  renderer.setSize(threeD.offsetWidth, threeD.offsetHeight);
  threeD.appendChild(renderer.domElement);

  // scene
  scene = new THREE.Scene();
  sceneT = new THREE.Scene();

  // stats
  stats = new Stats();
  threeD.appendChild(stats.domElement);

  // camera
  camera = new THREE.PerspectiveCamera(45, threeD.offsetWidth / threeD.offsetHeight, 0.1, 100000);
  camera.position.x = 166;
  camera.position.y = -471;
  camera.position.z = 153;
  camera.up.set(-0.42, 0.86, 0.26);

  // controls
  controls = new (ControlsTrackball!)(camera, threeD);
  controls.rotateSpeed = 5.5;
  controls.zoomSpeed = 1.2;
  controls.panSpeed = 0.8;
  controls.staticMoving = true;
  controls.dynamicDampingFactor = 0.3;
  controls.addEventListener('change', () => {
    modified = true;
  });
  renderer.domElement.addEventListener('mousedown', onStart);
  controls.addEventListener('end', onEnd);

  window.addEventListener('resize', onWindowResize, false);
  renderer.domElement.addEventListener('wheel', onWheel);
  // start rendering loop
  animate();
}

window.onload = () => {
  // init threeJS
  init();

  const filename = 'https://cdn.jsdelivr.net/gh/FNNDSC/data@master/nifti/eun_brain/eun_uchar_8.nii.gz';

  // load sequence for each file
  // instantiate the loader
  let loader: any = new LoadersVolume(threeD);
  loader
    .load(filename)
    .then(() => {
      const series = loader.data[0].mergeSeries(loader.data)[0];
      loader.free();
      loader = null;
      // get first stack from series
      const stack = series.stack[0];
      const stackHelper = new (HelpersStack!)(stack);

      vrHelper = new (HelpersVR!)(stack);
      // scene
      console.log(stackHelper._bBox._meshStack);
      // Convenience vars
      const dimensions = stack.dimensionsIJK;
      const halfDimensions = stack.halfDimensionsIJK;
      const offset = new THREE.Vector3(-0.5, -0.5, -0.5);

      // Geometry
      const geometry = new THREE.BoxGeometry(dimensions.x, dimensions.y, dimensions.z);
      geometry.applyMatrix4(
        new THREE.Matrix4().makeTranslation(
          halfDimensions.x + offset.x,
          halfDimensions.y + offset.y,
          halfDimensions.z + offset.z
        )
      );

      // Material
      const material = new THREE.MeshBasicMaterial({
        //   wireframe: true,
      });
      material.side = THREE.DoubleSide;

      const uniformsFirstPass: any = {
        uWorldBBox: {
          type: 'fv1',
          value: [0.0, 0.0, 0.0, 0.0, 0.0, 0.0],
        },
      };
      uniformsFirstPass.uWorldBBox.value = stack.worldBoundingBox();
      materialFirstPass = new THREE.ShaderMaterial({
        uniforms: uniformsFirstPass,
        side: THREE.BackSide,
        vertexShader: `
varying vec4 vPos;

//
// main
//
void main() {

  vPos = modelMatrix * vec4(position, 1.0 );
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0 );

}
`,
        fragmentShader: `
uniform float uWorldBBox[6];

varying vec4 vPos;

void main(void) {

// NORMALIZE LPS VALUES
gl_FragColor = vec4((vPos.x - uWorldBBox[0])/(uWorldBBox[1] - uWorldBBox[0]),
                    (vPos.y - uWorldBBox[2])/(uWorldBBox[3] - uWorldBBox[2]),
                    (vPos.z - uWorldBBox[4])/(uWorldBBox[5] - uWorldBBox[4]),
                    1.0);
}
`,
      });

      baseMesh = new THREE.Mesh(geometry, materialFirstPass);
      baseMesh.applyMatrix4(stack.ijk2LPS);

      const baseMaterial = new THREE.MeshBasicMaterial({
        wireframe: true,
      });
      const othermesh = new THREE.Mesh(geometry, baseMaterial);
      othermesh.applyMatrix4(stack.ijk2LPS);
      scene.add(othermesh);

      rtTexture = new THREE.WebGLRenderTarget(window.innerWidth, window.innerHeight, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.NearestFilter,
        format: THREE.RGBAFormat,
      });

      sceneT.add(baseMesh);

      const _textures: THREE.DataTexture[] = [];
      for (let m = 0; m < stack._rawData.length; m++) {
        const tex = new THREE.DataTexture(
          stack.rawData[m],
          stack.textureSize,
          stack.textureSize,
          stack.textureType,
          THREE.UnsignedByteType,
          THREE.UVMapping,
          THREE.ClampToEdgeWrapping,
          THREE.ClampToEdgeWrapping,
          THREE.NearestFilter,
          THREE.NearestFilter
        );
        tex.needsUpdate = true;
        tex.flipY = false;
        _textures.push(tex);
      }
      // Pad with empty placeholder textures so all 7 sampler slots are bound
      // (WebGL2 / Three.js r163+ faults on unbound sampler array entries)
      while (_textures.length < 7) {
        const dummy = new THREE.DataTexture(
          new Uint8Array(4),
          1,
          1,
          THREE.RGBAFormat,
          THREE.UnsignedByteType,
          THREE.UVMapping,
          THREE.ClampToEdgeWrapping,
          THREE.ClampToEdgeWrapping,
          THREE.NearestFilter,
          THREE.NearestFilter
        );
        dummy.generateMipmaps = false;
        dummy.needsUpdate = true;
        _textures.push(dummy);
      }

      uniformsSecondPass = VRUniforms.uniforms();
      uniformsSecondPass.uTextureSize.value = stack.textureSize;
      uniformsSecondPass.uTextureContainer.value = _textures;
      uniformsSecondPass.uWorldToData.value = stack.lps2IJK;
      uniformsSecondPass.uNumberOfChannels.value = stack.numberOfChannels;
      uniformsSecondPass.uBitsAllocated.value = stack.bitsAllocated;
      uniformsSecondPass.uWindowCenterWidth.value = [stack.windowCenter, stack.windowWidth * 0.8];
      uniformsSecondPass.uRescaleSlopeIntercept.value = [
        stack.rescaleSlope,
        stack.rescaleIntercept,
      ];
      uniformsSecondPass.uTextureBack.value = rtTexture.texture;
      uniformsSecondPass.uWorldBBox.value = stack.worldBoundingBox();
      uniformsSecondPass.uDataDimensions.value = [
        stack.dimensionsIJK.x,
        stack.dimensionsIJK.y,
        stack.dimensionsIJK.z,
      ];
      uniformsSecondPass.uSteps.value = myStack.steps;
      console.log(uniformsSecondPass);

      // Geometry
      const scale = 4;
      const newGeometry = new THREE.BoxGeometry(
        scale * dimensions.x,
        scale * dimensions.y,
        scale * dimensions.z
      );
      newGeometry.applyMatrix4(
        new THREE.Matrix4().makeTranslation(
          halfDimensions.x + offset.x,
          halfDimensions.y + offset.y,
          halfDimensions.z + offset.z
        )
      );

      // Material
      const newMaterial = new THREE.MeshBasicMaterial({
        wireframe: true,
      });
      newMaterial.side = THREE.DoubleSide;

      containerMesh = new THREE.Mesh(newGeometry, newMaterial);
      containerMesh.applyMatrix4(stack.ijk2LPS);

      scene.add(containerMesh);

      // CREATE LUT
      lut = new (HelpersLut!)('my-lut-canvases');
      lut.luts = (HelpersLut as any).presetLuts();
      lut.lutsO = (HelpersLut as any).presetLutsO();
      // update related uniforms
      uniformsSecondPass.uTextureLUT.value = lut.texture;
      uniformsSecondPass.uLut.value = 1;
      uniformsSecondPass.uAlphaCorrection.value = myStack.alphaCorrection;

      //
      const fs = new VRFragment(uniformsSecondPass);
      const vs = new VRVertex();
      materialSecondPass = new THREE.ShaderMaterial({
        uniforms: uniformsSecondPass,
        vertexShader: vs.compute(),
        fragmentShader: fs.compute(),
        side: THREE.FrontSide,
        transparent: true,
      });

      console.log(VRFragment);

      // mesh
      boxMeshSecondPass = new THREE.Mesh(geometry, materialSecondPass);
      // go the LPS space
      boxMeshSecondPass.applyMatrix4(stack._ijk2LPS);
      scene.add(boxMeshSecondPass);

      // update camrea's and interactor's target
      const centerLPS = stack.worldCenter();
      camera.lookAt(centerLPS.x, centerLPS.y, centerLPS.z);
      camera.updateProjectionMatrix();
      controls.target.set(centerLPS.x, centerLPS.y, centerLPS.z);

      // create GUI
      buildGUI();

      // screenshot experiment
      const screenshotElt = document.getElementById('screenshot')! as HTMLAnchorElement;
      screenshotElt.addEventListener('click', () => {
        controls.update();

        if (ready) {
          renderer.render(scene, camera);
        }

        const screenshot = renderer.domElement.toDataURL();
        screenshotElt.download = 'AMI-' + Date.now() + '.png';
        screenshotElt.href = screenshot;
      });

      // good to go
      ready = true;
      modified = true;
    })
    .catch((error: any) => window.console.log(error));
};
