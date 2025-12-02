import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import EarthLoader from "./LoadingScreen";

const Menu: React.FC = () => {
  const navigate = useNavigate();
  const [hasPlayed, setHasPlayed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean | null>(true);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    async function checkIfPlayed() {
      const resp = await fetch('/api/already_played');
      if (resp.ok) {
        const { already_played } = await resp.json();
        if (already_played) {
          setHasPlayed(true);
        } else {
          setHasPlayed(false);
        }
      }
      setLoading(false);
    }

    checkIfPlayed();
  }, []);

  if (loading) {
    return (<EarthLoader />);
  }

  if (hasPlayed) {
    navigate("/leaderboard");
  }

  return (
    <div className="flex relative flex-col justify-center items-center min-h-screen gap-4">
      <div className="fixed top-25 rounded-md bg-blue-500 text-3xl font-bold px-4 py-2 text-white">Geo Dart</div>
      <div className="flex flex-col items-stretch gap-2 w-1/2 max-w-sm">
        <button className="rounded-md bg-blue-500 px-4 py-2 text-xl font-semibold text-white opacity-100 focus:outline-none" onClick={() => navigate("/gallery")}>Play</button>
        <button className="rounded-md bg-blue-500 px-4 py-2 text-xl font-semibold text-white opacity-100 focus:outline-none" onClick={() => setIsOpen(true)}>How To</button>
        <button className="rounded-md bg-blue-500 px-4 py-2 text-xl font-semibold text-white opacity-100 focus:outline-none" onClick={() => navigate("/create_game")}>Create Game</button>
      </div>
            {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-opacity-50">
          {/* Modal content */}
          <div className="w-96 rounded-lg bg-blue-500 p-6 shadow-lg">
            <h2 className="mb-4 text-xl text-white font-bold">How To</h2>
            <p className="mb-4 text-white">
              You have 60 seconds to find the location.
              Use the images as hints, then place your pin on the map.
              Zoom with gestures on mobile, or with your mouse wheel on desktop.
            </p>
            <div className="flex justify-center gap-2">
              <button
                className="rounded bg-blue-200 text-black px-4 py-2"
                onClick={() => setIsOpen(false)}
              >
                Ok
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Menu;