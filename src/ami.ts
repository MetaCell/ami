export * from './cameras/cameras';
export * from './controls/controls';
export * from './core/core';
export * from './geometries/geometries';
export * from './helpers/helpers';
export * from './loaders/loaders';
export * from './models/models';
export * from './parsers/parsers';
export * from './presets/presets';
export * from './shaders/shaders';
export * from './widgets/widgets';

import pkg from '../package.json';

window.console.log(`ami ${pkg.version}`);
