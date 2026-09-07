import * as THREE from 'three';

/**
 *
 * @module geometries/voxel
 */

const geometriesVoxel = (three: typeof THREE = window.THREE!) => {
  if (three === undefined || three.BoxGeometry === undefined) {
    return null;
  }

  const Constructor = three.BoxGeometry;
  return class GeometriesVoxel extends Constructor {
    _location: THREE.Vector3;

    constructor(dataPosition: THREE.Vector3) {
      super(1, 1, 1);

      this._location = dataPosition;

      this.applyMatrix4(
        new three.Matrix4().makeTranslation(this._location.x, this._location.y, this._location.z)
      );
    }

    resetVertices() {
      const box = new three.BoxGeometry(1, 1, 1);
      this.copy(box);
      box.dispose();
      this.applyMatrix4(
        new three.Matrix4().makeTranslation(this._location.x, this._location.y, this._location.z)
      );
    }

    set location(location: THREE.Vector3) {
      this._location = location;
      const box = new three.BoxGeometry(1, 1, 1);
      this.copy(box);
      box.dispose();
      this.applyMatrix4(
        new three.Matrix4().makeTranslation(this._location.x, this._location.y, this._location.z)
      );
    }

    get location() {
      return this._location;
    }
  };
};

// export factory
export { geometriesVoxel };
// default export to
export default geometriesVoxel(THREE);
