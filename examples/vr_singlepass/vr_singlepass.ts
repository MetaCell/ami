import * as THREE from 'three';
/* globals Stats, dat*/

import ControlsTrackball from 'base/controls/controls.trackball';
import HelpersLut from 'base/helpers/helpers.lut';
import HelpersVR from 'base/helpers/helpers.volumerendering';
import LoadersVolume from 'base/loaders/loaders.volume';

// Raymarching this volume at native HiDPI resolution (devicePixelRatio > 1) multiplies
// the fragment count and can push the shader past the GPU driver's watchdog timeout,
// losing the WebGL context outright. Cap it at 1.
const PIXEL_RATIO = Math.min(window.devicePixelRatio, 1);

// standard global letiables
let controls: any;
let threeD: HTMLElement;
let renderer: THREE.WebGLRenderer;
let stats: any;
let camera: THREE.PerspectiveCamera;
let scene: THREE.Scene;
let vrHelper: any;
let lut: any;
let ready = false;
let modified = false;
let wheel: number | null = null;
let wheelTO: ReturnType<typeof setTimeout> | null = null;

const myStack = {
  algorithm: 'ray marching',
  lut: 'random',
  opacity: 'random',
  steps: 128,
  alphaCorrection: 0.5,
  frequence: 0,
  amplitude: 0,
  interpolation: 1,
};

function onStart(event?: any) {
  if (vrHelper && vrHelper.uniforms && !wheel) {
    renderer.setPixelRatio(0.1 * PIXEL_RATIO);
    renderer.setSize(threeD.offsetWidth, threeD.offsetHeight);
    modified = true;
  }
}

function onEnd(event?: any) {
  if (vrHelper && vrHelper.uniforms && !wheel) {
    renderer.setPixelRatio(0.5 * PIXEL_RATIO);
    renderer.setSize(threeD.offsetWidth, threeD.offsetHeight);
    modified = true;

    setTimeout(() => {
      renderer.setPixelRatio(PIXEL_RATIO);
      renderer.setSize(threeD.offsetWidth, threeD.offsetHeight);
      modified = true;
    }, 100);
  }
}

function onWheel() {
  if (!wheel) {
    renderer.setPixelRatio(0.1 * PIXEL_RATIO);
    renderer.setSize(threeD.offsetWidth, threeD.offsetHeight);
    wheel = Date.now();
  }

  if (Date.now() - wheel < 300) {
    clearTimeout(wheelTO!);
    wheelTO = setTimeout(() => {
      renderer.setPixelRatio(0.5 * PIXEL_RATIO);
      renderer.setSize(threeD.offsetWidth, threeD.offsetHeight);
      modified = true;

      setTimeout(() => {
        renderer.setPixelRatio(PIXEL_RATIO);
        renderer.setSize(threeD.offsetWidth, threeD.offsetHeight);
        wheel = null;
        modified = true;
      }, 100);
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
  const algorithmUpdate = stackFolder.add(myStack, 'algorithm', ['ray marching', 'mip']);
  algorithmUpdate.onChange((value: string) => {
    vrHelper.algorithm = value === 'mip' ? 1 : 0;
    modified = true;
  });

  const lutUpdate = stackFolder.add(myStack, 'lut', lut.lutsAvailable());
  lutUpdate.onChange((value: string) => {
    lut.lut = value;
    vrHelper.uniforms.uTextureLUT.value.dispose();
    vrHelper.uniforms.uTextureLUT.value = lut.texture;
    modified = true;
  });
  // init LUT
  lut.lut = myStack.lut;
  vrHelper.uniforms.uTextureLUT.value.dispose();
  vrHelper.uniforms.uTextureLUT.value = lut.texture;

  const opacityUpdate = stackFolder.add(myStack, 'opacity', lut.lutsAvailable('opacity'));
  opacityUpdate.onChange((value: string) => {
    lut.lutO = value;
    vrHelper.uniforms.uTextureLUT.value.dispose();
    vrHelper.uniforms.uTextureLUT.value = lut.texture;
    modified = true;
  });

  const stepsUpdate = stackFolder.add(myStack, 'steps', 0, 512).step(1);
  stepsUpdate.onChange((value: number) => {
    if (vrHelper.uniforms) {
      vrHelper.uniforms.uSteps.value = value;
      modified = true;
    }
  });

  const alphaCorrrectionUpdate = stackFolder.add(myStack, 'alphaCorrection', 0, 1).step(0.01);
  alphaCorrrectionUpdate.onChange((value: number) => {
    if (vrHelper.uniforms) {
      vrHelper.uniforms.uAlphaCorrection.value = value;
      modified = true;
    }
  });

  const interpolationUpdate = stackFolder.add(vrHelper, 'interpolation', 0, 1).step(1);
  interpolationUpdate.onChange((value: number) => {
    if (vrHelper.uniforms) {
      modified = true;
    }
  });

  const shadingUpdate = stackFolder.add(vrHelper, 'shading', 0, 1).step(1);
  shadingUpdate.onChange((value: number) => {
    if (vrHelper.uniforms) {
      modified = true;
    }
  });

  const shininessUpdate = stackFolder.add(vrHelper, 'shininess', 0, 20).step(0.1);
  shininessUpdate.onChange((value: number) => {
    if (vrHelper.uniforms) {
      modified = true;
    }
  });

  stackFolder.open();
}

function render() {
  // render
  controls.update();

  if (ready && modified) {
    renderer.render(scene, camera);
    modified = false;
  }

  stats.update();
}

function init() {
  // this function is executed on each animation frame
  function animate() {
    render();

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
  renderer.setPixelRatio(PIXEL_RATIO);
  threeD.appendChild(renderer.domElement);

  // scene
  scene = new THREE.Scene();

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
  controls.addEventListener('start', onStart);
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
  const files = [filename];

  // load sequence for each file
  // instantiate the loader
  let loader: any = new LoadersVolume(threeD);
  loader
    .load(files)
    .then(() => {
      const series = loader.data[0].mergeSeries(loader.data)[0];
      loader.free();
      loader = null;
      // get first stack from series
      const stack = series.stack[0];

      vrHelper = new (HelpersVR!)(stack);
      // scene
      scene.add(vrHelper);

      // CREATE LUT
      lut = new (HelpersLut!)('my-lut-canvases');
      lut.luts = (HelpersLut as any).presetLuts();
      lut.lutsO = (HelpersLut as any).presetLutsO();
      // update related uniforms
      vrHelper.uniforms.uTextureLUT.value = lut.texture;
      vrHelper.uniforms.uLut.value = 1;

      // update camrea's and interactor's target
      const centerLPS = stack.worldCenter();
      camera.lookAt(centerLPS.x, centerLPS.y, centerLPS.z);
      camera.updateProjectionMatrix();
      controls.target.set(centerLPS.x, centerLPS.y, centerLPS.z);

      // create GUI
      buildGUI();

      // screenshot experiment
      const screenshotElt = document.getElementById('screenshot') as HTMLAnchorElement;
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

      // force first render
      render();
      // notify puppeteer to take screenshot
      const puppetDiv = document.createElement('div');
      puppetDiv.setAttribute('id', 'puppeteer');
      document.body.appendChild(puppetDiv);
    })
    .catch((error: any) => window.console.log(error));
};
