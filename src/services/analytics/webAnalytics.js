const ANALYTICS_PROVIDER = (import.meta.env.VITE_ANALYTICS_PROVIDER || '').trim().toLowerCase();
const ANALYTICS_DOMAIN = (import.meta.env.VITE_ANALYTICS_DOMAIN || '').trim();
const ANALYTICS_SCRIPT_SRC = (import.meta.env.VITE_ANALYTICS_SCRIPT_SRC || '').trim();
const ANALYTICS_ENDPOINT = (import.meta.env.VITE_ANALYTICS_ENDPOINT || '').trim();

let initialized = false;
let initialPageKey = '';
let skippedInitialPageView = false;

function isBrowser() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function isDoNotTrackEnabled() {
  if (!isBrowser()) return false;
  const value = window.navigator.doNotTrack || window.navigator.msDoNotTrack || window.doNotTrack;
  return value === '1' || value === 'yes';
}

function currentPageKey() {
  if (!isBrowser()) return '';
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

function currentPageUrl() {
  if (!isBrowser()) return '';
  return `${window.location.origin}${currentPageKey()}`;
}

function appendScript({ id, src, attributes = {} }) {
  if (!isBrowser() || document.getElementById(id)) return;
  const script = document.createElement('script');
  script.id = id;
  script.src = src;
  script.defer = true;
  for (const [name, value] of Object.entries(attributes)) {
    if (value) script.setAttribute(name, value);
  }
  document.head.appendChild(script);
}

function initPlausible() {
  const domain = ANALYTICS_DOMAIN || window.location.hostname;
  window.plausible =
    window.plausible ||
    function plausibleQueue() {
      window.plausible.q = window.plausible.q || [];
      window.plausible.q.push(arguments);
    };

  appendScript({
    id: 'phylomovies-plausible-analytics',
    src: ANALYTICS_SCRIPT_SRC || 'https://plausible.io/js/script.js',
    attributes: {
      'data-domain': domain,
    },
  });
}

function initGoatCounter() {
  if (!ANALYTICS_ENDPOINT) return;
  window.goatcounter = window.goatcounter || {};
  window.goatcounter.path = currentPageKey();

  appendScript({
    id: 'phylomovies-goatcounter-analytics',
    src: ANALYTICS_SCRIPT_SRC || 'https://gc.zgo.at/count.js',
    attributes: {
      'data-goatcounter': ANALYTICS_ENDPOINT,
    },
  });
}

export function initWebAnalytics() {
  if (initialized || !isBrowser() || isDoNotTrackEnabled()) return;
  if (!ANALYTICS_PROVIDER) return;

  initialPageKey = currentPageKey();
  initialized = true;

  if (ANALYTICS_PROVIDER === 'plausible') {
    initPlausible();
  } else if (ANALYTICS_PROVIDER === 'goatcounter') {
    initGoatCounter();
  } else {
    initialized = false;
    if (import.meta.env.DEV) {
      console.warn(`[analytics] Unsupported VITE_ANALYTICS_PROVIDER: ${ANALYTICS_PROVIDER}`);
    }
  }
}

export function trackWebAnalyticsPageView() {
  if (!initialized || !isBrowser() || isDoNotTrackEnabled()) return;
  const pageKey = currentPageKey();

  if (!skippedInitialPageView && pageKey === initialPageKey) {
    skippedInitialPageView = true;
    return;
  }
  skippedInitialPageView = true;

  if (ANALYTICS_PROVIDER === 'plausible' && typeof window.plausible === 'function') {
    window.plausible('pageview', { u: currentPageUrl() });
  } else if (ANALYTICS_PROVIDER === 'goatcounter' && window.goatcounter?.count) {
    window.goatcounter.count({
      path: pageKey,
      title: document.title,
      event: false,
    });
  }
}
