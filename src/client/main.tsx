import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import MapComponent from './MapComponent';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MapComponent />
  </StrictMode>
);
