import type { GameState, RoundResultEntry } from "../types";
import { Scoreboard } from "./Scoreboard";
import { getCountryNameFromCode } from "../utils/scoring";

interface MultiplayerScoreboardProps {
    gameState: GameState;
    currentPlayerId: string | null;
    roundResults?: RoundResultEntry[] | null;
    correctCountryCode?: string | null;
}

export function MultiplayerScoreboard({
    gameState,
    currentPlayerId,
    roundResults,
    correctCountryCode,
}: MultiplayerScoreboardProps) {
    const sorted = [...gameState.players].sort((a, b) => b.score - a.score);
    const correctCountryName = correctCountryCode
        ? getCountryNameFromCode(correctCountryCode)
        : null;

    return (
        <Scoreboard
            title={gameState.status === "finished" ? "Final Standings" : "Scoreboard"}
            round={gameState.currentRound}
            totalRounds={gameState.totalRounds}
        >
            {/* Round result breakdown — shown after everyone guesses */}
            {roundResults && roundResults.length > 0 && (
                <div className="mb-3 space-y-1 text-xs bg-white/10 rounded-lg px-3 py-2 text-white">
                    {correctCountryName && (
                        <div className="mb-1.5 font-semibold text-center text-white/90">
                            Answer: {correctCountryName}
                        </div>
                    )}
                    {roundResults
                        .slice()
                        .sort((a, b) => b.roundScore - a.roundScore)
                        .map((r) => (
                            <div key={r.playerId} className="flex justify-between gap-2">
                                <span className="truncate max-w-[100px]">{r.playerName}</span>
                                <span className="text-white/80 truncate max-w-[80px]">{r.countryGuess}</span>
                                <span className="font-mono font-bold shrink-0">+{r.roundScore}</span>
                            </div>
                        ))}
                </div>
            )}

            {/* Player scores */}
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
                                    title={player.hasGuessed ? "Guessed" : "Thinking…"}
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