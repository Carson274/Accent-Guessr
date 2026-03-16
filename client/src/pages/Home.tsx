import { useState } from "react";
import { useNavigate } from "react-router";
import { HowToPlay } from "../components/HowToPlay";

function generateRoomCode(): string {
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    let code = "";
    for (let i = 0; i < 4; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

export function Home() {
    const navigate = useNavigate();
    const [joinCode, setJoinCode] = useState("");

    const handleCreateRoom = () => {
        const code = generateRoomCode();
        navigate(`/modes?room=${code}`);
    };

    const handleJoinRoom = () => {
        const code = joinCode.trim().toUpperCase();
        if (code.length === 4) {
            // Join an existing room: go straight to the lobby.
            // The actual game mode will come from the host's selection on the server.
            navigate(`/play/${code}`);
        }
    };

    return (
        <div className="min-h-screen w-screen" style={{ backgroundColor: "#EAE8DD" }}>
            <HowToPlay className="p-2 justify-self-end" />
            <div className="flex flex-col items-center pt-12 gap-10">
                {/* Title */}
                <h1 className="text-8xl text-center font-bold text-black logo">Accent-Guessr</h1>

                {/* Solo Play */}
                <button
                    onClick={() => navigate("/modes")}
                    className="px-8 py-4 rounded-xl text-xl font-bold text-white shadow-lg transition duration-200 transform hover:scale-105"
                    style={{ backgroundColor: "#DA4F49" }}
                >
                    Play Solo
                </button>

                {/* Multiplayer Section */}
                <div
                    className="rounded-2xl shadow-md p-8 w-full max-w-sm flex flex-col gap-5"
                    style={{ backgroundColor: "#DA4F49" }}
                >
                    <h2 className="text-xl font-semibold text-center text-white">Multiplayer</h2>

                    {/* Create Room */}
                    <button
                        onClick={handleCreateRoom}
                        className="w-full px-4 py-3 rounded-lg font-semibold text-white border-2 border-white/30 hover:bg-white/10 transition duration-200 transform hover:scale-105"
                    >
                        Create Room
                    </button>

                    {/* Join Room */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={joinCode}
                            onChange={(e) =>
                                setJoinCode(e.target.value.toUpperCase().slice(0, 4))
                            }
                            placeholder="ABCD"
                            maxLength={4}
                            className="min-w-0 flex-1 px-4 py-3 rounded-lg border border-white/30 text-center text-lg tracking-widest font-mono uppercase bg-white/90 text-black focus:outline-none focus:ring-2 focus:ring-white/50"
                        />
                        <button
                            onClick={handleJoinRoom}
                            disabled={joinCode.trim().length !== 4}
                            className="px-5 py-3 rounded-lg font-semibold text-white border-2 border-white/30 hover:bg-white/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Join
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}