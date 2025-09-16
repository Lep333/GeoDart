import { useNavigate } from "react-router-dom";
import React, { useEffect, useRef, useState } from "react";
import { useCounter } from './hooks/useCounter';
import panzoom from '@panzoom/panzoom';

const Gallery: React.FC = () => {
  const { gallery } = useCounter();
  const navigate = useNavigate();
  const imgRef = useRef<HTMLImageElement | null>(null);

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
  }, []);

  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-black">
      {/* Panzoom target */}
      <img
        ref={imgRef}
        src={gallery}
        alt="Where is this?"
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