import { useSelector, useDispatch } from "react-redux";
import type { RootState } from "../store/store";
import { selectCountry } from "../store/mapSlice";
import { useState } from "react";
import { useParams, useNavigate, Navigate } from "react-router";
import { usePartySocket } from "../hooks/usePartySocket";
import { Lobby } from "../components/Lobby";
import { Scoreboard } from "../components/Scoreboard";
import Map from "../components/Map";

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

    // Only connect when we have a room code AND the player submitted their name
    const { gameState, connected, error, sendMessage } = usePartySocket(
        nameSubmitted ? roomCode ?? "" : "",
        nameSubmitted ? playerName : ""
    );

    // ── Solo play (no room code) ──────────────────────────────
    if (!roomCode) {
        return (
            <div className="h-screen w-screen" style={{ backgroundColor: "#EAE8DD" }}>
                <div className="p-6">
                    <h2 className="text-3xl font-bold mb-2 text-black">Solo Play</h2>
                    <p className="text-black">TBD — Solo gameplay coming soon.</p>
                </div>
            </div>
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
                className="min-h-screen w-screen flex items-center justify-center"
                style={{ backgroundColor: "#EAE8DD" }}
            >
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
                className="min-h-screen w-screen flex items-center justify-center"
                style={{ backgroundColor: "#EAE8DD" }}
            >
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
            className="min-h-screen w-screen flex"
            style={{ backgroundColor: "#EAE8DD" }}
        >
            {/* Main game area */}
            <div className="flex-1 p-6">
                {gameState.status === "playing" && (
                    <>
                        <h2 className="text-2xl font-bold mb-4 text-black">
                            Round {gameState.currentRound} / {gameState.totalRounds}
                        </h2>
                        <p className="text-black mb-4">
                            Listen to the audio clip and click on the map to guess the origin.
                        </p>
                        {/* Map component */}
                        <div className="rounded-xl overflow-hidden h-96 mb-4">
                            <Map />
                        </div>

                        {/* Submit guess button */}
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
                            className="mt-4 px-6 py-3 rounded-lg font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ backgroundColor: "#DA4F49" }}
                        >
                            Submit Guess
                        </button>
                    </>
                )}

                {gameState.status === "round-end" && (
                    <div className="flex flex-col items-center gap-4 pt-12">
                        <h2 className="text-3xl font-bold text-black">Round Complete!</h2>
                        <p className="text-black">
                            Round {gameState.currentRound} of {gameState.totalRounds}
                        </p>
                        {isHost && (
                            <button
                                onClick={() => sendMessage({ type: "next-round" })}
                                className="px-6 py-3 rounded-lg font-semibold text-white transition"
                                style={{ backgroundColor: "#DA4F49" }}
                            >
                                Next Round
                            </button>
                        )}
                        {!isHost && (
                            <p className="text-black animate-pulse">
                                Waiting for host to continue…
                            </p>
                        )}
                    </div>
                )}

                {gameState.status === "finished" && (
                    <div className="flex flex-col items-center gap-6 pt-12">
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

            {/* Scoreboard sidebar */}
            <div className="p-4">
                <Scoreboard
                    gameState={gameState}
                    currentPlayerId={currentPlayerId}
                />
            </div>
        </div>
    );
}