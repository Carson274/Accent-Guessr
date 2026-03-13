import type { GameState } from "../types";

interface ScoreboardProps {
    gameState: GameState;
    currentPlayerId: string | null;
}

export function Scoreboard({ gameState, currentPlayerId }: ScoreboardProps) {
    const sorted = [...gameState.players].sort((a, b) => b.score - a.score);

    return (
        <div
            className="rounded-xl shadow-lg p-4 w-64"
            style={{ backgroundColor: "#DA4F49" }}
        >
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/80 mb-3 text-center">
                {gameState.status === "finished" ? "Final Standings" : "Scoreboard"}
            </h3>

            <div className="text-xs text-center text-white/70 mb-2">
                Round {gameState.currentRound} / {gameState.totalRounds}
            </div>

            <ul className="space-y-1.5">
                {sorted.map((player, idx) => (
                    <li
                        key={player.id}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${player.id === currentPlayerId
                                ? "bg-white/25 font-semibold"
                                : "bg-white/10"
                            }`}
                    >
                        <div className="flex items-center gap-2 text-white">
                            <span className="w-4 text-right text-white/70">{idx + 1}.</span>
                            <span>{player.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-white">
                            {gameState.status === "playing" && (
                                <span
                                    className={`w-2 h-2 rounded-full ${player.hasGuessed ? "bg-green-400" : "bg-white/30"
                                        }`}
                                    title={player.hasGuessed ? "Guessed" : "Thinking…"}
                                />
                            )}
                            <span className="font-mono">{player.score}</span>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
}
