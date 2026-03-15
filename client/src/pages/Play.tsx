import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../store/store";
import { selectCountry } from "../store/mapSlice";
import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router";
import { usePartySocket } from "../hooks/usePartySocket";
import { SoloGame } from "./game/SoloGame";
import { SoloGameOver } from "./game/SoloGameOver";
import { Lobby } from "../components/Lobby";
import { MultiplayerScoreboard } from "../components/MultiplayerScoreboard";
import Map from "../components/Map";
import { useAudio } from "../hooks/useAudio";

export function Play() {
    const dispatch = useDispatch();
    const { roomCode } = useParams<{ roomCode?: string }>();
    const navigate = useNavigate();

    // Multiplayer name entry state
    const [playerName, setPlayerName] = useState("");
    const [nameSubmitted, setNameSubmitted] = useState(false);
    const selectedCountry = useSelector(
        (state: RootState) => state.map.selectedCountry
    );

    const [finalScore, setFinalScore] = useState(0);
    const [usedCountries, setUsedCountries] = useState<string[]>([]);
    const { data: audioData, isLoading: audioLoading } = useAudio({ usedCountries });

    const audioRef = useRef<HTMLAudioElement | null>(null);

    // Only connect when we have a room code AND the player submitted their name
    const { gameState, connected, error, sendMessage } = usePartySocket(
        nameSubmitted ? roomCode ?? "" : "",
        nameSubmitted ? playerName : ""
    );

    useEffect(() => {
        if (audioData?.audioUrl && gameState?.status === 'playing') {
            audioRef.current = new Audio(audioData.audioUrl);
            audioRef.current.play();
        }
    }, [audioData?.audioUrl, gameState?.status]);

    // ── Solo play (no room code) ──────────────────────────────
    if (!roomCode) {
        // Show game over screen
        if (finalScore > 0) {
            return (
                <SoloGameOver
                    finalScore={finalScore}
                    onPlayAgain={() => {
                        setFinalScore(0);
                    }}
                />
            );
        }

        // Show game screen
        return (
            <SoloGame
                onGameOver={(score) => {
                    setFinalScore(score);
                }}
            />
        );
    }

    // ── Validate room code (must be exactly 4 letters) ───────
    if (!/^[A-Za-z]{4}$/.test(roomCode)) {
        return <Navigate to="/" replace />;
    }

    // ── Multiplayer: name entry ───────────────────────────────
    if (!nameSubmitted) {
        return (
            <div
                className="relative min-h-screen w-screen flex items-center justify-center"
                style={{ backgroundColor: "#EAE8DD" }}
            >
                {/* Back button */}
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

    // ── Multiplayer: connecting… ──────────────────────────────
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

    // Determine current player's connection id
    const currentPlayerId =
        gameState.players.find((p) => p.name === playerName)?.id ?? null;
    const isHost = currentPlayerId === gameState.hostId;

    // ── Multiplayer: lobby (waiting) ──────────────────────────
    if (gameState.status === "waiting") {
        return (
            <div
                className="relative min-h-screen w-screen flex items-center justify-center"
                style={{ backgroundColor: "#EAE8DD" }}
            >
                {/* Back button */}
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
                    onStartGame={() => sendMessage({ type: "start-game" })}
                />
            </div>
        );
    }

    // ── Multiplayer: playing / round-end / finished ───────────
    return (
        <div
            className="min-h-screen w-screen"
            style={{ backgroundColor: "#EAE8DD" }}
        >
            {/* Main game area */}
            <div className="p-6">
                {(gameState.status === "playing" || gameState.status === "round-end") && (
                    <>
                        <h2 className="text-2xl font-bold mb-4 text-black">
                            Round {gameState.currentRound} / {gameState.totalRounds}
                        </h2>
                        <p className="text-black mb-4">
                            Listen to the audio clip and click on the map to guess the origin.
                        </p>
                        {/* Map + Scoreboard overlay container */}
                        <div className="relative rounded-xl overflow-hidden h-[70vh] mb-4">
                            <Map
                                disabled={
                                    gameState.status === "round-end" ||
                                    (gameState.players.find(
                                        (p) => p.id === currentPlayerId
                                    )?.hasGuessed ?? false)
                                }
                            />
                            {/* Scoreboard overlay */}
                            <div className="absolute top-4 right-4 z-[1000]">
                                <MultiplayerScoreboard
                                    gameState={gameState}
                                    currentPlayerId={currentPlayerId}
                                />
                            </div>
                            <div className="absolute top-4 left-4 z-[1000]">
                                <button
                                    onClick={() => { if (audioRef.current) { audioRef.current.currentTime = 0; audioRef.current.play(); } }}
                                    disabled={audioLoading || !audioData?.audioUrl}
                                    className="px-4 py-2 rounded-lg font-semibold text-white transition hover:scale-105 transform disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{ backgroundColor: "#DA4F49" }}
                                >
                                    {audioLoading ? "Loading..." : "🔊 Replay"}
                                </button>
                            </div>
                            {/* Submit guess / Next round button */}
                            {gameState.status === "round-end" ? (
                                isHost ? (
                                    <button
                                        onClick={() => {
                                            if (audioData?.countryCode) {
                                                setUsedCountries(prev => [...prev, audioData.countryCode]);
                                            }
                                            sendMessage({ type: "next-round" });
                                        }}
                                        className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-lg font-semibold text-white transition duration-300 ease-in-out transform hover:scale-105"
                                        style={{ backgroundColor: "#DA4F49" }}
                                    >
                                        Next Round
                                    </button>
                                ) : (
                                    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-lg font-semibold text-white animate-pulse"
                                        style={{ backgroundColor: "#DA4F49" }}
                                    >
                                        Waiting for host…
                                    </div>
                                )
                            ) : (
                                <button
                                    onClick={() => {
                                        if (selectedCountry) {
                                            sendMessage({
                                                type: "guess",
                                                lat: 0,
                                                lng: 0,
                                                round: gameState.currentRound,
                                            });
                                            dispatch(selectCountry(null));
                                        }
                                    }}
                                    disabled={
                                        !selectedCountry ||
                                        (gameState.players.find((p) => p.id === currentPlayerId)
                                            ?.hasGuessed ?? false)
                                    }
                                    className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[1000] px-6 py-3 rounded-lg font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed transition duration-300 ease-in-out transform hover:scale-105"
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
                        <div className="flex gap-4">
                            <button
                                onClick={() => navigate("/")}
                                className="px-6 py-3 rounded-lg font-semibold text-white transition"
                                style={{ backgroundColor: "#DA4F49" }}
                            >
                                Quit
                            </button>
                        </div>
                    </div>
                )}

                {error && (
                    <p className="text-red-700 mt-4 text-sm">Error: {error}</p>
                )}
            </div>
        </div>
    );
}