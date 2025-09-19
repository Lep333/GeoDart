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

  const userRef = useRef(null);

  useEffect(() => {
    if (userRef.current) {
      userRef.current.scrollIntoView({
        behavior: "smooth",
        block: "center", // center it vertically in the scroll area
      });
    }
  }, [leaderboard]);

  return (
    <div className="flex relative flex-col justify-center items-center min-h-screen gap-4">
      <div className="fixed top-10 rounded-md bg-blue-500 text-3xl font-bold px-4 py-2 text-white">Leaderboard</div>
      <div className="fixed top-25 grid grid-rows-[auto_1fr] w-2/3 h-2/3">
        <div className="grid grid-cols-[1fr_2fr_1fr] rounded-md bg-blue-500 text-white px-2 py-1 mb-1 shadow-md">
            <div>Rank</div>
            <div>Name</div>
            <div className="text-right">Score</div>
        </div>
        <div className="rounded-md overflow-y-auto">
        { leaderboard && leaderboard.leaderboard.map((el, i) => (
            <div
            key={i}
            ref={el.curr_user ? userRef : null}
            className={ el.curr_user? "grid grid-cols-[1fr_2fr_1fr] rounded-md bg-violet-600 text-white px-2 py-1 mb-1 shadow-md"
              :"grid grid-cols-[1fr_2fr_1fr] gap-1 rounded-md bg-blue-500 text-white px-2 py-1 mb-1 shadow-md"}>
                <div>{el.rank}</div>
                <div className="truncate">{el.member}</div>
                <div className="text-right">{el.score}</div>
            </div>
        )) }
        </div>
      </div>
      <button className="fixed bottom-10 rounded-md bg-blue-500 px-4 py-2 text-xl font-semibold text-white opacity-100 focus:outline-none"
        onClick={() => navigate("/create_game")}>Create Game</button>
    </div>
  );
};

export default Leaderboard;