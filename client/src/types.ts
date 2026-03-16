// ===== Game Mode =====

export type GameMode = "accent" | "language";

// ===== Player & Game State =====

export interface Player {
  id: string;
  name: string;
  score: number;
  currentRound: number;
  hasGuessed: boolean;
}

export type GameStatus = "waiting" | "playing" | "round-end" | "finished";

export interface GameState {
  players: Player[];
  currentRound: number;
  totalRounds: number;
  status: GameStatus;
  roomCode: string;
  hostId: string;
  audioUrl: string | null;
  countryCode: string | null;
  usedCountries: string[];
  gameMode: GameMode;
}

// ===== Client → Server Messages =====

export type ClientMessage =
  | { type: "join"; name: string }
  | { type: "guess"; lat: number; lng: number; round: number; countryGuess: string; roundScore: number }
  | { type: "start-game"; gameMode: GameMode }
  | { type: "next-round" }
  | { type: "set-audio"; audioUrl: string; countryCode: string };

// ===== Server → Client Messages =====

export interface RoundResultEntry {
  playerId: string;
  playerName: string;
  countryGuess: string;
  roundScore: number;
  totalScore: number;
  distanceKm: number | null;
}

export type ServerMessage =
  | { type: "sync"; state: GameState }
  | { type: "player-joined"; player: Player }
  | { type: "player-left"; playerId: string }
  | { type: "round-result"; results: RoundResultEntry[]; correctCountryCode: string }
  | { type: "game-over"; finalStandings: Player[] }
  | { type: "error"; message: string };