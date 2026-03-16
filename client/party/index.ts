import type * as Party from "partykit/server";
import type {
  Player,
  GameState,
  GameMode,
  ClientMessage,
  ServerMessage,
  RoundResultEntry,
} from "../src/types";

const TOTAL_ROUNDS = 5;

// Per-round guess tracking (not in GameState to avoid syncing sensitive data)
interface GuessRecord {
  countryGuess: string;
  roundScore: number;
  distanceKm: number | null;
}

export default class Server implements Party.Server {
  gameState: GameState;
  // Map of playerId -> GuessRecord for the current round
  roundGuesses: Map<string, GuessRecord> = new Map();

  constructor(readonly room: Party.Room) {
    this.gameState = {
      players: [],
      currentRound: 1,
      totalRounds: TOTAL_ROUNDS,
      status: "waiting",
      roomCode: room.id,
      hostId: "",
      audioUrl: null,
      countryCode: null,
      usedCountries: [],
      gameMode: "accent",
    };
  }

  // ── Helpers ──────────────────────────────────────────────

  private broadcast(msg: ServerMessage, exclude?: string[]) {
    this.room.broadcast(JSON.stringify(msg), exclude);
  }

  private send(conn: Party.Connection, msg: ServerMessage) {
    conn.send(JSON.stringify(msg));
  }

  private syncAll() {
    this.broadcast({ type: "sync", state: this.gameState });
  }

  private getPlayer(id: string): Player | undefined {
    return this.gameState.players.find((p) => p.id === id);
  }

  // ── Connection lifecycle ─────────────────────────────────

  onConnect(conn: Party.Connection, _ctx: Party.ConnectionContext) {
    this.send(conn, { type: "sync", state: this.gameState });
  }

  onClose(conn: Party.Connection) {
    const leaving = this.getPlayer(conn.id);
    if (!leaving) return;

    this.gameState.players = this.gameState.players.filter(
      (p) => p.id !== conn.id
    );
    this.roundGuesses.delete(conn.id);

    if (this.gameState.hostId === conn.id && this.gameState.players.length > 0) {
      this.gameState.hostId = this.gameState.players[0].id;
    }

    if (this.gameState.players.length === 0) {
      this.gameState.status = "waiting";
      this.gameState.currentRound = 1;
    }

    this.broadcast({ type: "player-left", playerId: conn.id });
    this.syncAll();
  }

  // ── Message handler ──────────────────────────────────────

  onMessage(raw: string, sender: Party.Connection) {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(raw) as ClientMessage;
    } catch {
      this.send(sender, { type: "error", message: "Invalid message format" });
      return;
    }

    switch (msg.type) {
      case "join":
        this.handleJoin(sender, msg.name);
        break;
      case "start-game":
        this.handleStartGame(sender, msg.gameMode);
        break;
      case "guess":
        this.handleGuess(sender, msg.countryGuess, msg.roundScore, msg.round);
        break;
      case "next-round":
        this.handleNextRound(sender);
        break;
      case "set-audio":
        this.handleSetAudio(sender, msg.audioUrl, msg.countryCode);
        break;
    }
  }

  // ── Join ─────────────────────────────────────────────────

  private handleJoin(conn: Party.Connection, name: string) {
    if (this.getPlayer(conn.id)) {
      this.send(conn, { type: "error", message: "Already joined" });
      return;
    }

    if (this.gameState.status !== "waiting") {
      this.send(conn, { type: "error", message: "Game already in progress" });
      return;
    }

    const player: Player = {
      id: conn.id,
      name: name || `Player ${this.gameState.players.length + 1}`,
      score: 0,
      currentRound: 1,
      hasGuessed: false,
    };

    this.gameState.players.push(player);

    if (this.gameState.players.length === 1) {
      this.gameState.hostId = conn.id;
    }

    this.broadcast({ type: "player-joined", player });
    this.syncAll();
  }

  // ── Start Game ───────────────────────────────────────────

  private handleStartGame(conn: Party.Connection, gameMode: GameMode) {
    if (conn.id !== this.gameState.hostId) {
      this.send(conn, { type: "error", message: "Only the host can start the game" });
      return;
    }

    if (this.gameState.status !== "waiting") {
      this.send(conn, { type: "error", message: "Game already started" });
      return;
    }

    this.gameState.status = "playing";
    this.gameState.currentRound = 1;
    this.gameState.audioUrl = null;
    this.gameState.countryCode = null;
    this.gameState.usedCountries = [];
    this.gameState.gameMode = gameMode;
    this.roundGuesses.clear();

    for (const p of this.gameState.players) {
      p.score = 0;
      p.currentRound = 1;
      p.hasGuessed = false;
    }

    this.syncAll();
  }

  // ── Guess ────────────────────────────────────────────────

  private handleGuess(
    conn: Party.Connection,
    countryGuess: string,
    roundScore: number,
    round: number
  ) {
    if (this.gameState.status !== "playing") {
      this.send(conn, { type: "error", message: "Game is not in progress" });
      return;
    }

    const player = this.getPlayer(conn.id);
    if (!player) return;

    if (player.hasGuessed) {
      this.send(conn, { type: "error", message: "You already guessed this round" });
      return;
    }

    if (round !== this.gameState.currentRound) {
      this.send(conn, { type: "error", message: "Wrong round number" });
      return;
    }

    // Clamp score to valid range
    const clampedScore = Math.max(0, Math.min(5000, Math.round(roundScore)));

    player.hasGuessed = true;
    player.score += clampedScore;

    this.roundGuesses.set(conn.id, {
      countryGuess,
      roundScore: clampedScore,
      distanceKm: null, // server doesn't compute this; client already showed it
    });

    const allGuessed = this.gameState.players.every((p) => p.hasGuessed);

    if (allGuessed) {
      const results: RoundResultEntry[] = this.gameState.players.map((p) => {
        const guess = this.roundGuesses.get(p.id);
        return {
          playerId: p.id,
          playerName: p.name,
          countryGuess: guess?.countryGuess ?? "Unknown",
          roundScore: guess?.roundScore ?? 0,
          totalScore: p.score,
          distanceKm: guess?.distanceKm ?? null,
        };
      });

      this.broadcast({
        type: "round-result",
        results,
        correctCountryCode: this.gameState.countryCode ?? "",
      });

      if (this.gameState.currentRound >= this.gameState.totalRounds) {
        this.gameState.status = "finished";
        const finalStandings = [...this.gameState.players].sort(
          (a, b) => b.score - a.score
        );
        this.broadcast({ type: "game-over", finalStandings });
      } else {
        this.gameState.status = "round-end";
      }

      this.syncAll();
    } else {
      this.syncAll();
    }
  }

  // ── Next Round ───────────────────────────────────────────

  private handleNextRound(conn: Party.Connection) {
    if (conn.id !== this.gameState.hostId) {
      this.send(conn, { type: "error", message: "Only the host can advance rounds" });
      return;
    }

    if (this.gameState.status !== "round-end") {
      this.send(conn, { type: "error", message: "Cannot advance round right now" });
      return;
    }

    this.gameState.currentRound += 1;
    this.gameState.status = "playing";
    this.gameState.audioUrl = null;
    this.gameState.countryCode = null;
    this.roundGuesses.clear();

    for (const p of this.gameState.players) {
      p.hasGuessed = false;
      p.currentRound = this.gameState.currentRound;
    }

    this.syncAll();
  }

  // ── Set Audio ─────────────────────────────────────────────

  private handleSetAudio(conn: Party.Connection, audioUrl: string, countryCode: string) {
    if (conn.id !== this.gameState.hostId) {
      this.send(conn, { type: "error", message: "Only the host can set audio" });
      return;
    }

    if (this.gameState.status !== "playing") return;

    this.gameState.audioUrl = audioUrl;
    this.gameState.countryCode = countryCode;
    if (!this.gameState.usedCountries.includes(countryCode)) {
      this.gameState.usedCountries.push(countryCode);
    }

    this.syncAll();
  }
}

Server satisfies Party.Worker;