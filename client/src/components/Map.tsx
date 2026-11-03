"use client";

import { useCallback, useRef, useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { MapContainer, TileLayer, GeoJSON, Polyline, CircleMarker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import type { Layer, LeafletMouseEvent, Path } from "leaflet";
import type { Feature, GeoJsonObject } from "geojson";
import "leaflet/dist/leaflet.css";
import { selectCountry } from "../store/mapSlice";
import type { RootState } from "../store/store";
import countriesData from "../data/countries.json";
import { getCountryLabelPoint } from "../utils/scoring";
import { CORRECT_COLOR, GUESS_COLOR } from "../utils/constants";

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

// After a guess: the correct country and the player's guess
const correctStyle = {
  fillColor: CORRECT_COLOR,
  weight: 2,
  opacity: 1,
  color: CORRECT_COLOR,
  fillOpacity: 0.55,
};

const guessStyle = {
  fillColor: GUESS_COLOR,
  weight: 2,
  opacity: 1,
  color: GUESS_COLOR,
  fillOpacity: 0.5,
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

/** Country names (ADMIN) to show once a round is over. */
export interface MapResult {
  correctCountry: string | null;
  guessedCountry: string | null;
}

interface MapProps {
  disabled?: boolean;
  result?: MapResult | null;
}

/**
 * Interactive world map for selecting countries.
 * Uses Redux for state management of the selected country.
 * Allows users to click countries to select/deselect them.
 * When `disabled` is true, click and hover interactions are suppressed.
 * When `result` is set, the correct country is shown in green and the guess in red.
 */
export default function Map({ disabled = false, result = null }: MapProps) {
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
        click: () => {
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
      const name = feature.properties?.ADMIN;
      if (result) {
        if (name === result.correctCountry) return correctStyle;
        if (name === result.guessedCountry) return guessStyle;
        return defaultStyle;
      }
      return name === selectedCountry ? highlightStyle : defaultStyle;
    },
    [selectedCountry, result]
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
        key={`${selectedCountry}-${disabled}-${result?.correctCountry}-${result?.guessedCountry}`}
        data={countriesData as GeoJsonObject}
        style={styleFeature}
        onEachFeature={onEachFeature}
      />

      <ResultLayer result={result} />
    </MapContainer>
  );
}

/**
 * Pins the correct country and the guess, joins them with a dashed line,
 * and zooms the map to show both. Zooms back out when the next round starts.
 */
function ResultLayer({ result }: { result: MapResult | null }) {
  const map = useMap();
  const hadResult = useRef(false);

  const correct = getCountryLabelPoint(result?.correctCountry);
  const gotItRight = !!result && result.guessedCountry === result.correctCountry;
  const guess = gotItRight ? null : getCountryLabelPoint(result?.guessedCountry);

  useEffect(() => {
    if (!correct) {
      if (hadResult.current) map.flyTo([30, 0], 2, { duration: 0.6 });
      hadResult.current = false;
      return;
    }
    hadResult.current = true;
    if (guess) {
      // Extra padding on the right and bottom keeps the pins clear of the scoreboard and buttons.
      map.flyToBounds(L.latLngBounds([guess, correct]), {
        paddingTopLeft: [60, 60],
        paddingBottomRight: [290, 90],
        maxZoom: 5,
        duration: 0.8,
      });
    } else {
      map.flyTo(correct, 4, { duration: 0.8 });
    }
  }, [map, correct, guess]);

  if (!result || !correct) return null;

  return (
    <>
      {guess && (
        <>
          <Polyline
            positions={[guess, correct]}
            pathOptions={{ color: "#111827", weight: 2, opacity: 0.8, dashArray: "6 8" }}
          />
          <CircleMarker
            center={guess}
            radius={7}
            pathOptions={{ color: "white", weight: 2, fillColor: GUESS_COLOR, fillOpacity: 1 }}
          >
            <Tooltip permanent direction="top" offset={[0, -8]}>
              Your guess: {result.guessedCountry}
            </Tooltip>
          </CircleMarker>
        </>
      )}
      <CircleMarker
        center={correct}
        radius={8}
        pathOptions={{ color: "white", weight: 2, fillColor: CORRECT_COLOR, fillOpacity: 1 }}
      >
        <Tooltip permanent direction="top" offset={[0, -8]}>
          {gotItRight ? `${result.correctCountry} — you got it!` : `Answer: ${result.correctCountry}`}
        </Tooltip>
      </CircleMarker>
    </>
  );
}
