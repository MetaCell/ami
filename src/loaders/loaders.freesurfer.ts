import { BufferGeometry, EventDispatcher, Float32BufferAttribute } from 'three';

class FreeSurferLoader extends EventDispatcher {
  static QUAD_FILE_MAGIC_NUMBER = -1 & 0x00ffffff;
  static TRIANGLE_FILE_MAGIC_NUMBER = -2 & 0x00ffffff;
  static NEW_QUAD_FILE_MAGIC_NUMBER = -3 & 0x00ffffff;

  load(url: string, onLoad?: (geometry: any) => void, onProgress?: any, onError?: any) {
    const xhr = new XMLHttpRequest();

    xhr.addEventListener(
      'load',
      (event: any) => {
        if (event.target.status === 200 || event.target.status === 0) {
          const geometry = this.parse(event.target.response || event.target.responseText);
          (this as any).dispatchEvent({ type: 'load', content: geometry });
          if (onLoad) onLoad(geometry);
        } else {
          (this as any).dispatchEvent({
            type: 'error',
            message: "Couldn't load URL [" + url + ']',
            response: event.target.statusText,
          });
        }
      },
      false
    );

    xhr.addEventListener(
      'progress',
      (event: any) => {
        (this as any).dispatchEvent({ type: 'progress', loaded: event.loaded, total: event.total });
      },
      false
    );

    xhr.addEventListener(
      'error',
      () => {
        (this as any).dispatchEvent({ type: 'error', message: "Couldn't load URL [" + url + ']' });
      },
      false
    );

    if (xhr.overrideMimeType) {
      xhr.overrideMimeType('text/plain; charset=x-user-defined');
    }

    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';
    xhr.send(null);
  }

  littleEndian(): boolean {
    const buffer = new ArrayBuffer(2);
    new DataView(buffer).setInt16(0, 256, true);
    return new Int16Array(buffer)[0] === 256;
  }

  parse(data: ArrayBuffer): BufferGeometry {
    let littleEndian = this.littleEndian();
    const reader = new DataView(data);
    let offset = 0;

    function readInt24(off: number, le: boolean = false): number {
      const b1 = reader.getUint8(off);
      const b2 = reader.getUint8(off + 1);
      const b3 = reader.getUint8(off + 2);
      return le ? (b3 << 16) + (b2 << 8) + b1 : (b1 << 16) + (b2 << 8) + b3;
    }

    let surfType = readInt24(0);
    if (surfType > 0xffff00) {
      littleEndian = false;
    } else {
      littleEndian = true;
      surfType = readInt24(0, true);
    }
    offset += 3;

    let geometry: BufferGeometry;

    switch (surfType) {
      case FreeSurferLoader.QUAD_FILE_MAGIC_NUMBER: {
        const vertCount = readInt24(offset, littleEndian);
        offset += 3;
        const faceCount = readInt24(offset, littleEndian);
        offset += 3;

        if (faceCount > 4 * vertCount) {
          throw Error('file has many more faces than vertices!');
        }

        const positions = new Float32Array(vertCount * 3);
        for (let v = 0; v < vertCount; v++) {
          positions[v * 3] = reader.getInt16(offset, littleEndian) / 100;
          positions[v * 3 + 1] = reader.getInt16(offset + 2, littleEndian) / 100;
          positions[v * 3 + 2] = reader.getInt16(offset + 4, littleEndian) / 100;
          offset += 6;
        }

        const indices = [];
        for (let f = 0; f < faceCount; f++) {
          const v1 = readInt24(offset, littleEndian);
          const v2 = readInt24(offset + 3, littleEndian);
          const v3 = readInt24(offset + 6, littleEndian);
          const v4 = readInt24(offset + 9, littleEndian);
          offset += 12;
          indices.push(v1, v2, v3, v1, v3, v4);
        }

        geometry = new BufferGeometry();
        geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
        geometry.setIndex(indices);
        geometry.computeBoundingBox();
        break;
      }

      case FreeSurferLoader.TRIANGLE_FILE_MAGIC_NUMBER: {
        // skip the "created by" text (two newlines)
        let b1 = 0,
          b2 = 0;
        while (b1 !== 10 && b2 !== 10) {
          b1 = b2;
          b2 = reader.getUint8(offset);
          offset++;
        }
        offset++; // skip second newline

        const vertCount = reader.getInt32(offset, littleEndian);
        offset += 4;
        const faceCount = reader.getInt32(offset, littleEndian);
        offset += 4;

        const positions = new Float32Array(vertCount * 3);
        for (let v = 0; v < vertCount; v++) {
          positions[v * 3] = reader.getFloat32(offset, littleEndian);
          positions[v * 3 + 1] = reader.getFloat32(offset + 4, littleEndian);
          positions[v * 3 + 2] = reader.getFloat32(offset + 8, littleEndian);
          offset += 12;
        }

        const indices = [];
        for (let f = 0; f < faceCount; f++) {
          indices.push(
            reader.getInt32(offset, littleEndian),
            reader.getInt32(offset + 4, littleEndian),
            reader.getInt32(offset + 8, littleEndian)
          );
          offset += 12;
        }

        geometry = new BufferGeometry();
        geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
        geometry.setIndex(indices);
        geometry.computeBoundingBox();
        break;
      }

      case FreeSurferLoader.NEW_QUAD_FILE_MAGIC_NUMBER:
        throw Error('Parser not defined for NEW_QUAD_FILE_MAGIC_NUMBER');

      default:
        throw Error('Unknown FreeSurfer MAGICNUMBER: ' + surfType.toString(16));
    }

    return geometry;
  }
}

export default FreeSurferLoader;
