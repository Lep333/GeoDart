import { useNavigate } from "react-router-dom";
import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { showForm } from '@devvit/web/client';
import fx from 'glfx';
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

  function loadImage(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous"; // important for remote images
      img.src = url;
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(err);
    });
  }

  const MAX_WIDTH = 600;
  const MAX_HEIGHT = 400;

  function getScaledDimensions(imgWidth: number, imgHeight: number) {
    let width = imgWidth;
    let height = imgHeight;

    if (width > MAX_WIDTH) {
      height = (MAX_WIDTH / width) * height;
      width = MAX_WIDTH;
    }

    if (height > MAX_HEIGHT) {
      width = (MAX_HEIGHT / height) * width;
      height = MAX_HEIGHT;
    }

    return { width, height };
  }

  async function getBlurredBase64(url: string): Promise<string> {
    const img = await loadImage(url);

    // create a glfx canvas
    const fxCanvas = fx.canvas();
    const texture = fxCanvas.texture(img);

    // draw blurred version
    fxCanvas.draw(texture).lensBlur(50, 0.75, 0).update();

    // draw to our output canvas
    const output = document.getElementById("canvas") as HTMLCanvasElement;
    const { width, height } = getScaledDimensions(img.width, img.height);
    output.width = width;
    output.height = height;

    const ctx = output.getContext("2d")!;
    ctx.drawImage(fxCanvas, 0, 0, width, height);

    // export as base64
    const base64 = output.toDataURL("image/jpeg", 0.75);
    return base64;
  }

  async function createGame() {
    const latlng = location.current?.getLatLng();
    const latitude = latlng?.lat;
    const longitude = latlng?.lng;

    const base64 = await getBlurredBase64(imageURL!);

    const body = JSON.stringify({
      imageURL: imageURL,
      splashImage: base64,
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
      <canvas id="canvas"></canvas>
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