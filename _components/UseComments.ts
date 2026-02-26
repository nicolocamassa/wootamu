"use client";
// useComments.ts
import { useState, useEffect, useRef, useCallback } from "react";
import { festivalChannel } from "@/_lib/pusherClient";
import type { Comment, User } from "./types";

type UseCommentsProps = {
  songId: number | null | undefined;
  roomCode: string;
  isEsibizione: boolean;
  users: User[];
};

export function useComments({ songId, roomCode, isEsibizione, users }: UseCommentsProps) {
  const [chatComments, setChatComments] = useState<Comment[]>([]);
  const shownIds = useRef<Set<number>>(new Set());

  // Normalizza un commento che può avere sia `user` (vecchio schema) che `profile` (nuovo schema)
  const normalizeComment = useCallback((c: any): Comment => ({
    ...c,
    user: c.user ?? (c.profile ? { id: c.profile_id, username: c.profile.username } : { id: 0, username: "?" }),
  }), []);

  const addToChat = useCallback((comment: any) => {
    const normalized = normalizeComment(comment);
    if (shownIds.current.has(normalized.id)) return;
    shownIds.current.add(normalized.id);
    setChatComments((prev) => [...prev, normalized]);
  }, [normalizeComment]);

  const fetchComments = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/get-comments?songId=${id}&roomCode=${roomCode}`);
      if (!res.ok) return;
      const data: any[] = await res.json();
      data.forEach((c) => addToChat(c));
    } catch {}
  }, [roomCode, addToChat]);

  // Reset quando cambia canzone
  useEffect(() => {
    setChatComments([]);
    shownIds.current = new Set();
  }, [songId]);

  // Avvia durante esibizione
  useEffect(() => {
    if (!isEsibizione || !songId) return;
    fetchComments(songId);
    const onCommentUpdate = ({ songId: sid }: { songId: number }) => {
      if (sid !== songId) return;
      (async () => {
        try {
          const res = await fetch(`/api/get-comments?songId=${sid}&roomCode=${roomCode}`);
          if (!res.ok) return;
          const data: any[] = await res.json();
          const newest = data[data.length - 1];
          if (newest) addToChat(newest);
        } catch {}
      })();
    };
    festivalChannel.bind("comment-update", onCommentUpdate);
    return () => { festivalChannel.unbind("comment-update", onCommentUpdate); };
  }, [isEsibizione, songId]);

  return { chatComments };
}