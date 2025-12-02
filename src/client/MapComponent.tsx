import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issue when bundling
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadowUrl from "leaflet/dist/images/marker-shadow.png";

import { useNavigate, useLocation } from "react-router-dom";
import { useCounter } from './hooks/useCounter';
import { PositionResponse } from "../shared/types/api";
import { useTimer } from "./TimerContext";

const MapComponent: React.FC = () => {
  const navigate = useNavigate();
  const { getOGLocation } =  useCounter();
  const mapRef = useRef<L.Map | null>(null);
  const guess = useRef<L.Marker>(null);
  const [showScore, setShowScore] = useState(false);
  const [placePin, setPlacePin] = useState(false);
  const placePinRef = useRef(showScore);
  const showScoreRef = useRef(showScore);
  const [score, setScore] = useState(0);
  const [distance, setDistance] = useState(0);
  let latitude: number;
  let longitude: number;
  const { time } = useTimer();
  const location = useLocation();
  const mode: string = location.state?.mode ?? "default";

  useEffect(() => {
    showScoreRef.current = showScore;
  }, [showScore]);

  useEffect(() => {
    placePinRef.current = placePin;
  }, [placePin]);

  useEffect(() => {
    // Ensure map is only initialized once
    const map = L.map("map", {
      zoomControl: false,   // remove + / - buttons
      scrollWheelZoom: true, // allow zoom via mouse wheel
      touchZoom: true,   
    }).setView([20, 0], 2);
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
      if (showScoreRef.current || placePinRef.current) {
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

  useEffect(() => {
    if (time === 0) {
      fetchAndAddMarker();
    }
  }, [time]);

  async function fetchAndAddMarker() {
    if (mode == "submission") {
      return;
    }

    try {
      const latitude = guess.current?.getLatLng().lat;
      const longitude = guess.current?.getLatLng().lng;
      const body = JSON.stringify({
        latitude: latitude ?? null,
        longitude: longitude ?? null,
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
      console.log(`distance ${data.distance} score ${data.score}`);
      setShowScore(true);

      if (mapRef.current) {
        const marker = L.marker([lat, lng]).addTo(mapRef.current);

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

  return (
    <div className="flex relative flex-col justify-center items-center min-h-screen gap-4">
      { !showScore && <div 
        className="fixed top-10 z-50 min-w-[4rem] left-1/2 -translate-x-1/2 opacity-85 rounded-md bg-blue-500 px-2 py-2 text-white text-center font-semibold shadow-lg">
        { time }</div> }
      <div
        id="map"
        className="z-10"
        style={{ height: "100vh", width: "100%" }}
      />
      { showScore && <div className="fixed top-22 z-20 w-full flex justify-center">
        <div className="rounded-md bg-blue-500 px-4 py-2 text-3xl font-bold text-white opacity-85 focus:outline-none">
          {`${score} / 3000 Points`}
        </div>
      </div> }
      { showScore && <div className="fixed top-40 z-20 w-full flex justify-center">
        <div className="rounded-md bg-blue-500 px-4 py-2 text-lg font-bold text-white opacity-85 focus:outline-none">
          {`Distance: ${distance} km`}
        </div>
      </div> }
      <div className="fixed bottom-10 z-20 w-full flex justify-center">
        { !showScore && <button
          className="rounded-md bg-blue-500 px-6 py-3 text-white font-semibold shadow-lg"
          onClick={ () => { fetchAndAddMarker() } }
        >Place Dart</button>}
      </div>
      <div className="fixed bottom-10 z-20 flex flex-col gap-2 justify-center items-center items-stretch max-w-sm">
        { showScore && <button className="rounded-md bg-blue-500 px-4 py-2 text-xl font-semibold shadow-lg text-white opacity-100 focus:outline-none"
          onClick={async (event: React.MouseEvent<HTMLButtonElement>) => {
            navigate("/guess_map");
          }}>Other Guesses</button>
        }
        { showScore && <button
          className="rounded-md bg-blue-500 px-4 py-2 text-xl text-white font-semibold shadow-lg"
          onClick={ () => { navigate("/leaderboard") } }
        >Leaderboard</button>}
      </div>
    </div>
  );
};

export default MapComponent;
