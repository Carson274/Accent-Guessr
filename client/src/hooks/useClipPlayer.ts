import { useCallback, useEffect, useRef, useState } from "react";

interface PlayerState {
  url: string | null;
  playing: boolean;
  started: boolean;
  progress: number;
}

export interface ClipPlayer {
  playing: boolean;
  /** True once the clip has been played at least once this round. */
  started: boolean;
  /** 0 to 1 */
  progress: number;
  toggle: () => void;
  replay: () => void;
}

/**
 * Loads an audio clip without playing it. The clip only plays when the player
 * presses play, and it stops when the URL changes (next round), when the
 * component unmounts (leaving the game), or when the browser tab is hidden.
 */
export function useClipPlayer(url: string | null): ClipPlayer {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [state, setState] = useState<PlayerState>({ url, playing: false, started: false, progress: 0 });

  useEffect(() => {
    if (!url) return;

    const audio = new Audio(url);
    audio.preload = "auto";
    audioRef.current = audio;

    const update = (changes: Partial<PlayerState>) =>
      setState((prev) => ({
        ...(prev.url === url ? prev : { playing: false, started: false, progress: 0 }),
        ...changes,
        url,
      }));
    const onPlay = () => update({ playing: true, started: true });
    const onPause = () => update({ playing: false });
    const onEnded = () => update({ playing: false, progress: 1 });
    const onTimeUpdate = () =>
      update({ progress: audio.duration ? audio.currentTime / audio.duration : 0 });
    const onVisibilityChange = () => {
      if (document.hidden) audio.pause();
    };

    audio.addEventListener("play", onPlay);
    audio.addEventListener("pause", onPause);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("timeupdate", onTimeUpdate);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      audio.removeEventListener("play", onPlay);
      audio.removeEventListener("pause", onPause);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("timeupdate", onTimeUpdate);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      audio.pause();
      audio.removeAttribute("src");
      audio.load();
      if (audioRef.current === audio) audioRef.current = null;
    };
  }, [url]);

  const toggle = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (!audio.paused) {
      audio.pause();
      return;
    }
    if (audio.ended) audio.currentTime = 0;
    audio.play().catch(() => {});
  }, []);

  const replay = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    audio.play().catch(() => {});
  }, []);

  // State from a previous clip doesn't apply to a new one.
  const current = state.url === url ? state : { playing: false, started: false, progress: 0 };
  return { playing: current.playing, started: current.started, progress: current.progress, toggle, replay };
}
