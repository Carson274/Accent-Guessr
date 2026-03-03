import { HowToPlay } from "../components/HowToPlay"

export function Home() {
    return (
        <>
            <div className="bg-orange-100 h-screen w-screen">
                <HowToPlay className="p-2 justify-self-end"/>
                <div className="text-6xl text-center font-bold">AccentGuessr</div>
            </div>
        </>
    )
}