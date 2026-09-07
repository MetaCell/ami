import * as THREE from 'three';
/* globals dat*/
import CoreUtils from 'base/core/core.utils';
import LoadersVolume from 'base/loaders/loaders.volume';
import HelpersStack from 'base/helpers/helpers.stack';
import HelpersLut from 'base/helpers/helpers.lut';
import CamerasOrthographic from 'base/cameras/cameras.orthographic';
import ControlsOrthographic from 'base/controls/controls.trackballortho';

// standard global variables
let controls: any;
let renderer: THREE.WebGLRenderer;
let scene: THREE.Scene;
let camera: any;
let threeD: HTMLElement;
let lut: any;

let ctrlDown = false;
const drag: { start: { x: number | null; y: number | null } } = {
  start: {
    x: null,
    y: null,
  },
};

// probe
const camUtils = {
  invertRows: false,
  invertColumns: false,
  rotate: false,
  orientation: 'default',
  convention: 'radio',
};

/**
 * Init the scene
 */
function init() {
  /**
   * Animation loop
   */
  function animate() {
    // render
    controls.update();
    renderer.render(scene, camera);

    // request new frame
    requestAnimationFrame(() => {
      animate();
    });
  }

  // renderer
  threeD = document.getElementById('r3d')!;
  renderer = new THREE.WebGLRenderer({
    antialias: true,
  });
  renderer.setSize(threeD.clientWidth, threeD.clientHeight);
  renderer.setClearColor(0x212121, 1);

  threeD.appendChild(renderer.domElement);

  // scene
  scene = new THREE.Scene();
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
  // notify puppeteer to take screenshot
  const puppetDiv = document.createElement('div');
  puppetDiv.setAttribute('id', 'puppeteer');
  document.body.appendChild(puppetDiv);

  // hookup load button
  (document.getElementById('buttoninput') as HTMLElement).onclick = () => {
    document.getElementById('filesinput')!.click();
  };

  // init threeJS...
  init();

  function updateLabels(labels: string[], modality: string) {
    if (modality === 'CR' || modality === 'DX') return;

    const top = document.getElementById('top')!;
    top.innerHTML = labels[0];

    const bottom = document.getElementById('bottom')!;
    bottom.innerHTML = labels[1];

    const right = document.getElementById('right')!;
    right.innerHTML = labels[2];

    const left = document.getElementById('left')!;
    left.innerHTML = labels[3];
  }

  function buildGUI(stackHelper: any) {
    const stack = stackHelper._stack;

    const gui = new dat.GUI({
      autoPlace: false,
    });

    const customContainer = document.getElementById('my-gui-container')!;
    customContainer.appendChild(gui.domElement);

    const stackFolder = gui.addFolder('Stack');
    stackFolder
      .add(stackHelper.slice, 'windowWidth', 1, stack.minMax[1] - stack.minMax[0])
      .step(1)
      .listen();
    stackFolder
      .add(stackHelper.slice, 'windowCenter', stack.minMax[0], stack.minMax[1])
      .step(1)
      .listen();
    stackFolder
      .add(stackHelper.slice, 'lowerThreshold', stack.minMax[0], stack.minMax[1])
      .step(1)
      .listen();
    stackFolder
      .add(stackHelper.slice, 'upperThreshold', stack.minMax[0], stack.minMax[1])
      .step(1)
      .listen();
    stackFolder.add(stackHelper.slice, 'intensityAuto').listen();
    stackFolder.add(stackHelper.slice, 'invert');
    stackFolder
      .add(stackHelper.slice, 'interpolation', 0, 1)
      .step(1)
      .listen();

    // CREATE LUT
    lut = new (HelpersLut!)(
      'my-lut-canvases',
      'default',
      'linear',
      [[0, 0, 0, 0], [1, 1, 1, 1]],
      [[0, 1], [1, 1]]
    );
    lut.luts = (HelpersLut as any).presetLuts();

    const lutUpdate = stackFolder.add(stackHelper.slice, 'lut', lut.lutsAvailable());
    lutUpdate.onChange((value: string) => {
      lut.lut = value;
      stackHelper.slice.lutTexture = lut.texture;
    });
    const lutDiscrete = stackFolder.add(lut, 'discrete', false);
    lutDiscrete.onChange((value: boolean) => {
      lut.discrete = value;
      stackHelper.slice.lutTexture = lut.texture;
    });

    const index = stackFolder
      .add(stackHelper, 'index', 0, stack.dimensionsIJK.z - 1)
      .step(1)
      .listen();
    stackFolder.open();

    // camera
    const cameraFolder = gui.addFolder('Camera');
    const invertRows = cameraFolder.add(camUtils, 'invertRows');
    invertRows.onChange(() => {
      camera.invertRows();
      updateLabels(camera.directionsLabel, stack.modality);
    });

    const invertColumns = cameraFolder.add(camUtils, 'invertColumns');
    invertColumns.onChange(() => {
      camera.invertColumns();
      updateLabels(camera.directionsLabel, stack.modality);
    });

    const angle = cameraFolder
      .add(camera, 'angle', 0, 360)
      .step(1)
      .listen();
    angle.onChange(() => {
      updateLabels(camera.directionsLabel, stack.modality);
    });

    const rotate = cameraFolder.add(camUtils, 'rotate');
    rotate.onChange(() => {
      camera.rotate();
      updateLabels(camera.directionsLabel, stack.modality);
    });

    const orientationUpdate = cameraFolder.add(camUtils, 'orientation', [
      'default',
      'axial',
      'coronal',
      'sagittal',
    ]);
    orientationUpdate.onChange((value: string) => {
      camera.orientation = value;
      camera.update();
      camera.fitBox(2);
      stackHelper.orientation = camera.stackOrientation;
      updateLabels(camera.directionsLabel, stack.modality);

      index.__max = stackHelper.orientationMaxIndex;
      stackHelper.index = Math.floor(index.__max / 2);
    });

    const conventionUpdate = cameraFolder.add(camUtils, 'convention', ['radio', 'neuro']);
    conventionUpdate.onChange((value: string) => {
      camera.convention = value;
      camera.update();
      camera.fitBox(2);
      updateLabels(camera.directionsLabel, stack.modality);
    });
  }

  /**
   * Connect all callbevent observesrs
   */
  function hookCallbacks(stackHelper: any) {
    const stack = stackHelper._stack;
    // hook up callbacks
    controls.addEventListener('OnScroll', (e: any) => {
      if (e.delta > 0) {
        if (stackHelper.index >= stackHelper.orientationMaxIndex - 1) {
          return false;
        }
        stackHelper.index += 1;
      } else {
        if (stackHelper.index <= 0) {
          return false;
        }
        stackHelper.index -= 1;
      }
    });

    /**
     * On window resize callback
     */
    function onWindowResize() {
      const threeD = document.getElementById('r3d')!;
      camera.canvas = {
        width: threeD.clientWidth,
        height: threeD.clientHeight,
      };
      camera.fitBox(2);

      renderer.setSize(threeD.clientWidth, threeD.clientHeight);

      // update info to draw borders properly
      stackHelper.slice.canvasWidth = threeD.clientWidth;
      stackHelper.slice.canvasHeight = threeD.clientHeight;
    }

    window.addEventListener('resize', onWindowResize, false);
    onWindowResize();

    /**
     * On key pressed callback
     */
    function onWindowKeyPressed(event: KeyboardEvent) {
      ctrlDown = event.ctrlKey;
      if (!ctrlDown) {
        drag.start.x = null;
        drag.start.y = null;
      }
    }
    document.addEventListener('keydown', onWindowKeyPressed, false);
    document.addEventListener('keyup', onWindowKeyPressed, false);

    /**
     * On mouse move callback
     */
    function onMouseMove(event: MouseEvent) {
      if (ctrlDown) {
        if (drag.start.x === null) {
          drag.start.x = event.clientX;
          drag.start.y = event.clientY;
        }
        const threshold = 15;

        stackHelper.slice.intensityAuto = false;

        let dynamicRange = stack.minMax[1] - stack.minMax[0];
        dynamicRange /= threeD.clientWidth;

        if (Math.abs(event.clientX - drag.start.x!) > threshold) {
          // window width
          stackHelper.slice.windowWidth += dynamicRange * (event.clientX - drag.start.x!);
          drag.start.x = event.clientX;
        }

        if (Math.abs(event.clientY - drag.start.y!) > threshold) {
          // window center
          stackHelper.slice.windowCenter -= dynamicRange * (event.clientY - drag.start.y!);
          drag.start.y = event.clientY;
        }
      }
    }
    document.addEventListener('mousemove', onMouseMove);
  }

  /**
   * Visulaize incoming data
   */
  function handleSeries(seriesContainer: any[]) {
    // cleanup the loader and its progress bar
    loader.free();
    loader = null;
    // prepare for slice visualization
    // first stack of first series
    const stack = seriesContainer[0].mergeSeries(seriesContainer)[0].stack[0];

    const stackHelper = new (HelpersStack!)(stack);
    stackHelper.bbox.visible = false;
    stackHelper.borderColor = '#2196F3';
    stackHelper.border.visible = false;
    scene.add(stackHelper);

    // set camera
    const worldbb = stack.worldBoundingBox();
    const lpsDims = new THREE.Vector3(
      (worldbb[1] - worldbb[0]) / 2,
      (worldbb[3] - worldbb[2]) / 2,
      (worldbb[5] - worldbb[4]) / 2
    );

    // box: {halfDimensions, center}
    const box = {
      center: stack.worldCenter().clone(),
      halfDimensions: new THREE.Vector3(lpsDims.x + 10, lpsDims.y + 10, lpsDims.z + 10),
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

    updateLabels(camera.directionsLabel, stack.modality);
    buildGUI(stackHelper);
    hookCallbacks(stackHelper);
  }

  let loader: any = new LoadersVolume(threeD);
  const seriesContainer: any[] = [];

  /**
   * Filter array of data by extension
   * extension {String}
   * item {Object}
   * @return {Boolean}
   */
  function _filterByExtension(extension: string, item: any): boolean {
    if (item.extension.toUpperCase() === extension.toUpperCase()) {
      return true;
    }
    return false;
  }

  /**
   * Parse incoming files
   */
  function readMultipleFiles(evt: any) {
    // hide the upload button
    if (evt.target.files.length) {
      (document.getElementById('home-container') as HTMLElement).style.display = 'none';
    }

    /**
     * Load sequence
     */
    function loadSequence(index: number, files: any[]) {
      return (
        Promise.resolve()
          // load the file
          .then(() => new Promise((resolve, reject) => {
              const myReader = new FileReader();
              // should handle errors too...
              myReader.addEventListener('load', (e: any) => {
                resolve(e.target.result);
              });
              myReader.readAsArrayBuffer(files[index]);
            }))
          .then((buffer) => loader.parse({ url: files[index].name, buffer }))
          .then((series: any) => {
            seriesContainer.push(series);
          })
          .catch((error: any) => {
            window.console.log('oops... something went wrong...');
            window.console.log(error);
          })
      );
    }

    /**
     * Load group sequence
     */
    function loadSequenceGroup(files: any[]) {
      const fetchSequence = [];

      for (let i = 0; i < files.length; i++) {
        fetchSequence.push(
          new Promise((resolve, reject) => {
            const myReader = new FileReader();
            // should handle errors too...
            myReader.addEventListener('load', (e: any) => {
              resolve(e.target.result);
            });
            myReader.readAsArrayBuffer(files[i].file);
          }).then((buffer) => ({ url: files[i].file.name, buffer }))
        );
      }

      return Promise.all(fetchSequence)
        .then((rawdata) => {
          return loader.parse(rawdata);
        })
        .then((series: any) => {
          seriesContainer.push(series);
        })
        .catch((error: any) => {
          window.console.log('oops... something went wrong...');
          window.console.log(error);
        });
    }

    const loadSequenceContainer: Promise<any>[] = [];

    const data: any[] = [];
    const dataGroups: any[] = [];
    // convert object into array
    for (let i = 0; i < evt.target.files.length; i++) {
      const dataUrl = CoreUtils.parseUrl(evt.target.files[i].name);
      if (
        dataUrl.extension.toUpperCase() === 'MHD' ||
        dataUrl.extension.toUpperCase() === 'RAW' ||
        dataUrl.extension.toUpperCase() === 'ZRAW'
      ) {
        dataGroups.push({
          file: evt.target.files[i],
          extension: dataUrl.extension.toUpperCase(),
        });
      } else {
        data.push(evt.target.files[i]);
      }
    }

    // check if some files must be loaded together
    if (dataGroups.length === 2) {
      // if raw/mhd pair
      const mhdFile = dataGroups.filter(_filterByExtension.bind(null, 'MHD'));
      const rawFile = dataGroups.filter(_filterByExtension.bind(null, 'RAW'));
      const zrawFile = dataGroups.filter(_filterByExtension.bind(null, 'ZRAW'));
      if (mhdFile.length === 1 && (rawFile.length === 1 || zrawFile.length === 1)) {
        loadSequenceContainer.push(loadSequenceGroup(dataGroups));
      }
    }

    // load the rest of the files
    for (let i = 0; i < data.length; i++) {
      loadSequenceContainer.push(loadSequence(i, data));
    }

    // run the load sequence
    // load sequence for all files
    Promise.all(loadSequenceContainer)
      .then(() => {
        handleSeries(seriesContainer);
      })
      .catch((error: any) => {
        window.console.log('oops... something went wrong...');
        window.console.log(error);
      });
  }
  // hook up file input listener
  document.getElementById('filesinput')!.addEventListener('change', readMultipleFiles, false);
};
