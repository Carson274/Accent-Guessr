import { useState } from "react"

export function HowToPlay({ className }: { className: string }) {
    const [open, setOpen] = useState(false);

    return (
        <div className={className}>
            <button
                className="p-2 rounded-md text-white font-semibold transition duration-300 ease-in-out transform hover:scale-105"
                style={{ backgroundColor: "#DA4F49" }}
                onClick={() => setOpen(true)}
            >
                How to Play
            </button>

            {open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
                        <button
                            className="justify-self-end text-white pl-2 pr-2 rounded-lg transition duration-300 ease-in-out transform hover:scale-105"
                            style={{ backgroundColor: "#DA4F49" }}
                            onClick={() => setOpen(false)}
                        >
                            X
                        </button>
                        <h2 className="text-center font-semibold text-black">How to Play</h2>
                        <p className="text-center text-black">TBD</p>
                    </div>
                </div>
            )}
        </div>
    )
}