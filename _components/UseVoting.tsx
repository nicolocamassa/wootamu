"use client";
// useVoting.ts
import { useState, useRef, useCallback, useEffect } from "react";
import type { VotePhase, Vote } from "./types";

const MAX_RETRIES = 3;
const RETRY_DELAY = 1500;

type UseVotingProps = {
  roomCode: string;
  userToken: string | null;
  currentUserId: number | undefined;
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

  // Ref interna: aggiornata ad ogni render, sempre fresca nella closure di submitVote
  const currentSongIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (currentSongId != null) {
      currentSongIdRef.current = currentSongId;
    }
  }, [currentSongId]);

  const voteDoneFiredRef = useRef(false);

  const reset = useCallback(() => {
    setPhase("idle");
    setVoteValue(5);
    setError(null);
    voteDoneFiredRef.current = false;
  }, []);

  const submitVote = useCallback(async () => {
    const songId = currentSongIdRef.current;

    console.log("[useVoting] submitVote", { phase, userToken, songId });

    if (phase === "submitting" || !userToken) {
      console.warn("[useVoting] bloccato: phase o userToken", { phase, userToken });
      return;
    }
    if (!songId) {
      console.warn("[useVoting] bloccato: songId nullo", { songId });
      return;
    }

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
          body: JSON.stringify({ roomCode, songId, value: voteValue, userToken }),
        });
        // 400 = già votato, accettiamo come successo
        if (res.ok || res.status === 400) return true;
        throw new Error(`HTTP ${res.status}`);
      } catch (err) {
        console.error("[useVoting] attempt fallito", { retriesLeft, err });
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
  // voteValue è nell'array perché deve essere letto fresco al momento del click
  }, [phase, userToken, roomCode, voteValue, onVoteDone]);

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