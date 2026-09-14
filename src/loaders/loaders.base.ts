/** Imports **/
import EventEmitter from 'eventemitter3';
import HelpersProgressBar from '../helpers/helpers.progressbar';

/**
 * What LoadersBase needs from an injected progress bar implementation. HelpersProgressBar is
 * the default, but callers can supply their own - `requests` isn't read by HelpersProgressBar
 * itself, it's part of the contract for implementations that want it.
 */
interface ProgressBarLike {
  totalFiles: number | null;
  requests?: Map<string, XMLHttpRequest>;
  update(value: number, total: number, mode: string, url?: string): void;
  free(): void;
}

type ProgressBarConstructor = new (container: HTMLElement) => ProgressBarLike;

/** Not part of the standard XMLHttpRequest type, kept for parity with older/vendor XHR usage. */
interface XHRWithCrossOrigin extends XMLHttpRequest {
  crossOrigin: boolean;
}

type LoaderUrl = string | Array<string | string[]>;

/**
 *
 * It is typically used to load a DICOM image. Use loading manager for
 * advanced usage, such as multiple files handling.
 *
 * Demo: {@link https://fnndsc.github.io/vjs#loader_dicom}
 *
 * @module loaders/base
 * @extends EventEmitter
 * @example
 * var files = ['/data/dcm/fruit'];
 *
 * // Instantiate a dicom loader
 * var lDicomoader = new dicom();
 *
 * // load a resource
 * loader.load(
 *   // resource URL
 *   files[0],
 *   // Function when resource is loaded
 *   function(object) {
 *     //scene.add( object );
 *     window.console.log(object);
 *   }
 * );
 */
export default class LoadersBase extends EventEmitter {
  protected _loaded: number;
  protected _totalLoaded: number;
  protected _parsed: number;
  protected _totalParsed: number;

  private _data: unknown[];

  protected _container: HTMLElement | null;
  protected _progressBar: ProgressBarLike | null;

  /**
   * Create a Loader.
   * @param {dom} container - The dom container of loader.
   * @param {object} ProgressBar - The progressbar of loader.
   */
  constructor(
    container: HTMLElement | null = null,
    ProgressBar: ProgressBarConstructor = HelpersProgressBar
  ) {
    super();
    this._loaded = -1;
    this._totalLoaded = -1;
    this._parsed = -1;
    this._totalParsed = -1;

    this._data = [];

    this._container = container;
    this._progressBar = null;
    if (this._container && ProgressBar) {
      this._progressBar = new ProgressBar(this._container);
    }
  }

  /**
   * free the reference.
   */
  free() {
    this._data = [];
    this._container = null;
    // this._helpersProgressBar = null;

    if (this._progressBar) {
      this._progressBar.free();
      this._progressBar = null;
    }
  }

  /**
   * load the resource by url.
   * @param {string} url - resource url.
   * @param {Map} requests - used for cancellation.
   * @return {promise} promise.
   */
  fetch(
    url: string,
    requests?: Map<string, XMLHttpRequest>
  ): Promise<{ url: string; buffer: ArrayBuffer }> {
    return new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open('GET', url);
      (request as XHRWithCrossOrigin).crossOrigin = true;
      request.responseType = 'arraybuffer';

      request.onloadstart = (event) => {
        // emit 'fetch-start' event
        this.emit('fetch-start', {
          file: url,
          time: new Date(),
        });
      };

      request.onload = (event) => {
        if (request.status === 200 || request.status === 0) {
          this._loaded = (event as ProgressEvent).loaded;
          this._totalLoaded = (event as ProgressEvent).total;

          // will be removed after eventer set up
          if (this._progressBar) {
            this._progressBar.update(this._loaded, this._totalLoaded, 'load', url);
          }

          const buffer = request.response;
          const response = {
            url,
            buffer,
          };

          // emit 'fetch-success' event
          this.emit('fetch-success', {
            file: url,
            time: new Date(),
            totalLoaded: (event as ProgressEvent).total,
          });

          resolve(response);
        } else {
          reject(request.statusText);
        }
      };

      request.onerror = () => {
        // emit 'fetch-error' event
        this.emit('fetch-error', {
          file: url,
          time: new Date(),
        });

        reject(request.statusText);
      };

      request.onabort = (event) => {
        // emit 'fetch-abort' event
        this.emit('fetch-abort', {
          file: url,
          time: new Date(),
        });

        reject(request.statusText || 'Aborted');
      };

      request.ontimeout = () => {
        // emit 'fetch-timeout' event
        this.emit('fetch-timeout', {
          file: url,
          time: new Date(),
        });

        reject(request.statusText);
      };

      request.onprogress = (event) => {
        this._loaded = event.loaded;
        this._totalLoaded = event.total;
        // emit 'fetch-progress' event
        this.emit('fetch-progress', {
          file: url,
          total: event.total,
          loaded: event.loaded,
          time: new Date(),
        });
        // will be removed after eventer set up
        if (this._progressBar) {
          this._progressBar.update(this._loaded, this._totalLoaded, 'load', url);
        }
      };

      request.onloadend = (event) => {
        // emit 'fetch-end' event
        this.emit('fetch-end', {
          file: url,
          time: new Date(),
        });
        // just use onload when success and onerror when failure, etc onabort
        // reject(request.statusText);
      };

      if (requests instanceof Map) {
        requests.set(url, request);
      }

      request.send();
    });
  }

  /**
   * parse the data loaded
   * SHOULD BE implementd by detail loader.
   * @param {object} response - loaded data.
   * @return {promise} promise.
   */
  parse(response: unknown): Promise<unknown> {
    return new Promise((resolve, reject) => {
      resolve(response);
    });
  }

  /**
   * default load sequence group promise.
   * @param {array} url - resource url.
   * @param {Map} requests - used for cancellation.
   * @return {promise} promise.
   */
  loadSequenceGroup(
    url: string[],
    requests?: Map<string, XMLHttpRequest>
  ): Promise<unknown> {
    const fetchSequence: Promise<{ url: string; buffer: ArrayBuffer }>[] = [];

    url.forEach((file) => {
      fetchSequence.push(this.fetch(file, requests));
    });

    return Promise.all(fetchSequence)
      .then((rawdata) => {
        return this.parse(rawdata);
      })
      .then((data) => {
        this._data.push(data);
        return data;
      })
      .catch((error) => {
        if (error === 'Aborted') {
          return;
        }
        window.console.log('oops... something went wrong...');
        window.console.log(error);
      });
  }

  /**
   * default load sequence promise.
   * @param {string} url - resource url.
   * @param {Map} requests - used for cancellation.
   * @return {promise} promise.
   */
  loadSequence(url: string, requests?: Map<string, XMLHttpRequest>): Promise<unknown> {
    return this.fetch(url, requests)
      .then((rawdata) => {
        return this.parse(rawdata);
      })
      .then((data) => {
        this._data.push(data);
        return data;
      })
      .catch((error) => {
        if (error === 'Aborted') {
          return;
        }
        window.console.log('oops... something went wrong...');
        window.console.log(error);
      });
  }

  /**
   * load the data by url(urls)
   * @param {string|array} url - resource url.
   * @param {Map} requests - used for cancellation.
   * @return {promise} promise
   */
  load(url: LoaderUrl, requests?: Map<string, XMLHttpRequest>): Promise<unknown[]> {
    // if we load a single file, convert it to an array
    let urls: Array<string | string[]>;
    if (!Array.isArray(url)) {
      urls = [url];
    } else {
      urls = url;
    }

    if (this._progressBar) {
      this._progressBar.totalFiles = urls.length;
      this._progressBar.requests = requests;
    }

    // emit 'load-start' event
    this.emit('load-start', {
      files: urls,
      time: new Date(),
    });

    const loadSequences: Promise<unknown>[] = [];
    urls.forEach((file) => {
      if (!Array.isArray(file)) {
        loadSequences.push(this.loadSequence(file, requests));
      } else {
        loadSequences.push(this.loadSequenceGroup(file, requests));
      }
    });
    return Promise.all(loadSequences);
  }

  /**
   * Set data
   * @param {array} data
   */
  set data(data: unknown[]) {
    this._data = data;
  }

  /**
   * Get data
   * @return {array} data loaded
   */
  get data() {
    return this._data;
  }
}
