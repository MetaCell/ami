# Changelog
All notable changes to this project will be documented in this file.

We may want to also add it to the Gtihub release information.

Note: We need this file so we can log new features while we are developing instead of having to do it all at once when release happens.

## 1.0.0

### Big changes
- [[migration]](https://github.com/Metacell/ami/commit/c49f7895bc05d4777e713e8a81126ff1abaa71bc) Full JS → TS migration: the entire `src/` tree (99 files) is now TypeScript, with real `three.js` types via the `@types/three` devDependency (`three` itself ships no bundled declarations). Generated `.d.ts` output now carries real types instead of `any`-typed anonymous objects.
- **BREAKING**: [[controls]](https://github.com/Metacell/ami/commit/64936787872b5a1e858f03c297e81ec239409933) Removed `OrbitControl`/`orbitControlFactory`. It was a vendored copy of an old three.js example (see `controls.orbit.js`'s own header), broken since at least the `three >= 0.180` peer dependency bump (`Quaternion.inverse()` was renamed to `.invert()` upstream years ago — construction threw unconditionally), and confirmed to have zero consumers across this repo, `geppetto-meta`, and `natus`. `TrackballControl`/`TrackballOrthoControl` are unaffected and remain the maintained orbit-style controls.

### Fixed
Real bugs surfaced by real types replacing `any` during the migration:
- [[core: intersections]](https://github.com/Metacell/ami/commit/c49f7895bc05d4777e713e8a81126ff1abaa71bc) `aabbPlane`/`rayBox` can return `false` on invalid input; their only callers (`geometries.slice.js`, `rayBox`'s own use inside `core.intersections.js`) dereferenced the result unguarded — a real crash risk on invalid geometry, not just a type nit.
- [[core: intersections]](core/) Same class of bug, one more spot: typing `rayPlaneInBBox`'s `bbox` param (previously `any`) as `CoreUtils.bbox()`'s real return type surfaced that `aabbPlane` itself never checked its own internal `bbox()` call for `false` before using it — unreachable today since `validateAabb` already guarantees a valid box, but a silent crash waiting for that invariant to drift. Added the same guard `rayBox` already had.
- **BREAKING**: [[presets: segmentation]](presets/) Typing `PresetsSegmentation._presets` (previously `any`) surfaced that `addPreset(presetObj)` called `this._presets.push(presetObj)` on what is actually a plain object keyed by preset name (`{Freesurfer: {...}}`, not an array) — it would have thrown at runtime on its very first call. `addPreset` is unused anywhere in this repo, `geppetto-meta`, or `natus`, so this had never been hit. Changed its signature to `addPreset(name: string, presetObj: SegmentationPreset)`, matching how `fetchPreset` already looks presets up by name.
- [[models: stack]](models/) `ModelsStack._sortSopInstanceUIDArraySort` did `a.sopInstanceUID - b.sopInstanceUID` — numeric subtraction of two DICOM UID strings, always `NaN`. Silently made this last-resort frame-ordering fallback (`orderFrames()`, used only when dimensionIndexValues, imagePosition/imageOrientation, and instanceNumber are all unavailable) a no-op. Now compares with `localeCompare`.
- [[models: voxel]](https://github.com/Metacell/ami/commit/c49f7895bc05d4777e713e8a81126ff1abaa71bc) `ModelsVoxel.value` was mistyped as `number`; it's only ever assigned a formatted string (`'NA'` or `.toFixed()`).
- [[widgets]](https://github.com/Metacell/ami/commit/c49f7895bc05d4777e713e8a81126ff1abaa71bc) Several widget/handle methods (`onMove`, `adjustLabelTransform`, `updateRoI`, `updateDOMContent`) were called both with and without their last argument across call sites, silently relying on `undefined` coercing to falsy — given explicit defaults at the one shared declaration instead of leaving it implicit.
- [[parsers]](https://github.com/Metacell/ami/commit/c49f7895bc05d4777e713e8a81126ff1abaa71bc) Dropped a stray radix argument passed to `parseFloat` (`parsers.mhd.js` — `parseFloat` has no radix param, that's `parseInt`-only), an unused endian argument on single-byte `DataView` reads (`parsers.mgh.js` — a single byte has no endianness), and an unused `frameIndex` argument on a series-level DICOM tag read (`parsers.dicom.js`).

### Changed
- [[core]](https://github.com/Metacell/ami/commit/c49f7895bc05d4777e713e8a81126ff1abaa71bc) Deleted dead code found during the migration: `core.pack.js` and `helpers.dummy.js` (both unreferenced anywhere; `helpers.dummy.js` also referenced an unimported global `THREE` and would have thrown if ever instantiated).
- [[helpers]](https://github.com/Metacell/ami/commit/4a9c6a7c87ce0ea12b997705a131df8e1fb9660b) Ported from `master`: size `uTextureContainer` to the actual number of bound textures instead of a fixed 7/14 slots, dropping the 1x1 dummy-texture padding this required — the fixed size cost a wasted `texture2D` sample per unused slot, per interpolation sample, on every fragment. Also collapsed `StackHelper`'s index scroll handler from two full slice rebuilds (`index` then `planePosition`, each triggering `_update()`) into one via a new `SliceHelper.setIndexAndPlanePosition()`.
- [[build]](https://github.com/Metacell/ami/commit/1a113471eab375a22da2321238f3e62a65d7721a) Added a `typecheck` script (`tsc --noEmit`) — `yarn build` alone never verified types, it just ran vite/esbuild. Also dropped `allowJs`/`checkJs` and the `src/**/*.js` include entry from `tsconfig.json`, dead now that `src/` is 100% TypeScript.
- [[specs]](specs/) Converted the remaining `specs/` test files and `vitest.setup.js` to TypeScript, and brought `specs/` under the `typecheck` script (it wasn't in `tsconfig.json`'s `include` before, so even the pre-existing `.ts` specs went unchecked). Tests that deliberately pass malformed input to `core.intersections`/`core.validators` to exercise runtime guards use `@ts-expect-error` at each bad property instead of `as any` — it fails the build if that argument ever stops being a type error, e.g. if the field it targets is loosened to optional, catching test/API drift that a blanket cast would hide. `loaders.base.spec`'s reach into `LoadersBase`'s `protected` internals uses bracket-notation (`loader['_container']`) instead of `as any`, keeping normal property access on `loader` fully typed.
- [[core]](core/) Eliminated every `any` in `src/core/` (was 14). `core.validators.ts`'s 4 validators now take `unknown` and are real type predicates (`objectToTest is Matrix4`, etc.) instead of `(x: any) => boolean` — callers get actual narrowing, not just a boolean. Added `core/core.types.ts` for the `AABB`/`Plane`/`Ray`/`Box` shapes shared between `core.validators.ts` and `core.intersections.ts` (previously duplicated locally in each file since importing between them risked a cycle). `core.utils.ts`'s stack/camera/mesh-touching methods (`getPixelData`, `setPixelData`, `getRoI`, …) get local structural interfaces (`StackLike`, `CameraWithControls`) instead of `any` — a real `ModelsStack`/`THREE.Camera` import isn't possible here without a cycle (`models.stack.ts` already imports `core.utils.ts`), so this is a deliberate boundary, not a shortcut.
- [[geometries]](geometries/) Eliminated both `any`s in `src/geometries/` (`geometries.slice.ts`). `vertices` is now typed `OrderedPoint[]` (exported from `core.utils.ts`, the function that produces them). `(this as any).type = '...'` — working around `@types/three` declaring `BufferGeometry.type` `readonly` for exactly this "subclasses will update this value" case — became `Object.assign(this, { type: '...' })`, which sets it without a readonly-bypass cast.
- [[presets]](presets/) Eliminated every `any` in `src/presets/` (`presets.segmentation.ts`). Added `SegmentationLabel`/`SegmentationPreset` types for the `{color, opacity, label}` shape already used throughout `presets.segmentation.freesurfer.ts`. `get preset()`/`set preset()` needed explicit return/param type annotations to compile once `fetchPreset` returned a real type — the pair intentionally has asymmetric types (get returns preset data, set takes a preset name), which TS only accepts with both sides annotated.
- [[cameras]](cameras/) Eliminated every `any` in `src/cameras/` (`cameras.orthographic.ts`). `_box`/`box(...)` params are now the shared `Box` type from `core/core.types.ts` (the same shape `Intersections.rayBox` already required). `_controls` gets a local `ControlsLike` interface (`target`/`update`/`handleResize`) rather than importing `ControlsTrackball` directly — both `ControlsTrackball` and `ControlsTrackballOrtho` satisfy it structurally, and the camera genuinely doesn't care which; naming one concrete class would be less accurate, not more.
- [[shaders]](shaders/) Eliminated every `any` in `src/shaders/` (the uniform bag / fragment-shader plumbing shared by every helper). Added `shaders/shaders.types.ts`: `ShaderUniform`/`ShaderUniforms` for the `{type, value, typeGLSL, length?}` entries every `*.uniform.ts` returns, and `BaseFragment` (`{_uniforms, _functions}`) for what `shaders/helpers/*` and `shaders/interpolation/*` read/write via `_base`. Dropped `private` on `_uniforms`/`_functions` on all six `*.fragment.ts` classes — they were already reached into from outside the class via `_base` on every real code path (just untyped, via `any`), so `private` was providing no actual encapsulation, only blocking real typing of `_base`.
- [[models]](models/) Pass A of `src/models/` (data fields only — the `merge`/`validate` protocol across all four classes is a separate, deliberately deferred pass). `models.frame.ts`/`models.series.ts`/`models.stack.ts` had 58 `any`s combined; down to the 6 protocol methods still pending. Highlights: `ModelsSeries._stack`/`ModelsStack._frame` are now real `ModelsStack[]`/`ModelsFrame[]` (previously `any[]`) — the single highest-leverage change here, since `loaders/` and eventually `helpers/` consume these directly. Added `models/models.types.ts` (`SegmentationSegment`, `UltrasoundRegion`, `PixelBuffer`) for shapes `parsers/` produces but doesn't itself type yet. Added a public `ModelsStack.numberOfFrames` getter — `ModelsSeries.merge()` was already reaching into `ModelsStack`'s private `_numberOfFrames` from outside the class (silently permitted while both were `any`); real typing caught it, and the fix is a getter, not a cast. Widened `CoreUtils.minMax`'s param from `number[]` to `ArrayLike<number>` since frame pixel buffers are typed arrays, not plain arrays.
- [[models]](models/) Pass B of `src/models/`: the `mergeModels`/`merge`/`validate`/`_validateModelArray` protocol shared by `ModelsBase` and overridden in `ModelsFrame`/`ModelsSeries`/`ModelsStack`. Every real caller passes a `ModelsBase` subclass (never arbitrary untrusted input, unlike `core.validators.ts`), so the base takes plain `ModelsBase` rather than `unknown` + predicates or a generic — subclass overrides narrow the parameter type further (e.g. `ModelsFrame.validate(model: ModelsFrame)`), which TypeScript's bivariant method-override checking permits and which the `_validateModelArray` self-check (`modelArray[i].validate(modelArray[i])`, confirmed original design via `git log`, not drift) relies on via dynamic dispatch. This also typed `specs/models/*.spec.ts`'s `let validXxx;` variables, which had been implicitly `any` (no initializer, no annotation) and so were never actually exercising these signatures despite the earlier specs-conversion pass — deliberately-invalid calls (`merge()`, `merge('whatever')`) now use `@ts-expect-error`, and direct writes to private fields (`frame._imageOrientation = ...`) were switched to the existing public setters they were bypassing.

## 0.34.0

MetaCell fork, published as `@metacell/ami` on npm.

### Big changes
- [[build]](https://github.com/Metacell/ami/commit/2a679fbdbc4c2ff181dca7ea64bb18019076205a) Switch build/dev tooling from webpack/Karma to Vite/Vitest and upgrade Three.js import paths.
- [[deps: threejs]](https://github.com/Metacell/ami/commit/d3dff5b05e20ab4d8a15433ea6651501e383b766) Upgrade Three.js peer dependency to >= 0.180 and adapt code.
- [[package]](https://github.com/Metacell/ami/commit/fe3661ac669719c4291391998cfee6a360a09190) Publish as `@metacell/ami` on npm.

### Changed
- [[examples]](https://github.com/Metacell/ami/commit/4608d75a3a5f20462ac7cc571ab998aaefd72c9b) Apply safe lint fixes from biome.
- [[specs]](https://github.com/Metacell/ami/commit/f49bc873a05426c4ee03fc01891735907248e959) Apply safe lint fixes from biome on tests.
- [[src]](https://github.com/Metacell/ami/commit/1e793f4872ef72698f41c750d22b50e34e9cd9df) Apply safe lint fix (using biome).
- [[src]](https://github.com/Metacell/ami/commit/f4a6bfd517bbc2fd5196db6fbbd9b7082909e35a) Reorganize imports.
- [[specs]](https://github.com/Metacell/ami/commit/452f6f30d490b9da2f3853d397b53b66400c8409) Update tests.
- [[build]](https://github.com/Metacell/ami/commit/53c678edf960bf5f5462ad09a6079ac4e7c77d0b) Remove unused files and bump package version.
- [[parsers]](https://github.com/Metacell/ami/commit/43e3df4ac06652df3596c2a9f6837e1cf9787dcb) Update some dependencies and use of them.
- Update `.gitignore`.

### Removed
- [[build]](https://github.com/Metacell/ami/commit/bb1143a2846d680114d59d53168182ef3b3a989f) Remove committed build files (`build/` is no longer tracked in git).

### Fixed
- [[parsers: nifti]](https://github.com/Metacell/ami/commit/d2ef365ab594acb22b46e163f3f1d7e3b755176a) Fix nifti parser bug when decoding affine using sform.
- [[parsers]](https://github.com/Metacell/ami/commit/1954f7cc4f6c412c0b2be31a185f05acd4fa37a8) Fix orientation computation.
- [[shaders: interpolation]](https://github.com/Metacell/ami/commit/b811b92d91e5469eeafbefae8267dfcfb241fa5c) Fix ghosting artifact when volume sampling falls outside the data bounds.
- [[shaders: interpolation]](https://github.com/Metacell/ami/commit/062ca33429db72a5b48cb9d1cce0f53fa9bb0600) Zero-fill trilinear chunks instead of discarding.
- [[build]](https://github.com/Metacell/ami/commit/019310c9dd9730ee687ba904f03dc2db6fbfcc9a) Fix ts-errors when generating `.d.ts` declarations.
- [[helpers]](https://github.com/Metacell/ami/commit/b07d1bcf5f7ae4f171838f7ff82033e4729e3e77) Fix issue with latest Three.js upgrade.
- [[examples: vr crop]](https://github.com/Metacell/ami/commit/f349a91aef5e6ed5a9fb9875d4a10f1df7b322c4) Fix issue with VR on crop and single pass examples.
- [[helpers]](https://github.com/Metacell/ami/commit/b87592b8c2d0630ab1ee7988ba32456d2fb9a4f8) Fix old WebGL options and threejs call.
- [[examples: editor draw]](https://github.com/Metacell/ami/commit/256410756d914c85e73d739eb44a5fe0ff65ab1b) Fix draw editor example.
- [[examples]](https://github.com/Metacell/ami/commit/e9f32d4b9a64ea5b66221bd7c5a1c9bfa969a757) Fix some examples, build and imports.

## 0.0.23-dev


### Big changes
- MGH/Z and FSM support - [#134, #242](https://github.com/FNNDSC/ami/pull/245).
- MHD/RAWZ support. [#249](https://github.com/FNNDSC/ami/pull/252)
- `ami.js` stack overflow tag - [#65](https://github.com/FNNDSC/ami/issues/65).

### API changes
- [[helpers: segmentation lut]](https://github.com/FNNDSC/ami/commit/c311a3e1f82d964ab6bebd368d2286dc104f6a2e) Removed `segId` argument in constructor.

### Added
- [[shaders: single pass volume rendering]](https://github.com/FNNDSC/ami/commit/37b6a87c6616601d6aa61964740c67245fba69ec) Add MIP volume rendering.
- [[shaders: single pass volume rendering]](https://github.com/FNNDSC/ami/pull/228) Add phong shading support.
- [[shaders: contours]]() Add flag to control the opacity of a contour.

### Changed
- [[karma]](https://github.com/FNNDSC/ami/commit/57e7d89c9bc84add8c622c5040a74880638c905b) ChromeHeadless instead of Phantom for Karma tests.
- Update `NPM` to `Yarn` in *README.md*.
- Update command `npm run` to `yarn` in *package.json*.
- [[shaders: single pass volume rendering]](https://github.com/FNNDSC/ami/pull/213) Improved volume rendering opacity.

### Removed
- [[shaders: vr]](https://github.com/FNNDSC/ami/pull/219) Remove unused variables.

### Fixed
- [[shaders: helpers: unpack]](https://github.com/FNNDSC/ami/issues/223) upackDefault value is identity.
- [[shaders: helpers: trilinear interpolation]](https://github.com/FNNDSC/ami/issues/229) Fix gradient computation during trilinear interpolation.
- [[helpers: vr]](https://github.com/FNNDSC/ami/pull/227) Render back face of mesh to be able to zoom in VR volume.
- [[parsers: dicom]](https://github.com/FNNDSC/ami/pull/251) Support 'RGB', 'YBR_RCT', 'YBR_ICT', 'YBR_FULL_422' photometric interpolations.
- [[parsers: nrrd]](https://github.com/FNNDSC/ami/commit/6940c141dfbcee4612fef2acc3a6fc870e1c3c9d) Wrong spacing parsing.
- [[parsers: nifti]](https://github.com/FNNDSC/ami/pull/250) Wrong tag parsing.
- [[examples: viewers compare]](https://github.com/FNNDSC/ami/commit/4585cb39eedc33341c1f7f78d215770d1ce60924) Incorrect layer orientation.
- [#212](https://github.com/FNNDSC/ami/issue/212) Missing export for one `NODE_WEBPACK_TARGET` variable.
## 0.0.22 - 2017-11-06
### Fixed
- [X]() - Fix typo in the Core.Utils export.

## 0.0.21 - 2017-11-02
### Big changes
- DOCUMENT NEW BUILD WORKFLOW
### API changes
- DOCUMENT NEW API
### Added
- [[helpers: contours]](https://github.com/FNNDSC/ami/blob/dev/src/helpers/helpers.contour.js)


Ref: https://github.com/olivierlacan/keep-a-changelog/blob/master/CHANGELOG.md
[Unreleased]: https://github.com/olivierlacan/keep-a-changelog/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/olivierlacan/keep-a-changelog/compare/v0.3.0...v1.0.0
