import { useEffect, useRef, useState, useCallback } from "react";
import PartySocket from "partysocket";
import type { GameState, ClientMessage, ServerMessage } from "../types";

const PARTYKIT_HOST =
    import.meta.env.VITE_PARTYKIT_HOST ?? "localhost:1999";

export function usePartySocket(roomCode: string, playerName: string) {
    const [gameState, setGameState] = useState<GameState | null>(null);
    const [connected, setConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const socketRef = useRef<PartySocket | null>(null);

    useEffect(() => {
        if (!roomCode || !playerName) return;

        const socket = new PartySocket({
            host: PARTYKIT_HOST,
            room: roomCode,
        });

        socketRef.current = socket;

        socket.addEventListener("open", () => {
            setConnected(true);
            setError(null);
            // Send join message once connected
            const joinMsg: ClientMessage = { type: "join", name: playerName };
            socket.send(JSON.stringify(joinMsg));
        });

        socket.addEventListener("message", (event) => {
            try {
                const msg: ServerMessage = JSON.parse(event.data);
                switch (msg.type) {
                    case "sync":
                        setGameState(msg.state);
                        break;
                    case "player-joined":
                        setGameState((prev) => {
                            if (!prev) return prev;
                            // Avoid duplicates
                            if (prev.players.some((p) => p.id === msg.player.id))
                                return prev;
                            return { ...prev, players: [...prev.players, msg.player] };
                        });
                        break;
                    case "player-left":
                        setGameState((prev) => {
                            if (!prev) return prev;
                            return {
                                ...prev,
                                players: prev.players.filter(
                                    (p) => p.id !== msg.playerId
                                ),
                            };
                        });
                        break;
                    case "round-result":
                        // round-result is informational; the sync that follows
                        // will update the full state. We could show a toast here.
                        break;
                    case "game-over":
                        // game-over is also followed by a sync
                        break;
                    case "error":
                        setError(msg.message);
                        break;
                }
            } catch {
                // ignore non-JSON messages
            }
        });

        socket.addEventListener("close", () => {
            setConnected(false);
        });

        socket.addEventListener("error", () => {
            setError("Connection error");
        });

        return () => {
            socket.close();
            socketRef.current = null;
        };
    }, [roomCode, playerName]);

    const sendMessage = useCallback((msg: ClientMessage) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            socketRef.current.send(JSON.stringify(msg));
        }
    }, []);

    return { gameState, connected, error, sendMessage };
}
