"use client";

import "leaflet/dist/leaflet.css";

import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import type { MapPoint } from "./map-preview";

export function MapPreviewCanvas({ points }: { points: MapPoint[] }) {
  const validPoints = points.filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));
  const center = validPoints[0] ?? { latitude: 13.7563, longitude: 100.5018 };

  return (
    <div className="map-panel">
      <MapContainer center={[center.latitude, center.longitude]} zoom={validPoints.length ? 11 : 6} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {validPoints.map((point) => (
          <CircleMarker
            key={point.id}
            center={[point.latitude, point.longitude]}
            radius={9}
            pathOptions={{ color: "#095aa4", fillColor: "#095aa4", fillOpacity: 0.78 }}
          >
            <Popup>{point.label}</Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
