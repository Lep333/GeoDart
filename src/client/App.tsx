import { Routes, Route, BrowserRouter, Navigate, useLocation } from "react-router-dom";
import Gallery from "./Gallery";
import MapComponent from "./MapComponent";
import Menu from "./Menu";
import CreateGame from "./CreateGame";

function RedirectIndex() {
  const location = useLocation();
  // Preserve query string
  return <Navigate to={`/${location.search}`} replace />;
}

export const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Menu />} />
        <Route path="/gallery" element={<Gallery />} />
        <Route path="/map" element={<MapComponent />} />
        <Route path="/menu" element={<Menu />} />
        <Route path="/create_game" element={<CreateGame/>} />
        <Route path="*" element={<RedirectIndex />} />
      </Routes>
    </BrowserRouter>
  );
};
