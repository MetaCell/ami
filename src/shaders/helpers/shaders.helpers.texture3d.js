import ShadersBase from '../shaders.base';

class Texture3d extends ShadersBase {
  constructor() {
    super();
    this.name = 'texture3d';

    // default properties names
    this._dataCoordinates = 'dataCoordinates';
    this._dataValue = 'dataValue';
    this._offset = 'offset';
  }

  api(
    baseFragment = this._base,
    dataCoordinates = this._dataCoordinates,
    dataValue = this._dataValue,
    offset = this._offset
  ) {
    this._base = baseFragment;
    return this.compute(dataCoordinates, dataValue, offset);
  }

  compute(dataCoordinates, dataValue, offset) {
    this.computeDefinition();
    this._base._functions[this._name] = this._definition;
    return `${this._name}(${dataCoordinates}, ${dataValue}, ${offset});`;
  }

  computeDefinition() {
    /*
     * One term per BOUND texture, not a fixed 7 (or 14).
     *
     * GLSL has no dynamic sampler indexing, so the slot is selected by summing every slot masked
     * with step() - which means every declared slot is sampled on every read, whether or not it
     * holds data. That cost is paid per interpolation sample: trilinear expands to 8 of these, and
     * a blended view (base volume + overlay layer) doubles it again, so a fixed 7 cost 112
     * texture2D calls per fragment where a single-texture volume needs 16.
     *
     * Almost every volume packs into ONE texture (a 4096^2 texture holds 33.5M voxels at 16 bits,
     * i.e. a 256^3 study over twice over), so the other six fetches were pure waste. Sizing the
     * array to _textures.length - set by the helpers alongside the value - removes them, and lets
     * helpers.material.mixin stop padding with 1x1 dummies whose only purpose was to keep those
     * fetches legal.
     */
    const container = this._base._uniforms.uTextureContainer;
    const slots = Math.max(1, container.length || 1);

    // The declared array size (container.length, which shaders.*.fragment.js emits as
    // `uniform sampler2D uTextureContainer[N]`) and the bound textures (container.value) must
    // match: too few declared is out of range, too many leaves unbound samplers that WebGL2 faults
    // on. Padding used to hide the second case at the cost of the wasted fetches this change
    // removes, so say so plainly instead of failing later as an opaque driver error.
    if (container.value && container.value.length && container.value.length !== slots) {
      console.warn(
        `ami: uTextureContainer declares ${slots} sampler(s) but ${container.value.length} texture(s) ` +
        'are bound. Set uniforms.uTextureContainer.length to the bound count when assigning .value.'
      );
    }


    // A single texture cannot have a non-zero textureIndex by construction, so the mask collapses.
    const content = slots === 1
      ? 'texture2D(uTextureContainer[0], uv)'
      : Array.from(
        { length: slots },
        (unused, i) => `step( abs( textureIndexF - ${i}.0 ), 0.0 ) * texture2D(uTextureContainer[${i}], uv)`,
      ).join(' +\n      ');

    this._definition = `
void ${this._name}(in ivec3 dataCoordinates, out vec4 dataValue, out int offset){
  float textureSizeF = float(uTextureSize);
  int voxelsPerTexture = uTextureSize*uTextureSize;

  int index = dataCoordinates.x
            + dataCoordinates.y * uDataDimensions.x
            + dataCoordinates.z * uDataDimensions.y * uDataDimensions.x;
  
  // dividing an integer by an integer will give you an integer result, rounded down
  // can not get float numbers to work :(
  int packedIndex = index/uPackedPerPixel;
  offset = index - uPackedPerPixel*packedIndex;

  // Map data index to right sampler2D texture
  int textureIndex = packedIndex/voxelsPerTexture;
  int inTextureIndex = packedIndex - voxelsPerTexture*textureIndex;

  // Get row and column in the texture
  int rowIndex = inTextureIndex/uTextureSize;
  float rowIndexF = float(rowIndex);
  float colIndex = float(inTextureIndex - uTextureSize * rowIndex);

  // Map row and column to uv
  vec2 uv = vec2(0.0, 0.0);
  uv.x = (0.5 + colIndex) / textureSizeF;
  uv.y = (0.5 + rowIndexF) / textureSizeF;

  float textureIndexF = float(textureIndex);
  dataValue = vec4(0.) + ${content};
}
    `;
  }
}

export default new Texture3d();
