import { useNavigate } from "react-router-dom";
import React, { useEffect, useRef, useState } from "react";
import { useCounter } from './hooks/useCounter';
import panzoom from '@panzoom/panzoom';
import { useTimer } from "./TimerContext";
import EarthLoader from "./LoadingScreen";

const Gallery: React.FC = () => {
  const { gallery } = useCounter();
  const navigate = useNavigate();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const { time, setTime } = useTimer();
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const el = imgRef.current;
    if (imgRef.current) {
      const controller = panzoom(imgRef.current, {
        maxZoom: 5,
        minZoom: 0.5,
        bounds: true,
        zoomSpeed: 0.065,
        boundsPadding: 0.1,
      });
      const onWheel = (e: WheelEvent) => {
        // prevent default scrolling so panzoom can handle it
        e.preventDefault();
        // controller.zoomWithWheel expects a WheelEvent
        (controller as any).zoomWithWheel(e);
      };

      // Listen with passive: false so preventDefault() works
      el!.addEventListener("wheel", onWheel, { passive: false });
    }
  }, [loading]);

  useEffect(() => {
    async function submitTimestamp() {
      const resp = await fetch('/api/submission_timestamp', {
        method: "POST",
      });
      
      if (resp.ok) {
        const data = await resp.json();

        setTime(data.seconds);
        setLoading(false);
      }
      // TODO: else go back to menu?
    }

    const img = new Image();
    img.src = gallery;
    submitTimestamp();
  }, []);

  useEffect(() => {
    if (time === 0) {
      navigate("/map");
    }
  }, [time]);

  if (loading) {
      return (<EarthLoader />);
  }

  return (
    <div className="relative flex h-screen w-screen overflow-hidden">
      <div className="fixed top-10 z-50 min-w-[4rem] left-1/2 -translate-x-1/2 rounded-md bg-blue-500 px-2 py-2 text-white text-center font-semibold shadow-lg">{ time }</div>
      {/* Panzoom target */}
      <img
        ref={imgRef}
        src={gallery}
        className="max-w-none max-h-none"
      />
      {/* Fixed button overlay */}
      <button
        className="fixed bottom-10 left-1/2 -translate-x-1/2 rounded-md bg-blue-500 px-6 py-3 text-white font-semibold shadow-lg"
        onClick={() => navigate("/map")}
      >
        Let’s guess...
      </button>
    </div>
  );
};

export default Gallery;