import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import MapComponent from './MapComponent';
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Preview from "./Preview";

createRoot(document.getElementById('root')!).render(
  <Preview/>
);