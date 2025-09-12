import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issue when bundling
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadowUrl from "leaflet/dist/images/marker-shadow.png";

import { useNavigate } from "react-router-dom";
import { useCounter } from './hooks/useCounter';
import { PositionResponse } from "../shared/types/api";

const MapComponent: React.FC = () => {
  const navigate = useNavigate();
  const { getOGLocation } =  useCounter();
  const mapRef = useRef<L.Map | null>(null);
  const guess = useRef<L.Marker>(null);
  const [showScore, setShowScore] = useState(false);
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
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
    L.tileLayer("/api/osm/{z}/{x}/{y}.png", {
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
      if (showScore) {
        return;
      }
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

  async function fetchAndAddMarker() {
    try {
      const latitude = guess.current?.getLatLng().lat;
      const longitude = guess.current?.getLatLng().lng;
      const body = JSON.stringify({
        latitude: latitude,
        longitude: longitude,
      });
      const response = await fetch('/api/submit_dart_position', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
      });
      if (!response.ok) throw new Error("Failed to fetch location");

      const data: PositionResponse = await response.json();
      const lat = data.latitude;
      const lng = data.longitude;
      setDistance(data.distance);
      setScore(data.score);
      console.log(`distance ${distance} score ${score}`);
      setShowScore(true);

      if (mapRef.current) {
        const marker = L.marker([lat, lng]).addTo(mapRef.current);
        marker.bindPopup(`Lat: ${lat}, Lng: ${lng}`);

        // Optional: pan to new marker
        const bounds = L.latLngBounds([
          guess.current!.getLatLng(),
          marker!.getLatLng(),
        ]);
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
      }
    } catch (err) {
      console.error("Error fetching location:", err);
    }
  }

  function Scoreboard({show}: {show: boolean}) {
    if (!show) {
      return null;
    }
    return (
      <div>
        <div>{`Score: ${score}`}</div>
        <div>{`Distance: ${distance}`}</div>
      </div>
    );
  }

  return (
    <div>
      <Scoreboard show={showScore} />
      <div
        id="map"
        className="z-10"
        style={{ height: "100vh", width: "100%" }}
      />
      <div className="fixed bottom-10 z-20 w-full flex justify-center">
        { !showScore && <button
          className="rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white opacity-100 focus:outline-none"
          onClick={ fetchAndAddMarker }
        >Place Dart</button>}
      </div>
    </div>
  );
};

export default MapComponent;
