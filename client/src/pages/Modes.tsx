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

            <div className="flex flex-col items-center gap-8">
                <h1 className="text-5xl font-bold text-black logo">Choose a Gamemode</h1>
                {roomCode && (
                    <p className="text-black/60 text-sm">
                        Room: <span className="font-mono font-bold tracking-widest text-black">{roomCode}</span>
                    </p>
                )}

                <div className="flex gap-6">
                    {/* Accents Mode */}
                    <button
                        onClick={() => handleSelectMode("accent")}
                        className="group flex flex-col items-center gap-4 rounded-2xl shadow-lg p-8 w-64 transition duration-300 ease-in-out transform hover:scale-105 cursor-pointer"
                        style={{ backgroundColor: "#DA4F49" }}
                    >
                        <span className="text-5xl">🗣️</span>
                        <h2 className="text-2xl font-bold text-white">Accents</h2>
                        <p className="text-white/80 text-sm text-center">
                            Listen to a word spoken with a real accent and guess the country of origin.
                        </p>
                    </button>

                    {/* Language Mode */}
                    <button
                        onClick={() => handleSelectMode("language")}
                        className="group flex flex-col items-center gap-4 rounded-2xl shadow-lg p-8 w-64 transition duration-300 ease-in-out transform hover:scale-105 cursor-pointer"
                        style={{ backgroundColor: "#DA4F49" }}
                    >
                        <span className="text-5xl">🌍</span>
                        <h2 className="text-2xl font-bold text-white">Language</h2>
                        <p className="text-white/80 text-sm text-center">
                            Listen to a sentence in a foreign language and guess which country it comes from.
                        </p>
                    </button>
                </div>
            </div>
        </div>
    );
}