import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import type { RootState } from "../../store/store";
import { selectCountry } from "../../store/mapSlice";
import Map from "../../components/Map";
import { Scoreboard } from "../../components/Scoreboard";
import { calculateRoundScore } from "../../utils/scoring";
import { useAudio } from "../../hooks/useAudio";
import type { GameMode } from "../../types";

interface SoloGameProps {
    gameMode: GameMode;
    onGameOver: (finalScore: number) => void;
}

export function SoloGame({ gameMode, onGameOver }: SoloGameProps) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const selectedCountry = useSelector(
        (state: RootState) => state.map.selectedCountry
    );

    const [soloScore, setSoloScore] = useState(0);
    const [soloRound, setSoloRound] = useState(1);
    const [hasGuessed, setHasGuessed] = useState(false);
    const [usedCountries, setUsedCountries] = useState<string[]>([]);
    const soloTotalRounds = 5;
    const audioRef = useRef<HTMLAudioElement | null>(null);

    const { data, isLoading, error } = useAudio({ usedCountries, gameMode });

   useEffect(() => {
        if (data?.audioUrl) {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
            audioRef.current = new Audio(data.audioUrl);
            audioRef.current.play();
        }
    }, [data?.audioUrl]);

     const handleReplayAudio = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play();
        }
    };

    const handleSubmitGuess = () => {
        if (!selectedCountry) return;

        const roundScore = calculateRoundScore(0, 0);
        setSoloScore(soloScore + roundScore);
        setHasGuessed(true);
    };

    const handleNextRound = () => {
        if (soloRound === soloTotalRounds) {
            onGameOver(soloScore);
        } else {
            setSoloRound(soloRound + 1);
            dispatch(selectCountry(null));
            setHasGuessed(false);
                    if (data?.countryCode) {
            setUsedCountries(prev => [...prev, data.countryCode]);
        }
        }
    };

    const modeLabel = gameMode === "language" ? "Language" : "Accents";
    const modeHint = gameMode === "language"
        ? "Listen to the sentence and guess which country the language comes from."
        : "Listen to the audio clip and click on the map to guess the origin.";

    return (
        <div className="h-screen w-screen" style={{ backgroundColor: "#EAE8DD" }}>
            <div className="p-6">
                {/* Back button */}
                <button
                    onClick={() => navigate("/")}
                    className="mb-4 p-2 rounded-md text-white font-semibold transition duration-300 ease-in-out transform hover:scale-105"
                    style={{ backgroundColor: "#DA4F49" }}
                >
                    ← Back
                </button>

                <h2 className="text-3xl font-bold mb-2 text-black">Solo Play — {modeLabel}</h2>
                <p className="text-black mb-4">
                    {modeHint}
                </p>

                <div className="relative rounded-xl overflow-hidden h-[70vh] mb-4">
                    <Map disabled={hasGuessed} />

                    {/* Solo Scoreboard overlay */}
                    <div className="absolute top-4 right-4 z-1000">
                        <Scoreboard
                            title="Score"
                            round={soloRound}
                            totalRounds={soloTotalRounds}
                        >
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between px-3 py-2 rounded-lg bg-white/10 text-white text-sm">
                                    <span className="font-semibold">Score:</span>
                                    <span className="font-mono font-bold">{soloScore}</span>
                                </div>
                            </div>
                        </Scoreboard>
                    </div>

                    {/* Audio controls */}
                    <div className="absolute bottom-4 left-4 z-1000 flex gap-2">
                        <button
                            onClick={handleReplayAudio}
                            disabled={isLoading || !data?.audioUrl}
                            className="px-4 py-2 rounded-lg font-semibold text-white transition hover:scale-105 transform disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: "#DA4F49" }}
                        >
                            {isLoading ? "Loading..." : "🔊 Replay"}
                        </button>
                        {error && <p className="text-red-500 text-sm self-center">Failed to load audio</p>}
                    </div>

                    {/* Submit guess / Next round button */}
                    {hasGuessed ? (
                        <button
                            onClick={handleNextRound}
                            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-lg font-semibold text-white transition hover:scale-105 transform"
                            style={{ backgroundColor: "#DA4F49" }}
                        >
                            Next Round
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmitGuess}
                            disabled={!selectedCountry}
                            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-lg font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transform"
                            style={{ backgroundColor: "#DA4F49" }}
                        >
                            Submit Guess
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}