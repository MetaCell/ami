/** * Imports ***/
import PAKO from 'pako';

import CoreUtils from '../core/core.utils';
import ModelsFrame from '../models/models.frame';
import ModelsSeries from '../models/models.series';
import ModelsStack from '../models/models.stack';
import ParsersDicom from '../parsers/parsers.dicom';
import ParsersMgh from '../parsers/parsers.mgh';
import ParsersMhd from '../parsers/parsers.mhd';
import type { ParserMHDData } from '../parsers/parsers.mhd';
import type { ParserFileData } from '../parsers/parsers.types';
import ParsersNifti from '../parsers/parsers.nifti';
import ParsersNrrd from '../parsers/parsers.nrrd';
import LoadersBase from './loaders.base';

/**
 * A fetched file, progressively enriched as parse() runs: LoadersBase.fetch() produces
 * {url, buffer}; _preprocess() fills in filename/extension/pathname/query/gzcompressed; the
 * MHD/RAW pairing branch (2 files) adds mhdBuffer/rawBuffer and overwrites url/extension to
 * describe the pair rather than either individual file.
 */
interface LoaderFileData {
  url: string;
  buffer: ArrayBuffer;
  filename: string;
  extension: string;
  pathname: string;
  query: string;
  gzcompressed: boolean;
  mhdBuffer?: ArrayBuffer;
  rawBuffer?: ArrayBuffer;
}

type VolumeParser = ParsersDicom | ParsersMgh | ParsersMhd | ParsersNifti | ParsersNrrd;
type VolumeParserConstructor =
  | typeof ParsersDicom
  | typeof ParsersMgh
  | typeof ParsersMhd
  | typeof ParsersNifti
  | typeof ParsersNrrd;

/**
 *
 * It is typically used to load a DICOM image. Use loading manager for
 * advanced usage, such as multiple files handling.
 *
 * Demo: {@link https://fnndsc.github.io/vjs#loader_dicom}
 *
 * @module loaders/volumes
 * @example
 * var files = ['/data/dcm/fruit'];
 *
 * // Instantiate a dicom loader
 * var lDicomoader = new dicom();
 *
 * // load a resource
 * loader.load(
 *   // resource URL
 *   files[0],
 *   // Function when resource is loaded
 *   function(object) {
 *     //scene.add( object );
 *     console.log(object);
 *   }
 * );
 */
export default class LoadersVolumes extends LoadersBase {
  get data(): ModelsSeries[] {
    return super.data as ModelsSeries[];
  }

  /**
   * Parse response.
   * response is formated as:
   *    {
   *      url: 'resource url',
   *      buffer: xmlresponse,
   *    }
   * @param {object} response - response
   * @return {promise} promise
   */
  parse(response: unknown): Promise<ModelsSeries> {
    const responseFile = response as LoaderFileData;

    // emit 'parse-start' event
    this.emit('parse-start', {
      file: responseFile.url,
      time: new Date(),
    });

    // give a chance to the UI to update because
    // after the rendering will be blocked with intensive JS
    // will be removed after eventer set up
    if (this._progressBar) {
      this._progressBar.update(0, 100, 'parse', responseFile.url);
    }

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        resolve(
          new Promise<ModelsSeries>((resolve, reject) => {
            const files: LoaderFileData[] = Array.isArray(response)
              ? (response as LoaderFileData[])
              : [responseFile];

            files.forEach((dataset) => {
              this._preprocess(dataset);
            });

            // Either the single file, or (see below) the MHD/RAW pair merged into one - what
            // actually gets handed to the format parser's constructor.
            let data: LoaderFileData = files[0];

            if (files.length !== 1) {
              // if raw/mhd pair
              const mhdFile = files.filter(this._filterByExtension.bind(null, 'MHD'));
              const rawFile = files.filter(this._filterByExtension.bind(null, 'RAW'));
              if (files.length === 2 && mhdFile.length === 1 && rawFile.length === 1) {
                data = {
                  ...data,
                  url: mhdFile[0].url,
                  extension: mhdFile[0].extension,
                  mhdBuffer: mhdFile[0].buffer,
                  rawBuffer: rawFile[0].buffer,
                };
              }
            }

            const Parser = this._parser(data.extension);
            if (!Parser) {
              // emit 'parse-error' event
              this.emit('parse-error', {
                file: responseFile.url,
                time: new Date(),
                error: data.filename + 'can not be parsed.',
              });
              reject(data.filename + ' can not be parsed.');
              return;
            }

            // check extension
            let volumeParser: VolumeParser;
            try {
              volumeParser = new Parser(data as ParserFileData & ParserMHDData, 0);
            } catch (e) {
              console.warn(e);
              // emit 'parse-error' event
              this.emit('parse-error', {
                file: responseFile.url,
                time: new Date(),
                error: e,
              });
              reject(e);
              return;
            }

            // create a series
            const series = new ModelsSeries();
            series.rawHeader = volumeParser.rawHeader();
            // global information
            series.seriesInstanceUID = volumeParser.seriesInstanceUID();
            series.transferSyntaxUID = volumeParser.transferSyntaxUID();
            series.seriesDate = volumeParser.seriesDate();
            series.seriesDescription = volumeParser.seriesDescription();
            series.studyDate = volumeParser.studyDate();
            series.studyDescription = volumeParser.studyDescription();
            series.numberOfFrames = volumeParser.numberOfFrames() ?? 1;
            if (!series.numberOfFrames) {
              series.numberOfFrames = 1;
            }
            series.numberOfChannels = volumeParser.numberOfChannels();
            series.modality = volumeParser.modality();
            // if it is a segmentation, attach extra information
            if (series.modality === 'SEG') {
              // colors
              // labels
              // etc.
              series.segmentationType = volumeParser.segmentationType();
              series.segmentationSegments = volumeParser.segmentationSegments();
            }
            // patient information
            series.patientID = volumeParser.patientID();
            series.patientName = volumeParser.patientName();
            series.patientAge = volumeParser.patientAge();
            series.patientBirthdate = volumeParser.patientBirthdate();
            series.patientSex = volumeParser.patientSex();

            // just create 1 dummy stack for now
            const stack = new ModelsStack();
            stack.numberOfChannels = volumeParser.numberOfChannels();
            stack.pixelRepresentation = volumeParser.pixelRepresentation();
            stack.pixelType = volumeParser.pixelType();
            stack.invert = volumeParser.invert();
            stack.spacingBetweenSlices = volumeParser.spacingBetweenSlices();
            stack.modality = series.modality;
            // if it is a segmentation, attach extra information
            if (stack.modality === 'SEG') {
              // colors
              // labels
              // etc.
              stack.segmentationType = series.segmentationType;
              stack.segmentationSegments = series.segmentationSegments;
            }
            series.stack.push(stack);
            // recursive call for each frame
            // better than for loop to be able
            // to update dom with "progress" callback
            setTimeout(
              this.parseFrameClosure(
                series,
                stack,
                responseFile.url,
                0,
                volumeParser,
                resolve,
                reject
              ),
              0
            );
          })
        );
      }, 10);
    });
  }

  parseFrameClosure(
    series: ModelsSeries,
    stack: ModelsStack,
    url: string,
    i: number,
    dataParser: VolumeParser,
    resolve: (series: ModelsSeries) => void,
    reject: (reason: unknown) => void
  ): () => void {
    return () => {
      this.parseFrame(series, stack, url, i, dataParser, resolve, reject).catch(reject);
    };
  }

  /**
   * recursive parse frame
   * @param {ModelsSeries} series - data series
   * @param {ModelsStack} stack - data stack
   * @param {string} url - resource url
   * @param {number} i - frame index
   * @param {parser} dataParser - selected parser
   * @param {promise.resolve} resolve - promise resolve args
   * @param {promise.reject} reject - promise reject args
   */
  async parseFrame(
    series: ModelsSeries,
    stack: ModelsStack,
    url: string,
    i: number,
    dataParser: VolumeParser,
    resolve: (series: ModelsSeries) => void,
    reject: (reason: unknown) => void
  ): Promise<void> {
    const frame = new ModelsFrame();
    // Only parsers.dicom.ts has a real SOP Instance UID (string); the other formats stub this
    // with the frame index (number) - a pre-existing inconsistency across parsers/, not
    // something introduced by typing it.
    frame.sopInstanceUID = dataParser.sopInstanceUID(i) as string | null;
    frame.url = url;
    frame.index = i;
    frame.invert = stack.invert;
    frame.frameTime = dataParser.frameTime(i);
    frame.ultrasoundRegions = dataParser.ultrasoundRegions(i);
    frame.rows = dataParser.rows(i) ?? 0;
    frame.columns = dataParser.columns(i) ?? 0;
    frame.numberOfChannels = stack.numberOfChannels;
    frame.pixelPaddingValue = dataParser.pixelPaddingValue(i);
    frame.pixelRepresentation = stack.pixelRepresentation;
    frame.pixelType = stack.pixelType;
    frame.pixelData = await dataParser.extractPixelData(i);
    frame.pixelSpacing = dataParser.pixelSpacing(i) as number[] | null;
    frame.spacingBetweenSlices = dataParser.spacingBetweenSlices(i);
    frame.sliceThickness = dataParser.sliceThickness(i);
    frame.imageOrientation = dataParser.imageOrientation(i) as number[] | null;
    frame.rightHanded = dataParser.rightHanded();
    stack.rightHanded = frame.rightHanded;
    if (frame.imageOrientation === null) {
      frame.imageOrientation = [1, 0, 0, 0, 1, 0];
    }
    frame.imagePosition = dataParser.imagePosition(i) as number[] | null;
    /*
    null ImagePosition should not be handle here
    if (frame.imagePosition === null) {
      frame.imagePosition = [0, 0, i];
    }*/
    frame.dimensionIndexValues = dataParser.dimensionIndexValues(i);
    frame.bitsAllocated = dataParser.bitsAllocated(i);
    frame.instanceNumber = dataParser.instanceNumber(i);
    frame.windowCenter = dataParser.windowCenter(i);
    frame.windowWidth = dataParser.windowWidth(i);
    frame.rescaleSlope = dataParser.rescaleSlope(i);
    frame.rescaleIntercept = dataParser.rescaleIntercept(i);
    // should pass frame index for consistency...
    frame.minMax = frame.pixelData ? CoreUtils.minMax(frame.pixelData) : null;

    // if series.mo
    if (series.modality === 'SEG') {
      frame.referencedSegmentNumber = dataParser.referencedSegmentNumber(i);
    }

    stack.frame.push(frame);

    // update status
    this._parsed = i + 1;
    this._totalParsed = series.numberOfFrames;

    // will be removed after eventer set up
    if (this._progressBar) {
      this._progressBar.update(this._parsed, this._totalParsed, 'parse', url);
    }

    // emit 'parsing' event
    this.emit('parsing', {
      file: url,
      total: this._totalParsed,
      parsed: this._parsed,
      time: new Date(),
    });

    if (this._parsed === this._totalParsed) {
      // emit 'parse-success' event
      this.emit('parse-success', {
        file: url,
        total: this._totalParsed,
        parsed: this._parsed,
        time: new Date(),
      });

      resolve(series);
    } else {
      setTimeout(
        this.parseFrameClosure(series, stack, url, this._parsed, dataParser, resolve, reject),
        0
      );
    }
  }

  /**
   * Return parser given an extension
   * @param {string} extension - extension
   * @return {parser} selected parser
   */
  _parser(extension: string): VolumeParserConstructor | false {
    let Parser: VolumeParserConstructor | null = null;

    switch (extension.toUpperCase()) {
      case 'NII':
      case 'NII_':
        Parser = ParsersNifti;
        break;
      case 'DCM':
      case 'DIC':
      case 'DICOM':
      case 'IMA':
      case '':
        Parser = ParsersDicom;
        break;
      case 'MHD':
        Parser = ParsersMhd;
        break;
      case 'NRRD':
        Parser = ParsersNrrd;
        break;
      case 'MGH':
      case 'MGZ':
        Parser = ParsersMgh;
        break;
      default:
        console.warn('unsupported extension: ' + extension);
        return false;
    }
    return Parser;
  }

  /**
   * Pre-process data to be parsed (find data type and de-compress)
   * @param {*} data
   */
  _preprocess(data: LoaderFileData) {
    const parsedUrl = CoreUtils.parseUrl(data.url);
    // update data
    data.filename = parsedUrl.filename!;
    data.extension = parsedUrl.extension;
    data.pathname = parsedUrl.pathname;
    data.query = parsedUrl.query;

    // unzip if extension is '.gz'
    if (data.extension === 'gz') {
      data.gzcompressed = true;
      data.extension = data.filename.split('.gz').shift()!.split('.').pop()!;
    } else if (data.extension === 'mgz') {
      data.gzcompressed = true;
      data.extension = 'mgh';
    } else if (data.extension === 'zraw') {
      data.gzcompressed = true;
      data.extension = 'raw';
    } else {
      data.gzcompressed = false;
    }

    if (data.gzcompressed) {
      const decompressedData = PAKO.inflate(data.buffer);
      data.buffer = decompressedData.buffer;
    }
  }

  /**
   * Filter data by extension
   * @param {*} extension
   * @param {*} item
   * @returns Boolean
   */
  _filterByExtension(extension: string, item: LoaderFileData): boolean {
    if (item.extension.toUpperCase() === extension.toUpperCase()) {
      return true;
    }
    return false;
  }
}
