"use client";

import { useEffect, useMemo, useState } from "react";

export type ProjectSearchOption = {
  id: string;
  code: string;
  name: string;
  customerName: string;
};

type RemoteResult = {
  keyword: string;
  projects: ProjectSearchOption[];
  searching: boolean;
  error: string | null;
};

export function useProjectSearch(initialProjects: ProjectSearchOption[], query: string) {
  const keyword = query.trim();
  const localProjects = useMemo(() => {
    if (!keyword) return initialProjects.slice(0, 10);
    const normalized = keyword.toLowerCase();
    return initialProjects.filter((project) => (
      [project.code, project.name, project.customerName].join(" ").toLowerCase().includes(normalized)
    )).slice(0, 10);
  }, [initialProjects, keyword]);
  const [remoteResult, setRemoteResult] = useState<RemoteResult>({
    keyword: "",
    projects: [],
    searching: false,
    error: null
  });

  useEffect(() => {
    if (keyword.length < 2) return;

    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      setRemoteResult({ keyword, projects: [], searching: true, error: null });
      try {
        const response = await fetch("/api/projects/search?q=" + encodeURIComponent(keyword), {
          signal: controller.signal
        });
        const payload = await response.json() as { projects?: ProjectSearchOption[]; error?: string };
        if (!response.ok) throw new Error(payload.error || "ค้นหาโครงการไม่สำเร็จ");
        setRemoteResult({ keyword, projects: payload.projects ?? [], searching: false, error: null });
      } catch (searchError) {
        if (controller.signal.aborted) return;
        setRemoteResult({
          keyword,
          projects: [],
          searching: false,
          error: searchError instanceof Error ? searchError.message : "ค้นหาโครงการไม่สำเร็จ"
        });
      }
    }, 250);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [keyword]);

  if (keyword.length < 2) return { projects: localProjects, searching: false, error: null };
  if (remoteResult.keyword !== keyword) return { projects: [], searching: true, error: null };
  return {
    projects: remoteResult.projects,
    searching: remoteResult.searching,
    error: remoteResult.error
  };
}
