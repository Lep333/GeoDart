import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LeaderboardResponse } from "../shared/types/api";
import { useCounter } from './hooks/useCounter';
import { getWebViewMode, requestExpandedMode } from '@devvit/web/client';

const Leaderboard: React.FC = () => {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const { image0, image1, image2 } = useCounter();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [hasPlayed, setHasPlayed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean | null>(true);

  useEffect(() => {
    console.log(image0);
    let images = [image0];
    if (image1) {
      images.push(image1);
    }
    if (image2) {
      images.push(image2);
    }
    setImages(images);
    console.log(images);

    images.map((url) => {
      const img = new Image();
      img.src = url;
    })
  }, [image0, image1, image2]);

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

  const listRef = useRef<HTMLDivElement>(null);
  const userRef = useRef<HTMLDivElement>(null);

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
  
  const currentMode = getWebViewMode(); // Returns 'inline' | 'expanded'
  if (currentMode === 'inline') {
    return (
      <div className="flex w-full h-screen relative flex-col justify-center items-center gap-4 overflow-hidden">
        <img
          ref={imgRef}
          src={images[0]}
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="fixed top-10 rounded-md bg-blue-500 text-3xl font-bold px-4 py-2 text-white">Leaderboard</div>
        <div className="fixed top-25 grid grid-rows-[auto_1fr] w-2/3 h-3/5">
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
        <button className="fixed bottom-10 rounded-md bg-blue-500 px-4 py-2 text-xl font-semibold text-white opacity-100 focus:outline-none"
          onClick={async (event: React.MouseEvent<HTMLButtonElement>) => {
            try {
              await requestExpandedMode(event.nativeEvent, 'game');
            } catch (error) {
              console.error('Failed to enter expanded mode:', error);
            }
          }}>Details</button>
      </div>
    );
  }

  return (
    <div className="flex w-full h-screen relative flex-col justify-center items-center gap-4 overflow-hidden">
      <img
        ref={imgRef}
        src={images[0]}
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="fixed top-10 rounded-md bg-blue-500 text-3xl font-bold px-4 py-2 text-white">Leaderboard</div>
      <div className="fixed top-25 bottom-40 grid grid-rows-[auto_1fr] w-2/3">
        <div className="grid grid-cols-[1fr_2fr_1fr] rounded-md bg-blue-500 text-white px-2 py-1 mb-1 shadow-md">
            <div>Rank</div>
            <div>Name</div>
            <div className="text-right">Score</div>
        </div>
        <div className="rounded-md overflow-y-auto">
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
      <button className="fixed bottom-25 rounded-md bg-blue-500 px-4 py-2 text-xl font-semibold text-white opacity-100 focus:outline-none"
        onClick={async (event: React.MouseEvent<HTMLButtonElement>) => {
          navigate("/map", {state: {mode: "submission"}});
        }}>See Guesses</button>
      <button className="fixed bottom-10 rounded-md bg-blue-500 px-4 py-2 text-xl font-semibold text-white opacity-100 focus:outline-none"
        onClick={async (event: React.MouseEvent<HTMLButtonElement>) => {
          navigate("/create_game");
        }}>Create Game</button>
    </div>
  );
};

export default Leaderboard;