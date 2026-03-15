import { useNavigate } from "react-router";

interface SoloGameOverProps {
    finalScore: number;
    onPlayAgain: () => void;
}

export function SoloGameOver({ finalScore, onPlayAgain }: SoloGameOverProps) {
    const navigate = useNavigate();

    return (
        <div
            className="min-h-screen w-screen flex items-center justify-center"
            style={{ backgroundColor: "#EAE8DD" }}
        >
            <div className="text-center">
                <h2 className="text-5xl font-bold text-black mb-6">Game Over!</h2>
                <div
                    className="inline-block rounded-2xl p-8 mb-8"
                    style={{ backgroundColor: "#DA4F49" }}
                >
                    <p className="text-white text-lg mb-2">Final Score</p>
                    <p className="text-5xl font-bold text-white">{finalScore}</p>
                </div>
                <div className="flex gap-4 justify-center">
                    <button
                        onClick={onPlayAgain}
                        className="px-8 py-3 rounded-lg font-semibold text-white transition duration-300 ease-in-out transform hover:scale-105"
                        style={{ backgroundColor: "#DA4F49" }}
                    >
                        Play Again
                    </button>
                    <button
                        onClick={() => navigate("/")}
                        className="px-8 py-3 rounded-lg font-semibold text-white transition duration-300 ease-in-out transform hover:scale-105"
                        style={{ backgroundColor: "#555" }}
                    >
                        Quit
                    </button>
                </div>
            </div>
        </div>
    );
}