import { useState } from "react";
import { useClickAway } from "@uidotdev/usehooks";
import HowTo1 from "../images/HowTo1.png";
import HowTo2 from "../images/HowTo2.png";

export function HowToPlay({ className }: { className: string }) {
    const [open, setOpen] = useState(false);

    const ref = useClickAway<HTMLDivElement>(() => {
        setOpen(false);
    });

    const handleOpenModal = () => {
        if (!open) {
            setOpen(true);
        }
    };

    return (
        <div className={className}>
            <button
                className="p-2 rounded-md text-white font-semibold transition duration-300 ease-in-out transform hover:scale-105"
                style={{ backgroundColor: "#DA4F49" }}
                onClick={handleOpenModal}
            >
                How to Play
            </button>

            {open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white w-3/4 rounded-lg p-6 shadow-xl" ref={ref}>
                        <button
                            className="justify-self-end text-white pl-2 pr-2 rounded-lg transition duration-300 ease-in-out transform hover:scale-105"
                            style={{ backgroundColor: "#DA4F49" }}
                            onClick={() => setOpen(false)}
                        >
                            X
                        </button>
                        <div>
                            <h2 className="text-center font-semibold text-2xl logo">How to Play</h2>
                            <div className="flex flex-row justify-center gap-10 mb-10">
                                <div className="flex flex-col items-center">
                                    <img className="w-120 mt-4 rounded-lg" src={HowTo1}/>
                                    <p className="pt-3 text-center w-96">In this game, you will take turns taking guesses of the country from where a specific accent or language originates. You will make these gusses based on an audio clip played for you.</p>
                                </div>
                                <div className="flex flex-col items-center">
                                    <img className="w-120 mt-4 rounded-lg" src={HowTo2}/>
                                    <p className="pt-3 text-center w-96">After you hear the audio clip, select a country on the map that you wish to make a guess for. Then, submit your guess and see how you did! Be the player with the most points at the end to claim victory!</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}