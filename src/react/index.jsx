import React from 'react';
import '@/css/index.css';
import { createRoot } from 'react-dom/client';
import { Router } from './Router.jsx';

const rootEl = document.getElementById('root');

// Global error handler for startup issues
window.onerror = function(message, source, lineno, colno, error) {
  console.error("Global Error:", message, source, lineno, colno, error);
  if (rootEl) {
    rootEl.innerHTML = `
      <div style="color: red; padding: 20px; font-family: monospace;">
        <h1>Startup Error</h1>
        <p>${message}</p>
        <p>Source: ${source}:${lineno}:${colno}</p>
        <pre>${error?.stack || ''}</pre>
      </div>
    `;
  }
};

console.log("[index.jsx] bootstrapping...");

try {
  const root = createRoot(rootEl);
  root.render(<Router />);
  console.log("[index.jsx] render called");
} catch (e) {
  console.error("[index.jsx] Render failed:", e);
  window.onerror(e.message, "index.jsx", 0, 0, e);
}
