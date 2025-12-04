import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { HomePage } from './home/HomePage.jsx';
import App from './App.jsx';

export function Router() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/visualization" element={<App />} />
        {/* Legacy route support */}
        <Route path="/pages/home/*" element={<Navigate to="/home" replace />} />
        <Route path="/pages/visualization/*" element={<Navigate to="/visualization" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
