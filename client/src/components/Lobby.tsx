import type { GameState } from "../types";

interface LobbyProps {
    gameState: GameState;
    isHost: boolean;
    onStartGame: () => void;
}

export function Lobby({ gameState, isHost, onStartGame }: LobbyProps) {
    return (
        <div className="flex flex-col items-center justify-center gap-6 p-8">
            {/* Room code */}
            <div
                className="rounded-2xl shadow-lg px-10 py-6 text-center"
                style={{ backgroundColor: "#DA4F49" }}
            >
                <p className="text-sm text-white/80 uppercase tracking-widest mb-1">
                    Room Code
                </p>
                <p className="text-6xl font-extrabold tracking-[0.3em] text-white select-all">
                    {gameState.roomCode.toUpperCase()}
                </p>
            </div>

            {/* Player list */}
            <div
                className="rounded-xl shadow-md p-6 w-full max-w-sm"
                style={{ backgroundColor: "#DA4F49" }}
            >
                <h3 className="text-lg font-semibold mb-3 text-center text-white">
                    Players ({gameState.players.length})
                </h3>
                <ul className="space-y-2">
                    {gameState.players.map((player) => (
                        <li
                            key={player.id}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/15"
                        >
                            <span className="w-2 h-2 rounded-full bg-green-400" />
                            <span className="font-medium text-white">{player.name}</span>
                            {player.id === gameState.hostId && (
                                <span className="ml-auto text-xs bg-white/25 text-white px-2 py-0.5 rounded-full">
                                    Host
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            {/* Waiting / Start */}
            {isHost ? (
                <button
                    onClick={onStartGame}
                    disabled={gameState.players.length < 2}
                    className="px-6 py-3 rounded-lg font-semibold text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ backgroundColor: "#DA4F49" }}
                >
                    {gameState.players.length < 2
                        ? "Waiting for players…"
                        : "Start Game"}
                </button>
            ) : (
                <p className="text-black animate-pulse">
                    Waiting for host to start the game…
                </p>
            )}
        </div>
    );
}
