"use client";

import dynamic from "next/dynamic";

export type AdminMapPoint = {
  id: string;
  label: string;
  subLabel: string;
  latitude: number;
  longitude: number;
  type: "checkin" | "project" | "trip";
};

const AdminLiveMapCanvas = dynamic(() => import("./admin-live-map-canvas").then((mod) => mod.AdminLiveMapCanvas), {
  ssr: false,
  loading: () => <div className="empty">กำลังโหลดแผนที่...</div>
});

export function AdminLiveMap({ points }: { points: AdminMapPoint[] }) {
  return <AdminLiveMapCanvas points={points} />;
}
