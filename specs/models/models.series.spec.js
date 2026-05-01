/* globals describe, it, expect, beforeEach*/

import ModelsSeries from '../../src/models/models.series';

describe('Models.series', () => {
  let validSeries;
  let validSeries2;
  let invalidSeries;

  beforeEach(() => {
    //
    validSeries = new ModelsSeries();
    validSeries.seriesInstanceUID = 'validSeriesInstanceUID';

    validSeries2 = new ModelsSeries();
    validSeries2.seriesInstanceUID = 'validSeriesInstanceUID2';

    //
    invalidSeries= new ModelsSeries();
    invalidSeries._stack = undefined;
  });

  describe('mergeSeries', () => {
    it('should return false if model arrays are not valid', () => {
      //
      let valid = validSeries.mergeSeries(null);
      expect(valid).toEqual([validSeries]);

      valid = validSeries.mergeSeries([invalidSeries]);
      expect(valid).toEqual([validSeries]);

      // merge was not overloaded!
      valid = validSeries.mergeSeries([validSeries2]);
      expect(valid).toEqual([validSeries, validSeries2]);

      valid = validSeries.mergeSeries([validSeries2, invalidSeries]);
      expect(valid).toEqual([validSeries]);

    });

  });

  describe('merge', () => {
    it('should return false if merge was not successful', () => {
      //
      expect(validSeries.merge()).toEqual(false);
      expect(validSeries.merge('whatever')).toEqual(false);
      expect(validSeries.merge(validSeries2)).toEqual(false);
    });

    it('should return true if merge was successful', () => {
      //
      expect(validSeries.merge(validSeries)).toEqual(true);
    });
  });

  describe('validate', () => {
    it('should return false if model is not valid', () => {
      // model which doesn't have a merge function
      expect(invalidSeries.validate(invalidSeries)).toEqual(false);
    });

    it('should return true if target model is valid', () => {
      //
      expect(validSeries.validate(validSeries)).toEqual(true);
    });

  });

});
