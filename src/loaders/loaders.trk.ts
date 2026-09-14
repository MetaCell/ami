import { BufferGeometry, EventDispatcher, Float32BufferAttribute, Vector3 } from 'three';

interface LoadersTrkEventMap {
  load: { content: TrkTrack[] };
  progress: { loaded: number; total: number };
  error: { message: string; response?: string };
}

/** TrackVis (.trk) file header - see http://trackvis.org/docs/?subsect=fileformat */
interface TrkHeader {
  ID_STRING: string[];
  dim: number[];
  VOXEL_SIZE: number[];
  origin: number[];
  N_SCALARS: number[];
  SCALAR_NAME: string[][];
  N_PROPERTIES: number[];
  PROPERTY_NAME: string[][];
  VOX_TO_RAS: number[][];
  VOXEL_ORDER: string[];
  pad2: string[];
  IMAGE_ORIENTATION_PATIENT: number[];
  pad1: string[];
  INVERT_X: string[];
  INVERT_Y: string[];
  INVERT_Z: string[];
  SWAP_XY: string[];
  SWAP_YZ: string[];
  SWAP_ZX: string[];
  N_COUNT: number[];
  version: number[];
  HDR_SIZE: number[];
}

interface TrkTrack {
  points: number[][];
  scalars: number[][][];
  properties: number[][];
  geometry: BufferGeometry;
  xProperties: { length?: number };
}

export default class LoadersTrk extends EventDispatcher<LoadersTrkEventMap> {
  load(
    url: string,
    onLoad?: (geometry: TrkTrack[]) => void,
    onProgress?: (event: ProgressEvent) => void,
    onError?: (event: ErrorEvent | Error) => void
  ) {
    const xhr = new XMLHttpRequest();

    xhr.addEventListener(
      'load',
      (event: ProgressEvent) => {
        const target = event.target as XMLHttpRequest;
        if (target.status === 200 || target.status === 0) {
          const geometry = this.parse(target.response || target.responseText);
          this.dispatchEvent({ type: 'load', content: geometry });
          if (onLoad) onLoad(geometry);
        } else {
          this.dispatchEvent({
            type: 'error',
            message: "Couldn't load URL [" + url + ']',
            response: target.statusText,
          });
        }
      },
      false
    );

    xhr.addEventListener(
      'progress',
      (event: ProgressEvent) => {
        this.dispatchEvent({ type: 'progress', loaded: event.loaded, total: event.total });
      },
      false
    );

    xhr.addEventListener(
      'error',
      () => {
        this.dispatchEvent({ type: 'error', message: "Couldn't load URL [" + url + ']' });
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

  parse(data: ArrayBuffer): TrkTrack[] {
    const littleEndian = this.littleEndian();
    const reader = new DataView(data);
    let offset = 0;
    const header: TrkHeader = {
      ID_STRING: [],
      dim: [],
      VOXEL_SIZE: [],
      origin: [],
      N_SCALARS: [],
      SCALAR_NAME: [],
      N_PROPERTIES: [],
      PROPERTY_NAME: [],
      VOX_TO_RAS: [],
      VOXEL_ORDER: [],
      pad2: [],
      IMAGE_ORIENTATION_PATIENT: [],
      pad1: [],
      INVERT_X: [],
      INVERT_Y: [],
      INVERT_Z: [],
      SWAP_XY: [],
      SWAP_YZ: [],
      SWAP_ZX: [],
      N_COUNT: [],
      version: [],
      HDR_SIZE: [],
    };

    for (let i = 0; i < 6; i++) {
      header.ID_STRING.push(String.fromCharCode(reader.getUint8(offset)));
      offset++;
    }

    for (let q = 0; q < 3; q++) {
      header.dim.push(reader.getInt16(offset, littleEndian));
      offset += 2;
    }

    for (let r = 0; r < 3; r++) {
      header.VOXEL_SIZE.push(reader.getFloat32(offset, littleEndian));
      offset += 4;
    }

    for (let s = 0; s < 3; s++) {
      header.origin.push(reader.getFloat32(offset, littleEndian));
      offset += 4;
    }

    for (let t = 0; t < 1; t++) {
      header.N_SCALARS.push(reader.getInt16(offset, littleEndian));
      offset += 2;
    }

    for (let u = 0; u < 10; u++) {
      header.SCALAR_NAME.push([]);
      for (let v = 0; v < 20; v++) {
        header.SCALAR_NAME[u].push(String.fromCharCode(reader.getUint8(offset)));
        offset++;
      }
    }

    for (let x = 0; x < 1; x++) {
      header.N_PROPERTIES.push(reader.getInt16(offset, littleEndian));
      offset += 2;
    }

    for (let y = 0; y < 10; y++) {
      header.PROPERTY_NAME.push([]);
      for (let z = 0; z < 20; z++) {
        header.PROPERTY_NAME[y].push(String.fromCharCode(reader.getUint8(offset)));
        offset++;
      }
    }

    for (let a = 0; a < 4; a++) {
      header.VOX_TO_RAS.push([]);
      for (let b = 0; b < 4; b++) {
        header.VOX_TO_RAS[a].push(reader.getFloat32(offset));
        offset += 4;
      }
    }

    offset += 444; // reserved

    for (let c = 0; c < 4; c++) {
      header.VOXEL_ORDER.push(String.fromCharCode(reader.getUint8(offset)));
      offset++;
    }

    for (let d = 0; d < 4; d++) {
      header.pad2.push(String.fromCharCode(reader.getUint8(offset)));
      offset++;
    }

    for (let e = 0; e < 6; e++) {
      header.IMAGE_ORIENTATION_PATIENT.push(reader.getFloat32(offset, littleEndian));
      offset += 4;
    }

    for (let f = 0; f < 2; f++) {
      // NOTE: pre-existing quirk carried over as-is - this pushes into pad2 rather than pad1,
      // leaving pad1 always empty. Both are reserved/unused padding bytes (never read anywhere
      // in this file or its consumers), and the byte offset still advances correctly either way,
      // so this has no effect on parsing - not something this typing pass changes.
      header.pad2.push(String.fromCharCode(reader.getUint8(offset)));
      offset++;
    }

    for (let g = 0; g < 1; g++) {
      header.INVERT_X.push(String.fromCharCode(reader.getUint8(offset)));
      offset++;
    }
    for (let h = 0; h < 1; h++) {
      header.INVERT_Y.push(String.fromCharCode(reader.getUint8(offset)));
      offset++;
    }
    for (let ii = 0; ii < 1; ii++) {
      header.INVERT_Z.push(String.fromCharCode(reader.getUint8(offset)));
      offset++;
    }
    for (let ij = 0; ij < 1; ij++) {
      header.SWAP_XY.push(String.fromCharCode(reader.getUint8(offset)));
      offset++;
    }
    for (let ik = 0; ik < 1; ik++) {
      header.SWAP_YZ.push(String.fromCharCode(reader.getUint8(offset)));
      offset++;
    }
    for (let il = 0; il < 1; il++) {
      header.SWAP_ZX.push(String.fromCharCode(reader.getUint8(offset)));
      offset++;
    }

    for (let im = 0; im < 1; im++) {
      header.N_COUNT.push(reader.getUint32(offset, littleEndian));
      offset += 4;
    }

    for (let io = 0; io < 1; io++) {
      header.version.push(reader.getUint32(offset, littleEndian));
      offset += 4;
    }

    for (let ip = 0; ip < 1; ip++) {
      header.HDR_SIZE.push(reader.getUint32(offset, littleEndian));
      offset += 4;
    }

    const tracks: TrkTrack[] = [];

    while (offset < reader.byteLength) {
      const nbPoints = reader.getUint32(offset, littleEndian);
      offset += 4;

      const _trackVertices: Vector3[] = [];
      const _trackColors: number[] = [];

      const track: TrkTrack = {
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
