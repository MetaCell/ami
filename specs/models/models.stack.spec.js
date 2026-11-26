/* globals describe, it, expect */

import ModelsStack from '../../src/models/models.stack';

describe('Models.stack', () => {
  describe('_packTo8Bits', () => {
    // 32 bits float, single channel: each voxel is packed as the 4 bytes of its
    // IEEE 754 single precision value, most significant byte first.
    const packFloats = (values) => {
      const frame = [{ bitsAllocated: 32, pixelType: 1, rows: 1, columns: values.length, pixelData: values }];
      return ModelsStack.prototype._packTo8Bits.call({ _minMax: [0, 0] }, 1, frame, 2, 0, values.length).data;
    };

    it('packs float32 voxels as big endian IEEE 754 bytes', () => {
      const data = packFloats([1, -2.5, 0, 65535]);

      expect(Array.from(data.slice(0, 16))).toEqual([
        0x3f, 0x80, 0x00, 0x00, // 1
        0xc0, 0x20, 0x00, 0x00, // -2.5
        0x00, 0x00, 0x00, 0x00, // 0
        0x47, 0x7f, 0xff, 0x00, // 65535
      ]);
    });

    it('leaves NaN voxels untouched', () => {
      const data = packFloats([NaN, 1]);

      expect(Array.from(data.slice(0, 8))).toEqual([0, 0, 0, 0, 0x3f, 0x80, 0x00, 0x00]);
    });
  });
});
