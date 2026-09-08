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
let controls: any, threeD: HTMLElement, renderer: THREE.WebGLRenderer, stats: any, camera: THREE.PerspectiveCamera, scene: THREE.Scene;
let vrHelper: any;
let lut: any;
let ready = false;
let interpolationState: number;

const myStack = {
  lut: 'walking_dead',
  opacity: 'linear',
  steps: 128,
  alphaCorrection: 0.5,
  frequence: 0,
  amplitude: 0,
  interpolation: 1,
};

function onMouseDown() {
  if (vrHelper && vrHelper.uniforms) {
    vrHelper.uniforms.uSteps.value = Math.floor(myStack.steps / 2);
    // save interpolation state
    interpolationState = myStack.interpolation;
    vrHelper.interpolation = 0;
  }
}

function onMouseUp() {
  if (vrHelper && vrHelper.uniforms) {
    vrHelper.uniforms.uSteps.value = myStack.steps;
    vrHelper.interpolation = interpolationState;
  }
}

function onWindowResize() {
  // update the camera
  camera.aspect = threeD.offsetWidth / threeD.offsetHeight;
  camera.updateProjectionMatrix();

  // notify the renderer of the size change
  renderer.setSize(threeD.offsetWidth, threeD.offsetHeight);
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
    vrHelper.uniforms.uTextureLUT.value.dispose();
    vrHelper.uniforms.uTextureLUT.value = lut.texture;
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
  });

  const stepsUpdate = stackFolder.add(myStack, 'steps', 0, 512).step(1);
  stepsUpdate.onChange((value: number) => {
    if (vrHelper.uniforms) {
      vrHelper.uniforms.uSteps.value = value;
    }
  });

  const alphaCorrrectionUpdate = stackFolder.add(myStack, 'alphaCorrection', 0, 1).step(0.01);
  alphaCorrrectionUpdate.onChange((value: number) => {
    if (vrHelper.uniforms) {
      vrHelper.uniforms.uAlphaCorrection.value = value;
    }
  });

  const frequenceUpdate = stackFolder.add(myStack, 'frequence', 0, 1).step(0.01);
  frequenceUpdate.onChange((value: number) => {
    if (vrHelper.uniforms) {
      vrHelper.uniforms.uFrequence.value = value;
    }
  });

  const amplitudeUpdate = stackFolder.add(myStack, 'amplitude', 0, 0.5).step(0.01);
  amplitudeUpdate.onChange((value: number) => {
    if (vrHelper.uniforms) {
      vrHelper.uniforms.uAmplitude.value = value;
    }
  });

  const interpolation = stackFolder.add(vrHelper, 'interpolation', 0, 1).step(1);

  stackFolder.open();
}
function render() {
  // render
  controls.update();

  if (ready) {
    renderer.render(scene, camera);
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

  threeD.addEventListener('mousedown', onMouseDown, false);
  threeD.addEventListener('mouseup', onMouseUp, false);
  window.addEventListener('resize', onWindowResize, false);

  // start rendering loop
  animate();
}

window.onload = () => {
  // init threeJS
  init();

  const data = ['scan-00109_rec-01a.nii_.gz'];

  const files = data.map((v) => 'https://cdn.jsdelivr.net/gh/FNNDSC/data@master/nifti/lifewatch_echinoidea/' + v);

  // files = ['http://127.0.0.1:8080/brainc.nii']

  //   let data = [
  //  'scan-00109_rec-01a.nii_.gz'
  //   // '7002_t1_average_BRAINSABC.nii.gz'
  // ];

  // let files = data.map(function(v) {
  //   return '@/data/nii/' + v;
  // });

  // load sequence for each file
  // instantiate the loader
  // it loads and parses the dicom image
  // hookup a progress bar....
  let loader: any = new LoadersVolume(threeD);
  const seriesContainer: any[] = [];
  const loadSequence: Promise<any>[] = [];
  files.forEach((url) => {
    loadSequence.push(
      Promise.resolve()
        // fetch the file
        .then(() => loader.fetch(url))
        .then((data: any) => loader.parse(data))
        .then((series: any) => {
          seriesContainer.push(series);
        })
        .catch((error: any) => {
          window.console.log('oops... something went wrong...');
          window.console.log(error);
        })
    );
  });

  // load sequence for all files
  Promise.all(loadSequence)
    .then(() => {
      loader.free();
      loader = null;

      const series = seriesContainer[0].mergeSeries(seriesContainer)[0];
      // get first stack from series
      const stack = series.stack[0];

      vrHelper = new (HelpersVR!)(stack);
      // scene
      scene = new THREE.Scene();
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
        screenshotElt.download = 'VJS-' + Date.now() + '.png';
        screenshotElt.href = screenshot;
      });

      // good to go
      ready = true;

      // force first render
      render();
      // notify puppeteer to take screenshot
      const puppetDiv = document.createElement('div');
      puppetDiv.setAttribute('id', 'puppeteer');
      document.body.appendChild(puppetDiv);
    })
    .catch((error: any) => window.console.log(error));
};
