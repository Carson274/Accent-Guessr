import { useMemo, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import type { RootState } from "../../store/store";
import { selectCountry } from "../../store/mapSlice";
import Map from "../../components/Map";
import { ClipControls } from "../../components/ClipControls";
import { Scoreboard } from "../../components/Scoreboard";
import {
    calculateRoundScore,
    getCountryNameFromCode,
    type RoundScoreResult,
} from "../../utils/scoring";
import { useAudio } from "../../hooks/useAudio";
import { useClipPlayer } from "../../hooks/useClipPlayer";
import { CORRECT_COLOR, GUESS_COLOR } from "../../utils/constants";
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
    const [roundResult, setRoundResult] = useState<{
        correctCountryName: string | null;
        guessedCountryName: string | null;
        distanceKm: number | null;
        roundScore: number;
    } | null>(null);
    const soloTotalRounds = 5;

    const { data, isLoading, error } = useAudio({ usedCountries, gameMode });
    const player = useClipPlayer(data?.audioUrl ?? null);

    const mapResult = useMemo(
        () =>
            hasGuessed && roundResult
                ? { correctCountry: roundResult.correctCountryName, guessedCountry: roundResult.guessedCountryName }
                : null,
        [hasGuessed, roundResult]
    );

    const handleSubmitGuess = () => {
        if (!selectedCountry || !data?.countryCode) return;

        const result: RoundScoreResult = calculateRoundScore(
            selectedCountry,
            data.countryCode
        );

        const correctCountryName = getCountryNameFromCode(data.countryCode);

        setSoloScore((prev) => prev + result.score);
        setHasGuessed(true);
        setRoundResult({
            correctCountryName,
            guessedCountryName: selectedCountry,
            distanceKm: result.distanceKm,
            roundScore: result.score,
        });
    };

    const handleNextRound = () => {
        if (soloRound === soloTotalRounds) {
            onGameOver(soloScore);
        } else {
            setSoloRound(soloRound + 1);
            dispatch(selectCountry(null));
            setHasGuessed(false);
            setRoundResult(null);
            if (data?.countryCode) {
                setUsedCountries((prev) => [...prev, data.countryCode]);
            }
        }
    };

    const modeLabel = gameMode === "language" ? "Language" : "Accents";
    const modeHint = gameMode === "language"
        ? "Listen to the sentence and guess which country the language comes from."
        : "Listen to the speaker and click the country where you think they grew up.";

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
                    <Map disabled={hasGuessed} result={mapResult} />

                    {/* Play button / audio controls */}
                    <ClipControls player={player} isLoading={isLoading} hasError={!!error} />

                    {/* Solo Scoreboard overlay */}
                    <div className="absolute top-4 right-4 z-1000">
                        <Scoreboard
                            title="Score"
                            round={soloRound}
                            totalRounds={soloTotalRounds}
                        >
                            <div className="flex flex-col gap-2">
                                <div className="flex justify-between px-3 py-2 rounded-lg bg-white/10 text-white text-sm">
                                    <span className="font-semibold">Total score</span>
                                    <span className="font-mono font-bold">{soloScore.toLocaleString()}</span>
                                </div>
                                {hasGuessed && roundResult && (
                                    <RoundResultCard
                                        correctCountryName={roundResult.correctCountryName}
                                        guessedCountryName={roundResult.guessedCountryName}
                                        distanceKm={roundResult.distanceKm}
                                        roundScore={roundResult.roundScore}
                                    />
                                )}
                            </div>
                        </Scoreboard>
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

interface RoundResultCardProps {
    correctCountryName: string | null;
    guessedCountryName: string | null;
    distanceKm: number | null;
    roundScore: number;
}

/** The round's outcome, color-coded to match the map: green answer, red guess. */
function RoundResultCard({ correctCountryName, guessedCountryName, distanceKm, roundScore }: RoundResultCardProps) {
    const gotItRight = !!guessedCountryName && guessedCountryName === correctCountryName;

    return (
        <div className="rounded-lg bg-white p-3 text-black space-y-2">
            <div className="text-center">
                <div className="text-3xl font-bold" style={{ color: gotItRight ? CORRECT_COLOR : GUESS_COLOR }}>
                    +{roundScore.toLocaleString()}
                </div>
                <div className="text-xs text-black/60">
                    {gotItRight
                        ? "You got it!"
                        : distanceKm !== null
                            ? `${Math.round(distanceKm).toLocaleString()} km away`
                            : "points this round"}
                </div>
            </div>
            <div className="flex items-start gap-2 text-sm leading-snug">
                <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: CORRECT_COLOR }} />
                <span className="w-20 shrink-0 text-black/60">Answer</span>
                <span className="min-w-0 font-semibold break-words">{correctCountryName ?? "Unknown"}</span>
            </div>
            {!gotItRight && (
                <div className="flex items-start gap-2 text-sm leading-snug">
                    <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: GUESS_COLOR }} />
                    <span className="w-20 shrink-0 text-black/60">Your guess</span>
                    <span className="min-w-0 font-semibold break-words">{guessedCountryName}</span>
                </div>
            )}
        </div>
    );
}
