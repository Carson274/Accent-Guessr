import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

interface MapState {
  selectedCountry: string | null;
}

const initialState: MapState = {
  selectedCountry: null,
};

const mapSlice = createSlice({
  name: "map",
  initialState,
  reducers: {
    selectCountry: (state, action: PayloadAction<string | null>) => {
      state.selectedCountry = action.payload;
    },
    clearSelection: (state) => {
      state.selectedCountry = null;
    },
  },
});

export const { selectCountry, clearSelection } = mapSlice.actions;
export default mapSlice.reducer;