import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../store/store";
import { selectCountry } from "../store/mapSlice";
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, useSearchParams, Navigate } from "react-router";
import { usePartySocket } from "../hooks/usePartySocket";
import { useAudio } from "../hooks/useAudio";
import { SoloGame } from "./game/SoloGame";
import { SoloGameOver } from "./game/SoloGameOver";
import { Lobby } from "../components/Lobby";
import { MultiplayerScoreboard } from "../components/MultiplayerScoreboard";
import Map from "../components/Map";
import { calculateRoundScore } from "../utils/scoring";
import type { GameMode } from "../types";

export function Play() {
    const dispatch = useDispatch();
    const { roomCode } = useParams<{ roomCode?: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const gameMode = (searchParams.get("mode") as GameMode) || "accent";

    const [playerName, setPlayerName] = useState("");
    const [nameSubmitted, setNameSubmitted] = useState(false);
    const selectedCountry = useSelector(
        (state: RootState) => state.map.selectedCountry
    );

    const [finalScore, setFinalScore] = useState(0);

    const { gameState, connected, error, sendMessage, lastRoundResults, lastRoundCorrectCode } = usePartySocket(
        nameSubmitted ? roomCode ?? "" : "",
        nameSubmitted ? playerName : ""
    );

    const currentPlayerId =
        gameState?.players.find((p) => p.name === playerName)?.id ?? null;
    const isHost = currentPlayerId === gameState?.hostId;

    const activeGameMode: GameMode = gameState?.gameMode ?? gameMode;

    // ── Audio for multiplayer (host fetches, shares with all) ──
    const shouldFetchAudio =
        isHost &&
        gameState?.status === "playing" &&
        !gameState?.audioUrl;

    const { data: audioData } = useAudio({
        usedCountries: gameState?.usedCountries ?? [],
        gameMode: activeGameMode,
        enabled: shouldFetchAudio,
    });

    useEffect(() => {
        if (isHost && audioData?.audioUrl && audioData?.countryCode && gameState?.status === "playing" && !gameState?.audioUrl) {
            sendMessage({
                type: "set-audio",
                audioUrl: audioData.audioUrl,
                countryCode: audioData.countryCode,
            });
        }
    }, [isHost, audioData, gameState?.status, gameState?.audioUrl, sendMessage]);

    // Clear round results tracking is now handled in usePartySocket via sync events

    const audioRef = useRef<HTMLAudioElement | null>(null);
    const lastPlayedUrl = useRef<string | null>(null);

    useEffect(() => {
        if (gameState?.audioUrl && gameState.audioUrl !== lastPlayedUrl.current) {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
            }
            audioRef.current = new Audio(gameState.audioUrl);
            audioRef.current.play();
            lastPlayedUrl.current = gameState.audioUrl;
        }
    }, [gameState?.audioUrl]);

    const handleReplayAudio = () => {
        if (audioRef.current) {
            audioRef.current.currentTime = 0;
            audioRef.current.play();
        }
    };

    // ── Solo play (no room code) ──────────────────────────────
    if (!roomCode) {
        if (finalScore > 0) {
            return (
                <SoloGameOver
                    finalScore={finalScore}
                    onPlayAgain={() => setFinalScore(0)}
                />
            );
        }
        return (
            <SoloGame
                gameMode={gameMode}
                onGameOver={(score) => setFinalScore(score)}
            />
        );
    }

    if (!/^[A-Za-z]{4}$/.test(roomCode)) {
        return <Navigate to="/" replace />;
    }

    // ── Name entry ────────────────────────────────────────────
    if (!nameSubmitted) {
        return (
            <div
                className="relative min-h-screen w-screen flex items-center justify-center"
                style={{ backgroundColor: "#EAE8DD" }}
            >
                <button
                    onClick={() => navigate("/")}
                    className="absolute top-2 left-2 p-2 rounded-md text-white font-semibold transition duration-300 ease-in-out transform hover:scale-105"
                    style={{ backgroundColor: "#DA4F49" }}
                >
                    ← Back
                </button>
                <div
                    className="rounded-2xl shadow-lg p-8 w-full max-w-sm flex flex-col gap-4"
                    style={{ backgroundColor: "#DA4F49" }}
                >
                    <h2 className="text-2xl font-bold text-center text-white">Join Room</h2>
                    <p className="text-center text-white/80 text-sm">
                        Room:{" "}
                        <span className="font-mono font-bold text-white text-lg tracking-widest">
                            {roomCode.toUpperCase()}
                        </span>
                    </p>
                    <input
                        type="text"
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value.slice(0, 20))}
                        placeholder="Enter your name"
                        maxLength={20}
                        className="px-4 py-3 rounded-lg border border-white/30 text-center bg-white/90 text-black focus:outline-none focus:ring-2 focus:ring-white/50"
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && playerName.trim()) {
                                setNameSubmitted(true);
                            }
                        }}
                    />
                    <button
                        onClick={() => setNameSubmitted(true)}
                        disabled={!playerName.trim()}
                        className="px-6 py-3 rounded-lg font-semibold text-white border-2 border-white/30 hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Join
                    </button>
                </div>
            </div>
        );
    }

    // ── Connecting ────────────────────────────────────────────
    if (!connected || !gameState) {
        return (
            <div
                className="min-h-screen w-screen flex items-center justify-center"
                style={{ backgroundColor: "#EAE8DD" }}
            >
                <div className="text-center">
                    <div className="text-xl font-semibold animate-pulse text-black">
                        Connecting to room {roomCode.toUpperCase()}…
                    </div>
                    {error && <p className="text-red-700 mt-2">{error}</p>}
                </div>
            </div>
        );
    }

    const modeLabel = activeGameMode === "language" ? "Language" : "Accents";
    const modeHint = activeGameMode === "language"
        ? "Listen to the sentence and guess which country the language comes from."
        : "Listen to the audio clip and click on the map to guess the origin.";

    // ── Lobby ─────────────────────────────────────────────────
    if (gameState.status === "waiting") {
        return (
            <div
                className="relative min-h-screen w-screen flex items-center justify-center"
                style={{ backgroundColor: "#EAE8DD" }}
            >
                <button
                    onClick={() => navigate("/")}
                    className="absolute top-2 left-2 p-2 rounded-md text-white font-semibold transition duration-300 ease-in-out transform hover:scale-105"
                    style={{ backgroundColor: "#DA4F49" }}
                >
                    ← Back
                </button>
                <Lobby
                    gameState={gameState}
                    isHost={isHost}
                    onStartGame={() => sendMessage({ type: "start-game", gameMode })}
                />
            </div>
        );
    }

    // ── Playing / round-end / finished ────────────────────────
    const currentPlayer = gameState.players.find((p) => p.id === currentPlayerId);
    const alreadyGuessed = currentPlayer?.hasGuessed ?? false;

    const handleSubmitGuess = () => {
        if (!selectedCountry || !gameState.countryCode) return;

        const { score } = calculateRoundScore(selectedCountry, gameState.countryCode);

        sendMessage({
            type: "guess",
            lat: 0,
            lng: 0,
            round: gameState.currentRound,
            countryGuess: selectedCountry,
            roundScore: score,
        });
        dispatch(selectCountry(null));
    };

    return (
        <div className="min-h-screen w-screen" style={{ backgroundColor: "#EAE8DD" }}>
            <div className="p-6">
                {(gameState.status === "playing" || gameState.status === "round-end") && (
                    <>
                        <button
                            onClick={() => navigate("/")}
                            className="mb-4 p-2 rounded-md text-white font-semibold transition duration-300 ease-in-out transform hover:scale-105"
                            style={{ backgroundColor: "#DA4F49" }}
                        >
                            ← Back
                        </button>

                        <h2 className="text-2xl font-bold mb-2 text-black">
                            Round {gameState.currentRound} / {gameState.totalRounds} — {modeLabel}
                        </h2>
                        <p className="text-black mb-4">{modeHint}</p>

                        <div className="relative rounded-xl overflow-hidden h-[70vh] mb-4">
                            <Map
                                disabled={
                                    gameState.status === "round-end" || alreadyGuessed
                                }
                            />

                            {/* Scoreboard overlay */}
                            <div className="absolute top-4 right-4 z-[1000]">
                                <MultiplayerScoreboard
                                    gameState={gameState}
                                    currentPlayerId={currentPlayerId}
                                    roundResults={gameState.status === "round-end" ? lastRoundResults : null}
                                    correctCountryCode={gameState.status === "round-end" ? lastRoundCorrectCode : null}
                                />
                            </div>

                            {/* Audio replay */}
                            <div className="absolute bottom-4 left-4 z-[1000] flex gap-2">
                                <button
                                    onClick={handleReplayAudio}
                                    disabled={!gameState.audioUrl}
                                    className="px-4 py-2 rounded-lg font-semibold text-white transition hover:scale-105 transform disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ backgroundColor: "#DA4F49" }}
                                >
                                    {!gameState.audioUrl && gameState.status === "playing" ? "Loading..." : "🔊 Replay"}
                                </button>
                            </div>

                            {/* Submit / Next round */}
                            {gameState.status === "round-end" ? (
                                isHost ? (
                                    <button
                                        onClick={() => sendMessage({ type: "next-round" })}
                                        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-lg font-semibold text-white transition duration-300 ease-in-out transform hover:scale-105"
                                        style={{ backgroundColor: "#DA4F49" }}
                                    >
                                        Next Round
                                    </button>
                                ) : (
                                    <div
                                        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-lg font-semibold text-white animate-pulse"
                                        style={{ backgroundColor: "#DA4F49" }}
                                    >
                                        Waiting for host…
                                    </div>
                                )
                            ) : (
                                <button
                                    onClick={handleSubmitGuess}
                                    disabled={!selectedCountry || alreadyGuessed || !gameState.countryCode}
                                    className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-lg font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed duration-300 ease-in-out transform hover:scale-105"
                                    style={{ backgroundColor: "#DA4F49" }}
                                >
                                    Submit Guess
                                </button>
                            )}
                        </div>
                    </>
                )}

                {gameState.status === "finished" && (
                    <div className="flex flex-col items-center justify-center gap-6 min-h-[80vh]">
                        <h2 className="text-4xl font-bold text-black">Game Over!</h2>
                        <MultiplayerScoreboard
                            gameState={gameState}
                            currentPlayerId={currentPlayerId}
                        />
                        <button
                            onClick={() => navigate("/")}
                            className="px-6 py-3 rounded-lg font-semibold text-white transition"
                            style={{ backgroundColor: "#DA4F49" }}
                        >
                            Quit
                        </button>
                    </div>
                )}

                {error && (
                    <p className="text-red-700 mt-4 text-sm">Error: {error}</p>
                )}
            </div>
        </div>
    );
}