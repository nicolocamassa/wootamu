"use client";
// useFestival.ts

import { useState, useEffect, useRef, useCallback } from "react";
import { festivalChannel, pusherClient } from "@/_lib/pusherClient";
import type { FestivalStatus } from "./types";

const POLL_INTERVAL = 8000;

export function useFestival(roomCode: string, userToken?: string | null) {
  const [status, setStatus] = useState<FestivalStatus | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const statusRef = useRef<FestivalStatus | null>(null);

  useEffect(() => { statusRef.current = status; }, [status]);

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
      setHasVoted(!!hv);
    } catch {}
  }, [buildUrl]);

  const refreshVotes = useCallback(async () => {
    try {
      const res = await fetch(buildUrl());
      if (!res.ok) return;
      const data = await res.json();
      const { hasVoted: hv, ...festivalData } = data;
      setHasVoted(!!hv);
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

  useEffect(() => {
    fetchStatus();
    const poll = setInterval(fetchStatus, POLL_INTERVAL);

    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchStatus();
    };
    document.addEventListener("visibilitychange", onVisibility);
    pusherClient.connection.bind("connected", fetchStatus);

    const onStatusUpdate = (data: FestivalStatus) => {
      // Applica subito type/songId dal payload Pusher,
      // poi fetchStatus per votes filtrati per night e hasVoted dal DB
      setStatus((prev) => {
        const next = {
          ...(prev ?? data),
          type: data.type,
          songId: data.songId,
          lastSongId: data.lastSongId,
          song: data.song ? { ...data.song, votes: prev?.song?.votes ?? [] } : prev?.song ?? null,
        };
        statusRef.current = next;
        return next;
      });
      fetchStatus();
    };

    const onVoteUpdate = ({ roomCode: rc }: { roomCode: string }) => {
      if (rc === roomCode) refreshVotes();
    };

    festivalChannel.bind("status-update", onStatusUpdate);
    festivalChannel.bind("vote-update", onVoteUpdate);

    return () => {
      clearInterval(poll);
      document.removeEventListener("visibilitychange", onVisibility);
      pusherClient.connection.unbind("connected", fetchStatus);
      festivalChannel.unbind("status-update", onStatusUpdate);
      festivalChannel.unbind("vote-update", onVoteUpdate);
    };
  }, [roomCode, userToken]);

  return { status, hasVoted, fetchStatus, refreshVotes };
}