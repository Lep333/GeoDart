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
  avatarSize = 50,
  currUser: boolean,
): L.DivIcon {
  const triangleSize = 8; // px (triangle height)
  const usernameHeight = 18; // estimated px height (depends on font; adjust if needed)
  const marginBetween = 6; // margin between username and avatar

  // Total icon height: username + margin + avatar + triangle
  const totalHeight = usernameHeight + marginBetween + avatarSize + triangleSize;
  const totalWidth = avatarSize; // username should not exceed this ideally (white-space: nowrap)
  let borderColour = currUser? "rgb(124 58 237)" :"rgb(59 130 246)";

  // CSS variables inline so each icon can have its own size if you want
  const styleVars = `
    --avatar-size: ${avatarSize}px;
    --triangle-size: ${triangleSize}px;
    --triangle-offset: -${Math.round(triangleSize / 2)}px;
    --border-colour: ${borderColour};
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

const GuessMap: React.FC = () => {
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
    map.addEventListener
      // Cleanup on unmount
      return () => {
        map.remove();
      };
  }, []);

  useEffect(() => {
    setUsersSubmissions();
  }, []);
  
  async function setUsersSubmissions() {
    try {
      setPlacePin(true);
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
          const markerIcon = createAvatarIcon(userName, avatarURL, 30, player[4]);
          const marker = L.marker([lat, long], {icon: markerIcon}).addTo(mapRef.current);
        }
      }
    } catch (err) {
      console.error("Error fetching location:", err);
    }
  }

  return (
    <div className="flex relative flex-col justify-center items-center min-h-screen gap-4">
      <div
          id="map"
          className="z-10"
          style={{ height: "100vh", width: "100%" }}
      />
      <div className="fixed bottom-10 z-20 flex flex-col gap-2 justify-center items-center items-stretch max-w-sm">
          <button className="rounded-md bg-blue-500 px-4 py-2 text-xl font-semibold text-white opacity-100 focus:outline-none"
          onClick={async (event: React.MouseEvent<HTMLButtonElement>) => {
              navigate("/leaderboard");
          }}>Leaderboard</button>
          <button className="rounded-md bg-blue-500 px-4 py-2 text-xl font-semibold text-white opacity-100 focus:outline-none"
          onClick={async (event: React.MouseEvent<HTMLButtonElement>) => {
              navigate("/create_game");
          }}>Create Game</button>
      </div>
    </div>
  );
};

export default GuessMap;
