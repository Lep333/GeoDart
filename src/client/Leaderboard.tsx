import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LeaderboardResponse } from "../shared/types/api";

const Leaderboard: React.FC = () => {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);

  useEffect(() => {
    async function getLeaderboard() {
        const response = await fetch('/api/leaderboard');
        if (response.ok && response.body) {
            const data: LeaderboardResponse = await response.json();
            setLeaderboard(data);
        }
    }
    getLeaderboard();
  }, []);

  return (
    <div className="flex relative flex-col justify-center items-center min-h-screen gap-4">
      <div className="fixed top-25 rounded-md bg-blue-500 text-3xl font-bold px-4 py-2 text-white">Leaderboard</div>
      <div className="grid grid-cols-1 w-2/3">
        <div className="grid grid-cols-3 rounded-md bg-blue-500 text-white px-2 py-1">
            <div>Rank</div>
            <div>Name</div>
            <div>Score</div>
        </div>
        { leaderboard && leaderboard.leaderboard.map((el) => (
            <div className="grid grid-cols-3 rounded-md bg-blue-500 text-white px-2 py-1 my-2">
                <div>{el.rank}</div>
                <div>{el.member}</div>
                <div>{el.score}</div>
            </div>
        )) }
      </div>
      <button className="rounded-md bg-blue-500 px-4 py-2 text-xl font-semibold text-white opacity-100 focus:outline-none" onClick={() => navigate("/create_game")}>CREATE GAME</button>
    </div>
  );
};

export default Leaderboard;