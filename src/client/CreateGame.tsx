import { useNavigate } from "react-router-dom";
import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { showForm } from '@devvit/web/client';

// Fix default marker icon issue when bundling
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadowUrl from "leaflet/dist/images/marker-shadow.png";

import { useCounter } from './hooks/useCounter';

const CreateGame: React.FC = () => {
  const navigate = useNavigate();
  const { getOGLocation } =  useCounter();
  const mapRef = useRef<L.Map | null>(null);
  const location = useRef<L.Marker | null>(null);
  const [imageURL, setURL] = useState<string | null>(null);
  let latitude: number;
  let longitude: number;

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

  async function createGame() {
    const latlng = location.current?.getLatLng();
    const latitude = latlng?.lat;
    const longitude = latlng?.lng;

    const body = JSON.stringify({
      imageURL: imageURL,
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

  async function uploadImage() {
    const result = await showForm({
      title: 'Picture Upload',
      fields: [
        {
          type: 'image',
          name: 'image',
          label: 'Please upload an image.',
          helpText: 'Please upload an image, where redditors should guess the location.',
          required: true,
        },
      ],
    });
    if (result.action == "SUBMITTED") {
      const {image} = result.values;
      setURL(image);
    }
  }

  return (
    <div className="flex flex-col">
      <div className="z-20 w-full flex justify-center">
        <h1 className="bg-blue-500 text-xl text-white">Create Game</h1>
      </div>
      <div className="fixed top-10 z-20 w-full flex justify-center">
        <button
          className="rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold text-white opacity-100 focus:outline-none"
          onClick={() => { uploadImage() }}>Upload Image
        </button>
      </div>
      <div
        id="map"
        className="z-10"
        style={{ height: "100vh", width: "100%" }}
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