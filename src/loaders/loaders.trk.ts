import { BufferGeometry, EventDispatcher, Float32BufferAttribute, Vector3 } from 'three';

export default class LoadersTrk extends EventDispatcher {
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

  parse(data: ArrayBuffer): any[] {
    const littleEndian = this.littleEndian();
    const reader = new DataView(data);
    let offset = 0;
    const header: Record<string, any> = {};

    header.ID_STRING = [];
    for (let i = 0; i < 6; i++) {
      header.ID_STRING.push(String.fromCharCode(reader.getUint8(offset)));
      offset++;
    }

    header.dim = [];
    for (let q = 0; q < 3; q++) {
      header.dim.push(reader.getInt16(offset, littleEndian));
      offset += 2;
    }

    header.VOXEL_SIZE = [];
    for (let r = 0; r < 3; r++) {
      header.VOXEL_SIZE.push(reader.getFloat32(offset, littleEndian));
      offset += 4;
    }

    header.origin = [];
    for (let s = 0; s < 3; s++) {
      header.origin.push(reader.getFloat32(offset, littleEndian));
      offset += 4;
    }

    header.N_SCALARS = [];
    for (let t = 0; t < 1; t++) {
      header.N_SCALARS.push(reader.getInt16(offset, littleEndian));
      offset += 2;
    }

    header.SCALAR_NAME = [];
    for (let u = 0; u < 10; u++) {
      header.SCALAR_NAME.push([]);
      for (let v = 0; v < 20; v++) {
        header.SCALAR_NAME[u].push(String.fromCharCode(reader.getUint8(offset)));
        offset++;
      }
    }

    header.N_PROPERTIES = [];
    for (let x = 0; x < 1; x++) {
      header.N_PROPERTIES.push(reader.getInt16(offset, littleEndian));
      offset += 2;
    }

    header.PROPERTY_NAME = [];
    for (let y = 0; y < 10; y++) {
      header.PROPERTY_NAME.push([]);
      for (let z = 0; z < 20; z++) {
        header.PROPERTY_NAME[y].push(String.fromCharCode(reader.getUint8(offset)));
        offset++;
      }
    }

    header.VOX_TO_RAS = [];
    for (let a = 0; a < 4; a++) {
      header.VOX_TO_RAS.push([]);
      for (let b = 0; b < 4; b++) {
        header.VOX_TO_RAS[a].push(reader.getFloat32(offset));
        offset += 4;
      }
    }

    offset += 444; // reserved

    header.VOXEL_ORDER = [];
    for (let c = 0; c < 4; c++) {
      header.VOXEL_ORDER.push(String.fromCharCode(reader.getUint8(offset)));
      offset++;
    }

    header.pad2 = [];
    for (let d = 0; d < 4; d++) {
      header.pad2.push(String.fromCharCode(reader.getUint8(offset)));
      offset++;
    }

    header.IMAGE_ORIENTATION_PATIENT = [];
    for (let e = 0; e < 6; e++) {
      header.IMAGE_ORIENTATION_PATIENT.push(reader.getFloat32(offset, littleEndian));
      offset += 4;
    }

    header.pad1 = [];
    for (let f = 0; f < 2; f++) {
      header.pad2.push(String.fromCharCode(reader.getUint8(offset)));
      offset++;
    }

    header.INVERT_X = [];
    for (let g = 0; g < 1; g++) {
      header.INVERT_X.push(String.fromCharCode(reader.getUint8(offset)));
      offset++;
    }
    header.INVERT_Y = [];
    for (let h = 0; h < 1; h++) {
      header.INVERT_Y.push(String.fromCharCode(reader.getUint8(offset)));
      offset++;
    }
    header.INVERT_Z = [];
    for (let ii = 0; ii < 1; ii++) {
      header.INVERT_Z.push(String.fromCharCode(reader.getUint8(offset)));
      offset++;
    }
    header.SWAP_XY = [];
    for (let ij = 0; ij < 1; ij++) {
      header.SWAP_XY.push(String.fromCharCode(reader.getUint8(offset)));
      offset++;
    }
    header.SWAP_YZ = [];
    for (let ik = 0; ik < 1; ik++) {
      header.SWAP_YZ.push(String.fromCharCode(reader.getUint8(offset)));
      offset++;
    }
    header.SWAP_ZX = [];
    for (let il = 0; il < 1; il++) {
      header.SWAP_ZX.push(String.fromCharCode(reader.getUint8(offset)));
      offset++;
    }

    header.N_COUNT = [];
    for (let im = 0; im < 1; im++) {
      header.N_COUNT.push(reader.getUint32(offset, littleEndian));
      offset += 4;
    }

    header.version = [];
    for (let io = 0; io < 1; io++) {
      header.version.push(reader.getUint32(offset, littleEndian));
      offset += 4;
    }

    header.HDR_SIZE = [];
    for (let ip = 0; ip < 1; ip++) {
      header.HDR_SIZE.push(reader.getUint32(offset, littleEndian));
      offset += 4;
    }

    const tracks: any[] = [];

    while (offset < reader.byteLength) {
      const nbPoints = reader.getUint32(offset, littleEndian);
      offset += 4;

      const _trackVertices: Vector3[] = [];
      const _trackColors: number[] = [];

      const track: Record<string, any> = {
        points: [],
        scalars: [],
        properties: [],
        geometry: new BufferGeometry(),
        xProperties: {},
      };

      let length = 0;

      for (let k = 0; k < nbPoints; k++) {
        track.points[k] = [];
        track.points[k].push(reader.getFloat32(offset, littleEndian));
        offset += 4;
        track.points[k].push(reader.getFloat32(offset, littleEndian));
        offset += 4;
        track.points[k].push(reader.getFloat32(offset, littleEndian));
        offset += 4;

        _trackVertices.push(
          new Vector3(track.points[k][0], track.points[k][1], track.points[k][2])
        );

        track.scalars[k] = [];
        for (let l = 0; l < header.N_SCALARS[0]; l++) {
          track.scalars[k][l] = [];
          track.scalars[k][l].push(reader.getFloat32(offset, littleEndian));
          offset += 4;
          track.scalars[k][l].push(reader.getFloat32(offset, littleEndian));
          offset += 4;
          track.scalars[k][l].push(reader.getFloat32(offset, littleEndian));
          offset += 4;
        }

        if (k !== 0) {
          const prev = track.points[k - 1];
          const cur = track.points[k];
          const xDist = cur[0] - prev[0];
          const yDist = cur[1] - prev[1];
          const zDist = cur[2] - prev[2];
          length += Math.sqrt(xDist * xDist + yDist * yDist + zDist * zDist);
        }
      }

      track.xProperties.length = length;

      for (let p = 0; p < nbPoints; p++) {
        let first = track.points[0];
        if (p > 1) first = track.points[p - 1];

        let last = track.points[nbPoints - 1];
        if (p < nbPoints - 2) last = track.points[p + 1];

        const diff = [
          Math.abs(last[0] - first[0]),
          Math.abs(last[1] - first[1]),
          Math.abs(last[2] - first[2]),
        ];

        const colordistance = Math.sqrt(diff[0] * diff[0] + diff[1] * diff[1] + diff[2] * diff[2]);
        diff[0] /= colordistance;
        diff[1] /= colordistance;
        diff[2] /= colordistance;

        _trackColors.push(diff[0], diff[1], diff[2]);
      }

      track.geometry.setFromPoints(_trackVertices);
      track.geometry.setAttribute('color', new Float32BufferAttribute(_trackColors, 3));

      for (let o = 0; o < header.N_PROPERTIES[0]; o++) {
        track.properties[o] = [];
        track.properties[o].push(reader.getFloat32(offset, littleEndian));
        offset += 4;
        track.properties[o].push(reader.getFloat32(offset, littleEndian));
        offset += 4;
        track.properties[o].push(reader.getFloat32(offset, littleEndian));
        offset += 4;
      }

      tracks.push(track);
    }

    return tracks;
  }
}
