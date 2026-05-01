/**
 * Vitest setup: intercept XMLHttpRequest so that paths like /base/data/...
 * are served from the local filesystem, replicating what Karma's dev server did.
 */
import { readFileSync } from 'fs';
import { join } from 'path';

const PROJECT_ROOT = join(new URL(import.meta.url).pathname, '../..');

class MockXMLHttpRequest {
  constructor() {
    this.status = 0;
    this.statusText = '';
    this.response = null;
    this.responseType = 'arraybuffer';
    this.crossOrigin = true;
    this._url = '';
    this.onload = null;
    this.onerror = null;
    this.onabort = null;
    this.ontimeout = null;
    this.onprogress = null;
    this.onloadstart = null;
    this.onloadend = null;
  }

  open(_method, url) {
    this._url = url;
  }

  send() {
    const url = this._url;

    setTimeout(() => {
      if (this.onloadstart) this.onloadstart({});

      try {
        // Map /base/data/... to <project-root>/data/...
        const relativePath = url.replace(/^\/base\//, '');
        const absolutePath = join(PROJECT_ROOT, relativePath);
        const nodeBuffer = readFileSync(absolutePath);
        const arrayBuffer = nodeBuffer.buffer.slice(
          nodeBuffer.byteOffset,
          nodeBuffer.byteOffset + nodeBuffer.byteLength
        );

        this.status = 200;
        this.statusText = 'OK';
        this.response = arrayBuffer;

        const event = { loaded: nodeBuffer.byteLength, total: nodeBuffer.byteLength };
        if (this.onprogress) this.onprogress(event);
        if (this.onload) this.onload(event);
      } catch (_e) {
        this.status = 404;
        this.statusText = 'Not Found';
        if (this.onerror) this.onerror({});
      }

      if (this.onloadend) this.onloadend({});
    }, 0);
  }

  abort() {
    this.statusText = 'Aborted';
    if (this.onabort) this.onabort({});
    if (this.onloadend) this.onloadend({});
  }

  setRequestHeader() {}
}

globalThis.XMLHttpRequest = MockXMLHttpRequest;
