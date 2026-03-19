import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import MapComponent from './MapComponent';
import SeasonLeaderboard from "./SeasonLeaderboard";
import Leaderboard from './Leaderboard';
import { Routes, Route, BrowserRouter, Navigate, useLocation, useNavigate } from "react-router-dom";

function RedirectIndex() {
  const location = useLocation();
  // Preserve query string
  return <Navigate to={`/${location.search}`} replace />;
}

createRoot(document.getElementById('root')!).render(
  <div className="flex w-full h-screen relative flex-col justify-center items-center gap-4 overflow-hidden">
    <div className="fixed top-10 rounded-md bg-blue-500 text-3xl font-bold px-4 py-2 text-white">Season Leaderboard</div>
    <div className="fixed top-25 rounded-md bg-blue-500 text-md font-bold px-4 py-2 text-white">Play GeoDart to collect points until: </div>
  </div>
);