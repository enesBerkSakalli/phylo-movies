import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { WorkspaceInitializationPage } from './pages/WorkspaceInitialization/WorkspaceInitializationPage.jsx';
import { GitHubPagesInfoPage } from './pages/GitHubPages/GitHubPagesInfoPage.jsx';
import { UsageExamplesPage } from './pages/UsageExamples/UsageExamplesPage.jsx';
import App from './App.jsx';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import { isElectron } from './services/data/apiConfig.js';

// Use HashRouter for Electron (file:// protocol), BrowserRouter for web
const RouterComponent = isElectron() ? HashRouter : BrowserRouter;

// Resolve basename for GitHub Pages deployment (e.g. /phylo-movies/)
const basename = isElectron() ? undefined : import.meta.env.BASE_URL?.replace(/\/$/, '') || '';
const isDocsOnlyMode = import.meta.env.VITE_DOCS_ONLY === 'true';
const isDemoOnlyMode = import.meta.env.VITE_DEMO_ONLY === 'true';
const landingElement = isDemoOnlyMode ? (
  <WorkspaceInitializationPage demoOnly />
) : isDocsOnlyMode ? (
  <GitHubPagesInfoPage />
) : (
  <WorkspaceInitializationPage />
);

export function Router() {
  return (
    <RouterComponent basename={basename}>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={landingElement} />
          <Route path="/usage" element={<UsageExamplesPage />} />
          <Route path="/demo" element={<WorkspaceInitializationPage demoOnly />} />
          <Route path="/demo/open" element={<Navigate to="/demo" replace />} />
          <Route path="/visualization" element={<App />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </ErrorBoundary>
    </RouterComponent>
  );
}
