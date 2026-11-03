export const BACKEND_URL =
  import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3000";
export const PARTYKIT_HOST =
  import.meta.env.VITE_PARTYKIT_HOST ?? "localhost:1999";

// Colors for showing round results, shared by the map and scoreboards.
export const CORRECT_COLOR = "#16a34a";
export const GUESS_COLOR = "#DA4F49";
