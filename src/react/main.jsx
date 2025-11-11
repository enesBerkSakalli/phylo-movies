import React from 'react';
import '@/index.css';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

const rootEl = document.getElementById('root');
const root = createRoot(rootEl);
root.render(<App />);

// Wait for React to commit the DOM before initializing legacy controllers
// Use requestAnimationFrame to ensure DOM is painted and stable
requestAnimationFrame(() => {
  requestAnimationFrame(() => {
    // Initialize the non-React app core (data load, controllers, etc.)
    import('../js/core/main.js');
  });
});
