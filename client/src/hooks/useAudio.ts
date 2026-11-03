import { useQuery } from "@tanstack/react-query";
import { BACKEND_URL } from "../utils/constants";
import type { GameMode } from "../types";

interface AudioParams {
  usedCountries: string[];
  gameMode?: GameMode;
  enabled?: boolean;
}

interface AudioResponse {
  audioUrl: string;
  countryCode: string;
}

const fetchAudio = async ({ usedCountries, gameMode }: AudioParams): Promise<AudioResponse> => {
  const params = new URLSearchParams();

  if (usedCountries.length) {
    params.append("usedCountries", usedCountries.join(","));
  }

  const endpoint = gameMode === "language" ? "/language-audio" : "/audio";
  const response = await fetch(`${BACKEND_URL}${endpoint}?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message ?? "Failed to fetch audio");
  }

  const data: AudioResponse = await response.json();

  // The backend returns clip paths like "/clips/a-1f2e.mp3", served from the backend's origin.
  return { ...data, audioUrl: new URL(data.audioUrl, BACKEND_URL).href };
};

export const useAudio = (params: AudioParams) => {
  return useQuery({
    queryKey: ["audio", params.usedCountries, params.gameMode],
    queryFn: () => fetchAudio(params),
    enabled: params.enabled !== false,
    refetchOnWindowFocus: false,
  });
};