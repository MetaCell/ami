# Changelog
All notable changes to this project will be documented in this file.

We may want to also add it to the Gtihub release information.

Note: We need this file so we can log new features while we are developing instead of having to do it all at once when release happens.

## 0.34.1

### Fixed
- [[helpers]](https://github.com/Metacell/ami/commit/4a9c6a7c87ce0ea12b997705a131df8e1fb9660b) Size `uTextureContainer` to the actual number of bound textures instead of a fixed 7/14 slots, dropping the 1x1 dummy-texture padding this required — the fixed size cost a wasted `texture2D` sample per unused slot, per interpolation sample, on every fragment. Also collapsed `StackHelper`'s index scroll handler from two full slice rebuilds (`index` then `planePosition`, each triggering `_update()`) into one via a new `SliceHelper.setIndexAndPlanePosition()`.

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
