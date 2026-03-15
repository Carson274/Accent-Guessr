import { useNavigate } from "react-router";

export function Error() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen w-screen" style={{ backgroundColor: "#EAE8DD" }}>
            <div className="flex flex-col items-center justify-center min-h-screen">
                <h1 className="text-9xl font-bold text-black logo text-center">Oops!</h1>
                <p className="pt-6 text-black">We can't seem to find what you're looking for.</p>
                <p className="text-black">You may have attempted to join a stale game, ran into a bug, or attempted to access and invalid URL.</p>
                <p className="text-black">Please return to the main menu.</p>
                <button
                        onClick={() => navigate("/")}
                        className="mt-6 left-2 p-2 rounded-md text-white font-semibold transition duration-300 ease-in-out transform hover:scale-105"
                        style={{ backgroundColor: "#DA4F49" }}
                >
                    Return to Main Menu
                </button>
            </div>
        </div>
    )
}
