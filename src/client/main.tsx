import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';

createRoot(document.getElementById('expanded')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
