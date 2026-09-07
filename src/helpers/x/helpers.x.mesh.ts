import * as THREE from 'three';
import { Matrix4 } from 'three';
import { VTKLoader } from 'three/examples/jsm/loaders/VTKLoader.js';

/**
 * @module helpers/x/mesh
 */

export default class {
  _file: string | null;
  _3jsVTK_loader: VTKLoader;
  _mesh: THREE.Mesh | null;
  _materialColor: number;
  _RAStoLPS: Matrix4 | null;
  _material: THREE.MeshLambertMaterial;

  constructor() {
    this._file = null;

    this._3jsVTK_loader = new VTKLoader();
    this._mesh = null;
    this._materialColor = 0xe91e63;
    this._RAStoLPS = null;
    this._material = new THREE.MeshLambertMaterial({
      color: this._materialColor,
      side: THREE.DoubleSide,
    });
  }

  // accessor properties
  get file() {
    return this._file;
  }

  set file(fname: string | null) {
    this._file = fname;
  }

  get materialColor() {
    return this._materialColor;
  }

  set materialColor(color: number) {
    this._materialColor = color;
  }

  // load function
  load(): Promise<THREE.Mesh> {
    if (this.file) {
      return new Promise((resolve, reject) => {
        this._3jsVTK_loader.load(
          this.file!,
          (geometry: any) => {
            geometry.computeVertexNormals();
            this._mesh = new THREE.Mesh(geometry, this._material);
            this._RAStoLPS = new Matrix4();
            this._RAStoLPS.set(-1, 0, 0, 0, 0, -1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1);
            this._mesh.applyMatrix4(this._RAStoLPS);
            // resolve the promise and return the mesh
            resolve(this._mesh);
          },
          () => {},
          (error: any) => {
            console.log(error);
            reject({
              message: `Couldn't load file: ${this.file}.`,
              error,
            });
          }
        );
      });
    }

    return Promise.reject({ message: `File is not defined: ${this.file}.` });
  }
}
