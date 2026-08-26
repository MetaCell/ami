/* globals describe, it, expect, beforeEach*/

import ParsersDicom from '../../src/parsers/parsers.dicom';
import ParsersNifti from '../../src/parsers/parsers.nifti';

const dicomDataset = {
  format: 'dicom',
  url: '/base/data/dicom/adi_slice.dcm',
  parser: ParsersDicom,
};

const niftiDataset = {
  format: 'nifti',
  url: '/base/data/nifti/adi_slice.nii',
  parser: ParsersNifti,
};

function crop(value, decimals) {
  return Math.floor(10 ** decimals * value) / 10 ** decimals;
}

function test(dataset, datasetDicom) {
  let parserDicom = null;

  beforeEach(() => new Promise(resolve => {
    const oReqDicom = new XMLHttpRequest();
    oReqDicom.open('GET', datasetDicom.url, true);
    oReqDicom.responseType = 'arraybuffer';

    oReqDicom.onload = () => {
      const buffer = oReqDicom.response;
      if (buffer) {
        parserDicom = new datasetDicom.parser(
          {
            url: datasetDicom.url,
            buffer,
          },
          0
        );
        resolve();
      }
    };
    oReqDicom.send();
  }));

  // test extraction of tags of interest
  describe(dataset.format, () => {
    let parser = null;

    beforeEach(() => new Promise(resolve => {
      const oReqData = new XMLHttpRequest();
      oReqData.open('GET', dataset.url, true);
      oReqData.responseType = 'arraybuffer';

      oReqData.onload = () => {
        const buffer = oReqData.response;
        if (buffer) {
          parser = new dataset.parser(
            {
              url: dataset.url,
              buffer,
            },
            0
          );
          resolve();
        }
      };
      oReqData.send();
    }));

    it('image position', () => {
      const frameIndex = 0;
      const dicomImagePosition = parserDicom.imagePosition(frameIndex);
      const imagePosition = parser.imagePosition(frameIndex);

      expect(crop(imagePosition[0], 5)).toBe(crop(dicomImagePosition[0], 5));
      expect(crop(imagePosition[1], 5)).toBe(crop(dicomImagePosition[1], 5));
      expect(crop(imagePosition[2], 5)).toBe(crop(dicomImagePosition[2], 5));
    });

    it('pixel spacing', () => {
      const frameIndex = 0;
      const dicomPixelSpacing = parserDicom.pixelSpacing(frameIndex);
      const pixelSpacing = parser.pixelSpacing(frameIndex);
      // check typeof and length...
      expect(crop(pixelSpacing[0], 5)).toBe(crop(dicomPixelSpacing[0], 5));
      expect(crop(pixelSpacing[1], 5)).toBe(crop(dicomPixelSpacing[1], 5));
    });

    it('image orientation', () => {
      const frameIndex = 0;
      const dicomOrientation = parserDicom.imageOrientation(frameIndex);
      const dataOrientation = parser.imageOrientation(frameIndex);

      expect(crop(dataOrientation[0], 5)).toBe(crop(dicomOrientation[0], 5));
      expect(crop(dataOrientation[1], 5)).toBe(crop(dicomOrientation[1], 5));
      expect(crop(dataOrientation[2], 5)).toBe(crop(dicomOrientation[2], 5));
      expect(crop(dataOrientation[3], 5)).toBe(crop(dicomOrientation[3], 5));
      expect(crop(dataOrientation[4], 5)).toBe(crop(dicomOrientation[4], 5));
      expect(crop(dataOrientation[5], 5)).toBe(crop(dicomOrientation[5], 5));
    });

    it('pixel data', async () => {
      const frameIndex = 0;
      const rows = parser.rows(frameIndex);
      const columns = parser.columns(frameIndex);
      const dicomPixelData = await parserDicom.extractPixelData(frameIndex);
      const pixelData = parser.extractPixelData(frameIndex);

      expect(pixelData.join()).toEqual(dicomPixelData.join());
    });
  });
}

describe('Orientation', () => {
  test(niftiDataset, dicomDataset);
  //   test( nrrdDataset );
});

describe('imageOrientation sform branch', () => {
  // Regression test: this branch (taken when qform_code === 0 and sform_code > 0) used to
  // return the sform affine's rows directly, which are scaled by voxel spacing rather than
  // unit-length - unlike the qform branch (qform_code > 0) right above it, which returns unit
  // vectors from the rotation matrix. The 'Orientation' suite above never exercises this branch:
  // its fixture has qform_code=2, so it only ever takes the qform path. Bypasses the constructor
  // (which requires a real NIfTI buffer) to unit-test imageOrientation() directly against a
  // minimal, controlled _dataSet.
  function makeParser(dataSet) {
    const parser = Object.create(ParsersNifti.prototype);
    parser._dataSet = dataSet;
    return parser;
  }

  function length(v) {
    return Math.hypot(v[0], v[1], v[2]);
  }

  it('returns unit-length vectors for a voxel-spacing-scaled sform affine', () => {
    const spacing = 0.5;
    const parser = makeParser({
      qform_code: 0,
      sform_code: 1,
      pixDims: [1, spacing, spacing, spacing],
      affine: [
        [0, spacing, 0, 10],
        [0, 0, spacing, -5],
        [spacing, 0, 0, 20],
      ],
    });

    const orientation = parser.imageOrientation(0);
    const rowX = orientation.slice(0, 3);
    const rowY = orientation.slice(3, 6);

    expect(length(rowX)).toBeCloseTo(1, 10);
    expect(length(rowY)).toBeCloseTo(1, 10);
  });

  it('preserves direction while normalizing magnitude', () => {
    const parser1mm = makeParser({
      qform_code: 0,
      sform_code: 1,
      pixDims: [1, 1, 1, 1],
      affine: [
        [0, 1, 0, 10],
        [0, 0, 1, -5],
        [1, 0, 0, 20],
      ],
    });
    const parserHalfMm = makeParser({
      qform_code: 0,
      sform_code: 1,
      pixDims: [1, 0.5, 0.5, 0.5],
      affine: [
        [0, 0.5, 0, 10],
        [0, 0, 0.5, -5],
        [0.5, 0, 0, 20],
      ],
    });

    const orientation1mm = parser1mm.imageOrientation(0);
    const orientationHalfMm = parserHalfMm.imageOrientation(0);

    orientation1mm.forEach((component, i) => {
      expect(component).toBeCloseTo(orientationHalfMm[i], 10);
    });
  });
});

// test dataset that does not work anymore..
// does current visualization make sense?

// test first and last from siena
