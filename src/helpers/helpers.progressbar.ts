/**
 * @module helpers/progressBar
 */

interface ProgressMode {
  name: string;
  color: string;
}

export default class HelpersProgressBar {
  _container: HTMLElement;
  _modes: Record<string, ProgressMode>;
  requestAnimationFrameID: number | null;
  _mode: string | null;
  _value: number | null;
  _total: number | null;
  _totalFiles: number | null;

  constructor(container: HTMLElement) {
    this._container = container;
    this._modes = {
      load: {
        name: 'load',
        color: '#FFF56F',
      },
      parse: {
        name: 'parse',
        color: '#2196F3',
      },
    };

    this.requestAnimationFrameID = null;

    this._mode = null;
    this._value = null;
    this._total = null;
    this._totalFiles = null;

    this.init();
  }

  free() {
    let progressContainers = this._container.getElementsByClassName('progress container');
    if (progressContainers.length > 0) {
      progressContainers[0].parentNode!.removeChild(progressContainers[0]);
    }
    progressContainers = null as any;
    // stop rendering loop
    window.cancelAnimationFrame(this.requestAnimationFrameID!);
  }

  init() {
    let progressContainer: HTMLElement | null = this._domContainer();

    for (const mode in this._modes) {
      if (Object.hasOwn(this._modes, mode)) {
        let bar: HTMLElement | false = this._domBar(this._modes[mode]);
        progressContainer.appendChild(bar as HTMLElement);
        bar = null as any;
      }
    }

    this._container.appendChild(progressContainer);
    progressContainer = null;

    // start rendering loop
    this.updateUI();
  }

  // url can be used in child class to show overall progress bar
  update(value: number, total: number, mode: string, url: string = '') {
    this._mode = mode;
    this._value = value;
    // depending on CDN, total return to XHTTPRequest can be 0.
    // In this case, we generate a random number to animate the progressbar
    if (total === 0) {
      this._total = value;
      this._value = Math.random() * value;
    } else {
      this._total = total;
    }
  }

  updateUI() {
    this.requestAnimationFrameID = requestAnimationFrame(() => {
      this.updateUI();
    });

    if (
      !(
        this._mode !== null &&
        Object.hasOwn(this._modes, this._mode) &&
        Object.hasOwn(this._modes[this._mode], 'name') &&
        Object.hasOwn(this._modes[this._mode], 'color')
      )
    ) {
      return false;
    }

    const progress = Math.round((this._value! / this._total!) * 100);
    const color = this._modes[this._mode].color;

    let progressBar = this._container.getElementsByClassName(
      'progress ' + this._modes[this._mode].name
    );
    if (progressBar.length > 0) {
      (progressBar[0] as HTMLElement).style.borderColor = color;
      (progressBar[0] as HTMLElement).style.width = progress + '%';
    }
    progressBar = null as any;
  }

  _domContainer(): HTMLElement {
    const container = document.createElement('div');

    // class it
    container.classList.add('progress');
    container.classList.add('container');

    // style it
    container.style.width = '100%';
    container.style.height = '8px';
    container.style.position = 'absolute';
    container.style.backgroundColor = 'rgba(158, 158, 158, 0.5)';
    container.style.top = '0';
    container.style.zIndex = '1';

    return container;
  }

  _domBar(mode: ProgressMode): HTMLElement | false {
    if (!(Object.hasOwn(mode, 'name') && Object.hasOwn(mode, 'color'))) {
      window.console.log('Invalid mode provided.');
      window.console.log(mode);

      return false;
    }

    const bar = document.createElement('div');

    // class it
    bar.classList.add(mode.name);
    bar.classList.add('progress');

    // style it
    bar.style.border = '2px solid ' + mode.color;
    bar.style.width = '0%';

    return bar;
  }

  set totalFiles(totalFiles: number | null) {
    this._totalFiles = totalFiles;
  }

  get totalFiles() {
    return this._totalFiles;
  }
}
