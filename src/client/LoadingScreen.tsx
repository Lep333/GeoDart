import { useEffect, useState } from "react";

export default function EarthLoader() {
  const earths = ["🌍", "🌎", "🌏"];
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % earths.length);
    }, 500); // change every 0.5s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen text-6xl">
      {earths[index]}
    </div>
  );
}