import type * as Party from "partykit/server";
import type {
  Player,
  GameState,
  ClientMessage,
  ServerMessage,
} from "../src/types";

const TOTAL_ROUNDS = 5;

export default class Server implements Party.Server {
  gameState: GameState;

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
    // Send the current state so the new client can hydrate
    this.send(conn, { type: "sync", state: this.gameState });
  }

  onClose(conn: Party.Connection) {
    const leaving = this.getPlayer(conn.id);
    if (!leaving) return;

    this.gameState.players = this.gameState.players.filter(
      (p) => p.id !== conn.id
    );

    // If the host left, assign a new host
    if (this.gameState.hostId === conn.id && this.gameState.players.length > 0) {
      this.gameState.hostId = this.gameState.players[0].id;
    }

    // If the room is now empty, reset state
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
        this.handleStartGame(sender);
        break;
      case "guess":
        this.handleGuess(sender, msg.lat, msg.lng, msg.round);
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
    // Prevent duplicate joins
    if (this.getPlayer(conn.id)) {
      this.send(conn, { type: "error", message: "Already joined" });
      return;
    }

    // Don't allow joining mid-game
    if (this.gameState.status !== "waiting") {
      this.send(conn, {
        type: "error",
        message: "Game already in progress",
      });
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

    // First player becomes the host
    if (this.gameState.players.length === 1) {
      this.gameState.hostId = conn.id;
    }

    this.broadcast({ type: "player-joined", player });
    this.syncAll();
  }

  // ── Start Game ───────────────────────────────────────────

  private handleStartGame(conn: Party.Connection) {
    if (conn.id !== this.gameState.hostId) {
      this.send(conn, {
        type: "error",
        message: "Only the host can start the game",
      });
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

    // Reset all players
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
    lat: number,
    lng: number,
    round: number
  ) {
    if (this.gameState.status !== "playing") {
      this.send(conn, { type: "error", message: "Game is not in progress" });
      return;
    }

    const player = this.getPlayer(conn.id);
    if (!player) return;

    if (player.hasGuessed) {
      this.send(conn, {
        type: "error",
        message: "You already guessed this round",
      });
      return;
    }

    if (round !== this.gameState.currentRound) {
      this.send(conn, { type: "error", message: "Wrong round number" });
      return;
    }

    // Score calculation — placeholder using distance from (0, 0)
    // The actual target coordinates will come from the Forvo data;
    // for now we compute a simple score so the flow works end-to-end.
    const distance = Math.sqrt(lat * lat + lng * lng);
    const roundScore = Math.max(0, Math.round(5000 - distance * 10));

    player.hasGuessed = true;
    player.score += roundScore;

    // Check if all players have guessed
    const allGuessed = this.gameState.players.every((p) => p.hasGuessed);

    if (allGuessed) {
      const results = this.gameState.players.map((p) => ({
        playerId: p.id,
        score: p.id === conn.id ? roundScore : 0, // simplified — real impl tracks per-guess
        totalScore: p.score,
        distance: p.id === conn.id ? distance : 0,
      }));

      this.broadcast({ type: "round-result", results });

      // Check if game is over
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
      // Let everyone know someone guessed (via sync)
      this.syncAll();
    }
  }

  // ── Next Round ───────────────────────────────────────────

  private handleNextRound(conn: Party.Connection) {
    if (conn.id !== this.gameState.hostId) {
      this.send(conn, {
        type: "error",
        message: "Only the host can advance rounds",
      });
      return;
    }

    if (this.gameState.status !== "round-end") {
      this.send(conn, {
        type: "error",
        message: "Cannot advance round right now",
      });
      return;
    }

    this.gameState.currentRound += 1;
    this.gameState.status = "playing";
    this.gameState.audioUrl = null;
    this.gameState.countryCode = null;

    for (const p of this.gameState.players) {
      p.hasGuessed = false;
      p.currentRound = this.gameState.currentRound;
    }

    this.syncAll();
  }
  // ── Set Audio ─────────────────────────────────────────────

  private handleSetAudio(conn: Party.Connection, audioUrl: string, countryCode: string) {
    if (conn.id !== this.gameState.hostId) {
      this.send(conn, {
        type: "error",
        message: "Only the host can set audio",
      });
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
