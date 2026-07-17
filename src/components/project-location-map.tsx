"use client";

import { MapPin, Search } from "lucide-react";
import dynamic from "next/dynamic";
import { useState } from "react";

export type ProjectLocation = {
  latitude: number;
  longitude: number;
};

type ProjectLocationMapProps = {
  location: ProjectLocation | null;
  onLocationChange: (location: ProjectLocation) => void;
};

type LocationSearchResult = ProjectLocation & {
  id: string;
  label: string;
};

const ProjectLocationMapCanvas = dynamic(
  () => import("./project-location-map-canvas").then((mod) => mod.ProjectLocationMapCanvas),
  {
    ssr: false,
    loading: () => <div className="project-location-map-loading">กำลังโหลดแผนที่...</div>
  }
);

export function ProjectLocationMap(props: ProjectLocationMapProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LocationSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);

  async function searchLocation() {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length < 2) {
      setSearchError("กรุณาพิมพ์ชื่อสถานที่หรือที่อยู่อย่างน้อย 2 ตัวอักษร");
      setResults([]);
      return;
    }

    setSearching(true);
    setSearchError(null);

    try {
      const response = await fetch(`/api/locations/search?q=${encodeURIComponent(trimmedQuery)}`);
      const payload = await response.json() as { results?: LocationSearchResult[]; error?: string };
      if (!response.ok) throw new Error(payload.error || "ค้นหาสถานที่ไม่สำเร็จ");

      const nextResults = payload.results ?? [];
      setResults(nextResults);
      if (!nextResults.length) setSearchError("ไม่พบสถานที่ ลองเพิ่มชื่อถนน เขต/อำเภอ หรือจังหวัด");
    } catch (error) {
      setResults([]);
      setSearchError(error instanceof Error ? error.message : "ค้นหาสถานที่ไม่สำเร็จ");
    } finally {
      setSearching(false);
    }
  }

  function selectResult(result: LocationSearchResult) {
    props.onLocationChange({ latitude: result.latitude, longitude: result.longitude });
    setQuery(result.label);
    setResults([]);
    setSearchError(null);
  }

  return (
    <div className="project-location-map-shell">
      <div className="project-location-search">
        <div className="project-location-search-row">
          <Search aria-hidden="true" size={18} />
          <input
            aria-label="ค้นหาสถานที่บนแผนที่"
            autoComplete="off"
            onChange={(event) => {
              setQuery(event.target.value);
              setSearchError(null);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              event.preventDefault();
              void searchLocation();
            }}
            placeholder="ค้นหาชื่อสถานที่ ถนน เขต/อำเภอ หรือจังหวัด"
            type="search"
            value={query}
          />
          <button disabled={searching} onClick={() => void searchLocation()} type="button">
            {searching ? "กำลังค้นหา..." : "ค้นหา"}
          </button>
        </div>

        {results.length ? (
          <div className="project-location-search-results" role="listbox" aria-label="ผลการค้นหาสถานที่">
            {results.map((result) => (
              <button aria-selected="false" key={result.id} onClick={() => selectResult(result)} role="option" type="button">
                <MapPin aria-hidden="true" size={17} />
                <span>{result.label}</span>
              </button>
            ))}
          </div>
        ) : null}
        {searchError ? <div className="project-location-search-error" role="status">{searchError}</div> : null}
      </div>
      <ProjectLocationMapCanvas {...props} />
    </div>
  );
}
