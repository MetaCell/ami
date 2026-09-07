/** * Imports ***/
import NrrdReader from 'nrrd-js';
import pako from 'pako';
import { Vector3 } from 'three';
import ParsersVolume from './parsers.volume';
/**
 * @module parsers/nrrd
 */
export default class ParsersNrrd extends ParsersVolume {
  private _id: number;
  private _arrayBuffer: ArrayBuffer;
  private _url: string;
  private _dataSet: any;
  private _unpackedData: ArrayBuffer | null;

  /**
   * Constructor
   *
   * @param {*} data
   * @param {*} id
   */
  constructor(data: any, id: number) {
    super();

    /**
     * @member
     * @type {arraybuffer}
     */
    this._id = id;
    this._arrayBuffer = data.buffer;
    this._url = data.url;
    this._dataSet = null;
    this._unpackedData = null;

    try {
      this._dataSet = NrrdReader.parse(this._arrayBuffer);
    } catch (error) {
      window.console.log('ooops... :(');
    }
  }

  /**
   * Is the data right-handed
   *
   * @return {*}
   */
  rightHanded(): boolean {
    if (
      this._dataSet.space.match(/^right-anterior-superior/) ||
      this._dataSet.space.match(/^left-posterior-superior/)
    ) {
      this._rightHanded = true;
    } else {
      this._rightHanded = false;
    }

    return this._rightHanded;
  }

  /**
   * Series instance UID
   *
   * @return {*}
   */
  seriesInstanceUID(): string {
    // use filename + timestamp..?
    return this._url;
  }

  /**
   * Number of frames
   *
   * @return {*}
   */
  numberOfFrames(): number {
    return this._dataSet.sizes[2];
  }

  /**
   * Number of channels
   *
   * @return {*}
   */
  numberOfChannels(): number {
    return 1;
  }

  /**
   * SOP instance UID
   *
   * @param {*} frameIndex
   *
   * @return {*}
   */
  sopInstanceUID(frameIndex: number = 0): number {
    return frameIndex;
  }

  /**
   * Rows
   *
   * @param {*} frameIndex
   *
   * @return {*}
   */
  rows(frameIndex: number = 0): number {
    return this._dataSet.sizes[1];
  }

  /**
   * Columns
   *
   * @param {*} frameIndex
   *
   * @return {*}
   */
  columns(frameIndex: number = 0): number {
    return this._dataSet.sizes[0];
  }

  /**
   * Pixel type
   *
   * @param {*} frameIndex
   *
   * @return {*}
   */
  pixelType(frameIndex: number = 0): number {
    // 0 - int
    // 1 - float
    let pixelType = 0;
    if (this._dataSet.type === 'float') {
      pixelType = 1;
    }
    return pixelType;
  }

  /**
   * Bits allocated
   *
   * @param {*} frameIndex
   *
   * @return {*}
   */
  bitsAllocated(frameIndex: number = 0): number {
    let bitsAllocated = 1;

    if (
      this._dataSet.type === 'int8' ||
      this._dataSet.type === 'uint8' ||
      this._dataSet.type === 'char'
    ) {
      bitsAllocated = 8;
    } else if (
      this._dataSet.type === 'int16' ||
      this._dataSet.type === 'uint16' ||
      this._dataSet.type === 'short'
    ) {
      bitsAllocated = 16;
    } else if (
      this._dataSet.type === 'int32' ||
      this._dataSet.type === 'uint32' ||
      this._dataSet.type === 'float'
    ) {
      bitsAllocated = 32;
    }

    return bitsAllocated;
  }

  /**
   * Pixel spacing
   *
   * @param {*} frameIndex
   *
   * @return {*}
   */
  pixelSpacing(frameIndex: number = 0): number[] {
    const x = new Vector3(
      this._dataSet.spaceDirections[0][0],
      this._dataSet.spaceDirections[0][1],
      this._dataSet.spaceDirections[0][2]
    );

    const y = new Vector3(
      this._dataSet.spaceDirections[1][0],
      this._dataSet.spaceDirections[1][1],
      this._dataSet.spaceDirections[1][2]
    );

    const z = new Vector3(
      this._dataSet.spaceDirections[2][0],
      this._dataSet.spaceDirections[2][1],
      this._dataSet.spaceDirections[2][2]
    );

    return [x.length(), y.length(), z.length()];
  }

  /**
   * Image orientation
   *
   * @param {*} frameIndex
   *
   * @return {*}
   */
  imageOrientation(frameIndex: number = 0): number[] {
    const invertX = this._dataSet.space.match(/right/) ? -1 : 1;
    const invertY = this._dataSet.space.match(/anterior/) ? -1 : 1;

    const x = new Vector3(
      this._dataSet.spaceDirections[0][0] * invertX,
      this._dataSet.spaceDirections[0][1] * invertY,
      this._dataSet.spaceDirections[0][2]
    );
    x.normalize();

    const y = new Vector3(
      this._dataSet.spaceDirections[1][0] * invertX,
      this._dataSet.spaceDirections[1][1] * invertY,
      this._dataSet.spaceDirections[1][2]
    );
    y.normalize();

    return [x.x, x.y, x.z, y.x, y.y, y.z];
  }

  /**
   * Image position
   *
   * @param {*} frameIndex
   *
   * @return {*}
   */
  imagePosition(frameIndex: number = 0): number[] {
    return [
      this._dataSet.spaceOrigin[0],
      this._dataSet.spaceOrigin[1],
      this._dataSet.spaceOrigin[2],
    ];
  }

  /**
   * Extract pixel data ffrom array buffer
   *
   * @param {*} frameIndex
   *
   * @return {*}
   */
  extractPixelData(frameIndex: number = 0) {
    return this._decompressUncompressed(frameIndex);
  }

  /**
   * Decompress data from uncompressed array buffer
   *
   * @param {*} frameIndex
   *
   * @return {*}
   */
  _decompressUncompressed(frameIndex: number = 0) {
    let buffer = this._dataSet.buffer;
    const numberOfChannels = this.numberOfChannels();
    const numPixels = this.rows(frameIndex) * this.columns(frameIndex) * numberOfChannels;
    if (!this.rightHanded()) {
      frameIndex = this.numberOfFrames() - 1 - frameIndex;
    }
    let frameOffset = frameIndex * numPixels;

    // unpack data if needed
    if (this._unpackedData === null && this._dataSet.encoding === 'gzip') {
      const unpackedData = pako.inflate(this._dataSet.buffer);
      this._unpackedData = unpackedData.buffer;
      buffer = this._unpackedData;
    } else if (this._dataSet.encoding === 'gzip') {
      buffer = this._unpackedData;
    }

    if (this._dataSet.type === 'int8' || this._dataSet.type === 'char') {
      return new Int8Array(buffer, frameOffset, numPixels);
    } else if (this._dataSet.type === 'uint8') {
      return new Uint8Array(buffer, frameOffset, numPixels);
    } else if (this._dataSet.type === 'int16' || this._dataSet.type === 'short') {
      frameOffset = frameOffset * 2;
      return new Int16Array(buffer, frameOffset, numPixels);
    } else if (this._dataSet.type === 'uint16') {
      frameOffset = frameOffset * 2;
      return new Uint16Array(buffer, frameOffset, numPixels);
    } else if (this._dataSet.type === 'int32') {
      frameOffset = frameOffset * 4;
      return new Int32Array(buffer, frameOffset, numPixels);
    } else if (this._dataSet.type === 'uint32') {
      frameOffset = frameOffset * 4;
      return new Uint32Array(buffer, frameOffset, numPixels);
    } else if (this._dataSet.type === 'float') {
      frameOffset = frameOffset * 4;
      return new Float32Array(buffer, frameOffset, numPixels);
    }
  }
}
