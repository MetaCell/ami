import * as THREE from 'three';
/**
 *
 * @module geometries/voxel
 */

const geometriesVoxel = (three = window.THREE) => {
  if (three === undefined || three.BoxGeometry === undefined) {
    return null;
  }

  const Constructor = three.BoxGeometry;
  return class extends Constructor {
    constructor(dataPosition) {
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

    set location(location) {
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
