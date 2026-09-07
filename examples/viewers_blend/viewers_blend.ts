import * as THREE from 'three';
/* globals Stats, dat*/

import CamerasOrthographic from 'base/cameras/cameras.orthographic';
import ControlsOrthographic from 'base/controls/controls.trackballortho';
import ControlsTrackball from 'base/controls/controls.trackball';
import HelpersBoundingBox from 'base/helpers/helpers.boundingbox';
import HelpersLut from 'base/helpers/helpers.lut';
import HelpersSegmentationLut from 'base/helpers/helpers.segmentationlut';
import HelpersStack from 'base/helpers/helpers.stack';
import LoadersVolume from 'base/loaders/loaders.volume';
import PresetsSegmentation from 'base/presets/presets.segmentation';

import ShadersDataUniform from 'base/shaders/shaders.data.uniform';
import ShadersDataVertex from 'base/shaders/shaders.data.vertex';
import ShadersDataFragment from 'base/shaders/shaders.data.fragment';

let stats: any;
let ready = false;

// Two volume overlays sampled in world space — shared across all 2D panes.
// layerCT: the coregistered CT (continuous overlay)
// layerSeg: the cortical segmentation (discrete labels, transparent background)
let layerCT: any = null;
let layerSeg: any = null;

// Mix params (default opacity for each overlay)
const layerMix = {
  opacityCT: 0.5,
  opacitySeg: 0.5,
};

// 3D pane
const r0: any = {
  domId: 'r0',
  domElement: null,
  renderer: null,
  color: 0x212121,
  camera: null,
  controls: null,
  scene: null,
  light: null,
};

function makePane(domId: string, orientation: string, sliceColor: number): any {
  return {
    domId,
    sliceOrientation: orientation,
    sliceColor,
    domElement: null,
    renderer: null,
    camera: null,
    controls: null,
    // single scene with T1 + CT + Seg meshes; native alpha blending composes
    // them so the 2D pane behaves exactly like the 3D view.
    scene: null,
    stackHelper: null,
    meshCT: null,
    meshSeg: null,
  };
}

const r1 = makePane('r1', 'axial', 0xff1744);
const r2 = makePane('r2', 'sagittal', 0xffea00);
const r3 = makePane('r3', 'coronal', 0x76ff03);

function initRenderer3D(obj: any) {
  obj.domElement = document.getElementById(obj.domId);
  obj.renderer = new THREE.WebGLRenderer({ antialias: true });
  obj.renderer.setSize(obj.domElement.clientWidth, obj.domElement.clientHeight);
  obj.renderer.setClearColor(obj.color, 1);
  obj.domElement.appendChild(obj.renderer.domElement);

  obj.camera = new THREE.PerspectiveCamera(
    45,
    obj.domElement.clientWidth / obj.domElement.clientHeight,
    0.1,
    100000
  );
  obj.camera.position.set(250, 250, 250);

  obj.controls = new (ControlsTrackball!)(obj.camera, obj.domElement);
  obj.controls.rotateSpeed = 5.5;
  obj.controls.zoomSpeed = 1.2;
  obj.controls.panSpeed = 0.8;
  obj.controls.staticMoving = true;
  obj.controls.dynamicDampingFactor = 0.3;

  obj.scene = new THREE.Scene();
  obj.light = new THREE.DirectionalLight(0xffffff, 1);
  obj.light.position.copy(obj.camera.position);
  obj.scene.add(obj.light);

  stats = new Stats();
  obj.domElement.appendChild(stats.domElement);
}

function initRenderer2D(obj: any) {
  obj.domElement = document.getElementById(obj.domId);
  obj.renderer = new THREE.WebGLRenderer({ antialias: true });
  obj.renderer.setSize(obj.domElement.clientWidth, obj.domElement.clientHeight);
  obj.renderer.setClearColor(0x121212, 1);
  obj.domElement.appendChild(obj.renderer.domElement);

  obj.camera = new (CamerasOrthographic!)(
    obj.domElement.clientWidth / -2,
    obj.domElement.clientWidth / 2,
    obj.domElement.clientHeight / 2,
    obj.domElement.clientHeight / -2,
    1,
    1000
  );

  obj.controls = new (ControlsOrthographic!)(obj.camera, obj.domElement);
  obj.controls.staticMoving = true;
  obj.controls.noRotate = true;
  obj.camera.controls = obj.controls;

  obj.scene = new THREE.Scene();
}

function initLayer0(obj: any, stack: any) {
  obj.stackHelper = new (HelpersStack!)(stack);
  obj.stackHelper.bbox.visible = false;
  obj.stackHelper.border.visible = false;
  obj.stackHelper.slice.canvasWidth = obj.domElement.clientWidth;
  obj.stackHelper.slice.canvasHeight = obj.domElement.clientHeight;

  const worldbb = stack.worldBoundingBox();
  const lpsDims = new THREE.Vector3(
    (worldbb[1] - worldbb[0]) / 2,
    (worldbb[3] - worldbb[2]) / 2,
    (worldbb[5] - worldbb[4]) / 2
  );
  const box = {
    center: stack.worldCenter().clone(),
    halfDimensions: new THREE.Vector3(lpsDims.x + 10, lpsDims.y + 10, lpsDims.z + 10),
  };
  const canvas = { width: obj.domElement.clientWidth, height: obj.domElement.clientHeight };

  obj.camera.directions = [stack.xCosine, stack.yCosine, stack.zCosine];
  obj.camera.box = box;
  obj.camera.canvas = canvas;
  obj.camera.orientation = obj.sliceOrientation;
  obj.camera.update();
  obj.camera.fitBox(2, 1);

  obj.stackHelper.orientation = obj.camera.stackOrientation;
  obj.stackHelper.index = Math.floor(obj.stackHelper.orientationMaxIndex / 2);

  obj.scene.add(obj.stackHelper);
}

function initOverlayMeshes(obj: any, baseStack: any) {
  // CT and Seg are rendered as transparent meshes on top of the T1 stack
  // helper. Native alpha blending composes them — same approach the 3D view
  // already uses, so 2D and 3D look identical.
  obj.meshCT = new THREE.Mesh(obj.stackHelper.slice.geometry, layerCT.material);
  obj.meshCT.applyMatrix4(baseStack._ijk2LPS);
  obj.meshCT.renderOrder = 1;
  obj.scene.add(obj.meshCT);

  obj.meshSeg = new THREE.Mesh(obj.stackHelper.slice.geometry, layerSeg.material);
  obj.meshSeg.applyMatrix4(baseStack._ijk2LPS);
  obj.meshSeg.renderOrder = 2;
  obj.scene.add(obj.meshSeg);
}

// When the slice index changes, the slice helper rebuilds its geometry. CT
// and Seg meshes need their geometries refreshed so they sample the new plane.
function refreshPaneGeometry(obj: any, baseStack: any) {
  const rebuild = (parent: any, prevMesh: any, mat: any, renderOrder: number) => {
    if (!prevMesh) return null;
    parent.remove(prevMesh);
    const m = new THREE.Mesh(obj.stackHelper.slice.geometry, mat);
    m.applyMatrix4(baseStack._ijk2LPS);
    m.renderOrder = renderOrder;
    parent.add(m);
    return m;
  };
  obj.meshCT = rebuild(obj.scene, obj.meshCT, layerCT.material, 1);
  obj.meshSeg = rebuild(obj.scene, obj.meshSeg, layerSeg.material, 2);
}

function renderPane(obj: any) {
  obj.controls.update();
  obj.renderer.render(obj.scene, obj.camera);
}

function render() {
  if (!ready) return;

  r0.controls.update();
  r0.light.position.copy(r0.camera.position);
  r0.renderer.render(r0.scene, r0.camera);

  renderPane(r1);
  renderPane(r2);
  renderPane(r3);

  stats.update();
}

function init() {
  function animate() {
    render();
    requestAnimationFrame(animate);
  }

  initRenderer3D(r0);
  initRenderer2D(r1);
  initRenderer2D(r2);
  initRenderer2D(r3);

  animate();
}

// Build a shared overlay layer (material + uniforms + LUT) from a stack.
function createOverlay(stack: any, lutName: string | null, opts: any = {}): any {
  stack.prepare();
  stack.pack();

  const textures = [];
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
    textures.push(tex);
  }

  const uniforms = ShadersDataUniform.uniforms();
  uniforms.uTextureSize.value = stack.textureSize;
  uniforms.uTextureContainer.value = textures;
  uniforms.uWorldToData.value = stack.lps2IJK;
  uniforms.uNumberOfChannels.value = stack.numberOfChannels;
  uniforms.uPixelType.value = stack.pixelType;
  uniforms.uPackedPerPixel.value = stack.packedPerPixel;
  uniforms.uBitsAllocated.value = stack.bitsAllocated;
  uniforms.uWindowCenterWidth.value = [
    opts.windowCenter ?? stack.windowCenter,
    opts.windowWidth ?? stack.windowWidth,
  ];
  uniforms.uRescaleSlopeIntercept.value = [stack.rescaleSlope, stack.rescaleIntercept];
  uniforms.uDataDimensions.value = [
    stack.dimensionsIJK.x,
    stack.dimensionsIJK.y,
    stack.dimensionsIJK.z,
  ];
  uniforms.uInterpolation.value = opts.interpolation ?? 1;
  uniforms.uLowerUpperThreshold.value = [...stack.minMax];
  uniforms.uOpacity.value = opts.opacity ?? 1;

  const material = new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    uniforms,
    vertexShader: new ShadersDataVertex().compute(),
    fragmentShader: new ShadersDataFragment(uniforms).compute(),
    transparent: true,
    depthWrite: false,
  });

  if (opts.segmentation) {
    // Segmentations use a 2D label-indexed LUT — each label is looked up
    // directly by integer (no window/level mapping). Background label 0 has
    // opacity 0 in the FreeSurfer preset so it's always transparent.
    const segLut = new (HelpersSegmentationLut!)('lut-host', opts.segmentation);
    uniforms.uLutSegmentation.value = 1;
    uniforms.uTextureLUTSegmentation.value = segLut.texture;
    return { stack, uniforms, material, segLut };
  }

  // Continuous overlay (e.g. CT) — 1D LUT keyed by normalized intensity
  const lut = new (HelpersLut!)('lut-host');
  lut.luts = (HelpersLut as any).presetLuts();
  lut.lut = lutName;
  uniforms.uLut.value = 1;
  uniforms.uTextureLUT.value = lut.texture;

  return { stack, uniforms, material, lut };
}

const BASE_LAYERS: Record<string, string> = {
  T1: '/data/t1.mgz',
  MRI: '/data/mri-patient02.nii.gz',
};
const CT_URL = '/data/coregistration.nii.gz';
const SEG_URL = '/data/corticalSegmentation.DKTatlas+aseg.deep.mgz';

window.onload = () => {
  init();

  const params = new URLSearchParams(window.location.search);
  const baseKey = (params.get('base') || 'T1').toUpperCase();
  const baseUrl = BASE_LAYERS[baseKey] || BASE_LAYERS.T1;

  const loader: any = new LoadersVolume();
  Promise.all([
    loader.fetch(baseUrl).then((d: any) => loader.parse(d)).catch((e: any) => {
      window.console.error('Failed to load base:', baseUrl, e);
      throw e;
    }),
    loader.fetch(CT_URL).then((d: any) => loader.parse(d)).catch((e: any) => {
      window.console.error('Failed to load CT:', CT_URL, e);
      throw e;
    }),
    loader.fetch(SEG_URL).then((d: any) => loader.parse(d)).catch((e: any) => {
      window.console.error('Failed to load Seg:', SEG_URL, e);
      throw e;
    }),
  ])
    .then(([seriesBase, seriesCT, seriesSeg]: any) => {
      const stackBase = seriesBase.stack[0];
      const stackCT = seriesCT.stack[0];
      const stackSeg = seriesSeg.stack[0];

      stackBase.prepare();

      // CT: continuous data, hot LUT
      layerCT = createOverlay(stackCT, 'hot_and_cold', {
        opacity: layerMix.opacityCT,
      });
      // Seg: FreeSurfer label volume — use the built-in segmentation preset
      // which provides canonical FreeSurfer colors and opacity 0 for label 0
      // (background), keeping it transparent at any overlay opacity
      const segPresets = new (PresetsSegmentation as any)('Freesurfer');
      layerSeg = createOverlay(stackSeg, null, {
        opacity: layerMix.opacitySeg,
        interpolation: 0, // nearest-neighbor for label data
        segmentation: segPresets.preset,
      });

      // 3D view: bounding box (from base) + per-pane T1 + CT + Seg slices
      r0.camera.lookAt(...stackBase.worldCenter().toArray());
      r0.camera.updateProjectionMatrix();
      r0.controls.target.copy(stackBase.worldCenter());
      r0.scene.add(new (HelpersBoundingBox!)(stackBase));

      [r1, r2, r3].forEach((pane: any) => {
        initLayer0(pane, stackBase);
        initOverlayMeshes(pane, stackBase);
        // The 2D pane's scene contains T1 + CT + Seg meshes; adding it to the
        // 3D scene makes the same three layers appear in the 3D view too.
        r0.scene.add(pane.scene);
      });

      // CT air-transparency curve. The CT LUT's alpha stops are rebuilt every
      // time the CT opacity slider moves so that:
      //   slider 0..0.8  -> air voxels (low normalized intensity) have alpha 0
      //                     (fully transparent), tissue alpha 1
      //   slider 0.8..1  -> air alpha ramps 0 -> 1, bringing the background
      //                     back into view
      // The "air threshold" is in normalized-intensity space (after windowing)
      // — 0.2 is a reasonable default for typical CT windows; the user can
      // shift it by adjusting CT window/level.
      const CT_AIR_THRESHOLD_NORMALIZED = 0.2;
      function updateCtAirAlpha(opacity: number) {
        const airAlpha = Math.max(0, (opacity - 0.8) / 0.2);
        const stops = [
          [0, airAlpha],
          [CT_AIR_THRESHOLD_NORMALIZED, airAlpha],
          [CT_AIR_THRESHOLD_NORMALIZED + 0.0001, 1],
          [1, 1],
        ];
        layerCT.lut.lutsO = { ...(HelpersLut as any).presetLutsO(), 'ct-air': stops };
        layerCT.lut.lutO = 'ct-air';
        layerCT.uniforms.uTextureLUT.value = layerCT.lut.texture;
      }
      updateCtAirAlpha(layerMix.opacityCT);
      // Initial CT shader alpha: drives both 3D blending and 2D mix factor
      layerCT.uniforms.uOpacity.value = layerMix.opacityCT;
      layerSeg.uniforms.uOpacity.value = layerMix.opacitySeg;

      // GUI
      const gui = new dat.GUI({ autoPlace: false });
      document.getElementById('my-gui-container')!.appendChild(gui.domElement);

      const baseState = { base: baseKey in BASE_LAYERS ? baseKey : 'T1' };
      gui
        .add(baseState, 'base', Object.keys(BASE_LAYERS))
        .name('Base layer')
        .onChange((v: string) => {
          const url = new URL(window.location.href);
          url.searchParams.set('base', v);
          window.location.href = url.toString();
        });

      const blendFolder = gui.addFolder('Blend');
      blendFolder
        .add(layerMix, 'opacityCT', 0, 1)
        .step(0.01)
        .name('CT opacity')
        .onChange((v: number) => {
          // CT layer alpha drives both 2D (via mix uType1=1) and 3D (alpha
          // blending). The air bring-back curve is encoded in the LUT alpha.
          layerCT.uniforms.uOpacity.value = v;
          updateCtAirAlpha(v);
        });
      blendFolder
        .add(layerMix, 'opacitySeg', 0, 1)
        .step(0.01)
        .name('Seg opacity')
        .onChange((v: number) => {
          layerSeg.uniforms.uOpacity.value = v;
        });
      blendFolder.open();

      const baseFolder = gui.addFolder('Base (T1/MRI)');
      baseFolder.add(r1.stackHelper.slice, 'windowWidth', 1, stackBase.minMax[1] - stackBase.minMax[0]).step(1).listen();
      baseFolder.add(r1.stackHelper.slice, 'windowCenter', stackBase.minMax[0], stackBase.minMax[1]).step(1).listen();
      baseFolder.add(r1.stackHelper.slice, 'intensityAuto');

      function addOverlayWLLut(folder: any, layer: any, defaultLut: string, label: string) {
        const stack = layer.stack;
        const minVal = Number.isFinite(stack.minMax[0]) ? stack.minMax[0] : 0;
        const maxVal = Number.isFinite(stack.minMax[1]) ? stack.minMax[1] : 1;
        // ensure a valid (min < max) range for the dat.gui sliders
        const safeMax = maxVal > minVal ? maxVal : minVal + 1;
        const range = Math.max(1, safeMax - minVal);
        window.console.log(`[viewers_blend] ${label} minMax:`, stack.minMax, 'using', minVal, safeMax);

        const state = {
          windowCenter: Number(layer.uniforms.uWindowCenterWidth.value[0]) || (minVal + safeMax) / 2,
          windowWidth: Number(layer.uniforms.uWindowCenterWidth.value[1]) || range,
          lut: defaultLut,
        };
        folder
          .add(state, 'windowCenter', minVal, safeMax)
          .step(1)
          .onChange((v: number) => {
            layer.uniforms.uWindowCenterWidth.value = [v, state.windowWidth];
          });
        folder
          .add(state, 'windowWidth', 1, range)
          .step(1)
          .onChange((v: number) => {
            layer.uniforms.uWindowCenterWidth.value = [state.windowCenter, v];
          });
        folder.add(state, 'lut', layer.lut.lutsAvailable()).onChange((v: string) => {
          layer.lut.lut = v;
          layer.uniforms.uTextureLUT.value = layer.lut.texture;
        });
      }

      addOverlayWLLut(gui.addFolder('CT (overlay)'), layerCT, 'hot_and_cold', 'CT');

      // CT-only transform — translate / rotate / scale the CT volume in world
      // space. The transform is applied by composing a 4x4 matrix M and
      // updating uWorldToData = lps2IJK * M^-1, so the CT shader samples its
      // own data at the transformed world coords. Rotation/scale are anchored
      // at the CT volume center so they happen in-place.
      const ctCenter = stackCT.worldCenter().clone();
      const baseLps2IJK = stackCT.lps2IJK.clone();
      const ctXform: any = {
        tx: 0, ty: 0, tz: 0,        // translation (mm)
        rxDeg: 0, ryDeg: 0, rzDeg: 0, // rotation (degrees)
        sx: 1, sy: 1, sz: 1,        // scale
        reset: () => {
          ctXform.tx = ctXform.ty = ctXform.tz = 0;
          ctXform.rxDeg = ctXform.ryDeg = ctXform.rzDeg = 0;
          ctXform.sx = ctXform.sy = ctXform.sz = 1;
          applyCtTransform();
          // Force the GUI to repaint
          for (const c of xformFolder.__controllers) c.updateDisplay();
        },
      };
      const D2R = Math.PI / 180;
      function applyCtTransform() {
        const T = new THREE.Matrix4().makeTranslation(
          ctCenter.x + ctXform.tx,
          ctCenter.y + ctXform.ty,
          ctCenter.z + ctXform.tz
        );
        const R = new THREE.Matrix4().makeRotationFromEuler(
          new THREE.Euler(ctXform.rxDeg * D2R, ctXform.ryDeg * D2R, ctXform.rzDeg * D2R)
        );
        const S = new THREE.Matrix4().makeScale(ctXform.sx, ctXform.sy, ctXform.sz);
        const T0 = new THREE.Matrix4().makeTranslation(-ctCenter.x, -ctCenter.y, -ctCenter.z);
        // M = T * R * S * T0  (rotate/scale around CT center, then translate)
        const M = new THREE.Matrix4().multiplyMatrices(T, R).multiply(S).multiply(T0);
        const Minv = M.clone().invert();
        const newW2D = baseLps2IJK.clone().multiply(Minv);
        layerCT.uniforms.uWorldToData.value = newW2D;
      }
      const xformFolder = gui.addFolder('CT transform');
      xformFolder.add(ctXform, 'tx', -100, 100).step(0.5).name('translate X').onChange(applyCtTransform);
      xformFolder.add(ctXform, 'ty', -100, 100).step(0.5).name('translate Y').onChange(applyCtTransform);
      xformFolder.add(ctXform, 'tz', -100, 100).step(0.5).name('translate Z').onChange(applyCtTransform);
      xformFolder.add(ctXform, 'rxDeg', -180, 180).step(0.5).name('rotate X°').onChange(applyCtTransform);
      xformFolder.add(ctXform, 'ryDeg', -180, 180).step(0.5).name('rotate Y°').onChange(applyCtTransform);
      xformFolder.add(ctXform, 'rzDeg', -180, 180).step(0.5).name('rotate Z°').onChange(applyCtTransform);
      xformFolder.add(ctXform, 'sx', 0.25, 4).step(0.01).name('scale X').onChange(applyCtTransform);
      xformFolder.add(ctXform, 'sy', 0.25, 4).step(0.01).name('scale Y').onChange(applyCtTransform);
      xformFolder.add(ctXform, 'sz', 0.25, 4).step(0.01).name('scale Z').onChange(applyCtTransform);
      xformFolder.add(ctXform, 'reset').name('Reset transform');

      // Segmentation has no window/level — the LUT is keyed by integer label.
      // The preset selector lets users pick between built-in presets.
      const segFolder = gui.addFolder('Segmentation (overlay)');
      const segState = { preset: 'Freesurfer' };
      const presetNames = new (PresetsSegmentation as any)().presetsAvailable();
      if (presetNames.length > 1) {
        segFolder.add(segState, 'preset', presetNames).onChange((v: string) => {
          const p = new (PresetsSegmentation as any)(v);
          layerSeg.segLut.segmentation = p.preset;
          layerSeg.uniforms.uTextureLUTSegmentation.value = layerSeg.segLut.texture;
        });
      }

      const sliceFolder = gui.addFolder('Slices');
      [
        { pane: r1, label: 'Axial' },
        { pane: r2, label: 'Sagittal' },
        { pane: r3, label: 'Coronal' },
      ].forEach(({ pane, label }: any) => {
        const ctrl = sliceFolder
          .add(pane.stackHelper, 'index', 0, pane.stackHelper.orientationMaxIndex)
          .step(1)
          .name(label)
          .listen();
        ctrl.onChange(() => refreshPaneGeometry(pane, stackBase));
      });
      sliceFolder.open();

      [r1, r2, r3].forEach((pane: any) => {
        pane.controls.addEventListener('OnScroll', (e: any) => {
          if (e.delta > 0) {
            if (pane.stackHelper.index >= pane.stackHelper.orientationMaxIndex - 1) return;
            pane.stackHelper.index += 1;
          } else {
            if (pane.stackHelper.index <= 0) return;
            pane.stackHelper.index -= 1;
          }
          refreshPaneGeometry(pane, stackBase);
        });
      });

      function resize2D(p: any) {
        const w = p.domElement.clientWidth;
        const h = p.domElement.clientHeight;
        p.camera.canvas = { width: w, height: h };
        p.camera.fitBox(2, 1);
        p.renderer.setSize(w, h);
        p.stackHelper.slice.canvasWidth = w;
        p.stackHelper.slice.canvasHeight = h;
      }
      window.addEventListener('resize', () => {
        r0.camera.aspect = r0.domElement.clientWidth / r0.domElement.clientHeight;
        r0.camera.updateProjectionMatrix();
        r0.renderer.setSize(r0.domElement.clientWidth, r0.domElement.clientHeight);
        resize2D(r1);
        resize2D(r2);
        resize2D(r3);
      });

      ready = true;
      render();
    })
    .catch((err: any) => {
      window.console.error('Failed to load volumes:', err);
    });
};
