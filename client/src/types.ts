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
}

// ===== Client → Server Messages =====

export type ClientMessage =
  | { type: "join"; name: string }
  | { type: "guess"; lat: number; lng: number; round: number }
  | { type: "start-game" }
  | { type: "next-round" };

// ===== Server → Client Messages =====

export type ServerMessage =
  | { type: "sync"; state: GameState }
  | { type: "player-joined"; player: Player }
  | { type: "player-left"; playerId: string }
  | {
      type: "round-result";
      results: {
        playerId: string;
        score: number;
        totalScore: number;
        distance: number;
      }[];
    }
  | { type: "game-over"; finalStandings: Player[] }
  | { type: "error"; message: string };
