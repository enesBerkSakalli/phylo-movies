import React from 'react';
import '@/css/index.css';
import { createRoot } from 'react-dom/client';
import { Router } from './Router.jsx';

const rootEl = document.getElementById('root');
const root = createRoot(rootEl);
root.render(<Router />);
