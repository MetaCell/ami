export default class ShadersBase {
  protected _name: string;
  protected _base: any;
  protected _definition: string;

  constructor() {
    this._name = 'shadersBase';
    this._base = {
      _functions: {},
      _uniforms: {},
    };
    this._definition = '';
  }

  get name() {
    return this._name;
  }

  set name(name: string) {
    this._name = name;
  }
}
