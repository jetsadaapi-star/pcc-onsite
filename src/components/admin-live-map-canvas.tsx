"use client";

import { CircleMarker, MapContainer, Popup, TileLayer } from "react-leaflet";
import type { AdminMapPoint } from "./admin-live-map";

type Cluster = {
  id: string;
  latitude: number;
  longitude: number;
  points: AdminMapPoint[];
};

const typeColors: Record<AdminMapPoint["type"], string> = {
  checkin: "#11835f",
  project: "#095aa4",
  trip: "#d97706"
};

function clusterPoints(points: AdminMapPoint[]) {
  const buckets = new Map<string, AdminMapPoint[]>();
  for (const point of points) {
    const key = `${Math.round(point.latitude * 50) / 50}:${Math.round(point.longitude * 50) / 50}`;
    buckets.set(key, [...(buckets.get(key) ?? []), point]);
  }

  return Array.from(buckets.entries()).map(([id, bucket]) => ({
    id,
    latitude: bucket.reduce((sum, point) => sum + point.latitude, 0) / bucket.length,
    longitude: bucket.reduce((sum, point) => sum + point.longitude, 0) / bucket.length,
    points: bucket
  })) satisfies Cluster[];
}

export function AdminLiveMapCanvas({ points }: { points: AdminMapPoint[] }) {
  const validPoints = points.filter((point) => Number.isFinite(point.latitude) && Number.isFinite(point.longitude));
  const clusters = clusterPoints(validPoints);
  const center = validPoints[0] ?? { latitude: 13.7563, longitude: 100.5018 };

  return (
    <div className="admin-live-map">
      <MapContainer center={[center.latitude, center.longitude]} zoom={validPoints.length ? 10 : 6} scrollWheelZoom={false}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {clusters.map((cluster) => {
          const first = cluster.points[0];
          const isCluster = cluster.points.length > 1;
          return (
            <CircleMarker
              key={cluster.id}
              center={[cluster.latitude, cluster.longitude]}
              radius={isCluster ? Math.min(26, 12 + cluster.points.length * 2) : 9}
              pathOptions={{
                color: isCluster ? "#0f766e" : typeColors[first.type],
                fillColor: isCluster ? "#14b8a6" : typeColors[first.type],
                fillOpacity: isCluster ? 0.42 : 0.78,
                weight: 2
              }}
            >
              <Popup>
                <div className="admin-map-popup">
                  <strong>{isCluster ? `${cluster.points.length} จุดในบริเวณนี้` : first.label}</strong>
                  {cluster.points.slice(0, 8).map((point) => (
                    <span key={point.id}>{point.label} · {point.subLabel}</span>
                  ))}
                </div>
              </Popup>
            </CircleMarker>
          );
        })}
      </MapContainer>
    </div>
  );
}
