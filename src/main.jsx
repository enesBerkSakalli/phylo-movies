import React from 'react';
import './css/index.css';
import { createRoot } from 'react-dom/client';
import { Router } from './Router.jsx';

const rootEl = document.getElementById('root');
let reactRootOwnsDom = false;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Global error handler for startup issues
window.onerror = function (message, source, lineno, colno, error) {
  console.error('[startup] Unhandled startup error:', {
    message,
    source,
    line: lineno,
    column: colno,
    error,
  });
  if (rootEl && !reactRootOwnsDom) {
    const location = source ? `${source}:${lineno}:${colno}` : 'unknown source';
    rootEl.innerHTML = `
      <div style="max-width: 720px; margin: 40px auto; padding: 24px; border: 1px solid #dc2626; border-radius: 8px; color: #7f1d1d; background: #fef2f2; font-family: system-ui, sans-serif;">
        <h1 style="margin: 0 0 12px; font-size: 24px;">Phylo-Movies could not start</h1>
        <p style="margin: 0 0 12px;">Reload the page. If startup fails again, copy the technical details below when reporting the issue.</p>
        <details style="white-space: pre-wrap; font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: 12px; color: #111827; background: #ffffff; border: 1px solid #fecaca; border-radius: 6px; padding: 12px;">
          <summary style="cursor: pointer; font-family: system-ui, sans-serif; font-weight: 600;">Technical details</summary>
          Message: ${escapeHtml(message)}
          Source: ${escapeHtml(location)}
          ${escapeHtml(error?.stack || '')}
        </details>
      </div>
    `;
  }
};

try {
  const root = createRoot(rootEl);
  reactRootOwnsDom = true;
  root.render(<Router />);
} catch (e) {
  reactRootOwnsDom = false;
  console.error('[startup] React root render failed:', e);
  window.onerror(e.message, 'main.jsx', 0, 0, e);
}
