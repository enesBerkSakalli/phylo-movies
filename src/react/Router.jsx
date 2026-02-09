import React from 'react';
import { BrowserRouter, HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './home/HomePage.jsx';
import App from './App.jsx';
import { ErrorBoundary } from './ErrorBoundary.jsx';
import { isElectron } from '../js/services/data/apiConfig.js';

// Use HashRouter for Electron (file:// protocol), BrowserRouter for web
const RouterComponent = isElectron() ? HashRouter : BrowserRouter;

// Resolve basename for GitHub Pages deployment (e.g. /phylo-movies/)
const basename = isElectron() ? undefined : import.meta.env.BASE_URL?.replace(/\/$/, '') || '';

export function Router() {
  return (
    <RouterComponent basename={basename}>
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/visualization" element={<App />} />
        </Routes>
      </ErrorBoundary>
    </RouterComponent>
  );
}
