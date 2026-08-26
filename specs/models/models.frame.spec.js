/* globals describe, it, expect, beforeEach*/

import ModelsFrame from '../../src/models/models.frame';

import { Vector3 } from 'three';

describe('Models.frame', () => {
  let validFrame;
  let validFrame2;
  let invalidFrame;

  beforeEach(() => {
    //
    validFrame = new ModelsFrame();
    validFrame.sopInstanceUID = 'frameSOPInstanceUID';

    validFrame2 = new ModelsFrame();
    validFrame2.sopInstanceUID = 'frameSOPInstanceUID2';

    //
    invalidFrame = new ModelsFrame();
    invalidFrame._dimensionIndexValues = undefined;
  });

  describe('merge', () => {
    it('should return false if merge was not successful', () => {
      //
      expect(validFrame.merge()).toEqual(false);
      expect(validFrame.merge('whatever')).toEqual(false);
      expect(validFrame.merge(validFrame2)).toEqual(false);
    });

    it('should return true if merge was successful', () => {
      //
      expect(validFrame.merge(validFrame)).toEqual(true);
    });
  });

  describe('cosines', () => {
    it('should return default orientation if orientation is not valid', () => {
      //
      const defaultCosines = [new Vector3(1, 0, 0), new Vector3(0, 1, 0), new Vector3(0, 0, 1)];

      expect(validFrame.cosines()).toEqual(defaultCosines);

      // invalid length
      validFrame._imageOrientation = [1, 0, 0, 1, 0];
      expect(validFrame.cosines()).toEqual(defaultCosines);

      // one direction is not correct
      validFrame._imageOrientation = [0, 0, 0, 1, 0, 0];
      expect(validFrame.cosines()).toEqual(defaultCosines);
    });

    it('should return good orientation if orientation is valid', () => {
      //
      const defaultCosines = [new Vector3(0, 1, 0), new Vector3(0, 0, 1), new Vector3(1, 0, 0)];

      validFrame._imageOrientation = [0, 1, 0, 0, 0, 1];
      expect(validFrame.cosines()).toEqual(defaultCosines);
    });

    it('should normalize non-unit-length orientation vectors', () => {
      // Regression test: a parser can return direction vectors that are not unit-length
      // (e.g. NIfTI's sform branch returns affine rows already scaled by voxel spacing,
      // unlike its qform branch which returns unit vectors from the rotation matrix).
      // CoreUtils.ijk2LPS multiplies these cosines by spacing again downstream, so a
      // non-unit-length cosine here silently double-scales every axis of the reconstructed
      // volume - cosines() must always return unit vectors regardless of what the parser
      // handed it.
      const defaultCosines = [new Vector3(0, 1, 0), new Vector3(0, 0, 1), new Vector3(1, 0, 0)];

      // same directions as the previous test, but scaled by a voxel spacing of 0.5mm
      validFrame._imageOrientation = [0, 0.5, 0, 0, 0, 0.5];
      const cosines = validFrame.cosines();

      expect(cosines[0].length()).toBeCloseTo(1, 10);
      expect(cosines[1].length()).toBeCloseTo(1, 10);
      expect(cosines).toEqual(defaultCosines);
    });
  });

  // describe('spacingXY', function() {
  //   it('should return false if model is not valid', function() {
  //     // model which doesn't have a merge function
  //     expect(invalidFrame.validate(invalidFrame)).toEqual(false);
  //   });

  //   it('should return true if target model is valid', function() {
  //     //
  //     expect(validFrame.validate(validFrame)).toEqual(true);
  //   });

  // });

  // describe('value', function() {
  //   it('should return false if model is not valid', function() {
  //     // model which doesn't have a merge function
  //     expect(invalidFrame.validate(invalidFrame)).toEqual(false);
  //   });

  //   it('should return true if target model is valid', function() {
  //     //
  //     expect(validFrame.validate(validFrame)).toEqual(true);
  //   });

  // });

  describe('_compareArrays', () => {
    it('should return false if arrays are different', () => {
      // array of int
      expect(validFrame._compareArrays([1], [2])).toEqual(false);
      expect(validFrame._compareArrays([1], [1, 2])).toEqual(false);
    });

    it('should return true if arrays are identical', () => {
      // array of int
      expect(validFrame._compareArrays([1, 2, 3], [1, 2, 3])).toEqual(true);

      // array of int and strings
      expect(validFrame._compareArrays([1, 2, 3], [1, '2', 3])).toEqual(true);

      // array of string
      expect(validFrame._compareArrays(['1', '2', '3'], ['1', '2', '3'])).toEqual(true);

      // array of arrays
      expect(validFrame._compareArrays([[1], [2], [3]], [[1], [2], [3]])).toEqual(true);

      // mixed arrays
      expect(validFrame._compareArrays([1, '2', [3]], [1, '2', [3]])).toEqual(true);
    });
  });
});
