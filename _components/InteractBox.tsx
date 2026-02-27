"use client";
// InteractBox.tsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Mic2, Tv, PauseCircle, Clock, Star, Trophy, Heart } from "lucide-react";

import { useFestival } from "./UseFestival";
import { useVoting } from "./UseVoting";
import { useComments } from "./UseComments";
import { useReactions, REACTIONS } from "./UseReactions";
import { Classifica } from "./Classifica";
import { VotingBox } from "./VotingBox";
import type { User, UserRoom, Vote } from "./types";

type InteractBoxProps = {
  roomCode: string;
  currentUser: User | undefined;
  users: User[];
  userToken: string | null;
  onVotedUsersChange?: (profileIds: number[]) => void;
  onShowResults?: (show: boolean) => void;
  onFestivalTypeChange?: (type: string) => void;
  onSongIdChange?: (id: number | null) => void;
  onVotesChange?: (votes: Vote[]) => void;
  onHasVotedChange?: (hasVoted: boolean) => void;
  userRooms?: UserRoom[];
};

const RESULTS_DURATION = 60;
const VOTING_OPEN_STATES = ["votazione", "presentazione", "spot", "pausa"];

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');

  .ib-root { font-family: 'Inter', sans-serif; }
  .ib-card { background: #0F0F14; border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; overflow: hidden; position: relative; flex: 1; }
  @keyframes ib-fadein { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
  .ib-fadein { animation: ib-fadein 0.35s ease both; }
  .ib-btn { width: 100%; padding: 15px; border-radius: 14px; border: none; font-family: 'Inter', sans-serif; font-weight: 700; font-size: 13px; letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; transition: opacity 0.2s; }
  .ib-btn-gold { background: #D4AF37; color: #0F0F14; }
  .ib-btn-gold:hover { opacity: 0.88; }
  .ib-btn-gold:disabled { opacity: 0.6; cursor: not-allowed; }
  .ib-btn-muted { background: #1A1A22; color: rgba(255,255,255,0.2); cursor: not-allowed; }
  .ib-btn-live { background: #1A1A22; color: rgba(255,255,255,0.5); cursor: pointer; }
  .ib-btn-live:hover { color: rgba(255,255,255,0.75); }
  .ib-slider { -webkit-appearance: none; appearance: none; width: 100%; height: 2px; border-radius: 2px; outline: none; cursor: pointer; }
  .ib-slider::-webkit-slider-thumb { -webkit-appearance: none; width: 20px; height: 20px; border-radius: 50%; background: #ffffff; cursor: pointer; box-shadow: 0 1px 6px rgba(0,0,0,0.6); transition: transform 0.15s; }
  .ib-slider::-webkit-slider-thumb:hover { transform: scale(1.1); }
  .ib-row { display: flex; align-items: center; gap: 10px; padding: 9px 12px; border-radius: 10px; border: 1px solid transparent; }
  .ib-row-me { background: rgba(255,255,255,0.05); border-color: rgba(255,255,255,0.09); }
  .ib-row-other { background: rgba(255,255,255,0.02); }
  .ib-row-first { background: rgba(212,175,55,0.08); border-color: rgba(212,175,55,0.25); }
  .ib-song-overlay { position: absolute; bottom: 0; left: 0; right: 0; padding: 18px; background: linear-gradient(to top, rgba(0,0,0,0.88) 0%, transparent 100%); }
  .ib-status-icon { width: 40px; height: 40px; border-radius: 12px; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.07); display: flex; align-items: center; justify-content: center; font-size: 18px; margin: 0 auto 14px; }
  .ib-pill { display: inline-flex; align-items: center; gap: 6px; padding: 3px 9px; border-radius: 999px; font-size: 10px; font-weight: 500; letter-spacing: 0.07em; text-transform: uppercase; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: rgba(255,255,255,0.45); }
  @keyframes ib-pulse { 0%,100% { opacity:1; } 50% { opacity:0.25; } }
  .ib-dot { width: 5px; height: 5px; border-radius: 50%; background: rgba(255,255,255,0.5); animation: ib-pulse 2.5s ease-in-out infinite; }
  .ib-reaction-bar { display: flex; gap: 8px; align-items: center; justify-content: center; background: #0F0F14; border: 1px solid rgba(255,255,255,0.07); border-radius: 14px; padding: 10px 14px; }
  .ib-reaction-btn { display: flex; flex-direction: column; align-items: center; gap: 2px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.07); border-radius: 10px; padding: 8px 10px; cursor: pointer; flex: 1; transition: background 0.15s, transform 0.1s; font-size: 20px; line-height: 1; user-select: none; }
  .ib-reaction-btn:active { transform: scale(0.88); background: rgba(255,255,255,0.1); }
  @keyframes ib-float { 0% { opacity:1; transform: translateY(0) rotate(var(--r)) scale(1); } 80% { opacity:0.8; transform: translateY(-180px) rotate(var(--r)) scale(1.1); } 100% { opacity:0; transform: translateY(-240px) rotate(var(--r)) scale(0.8); } }
  .ib-float { position: absolute; bottom: 60px; font-size: 28px; pointer-events: none; animation: ib-float 2.2s ease-out forwards; z-index: 30; line-height: 1; }
  @keyframes ib-combo-pop { 0% { transform: scale(1.4); } 100% { transform: scale(1); } }
  .ib-combo { position: absolute; top: 12px; left: 12px; z-index: 25; display: flex; align-items: center; gap: 5px; background: rgba(0,0,0,0.55); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.1); border-radius: 999px; padding: 4px 10px 4px 7px; animation: ib-combo-pop 0.2s ease both; }
  @keyframes ib-bubble-in { from { opacity: 0; transform: translateY(6px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
  .ib-btn-danger { background: rgba(220,60,60,0.15); color: rgba(255,100,100,0.85); border: 1px solid rgba(220,60,60,0.25); cursor: pointer; }
  .ib-btn-danger:hover { background: rgba(220,60,60,0.22); }
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

const compatColor = (p: number) => p >= 80 ? "#6ee7b7" : p >= 60 ? "#D4AF37" : p >= 40 ? "#fb923c" : "#f87171";

export default function InteractBox({
  roomCode, currentUser, users, userToken,
  onVotedUsersChange, onShowResults, onFestivalTypeChange,
  onSongIdChange, onVotesChange, onHasVotedChange,
  userRooms = [],
}: InteractBoxProps) {

  const [showResults, setShowResults] = useState(false);
  const [hasSkipped, setHasSkipped] = useState(false);
  const [sliderTouched, setSliderTouched] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const countdownRef = useRef<NodeJS.Timeout | null>(null);
  const [activeRoomIndex, setActiveRoomIndex] = useState(0);
  const [roomVotes, setRoomVotes] = useState<Record<string, Vote[]>>({});
  const [roomUsers, setRoomUsers] = useState<Record<string, User[]>>({});
  const showResultsRef = useRef(false);
  const [resultsVotes, setResultsVotes] = useState<Vote[]>([]);

  // Classifica finale
  type FinalEntry = { id: number; title: string; artist: string; average: number | null; voteCount: number };
  type CumulativeEntry = FinalEntry & { rawAverage?: number; trend?: "up" | "down" | "same" | "new"; previousRank?: number | null; nightCount?: number };
  const [finalLeaderboard, setFinalLeaderboard] = useState<FinalEntry[]>([]);
  const [finalCountdown, setFinalCountdown] = useState<number | null>(null);
  const [showFinalLeaderboard, setShowFinalLeaderboard] = useState(false);
  const [myVotes, setMyVotes] = useState<{ songId: number; value: number; night: number }[]>([]);
  const [allRoomVotes, setAllRoomVotes] = useState<{ profile_id: number; song_id: number; value: number }[]>([]);
  const [lbView, setLbView] = useState<"stanza" | "mia" | "affinita">("stanza");
  const [lbMode, setLbMode] = useState<"serata" | "cumulativa">("serata");
  const [cumulativeLeaderboard, setCumulativeLeaderboard] = useState<CumulativeEntry[]>([]);
  const finalCountdownRef = useRef<NodeJS.Timeout | null>(null);

  const { status, hasVoted } = useFestival(roomCode, userToken);
  const votes = status?.song?.votes ?? [];
  const songId = status?.songId ?? null;

  const votesRef = useRef<Vote[]>([]);
  useEffect(() => { votesRef.current = votes; }, [votes]);

  const lastSongIdRef = useRef<number | null>(null);
  useEffect(() => { if (songId !== null) lastSongIdRef.current = songId; }, [songId]);

  const lastSongRef = useRef<{ id: number; title: string; artist: string } | null>(null);
  useEffect(() => { if (status?.song) lastSongRef.current = status.song; }, [status?.song]);

  const userRoomsRef = useRef(userRooms);
  useEffect(() => { userRoomsRef.current = userRooms; }, [userRooms]);
  const userTokenRef = useRef(userToken);
  useEffect(() => { userTokenRef.current = userToken; }, [userToken]);
  const roomCodeRef = useRef(roomCode);
  useEffect(() => { roomCodeRef.current = roomCode; }, [roomCode]);

  const shouldShowVoting =
    !hasVoted && !hasSkipped &&
    !!status?.type &&
    VOTING_OPEN_STATES.includes(status.type) &&
    !showResults;

  // ── Fetch voti di una stanza ──────────────────────────────────────────
  const fetchVotesForRoom = useCallback(async (code: string) => {
    try {
      const token = userTokenRef.current;
      const res = await fetch(`/api/festival-status?roomCode=${code}${token ? `&userToken=${token}` : ""}`);
      if (!res.ok) return;
      const data = await res.json();
      const v: Vote[] = data.song?.votes ?? [];
      setRoomVotes((prev) => ({ ...prev, [code]: v }));
      if (code === roomCodeRef.current && showResultsRef.current) setResultsVotes(v);
    } catch {}
  }, []);

  // ── Fetch tutte le stanze ─────────────────────────────────────────────
  const fetchRoomData = useCallback(async () => {
    for (const r of userRoomsRef.current) {
      try {
        const token = userTokenRef.current;
        const [statusRes, roomRes] = await Promise.all([
          fetch(`/api/festival-status?roomCode=${r.code}${token ? `&userToken=${token}` : ""}`),
          fetch(`/api/get-room?code=${r.code}`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        const statusData = await statusRes.json();
        const roomData = await roomRes.json();
        setRoomVotes((prev) => ({ ...prev, [r.code]: statusData.song?.votes ?? [] }));
        if (roomData.room?.members) {
          const ru = roomData.room.members.map((m: any) => ({
            id: m.id, profile_id: m.profile_id, username: m.profile.username,
            isHost: m.isHost, userToken: m.userToken,
          }));
          setRoomUsers((prev) => ({ ...prev, [r.code]: ru }));
        }
      } catch {}
    }
  }, []);

  // ── triggerResults ────────────────────────────────────────────────────
  const triggerResults = useCallback((initialVotes: Vote[]) => {
    if (showResultsRef.current) return;
    showResultsRef.current = true;
    setResultsVotes(initialVotes);
    setShowResults(true);
    onShowResults?.(true);
    setTimeLeft(RESULTS_DURATION);
    if (countdownRef.current) clearInterval(countdownRef.current);
    countdownRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null || prev <= 1) { clearInterval(countdownRef.current!); return 0; }
        return prev - 1;
      });
    }, 1000);
    fetchRoomData();
  }, [onShowResults, fetchRoomData]);

  // ── Voto ──────────────────────────────────────────────────────────────
  const voting = useVoting({
    roomCode, userToken,
    currentSongId: lastSongIdRef.current ?? songId,
    votes,
    onVoteDone: async () => {
      onHasVotedChange?.(true);
      triggerResults(votesRef.current);
    },
  });

  const handleSkip = useCallback(() => {
    setHasSkipped(true);
    onHasVotedChange?.(true);
    triggerResults(votesRef.current);
  }, [triggerResults, onHasVotedChange]);

  useEffect(() => { if (hasVoted) onHasVotedChange?.(true); }, [hasVoted]);

  // ── Sync voti ─────────────────────────────────────────────────────────
  const votesKey = votes.map(v => `${v.profile_id}:${v.value}`).join(",");
  useEffect(() => {
    onVotedUsersChange?.(votes.map((v) => v.profile_id));
    onVotesChange?.(votes);
    if (showResultsRef.current && votes.length > 0) {
      setResultsVotes(votes);
      setRoomVotes((prev) => ({ ...prev, [roomCode]: votes }));
    }
  }, [votesKey]);

  // ── Reset al cambio canzone ───────────────────────────────────────────
  const prevSongIdRef = useRef<number | null>(null);
  useEffect(() => {
    if (songId === null || songId === prevSongIdRef.current) return;
    prevSongIdRef.current = songId;
    voting.reset();
    setHasSkipped(false);
    setSliderTouched(false);
    setShowResults(false);
    setTimeLeft(null);
    setResultsVotes([]);
    setRoomVotes({});
    setRoomUsers({});
    showResultsRef.current = false;
    if (countdownRef.current) clearInterval(countdownRef.current);
    onVotedUsersChange?.([]);
    onShowResults?.(false);
  }, [songId]);

  // ── Classifica finale ─────────────────────────────────────────────────
  useEffect(() => {
    if (status?.type !== "classifica") {
      if (finalCountdownRef.current) clearInterval(finalCountdownRef.current);
      setFinalCountdown(null);
      setShowFinalLeaderboard(false);
      return;
    }
    const fetchFinal = async () => {
      try {
        const res = await fetch(`/api/room-leaderboard?roomCode=${roomCode}`);
        if (res.ok) setFinalLeaderboard(await res.json());
      } catch {}
    };
    const fetchMyVotesFn = async () => {
  const token = userToken ?? localStorage.getItem("userToken");
  if (!token) return;
  try {
    const res = await fetch(`/api/get-my-votes`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (res.ok) {
      const data = await res.json();
      console.log("myVotes fetched:", data.length, data[0]);
      setMyVotes(data);
    }
  } catch {}
};
    const fetchAllVotes = async () => {
      try {
        const res = await fetch(`/api/get-all-votes?roomCode=${roomCode}`);
        if (res.ok) setAllRoomVotes(await res.json());
      } catch {}
    };
    const fetchCumulative = async () => {
      try {
        const res = await fetch(`/api/cumulative-leaderboard?roomCode=${roomCode}`);
        if (res.ok) setCumulativeLeaderboard(await res.json());
      } catch {}
    };
    fetchFinal();
    fetchMyVotesFn();
    fetchAllVotes();
    fetchCumulative();
    setShowFinalLeaderboard(false);
    setFinalCountdown(3);
    if (finalCountdownRef.current) clearInterval(finalCountdownRef.current);
    finalCountdownRef.current = setInterval(() => {
      setFinalCountdown((prev) => {
        if (prev === null) return null;
        if (prev <= 1) { clearInterval(finalCountdownRef.current!); setShowFinalLeaderboard(true); return null; }
        return prev - 1;
      });
    }, 1000);
    return () => { if (finalCountdownRef.current) clearInterval(finalCountdownRef.current); };
  }, [status?.type]);

  // ── Commenti + reactions ──────────────────────────────────────────────
  const { chatComments } = useComments({ songId, roomCode, isEsibizione: status?.type === "esibizione", users });
  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatComments.length]);
  const { floating, combo, sendReaction } = useReactions({ songId, roomCode, userToken });

  useEffect(() => { if (status?.type) onFestivalTypeChange?.(status.type); }, [status?.type]);
  useEffect(() => { onSongIdChange?.(songId); }, [songId]);
  useEffect(() => { onShowResults?.(showResults); }, [showResults]);
  useEffect(() => {
    if (timeLeft === 0) { setShowResults(false); showResultsRef.current = false; setTimeLeft(null); }
  }, [timeLeft]);

  if (!status || !currentUser) return null;

  // ── Classifica finale render ──────────────────────────────────────────
  const renderClassificaFinale = () => {
    if (!showFinalLeaderboard) {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", gap: 12, textAlign: "center", padding: "0 24px" }}>
          <Trophy size={22} color="#D4AF37" strokeWidth={1.5} style={{ opacity: 0.7 }} />
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", letterSpacing: "0.06em", textTransform: "uppercase", margin: 0 }}>Classifica finale</p>
          {finalCountdown !== null && (
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 72, fontWeight: 400, color: "#D4AF37", lineHeight: 1, letterSpacing: "-2px" }}>
              {finalCountdown}
            </div>
          )}
        </div>
      );
    }

    const myVotesMap = (() => {
      if (lbMode === "serata") {
        // Solo i voti della serata corrente (night più alta votata)
        const latestNight = Math.max(...myVotes.map((v) => v.night ?? 0));
        const filtered = isFinite(latestNight) ? myVotes.filter((v) => v.night === latestNight) : myVotes;
        return new Map<number, number>(filtered.map((v) => [v.songId, v.value]));
      } else {
        // Cumulativa: media dei voti per canzone su tutte le serate
        const grouped = new Map<number, number[]>();
        myVotes.forEach((v) => {
          if (!grouped.has(v.songId)) grouped.set(v.songId, []);
          grouped.get(v.songId)!.push(v.value);
        });
        return new Map<number, number>(
          [...grouped.entries()].map(([songId, vals]) => [
            songId,
            vals.reduce((a, b) => a + b, 0) / vals.length,
          ])
        );
      }
    })();
    // Frecce: usano il campo `trend` direttamente dall'API cumulativa
    const activeBaseList = lbMode === "cumulativa" && cumulativeLeaderboard.length > 0 ? cumulativeLeaderboard : finalLeaderboard;
    const withVotes = activeBaseList.filter((s) => s.average !== null);
    const overall = withVotes.length > 0 ? withVotes.reduce((s, e) => s + e.average!, 0) / withVotes.length : null;

    const personalList = [...activeBaseList].sort((a, b) => {
      const vA = myVotesMap.get(a.id) ?? null;
      const vB = myVotesMap.get(b.id) ?? null;
      if (vA !== null && vB !== null) return vB - vA;
      if (vA !== null) return -1;
      if (vB !== null) return 1;
      if (a.average !== null && b.average !== null) return b.average - a.average;
      return 0;
    });
    const roomRankMap = new Map(activeBaseList.map((s, i) => [s.id, i + 1]));
    const activeList = lbView === "stanza" ? activeBaseList : personalList;

    // ── Affinità — usa profile_id ─────────────────────────────────────
    const myProfileId = currentUser.profile_id;
    const myAllVotes = allRoomVotes.filter((v) => v.profile_id === myProfileId);

    let roomCompat: number | null = null;
    if (myAllVotes.length > 0) {
      const pairs: { my: number; avg: number }[] = [];
      myAllVotes.forEach((mv) => {
        const others = allRoomVotes.filter((v) => v.song_id === mv.song_id && v.profile_id !== myProfileId);
        if (others.length === 0) return;
        const avg = others.reduce((s, v) => s + v.value, 0) / others.length;
        pairs.push({ my: mv.value, avg });
      });
      if (pairs.length > 0) {
        const avgDiff = pairs.reduce((s, p) => s + Math.abs(p.my - p.avg), 0) / pairs.length;
        roomCompat = Math.max(0, Math.round((1 - avgDiff / 9) * 100));
      }
    }

    const otherProfileIds = [...new Set(allRoomVotes.map((v) => v.profile_id))].filter((id) => id !== myProfileId);
    const personCompats = otherProfileIds.map((pid) => {
      const theirVotes = allRoomVotes.filter((v) => v.profile_id === pid);
      const pairs: { my: number; their: number }[] = [];
      myAllVotes.forEach((mv) => {
        const match = theirVotes.find((tv) => tv.song_id === mv.song_id);
        if (match) pairs.push({ my: mv.value, their: match.value });
      });
      if (pairs.length === 0) return null;
      const avgDiff = pairs.reduce((s, p) => s + Math.abs(p.my - p.their), 0) / pairs.length;
      const pct = Math.max(0, Math.round((1 - avgDiff / 9) * 100));
      const user = users.find((u) => u.profile_id === pid);
      return user ? { user, pct, songs: pairs.length } : null;
    }).filter(Boolean).sort((a, b) => b!.pct - a!.pct) as { user: User; pct: number; songs: number }[];

    const hasCompat = roomCompat !== null || personCompats.length > 0;

    console.log("myVotesMap", [...myVotesMap.entries()]);
console.log("myVotes raw", myVotes);

    return (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "16px 14px 14px" }}>

        {/* Header con tab icone */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10, flexShrink: 0 }}>
          <span className="ib-pill" style={{ borderColor: "rgba(212,175,55,0.25)", color: "rgba(212,175,55,0.8)" }}>
            {lbView === "stanza" && <><Trophy size={9} color="#D4AF37" strokeWidth={2} style={{ marginRight: 2 }} />Classifica</>}
            {lbView === "mia" && <><Star size={9} color="#D4AF37" strokeWidth={2} style={{ marginRight: 2 }} />La mia</>}
            {lbView === "affinita" && <><Heart size={9} color="#D4AF37" strokeWidth={2} style={{ marginRight: 2 }} />Affinità</>}
          </span>
          <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: 2, gap: 2 }}>
            {(["stanza", "mia", "affinita"] as const).map((v) => {
              const isActive = lbView === v;
              const Icon = v === "stanza" ? Trophy : v === "mia" ? Star : Heart;
              return (
                <button
                  key={v}
                  onClick={() => setLbView(v as any)}
                  title={v === "stanza" ? "Classifica" : v === "mia" ? "La mia" : "Affinità"}
                  style={{ width: 34, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "none", cursor: "pointer", transition: "background 0.15s", background: isActive ? "rgba(255,255,255,0.09)" : "transparent", color: isActive ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.28)" }}
                >
                  <Icon size={13} strokeWidth={isActive ? 2.5 : 1.5} />
                </button>
              );
            })}
          </div>
        </div>

        {/* Switcher serata / cumulativa */}
        {(lbView === "stanza" || lbView === "mia") && cumulativeLeaderboard.length > 0 && (
          <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 2, gap: 2, marginBottom: 12, flexShrink: 0 }}>
            {(["serata", "cumulativa"] as const).map((m) => (
              <button key={m} onClick={() => setLbMode(m)} style={{ flex: 1, padding: "5px 0", borderRadius: 6, border: "none", fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.15s", background: lbMode === m ? "rgba(255,255,255,0.08)" : "transparent", color: lbMode === m ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.28)" }}>
                {m === "serata" ? "Questa serata" : "Tutte le serate"}
              </button>
            ))}
          </div>
        )}

        {/* Sommario stanza */}
        {lbView === "stanza" && overall !== null && (
          <div style={{ flexShrink: 0, marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 52, fontWeight: 400, color: "#ededed", lineHeight: 1, letterSpacing: "-1px" }}>{overall.toFixed(2)}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginTop: 4 }}>
              {lbMode === "cumulativa" ? "media cumulativa" : "media serata"} · {withVotes.length} {withVotes.length === 1 ? "canzone" : "canzoni"}
            </div>
          </div>
        )}

        {/* Sommario la mia */}
        {lbView === "mia" && (() => {
          const myVotedSongs = finalLeaderboard.filter((s) => myVotesMap.get(s.id) !== undefined);
          const myOverall = myVotedSongs.length > 0 ? myVotedSongs.reduce((s, e) => s + myVotesMap.get(e.id)!, 0) / myVotedSongs.length : null;
          return (
            <div style={{ flexShrink: 0, marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
              {myOverall !== null ? (
                <>
                  <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 52, fontWeight: 400, color: "#ededed", lineHeight: 1, letterSpacing: "-1px" }}>{myOverall.toFixed(2)}</div>
                  <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginTop: 4 }}>
                    la tua media · {myVotedSongs.length} {myVotedSongs.length === 1 ? "canzone" : "canzoni"}
                    <span style={{ marginLeft: 8, fontSize: 10, color: "rgba(255,255,255,0.15)" }}>· # grigio = pos. stanza</span>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>Nessun voto registrato.</div>
              )}
            </div>
          );
        })()}

        {/* Sommario affinità */}
        {lbView === "affinita" && (
          <div style={{ flexShrink: 0, marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {roomCompat !== null ? (
              <>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 52, fontWeight: 400, color: compatColor(roomCompat), lineHeight: 1, letterSpacing: "-1px" }}>{roomCompat}%</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginTop: 4 }}>
                  affinità con la stanza · {myAllVotes.length} {myAllVotes.length === 1 ? "canzone" : "canzoni"}
                </div>
              </>
            ) : (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.25)" }}>Quanto i voti si sono incrociati, canzone per canzone.</div>
            )}
          </div>
        )}

        {/* ── Lista canzoni ── */}
        {(lbView === "stanza" || lbView === "mia") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 5, overflowY: "auto", flex: 1 }}>
            {activeList.length === 0 ? (
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.22)", textAlign: "center", paddingTop: 24 }}>Caricamento…</div>
            ) : activeList.map((song, i) => {
              const hasVotesEntry = song.average !== null;
              const isFirst = lbView === "stanza" && hasVotesEntry && i === 0;
              const myVote = myVotesMap.get(song.id) ?? null;
              const roomRank = lbView === "mia" ? roomRankMap.get(song.id) : null;

              let arrow: "up" | "down" | null = null;
              let isNew = false;
              if (lbMode === "cumulativa") {
                const t = (song as CumulativeEntry).trend;
                if (t === "up") arrow = "up";
                else if (t === "down") arrow = "down";
                else if (t === "new") isNew = true;
              }

              return (
                <div key={song.id} className={"ib-row " + (isFirst ? "ib-row-first" : "ib-row-other")} style={{ opacity: hasVotesEntry ? 1 : 0.4 }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: isFirst ? "#D4AF37" : "rgba(255,255,255,0.2)", width: 16, textAlign: "center", flexShrink: 0 }}>
                    {isFirst ? <Trophy size={11} color="#D4AF37" strokeWidth={2} /> : i + 1}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: isFirst ? 700 : 400, color: hasVotesEntry ? "#ededed" : "rgba(255,255,255,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{song.title}</span>
                    <span style={{ display: "block", fontSize: 9, color: isFirst ? "rgba(212,175,55,0.6)" : "rgba(255,255,255,0.25)", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 1 }}>{song.artist}</span>
                  </span>
                  {arrow && (
                    <span style={{ fontSize: 10, flexShrink: 0, marginRight: 4, color: arrow === "up" ? "#6ee7b7" : "#f87171", lineHeight: 1 }}>
                      {arrow === "up" ? "▲" : "▼"}
                    </span>
                  )}
                  {isNew && (
                    <span style={{ fontSize: 8, flexShrink: 0, marginRight: 6, color: "#D4AF37", fontFamily: "'DM Mono', monospace", fontWeight: 600, letterSpacing: "0.06em", background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 4, padding: "1px 4px" }}>
                      NEW
                    </span>
                  )}
                  {lbView === "mia" && roomRank !== null && (
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.18)", flexShrink: 0, marginRight: 6 }}>#{roomRank}</span>
                  )}
                  {lbView === "stanza" && hasVotesEntry && (
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.2)", flexShrink: 0, marginRight: 6 }}>{song.voteCount}v</span>
                  )}
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: isFirst ? 17 : 15, color: isFirst ? "#D4AF37" : hasVotesEntry ? "#ededed" : "rgba(255,255,255,0.15)", flexShrink: 0 }}>
                    {lbView === "mia" && myVote !== null ? myVote.toFixed(1) : hasVotesEntry ? song.average!.toFixed(1) : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {/* ── Affinità: per canzone + totale serata ── */}
        {lbView === "affinita" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", flex: 1 }}>
            {!hasCompat ? (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", textAlign: "center", marginTop: 20 }}>Dati non disponibili</div>
            ) : (
              <>
                {/* Per ogni canzone */}
                {finalLeaderboard.filter((s) => s.average !== null).map((song) => {
                  const songVotes = allRoomVotes.filter((v) => v.song_id === song.id);
                  const myVoteForSong = songVotes.find((v) => v.profile_id === myProfileId);
                  let songRoomCompat: number | null = null;
                  if (myVoteForSong) {
                    const others = songVotes.filter((v) => v.profile_id !== myProfileId);
                    if (others.length > 0) {
                      const avg = others.reduce((s, v) => s + v.value, 0) / others.length;
                      songRoomCompat = Math.max(0, Math.round((1 - Math.abs(myVoteForSong.value - avg) / 9) * 100));
                    }
                  }

                  // Coppie di utenti per questa canzone
                  const votingUsers = users.filter((u) => songVotes.some((v) => v.profile_id === u.profile_id));
                  const pairCompats: { userA: string; userB: string; pct: number }[] = [];
                  for (let a = 0; a < votingUsers.length; a++) {
                    for (let b = a + 1; b < votingUsers.length; b++) {
                      const vA = songVotes.find((v) => v.profile_id === votingUsers[a].profile_id)?.value;
                      const vB = songVotes.find((v) => v.profile_id === votingUsers[b].profile_id)?.value;
                      if (vA !== undefined && vB !== undefined) {
                        pairCompats.push({
                          userA: votingUsers[a].username,
                          userB: votingUsers[b].username,
                          pct: Math.max(0, Math.round((1 - Math.abs(vA - vB) / 9) * 100)),
                        });
                      }
                    }
                  }
                  pairCompats.sort((a, b) => b.pct - a.pct);

                  if (songRoomCompat === null && pairCompats.length === 0) return null;

                  return (
                    <div key={song.id} style={{ background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 12, padding: "11px 13px", display: "flex", flexDirection: "column", gap: 7 }}>
                      <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: "rgba(255,255,255,0.65)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{song.title}</span>
                        <span style={{ fontSize: 9, color: "rgba(255,255,255,0.2)", letterSpacing: "0.06em", textTransform: "uppercase", flexShrink: 0 }}>{song.artist}</span>
                      </div>
                      {songRoomCompat !== null && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", flexShrink: 0, width: 54 }}>Stanza</span>
                          <div style={{ flex: 1, height: 2, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${songRoomCompat}%`, borderRadius: 999, background: compatColor(songRoomCompat), transition: "width 0.6s ease" }} />
                          </div>
                          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: compatColor(songRoomCompat), flexShrink: 0, width: 32, textAlign: "right" }}>{songRoomCompat}%</span>
                        </div>
                      )}
                      {pairCompats.map(({ userA, userB, pct }) => (
                        <div key={`${userA}-${userB}`} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", flexShrink: 0, width: 54, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userA} · {userB}</span>
                          <div style={{ flex: 1, height: 2, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: compatColor(pct), transition: "width 0.6s ease" }} />
                          </div>
                          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: compatColor(pct), flexShrink: 0, width: 32, textAlign: "right" }}>{pct}%</span>
                        </div>
                      ))}
                    </div>
                  );
                })}

                {/* Totale serata */}
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 14, display: "flex", flexDirection: "column", gap: 8, flexShrink: 0 }}>
                  <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.07em", textTransform: "uppercase", margin: "0 0 2px", fontWeight: 500 }}>Totale serata</p>
                  {roomCompat !== null && (
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", flexShrink: 0, width: 54, fontWeight: 500 }}>Stanza</span>
                      <div style={{ flex: 1, height: 3, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${roomCompat}%`, borderRadius: 999, background: compatColor(roomCompat), transition: "width 0.6s ease" }} />
                      </div>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: compatColor(roomCompat), flexShrink: 0, width: 36, textAlign: "right", fontWeight: 600 }}>{roomCompat}%</span>
                    </div>
                  )}
                  {personCompats.map(({ user: u, pct, songs }) => (
                    <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", flexShrink: 0, width: 54, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.username}</span>
                      <div style={{ flex: 1, height: 3, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: compatColor(pct), transition: "width 0.6s ease" }} />
                      </div>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.18)", flexShrink: 0, marginRight: 4 }}>{songs}c</span>
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: compatColor(pct), flexShrink: 0, width: 36, textAlign: "right", fontWeight: 600 }}>{pct}%</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  // ── Card ──────────────────────────────────────────────────────────────
  const renderCard = () => {
    if (showResults) {
      return (
        <Classifica
          votes={resultsVotes}
          users={users}
          currentUser={currentUser}
          timeLeft={timeLeft}
          roomCode={roomCode}
          userRooms={userRooms}
          activeRoomIndex={activeRoomIndex}
          onRoomChange={setActiveRoomIndex}
          roomVotes={roomVotes}
          roomUsers={roomUsers}
        />
      );
    }

    if (shouldShowVoting) {
      const song = status?.song ?? lastSongRef.current;
      return (
        <VotingBox
          value={voting.voteValue}
          onChange={voting.setVoteValue}
          songTitle={song?.title}
          songArtist={song?.artist}
          onSkip={handleSkip}
          touched={sliderTouched}
          onTouched={() => setSliderTouched(true)}
        />
      );
    }

    if ((hasVoted || hasSkipped) && !showResults && status.type === "votazione") {
      return (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%" }}>
          <p style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.55)", marginBottom: 4 }}>
            {hasSkipped ? "Voto saltato" : "Voto inviato"}
          </p>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.22)" }}>In attesa degli altri…</p>
        </div>
      );
    }

    switch (status.type) {
      case "esibizione":
        return (
          <>
            {status.song?.image_url && (
              <>
                <img src={status.song.image_url} alt={status.song.artist} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover", objectPosition: "center top" }} />
                <div style={{ position: "absolute", inset: 0, background: chatComments.length > 0 ? "rgba(0,0,0,0.45)" : "rgba(0,0,0,0.62)", transition: "background 0.6s ease" }} />
              </>
            )}
            {chatComments.length > 0 && (
              <div style={{ position: "absolute", bottom: 68, left: 14, right: 14, maxHeight: "52%", overflowY: "auto", display: "flex", flexDirection: "column", gap: 5, zIndex: 15, scrollbarWidth: "none", maskImage: "linear-gradient(to bottom, transparent 0%, black 18%)", WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 18%)" }}>
                {chatComments.map((c, i) => (
                  <div key={c.id} style={{ display: "inline-flex", flexDirection: "column", alignSelf: "flex-start", maxWidth: "80%", background: "rgba(15,15,20,0.68)", backdropFilter: "blur(10px)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: "12px 12px 12px 3px", padding: "6px 10px", animation: i === chatComments.length - 1 ? "ib-bubble-in 0.3s ease both" : "none", flexShrink: 0 }}>
                    <span style={{ fontSize: 9, color: "rgba(255,255,255,0.35)", fontWeight: 600, letterSpacing: "0.04em", marginBottom: 2 }}>{c.user.username}</span>
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.82)", lineHeight: 1.4 }}>{c.text}</span>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>
            )}
            {combo && combo.count >= 2 && (
              <div className="ib-combo" key={combo.count}>
                <span style={{ fontSize: 16 }}>{combo.emoji}</span>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 500, color: "#ededed" }}>x{combo.count}</span>
              </div>
            )}
            {floating.map((r) => (
              <div key={r.id} className="ib-float" style={{ right: `${r.x}%`, "--r": `${(Math.random() - 0.5) * 20}deg` } as React.CSSProperties}>
                {r.emoji}
              </div>
            ))}
            <div className="ib-song-overlay">
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.4)", letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 4, fontWeight: 500 }}>{status.song?.artist}</p>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: "#ededed", lineHeight: 1.2, letterSpacing: "-0.3px", margin: 0 }}>{status.song?.title}</h2>
            </div>
          </>
        );
      case "classifica": return renderClassificaFinale();
      case "votazione": return null;
      case "presentazione": return <StatusScreen icon={<Mic2 size={20} color="#D4AF37" strokeWidth={1.5} />} title="Presentazione" sub="Carlo Conti sta presentando il prossimo artista." />;
      case "spot": return <StatusScreen icon={<Tv size={20} color="#D4AF37" strokeWidth={1.5} />} title="Pubblicità" sub="Torniamo tra poco in diretta." />;
      case "pausa": return <StatusScreen icon={<PauseCircle size={20} color="#D4AF37" strokeWidth={1.5} />} title="Pausa tecnica" sub="Il festival riprende tra poco." />;
      case "attesa": return <StatusScreen icon={<Clock size={20} color="#D4AF37" strokeWidth={1.5} />} title="A breve…" sub="La serata sta per iniziare." />;
      case "fine": return <StatusScreen icon={<Star size={20} color="#D4AF37" strokeWidth={1.5} />} title="Serata conclusa" sub="Grazie per aver partecipato!" />;
      default: return null;
    }
  };

  // ── Button ────────────────────────────────────────────────────────────
  const renderButton = () => {
    if (showResults) {
      return (
        <button onClick={() => { setShowResults(false); showResultsRef.current = false; setTimeLeft(null); if (countdownRef.current) clearInterval(countdownRef.current); }} className="ib-btn ib-btn-live">
          Torna al live
        </button>
      );
    }
    if (shouldShowVoting) {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {voting.error && (
            <p style={{ fontSize: 11, color: "rgba(255,100,100,0.8)", textAlign: "center", margin: 0 }}>
              {voting.error} — <span style={{ cursor: "pointer", textDecoration: "underline" }} onClick={voting.submitVote}>riprova</span>
            </p>
          )}
          <button onClick={voting.submitVote} disabled={voting.isSubmitting || !sliderTouched} className={`ib-btn ${sliderTouched ? "ib-btn-gold" : "ib-btn-muted"}`}>
            {voting.isSubmitting ? "Invio in corso…" : "Conferma voto"}
          </button>
        </div>
      );
    }
    if (status.type === "classifica") {
      return <button disabled className="ib-btn ib-btn-muted">Classifica finale</button>;
    }
    if (status.type === "esibizione") {
      return (
        <div className="ib-reaction-bar">
          {REACTIONS.map((r) => (
            <button key={r.type} className="ib-reaction-btn" onClick={() => sendReaction(r.type)}>{r.emoji}</button>
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
        <div className="ib-card" style={{ flex: 1, minHeight: 0 }}>{renderCard()}</div>
        <div style={{ flexShrink: 0 }}>{renderButton()}</div>
      </div>
    </>
  );
}