import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

const Menu: React.FC = () => {
  const navigate = useNavigate();
  const [hasPlayed, setHasPlayed] = useState<boolean | null>(null);

  useEffect(() => {
    async function checkIfPlayed() {
      const resp = await fetch('/api/already_played');
      if (resp.ok && !resp.body) {
        setHasPlayed(false);
      } else {
        setHasPlayed(true);
      }
    }

    checkIfPlayed();
  }, []);

  if (hasPlayed) {
    return (
      <div className="p-4">
        <h1 className="text-xl font-bold mb-2">Leaderboard</h1>
        {/* Render leaderboard here */}
      </div>
    );
  }

  return (
    <div className="flex relative flex-col justify-center items-center min-h-screen gap-4">
      <div className="text-xl">Geo Dart</div>
      <button className="rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white opacity-100 focus:outline-none" onClick={() => navigate("/gallery")}>PLAY</button>
      <button className="rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white opacity-100 focus:outline-none" onClick={() => navigate("/create_game")}>CREATE GAME</button>
    </div>
  );
};

export default Menu;