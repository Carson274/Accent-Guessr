"use client";

import { useCallback, useState } from "react";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { Layer, LeafletMouseEvent } from "leaflet";
import type { Feature, GeoJsonObject } from "geojson";
import "leaflet/dist/leaflet.css";
import countriesData from "../data/countries.json";

// Color to show unclicked countries
const defaultStyle = {
  fillColor: "#3388ff",
  weight: 1,
  opacity: 1,
  color: "#3388ff",
  fillOpacity: 0.15,
};

// Color to show clicked countries
const highlightStyle = {
  fillColor: "#ff7800",
  weight: 2,
  opacity: 1,
  color: "#ff7800",
  fillOpacity: 0.45,
};

interface MapProps {
  selectedCountry: string | null;
  onSelectCountry: (country: string | null) => void;
}

// Implementation of the Map component using UseState, will need to eventually replace with Redux
export default function Map({ selectedCountry, onSelectCountry }: MapProps) {
  const [geoJsonKey, setGeoJsonKey] = useState(0);

  // Force re-render of GeoJSON layer when selection changes
  const onEachFeature = useCallback(
    (feature: Feature, layer: Layer) => {
      const countryName = feature.properties?.ADMIN as string;

      layer.on({
        click: (_e: LeafletMouseEvent) => {
          if (selectedCountry === countryName) {
            onSelectCountry(null);
          } else {
            onSelectCountry(countryName);
          }
          setGeoJsonKey((k) => k + 1);
        },
      });
    },
    [selectedCountry, onSelectCountry]
  );

  // Style each feature based on whether it's selected
  const styleFeature = useCallback(
    (feature: Feature | undefined) => {
      if (!feature) return defaultStyle;
      return feature.properties?.ADMIN === selectedCountry
        ? highlightStyle
        : defaultStyle;
    },
    [selectedCountry]
  );

  return (
    // How the map should render compared to the rest of the page
    <MapContainer
      {...({
        center: [30, 0],
        zoom: 2,
        style: { height: "100vh", width: "100%" },
      } as any)}
    >
      {/* Map tile layer */}
      <TileLayer
        {...({
          attribution: "&copy; OpenStreetMap",
          url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        } as any)}
      />

      {/* GeoJSON layer (highlighting countries on the map) */}
      <GeoJSON
        key={geoJsonKey}
        data={countriesData as GeoJsonObject}
        style={styleFeature}
        onEachFeature={onEachFeature}
      />
    </MapContainer>
  );
}
