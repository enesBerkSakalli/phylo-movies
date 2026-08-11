import React, { useEffect } from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { WorkspaceInitializationPage } from './pages/WorkspaceInitialization/WorkspaceInitializationPage.jsx';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import { isElectron } from './services/data/apiConfig.js';
import { lazyRoute } from './lib/lazyRouteRecovery.js';

const VisualizationApp = lazyRoute(() => import('./App.jsx'));
const GitHubPagesInfoPage = lazyRoute(() =>
  import('./pages/GitHubPages/GitHubPagesInfoPage.jsx').then((module) => ({
    default: module.GitHubPagesInfoPage,
  }))
);
const UsageExamplesPage = lazyRoute(() =>
  import('./pages/UsageExamples/UsageExamplesPage.jsx').then((module) => ({
    default: module.UsageExamplesPage,
  }))
);

// Use HashRouter for Electron (file:// protocol), BrowserRouter for web
const RouterComponent = isElectron() ? HashRouter : BrowserRouter;

// Resolve basename for GitHub Pages deployment (e.g. /phylo-movies/)
const basename = isElectron() ? undefined : import.meta.env.BASE_URL?.replace(/\/$/, '') || '';
const isDocsOnlyMode = import.meta.env.VITE_DOCS_ONLY === 'true';
const isDemoOnlyMode = import.meta.env.VITE_DEMO_ONLY === 'true';

// Analytics belongs to the public surfaces only: the usage webpage and the
// GitHub Pages landing page. The application routes - /visualization, /demo,
// the workspace landing in full-app mode, and every route under Electron -
// never load the module, so nothing is fetched there at all.
const ANALYTICS_WEBPAGE_PATHS = new Set(['/usage']);

function isAnalyticsSurface(pathname) {
  if (isElectron()) return false;
  if (ANALYTICS_WEBPAGE_PATHS.has(pathname)) return true;
  return isDocsOnlyMode && pathname === '/';
}

const landingElement = isDemoOnlyMode ? (
  <WorkspaceInitializationPage demoOnly />
) : isDocsOnlyMode ? (
  <LazyRoute>
    <GitHubPagesInfoPage />
  </LazyRoute>
) : (
  <WorkspaceInitializationPage />
);

export function Router() {
  return (
    <RouterComponent basename={basename}>
      <ErrorBoundary>
        <AnalyticsRouteTracker />
        <Routes>
          <Route path="/" element={landingElement} />
          <Route
            path="/usage"
            element={
              <LazyRoute>
                <UsageExamplesPage />
              </LazyRoute>
            }
          />
          <Route path="/demo" element={<WorkspaceInitializationPage demoOnly />} />
          <Route path="/demo/open" element={<Navigate to="/demo" replace />} />
          <Route path="/visualization" element={<VisualizationRoute />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </RouterComponent>
  );
}

function AnalyticsRouteTracker() {
  const location = useLocation();

  useEffect(() => {
    if (!isAnalyticsSurface(location.pathname)) return undefined;

    let cancelled = false;
    import('./services/analytics/webAnalytics.js').then((analytics) => {
      if (cancelled) return;
      analytics.initWebAnalytics();
      analytics.trackWebAnalyticsPageView();
    });

    return () => {
      cancelled = true;
    };
  }, [location.hash, location.pathname, location.search]);

  return null;
}

function VisualizationRoute() {
  return (
    <LazyRoute>
      <VisualizationApp />
    </LazyRoute>
  );
}

function LazyRoute({ children }) {
  return <React.Suspense fallback={<RouteLoadingFallback />}>{children}</React.Suspense>;
}

function RouteLoadingFallback() {
  return (
    <main
      aria-live="polite"
      className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground"
    >
      Loading page...
    </main>
  );
}
