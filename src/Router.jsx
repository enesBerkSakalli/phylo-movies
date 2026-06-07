import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WorkspaceInitializationPage } from './pages/WorkspaceInitialization/WorkspaceInitializationPage.jsx';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import { isElectron } from './services/data/apiConfig.js';

const VisualizationApp = React.lazy(() => import('./App.jsx'));
const GitHubPagesInfoPage = React.lazy(() =>
  import('./pages/GitHubPages/GitHubPagesInfoPage.jsx').then((module) => ({
    default: module.GitHubPagesInfoPage,
  }))
);
const UsageExamplesPage = React.lazy(() =>
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

function VisualizationRoute() {
  return (
    <LazyRoute>
      <VisualizationApp />
    </LazyRoute>
  );
}

function LazyRoute({ children }) {
  return (
    <React.Suspense fallback={<RouteLoadingFallback />}>
      {children}
    </React.Suspense>
  );
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
