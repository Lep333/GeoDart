import { useNavigate } from "react-router-dom";
import React, { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { navigateTo, showForm } from '@devvit/web/client';
import fx from 'glfx';
// Fix default marker icon issue when bundling
import iconUrl from "leaflet/dist/images/marker-icon.png";
import iconShadowUrl from "leaflet/dist/images/marker-shadow.png";

import { useCounter } from './hooks/useCounter';
import { showToast } from '@devvit/web/client';

const CreateGame: React.FC = () => {
  const navigate = useNavigate();
  const { getOGLocation } =  useCounter();
  const mapRef = useRef<L.Map | null>(null);
  const location = useRef<L.Marker | null>(null);
  const [imageURL, setURL] = useState<string | null>(null);
  let [latitude, setLatitude] = useState<number | null>(null);
  let [longitude, setLongitude] = useState<number | null>(null);

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
      if (location.current) {
        map.removeLayer(location.current);
      }
      marker = L.marker(e.latlng).addTo(map);
      location.current = marker;
      setLatitude(e.latlng.lat);
      setLongitude(e.latlng.lng);
    });
    map.addEventListener
      // Cleanup on unmount
      return () => {
        map.remove();
      };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (location.current) {
      map.removeLayer(location.current);
    }
    if (!latitude || !longitude) return;

    location.current = L.marker([latitude, longitude]).addTo(map);
    map.setView([latitude, longitude], map.getZoom());
  }, [latitude, longitude]);

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
    const base64 = await getBlurredBase64(imageURL!);

    const body = JSON.stringify({
      imageURL: imageURL,
      splashImage: base64,
      latitude: latitude,
      longitude: longitude,
    });

    const resp = await fetch('/api/create_geo_dart', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body,
    });
    if (resp.ok) {
      showToast('Geo Dart created successfully!');
      const { url } = await resp.json();
      navigateTo(url);
    } else {
      showToast('An error occured while creating Geo Dart :(');
    }
    // TODO: navigate to new post
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
    <div className="grid grid-cols-1">
      <canvas id="canvas" hidden></canvas>
      <div className="my-4 z-20 w-full flex justify-center">
        <button className="fixed left-2 z-30 rounded-md bg-blue-500 text-xl font-bold px-4 py-2 text-white" onClick={() => { navigate("/menu") }}>Back</button>
        <h1 className="rounded-md bg-blue-500 text-xl font-bold px-4 py-2 text-white">Create Game</h1>
      </div>
      <div className="flex flex-col justify-center rounded-md z-20 justify-center border-2 border-slate-500 my-2 mx-2">
        <div className="px-2 font-sans">Upload image(s) redditors shall find.</div>
        <div className="flex justify-center">
          <button
            className="rounded-md bg-blue-500 px-4 py-2 my-2 text-sm font-semibold opacity-100 focus:outline-none text-white"
            onClick={() => { uploadImage() }}>Upload Image
          </button>
        </div>
      </div>
      <div className="rounded-md justify-center border-2 border-slate-500 mx-2">
        <div className="px-2 font-sans">Select location on the map or enter coordinates.</div>
        <div className="grid grid-cols-3 px-2 my-2">
          <label className="col-span-1" htmlFor="latitude">Latitude:</label>
          <input className="col-span-2 px-2" type="text" name="latitude" value={latitude!} onChange={(e) => setLatitude(parseFloat(e.target.value))}/>
          <label className="col-span-1" htmlFor="longitude">Longitude:</label>
          <input className="col-span-2 px-2" type="text" name="longitude" value={longitude!} onChange={(e) => setLongitude(parseFloat(e.target.value))}/>
        </div>
        <div
          id="map"
          className="z-10"
          style={{ height: "50vh", width: "100%" }}
        />
      </div>
      <div className="fixed bottom-10 z-20 w-full flex justify-center">
        <button
          className="rounded-md bg-blue-500 px-4 py-2 text-sm font-semibold opacity-100 focus:outline-none text-white"
          onClick={ () => createGame() }
        >Create Game</button>
      </div>
    </div>
  );
};

export default CreateGame;