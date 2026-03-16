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
import type { GameMode } from "../types";

export function Play() {
    const dispatch = useDispatch();
    const { roomCode } = useParams<{ roomCode?: string }>();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const gameMode = (searchParams.get("mode") as GameMode) || "accent";

    // Multiplayer name entry state
    const [playerName, setPlayerName] = useState("");
    const [nameSubmitted, setNameSubmitted] = useState(false);
    const selectedCountry = useSelector(
        (state: RootState) => state.map.selectedCountry
    );

    const [finalScore, setFinalScore] = useState(0);

    // Only connect when we have a room code AND the player submitted their name
    const { gameState, connected, error, sendMessage } = usePartySocket(
        nameSubmitted ? roomCode ?? "" : "",
        nameSubmitted ? playerName : ""
    );

    // Determine current player's connection id
    const currentPlayerId =
        gameState?.players.find((p) => p.name === playerName)?.id ?? null;
    const isHost = currentPlayerId === gameState?.hostId;

    // Use gameMode from gameState when available (multiplayer), otherwise from query param
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

    // Host sends fetched audio URL to the server
    useEffect(() => {
        if (isHost && audioData?.audioUrl && audioData?.countryCode && gameState?.status === "playing" && !gameState?.audioUrl) {
            sendMessage({
                type: "set-audio",
                audioUrl: audioData.audioUrl,
                countryCode: audioData.countryCode,
            });
        }
    }, [isHost, audioData, gameState?.status, gameState?.audioUrl, sendMessage]);

    // All clients auto-play when audioUrl is set
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
                gameMode={gameMode}
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

    const modeLabel = activeGameMode === "language" ? "Language" : "Accents";
    const modeHint = activeGameMode === "language"
        ? "Listen to the sentence and guess which country the language comes from."
        : "Listen to the audio clip and click on the map to guess the origin.";

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
                    onStartGame={() => sendMessage({ type: "start-game", gameMode })}
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
                        {/* Back button */}
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
                        <p className="text-black mb-4">
                            {modeHint}
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

                            {/* Audio replay button */}
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

                            {/* Submit guess / Next round button */}
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