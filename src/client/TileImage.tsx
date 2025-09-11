import React, { useState, useEffect } from "react";

const TileImage: React.FC = () => {
  const [tileUrl, setTileUrl] = useState<string>("");

  useEffect(() => {
    // Example tile coordinates
    const z = 4;
    const x = 10;
    const y = 4;

    // Relative URL hits your Devvit proxy
    setTileUrl(`/api/osm/${z}/${x}/${y}.png`);
    fetch(`/api/osm/${z}/${x}/${y}.png`);
  }, []);

  return (
    <div>
      <h1>OSM Tile via Proxy</h1>
      {tileUrl ? (
        <img
          src={tileUrl}
          alt="OSM Tile"
          width={256}
          height={256}
          style={{ border: "1px solid #ccc" }}
          onLoad={() => console.log("Tile loaded!")}
          onError={(err) => console.error("Failed to load tile", err)}
        />
      ) : (
        <p>Loading tile...</p>
      )}
    </div>
  );
};

export default TileImage;