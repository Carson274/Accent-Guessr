import type { GameState } from "../types";
import { Scoreboard } from "./Scoreboard";

interface MultiplayerScoreboardProps {
    gameState: GameState;
    currentPlayerId: string | null;
}

export function MultiplayerScoreboard({
    gameState,
    currentPlayerId,
}: MultiplayerScoreboardProps) {
    const sorted = [...gameState.players].sort((a, b) => b.score - a.score);

    return (
        <Scoreboard
            title={gameState.status === "finished" ? "Final Standings" : "Scoreboard"}
            round={gameState.currentRound}
            totalRounds={gameState.totalRounds}
        >
            <ul className="space-y-1.5">
                {sorted.map((player, idx) => (
                    <li
                        key={player.id}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                            player.id === currentPlayerId
                                ? "bg-white/25 font-semibold"
                                : "bg-white/10"
                        }`}
                    >
                        <div className="flex items-center gap-2 text-white">
                            <span className="w-4 text-right text-white/70">
                                {idx + 1}.
                            </span>
                            <span>{player.name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-white">
                            {gameState.status === "playing" && (
                                <span
                                    className={`w-2 h-2 rounded-full ${
                                        player.hasGuessed
                                            ? "bg-green-400"
                                            : "bg-white/30"
                                    }`}
                                    title={
                                        player.hasGuessed
                                            ? "Guessed"
                                            : "Thinking…"
                                    }
                                />
                            )}
                            <span className="font-mono">{player.score}</span>
                        </div>
                    </li>
                ))}
            </ul>
        </Scoreboard>
    );
}
