import React, { useEffect, useRef, useState, useContext } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix default marker icon issue when bundling
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadowUrl from "leaflet/dist/images/marker-shadow.png";

import { useNavigate, useLocation } from "react-router-dom";
import { useCounter } from './hooks/useCounter';
import { PositionResponse } from "../shared/types/api";
import { useTimer } from "./TimerContext";
import dart from "/dart.svg";
import { AppContext } from "./AppContext";

type DartLabel = {
  marker: L.Marker;
  zoom: number;
};

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
  const dartLabelsRef = useRef<DartLabel[]>([]);
  const app = useContext(AppContext);

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

    const dartIcon = L.icon({
        iconUrl: dart,
        iconSize: [40,40],
        iconAnchor: [40,40],
    });
    if (app?.latitude && app.longitude) {
      marker = L.marker(L.latLng(app.latitude, app.longitude), {icon: dartIcon}).addTo(map);
    }

    // Add click handler
    map.on("click", (e) => {
      if (showScoreRef.current || placePinRef.current) {
        return;
      }
      if (marker) {
        map.removeLayer(marker);
      }

      marker = L.marker(e.latlng, {icon: dartIcon}).addTo(map);
      guess.current = marker;
      latitude = e.latlng.lat;
      longitude = e.latlng.lng;
      app?.setLatitude(latitude);
      app?.setLongitude(longitude);
    });

    map.on("zoomend", () => {
      const zoom = map.getZoom();
      console.log(dartLabelsRef.current);
      dartLabelsRef.current.forEach((labelObj) => {
        const el = (labelObj as any).marker.getElement()?.querySelector(".dart-label-inner") as HTMLElement;
        if (!el) return;

        // Show/hide based on zoom
        if (zoom < labelObj.zoom) {
          el.style.display = "none";
        } else {
          el.style.display = "block";
        }

        // Scale dynamically
        const scale = Math.pow(1.1, zoom - 10); // adjust formula as needed
        el.style.transform = `scale(${scale})`;
      });
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
      const latitude = app?.latitude;
      let longitude = app?.longitude;
      longitude = L.Util.wrapNum(longitude!, [-180, 180]);
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
      console.log(`distance ${data.distance} score ${data.score}`);
      setShowScore(true);
      if (mapRef.current) {
        // const marker = L.marker([lat, lng], {icon: targetIcon}).addTo(mapRef.current);

        const bounds = L.latLngBounds([
          L.latLng(latitude!, longitude),
          [lat, lng],
        ]);
        mapRef.current.fitBounds(bounds, { padding: [50, 50] });
        const center = [lat, lng]; // your target location

        const RINGS = [
          { radius: 3000000, color: "#ff0000", fill: "#ff0000", points: "1", offset: 30000, zoom: 3 }, // 3000 km
          { radius: 2500000, color: "#ffffff", fill: "#ffffff", points: "500", offset: 30000, zoom: 3 }, // 2500 km
          { radius: 2000000, color: "#ff0000", fill: "#ff0000", points: "1000", offset: 30000, zoom: 3 }, // 2000 km
          { radius: 1500000, color: "#ffffff", fill: "#ffffff", points: "1500", offset: 30000, zoom: 3 }, // 1500 km
          { radius: 1000000, color: "#ff0000", fill: "#ff0000", points: "2000", offset: 30000, zoom: 3 }, // 1000 km
          { radius:  500000, color: "#ffffff", fill: "#ffffff", points: "2500", offset: 30000, zoom: 3 }, //  500 km
          { radius:  100000, color: "#ff0000", fill: "#ff0000", points: "2900", offset:  10000, zoom: 6 }, //  100 km
          { radius:   50000, color: "#ffffff", fill: "#ffffff", points: "2950", offset:  8000, zoom: 7 }, //   50 km
          { radius:    1000, color: "#ff0000", fill: "#ff0000", points: "3000", offset:  1000, zoom: 13 }, //    1 km
        ];
        RINGS.forEach(ring => {
          L.circle(center, {
            radius: ring.radius,
            color: ring.color,
            weight: 2,
            fillColor: ring.fill,
            fillOpacity: 0.0
          }).addTo(mapRef.current!)
        // Decide if label should be permanent

        // Offset beyond ring to place label
        const labelPos = destinationPoint(lat, lng, ring.radius, 180);

        // Create DivIcon label
        const label = L.marker([labelPos.lat, labelPos.lng], {
          icon: L.divIcon({
            className: "inline-block transform -translate-x-1/2",
            html: `<div class="dart-label-inner">${ring.points}</div>`,
            iconAnchor: [0, 30],
            iconSize: undefined,
          }),
          interactive: false,
        });
        
        label.addTo(mapRef.current!);
        dartLabelsRef.current.push({ marker: label, zoom: ring.zoom });
        });
        console.log(dartLabelsRef);
      }
    } catch (err) {
      console.error("Error fetching location:", err);
    }
  }

  function destinationPoint(
    latDeg: number,
    lngDeg: number,
    distanceMeters: number,
    bearingDeg: number
  ): { lat: number; lng: number } {
    const R = 6371000; // mean Earth radius in meters

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const toDeg = (rad: number) => (rad * 180) / Math.PI;

    const φ1 = toRad(latDeg);
    const λ1 = toRad(lngDeg);
    const θ = toRad(bearingDeg);
    const δ = distanceMeters / R; // angular distance in radians

    const sinφ1 = Math.sin(φ1);
    const cosφ1 = Math.cos(φ1);
    const sinδ = Math.sin(δ);
    const cosδ = Math.cos(δ);
    const sinφ2 = sinφ1 * cosδ + cosφ1 * sinδ * Math.cos(θ);
    const φ2 = Math.asin(sinφ2);

    const y = Math.sin(θ) * sinδ * cosφ1;
    const x = cosδ - sinφ1 * sinφ2;
    const λ2 = λ1 + Math.atan2(y, x);

    // normalize lon to -180..+180
    const lng2 = ((toDeg(λ2) + 540) % 360) - 180;
    const lat2 = toDeg(φ2);

    return { lat: lat2, lng: lng2 };
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
        onClick={() => { navigate("/gallery", {state: {timerAlreadySet: true}}) }}
        hidden={showScore}
        ><img src="/chevron_backward_24dp_FFFFFF_FILL0_wght400_GRAD0_opsz24.svg" />
      </button>
      { showScore && <div className="fixed top-10 z-20 w-full flex justify-center">
        <div className="rounded-md bg-blue-500 px-4 py-2 text-3xl font-bold text-white opacity-85 focus:outline-none">
          {`${score} / 3000 Points`}
        </div>
      </div> }
      { showScore && <div className="fixed top-25 z-20 w-full flex justify-center">
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
