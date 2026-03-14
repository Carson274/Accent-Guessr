import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import "leaflet/dist/leaflet.css"

interface MapViewProps {
    onGuess: (lat: number, lng: number) => void;
    disabled: boolean;
}

// Pass in some function to handle a click when the user presses on the map
function ClickHandler({ onGuess, disabled }: MapViewProps) {
    useMapEvents({
        click(e) {
            if (!disabled) {
                onGuess(e.latlng.lat, e.latlng.lng);
            }
        },
    });
    return null;
}

export function MapView({ onGuess, disabled }: MapViewProps) {
    return (
        <MapContainer
            center={[20, 0]}
            zoom={2}
            className="w-full h-96 rounded-xl"
            style={{ cursor: disabled ? "not-allowed" : "crosshair" }}
        >
            <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <ClickHandler onGuess={onGuess} disabled={disabled} />
        </MapContainer>
    );
}
