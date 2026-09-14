/**
 * @module presets/segmentation
 */

import freesurferSegmentation from './presets.segmentation.freesurfer';

export interface SegmentationLabel {
  color: number[];
  opacity: number;
  label: string;
}

export type SegmentationPreset = Record<number, SegmentationLabel>;

export default class PresetsSegmentation {
  private _presetID: string;
  private _presets: Record<string, SegmentationPreset>;

  constructor(presetID: string = 'Freesurfer') {
    this._presetID = presetID;
    this._presets = this.presetSegs();
  }

  set preset(targetPreset: string) {
    this._presetID = targetPreset;
  }

  get preset(): SegmentationPreset {
    return this.fetchPreset(this._presetID);
  }

  fetchPreset(presetID: string): SegmentationPreset {
    const presets = this._presets;
    return presets[presetID];
  }

  addPreset(name: string, presetObj: SegmentationPreset) {
    this._presets[name] = presetObj;
  }

  presetsAvailable(type: string = 'segmentation'): string[] {
    const available: string[] = [];
    const presets = this._presets;

    for (const i in presets) {
      available.push(i);
    }

    return available;
  }

  presetSegs(): Record<string, SegmentationPreset> {
    return {
      Freesurfer: freesurferSegmentation,
    };
  }
}
