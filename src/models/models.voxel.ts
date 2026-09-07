import * as THREE from 'three';

/**
 * @module models/voxel
 */

export default class ModelsVoxel {
  private _id: number;
  private _worldCoordinates: THREE.Vector3 | null;
  private _dataCoordinates: THREE.Vector3 | null;
  private _screenCoordinates: THREE.Vector2 | null;
  private _value: string | null;

  constructor() {
    this._id = -1;
    this._worldCoordinates = null;
    this._dataCoordinates = null;
    this._screenCoordinates = null;
    this._value = null;
  }

  set worldCoordinates(worldCoordinates: THREE.Vector3 | null) {
    this._worldCoordinates = worldCoordinates;
  }

  get worldCoordinates() {
    return this._worldCoordinates;
  }

  set dataCoordinates(dataCoordinates: THREE.Vector3 | null) {
    this._dataCoordinates = dataCoordinates;
  }

  get dataCoordinates() {
    return this._dataCoordinates;
  }

  set screenCoordinates(screenCoordinates: THREE.Vector2 | null) {
    this._screenCoordinates = screenCoordinates;
  }

  get screenCoordinates() {
    return this._screenCoordinates;
  }

  set value(value: string | null) {
    this._value = value;
  }

  get value() {
    return this._value;
  }

  set id(id: number) {
    this._id = id;
  }

  get id() {
    return this._id;
  }
}
