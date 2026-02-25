"use client";
// useReactions.ts — gestisce le reactions floating durante l'esibizione

import { useState, useRef, useCallback } from "react";
import { festivalChannel } from "@/_lib/pusherClient";
import { useEffect } from "react";
import type { FloatingReaction } from "./types";

export const REACTIONS = [
  { type: "skull",  emoji: "💀" },
  { type: "fire",   emoji: "🔥" },
  { type: "heart",  emoji: "❤️" },
  { type: "clap",   emoji: "👏" },
  { type: "laugh",  emoji: "😂" },
  { type: "cringe", emoji: "🫣" },
];

const EMOJI_MAP: Record<string, string> = Object.fromEntries(
  REACTIONS.map((r) => [r.type, r.emoji])
);

type UseReactionsProps = {
  songId: number | null | undefined;
  roomCode: string;
  userToken: string | null;
};

export function useReactions({ songId, roomCode, userToken }: UseReactionsProps) {
  const [floating, setFloating] = useState<FloatingReaction[]>([]);
  const [combo, setCombo] = useState<{ emoji: string; count: number } | null>(null);
  const idRef = useRef(0);
  const comboTimer = useRef<NodeJS.Timeout | null>(null);

  const spawnFloat = useCallback((emoji: string) => {
    const id = idRef.current++;
    const x = Math.random() * 35 + 5;
    setFloating((prev) => [...prev, { id, emoji, x }]);
    setTimeout(() => setFloating((prev) => prev.filter((r) => r.id !== id)), 2400);
  }, []);

  // Pusher: reactions degli altri utenti
  useEffect(() => {
    const onReaction = ({ emoji }: { emoji: string }) => spawnFloat(emoji);
    festivalChannel.bind("reaction-update", onReaction);
    return () => {
      festivalChannel.unbind("reaction-update", onReaction);
    };
  }, [spawnFloat]);

  const sendReaction = useCallback(async (type: string) => {
    const emoji = EMOJI_MAP[type];
    if (!emoji || !songId || !userToken) return;

    // Animazione locale immediata
    spawnFloat(emoji);

    // Aggiorna combo
    setCombo((prev) => {
      const count = prev?.emoji === emoji ? prev.count + 1 : 1;
      if (comboTimer.current) clearTimeout(comboTimer.current);
      comboTimer.current = setTimeout(() => setCombo(null), 2000);
      return { emoji, count };
    });

    // API fire-and-forget
    try {
      await fetch("/api/add-reaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ type, songId, roomCode }),
      });
    } catch {}
  }, [songId, roomCode, userToken, spawnFloat]);

  return { floating, combo, sendReaction };
}