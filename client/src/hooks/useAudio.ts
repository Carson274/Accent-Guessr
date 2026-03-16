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

  return response.json();
};

export const useAudio = (params: AudioParams) => {
  return useQuery({
    queryKey: ["audio", params.usedCountries, params.gameMode],
    queryFn: () => fetchAudio(params),
    enabled: params.enabled !== false,
    refetchOnWindowFocus: false,
  });
};