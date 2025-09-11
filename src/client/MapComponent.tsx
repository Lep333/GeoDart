import React, { useEffect, useRef } from "react";
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
      console.log("Lat:", e.latlng.lat, "Lng:", e.latlng.lng);
      latitude = e.latlng.lat;
      longitude = e.latlng.lng;

      marker
        .bindPopup(
          `Lat: ${e.latlng.lat.toFixed(5)}<br>Lng: ${e.latlng.lng.toFixed(5)}`
        )
        .openPopup();
    });
    map.addEventListener
      // Cleanup on unmount
      return () => {
        map.remove();
      };
  }, []);

  async function fetchAndAddMarker() {
    try {
      const response = await fetch('/api/og_position'); // your backend endpoint
      if (!response.ok) throw new Error("Failed to fetch location");

      const data: PositionResponse = await response.json();
      const lat = data.latitude;
      const lng = data.longitude;

      if (mapRef.current) {
        const marker = L.marker([lat, lng]).addTo(mapRef.current);
        marker.bindPopup(`Lat: ${lat}, Lng: ${lng}`).openPopup();

        // Optional: pan to new marker
        mapRef.current.setView([lat, lng], 6);
      }
    } catch (err) {
      console.error("Error fetching location:", err);
    }
  }

  return (
    <div>
      <div
        id="map"
        className="z-10"
        style={{ height: "100vh", width: "100%" }}
      />
      <div className="fixed bottom-10 z-20 w-full flex justify-center">
        <button
          className="rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white opacity-100 focus:outline-none"
          onClick={ fetchAndAddMarker }
        >Place Dart</button>
      </div>
    </div>
  );
};

export default MapComponent;
