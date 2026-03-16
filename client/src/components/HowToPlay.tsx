import { useState } from "react"
import HowTo1 from "../images/HowTo1.png"
import HowTo2 from "../images/HowTo2.png"

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
                    <div className="bg-white w-3/4 rounded-lg p-6 shadow-xl">
                        <button
                            className="justify-self-end text-white pl-2 pr-2 rounded-lg transition duration-300 ease-in-out transform hover:scale-105"
                            style={{ backgroundColor: "#DA4F49" }}
                            onClick={() => setOpen(false)}
                        >
                            X
                        </button>
                        <div className="flex flex-col items-center">
                            <h2 className="text-center font-semibold text-2xl logo">How to Play</h2>
                            <p className="pt-4 text-center">In this game, you will take turns taking guesses the country from where a specific accent originates, based on an audio clip played for you.</p>
                            <img className="max-w-sm max-h-sm mt-2 rounded-lg border-transparent" src={HowTo1}/>
                            <p className="pt-4 text-center">After you hear the audio clip, select a country on the map that you wish to make a guess for. Then, submit your guess and see how you did! Be the player with the most points at the end to claim victory!</p>
                            <img className="max-w-sm max-h-sm mt-2 rounded-lg border-transparent" src={HowTo2}></img>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}