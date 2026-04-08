import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './home/HomePage.jsx';
import { GitHubPagesInfoPage } from './home/GitHubPagesInfoPage.jsx';
import App from './App.jsx';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import { isElectron } from '../js/services/data/apiConfig.js';

// Use HashRouter for Electron (file:// protocol), BrowserRouter for web
const RouterComponent = isElectron() ? HashRouter : BrowserRouter;

// Resolve basename for GitHub Pages deployment (e.g. /phylo-movies/)
const basename = isElectron() ? undefined : import.meta.env.BASE_URL?.replace(/\/$/, '') || '';
const isDocsOnlyMode = import.meta.env.VITE_DOCS_ONLY === 'true';
const landingElement = isDocsOnlyMode ? <GitHubPagesInfoPage /> : <HomePage />;
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
