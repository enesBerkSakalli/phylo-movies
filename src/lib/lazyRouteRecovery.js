import React from 'react';

export const LAZY_ROUTE_RELOAD_KEY = 'phylo-movies:lazy-route-reload';

const DYNAMIC_IMPORT_FAILURE_PATTERNS = [
  /Failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /Importing a module script failed/i,
  /ChunkLoadError/i,
  /Loading chunk \S+ failed/i,
  /Failed to load module script/i,
  /Unable to preload CSS/i,
];

export function isDynamicImportFailure(error) {
  const message = [error?.name, error?.message, String(error ?? '')].filter(Boolean).join(' ');
  return DYNAMIC_IMPORT_FAILURE_PATTERNS.some((pattern) => pattern.test(message));
}

export function lazyRoute(importer) {
  return React.lazy(async () => {
    try {
      const module = await importer();
      clearLazyRouteReloadMarker();
      return module;
    } catch (error) {
      if (isDynamicImportFailure(error) && requestLazyRouteReload()) {
        return new Promise(() => {});
      }
      throw error;
    }
  });
}

function requestLazyRouteReload() {
  if (typeof window === 'undefined' || !window.location?.reload) return false;

  const storage = getSessionStorage();
  if (storage?.getItem(LAZY_ROUTE_RELOAD_KEY)) return false;

  storage?.setItem(
    LAZY_ROUTE_RELOAD_KEY,
    JSON.stringify({
      href: window.location.href,
      at: Date.now(),
    })
  );
  window.location.reload();
  return true;
}

function clearLazyRouteReloadMarker() {
  getSessionStorage()?.removeItem(LAZY_ROUTE_RELOAD_KEY);
}

function getSessionStorage() {
  try {
    return typeof window === 'undefined' ? null : window.sessionStorage;
  } catch {
    return null;
  }
}
