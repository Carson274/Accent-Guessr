"use client";

import { useCallback } from "react";
import { useDispatch, useSelector } from "react-redux";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import type { Layer, LeafletMouseEvent } from "leaflet";
import type { Feature, GeoJsonObject } from "geojson";
import "leaflet/dist/leaflet.css";
import { selectCountry } from "../store/mapSlice";
import type { RootState } from "../store/store";
import countriesData from "../data/countries.json";

// ── Styles ───────────────────────────────────────────────────

// Color to show unclicked countries
const defaultStyle = {
  fillColor: "#3388ff",
  weight: 1,
  opacity: 1,
  color: "#3388ff",
  fillOpacity: 0.15,
};

// Color to show clicked/selected countries
const highlightStyle = {
  fillColor: "#ff7800",
  weight: 2,
  opacity: 1,
  color: "#ff7800",
  fillOpacity: 0.45,
};

// ── Map Component ────────────────────────────────────────────

/**
 * Interactive world map for selecting countries.
 * Uses Redux for state management of the selected country.
 * Allows users to click countries to select/deselect them.
 */
export default function Map() {
  // Redux dispatch and selector
  const dispatch = useDispatch();
  const selectedCountry = useSelector(
    (state: RootState) => state.map.selectedCountry
  );

  /**
   * Handle interactions for each GeoJSON feature (country).
   * Dispatches Redux action to select/deselect the country on click.
   */
  const onEachFeature = useCallback(
    (feature: Feature, layer: Layer) => {
      const countryName = feature.properties?.ADMIN as string;

      layer.on({
        click: (_e: LeafletMouseEvent) => {
          console.log("Clicking country:", countryName);
          console.log("Previously selected:", selectedCountry);

          // Toggle selection: deselect if already selected, select otherwise
          if (selectedCountry === countryName) {
            dispatch(selectCountry(null));
            console.log("Deselecting country");
          } else {
            dispatch(selectCountry(countryName));
            console.log("Selecting country:", countryName);
          }
        },
      });
    },
    [selectedCountry, dispatch]
  );

  /**
   * Style each country based on selection state.
   * Returns highlighted style if country is selected, default style otherwise.
   */
  const styleFeature = useCallback(
    (feature: Feature | undefined) => {
      if (!feature) return defaultStyle;
      return feature.properties?.ADMIN === selectedCountry
        ? highlightStyle
        : defaultStyle;
    },
    [selectedCountry]
  );

  // ── Render ───────────────────────────────────────────────────

  return (
    <MapContainer
      center={[30, 0]}
      zoom={2}
      style={{ height: "100vh", width: "100%" }}
    >
      {/* Base map tile layer (OpenStreetMap) */}
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {/* GeoJSON layer with country boundaries and click handlers */}
      <GeoJSON
        key={selectedCountry}
        data={countriesData as GeoJsonObject}
        style={styleFeature}
        onEachFeature={onEachFeature}
      />
    </MapContainer>
  );
}