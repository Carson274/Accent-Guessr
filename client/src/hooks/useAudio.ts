import { useQuery } from "@tanstack/react-query";
import { BACKEND_URL } from "../utils/constants";

interface AudioParams {
  usedCountries: string[];
}

interface AudioResponse {
  audioUrl: string;
  countryCode: string;
}

const fetchAudio = async ({ usedCountries }: AudioParams): Promise<AudioResponse> => {
  const params = new URLSearchParams();

  if (usedCountries.length) {
    params.append("usedCountries", usedCountries.join(","));
  }

  const response = await fetch(`${BACKEND_URL}/audio?${params.toString()}`);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message ?? "Failed to fetch audio");
  }

  return response.json();
};

export const useAudio = (params: AudioParams) => {
  return useQuery({
    queryKey: ["audio", params],
    queryFn: () => fetchAudio(params),
    enabled: true,
    refetchOnWindowFocus: false,
  });
};