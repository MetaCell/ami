/**
 * @module presets/segmentation
 */

import freesurferSegmentation from './presets.segmentation.freesurfer';

export default class PresetsSegmentation {
  private _presetID: string;
  private _presets: any;

  constructor(presetID: string = 'Freesurfer') {
    this._presetID = presetID;
    this._presets = this.presetSegs();
  }

  set preset(targetPreset: string) {
    this._presetID = targetPreset;
  }

  get preset() {
    return this.fetchPreset(this._presetID);
  }

  fetchPreset(presetID: string) {
    const presets = this._presets;
    return presets[presetID];
  }

  addPreset(presetObj: any) {
    this._presets.push(presetObj);
  }

  presetsAvailable(type: string = 'segmentation'): string[] {
    const available: string[] = [];
    const presets = this._presets;

    for (const i in presets) {
      available.push(i);
    }

    return available;
  }

  presetSegs(): Record<string, any> {
    return {
      Freesurfer: freesurferSegmentation,
    };
  }
}
