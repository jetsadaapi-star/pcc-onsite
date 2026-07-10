"use client";

import dynamic from "next/dynamic";

export type MapPoint = {
  id: string;
  label: string;
  latitude: number;
  longitude: number;
};

const MapCanvas = dynamic(() => import("./map-preview-canvas").then((mod) => mod.MapPreviewCanvas), {
  ssr: false,
  loading: () => <div className="empty">กำลังโหลดแผนที่...</div>
});

export function MapPreview({ points }: { points: MapPoint[] }) {
  return <MapCanvas points={points} />;
}
