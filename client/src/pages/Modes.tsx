import { useNavigate, useSearchParams } from "react-router";

export function Modes() {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const roomCode = searchParams.get("room");

    const handleSelectMode = (mode: "accent" | "language") => {
        if (roomCode) {
            navigate(`/play/${roomCode}?mode=${mode}`);
        } else {
            navigate(`/play?mode=${mode}`);
        }
    };

    return (
        <div
            className="relative min-h-screen w-full flex items-center justify-center px-4 py-16"
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

            <div className="flex w-full flex-col items-center gap-6 sm:gap-8">
                <h1 className="text-4xl sm:text-5xl text-center font-bold text-black logo">Choose a Gamemode</h1>
                {roomCode && (
                    <p className="text-black/60 text-sm">
                        Room: <span className="font-mono font-bold tracking-widest text-black">{roomCode}</span>
                    </p>
                )}

                <div className="flex w-full flex-col items-center gap-4 sm:w-auto sm:flex-row sm:gap-6">
                    {/* Accents Mode */}
                    <button
                        onClick={() => handleSelectMode("accent")}
                        className="group flex flex-col items-center gap-3 sm:gap-4 rounded-2xl shadow-lg p-6 sm:p-8 w-full max-w-xs sm:w-64 transition duration-300 ease-in-out transform hover:scale-105 cursor-pointer"
                        style={{ backgroundColor: "#DA4F49" }}
                    >
                        <span className="text-5xl">🗣️</span>
                        <h2 className="text-2xl font-bold text-white">Accents</h2>
                        <p className="text-white/80 text-sm text-center">
                            Listen to a real person read a short passage in English and guess where they grew up.
                        </p>
                    </button>

                    {/* Language Mode */}
                    <button
                        onClick={() => handleSelectMode("language")}
                        className="group flex flex-col items-center gap-3 sm:gap-4 rounded-2xl shadow-lg p-6 sm:p-8 w-full max-w-xs sm:w-64 transition duration-300 ease-in-out transform hover:scale-105 cursor-pointer"
                        style={{ backgroundColor: "#DA4F49" }}
                    >
                        <span className="text-5xl">🌍</span>
                        <h2 className="text-2xl font-bold text-white">Language</h2>
                        <p className="text-white/80 text-sm text-center">
                            Listen to a sentence in a foreign language and guess which country it comes from.
                        </p>
                    </button>
                </div>

                <p className="text-black/50 text-xs text-center max-w-md">
                    Accent recordings from the{" "}
                    <a href="https://accent.gmu.edu" target="_blank" rel="noreferrer" className="underline">
                        Speech Accent Archive
                    </a>{" "}
                    (Weinberger &amp; Kelley, George Mason University), trimmed and used under{" "}
                    <a href="https://creativecommons.org/licenses/by-nc-sa/4.0/" target="_blank" rel="noreferrer" className="underline">
                        CC BY-NC-SA 4.0
                    </a>
                    .
                </p>
            </div>
        </div>
    );
}