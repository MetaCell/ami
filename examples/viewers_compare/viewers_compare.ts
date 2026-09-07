import * as THREE from 'three';
/* globals Stats, dat*/

import CamerasOrthographic from 'base/cameras/cameras.orthographic';
import ControlsOrthographic from 'base/controls/controls.trackballortho';
import HelpersLut from 'base/helpers/helpers.lut';
import HelpersStack from 'base/helpers/helpers.stack';
import LoadersVolume from 'base/loaders/loaders.volume';

import ShadersLayerUniform from 'base/shaders/shaders.layer.uniform';
import ShadersLayerVertex from 'base/shaders/shaders.layer.vertex';
import ShadersLayerFragment from 'base/shaders/shaders.layer.fragment';
import ShadersUniform from 'base/shaders/shaders.data.uniform';
import ShadersVertex from 'base/shaders/shaders.data.vertex';
import ShadersFragment from 'base/shaders/shaders.data.fragment';

// standard global letiables
let controls: any;
let renderer: THREE.WebGLRenderer;
let camera: any;
let statsyay: any;
let threeD: HTMLElement;
//
const mouse = {
  x: 0,
  y: 0,
};

function onMouseMove(event: MouseEvent) {
  // calculate mouse position in normalized device coordinates
  // (-1 to +1) for both components

  mouse.x = (event.clientX / threeD.clientWidth) * 2 - 1;
  mouse.y = -(event.clientY / threeD.clientHeight) * 2 + 1;

  // push to shaders
  uniformsLayerMix.uMouse.value = new THREE.Vector2(mouse.x, mouse.y);
}

//
let sceneLayer0TextureTarget: any;
let sceneLayer1TextureTarget: any;
//
let sceneLayer0: THREE.Scene;
//
let lutLayer0: any;
let sceneLayer1: THREE.Scene;
let meshLayer1: any;
let uniformsLayer1: any;
let materialLayer1: any;
let lutLayer1: any;
let sceneLayerMix: THREE.Scene;
let meshLayerMix: any;
let uniformsLayerMix: any;
let materialLayerMix: any;

const layer1 = {
  opacity: 1.0,
  lut: null as any,
  interpolation: 1,
};

const layerMix = {
  opacity0: 1.0,
  opacity1: 1.0,
  type0: 0,
  type1: 1,
  trackMouse: true,
};

function render() {
  // render
  controls.update();
  // render first layer offscreen
  renderer.setRenderTarget(sceneLayer0TextureTarget);
  renderer.clear();
  renderer.render(sceneLayer0, camera);
  // render second layer offscreen
  renderer.setRenderTarget(sceneLayer1TextureTarget);
  renderer.clear();
  renderer.render(sceneLayer1, camera);
  // mix the layers and render it ON screen!
  renderer.setRenderTarget(null);
  renderer.render(sceneLayerMix, camera);
  statsyay.update();
}

// FUNCTIONS
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
    antialias: true,
    alpha: true,
  });
  renderer.setSize(threeD.clientWidth, threeD.clientHeight);
  renderer.setClearColor(0x3f51b5, 1);

  threeD.appendChild(renderer.domElement);

  // stats
  statsyay = new Stats();
  threeD.appendChild(statsyay.domElement);

  // scene
  sceneLayer0 = new THREE.Scene();
  sceneLayer1 = new THREE.Scene();
  sceneLayerMix = new THREE.Scene();

  // render to texture!!!!
  sceneLayer0TextureTarget = new THREE.WebGLRenderTarget(threeD.clientWidth, threeD.clientHeight, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
  });

  sceneLayer1TextureTarget = new THREE.WebGLRenderTarget(threeD.clientWidth, threeD.clientHeight, {
    minFilter: THREE.LinearFilter,
    magFilter: THREE.NearestFilter,
    format: THREE.RGBAFormat,
  });

  // camera
  camera = new (CamerasOrthographic!)(
    threeD.clientWidth / -2,
    threeD.clientWidth / 2,
    threeD.clientHeight / 2,
    threeD.clientHeight / -2,
    0.1,
    10000
  );

  // controls
  controls = new (ControlsOrthographic!)(camera, threeD);
  controls.staticMoving = true;
  controls.noRotate = true;
  camera.controls = controls;

  animate();
}

window.onload = () => {
  // init threeJS...
  init();

  const data = [
    'patient1/7001_t1_average_BRAINSABC.nii.gz',
    'patient2/7002_t1_average_BRAINSABC.nii.gz',
  ];

  const files = data.map((v) => 'https://cdn.jsdelivr.net/gh/FNNDSC/data@master/nifti/slicer_brain/' + v);

  function buildGUI(stackHelper: any) {
    function updateLayer1() {
      // update layer1 geometry...
      if (meshLayer1) {
        meshLayer1.geometry.dispose();
        meshLayer1.geometry = stackHelper.slice.geometry;
      }
    }

    function updateLayerMix() {
      // update layer1 geometry...
      if (meshLayerMix) {
        sceneLayerMix.remove(meshLayerMix);
        meshLayerMix.material.dispose();
        // meshLayerMix.material = null;
        meshLayerMix.geometry.dispose();
        // meshLayerMix.geometry = null;

        // add mesh in this scene with right shaders...
        meshLayerMix = new THREE.Mesh(stackHelper.slice.geometry, materialLayerMix);
        // go the LPS space
        meshLayerMix.applyMatrix4(stackHelper.stack._ijk2LPS);

        sceneLayerMix.add(meshLayerMix);
      }
    }

    const stack = stackHelper._stack;

    const gui = new dat.GUI({
      autoPlace: false,
    });

    const customContainer = document.getElementById('my-gui-container')!;
    customContainer.appendChild(gui.domElement);

    //
    // layer 0 folder
    //
    const layer0Folder = gui.addFolder('Layer 0 (Base)');
    layer0Folder
      .add(stackHelper.slice, 'windowWidth', 1, stack.minMax[1])
      .step(1)
      .listen();
    layer0Folder
      .add(stackHelper.slice, 'windowCenter', stack.minMax[0], stack.minMax[1])
      .step(1)
      .listen();
    layer0Folder.add(stackHelper.slice, 'intensityAuto');
    layer0Folder.add(stackHelper.slice, 'invert');

    const lutUpdate = layer0Folder.add(stackHelper.slice, 'lut', lutLayer0.lutsAvailable());
    lutUpdate.onChange((value: string) => {
      lutLayer0.lut = value;
      stackHelper.slice.lutTexture = lutLayer0.texture;
    });

    const indexUpdate = layer0Folder
      .add(stackHelper, 'index', 0, stack.dimensionsIJK.z - 1)
      .step(1)
      .listen();
    indexUpdate.onChange(() => {
      updateLayer1();
      updateLayerMix();
    });

    layer0Folder
      .add(stackHelper.slice, 'interpolation', 0, 1)
      .step(1)
      .listen();

    layer0Folder.open();

    //
    // layer 1 folder
    //
    const layer1Folder = gui.addFolder('Layer 1');
    const interpolationLayer1 = layer1Folder
      .add(layer1, 'interpolation', 0, 1)
      .step(1)
      .listen();
    interpolationLayer1.onChange((value: number) => {
      uniformsLayer1.uInterpolation.value = value;
      // re-compute shaders
      const fs = new ShadersFragment(uniformsLayer1);
      materialLayer1.fragmentShader = fs.compute();
      materialLayer1.needsUpdate = true;
    });
    const layer1LutUpdate = layer1Folder.add(layer1, 'lut', lutLayer1.lutsAvailable());
    layer1LutUpdate.onChange((value: string) => {
      lutLayer1.lut = value;
      // propagate to shaders
      uniformsLayer1.uLut.value = 1;
      uniformsLayer1.uTextureLUT.value = lutLayer1.texture;
    });

    layer1Folder.open();

    //
    // layer mix folder
    //
    const layerMixFolder = gui.addFolder('Layer Mix');
    const opacityLayerMix = layerMixFolder
      .add(layerMix, 'opacity1', 0, 1)
      .step(0.01)
      .listen();
    opacityLayerMix.onChange((value: number) => {
      uniformsLayerMix.uOpacity1.value = value;
    });

    const layerMixTrackMouseUpdate = layerMixFolder.add(layerMix, 'trackMouse');
    layerMixTrackMouseUpdate.onChange((value: boolean) => {
      if (value) {
        uniformsLayerMix.uTrackMouse.value = 1;
      } else {
        uniformsLayerMix.uTrackMouse.value = 0;
      }
    });

    layerMixFolder.open();

    // hook up callbacks
    controls.addEventListener('OnScroll', (e: any) => {
      if (e.delta > 0) {
        if (stackHelper.index >= stack.dimensionsIJK.z - 1) {
          return false;
        }
        stackHelper.index += 1;
      } else {
        if (stackHelper.index <= 0) {
          return false;
        }
        stackHelper.index -= 1;
      }

      updateLayer1();
      updateLayerMix();
    });

    updateLayer1();
    updateLayerMix();

    function onWindowResize() {
      const threeD = document.getElementById('r3d')!;
      camera.canvas = {
        width: threeD.clientWidth,
        height: threeD.clientHeight,
      };
      camera.fitBox(2);

      sceneLayer0TextureTarget.setSize(threeD.clientWidth, threeD.clientHeight);
      sceneLayer1TextureTarget.setSize(threeD.clientWidth, threeD.clientHeight);

      renderer.setSize(threeD.clientWidth, threeD.clientHeight);
    }
    window.addEventListener('resize', onWindowResize, false);
    onWindowResize();

    // mouse move cb
    window.addEventListener('mousemove', onMouseMove, false);
  }

  let loader: any = new LoadersVolume(threeD);
  function handleSeries() {
    //
    // first stack of first series
    const mergedSeries = loader.data[0].mergeSeries(loader.data);
    loader.free();
    loader = null;

    let stack = null;
    let stack2 = null;

    if (
      mergedSeries[0].seriesInstanceUID !==
      'https://cdn.jsdelivr.net/gh/FNNDSC/data@master/nifti/slicer_brain/patient1/7001_t1_average_BRAINSABC.nii.gz'
    ) {
      stack = mergedSeries[1].stack[0];
      stack2 = mergedSeries[0].stack[0];
    } else {
      stack = mergedSeries[0].stack[0];
      stack2 = mergedSeries[1].stack[0];
    }

    stack = mergedSeries[0].stack[0];
    stack2 = mergedSeries[1].stack[0];

    const stackHelper = new (HelpersStack!)(stack);
    stackHelper.bbox.visible = false;
    stackHelper.border.visible = false;

    sceneLayer0.add(stackHelper);

    //
    // create layer 1....

    // prepare it
    // * ijk2LPS transforms
    // * Z spacing
    // * etc.
    //
    stack2.prepare();
    // pixels packing for the fragment shaders now happens there
    stack2.pack();

    const textures2 = [];
    for (let m = 0; m < stack2._rawData.length; m++) {
      const tex = new THREE.DataTexture(
        stack2.rawData[m],
        stack2.textureSize,
        stack2.textureSize,
        stack2.textureType,
        THREE.UnsignedByteType,
        THREE.UVMapping,
        THREE.ClampToEdgeWrapping,
        THREE.ClampToEdgeWrapping,
        THREE.NearestFilter,
        THREE.NearestFilter
      );
      tex.needsUpdate = true;
      tex.flipY = false;
      textures2.push(tex);
    }

    //
    // create material && mesh then add it to sceneLayer1
    uniformsLayer1 = ShadersUniform.uniforms();
    uniformsLayer1.uTextureSize.value = stack2.textureSize;
    uniformsLayer1.uTextureContainer.value = textures2;
    uniformsLayer1.uWorldToData.value = stack2.lps2IJK;
    uniformsLayer1.uNumberOfChannels.value = stack2.numberOfChannels;
    uniformsLayer1.uBitsAllocated.value = stack2.bitsAllocated;
    uniformsLayer1.uPackedPerPixel.value = stack2.packedPerPixel;
    uniformsLayer1.uWindowCenterWidth.value = [stack2.windowCenter, stack2.windowWidth];
    uniformsLayer1.uRescaleSlopeIntercept.value = [stack2.rescaleSlope, stack2.rescaleIntercept];
    uniformsLayer1.uDataDimensions.value = [
      stack2.dimensionsIJK.x,
      stack2.dimensionsIJK.y,
      stack2.dimensionsIJK.z,
    ];
    uniformsLayer1.uLowerUpperThreshold.value = [...stack2.minMax];

    // generate shaders on-demand!
    const fs = new ShadersFragment(uniformsLayer1);
    const vs = new ShadersVertex();
    materialLayer1 = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: uniformsLayer1,
      vertexShader: vs.compute(),
      fragmentShader: fs.compute(),
    });

    // add mesh in this scene with right shaders...
    meshLayer1 = new THREE.Mesh(stackHelper.slice.geometry, materialLayer1);
    // go the LPS space
    meshLayer1.applyMatrix4(stack._ijk2LPS);
    sceneLayer1.add(meshLayer1);

    //
    // Create the Mix layer
    uniformsLayerMix = ShadersLayerUniform.uniforms();
    uniformsLayerMix.uTextureBackTest0.value = sceneLayer0TextureTarget.texture;
    uniformsLayerMix.uTextureBackTest1.value = sceneLayer1TextureTarget.texture;
    uniformsLayerMix.uTrackMouse.value = 1;
    uniformsLayerMix.uMouse.value = new THREE.Vector2(0, 0);

    // generate shaders on-demand!
    const fls = new ShadersLayerFragment(uniformsLayerMix);
    const vls = new ShadersLayerVertex();
    materialLayerMix = new THREE.ShaderMaterial({
      side: THREE.DoubleSide,
      uniforms: uniformsLayerMix,
      vertexShader: vls.compute(),
      fragmentShader: fls.compute(),
      transparent: true,
    });

    // add mesh in this scene with right shaders...
    meshLayerMix = new THREE.Mesh(stackHelper.slice.geometry, materialLayerMix);
    // go the LPS space
    meshLayerMix.applyMatrix4(stack._ijk2LPS);
    sceneLayerMix.add(meshLayerMix);

    // set camera
    const worldbb = stack.worldBoundingBox();
    const lpsDims = new THREE.Vector3(
      worldbb[1] - worldbb[0],
      worldbb[3] - worldbb[2],
      worldbb[5] - worldbb[4]
    );

    // box: {halfDimensions, center}
    const box = {
      center: stack.worldCenter().clone(),
      halfDimensions: new THREE.Vector3(lpsDims.x + 50, lpsDims.y + 50, lpsDims.z + 50),
    };

    // init and zoom
    const canvas = {
      width: threeD.clientWidth,
      height: threeD.clientHeight,
    };

    camera.directions = [stack.xCosine, stack.yCosine, stack.zCosine];
    camera.box = box;
    camera.canvas = canvas;
    camera.update();
    camera.fitBox(2);

    // CREATE LUT
    lutLayer0 = new (HelpersLut!)(
      'my-lut-canvases-l0',
      'default',
      'linear',
      [[0, 0, 0, 0], [1, 1, 1, 1]],
      [[0, 1], [1, 1]]
    );
    lutLayer0.luts = (HelpersLut as any).presetLuts();

    lutLayer1 = new (HelpersLut!)(
      'my-lut-canvases-l1',
      'default',
      'linear',
      [[0, 0, 0, 0], [1, 1, 1, 1]],
      [[0, 1], [1, 1]]
    );
    lutLayer1.luts = (HelpersLut as any).presetLuts();
    layer1.lut = lutLayer1;

    buildGUI(stackHelper);
  }

  // load sequence for each file
  loader
    .load(files)
    .then(() => {
      handleSeries();
      // force 1st render
      render();
      // notify puppeteer to take screenshot
      const puppetDiv = document.createElement('div');
      puppetDiv.setAttribute('id', 'puppeteer');
      document.body.appendChild(puppetDiv);
    })
    .catch((error: any) => {
      window.console.log('oops... something went wrong...');
      window.console.log(error);
    });
};
