import React from 'react';
import '@/css/index.css';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';

const rootEl = document.getElementById('root');
const root = createRoot(rootEl);
root.render(<App />);
