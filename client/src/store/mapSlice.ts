import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

interface MapState {
  selectedCountry: string | null;
  selectedCountryCode: string | null;
}

const initialState: MapState = {
  selectedCountry: null,
  selectedCountryCode: null,
};

const mapSlice = createSlice({
  name: "map",
  initialState,
  reducers: {
    selectCountry: (
      state,
      action: PayloadAction<{ name: string; code: string } | null>
    ) => {
      if (action.payload) {
        state.selectedCountry = action.payload.name;
        state.selectedCountryCode = action.payload.code;
      } else {
        state.selectedCountry = null;
        state.selectedCountryCode = null;
      }
    },
    clearSelection: (state) => {
      state.selectedCountry = null;
      state.selectedCountryCode = null;
    },
  },
});

export const { selectCountry, clearSelection } = mapSlice.actions;
export default mapSlice.reducer;