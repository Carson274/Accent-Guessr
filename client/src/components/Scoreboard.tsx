/**
 * General scoreboard component for displaying scores.
 * Used as a base for both solo and multiplayer scoreboards.
 */

interface ScoreboardProps {
    title?: string;
    round?: number;
    totalRounds?: number;
    children: React.ReactNode;
}

export function Scoreboard({
    title = "Scoreboard",
    round,
    totalRounds,
    children,
}: ScoreboardProps) {
    return (
        <div
            className="rounded-xl shadow-lg p-4 w-64"
            style={{ backgroundColor: "#DA4F49" }}
        >
            <h3 className="text-sm font-semibold uppercase tracking-wider text-white/80 mb-3 text-center">
                {title}
            </h3>

            {round !== undefined && totalRounds !== undefined && (
                <div className="text-xs text-center text-white/70 mb-2">
                    Round {round} / {totalRounds}
                </div>
            )}

            <div>{children}</div>
        </div>
    );
}