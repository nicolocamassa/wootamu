"use client";
import React, { useState, useEffect, useRef } from "react";
import { pusherClient } from "@/_lib/pusherClient";
import { Mic2, Tv, PauseCircle, Clock, Star, Trophy } from "lucide-react";

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
  type: "attesa" | "presentazione" | "esibizione" | "votazione" | "spot" | "pausa" | "classifica" | "fine";
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

type FloatingReaction = {
  id: number;
  emoji: string;
  x: number;
};

type UserReactionsMap = Record<number, Record<string, number>>;

const REACTIONS = [
  { type: "skull",  emoji: "💀" },
  { type: "fire",   emoji: "🔥" },
  { type: "heart",  emoji: "❤️" },
  { type: "clap",   emoji: "👏" },
  { type: "laugh",  emoji: "😂" },
  { type: "cringe", emoji: "🫣" },
];

type InteractBoxProps = {
  roomCode: string;
  currentUser: User | undefined;
  users: User[];
  userToken: string | null;
  onVotedUsersChange?: (ids: number[]) => void;
  onShowResults?: (show: boolean) => void;
  onFestivalTypeChange?: (type: string) => void;
  onSongIdChange?: (id: number | null) => void;
  onVotesChange?: (votes: Vote[]) => void;
  onHasVotedChange?: (hasVoted: boolean) => void;
};

const RESULTS_DURATION = 60;

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');

  .ib-root { font-family: 'Inter', sans-serif; }

  .ib-card {
    background: #0F0F14;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 18px;
    overflow: hidden;
    position: relative;
    flex: 1;
  }

  @keyframes ib-fadein {
    from { opacity: 0; transform: translateY(5px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .ib-fadein { animation: ib-fadein 0.35s ease both; }

  @keyframes ib-shake {
    0%, 100% { transform: translateX(0); }
    20%       { transform: translateX(-5px); }
    40%       { transform: translateX(5px); }
    60%       { transform: translateX(-4px); }
    80%       { transform: translateX(4px); }
  }
  .ib-shake { animation: ib-shake 0.35s ease both; }

  /* Buttons */
  .ib-btn {
    width: 100%;
    padding: 15px;
    border-radius: 14px;
    border: none;
    font-family: 'Inter', sans-serif;
    font-weight: 700;
    font-size: 13px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
    transition: opacity 0.2s;
  }
  .ib-btn-gold {
    background: #D4AF37;
    color: #0F0F14;
  }
  .ib-btn-gold:hover { opacity: 0.88; }
  .ib-btn-muted {
    background: #1A1A22;
    color: rgba(255,255,255,0.2);
    cursor: not-allowed;
  }
  .ib-btn-live {
    background: #1A1A22;
    color: rgba(255,255,255,0.5);
    cursor: pointer;
  }
  .ib-btn-live:hover { color: rgba(255,255,255,0.75); }
  .ib-btn-danger {
    background: rgba(220,60,60,0.15);
    color: rgba(255,100,100,0.85);
    border: 1px solid rgba(220,60,60,0.25);
    cursor: pointer;
  }
  .ib-btn-danger:hover { background: rgba(220,60,60,0.22); }

  /* Slider */
  .ib-slider {
    -webkit-appearance: none;
    appearance: none;
    width: 100%;
    height: 2px;
    border-radius: 2px;
    outline: none;
    cursor: pointer;
  }
  .ib-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #ffffff;
    cursor: pointer;
    box-shadow: 0 1px 6px rgba(0,0,0,0.6);
    transition: transform 0.15s;
  }
  .ib-slider::-webkit-slider-thumb:hover {
    transform: scale(1.1);
    box-shadow: 0 1px 8px rgba(0,0,0,0.7);
  }

  /* Rank rows */
  .ib-row {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 9px 12px;
    border-radius: 10px;
    border: 1px solid transparent;
  }
  .ib-row-me {
    background: rgba(255,255,255,0.05);
    border-color: rgba(255,255,255,0.09);
  }
  .ib-row-other { background: rgba(255,255,255,0.02); }
  .ib-row-first {
    background: rgba(212,175,55,0.08);
    border-color: rgba(212,175,55,0.25);
  }

  /* Comment toast */
  .ib-toast {
    position: absolute;
    top: 12px; left: 12px; right: 12px;
    z-index: 20;
    background: rgba(15,15,20,0.88);
    backdrop-filter: blur(12px);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 12px;
    padding: 10px 12px;
    animation: ib-fadein 0.3s ease both;
  }

  /* Song overlay */
  .ib-song-overlay {
    position: absolute;
    bottom: 0; left: 0; right: 0;
    padding: 18px;
    background: linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 100%);
  }

  /* Status screens */
  .ib-status-icon {
    width: 40px; height: 40px;
    border-radius: 12px;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.07);
    display: flex; align-items: center; justify-content: center;
    font-size: 18px;
    margin: 0 auto 14px;
  }

  /* Pill badge */
  .ib-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 9px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 0.07em;
    text-transform: uppercase;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.1);
    color: rgba(255,255,255,0.45);
  }

  @keyframes ib-pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.25; }
  }
  .ib-dot {
    width: 5px; height: 5px;
    border-radius: 50%;
    background: rgba(255,255,255,0.5);
    animation: ib-pulse 2.5s ease-in-out infinite;
  }

  /* Reaction bar */
  .ib-reaction-bar {
    display: flex;
    gap: 8px;
    align-items: center;
    background: #0F0F14;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 14px;
    padding: 10px 14px;
    overflow-x: auto;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }
  .ib-reaction-bar::-webkit-scrollbar { display: none; }

  .ib-reaction-btn {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 10px;
    padding: 8px 10px;
    cursor: pointer;
    flex-shrink: 0;
    transition: background 0.15s, transform 0.1s;
    font-size: 20px;
    line-height: 1;
    user-select: none;
  }
  .ib-reaction-btn:active { transform: scale(0.88); background: rgba(255,255,255,0.1); }

  /* Floating reactions */
  @keyframes ib-float {
    0%   { opacity: 1;   transform: translateY(0)   rotate(var(--r)) scale(1); }
    80%  { opacity: 0.8; transform: translateY(-130px) rotate(var(--r)) scale(1.05); }
    100% { opacity: 0;   transform: translateY(-170px) rotate(var(--r)) scale(0.8); }
  }
  .ib-float {
    position: absolute;
    bottom: 60px;
    font-size: 20px;
    pointer-events: none;
    animation: ib-float 2.2s ease-out forwards;
    z-index: 30;
    line-height: 1;
  }

  /* Combo counter */
  @keyframes ib-combo-pop {
    0%   { transform: scale(1.4); opacity: 1; }
    100% { transform: scale(1);   opacity: 1; }
  }
  .ib-combo {
    position: absolute;
    top: 12px;
    left: 12px;
    z-index: 25;
    display: flex;
    align-items: center;
    gap: 5px;
    background: rgba(0,0,0,0.55);
    backdrop-filter: blur(8px);
    border: 1px solid rgba(255,255,255,0.1);
    border-radius: 999px;
    padding: 4px 10px 4px 7px;
    animation: ib-combo-pop 0.2s ease both;
  }

  /* React buttons */
  .ib-react-btn {
    display: flex; align-items: center; gap: 4px;
    font-size: 12px; font-weight: 500;
    padding: 3px 8px; border-radius: 8px;
    border: none;
    background: rgba(255,255,255,0.06);
    cursor: pointer;
    color: rgba(255,255,255,0.5);
    font-family: 'Inter', sans-serif;
    transition: background 0.15s;
  }
  .ib-react-btn:hover { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.75); }

  /* Skip confirm overlay */
  @keyframes ib-overlay-in {
    from { opacity: 0; transform: translateY(6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .ib-skip-overlay {
    position: absolute;
    inset: 0;
    z-index: 40;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 10px;
    padding: 24px;
    background: rgba(15,15,20,0.92);
    backdrop-filter: blur(10px);
    animation: ib-overlay-in 0.25s ease both;
  }

  /* Gold glow pulse for classifica finale */
  @keyframes ib-gold-glow {
    0%, 100% { box-shadow: 0 0 0px rgba(212,175,55,0); border-color: rgba(212,175,55,0.2); }
    50%       { box-shadow: 0 0 18px rgba(212,175,55,0.18); border-color: rgba(212,175,55,0.45); }
  }
  .ib-card-gold {
    animation: ib-gold-glow 2.5s ease-in-out infinite;
  }

  /* Countdown number pop */
  @keyframes ib-count-pop {
    0%   { opacity: 0; transform: scale(1.4); }
    40%  { opacity: 1; transform: scale(0.95); }
    100% { opacity: 1; transform: scale(1); }
  }
`;

function StatusScreen({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center", padding: "0 24px" }}>
      <div className="ib-status-icon">{icon}</div>
      <div style={{ fontSize: 18, fontWeight: 700, color: "#ededed", marginBottom: 6 }}>{title}</div>
      <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", lineHeight: 1.5 }}>{sub}</div>
    </div>
  );
}

export default function InteractBox({
  roomCode,
  currentUser,
  users,
  userToken,
  onVotedUsersChange,
  onShowResults,
  onFestivalTypeChange,
  onSongIdChange,
  onVotesChange,
  onHasVotedChange,
}: InteractBoxProps) {
  const [festivalState, setFestivalState] = useState<FestivalStatus | null>(null);
  const [voteValue, setVoteValue] = useState<number>(5);
  const [hasVoted, setHasVoted] = useState(false);
  const [hasSkipped, setHasSkipped] = useState(false);
  const [skipConfirm, setSkipConfirm] = useState(false);
  const [displayVotes, setDisplayVotes] = useState<Vote[]>([]);
  const songIdForVotesRef = useRef<number | null>(null);
  const [finalLeaderboard, setFinalLeaderboard] = useState<{ id: number; title: string; artist: string; average: number | null; voteCount: number }[]>([]);
  const [finalCountdown, setFinalCountdown] = useState<number | null>(null); // 3,2,1 prima di mostrare
  const [showFinalLeaderboard, setShowFinalLeaderboard] = useState(false);
  const [lbView, setLbView] = useState<"stanza" | "mia">("stanza");
  const [myVotes, setMyVotes] = useState<{ songId: number; value: number }[]>([]);
  const finalCountdownRef = useRef<NodeJS.Timeout | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [hasPendingState, setHasPendingState] = useState(false);
  const [comments, setComments] = useState<Comment[]>([]);
  const [visibleComment, setVisibleComment] = useState<Comment | null>(null);

  const [floatingReactions, setFloatingReactions] = useState<FloatingReaction[]>([]);
  const [combo, setCombo] = useState<{ emoji: string; count: number } | null>(null);
  const [userReactions, setUserReactions] = useState<UserReactionsMap>({});
  const comboTimerRef = useRef<NodeJS.Timeout | null>(null);
  const floatIdRef = useRef(0);
  const reactionCooldownRef = useRef<Record<string, boolean>>({});

  const commentTimerRef = useRef<NodeJS.Timeout | null>(null);
  const shownCommentIds = useRef<Set<number>>(new Set());
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const showResultsRef = useRef(false);
  const pendingStateRef = useRef<FestivalStatus | null>(null);

  useEffect(() => { showResultsRef.current = showResults; }, [showResults]);
  const hasVotedRef = useRef(false);
  useEffect(() => { hasVotedRef.current = hasVoted; onHasVotedChange?.(hasVoted); }, [hasVoted]);
  const festivalStateRef = useRef<FestivalStatus | null>(null);
  useEffect(() => { festivalStateRef.current = festivalState; }, [festivalState]);

  const fetchStatus = async () => {
    try {
      const res = await fetch(`/api/festival-status?roomCode=${roomCode}`);
      const data: FestivalStatus = await res.json();
      if (hasVotedRef.current === false && data.type === "votazione") {
        setFestivalState((prev) => {
          if (!prev || prev.type !== "votazione") return prev ?? data;
          return { ...prev, song: prev.song ? { ...prev.song, votes: data.song?.votes ?? [] } : prev.song };
        });
        return;
      }
      if (showResultsRef.current) { pendingStateRef.current = data; setHasPendingState(true); }
      else setFestivalState(data);
    } catch (err) { console.error(err); }
  };

  const fetchVotes = async (songId?: number) => {
    try {
      const sid = songId ?? songIdForVotesRef.current;
      if (!sid) return;
      const res = await fetch(`/api/get-votes?songId=${sid}`);
      const votes: Vote[] = await res.json();
      setDisplayVotes(votes);
      setFestivalState((prev) => {
        if (!prev?.song || prev.song.id !== sid) return prev;
        return { ...prev, song: { ...prev.song, votes } };
      });
    } catch (err) { console.error(err); }
  };

  const fetchComments = async (songId: number) => {
    try {
      const res = await fetch(`/api/get-comments?songId=${songId}&roomCode=${roomCode}`);
      const data: Comment[] = await res.json();
      setComments(data);
    } catch (err) { console.error(err); }
  };

  const fetchReactions = async (songId: number) => {
    try {
      const res = await fetch(`/api/get-reactions?songId=${songId}&roomCode=${roomCode}`);
      const data: { user_id: number; type: string; count: number }[] = await res.json();
      const map: UserReactionsMap = {};
      for (const row of data) {
        if (!map[row.user_id]) map[row.user_id] = {};
        const emoji = REACTIONS.find((r) => r.type === row.type)?.emoji ?? row.type;
        map[row.user_id][emoji] = (map[row.user_id][emoji] ?? 0) + row.count;
      }
      setUserReactions(map);
    } catch (err) { console.error(err); }
  };

  const fetchFinalLeaderboard = async () => {
    try {
      const res = await fetch(`/api/room-leaderboard?roomCode=${roomCode}`);
      if (!res.ok) return;
      const data = await res.json();
      setFinalLeaderboard(data);
    } catch (err) { console.error(err); }
  };

  const fetchMyVotes = async () => {
    if (!userToken) return;
    try {
      const res = await fetch(`/api/get-my-votes?roomCode=${roomCode}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (!res.ok) return;
      const data: { songId: number; value: number }[] = await res.json();
      setMyVotes(data);
    } catch (err) { console.error(err); }
  };

  const handleReaction = async (reactionType: string, emoji: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!festivalState?.songId || !userToken) return;
    if (reactionCooldownRef.current[reactionType]) return;
    reactionCooldownRef.current[reactionType] = true;
    setTimeout(() => { reactionCooldownRef.current[reactionType] = false; }, 300);
    try {
      await fetch("/api/add-reaction", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ type: reactionType, songId: festivalState.songId, roomCode }),
      });
    } catch (err) { console.error(err); }
  };

  const closeResults = () => {
    setShowResults(false);
    showResultsRef.current = false;
    setTimeLeft(null);
    setHasPendingState(false);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (pendingStateRef.current) { setFestivalState(pendingStateRef.current); pendingStateRef.current = null; }
  };

  useEffect(() => {
    fetchStatus();
    pusherClient.unsubscribe("festival");
    const channel = pusherClient.subscribe("festival");

    const handleStatusUpdate = (data: FestivalStatus) => {
      if (hasVotedRef.current === false && festivalStateRef.current?.type === "votazione") {
        pendingStateRef.current = data;
        setHasPendingState(true);
        return;
      }
      if (showResultsRef.current) { pendingStateRef.current = data; setHasPendingState(true); }
      else setFestivalState(data);
    };
    const handleVoteUpdate = () => { fetchVotes(); };
    const handleCommentUpdate = ({ songId }: { songId: number }) => fetchComments(songId);

    const handleReactionUpdate = ({ emoji, user_id }: { emoji: string; user_id?: number }) => {
      const id = floatIdRef.current++;
      const x = Math.random() * 30 + 5;
      setFloatingReactions((prev) => [...prev, { id, emoji, x }]);
      setTimeout(() => setFloatingReactions((prev) => prev.filter((r) => r.id !== id)), 2400);
      if (user_id !== undefined) {
        setUserReactions((prev) => {
          const userMap = { ...(prev[user_id] ?? {}) };
          userMap[emoji] = (userMap[emoji] ?? 0) + 1;
          return { ...prev, [user_id]: userMap };
        });
      }
      setCombo((prev) => {
        const count = prev?.emoji === emoji ? prev.count + 1 : 1;
        if (comboTimerRef.current) clearTimeout(comboTimerRef.current);
        comboTimerRef.current = setTimeout(() => setCombo(null), 2000);
        return { emoji, count };
      });
    };

    channel.bind("status-update", handleStatusUpdate);
    channel.bind("vote-update", handleVoteUpdate);
    channel.bind("comment-update", handleCommentUpdate);
    channel.bind("reaction-update", handleReactionUpdate);

    return () => {
      channel.unbind("status-update", handleStatusUpdate);
      channel.unbind("vote-update", handleVoteUpdate);
      channel.unbind("comment-update", handleCommentUpdate);
      channel.unbind("reaction-update", handleReactionUpdate);
      pusherClient.unsubscribe("festival");
    };
  }, []);

  useEffect(() => {
    setHasVoted(false);
    setHasSkipped(false);
    setSkipConfirm(false);
    setShowResults(false);
    showResultsRef.current = false;
    setTimeLeft(null);
    setHasPendingState(false);
    setVisibleComment(null);
    setComments([]);
    setUserReactions({});
    setDisplayVotes([]);
    shownCommentIds.current = new Set();
    pendingStateRef.current = null;
    onVotedUsersChange?.([]);
    onShowResults?.(false);
    if (commentTimerRef.current) clearTimeout(commentTimerRef.current);
    if (countdownRef.current) clearInterval(countdownRef.current);
    if (festivalState?.songId) songIdForVotesRef.current = festivalState.songId;
  }, [festivalState?.songId]);

  useEffect(() => {
    if (!showResultsRef.current && festivalState?.type !== "votazione") {
      setShowResults(false);
      setTimeLeft(null);
      if (countdownRef.current) clearInterval(countdownRef.current);
    }
  }, [festivalState?.type]);

  useEffect(() => { if (timeLeft === 0) closeResults(); }, [timeLeft]);
  useEffect(() => { if (festivalState?.type) onFestivalTypeChange?.(festivalState.type); }, [festivalState?.type]);
  useEffect(() => { onSongIdChange?.(festivalState?.songId ?? null); }, [festivalState?.songId]);
  useEffect(() => {
    if (festivalState?.type === "classifica") {
      // Fetch in anticipo mentre il countdown scorre
      fetchFinalLeaderboard();
      fetchMyVotes();
      setShowFinalLeaderboard(false);
      setFinalCountdown(3);
      if (finalCountdownRef.current) clearInterval(finalCountdownRef.current);
      finalCountdownRef.current = setInterval(() => {
        setFinalCountdown((prev) => {
          if (prev === null) return null;
          if (prev <= 1) {
            clearInterval(finalCountdownRef.current!);
            setShowFinalLeaderboard(true);
            return null;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (finalCountdownRef.current) clearInterval(finalCountdownRef.current);
      setFinalCountdown(null);
      setShowFinalLeaderboard(false);
    }
    return () => { if (finalCountdownRef.current) clearInterval(finalCountdownRef.current); };
  }, [festivalState?.type]);

  useEffect(() => {
    if (!festivalState?.song || !currentUser) return;
    const votes = festivalState.song.votes ?? [];
    if (votes.some((v) => v.user_id === currentUser.id)) setHasVoted(true);
  }, [festivalState?.song, currentUser]);

  useEffect(() => {
    const v = displayVotes.length > 0 ? displayVotes : (festivalState?.song?.votes ?? []);
    onVotedUsersChange?.(v.map((vv) => vv.user_id));
    onVotesChange?.(v);
  }, [festivalState?.song?.votes?.length, displayVotes.length]);

  useEffect(() => { onShowResults?.(showResults); }, [showResults]);

  const triggerResults = () => {
    if (showResults) return;
    setShowResults(true);
    showResultsRef.current = true;
    onShowResults?.(true);
    setTimeLeft(RESULTS_DURATION);
    countdownRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) { clearInterval(countdownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    if (festivalState?.type !== "esibizione" || !festivalState.songId) return;
    fetchComments(festivalState.songId);
    fetchReactions(festivalState.songId);
    const showInterval = setInterval(() => {
      setComments((curr) => {
        const unseen = curr.filter((c) => !shownCommentIds.current.has(c.id));
        if (!unseen.length) return curr;
        const next = unseen[0];
        shownCommentIds.current.add(next.id);
        setVisibleComment(next);
        const duration = next.likes >= Math.ceil(users.length * 0.35) ? 14000 : 8000;
        if (commentTimerRef.current) clearTimeout(commentTimerRef.current);
        commentTimerRef.current = setTimeout(() => setVisibleComment(null), duration);
        return curr;
      });
    }, 10000);
    return () => { clearInterval(showInterval); if (commentTimerRef.current) clearTimeout(commentTimerRef.current); };
  }, [festivalState?.type, festivalState?.songId]);

  if (!festivalState || !currentUser) return null;

  const votes = displayVotes.length > 0 ? displayVotes : (festivalState.song?.votes ?? []);
  const canVote = festivalState.type === "votazione" && !hasVoted && !hasSkipped && !showResults;

  const handleVote = async () => {
    if (!canVote || !festivalState.songId || !userToken) return;
    try {
      const res = await fetch("/api/add-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${userToken}` },
        body: JSON.stringify({ roomCode, songId: festivalState.songId, value: voteValue, userToken }),
      });
      if (!res.ok) throw new Error("Errore invio voto");
      setHasVoted(true);
      hasVotedRef.current = true;
      setSkipConfirm(false);
      triggerResults();
      await fetchVotes(festivalState.songId);
    } catch (err) { console.error(err); }
  };

  const handleSkipConfirmed = () => {
    setHasSkipped(true);
    setSkipConfirm(false);
    // Tratta lo skip come "ha votato" per sbloccare il flusso
    hasVotedRef.current = true;
    onHasVotedChange?.(true);
    triggerResults();
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
          ? { ...prev, likes: type === "like" ? prev.likes + 1 : prev.likes, dislikes: type === "dislike" ? prev.dislikes + 1 : prev.dislikes }
          : prev
      );
    } catch (err) { console.error(err); }
  };

  // ─── CLASSIFICA ────────────────────────────────────────────────────────────
  const renderClassifica = () => {
    const sortedUsers = [...users].sort((a, b) => {
      const vA = votes.find((v) => v.user_id === a.id)?.value ?? -1;
      const vB = votes.find((v) => v.user_id === b.id)?.value ?? -1;
      return vB - vA;
    });
    const votedList = votes.filter((v) => v.value !== undefined);
    const average = votedList.length > 0
      ? votedList.reduce((sum, v) => sum + v.value, 0) / votedList.length
      : null;
    const circ = 2 * Math.PI * 10;

    return (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "16px 14px 14px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexShrink: 0 }}>
          <span className="ib-pill">
            <span className="ib-dot" />
            Risultati
          </span>
          {timeLeft !== null && timeLeft > 0 && (
            <div style={{ position: "relative", width: 30, height: 30 }}>
              <svg width="30" height="30" viewBox="0 0 24 24" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
                <circle
                  cx="12" cy="12" r="10"
                  fill="none"
                  stroke="rgba(255,255,255,0.3)"
                  strokeWidth="1.5"
                  strokeDasharray={`${circ}`}
                  strokeDashoffset={`${circ * (1 - timeLeft / RESULTS_DURATION)}`}
                  strokeLinecap="round"
                  style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <span style={{
                position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: "'DM Mono', monospace", fontSize: 8, color: "rgba(255,255,255,0.35)",
              }}>
                {timeLeft}
              </span>
            </div>
          )}
        </div>

        <div style={{ flexShrink: 0, marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
          {average !== null ? (
            <>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 52, fontWeight: 400, color: "#ededed", lineHeight: 1, letterSpacing: "-1px" }}>
                {average.toFixed(1)}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginTop: 4 }}>
                {votedList.length} {votedList.length === 1 ? "voto" : "voti"}
              </div>
            </>
          ) : (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.22)" }}>In attesa dei voti…</div>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 5, overflowY: "auto", flex: 1 }}>
          {sortedUsers.map((u, i) => {
            const vote = votes.find((v) => v.user_id === u.id);
            const isMe = u.id === currentUser.id;
            const isFirst = vote && i === 0;
            let rowClass = "ib-row ";
            if (isFirst) rowClass += "ib-row-first";
            else if (isMe) rowClass += "ib-row-me";
            else rowClass += "ib-row-other";
            return (
              <div key={u.id} className={rowClass}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: isFirst ? "#D4AF37" : "rgba(255,255,255,0.2)", width: 16, textAlign: "center", flexShrink: 0 }}>
                  {vote ? (isFirst ? <Trophy size={11} color="#D4AF37" strokeWidth={2} /> : i + 1) : "—"}
                </span>
                <span style={{ flex: 1, fontSize: 13, fontWeight: isMe ? 700 : 400, color: isFirst ? "#ededed" : isMe ? "#ededed" : "rgba(255,255,255,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {u.username}
                  {isMe && <span style={{ color: isFirst ? "rgba(212,175,55,0.4)" : "rgba(255,255,255,0.22)", fontWeight: 400 }}> · tu</span>}
                  {isMe && hasSkipped && <span style={{ color: "rgba(255,100,100,0.4)", fontWeight: 400 }}> · saltato</span>}
                </span>
                {(() => {
                  const rMap = userReactions[u.id];
                  if (!rMap) return null;
                  const topEmoji = Object.entries(rMap).sort((a, b) => b[1] - a[1])[0];
                  if (!topEmoji) return null;
                  const total = Object.values(rMap).reduce((s, n) => s + n, 0);
                  return (
                    <span style={{
                      display: "inline-flex", alignItems: "center", gap: 3,
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 999,
                      padding: "2px 7px",
                      fontSize: 11,
                      fontFamily: "'DM Mono', monospace",
                      color: "rgba(255,255,255,0.45)",
                      flexShrink: 0,
                      marginRight: 4,
                    }}>
                      <span style={{ fontSize: 13, lineHeight: 1 }}>{topEmoji[0]}</span>
                      <span>×{total}</span>
                    </span>
                  );
                })()}
                {vote
                  ? <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, color: isFirst ? "#D4AF37" : "#ededed" }}>{vote.value.toFixed(1)}</span>
                  : <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "rgba(255,255,255,0.15)" }}>—</span>
                }
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ─── CLASSIFICA FINALE ────────────────────────────────────────────────────
  const renderClassificaFinale = () => {
    const withVotes = finalLeaderboard.filter((s) => s.average !== null);
    const overall = withVotes.length > 0
      ? withVotes.reduce((sum, s) => sum + s.average!, 0) / withVotes.length
      : null;
    const circ = 2 * Math.PI * 10;
    const FINAL_DURATION = 10;

    // ── Schermo countdown ──
    if (!showFinalLeaderboard) {
      return (
        <div style={{
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          height: "100%", gap: 12, textAlign: "center", padding: "0 24px",
        }}>
          <Trophy size={22} color="#D4AF37" strokeWidth={1.5} style={{ opacity: 0.7 }} />
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", textTransform: "uppercase", margin: 0 }}>
            Classifica finale
          </p>
          {finalCountdown !== null && (
            <div
              key={finalCountdown}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: 72,
                fontWeight: 400,
                color: "#D4AF37",
                lineHeight: 1,
                letterSpacing: "-2px",
                animation: "ib-count-pop 0.35s ease both",
              }}
            >
              {finalCountdown}
            </div>
          )}
        </div>
      );
    }

    // ── Classifica vera ──
    // Classifica personale: canzoni ordinate per voto dell'utente corrente
    // Mappa voti personali: songId → myVote
    const myVotesMap = new Map<number, number>(myVotes.map((v) => [v.songId, v.value]));
    const personalList = [...finalLeaderboard].sort((a, b) => {
      const vA = myVotesMap.get(a.id) ?? null;
      const vB = myVotesMap.get(b.id) ?? null;
      if (vA !== null && vB !== null) return vB - vA;
      if (vA !== null) return -1;
      if (vB !== null) return 1;
      if (a.average !== null && b.average !== null) return b.average - a.average;
      return 0;
    });

    const activeList = lbView === "stanza" ? finalLeaderboard : personalList;
    const roomRankMap = new Map(finalLeaderboard.map((s, i) => [s.id, i + 1]));

    return (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "16px 14px 14px" }}>

        {/* Header con toggle */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexShrink: 0 }}>
          <span className="ib-pill" style={{ borderColor: "rgba(212,175,55,0.25)", color: "rgba(212,175,55,0.8)" }}>
            <Trophy size={9} color="#D4AF37" strokeWidth={2} />
            Classifica serata
          </span>

          {/* Toggle stanza / mia */}
          <div style={{
            display: "flex",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.07)",
            borderRadius: 8,
            padding: 2,
            gap: 2,
          }}>
            {(["stanza", "mia"] as const).map((v) => (
              <button
                key={v}
                onClick={() => setLbView(v)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 6,
                  border: "none",
                  fontFamily: "'Inter', sans-serif",
                  fontSize: 10,
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  cursor: "pointer",
                  transition: "background 0.15s, color 0.15s",
                  background: lbView === v ? "rgba(255,255,255,0.09)" : "transparent",
                  color: lbView === v ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.28)",
                }}
              >
                {v === "stanza" ? "Stanza" : "La mia"}
              </button>
            ))}
          </div>
        </div>

        {/* Media / subtitle */}
        {lbView === "stanza" ? (
          overall !== null && (
            <div style={{ flexShrink: 0, marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 52, fontWeight: 400, color: "#ededed", lineHeight: 1, letterSpacing: "-1px" }}>
                {overall.toFixed(2)}
              </div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginTop: 4 }}>
                media serata · {withVotes.length} {withVotes.length === 1 ? "canzone" : "canzoni"}
              </div>
            </div>
          )
        ) : (
          <div style={{ flexShrink: 0, marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", lineHeight: 1.5 }}>
              Le canzoni ordinate per il tuo voto personale.<br />
              <span style={{ fontSize: 10, color: "rgba(255,255,255,0.15)" }}>Il numero grigio indica la posizione in classifica stanza.</span>
            </div>
          </div>
        )}

        {/* Lista */}
        <div style={{ display: "flex", flexDirection: "column", gap: 5, overflowY: "auto", flex: 1 }}>
          {activeList.length === 0 ? (
            <div style={{ fontSize: 13, color: "rgba(255,255,255,0.22)", textAlign: "center", paddingTop: 24 }}>
              Caricamento…
            </div>
          ) : (
            activeList.map((song, i) => {
              const hasVotes = song.average !== null;
              const isFirst = lbView === "stanza" && hasVotes && i === 0;
              const myVote = myVotesMap.get(song.id) ?? null;
              const roomRank = lbView === "mia" ? roomRankMap.get(song.id) : null;

              let rowClass = "ib-row ";
              if (isFirst) rowClass += "ib-row-first";
              else rowClass += "ib-row-other";

              return (
                <div key={song.id} className={rowClass} style={{ opacity: hasVotes ? 1 : 0.4 }}>
                  {/* Posizione */}
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: isFirst ? "#D4AF37" : "rgba(255,255,255,0.2)", width: 16, textAlign: "center", flexShrink: 0 }}>
                    {isFirst ? <Trophy size={11} color="#D4AF37" strokeWidth={2} /> : i + 1}
                  </span>

                  {/* Titolo + artista */}
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: isFirst ? 700 : 400, color: hasVotes ? "#ededed" : "rgba(255,255,255,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {song.title}
                    </span>
                    <span style={{ display: "block", fontSize: 9, color: isFirst ? "rgba(212,175,55,0.6)" : "rgba(255,255,255,0.25)", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 1 }}>
                      {song.artist}
                    </span>
                  </span>

                  {/* In vista "mia": posizione stanza a confronto */}
                  {lbView === "mia" && roomRank !== null && (
                    <span style={{
                      fontFamily: "'DM Mono', monospace", fontSize: 10,
                      color: "rgba(255,255,255,0.18)",
                      flexShrink: 0, marginRight: 6,
                    }}>
                      #{roomRank}
                    </span>
                  )}

                  {/* In vista "stanza": numero voti */}
                  {lbView === "stanza" && hasVotes && (
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.2)", flexShrink: 0, marginRight: 6 }}>
                      {song.voteCount}v
                    </span>
                  )}

                  {/* Valore: in vista "mia" mostra il mio voto se disponibile */}
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: isFirst ? 17 : 15, color: isFirst ? "#D4AF37" : hasVotes ? "#ededed" : "rgba(255,255,255,0.15)", flexShrink: 0 }}>
                    {lbView === "mia" && myVote !== null
                      ? myVote.toFixed(1)
                      : hasVotes ? song.average!.toFixed(1) : "—"}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    );
  };

  // ─── CONTENT ───────────────────────────────────────────────────────────
  const renderBoxContent = () => {
    if (showResults) return renderClassifica();

    switch (festivalState.type) {
      case "esibizione":
        return (
          <>
            {festivalState.song?.image_url && (
              <>
                <img
                  src={festivalState.song.image_url}
                  alt={festivalState.song.artist}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }}
                />
                <div style={{
                  position: "absolute", inset: 0,
                  background: visibleComment ? "rgba(0,0,0,0.35)" : "rgba(0,0,0,0.62)",
                  transition: "background 0.6s ease",
                }} />
              </>
            )}
            {visibleComment && (
              <div className="ib-toast">
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                  <div style={{ minWidth: 0 }}>
                    <p style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginBottom: 3, fontWeight: 500, letterSpacing: "0.05em" }}>
                      {visibleComment.user.username}
                    </p>
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.8)", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {visibleComment.text}
                    </p>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <button className="ib-react-btn" onClick={() => handleReact(visibleComment.id, "like")}>👍 {visibleComment.likes}</button>
                    <button className="ib-react-btn" onClick={() => handleReact(visibleComment.id, "dislike")}>👎 {visibleComment.dislikes}</button>
                  </div>
                </div>
              </div>
            )}
            {combo && combo.count >= 2 && (
              <div className="ib-combo" key={combo.count}>
                <span style={{ fontSize: 16 }}>{combo.emoji}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 500, color: "#ededed" }}>x{combo.count}</span>
              </div>
            )}
            {floatingReactions.map((r) => (
              <div key={r.id} className="ib-float" style={{ right: `${r.x}%`, "--r": `${(Math.random() - 0.5) * 20}deg` } as React.CSSProperties}>
                {r.emoji}
              </div>
            ))}
            <div className="ib-song-overlay">
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4, fontWeight: 500 }}>
                {festivalState.song?.artist}
              </p>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: "#ededed", lineHeight: 1.2, letterSpacing: "-0.3px", margin: 0 }}>
                {festivalState.song?.title}
              </h2>
            </div>
          </>
        );

      case "votazione":
        return (
          <>
            {/* Overlay di conferma skip */}
            {skipConfirm && (
              <div className="ib-skip-overlay">
                <div style={{ fontSize: 28, marginBottom: 4 }}>🤔</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: "#ededed", textAlign: "center" }}>
                  Saltare il voto?
                </div>
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", textAlign: "center", lineHeight: 1.5, maxWidth: 220 }}>
                  Non potrai votare questa canzone. La tua scelta non sarà visibile agli altri.
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8, width: "100%", marginTop: 8 }}>
                  <button
                    className="ib-btn ib-btn-danger"
                    onClick={handleSkipConfirmed}
                  >
                    Sì, salta il voto
                  </button>
                  <button
                    className="ib-btn ib-btn-live"
                    onClick={() => setSkipConfirm(false)}
                  >
                    Annulla
                  </button>
                </div>
              </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", height: "100%", padding: "24px 22px" }}>
              {!hasVoted && !hasSkipped ? (
                <>
                  {festivalState.song && (
                    <div style={{ textAlign: "center", marginBottom: 20 }}>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 500, marginBottom: 4 }}>
                        {festivalState.song.artist}
                      </div>
                      <div style={{ fontSize: 17, fontWeight: 700, color: "#ededed", letterSpacing: "-0.3px", lineHeight: 1.2 }}>
                        {festivalState.song.title}
                      </div>
                    </div>
                  )}
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 56, fontWeight: 400, color: "#ededed", lineHeight: 1, letterSpacing: "-1px", marginBottom: 4 }}>
                    {voteValue.toFixed(1)}
                  </div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", marginBottom: 28, letterSpacing: "0.05em" }}>
                    su 10
                  </div>
                  <div style={{ width: "100%" }}>
                    <input
                      type="range" min={1} max={10} step={0.1}
                      value={voteValue}
                      onChange={(e) => setVoteValue(parseFloat(e.target.value))}
                      className="ib-slider"
                      style={{
                        background: `linear-gradient(to right, rgba(255,255,255,0.6) 0%, rgba(255,255,255,0.6) ${(voteValue - 1) / 9 * 100}%, rgba(255,255,255,0.1) ${(voteValue - 1) / 9 * 100}%, rgba(255,255,255,0.1) 100%)`,
                      }}
                    />
                    <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                        <span key={n} style={{
                          fontFamily: "'DM Mono', monospace", fontSize: 9,
                          color: Math.round(voteValue) === n ? "rgba(255,255,255,0.55)" : "rgba(255,255,255,0.12)",
                          transition: "color 0.15s",
                        }}>
                          {n}
                        </span>
                      ))}
                    </div>
                  </div>
                  {/* Skip — subito sotto lo slider, centrato, rossastro tenue */}
                  <button
                    onClick={() => setSkipConfirm(true)}
                    style={{
                      marginTop: 18,
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      fontSize: 11,
                      color: "rgba(200,80,80,0.5)",
                      fontFamily: "'Inter', sans-serif",
                      letterSpacing: "0.04em",
                      padding: 0,
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = "rgba(200,80,80,0.75)")}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "rgba(200,80,80,0.5)")}
                  >
                    Salta il voto
                  </button>
                </>
              ) : (
                <div style={{ textAlign: "center" }}>
                  <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.55)", marginBottom: 4 }}>
                    {hasSkipped ? "Voto saltato" : "Voto inviato"}
                  </p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.22)" }}>In attesa degli altri…</p>
                </div>
              )}
            </div>
          </>
        );

      case "classifica":
        return renderClassificaFinale();

      case "presentazione":
        return <StatusScreen icon={<Mic2 size={20} color="#D4AF37" strokeWidth={1.5} />} title="Presentazione" sub="Carlo Conti sta presentando il prossimo artista." />;
      case "spot":
        return <StatusScreen icon={<Tv size={20} color="#D4AF37" strokeWidth={1.5} />} title="Pubblicità" sub="Torniamo tra poco in diretta." />;
      case "pausa":
        return <StatusScreen icon={<PauseCircle size={20} color="#D4AF37" strokeWidth={1.5} />} title="Pausa tecnica" sub="Il festival riprende tra poco." />;
      case "attesa":
        return <StatusScreen icon={<Clock size={20} color="#D4AF37" strokeWidth={1.5} />} title="A breve…" sub="La serata sta per iniziare." />;
      case "fine":
        return <StatusScreen icon={<Star size={20} color="#D4AF37" strokeWidth={1.5} />} title="Serata conclusa" sub="Grazie per aver partecipato!" />;
      default:
        return null;
    }
  };

  // ─── BUTTON ────────────────────────────────────────────────────────────
  const renderButton = () => {
    if (showResults) {
      return (
        <button onClick={closeResults} className={`ib-btn ${hasPendingState ? "ib-btn-gold" : "ib-btn-live"}`}>
          {hasPendingState ? "↩ Torna al live" : "Chiudi classifica"}
        </button>
      );
    }
    if (canVote) {
      return (
        <button onClick={handleVote} className="ib-btn ib-btn-gold">
          Conferma voto
        </button>
      );
    }
    if (festivalState?.type === "classifica") {
      return (
        <button disabled className="ib-btn ib-btn-muted">
          Classifica finale
        </button>
      );
    }
    if (festivalState?.type === "esibizione") {
      return (
        <div className="ib-reaction-bar">
          {REACTIONS.map((r) => (
            <button key={r.type} className="ib-reaction-btn" onClick={(e) => handleReaction(r.type, r.emoji, e)}>
              {r.emoji}
            </button>
          ))}
        </div>
      );
    }
    return (
      <button disabled className="ib-btn ib-btn-muted">
        {hasVoted ? "Voto inviato" : hasSkipped ? "Voto saltato" : "Conferma"}
      </button>
    );
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: styles }} />
      <div className="ib-root ib-fadein" style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%", padding: "0 0px" }}>
        <div className={`ib-card${festivalState?.type === "classifica" ? " ib-card-gold" : ""}`} style={{ flex: 1, minHeight: 0 }}>{renderBoxContent()}</div>
        <div style={{ flexShrink: 0 }}>{renderButton()}</div>
      </div>
    </>
  );
}