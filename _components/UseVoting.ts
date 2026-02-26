"use client";
// useVoting.ts

import { useState, useRef, useCallback } from "react";
import type { VotePhase, Vote } from "./types";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1500;

type UseVotingProps = {
  roomCode: string;
  userToken: string | null;
  currentSongId?: number | null;
  votes: Vote[];
  onVoteDone?: () => void;
};

export function useVoting({
  roomCode,
  userToken,
  currentSongId,
  onVoteDone,
}: UseVotingProps) {
  const [phase, setPhase] = useState<VotePhase>("idle");
  const [voteValue, setVoteValue] = useState(5);
  const [error, setError] = useState<string | null>(null);
  const voteDoneFiredRef = useRef(false);

  const reset = useCallback(() => {
    setPhase("idle");
    setVoteValue(5);
    setError(null);
    voteDoneFiredRef.current = false;
  }, []);

  const submitVote = useCallback(async () => {
    if (phase === "submitting" || !userToken) return;
    if (!currentSongId) return;

    setPhase("submitting");
    setError(null);

    const attempt = async (retriesLeft: number): Promise<boolean> => {
      try {
        const res = await fetch("/api/add-vote", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${userToken}`,
          },
          body: JSON.stringify({
            roomCode,
            songId: currentSongId,
            value: voteValue,
            userToken,
          }),
        });
        // 400 = già votato, trattalo come successo
        if (res.ok || res.status === 400) return true;
        throw new Error(`HTTP ${res.status}`);
      } catch {
        if (retriesLeft > 0) {
          await new Promise((r) => setTimeout(r, RETRY_DELAY));
          return attempt(retriesLeft - 1);
        }
        return false;
      }
    };

    const ok = await attempt(MAX_RETRIES);

    if (ok) {
      setPhase("done");
      setError(null);
      if (!voteDoneFiredRef.current) {
        voteDoneFiredRef.current = true;
        onVoteDone?.();
      }
    } else {
      setPhase("idle");
      setError("Errore di rete — riprova");
    }
  }, [phase, currentSongId, userToken, voteValue, roomCode, onVoteDone]);

  return {
    voteValue,
    setVoteValue,
    error,
    reset,
    submitVote,
    isSubmitting: phase === "submitting",
    isDone: phase === "done",
  };
}