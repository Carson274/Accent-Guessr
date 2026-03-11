import { useState } from "react";
import Map from "../components/Map";

export function Play() {
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);

  return (
    <div className="bg-orange-100 h-screen w-screen">
      <div>Selected: {selectedCountry ?? "none"}</div>
      <Map selectedCountry={selectedCountry} onSelectCountry={setSelectedCountry} />
    </div>
  );
}