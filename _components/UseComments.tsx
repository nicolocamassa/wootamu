"use client";
// useComments.ts — gestisce fetch e aggiornamento commenti durante l'esibizione
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

  const addToChat = useCallback((comment: Comment) => {
    if (shownIds.current.has(comment.id)) return;
    shownIds.current.add(comment.id);
    setChatComments((prev) => [...prev, comment]);
  }, []);

  const fetchComments = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/get-comments?songId=${id}&roomCode=${roomCode}`);
      if (!res.ok) return;
      const data: Comment[] = await res.json();
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
          const data: Comment[] = await res.json();
          const newest = data[data.length - 1];
          if (newest) addToChat(newest);
        } catch {}
      })();
    };

    festivalChannel.bind("comment-update", onCommentUpdate);
    return () => {
      festivalChannel.unbind("comment-update", onCommentUpdate);
    };
  }, [isEsibizione, songId]);

  return { chatComments };
}