import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App.tsx';
import { registerPwa } from './pwa.ts';

registerPwa();

const root = document.getElementById('root');
if (!root) {
  throw new Error('Root element #root is missing from index.html');
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
