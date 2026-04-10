import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WorkspaceInitializationPage } from '@/pages/WorkspaceInitialization/WorkspaceInitializationPage.jsx';
import { GitHubPagesInfoPage } from '@/pages/GitHubPages/GitHubPagesInfoPage.jsx';
import App from '@/App.jsx';
import { ErrorBoundary } from '@/components/ErrorBoundary.jsx';
import { isElectron } from '@/services/data/apiConfig.js';

// Use HashRouter for Electron (file:// protocol), BrowserRouter for web
const RouterComponent = isElectron() ? HashRouter : BrowserRouter;

// Resolve basename for GitHub Pages deployment (e.g. /phylo-movies/)
const basename = isElectron() ? undefined : import.meta.env.BASE_URL?.replace(/\/$/, '') || '';
const isDocsOnlyMode = import.meta.env.VITE_DOCS_ONLY === 'true';
const landingElement = isDocsOnlyMode ? <GitHubPagesInfoPage /> : <WorkspaceInitializationPage />;
const landingPath = '/';

export function Router() {
  return (
    <RouterComponent basename={basename}>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={landingElement} />
          <Route path="/home" element={<Navigate to={landingPath} replace />} />
          <Route
            path="/visualization"
            element={isDocsOnlyMode ? <Navigate to="/" replace /> : <App />}
          />
          <Route path="*" element={<Navigate to={landingPath} replace />} />
        </Routes>
      </ErrorBoundary>
    </RouterComponent>
  );
}
