import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

const rootEl = document.getElementById('root');
const root = createRoot(rootEl);
root.render(<App />);

// Initialize the non-React app core (data load, controllers, etc.)
import('../js/core/main.js');

