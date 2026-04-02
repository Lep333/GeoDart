import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LeaderboardResponse, SeasonLeaderboardResponse } from "../shared/types/api";
import { useCounter } from './hooks/useCounter';
import { getWebViewMode, requestExpandedMode } from '@devvit/web/client';

const SeasonLeaderboard: React.FC = () => {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<SeasonLeaderboardResponse | null>(null);
  const [isModerator, setModerator] = useState<boolean>(false);
  const [editSettings, setSettings] = useState<boolean>(false);
  let [startDate, setStartDate] = useState<Date>(new Date());
  let [endDate, setEndDate] = useState<Date>(new Date());
  const listRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function getLeaderboard() {
      const response = await fetch('/api/season-leaderboard');
      if (response.ok && response.body) {
        const data: SeasonLeaderboardResponse = await response.json();
        setLeaderboard(data);
        for (let permission of data.userPermission) {
          if (permission == "all") {
            setModerator(true);
          }
        }
      }
    }
    getLeaderboard();
  }, []);
  
  useEffect(() => {
    if (!listRef.current) return;
    const list = listRef.current;
    const container = list.parentElement!;
    const userEl = userRef.current;
    const currentMode = getWebViewMode(); // Returns 'inline' | 'expanded'
    if (!userEl) {
      return;
    }

    if (currentMode === 'inline') {
      // 1) If username NOT in list → userRef = null → no animation
      const containerTop = container.offsetTop;
      const containerBottom = containerTop + container.offsetHeight;

      const userTop = userEl.offsetTop;
      const userBottom = userEl.offsetTop + userEl.offsetHeight;

      // 2) If user is already fully visible → no animation
      if (userTop >= containerTop && userBottom <= containerBottom) {
        return;
      }

      // 3) Otherwise → animate
      const containerHeight = container.offsetHeight;
      const targetCenter = userEl.offsetTop + userEl.offsetHeight / 2;

      const translateY = containerHeight / 2 - targetCenter;

      list.style.transform = `translateY(${translateY}px)`;
    } else {
      const containerTop = container.scrollTop;
      const containerBottom = containerTop + container.clientHeight;

      const userTop = userEl.offsetTop;
      const userBottom = userTop + userEl.offsetHeight;

      // If user is already fully visible → do nothing
      if (userTop >= containerTop && userBottom <= containerBottom) {
        return;
      }

      // Otherwise → scroll the container to center the user
      const containerHeight = container.clientHeight;
      const targetCenter = userTop + userEl.offsetHeight / 2;

      // Calculate scrollTop to center the user
      const newScrollTop = targetCenter - containerHeight / 2;

    container.scrollTo({
      top: newScrollTop,
      behavior: "smooth", // smooth animation
      });
    }
  }, [leaderboard]);
  
  return (
    <div className="flex w-full h-screen relative flex-col justify-center items-center gap-4 overflow-hidden">
      <div className="fixed top-10 rounded-md bg-blue-500 text-3xl font-bold px-4 py-2 text-white">Season Leaderboard</div>
      <div className="fixed top-25 rounded-md bg-blue-500 text-md font-bold px-4 py-2 text-white w-4/5">
        {`Play GeoDart to collect points until: ${new Date(leaderboard?.end_timestamp).toLocaleString()}`}
      </div>
        { isModerator &&
          <button className="fixed bottom-10 right-10 rounded-md bg-blue-500 text-xl px-4 py-3" onClick={async (event: React.MouseEvent<HTMLButtonElement>) => {setSettings(!editSettings)}}>
            <img className="h-[1em] w-auto" src="/settings_icon.svg" alt="settings icon"></img>
          </button> }
        { editSettings &&
        <div className="fixed flex flex-col top-25 z-20 rounded-md bg-blue-500 px-4 py-2 w-4/5 text-white">
          <div>Title:<input placeholder="Spring Leaderboard"/></div>
          <div>Start date:<input type="date" onChange={(e) => {setStartDate(new Date(e.target.value))}}/></div>
          <div>End date:<input type="date" onChange={(e) => {setEndDate(new Date(e.target.value))}}/></div>
          <button className="border-white border-2 border-style-solid rounded-md my-2" onClick={async () => {setSettings(!editSettings)}}>Cancel</button>
          <button className="border-white border-2 border-style-solid rounded-md my-2" onClick={async () => {
            const obj = {
              start: startDate.toString(),
              end: endDate.toString(),
            };
            let resp = await fetch("/api/season-leaderboard", { method: 'PUT', headers: {
              'Content-Type': 'application/json'}, body: JSON.stringify(obj)});
            resp = await resp.json();
            setSettings(!editSettings);
          }}>Edit</button>
        </div> }
        <div className="fixed top-45 bottom-30 grid grid-rows-[auto_1fr] w-2/3">
          <div className="grid grid-cols-[1fr_2fr_1fr] rounded-md bg-blue-500 text-white px-2 py-1 mb-1 shadow-md">
              <div>Rank</div>
              <div>Name</div>
              <div className="text-right">Score</div>
          </div>
          <div className="rounded-md overflow-hidden">
            <div
              ref={listRef}
              className="transition-transform duration-700 ease-out"
            >
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
        </div>
        <div className="fixed bottom-10 z-20 flex gap-2 justify-center items-center items-stretch max-w-sm">
          <button className="fixed bottom-10 rounded-md bg-blue-500 px-4 py-2 text-xl font-semibold text-white opacity-100 focus:outline-none"
            onClick={async (event: React.MouseEvent<HTMLButtonElement>) => {
              try {
                await requestExpandedMode(event.nativeEvent, 'create_game');
              } catch (error) {
                console.error('Failed to enter expanded mode:', error);
              }
            }}>Create Game</button>
        </div>
    </div>
  );
};

export default SeasonLeaderboard;