"use client";

import dynamic from "next/dynamic";

export type ProjectLocation = {
  latitude: number;
  longitude: number;
};

type ProjectLocationMapProps = {
  location: ProjectLocation | null;
  onLocationChange: (location: ProjectLocation) => void;
};

const ProjectLocationMapCanvas = dynamic(
  () => import("./project-location-map-canvas").then((mod) => mod.ProjectLocationMapCanvas),
  {
    ssr: false,
    loading: () => <div className="project-location-map-loading">กำลังโหลดแผนที่...</div>
  }
);

export function ProjectLocationMap(props: ProjectLocationMapProps) {
  return <ProjectLocationMapCanvas {...props} />;
}
