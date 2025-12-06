import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useCounter } from './hooks/useCounter';
import { requestExpandedMode } from '@devvit/web/client';
import EarthLoader from "./LoadingScreen";

const Preview: React.FC = () => {
  const navigate = useNavigate();
  const { image0, image1, image2, author} = useCounter();
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
    <div className="relative flex h-screen w-screen overflow-hidden">
      <div className="fixed top-10 left-1/2 -translate-x-1/2 rounded-md bg-blue-500 text-3xl font-bold px-4 py-2 text-white z-20">Geo Dart</div>
      { author && <div className="fixed top-25 left-1/2 -translate-x-1/2 rounded-md bg-blue-500 font-bold px-2 py-1 text-white z-20">{`by ${author}`}</div> }
      <div className="fixed top-40 left-1/2 -translate-x-1/2 rounded-md bg-blue-500 text-xl font-bold px-4 py-2 text-white text-center z-20">Can you find the location?</div>
      <img
        ref={imgRef}
        src={images[0]}
        className="w-full h-full object-cover"
      />
      <button
        className="fixed bottom-10 left-1/2 -translate-x-1/2 rounded-md bg-blue-500 text-xl px-4 py-2 text-white font-semibold shadow-lg z-20"
        onClick={async (event: React.MouseEvent<HTMLButtonElement>) => { 
            try {
              await requestExpandedMode(event.nativeEvent, 'game');
            } catch (error) {
              console.error('Failed to enter expanded mode:', error);
            }}}
      >
        Play!
      </button>
    </div>
  );
};

export default Preview;