import type EventEmitter from 'eventemitter3';
import CoreUtils from '../core/core.utils';

/**
 * Event Based progressbar
 * @module helpers/progressBar
 *
 * @example
 *
 * let loader = new LoadersVolume();
 * const domContainer = document.getElementById('progressbar');
 * const pb = new HelpersProgressBarEventBased(loader, domContainer);
 */

/** Shape of the payloads emitted by LoadersBase/LoadersVolumes (see their emit() calls). */
interface ProgressEventPayload {
  file?: string;
  files?: string[];
  time?: Date;
  total?: number;
  loaded?: number;
  parsed?: number;
  error?: string | Error;
}

export default class HelpersProgressBarEventBased {
  _dom: HTMLElement | null;
  _emitter: EventEmitter | null;
  loaded: number;
  totalFile: number;

  _domCurrentFile: HTMLElement | null = null;
  _domTotalFile: HTMLElement | null = null;
  _domProcessList: HTMLElement | null = null;
  _domCurrentProgress: HTMLElement | null = null;

  constructor(emitter: EventEmitter, domTarget: string | HTMLElement) {
    if (!emitter || !this._isFunction(emitter.emit)) {
      window.console.error('please give the this._emitter instance');
      return;
    }

    if (CoreUtils.isString(domTarget)) {
      this._dom = document.getElementById(domTarget);
    } else {
      this._dom = domTarget;
    }

    if (!CoreUtils.isElement(this._dom)) {
      window.console.error('please give the id of container dom or directly a dom instance');
      return;
    }
    this._emitter = emitter;
    this.initContainerDom();
    this.initEventListenner();
    this.loaded = 0;
    this.totalFile = 0;
  }

  _isFunction(fn: unknown): boolean {
    return Object.prototype.toString.call(fn) === '[object Function]';
  }

  initEventListenner() {
    this._emitter.on('load-start', (event: ProgressEventPayload) => {
      const totalFiles = event.files!.length;
      this.totalFile = totalFiles;
      this._domTotalFile!.innerHTML = String(totalFiles);
    });

    this._emitter.on('fetch-start', (event: ProgressEventPayload) => {
      const fetchLi = document.createElement('li');

      const fileTag = document.createElement('div');
      fileTag.innerHTML = 'file: ' + event.file;
      fileTag.style.color = '#ffffff';
      fetchLi.append(fileTag);

      fetchLi.className = 'fetch-file';
      fetchLi.id = 'file-' + event.file;
      fetchLi.style.marginBottom = '7px';
      fetchLi.style.border = '1px solid #ffffff;';
      fetchLi.style.width = '60%';
      const fetchprogress = document.createElement('div');
      fetchprogress.id = 'file-fetch-' + event.file;
      fetchprogress.style.width = '0%';
      fetchLi.append(fetchprogress);
      this._domProcessList!.append(fetchLi);
    });

    this._emitter.on('fetch-progress', (event: ProgressEventPayload) => {
      const id = 'file-fetch-' + event.file;
      const fileFetchDom = document.getElementById(id)!;
      fileFetchDom.style.width = (event.loaded / event.total) * 100 + '%';
      fileFetchDom.style.border = '1px solid red';
    });

    this._emitter.on('fetch-success', (event: ProgressEventPayload) => {
      // show result
      const liParent = document.getElementById('file-' + event.file)!;
      const result = document.createElement('div');
      result.id = 'file-result-' + event.file;
      result.innerHTML = 'fetch-success';
      result.style.color = '#ffffff';
      liParent.append(result);
    });

    this._emitter.on('fetch-error', (event: ProgressEventPayload) => {
      // console.log(event);
    });

    this._emitter.on('fetch-abort', (event: ProgressEventPayload) => {
      // console.log(event);
    });

    this._emitter.on('fetch-end', (event: ProgressEventPayload) => {
      // console.log(event);
    });

    this._emitter.on('fetch-timeout', (event: ProgressEventPayload) => {
      // console.log(event);
    });

    this._emitter.on('parse-start', (event: ProgressEventPayload) => {
      const liParent = document.getElementById('file-' + event.file)!;
      const parseprogress = document.createElement('div');
      parseprogress.id = 'file-parse-' + event.file;
      parseprogress.style.width = '0%';
      liParent.append(parseprogress);
    });

    this._emitter.on('parsing', (event: ProgressEventPayload) => {
      const id = 'file-parse-' + event.file;
      const fileParseDom = document.getElementById(id)!;
      fileParseDom.style.width = (event.parsed / event.total) * 100 + '%';
      fileParseDom.style.border = '1px solid yellow';
    });

    this._emitter.on('parse-success', (event: ProgressEventPayload) => {
      this.loaded += 1;
      this._domCurrentFile!.innerHTML = String(this.loaded);
      this._domCurrentProgress!.style.width = (this.loaded / this.totalFile) * 100 + '%';
      // show result
      const liParent = document.getElementById('file-' + event.file)!;
      const result = document.createElement('div');
      result.id = 'file-result-' + event.file;
      result.innerHTML = 'parse-success';
      result.style.color = '#ffffff';
      liParent.append(result);
    });
  }

  initContainerDom() {
    const containerDom = `
      <div id="ami-progress-bar-container" style="background-color: rgb(33, 33, 33); color: #ffffff;">
      <div>
      <label for="progress-bar" id="progress-label" style="width: 60%; border: 1px solid #ffffff; text-align: center;">
      <span id="current-file-index">0</span>
      <span id="total-file">0</span>
      </label>
      <div id="progress-bar" style="width: 60%; border: 1px solid #ffffff; text-align: center;">
      <div id="current-progress" style="border: 1px solid red; width: 0%;"></div>
      </div>
      </div>
      <ul id="process-list" style="list-style-type: none; padding: 0; overflow-y: auto;">
      </ul>
      </div>`;
    const wrap = document.createElement('div');
    wrap.innerHTML = containerDom;
    this._dom.append(wrap);
    // dom interface
    this._domCurrentFile = document.getElementById('current-file-index');
    this._domTotalFile = document.getElementById('total-file');
    this._domProcessList = document.getElementById('process-list');
    this._domCurrentProgress = document.getElementById('current-progress');
  }
}
