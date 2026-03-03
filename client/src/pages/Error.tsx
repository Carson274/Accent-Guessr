export function Error() {
    return (
        <div className="p-2 flex gap-25 bg-orange-100 h-screen w-screen">
            <div>
                <h1 className="text-9xl font-bold">Oops!</h1>
                <p className="pt-6">We can't seem to find the page you're looking for. Please try again.</p>
            </div>
        </div>
    )
}
