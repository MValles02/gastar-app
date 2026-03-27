import React from 'react';
import ReactDOM from 'react-dom/client';
import { ThemeProvider } from './shared/contexts/ThemeContext.js';
import App from './App.js';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </React.StrictMode>
);
