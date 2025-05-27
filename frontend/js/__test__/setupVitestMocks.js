// Polyfill window and document for environments where jsdom is not set up yet
if (typeof window === 'undefined') global.window = global;
if (typeof document === 'undefined') {
  global.document = {
    createElement: () => ({ style: {}, appendChild: () => {}, setAttribute: () => {} }),
    createElementNS: () => ({ style: {}, appendChild: () => {}, setAttribute: () => {} }),
    body: { appendChild: () => {} },
    getElementById: () => null,
  };
}
// setupVitestMocks.js
import { vi } from 'vitest';

global.alert = vi.fn();

global.WinBox = vi.fn(function (opts) {
  this.el = true;
  this.mount = (el) => document.body.appendChild(el);
  this.focus = vi.fn();
  this.onclose = null;
});