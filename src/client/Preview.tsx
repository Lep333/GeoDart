import React, { useEffect, useRef, useState } from "react";
import { useCounter } from './hooks/useCounter';
import { requestExpandedMode } from '@devvit/web/client';

const Preview: React.FC = () => {
  const { image0, image1, image2 } = useCounter();
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [images, setImages] = useState<string[]>([]);

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

//   if (loading) {
//       return (<EarthLoader />);
//   }

  return (
    <div className="relative flex h-screen w-screen overflow-hidden">
      <div className="fixed top-25 left-1/2 -translate-x-1/2 rounded-md bg-blue-500 text-3xl font-bold px-4 py-2 text-white z-20">Geo Dart</div>
      <div className="fixed top-50 left-1/2 -translate-x-1/2 rounded-md bg-blue-500 text-xl font-bold px-4 py-2 text-white z-20">Can you find the location?</div>
      <img
        ref={imgRef}
        src={images[0]}
        className="w-full h-full object-cover blur-sm"
      />
      <button
        className="fixed bottom-10 left-1/2 -translate-x-1/2 rounded-md bg-blue-500 px-6 py-3 text-white font-semibold shadow-lg z-20"
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