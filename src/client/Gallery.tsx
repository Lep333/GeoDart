import { useNavigate, useLocation } from "react-router-dom";
import React, { useEffect, useRef, useState } from "react";
import { useCounter } from './hooks/useCounter';
import panzoom from '@panzoom/panzoom';
import { useTimer } from "./TimerContext";
import EarthLoader from "./LoadingScreen";

const Gallery: React.FC = () => {
  const { image0, image1, image2 } = useCounter();
  const navigate = useNavigate();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const { time, setTime } = useTimer();
  const [loading, setLoading] = useState<boolean>(true);
  const [images, setImages] = useState<string[]>([]);
  const [imageIndex, setImageIndex] = useState<number>(0);

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
  }, [loading, imageIndex]);

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
    submitTimestamp();
  }, []);

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
    if (time === 0) {
      navigate("/map");
    }
  }, [time]);

  if (loading) {
      return (<EarthLoader />);
  }

  return (
    <div className="relative flex h-screen w-screen overflow-hidden">
      <div className="fixed top-10 z-50 min-w-[4rem] left-1/2 -translate-x-1/2 opacity-85 rounded-md bg-blue-500 px-2 py-2 text-white text-center font-semibold shadow-lg">{ time }</div>
      <button
        className="
          fixed 
          top-1/2 -translate-y-1/2
          left-0                   
          z-50
          min-w-[2rem]
          h-1/7
          rounded-md bg-blue-500 p-2 /* use p-2 for equal padding */
          text-white text-center font-semibold shadow-lg
          opacity-85
        "
        onClick={() => { if (imageIndex > 0) setImageIndex(imageIndex - 1)}}
        hidden={imageIndex==0? true: false}
        ><img src="/chevron_backward_24dp_FFFFFF_FILL0_wght400_GRAD0_opsz24.svg" />
      </button>
      <button
        className="
          fixed 
          top-1/2 -translate-y-1/2
          right-0                   
          z-50
          h-1/7
          min-w-[2rem]
          rounded-md bg-blue-500 p-2 /* use p-2 for equal padding */
          text-white text-center font-semibold shadow-lg
          opacity-85
        "
        onClick={() => {if (imageIndex + 1 < images.length) setImageIndex(imageIndex + 1)} }
        hidden={imageIndex==images.length-1? true: false}
        ><img src="/chevron_right_24dp_FFFFFF_FILL0_wght400_GRAD0_opsz24.svg" />
      </button>
      {/* Panzoom target */}
      <img
        ref={imgRef}
        src={images[imageIndex]}
        className="max-w-none max-h-none"
      />
      {/* Fixed button overlay */}
      <button
        className="fixed bottom-10 left-1/2 -translate-x-1/2 rounded-md bg-blue-500 px-6 py-3 text-white font-semibold shadow-lg"
        onClick={() => navigate("/map")}
      >
        Map
      </button>
    </div>
  );
};

export default Gallery;