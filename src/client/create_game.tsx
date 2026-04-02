import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import MapComponent from './MapComponent';
import CreateGame from "./CreateGame";
import Leaderboard from './Leaderboard';
import { Routes, Route, BrowserRouter, Navigate, useLocation, useNavigate } from "react-router-dom";

function RedirectIndex() {
  const location = useLocation();
  // Preserve query string
  return <Navigate to={`/${location.search}`} replace />;
}

createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<CreateGame />} />
      <Route path="*" element={<RedirectIndex />} />
    </Routes>
  </BrowserRouter>
);