import { useNavigate } from "react-router-dom";
import React, { useEffect, useRef } from "react";
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
  const guess = useRef<L.Marker>(null);
  let latitude: number;
  let longitude: number;

  useEffect(() => {
    // Ensure map is only initialized once
    const map = L.map("map").setView([20, 0], 2);
    mapRef.current = map;

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
      guess.current = marker;
      latitude = e.latlng.lat;
      longitude = e.latlng.lng;
    });
    map.addEventListener
      // Cleanup on unmount
      return () => {
        map.remove();
      };
  }, []);

  return (
    <div className="flex flex-col h-screen">
      <label htmlFor="image_input">Image</label>
      <input type="file" id="image_input" name="avatar" accept="image/png, image/jpeg" />
      <div
          id="map"
          className="flex-1 z-10"
          style={{ height: "100%", width: "100%" }}
      />
      <div className="z-20 w-full flex justify-center">
        <button
          className="rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white opacity-100 focus:outline-none"
          onClick={ console.log }
        >Submit Game</button>
      </div>
    </div>
  );
};

export default CreateGame;