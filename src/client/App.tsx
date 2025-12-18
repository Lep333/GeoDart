import { useEffect } from "react";
import { Routes, Route, BrowserRouter, Navigate, useLocation, useNavigate } from "react-router-dom";
import Gallery from "./Gallery";
import MapComponent from "./MapComponent";
import Menu from "./Menu";
import Preview from "./Preview";
import CreateGame from "./CreateGame";
import Leaderboard from "./Leaderboard";
import { TimerProvider } from "./TimerContext";
import GuessMap from "./GuessMap";
import { AppProvider } from "./AppContext";

function RedirectIndex() {
  const location = useLocation();
  // Preserve query string
  return <Navigate to={`/${location.search}`} replace />;
}

export const App = () => {
  return (
    <AppProvider>
      <TimerProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Menu />} />
            <Route path="/gallery" element={<Gallery />} />
            <Route path="/map" element={<MapComponent />} />
            <Route path="/guess_map" element={<GuessMap />} />
            <Route path="/menu" element={<Menu />} />
            <Route path="/create_game" element={<CreateGame />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
            <Route path="*" element={<RedirectIndex />} />
          </Routes>
        </BrowserRouter>
      </TimerProvider>
    </AppProvider>
  );
};
