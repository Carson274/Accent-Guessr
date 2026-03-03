import { useState } from "react"

export function HowToPlay({ className }: {className: string}) {
    const [open, setOpen] = useState(false);
    
    return (
        <div className={className}>
            <button 
                className="border-red-700 border-2 p-2 rounded-md bg-red-500 transition duration-300 ease-in-out transform hover:scale-105" 
                onClick={() => setOpen(true)}
            >
                How to Play
            </button>

            {open && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-96 shadow-xl">
                        <button 
                            className="justify-self-end border-blue-500 border-1 bg-blue-300 pl-1 pr-1 text-blue-800 rounded-lg transition duration-300 ease-in-out transform hover:scale-105"
                            onClick={() => setOpen(false)}
                        >
                            X
                        </button>
                        <h2 className="text-center font-semibold">How to Play</h2>
                        <p className="text-center">TBD</p>
                    </div>
                </div>
            )}
        </div>
    )
}