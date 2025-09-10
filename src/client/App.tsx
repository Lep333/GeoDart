import { Routes, Route, BrowserRouter, Navigate, useLocation } from "react-router-dom";
import Gallery from "./Gallery";
import MapComponent from "./MapComponent";

function RedirectIndex() {
  const location = useLocation();
  // Preserve query string
  return <Navigate to={`/${location.search}`} replace />;
}

export const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Gallery />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/map" element={<MapComponent />} />
        <Route path="*" element={<RedirectIndex />} />
      </Routes>
    </BrowserRouter>
  );
};
