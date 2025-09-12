import { useNavigate } from "react-router-dom";
import React, { useEffect, useRef, useState } from "react";
import { showToast } from '@devvit/web/client';
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issue when bundling
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadowUrl from "leaflet/dist/images/marker-shadow.png";

import { useCounter } from './hooks/useCounter';

const CreateGame: React.FC = () => {
  const navigate = useNavigate();
  const { getOGLocation } =  useCounter();
  const mapRef = useRef<L.Map | null>(null);
  const location = useRef<L.Marker | null>(null);
  const [file, setFile] = useState<File | null>(null);
  let latitude: number;
  let longitude: number;

  useEffect(() => {
    // Ensure map is only initialized once
    const map = L.map("map").setView([20, 0], 2);
    mapRef.current = map;

    L.TileLayer.include({
      createTile: function(coords, done) {
        const tile = document.createElement("img");
        tile.alt = "";
        fetch(`/api/osm/${coords.z}/${coords.x}/${coords.y}.png`)
          .then(res => res.blob())
          .then(blob => {
            tile.src = URL.createObjectURL(blob);
            done(null, tile);
          })
          .catch(err => done(err, tile));
        return tile;
      }
    });

    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map);

    // Fix icon path for markers
    const defaultIcon = L.icon({
      iconUrl,
      shadowUrl: iconShadowUrl,
      iconSize: [25, 41],
      iconAnchor: [12, 41],
      popupAnchor: [1, -34],
      shadowSize: [41, 41],
    });
    L.Marker.prototype.options.icon = defaultIcon;

    let marker: L.Marker;

    // Add click handler
    map.on("click", (e) => {
      if (marker) {
        map.removeLayer(marker);
      }
      marker = L.marker(e.latlng).addTo(map);
      location.current = marker;
      latitude = e.latlng.lat;
      longitude = e.latlng.lng;
    });
    map.addEventListener
      // Cleanup on unmount
      return () => {
        map.remove();
      };
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]!);
    }
  };

  async function createGame() {
    const latlng = location.current?.getLatLng();
    const latitude = latlng?.lat;
    const longitude = latlng?.lng;

    const fileData = await file!.arrayBuffer();
    const base64 = btoa(String.fromCharCode(...new Uint8Array(fileData)));

    const body = JSON.stringify({
      image: base64,
      latitude,
      longitude,
    });
    fetch('/api/create_geo_dart', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
    });
    // TODO: navigate to new post and show toast
    navigate("/menu");
  }

  return (
    <div className="flex flex-col">
      <h1 className="bg-blue-500">Create Game</h1>
      <div>
        // TODO: upload on phones not working?
        <label className="bg-blue-500 border-4 border-indigo-500" htmlFor="image_input">Image</label>
        <input className="bg-blue-500" type="file" id="image_input" onChange={handleFileChange} name="image_input" accept="image/png, image/jpeg" />
      </div>
      <div
        id="map"
        className="z-10"
        style={{ height: "90vh", width: "100%" }}
      />
      <div className="fixed bottom-10 z-20 w-full flex justify-center">
        <button
          className="rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white opacity-100 focus:outline-none"
          onClick={ () => createGame() }
        >Create Game</button>
      </div>
    </div>
  );
};

export default CreateGame;