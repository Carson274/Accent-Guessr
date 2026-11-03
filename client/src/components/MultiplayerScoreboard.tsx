import type { GameState, RoundResultEntry } from "../types";
import { Scoreboard } from "./Scoreboard";
import { getCountryNameFromCode } from "../utils/scoring";
import { CORRECT_COLOR, GUESS_COLOR } from "../utils/constants";

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
                <div className="mb-3 space-y-2 rounded-lg bg-white p-3 text-black">
                    {correctCountryName && (
                        <div className="flex items-start gap-2 text-sm leading-snug">
                            <span className="mt-1 h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: CORRECT_COLOR }} />
                            <span className="text-black/60">Answer</span>
                            <span className="min-w-0 font-semibold break-words">{correctCountryName}</span>
                        </div>
                    )}
                    <div className="space-y-1 border-t border-black/10 pt-2 text-xs">
                        {roundResults
                            .slice()
                            .sort((a, b) => b.roundScore - a.roundScore)
                            .map((r) => {
                                const isMe = r.playerId === currentPlayerId;
                                const isRight = r.countryGuess === correctCountryName;
                                return (
                                    <div key={r.playerId} className={`flex items-center gap-2 ${isMe ? "font-semibold" : ""}`}>
                                        <span className="truncate max-w-[80px]">{isMe ? "You" : r.playerName}</span>
                                        <span
                                            className="truncate flex-1 text-right"
                                            style={{ color: isRight ? CORRECT_COLOR : GUESS_COLOR }}
                                        >
                                            {r.countryGuess}
                                        </span>
                                        <span className="font-mono font-bold shrink-0">+{r.roundScore.toLocaleString()}</span>
                                    </div>
                                );
                            })}
                    </div>
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