/**
 * @module parsers/volume
 */
export default class ParsersVolume {
  protected _rightHanded: boolean;

  constructor() {
    this._rightHanded = true;
  }

  pixelRepresentation(): number {
    return 0;
  }

  pixelPaddingValue(frameIndex: number = 0): number | null {
    return null;
  }

  modality(): string {
    return 'unknown';
  }

  segmentationType(): string {
    return 'unknown';
  }

  segmentationSegments(): any[] {
    return [];
  }

  referencedSegmentNumber(frameIndex?: number): number {
    return -1;
  }

  rightHanded(): boolean {
    return this._rightHanded;
  }

  spacingBetweenSlices(): number | null {
    return null;
  }

  numberOfChannels(): number {
    return 1;
  }

  sliceThickness(): number | null {
    return null;
  }

  dimensionIndexValues(frameIndex: number = 0): number[] | null {
    return null;
  }

  instanceNumber(frameIndex: number = 0): number | null {
    return frameIndex;
  }

  windowCenter(frameIndex: number = 0): number | null {
    return null;
  }

  windowWidth(frameIndex: number = 0): number | null {
    return null;
  }

  rescaleSlope(frameIndex: number = 0): number {
    return 1;
  }

  rescaleIntercept(frameIndex: number = 0): number {
    return 0;
  }

  ultrasoundRegions(frameIndex: number = 0): any[] {
    return [];
  }

  frameTime(frameIndex: number = 0): number | null {
    return null;
  }

  _decompressUncompressed() {}

  // http://stackoverflow.com/questions/5320439/how-do-i-swap-endian-ness-byte-order-of-a-variable-in-javascript
  _swap16(val: number): number {
    return ((val & 0xff) << 8) | ((val >> 8) & 0xff);
  }

  _swap32(val: number): number {
    return (
      ((val & 0xff) << 24) | ((val & 0xff00) << 8) | ((val >> 8) & 0xff00) | ((val >> 24) & 0xff)
    );
  }

  invert(): boolean {
    return false;
  }

  /**
   * Get the transfer syntax UID.
   * @return {*}
   */
  transferSyntaxUID(): string {
    return 'no value provided';
  }

  /**
   * Get the study date.
   * @return {*}
   */
  studyDate(): string {
    return 'no value provided';
  }

  /**
   * Get the study desciption.
   * @return {*}
   */
  studyDescription(): string {
    return 'no value provided';
  }

  /**
   * Get the series date.
   * @return {*}
   */
  seriesDate(): string {
    return 'no value provided';
  }

  /**
   * Get the series desciption.
   * @return {*}
   */
  seriesDescription(): string {
    return 'no value provided';
  }

  /**
   * Get the raw Header.
   * @return {*}
   */
  rawHeader(): any {
    return 'no value provided';
  }

  /**
   * Get the patient ID.
   * @return {*}
   */
  patientID(): string {
    return 'no value provided';
  }

  /**
   * Get the patient name.
   * @return {*}
   */
  patientName(): string {
    return 'no value provided';
  }

  /**
   * Get the patient age.
   * @return {*}
   */
  patientAge(): string {
    return 'no value provided';
  }

  /**
   * Get the patient birthdate.
   * @return {*}
   */
  patientBirthdate(): string {
    return 'no value provided';
  }

  /**
   * Get the patient sex.
   * @return {*}
   */
  patientSex(): string {
    return 'no value provided';
  }

  /**
   * Get min/max values in array
   *
   * @param {*} pixelData
   *
   * @return {*}
   */
  minMaxPixelData(pixelData: any[] = []): number[] {
    const minMax = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
    const numPixels = pixelData.length;
    for (let index = 0; index < numPixels; index++) {
      const spv = pixelData[index];
      minMax[0] = Math.min(minMax[0], spv);
      minMax[1] = Math.max(minMax[1], spv);
    }

    return minMax;
  }
}
