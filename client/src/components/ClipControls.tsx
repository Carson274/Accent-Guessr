import type { ClipPlayer } from "../hooks/useClipPlayer";

interface ClipControlsProps {
    player: ClipPlayer;
    isLoading: boolean;
    hasError: boolean;
}

const RED = "#DA4F49";

/**
 * Audio controls drawn over the map. Each round starts with a large play
 * button in the middle that covers the map until the clip is played; after
 * that, a small play/pause bar sits in the bottom-left corner.
 */
export function ClipControls({ player, isLoading, hasError }: ClipControlsProps) {
    if (hasError) {
        return (
            <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-black/30">
                <div className="rounded-xl bg-white px-6 py-4 text-center shadow-lg">
                    <p className="font-semibold text-black">Couldn't load this clip</p>
                    <p className="text-sm text-black/60">Try going back and starting a new game.</p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-black/30">
                <div className="rounded-full bg-white px-6 py-3 font-semibold text-black shadow-lg animate-pulse">
                    Loading clip…
                </div>
            </div>
        );
    }

    if (!player.started) {
        return (
            <div className="absolute inset-0 z-[1000] flex flex-col items-center justify-center gap-3 bg-black/30">
                <button
                    onClick={player.toggle}
                    aria-label="Play clip"
                    className="flex h-20 w-20 sm:h-24 sm:w-24 items-center justify-center rounded-full text-white shadow-xl transition hover:scale-110"
                    style={{ backgroundColor: RED }}
                >
                    <PlayIcon className="ml-1.5 h-10 w-10" />
                </button>
                <span className="rounded-full bg-white/90 px-4 py-1.5 text-sm font-semibold text-black shadow">
                    Press play to hear the clip
                </span>
            </div>
        );
    }

    return (
        <div className="absolute bottom-4 left-4 z-[1000] flex items-center gap-2 sm:gap-3 rounded-full bg-white px-2.5 sm:px-3 py-2 shadow-lg">
            <button
                onClick={player.toggle}
                aria-label={player.playing ? "Pause" : "Play"}
                className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full text-white transition hover:scale-105"
                style={{ backgroundColor: RED }}
            >
                {player.playing ? <PauseIcon className="h-5 w-5" /> : <PlayIcon className="ml-0.5 h-5 w-5" />}
            </button>
            <div className="h-1.5 w-14 sm:w-32 overflow-hidden rounded-full bg-black/10">
                <div
                    className="h-full rounded-full"
                    style={{ width: `${Math.round(player.progress * 100)}%`, backgroundColor: RED }}
                />
            </div>
            <button
                onClick={player.replay}
                aria-label="Replay from the start"
                title="Replay from the start"
                className="flex h-8 w-8 items-center justify-center rounded-full text-black/70 transition hover:bg-black/5"
            >
                <ReplayIcon className="h-5 w-5" />
            </button>
        </div>
    );
}

function PlayIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
            <path d="M7 4.5v15a1 1 0 0 0 1.52.85l12-7.5a1 1 0 0 0 0-1.7l-12-7.5A1 1 0 0 0 7 4.5Z" />
        </svg>
    );
}

function PauseIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
            <rect x="6" y="4.5" width="4" height="15" rx="1" />
            <rect x="14" y="4.5" width="4" height="15" rx="1" />
        </svg>
    );
}

function ReplayIcon({ className }: { className?: string }) {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
            <path d="M3 12a9 9 0 1 0 3-6.7" />
            <path d="M3 4v5h5" />
        </svg>
    );
}
