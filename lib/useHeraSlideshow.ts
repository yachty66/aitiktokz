import { useCallback, useState } from "react";

export interface HeraSlideshowData {
  images: string[];
  texts: string[];
  textBoxes: { x: number; y: number; widthPct: number }[];
  durations: number[];
  aspect: "1:1" | "4:5" | "3:4" | "9:16";
  prompt: string;
}

export interface HeraSlideshowPayload {
  title: string;
  num_slides: number;
  total_duration_sec: number;
  thumbnail_url: string | null;
  data: HeraSlideshowData;
}

interface UseHeraSlideshowOptions {
  endpoint?: string;
}

export function useHeraSlideshow(options: UseHeraSlideshowOptions = {}) {
  const { endpoint = "/api/hera/slideshow/generate" } = options;
  const [isHeraExporting, setIsHeraExporting] = useState(false);
  const [heraError, setHeraError] = useState<Error | null>(null);
  const [heraResponse, setHeraResponse] = useState<unknown>(null);

  const exportAsHera = useCallback(async (payload: HeraSlideshowPayload) => {
    setHeraError(null);
    setHeraResponse(null);
    setIsHeraExporting(true);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const isJson = res.headers.get("content-type")?.includes("application/json");
      const data = isJson ? await res.json() : await res.text();
      if (!res.ok) {
        throw new Error(typeof data === "string" ? data : data?.error || "Hera export failed");
      }
      setHeraResponse(data);
      return data;
    } catch (err) {
      const error = err instanceof Error ? err : new Error("Unknown error");
      setHeraError(error);
      throw error;
    } finally {
      setIsHeraExporting(false);
    }
  }, [endpoint]);

  return { isHeraExporting, heraError, heraResponse, exportAsHera } as const;
}


