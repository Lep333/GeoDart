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

function createAvatarIcon(
  username: string,
  avatarUrl: string | null,
  avatarSize = 50
): L.DivIcon {
  const triangleSize = 8; // px (triangle height)
  const usernameHeight = 18; // estimated px height (depends on font; adjust if needed)
  const marginBetween = 6; // margin between username and avatar

  // Total icon height: username + margin + avatar + triangle
  const totalHeight = usernameHeight + marginBetween + avatarSize + triangleSize;
  const totalWidth = avatarSize; // username should not exceed this ideally (white-space: nowrap)

  // CSS variables inline so each icon can have its own size if you want
  const styleVars = `
    --avatar-size: ${avatarSize}px;
    --triangle-size: ${triangleSize}px;
    --triangle-offset: -${Math.round(triangleSize / 2)}px;
  `;

  // Escape values used in HTML? For simple cases this is fine; if username comes from user input,
  // you may wish to sanitize/escape. We keep it minimal for readability.
  const html = `
    <div class="leaflet-avatar-wrapper" style="${styleVars}; width:${totalWidth}px;">
      <div class="leaflet-avatar-username">${username}</div>
      <div class="leaflet-avatar-circle">
        ${
          avatarUrl
            ? `<img src="${avatarUrl}" class="leaflet-avatar-img" />`
            : `<div class="leaflet-avatar-emoji">🌍</div>`
        }
      </div>
    </div>
  `;

  return L.divIcon({
    html,
    className: "", // keep empty (we use wrapper class in HTML). Still respects .leaflet-div-icon CSS.
    iconSize: [totalWidth, totalHeight],
    // iconAnchor should point to the tip of the triangle, which is at the bottom center.
    // Set to [width/2, totalHeight - (triangleHalfAdjustment)]
    iconAnchor: [Math.round(totalWidth / 2), Math.round(totalHeight - 1)],
    popupAnchor: [0, -Math.round(totalHeight / 2)]
  });
}

const MapComponent: React.FC = () => {
  const navigate = useNavigate();
  const { getOGLocation } =  useCounter();
  const mapRef = useRef<L.Map | null>(null);
  const guess = useRef<L.Marker>(null);
  const [showScore, setShowScore] = useState(false);
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
      if (showScoreRef.current) {
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

  useEffect(() => {
    if (mode == "submission") {
      setUsersSubmissions();
    }
  }, [mode]);

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

  async function setUsersSubmissions() {
    try {
      if (mode == "submission") {
        const res = await fetch('/api/get_submissions');
        const players = await res.json();
        for (const player of players) {
          const userName = player[0];
          const lat = Number(player[1]);
          const long = Number(player[2]);
          const avatarURL = player[3];
          if (mapRef.current && userName == "") {
            const marker = L.marker([lat, long]).addTo(mapRef.current);
          } else if (mapRef.current && Number.isFinite(lat) && Number.isFinite(long)) {
            const avatarHtml = `
              <div class="avatar-marker">
                <img src="${avatarURL}" alt="${userName}" />
                <div class="username">${userName}</div>
              </div>
            `;
            const markerIcon = createAvatarIcon(userName, avatarURL, 35);
            const marker = L.marker([lat, long], {icon: markerIcon}).addTo(mapRef.current);
          }
        }
      }
    } catch (err) {
      console.error("Error fetching location:", err);
    }
  }

  if (mode == "submission") {
    return (
      <div>
        <div
          id="map"
          className="z-10"
          style={{ height: "100vh", width: "100%" }}
        />
        <div className="fixed bottom-25 z-20 w-full flex justify-center">
          <button className="rounded-md bg-blue-500 px-4 py-2 text-xl font-semibold text-white opacity-100 focus:outline-none"
            onClick={async (event: React.MouseEvent<HTMLButtonElement>) => {
              navigate("/leaderboard");
            }}>Leaderboard</button>
        </div>
        <div className="fixed bottom-10 z-20 w-full flex justify-center">
          <button className="rounded-md bg-blue-500 px-4 py-2 text-xl font-semibold text-white opacity-100 focus:outline-none"
            onClick={async (event: React.MouseEvent<HTMLButtonElement>) => {
              navigate("/create_game");
            }}>Create Game</button>
        </div>
      </div>
    );
  };

  return (
    <div>
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
      { showScore && <div className="fixed bottom-25 z-20 w-full flex justify-center">
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
      <div className="fixed bottom-10 z-20 w-full flex justify-center">
        { showScore && <button
          className="rounded-md bg-blue-500 px-6 py-3 text-white font-semibold shadow-lg"
          onClick={ () => { navigate("/leaderboard") } }
        >Leaderboard</button>}
      </div>
    </div>
  );
};

export default MapComponent;
