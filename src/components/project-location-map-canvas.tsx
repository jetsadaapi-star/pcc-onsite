"use client";

import "leaflet/dist/leaflet.css";

import { divIcon, type Marker as LeafletMarker } from "leaflet";
import { useEffect } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";
import type { ProjectLocation } from "./project-location-map";

type ProjectLocationMapCanvasProps = {
  location: ProjectLocation | null;
  onLocationChange: (location: ProjectLocation) => void;
};

const defaultCenter: [number, number] = [13.7563, 100.5018];
const locationIcon = divIcon({
  className: "project-location-marker",
  html: '<span class="project-location-pin"><span></span></span>',
  iconAnchor: [18, 42],
  iconSize: [36, 44]
});

function MapInteraction({ onLocationChange }: Pick<ProjectLocationMapCanvasProps, "onLocationChange">) {
  useMapEvents({
    click(event) {
      onLocationChange({ latitude: event.latlng.lat, longitude: event.latlng.lng });
    }
  });

  return null;
}

function MapViewport({ location }: Pick<ProjectLocationMapCanvasProps, "location">) {
  const map = useMap();

  useEffect(() => {
    if (!location) return;
    map.setView([location.latitude, location.longitude], Math.max(map.getZoom(), 16), { animate: true });
  }, [location, map]);

  return null;
}

export function ProjectLocationMapCanvas({ location, onLocationChange }: ProjectLocationMapCanvasProps) {
  const center: [number, number] = location
    ? [location.latitude, location.longitude]
    : defaultCenter;

  return (
    <div className="project-location-map-canvas">
      <MapContainer center={center} zoom={location ? 16 : 6} scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapInteraction onLocationChange={onLocationChange} />
        <MapViewport location={location} />
        {location ? (
          <Marker
            draggable
            icon={locationIcon}
            position={[location.latitude, location.longitude]}
            eventHandlers={{
              dragend(event) {
                const marker = event.target as LeafletMarker;
                const position = marker.getLatLng();
                onLocationChange({ latitude: position.lat, longitude: position.lng });
              }
            }}
          />
        ) : null}
      </MapContainer>
    </div>
  );
}
