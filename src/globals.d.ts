// Every factory-pattern file (`(three = window.THREE) => {...}`) falls back to a
// global THREE when no version is injected, for consumers still loading Three.js
// via a <script> tag rather than a bundler.
declare global {
  interface Window {
    THREE?: typeof import('three');
  }
}

export {};
