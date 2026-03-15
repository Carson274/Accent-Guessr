"use client";

import { useCallback, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { MapContainer, TileLayer, GeoJSON } from "react-leaflet";
import L from "leaflet";
import type { Layer, LeafletMouseEvent, Path } from "leaflet";
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

// Style on hover (slightly brighter outline)
const hoverStyle = {
  weight: 2,
  color: "#3388ff",
  fillOpacity: 0.35,
};

// ── World bounds to prevent scrolling past GeoJSON coverage ──
const worldBounds = L.latLngBounds(
  L.latLng(-85, -180),
  L.latLng(85, 180)
);

// ── Map Component ────────────────────────────────────────────

interface MapProps {
  disabled?: boolean;
}

/**
 * Interactive world map for selecting countries.
 * Uses Redux for state management of the selected country.
 * Allows users to click countries to select/deselect them.
 * When `disabled` is true, click and hover interactions are suppressed.
 */
export default function Map({ disabled = false }: MapProps) {
  // Redux dispatch and selector
  const dispatch = useDispatch();
  const selectedCountry = useSelector(
    (state: RootState) => state.map.selectedCountry
  );

  // Use a ref so event handlers bound by GeoJSON always see the latest value
  const disabledRef = useRef(disabled);
  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  /**
   * Handle interactions for each GeoJSON feature (country).
   * Dispatches Redux action to select/deselect the country on click.
   * Binds a tooltip showing the country name on hover.
   */
  const onEachFeature = useCallback(
    (feature: Feature, layer: Layer) => {
      const countryName = feature.properties?.ADMIN as string;

      // Show country name on hover
      layer.bindTooltip(countryName, {
        sticky: true,
        direction: "top",
        className: "country-tooltip",
      });

      layer.on({
        click: (_e: LeafletMouseEvent) => {
          if (disabledRef.current) return;
          // Toggle selection: deselect if already selected, select otherwise
          if (selectedCountry === countryName) {
            dispatch(selectCountry(null));
          } else {
            dispatch(selectCountry(countryName));
          }
        },
        mouseover: (e: LeafletMouseEvent) => {
          if (disabledRef.current) return;
          const target = e.target as Path;
          // Don't override the selected highlight
          if (countryName !== selectedCountry) {
            target.setStyle(hoverStyle);
          }
        },
        mouseout: (e: LeafletMouseEvent) => {
          if (disabledRef.current) return;
          const target = e.target as Path;
          if (countryName !== selectedCountry) {
            target.setStyle(defaultStyle);
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
      minZoom={2}
      maxBounds={worldBounds}
      maxBoundsViscosity={1.0}
      style={{ height: "100vh", width: "100%" }}
    >
      {/* Base map tile layer (OpenStreetMap) */}
      <TileLayer
        attribution="&copy; OpenStreetMap"
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        noWrap={true}
      />

      {/* GeoJSON layer with country boundaries and click handlers */}
      <GeoJSON
        key={`${selectedCountry}-${disabled}`}
        data={countriesData as GeoJsonObject}
        style={styleFeature}
        onEachFeature={onEachFeature}
      />
    </MapContainer>
  );
}