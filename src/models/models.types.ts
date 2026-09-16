/**
 * Shapes shared across models/ for data produced upstream by parsers/ (not yet typed itself -
 * these mirror what parsers.dicom.ts et al. actually construct, verified against their source,
 * rather than the `any[]` those parsers currently declare).
 */

export interface UltrasoundRegion {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  axisX: number | null;
  axisY: number | null;
  unitsX: string;
  unitsY: string;
  deltaX: number;
  deltaY: number;
}

export interface SegmentationSegment {
  recommendedDisplayCIELab: number[] | null;
  segmentationCodeDesignator: string;
  segmentationCodeValue: string;
  segmentationCodeMeaning: string;
  segmentNumber: number | undefined;
  segmentLabel: string;
  segmentAlgorithmType: string;
}

/**
 * A frame's raw decoded pixel buffer - read/written by numeric index throughout models/,
 * so any of these typed-array flavours (or a plain numeric array) work identically.
 */
export type PixelBuffer =
  | number[]
  | Uint8Array
  | Int8Array
  | Uint16Array
  | Int16Array
  | Uint32Array
  | Int32Array
  | Float32Array
  | Float64Array;
