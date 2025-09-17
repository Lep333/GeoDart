import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import EarthLoader from "./LoadingScreen";

const Menu: React.FC = () => {
  const navigate = useNavigate();
  const [hasPlayed, setHasPlayed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean | null>(true);

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
    console.log("schon gespielt");
    navigate("/leaderboard");
  }

  return (
    <div className="flex relative flex-col justify-center items-center min-h-screen gap-4">
      <div className="fixed top-25 rounded-md bg-blue-500 text-3xl font-bold px-4 py-2 text-white">Geo Dart</div>
      <button className="rounded-md bg-blue-500 px-4 py-2 text-xl font-semibold text-white opacity-100 focus:outline-none" onClick={() => navigate("/gallery")}>PLAY</button>
      <button className="rounded-md bg-blue-500 px-4 py-2 text-xl font-semibold text-white opacity-100 focus:outline-none" onClick={() => navigate("/create_game")}>CREATE GAME</button>
    </div>
  );
};

export default Menu;