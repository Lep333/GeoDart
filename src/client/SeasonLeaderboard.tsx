import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LeaderboardResponse } from "../shared/types/api";
import { useCounter } from './hooks/useCounter';
import { getWebViewMode, requestExpandedMode } from '@devvit/web/client';

const Leaderboard: React.FC = () => {
  const navigate = useNavigate();
  const [leaderboard, setLeaderboard] = useState<LeaderboardResponse | null>(null);
  const { image0, image1, image2, author} = useCounter();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [images, setImages] = useState<string[]>([]);
  const [hasPlayed, setHasPlayed] = useState<boolean | null>(null);
  const [loading, setLoading] = useState<boolean | null>(true);
  const [imageIndex, setImageIndex] = useState<number>(0);

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
  
  return (
    <div className="flex w-full h-screen relative flex-col justify-center items-center gap-4 overflow-hidden">
      Hello
    </div>
  );
};

export default Leaderboard;