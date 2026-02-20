"use client";

import { useState, useEffect, useRef } from "react";
import { pusherClient } from "@/_lib/pusherClient";

type Vote = {
  id: number;
  user_id: number;
  value: number;
};

type Song = {
  id: number;
  title: string;
  artist: string;
  image_url?: string;
  image_url_nobg?: string;
  votes: Vote[];
};

type FestivalStatus = {
  type: "attesa" | "presentazione" | "esibizione" | "votazione" | "spot" | "pausa" | "fine";
  songId?: number | null;
  song?: Song | null;
};

type User = {
  id: number;
  username: string;
};

type Comment = {
  id: number;
  text: string;
  likes: number;
  dislikes: number;
  user: { username: string };
};

type InteractBoxProps = {
  roomCode: string;
  currentUser: User | undefined;
  users: User[];
  userToken: string | null;
  onVotedUsersChange?: (ids: number[]) => void;
  onShowResults?: (show: boolean) => void;
  onFestivalTypeChange?: (type: string) => void;
  onSongIdChange?: (id: number | null) => void;
};

const GRADIENT = "linear-gradient(135deg, #0d1b4b 0%, #1a1a6e 50%, #0d3b6e 100%)";

export default function InteractBox({
  roomCode,
  currentUser,
  users,
  userToken,
  onVotedUsersChange,
  onShowResults,
  onFestivalTypeChange,
  onSongIdChange,
}: InteractBoxProps) {
  const [festivalState, setFestivalState] = useState<FestivalStatus | null>(null);
  const [voteValue, setVoteValue] = useState<number>(5);
  const [hasVoted, setHasVoted] = useState(false);
  const [showAllVoted, setShowAllVoted] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [visibleComment, setVisibleComment] = useState<Comment | null>(null);
  const allVotedTriggered = useRef(false);
  const commentTimerRef = useRef<NodeJS.Timeout | null>(null);
  const shownCommentIds = useRef<Set<number>>(new Set());

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/festival-status?roomCode=${roomCode}`);
      const data: FestivalStatus = await res.json();
      setFestivalState(data);
    } catch (err) {
      console.error("Errore fetch stato festival", err);
    }
  };

const fetchComments = async (songId: number) => {
  try {
    const res = await fetch(
      `/api/get-comments?songId=${songId}&roomCode=${roomCode}`
    );
    const data: Comment[] = await res.json();
    setComments(data);

    // Mostra subito il primo commento non ancora visto
    const unseen = data.filter((c) => !shownCommentIds.current.has(c.id));
    if (unseen.length === 0) return;

    const next = unseen[0];
    shownCommentIds.current.add(next.id);
    setVisibleComment(next);

    const likeThreshold = Math.ceil(users.length * 0.35);
    const duration = next.likes >= likeThreshold ? 14000 : 8000;

    if (commentTimerRef.current) clearTimeout(commentTimerRef.current);
    commentTimerRef.current = setTimeout(() => {
      setVisibleComment(null);
    }, duration);
  } catch (err) {
    console.error(err);
  }
};

  // Fetch iniziale + Pusher
useEffect(() => {
  fetchStatus();

  const channel = pusherClient.subscribe("festival");

  const handleStatusUpdate = (data: FestivalStatus) => setFestivalState(data);
  const handleVoteUpdate = () => fetchStatus();
  const handleCommentUpdate = ({ songId }: { songId: number }) => fetchComments(songId);

  channel.bind("status-update", handleStatusUpdate);
  channel.bind("vote-update", handleVoteUpdate);
  channel.bind("comment-update", handleCommentUpdate);

  return () => {
    channel.unbind("status-update", handleStatusUpdate);
    channel.unbind("vote-update", handleVoteUpdate);
    channel.unbind("comment-update", handleCommentUpdate);
    // NON fare unsubscribe qui
  };
}, []);
  // Reset quando cambia la canzone
useEffect(() => {
  setHasVoted(false);
  setShowAllVoted(false);
  setShowResults(false);
  setVisibleComment(null);
  setComments([]);
  allVotedTriggered.current = false;
  shownCommentIds.current = new Set();
  onVotedUsersChange?.([]);
  onShowResults?.(false);
  if (commentTimerRef.current) clearTimeout(commentTimerRef.current);
}, [festivalState?.songId, festivalState?.type]);

  // Notifica il parent del tipo
  useEffect(() => {
    if (festivalState?.type) onFestivalTypeChange?.(festivalState.type);
  }, [festivalState?.type]);

  // Notifica il parent del songId
  useEffect(() => {
    onSongIdChange?.(festivalState?.songId ?? null);
  }, [festivalState?.songId]);

  // Controlla se l'utente aveva già votato (in caso di refresh)
  useEffect(() => {
    if (!festivalState?.song || !currentUser) return;
    const votes = festivalState.song.votes ?? [];
    const alreadyVoted = votes.some((v) => v.user_id === currentUser.id);
    if (alreadyVoted) setHasVoted(true);
  }, [festivalState?.song, currentUser]);

  // Notifica il parent con gli utenti che hanno votato
  useEffect(() => {
    if (!festivalState?.song) {
      onVotedUsersChange?.([]);
      return;
    }
    const votes = festivalState.song.votes ?? [];
    onVotedUsersChange?.(votes.map((v) => v.user_id));
  }, [festivalState?.song?.votes?.length]);

  // Notifica il parent quando cambiano i risultati
  useEffect(() => {
    onShowResults?.(showResults);
  }, [showResults]);

  // Gestisce l'animazione "tutti hanno votato" → risultati
  useEffect(() => {
    if (!festivalState?.song || !currentUser) return;
    const votes = festivalState.song.votes ?? [];
    const allVoted = votes.length >= users.length && users.length > 0;

    if (allVoted && !allVotedTriggered.current) {
      allVotedTriggered.current = true;
      setShowAllVoted(true);
      setShowResults(false);

      const timer = setTimeout(() => {
        setShowAllVoted(false);
        setShowResults(true);
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [festivalState?.song?.votes?.length]);

  // Fetch iniziale commenti + rotazione durante esibizione
  useEffect(() => {
    if (festivalState?.type !== "esibizione" || !festivalState.songId) return;

    fetchComments(festivalState.songId);

    const showInterval = setInterval(() => {
      setComments((currentComments) => {
        const unseen = currentComments.filter(
          (c) => !shownCommentIds.current.has(c.id)
        );
        if (unseen.length === 0) return currentComments;

        const next = unseen[0];
        shownCommentIds.current.add(next.id);
        setVisibleComment(next);

        const likeThreshold = Math.ceil(users.length * 0.35);
        const duration = next.likes >= likeThreshold ? 14000 : 8000;

        if (commentTimerRef.current) clearTimeout(commentTimerRef.current);
        commentTimerRef.current = setTimeout(() => {
          setVisibleComment(null);
        }, duration);

        return currentComments;
      });
    }, 10000);

    return () => {
      clearInterval(showInterval);
      if (commentTimerRef.current) clearTimeout(commentTimerRef.current);
    };
  }, [festivalState?.type, festivalState?.songId]);

  if (!festivalState || !currentUser) return null;

  const votes = festivalState.song?.votes ?? [];
  const allVoted = votes.length >= users.length && users.length > 0;
  

  const canVote =
    festivalState.type === "votazione" && !hasVoted && !allVoted && !showResults;

  const handleVote = async () => {
    if (!canVote || !festivalState.songId || !userToken) return;
    try {
      const res = await fetch("/api/add-vote", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({
          roomCode,
          songId: festivalState.songId,
          value: voteValue,
          userToken,
        }),
      });
      if (!res.ok) throw new Error("Errore invio voto");
      setHasVoted(true);
    } catch (err) {
      console.error(err);
    }
  };

  const handleReact = async (commentId: number, type: "like" | "dislike") => {
    try {
      await fetch("/api/react-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commentId, type }),
      });
      setVisibleComment((prev) =>
        prev?.id === commentId
          ? {
              ...prev,
              likes: type === "like" ? prev.likes + 1 : prev.likes,
              dislikes: type === "dislike" ? prev.dislikes + 1 : prev.dislikes,
            }
          : prev
      );
    } catch (err) {
      console.error(err);
    }
  };

  const renderBoxContent = () => {
    switch (festivalState.type) {

      case "esibizione":
        return (
          <>
            {festivalState.song?.image_url_nobg && (
              <img
                src={festivalState.song.image_url_nobg}
                alt={festivalState.song.artist}
                className="absolute bottom-0 left-1/2 -translate-x-1/2 h-full w-auto object-contain object-bottom"
              />
            )}
            <div
              className="absolute bottom-0 left-0 w-full h-2/3"
              style={{ background: "linear-gradient(to top, rgba(0,0,0,0.75) 0%, transparent 100%)" }}
            />

            {visibleComment && (
              <div className="absolute top-3 left-3 right-3 z-20 bg-black/50 backdrop-blur-sm rounded-xl px-3 py-2 flex items-center justify-between gap-2 animate-fadein">
                <div className="text-left min-w-0">
                  <p className="text-xs text-stone-400">{visibleComment.user.username}</p>
                  <p className="text-sm text-white truncate">{visibleComment.text}</p>
                </div>
                <div className="flex gap-2 text-sm flex-shrink-0">
                  <button
                    onClick={() => handleReact(visibleComment.id, "like")}
                    className="flex items-center gap-1 text-green-400"
                  >
                    👍 {visibleComment.likes}
                  </button>
                  <button
                    onClick={() => handleReact(visibleComment.id, "dislike")}
                    className="flex items-center gap-1 text-red-400"
                  >
                    👎 {visibleComment.dislikes}
                  </button>
                </div>
              </div>
            )}

            <div className="absolute bottom-0 left-0 z-10 p-5 text-left">
              {festivalState.song && (
                <>
                  <p className="text-sm text-stone-300 tracking-widest mb-1">
                    {festivalState.song.artist}
                  </p>
                  <h2 className="text-3xl font-black text-white leading-tight">
                    {festivalState.song.title}
                  </h2>
                </>
              )}
            </div>
          </>
        );

      case "votazione":
        return (
          <div className="flex flex-col items-center justify-center w-full h-full text-center px-4">
            <div className="flex items-center gap-1 bg-white/10 rounded-full px-3 py-1 text-xs text-white mb-4">
              🗳 Votare
            </div>

            {!showResults && (
              <>
                <h3 className="text-2xl font-black text-white uppercase mb-1">
                  Alle votazioni
                </h3>
                <p className="text-stone-400 text-sm mb-4">
                  Ora che hai ascoltato la canzone dai un voto.
                </p>
              </>
            )}

            {!hasVoted && !allVoted && (
              <>
                <div
                  className="w-16 h-16 rounded-full flex items-center justify-center text-3xl font-black text-white mb-4"
                  style={{ background: "rgba(0,0,0,0.4)" }}
                >
                  {Math.round(voteValue)}
                </div>
                <input
                  type="range"
                  min={1}
                  max={10}
                  step={0.1}
                  value={voteValue}
                  onChange={(e) => setVoteValue(parseFloat(e.target.value))}
                  className="w-full"
                />
              </>
            )}

            {hasVoted && !allVoted && !showAllVoted && !showResults && (
              <p className="text-stone-400">Voto inviato! In attesa degli altri...</p>
            )}

            {showAllVoted && (
              <p className="text-green-400 font-bold text-xl animate-pulse">
                Tutti hanno votato! 🎉
              </p>
            )}

            {showResults && (
              <ul className="w-full text-left">
                {[...votes]
                  .sort((a, b) => b.value - a.value)
                  .map((v) => {
                    const user = users.find((u) => u.id === v.user_id);
                    return (
                      <li
                        key={v.id}
                        className="flex justify-between border-b border-white/10 py-2"
                      >
                        <span className="text-stone-300">{user?.username ?? "Utente sconosciuto"}</span>
                        <span className="font-bold text-white">{v.value.toFixed(1)}</span>
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        );

      case "presentazione":
        return (
          <div className="flex flex-col items-center justify-center w-full h-full text-center">
            <h3 className="text-2xl uppercase font-extrabold text-white">Presentazione</h3>
            <p className="text-stone-400 mt-1">Carlo Conti sta presentando.</p>
          </div>
        );

      case "spot":
        return (
          <div className="flex flex-col items-center justify-center w-full h-full text-center">
            <h3 className="text-2xl uppercase font-extrabold text-white">Pubblicità</h3>
            <p className="text-stone-400 mt-1">Torniamo tra poco in diretta.</p>
          </div>
        );

      case "pausa":
        return (
          <div className="flex flex-col items-center justify-center w-full h-full text-center">
            <h3 className="text-2xl uppercase font-extrabold text-white">Pausa tecnica</h3>
            <p className="text-stone-400 mt-1">Il festival riprende tra poco.</p>
          </div>
        );

      case "attesa":
        return (
          <div className="flex flex-col items-center justify-center w-full h-full text-center">
            <h3 className="text-2xl uppercase font-extrabold text-white">A breve...</h3>
            <p className="text-stone-400 mt-1">La serata sta per iniziare.</p>
          </div>
        );

      case "fine":
        return (
          <div className="flex flex-col items-center justify-center w-full h-full text-center">
            <h3 className="text-2xl uppercase font-extrabold text-white">Serata conclusa</h3>
            <p className="text-stone-400 mt-1">Grazie per aver partecipato!</p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <div
        key={festivalState.type}
        className="relative w-full rounded-2xl overflow-hidden animate-fadein"
        style={{ height: 280, background: GRADIENT }}
      >
        {renderBoxContent()}
      </div>

      <button
        key={`btn-${festivalState.type}`}
        onClick={handleVote}
        disabled={!canVote}
        className="w-full py-4 rounded-2xl font-black text-white uppercase tracking-widest text-lg animate-fadein transition-opacity"
        style={{
          background: canVote
            ? "linear-gradient(90deg, #1d4ed8, #1e40af)"
            : "rgba(255,255,255,0.08)",
          opacity: canVote ? 1 : 0.5,
          cursor: canVote ? "pointer" : "not-allowed",
        }}
      >
        Conferma
      </button>
    </div>
  );
}