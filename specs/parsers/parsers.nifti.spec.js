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

// test dataset that does not work anymore..
// does current visualization make sense?

// test first and last from siena
