import { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router";
import type { RootState } from "../../store/store";
import { selectCountry } from "../../store/mapSlice";
import Map from "../../components/Map";
import { Scoreboard } from "../../components/Scoreboard";
import { calculateRoundScore } from "../../utils/scoring";

interface SoloGameProps {
    onGameOver: (finalScore: number) => void;
}

export function SoloGame({ onGameOver }: SoloGameProps) {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const selectedCountry = useSelector(
        (state: RootState) => state.map.selectedCountry
    );

    const [soloScore, setSoloScore] = useState(0);
    const [soloRound, setSoloRound] = useState(1);
    const soloTotalRounds = 5;

    const handleSubmitGuess = () => {
        if (!selectedCountry) return;

        const roundScore = calculateRoundScore(0, 0);
        const newScore = soloScore + roundScore;
        setSoloScore(newScore);

        if (soloRound === soloTotalRounds) {
            // Game is over, call callback with final score
            onGameOver(newScore);
        } else {
            // Continue to next round
            setSoloRound(soloRound + 1);
            dispatch(selectCountry(null));
        }
    };

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

                <h2 className="text-3xl font-bold mb-2 text-black">Solo Play</h2>
                <p className="text-black mb-4">
                    Listen to the audio clip and click on the map to guess the origin.
                </p>

                <div className="relative rounded-xl overflow-hidden h-[70vh] mb-4">
                    <Map />

                    {/* Solo Scoreboard overlay */}
                    <div className="absolute top-4 right-4 z-[1000]">
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

                    {/* Submit guess button */}
                    <button
                        onClick={handleSubmitGuess}
                        disabled={!selectedCountry}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-lg font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transform"
                        style={{ backgroundColor: "#DA4F49" }}
                    >
                        Submit Guess
                    </button>
                </div>
            </div>
        </div>
    );
}