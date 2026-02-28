"use client";
// useFestival.ts
import { useState, useEffect, useRef, useCallback } from "react";
import { festivalChannel, pusherClient } from "@/_lib/pusherClient";
import type { FestivalStatus } from "./types";

const POLL_INTERVAL = 8000;
// Soglia: se l'utente era assente più di X ms, forza un refetch immediato
const ABSENCE_THRESHOLD = 3000;

export function useFestival(roomCode: string, userToken?: string | null) {
  const [status, setStatus] = useState<FestivalStatus | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const statusRef = useRef<FestivalStatus | null>(null);
  const hasVotedRef = useRef(false);
  const lastVisibleAt = useRef<number>(Date.now());

  useEffect(() => { statusRef.current = status; }, [status]);
  useEffect(() => { hasVotedRef.current = hasVoted; }, [hasVoted]);

  const buildUrl = useCallback(() => {
    const params = new URLSearchParams({ roomCode });
    if (userToken) params.set("userToken", userToken);
    return `/api/festival-status?${params.toString()}`;
  }, [roomCode, userToken]);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch(buildUrl());
      if (!res.ok) return;
      const data = await res.json();
      const { hasVoted: hv, ...festivalData } = data;
      setStatus(festivalData);
      statusRef.current = festivalData;
      if (!hasVotedRef.current) {
        setHasVoted(!!hv);
      }
    } catch {}
  }, [buildUrl]);

  const refreshVotes = useCallback(async () => {
    try {
      const res = await fetch(buildUrl());
      if (!res.ok) return;
      const data = await res.json();
      const { hasVoted: hv, ...festivalData } = data;
      if (!hasVotedRef.current) {
        setHasVoted(!!hv);
      }
      setStatus((prev) => {
        if (!prev) return festivalData;
        return {
          ...prev,
          song: prev.song
            ? { ...prev.song, votes: festivalData.song?.votes ?? prev.song.votes }
            : prev.song,
        };
      });
    } catch {}
  }, [buildUrl]);

  // Reset hasVoted solo quando arriva un nuovo songId non-null
  const prevSongIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (!status?.songId) return;
    if (status.songId === prevSongIdRef.current) return;
    prevSongIdRef.current = status.songId;
    setHasVoted(false);
    hasVotedRef.current = false;
  }, [status?.songId]);

  useEffect(() => {
    fetchStatus();
    const poll = setInterval(fetchStatus, POLL_INTERVAL);

    // Visibility: se l'utente era via da più di ABSENCE_THRESHOLD, refetch immediato
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        const absence = Date.now() - lastVisibleAt.current;
        if (absence > ABSENCE_THRESHOLD) fetchStatus();
        lastVisibleAt.current = Date.now();
      } else {
        // Salva il momento in cui l'utente lascia la tab
        lastVisibleAt.current = Date.now();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    // Rete: quando il dispositivo riacquista connessione
    const onOnline = () => fetchStatus();
    window.addEventListener("online", onOnline);

    // Focus: refetch quando la finestra torna in primo piano (mobile/desktop)
    const onFocus = () => fetchStatus();
    window.addEventListener("focus", onFocus);

    // Pusher: riconnessione nativa
    pusherClient.connection.bind("connected", fetchStatus);

    // Pusher: stato update
    const onStatusUpdate = (data: FestivalStatus) => {
      setStatus((prev) => {
        const next: FestivalStatus = {
  ...(prev ?? data),
  type: data.type,
  songId: data.songId,
  lastSongId: (data as any).lastSongId,
  song: data.song
    ? { ...data.song, votes: prev?.song?.votes ?? [] }
    : prev?.song ?? null,
  eventIndex: (data as any).eventIndex ?? prev?.eventIndex ?? 0,
  classificaIndex: (data as any).classificaIndex ?? 0,
  aiTesto: (data as any).aiTesto ?? prev?.aiTesto ?? null,           // ← aggiungi
  aiCommentoAt: (data as any).aiCommentoAt ?? prev?.aiCommentoAt ?? null, // ← aggiungi
};
        statusRef.current = next;
        return next;
      });
      // Refetch solo per hasVoted e voti — non sovrascrivere classificaIndex
      refreshVotes();
    };

    const onVoteUpdate = ({ roomCode: rc }: { roomCode: string }) => {
      if (rc === roomCode) refreshVotes();
    };

    festivalChannel.bind("status-update", onStatusUpdate);
    festivalChannel.bind("vote-update", onVoteUpdate);

    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("online", onOnline);
      window.removeEventListener("focus", onFocus);
      pusherClient.connection.unbind("connected", fetchStatus);
      festivalChannel.unbind("status-update", onStatusUpdate);
      festivalChannel.unbind("vote-update", onVoteUpdate);
    };
  }, [roomCode, userToken]);

  return { status, hasVoted, fetchStatus, refreshVotes };
}