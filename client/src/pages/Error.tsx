export function Error() {
    return (
        <div className="p-2 flex gap-25 h-screen w-screen" style={{ backgroundColor: "#EAE8DD" }}>
            <div>
                <h1 className="text-9xl font-bold text-black">Oops!</h1>
                <p className="pt-6 text-black">We can't seem to find the page you're looking for. Please try again.</p>
            </div>
        </div>
    )
}
