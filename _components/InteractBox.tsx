"use client";
// InteractBox.tsx

import React, { useState, useEffect, useRef, useCallback } from "react";
import { Star, Trophy, Heart } from "lucide-react";

import { useFestival } from "./UseFestival";
import { useVoting } from "./UseVoting";
import { useComments } from "./UseComments";
import { useReactions, REACTIONS } from "./UseReactions";
import { Classifica } from "./Classifica";
import { VotingBox } from "./VotingBox";
import { statusScreenStyles, ScreenPresentazione, ScreenSpot, ScreenPausa, ScreenAttesa, ScreenFine } from "./StatusScreen";
import { SERATA_TIMELINE } from "@/_lib/timeline";
import type { User, UserRoom, Vote } from "./types";
import { useAiCommento } from "./useAiCommento";

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

  @keyframes cl-reveal { from { opacity: 0; transform: translateY(18px) scale(0.97); } to { opacity: 1; transform: translateY(0) scale(1); } }
  @keyframes cl-reveal-row { from { opacity: 0; transform: translateX(-8px); } to { opacity: 1; transform: translateX(0); } }
  @keyframes cl-gold-glow { 0%,100% { text-shadow: 0 0 0 transparent; } 50% { text-shadow: 0 0 24px rgba(212,175,55,0.7), 0 0 48px rgba(212,175,55,0.3); } }
  @keyframes cl-pop { 0% { transform: scale(0.6); opacity: 0; } 70% { transform: scale(1.12); opacity: 1; } 100% { transform: scale(1); } }
  .cl-reveal-entry { animation: cl-reveal 0.55s cubic-bezier(0.16,1,0.3,1) both; }
  .cl-reveal-row { animation: cl-reveal-row 0.4s ease both; }
  .cl-gold-glow { animation: cl-gold-glow 2s ease-in-out infinite; }
  .cl-pos-pop { animation: cl-pop 0.5s cubic-bezier(0.16,1,0.3,1) both; }

  /* ── First Place: Burst rays ── */
  @keyframes fp-ray-spin   { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
  @keyframes fp-ray-fadein { from { opacity: 0; transform: scaleY(0.2) rotate(var(--deg)); } to { opacity: 1; transform: scaleY(1) rotate(var(--deg)); } }

  /* ── First Place: Number slam ── */
  @keyframes fp-num-slam {
    0%   { transform: scale(4) translateY(-20px); opacity: 0; filter: blur(12px); }
    55%  { transform: scale(0.92) translateY(2px); opacity: 1; filter: blur(0); }
    70%  { transform: scale(1.06); }
    85%  { transform: scale(0.98); }
    100% { transform: scale(1); }
  }

  /* ── First Place: Title reveal ── */
  @keyframes fp-title-up {
    from { opacity: 0; transform: translateY(22px) scale(0.95); filter: blur(4px); }
    to   { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
  }

  /* ── First Place: Score pop ── */
  @keyframes fp-score-pop {
    0%   { transform: scale(0); opacity: 0; }
    65%  { transform: scale(1.18); opacity: 1; }
    80%  { transform: scale(0.95); }
    100% { transform: scale(1); }
  }

  /* ── First Place: Gold shimmer ── */
  @keyframes fp-shimmer {
    0%   { background-position: -200% center; }
    100% { background-position: 200% center; }
  }

  /* ── First Place: Confetti ── */
  @keyframes fp-conf {
    0%   { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
    80%  { opacity: 0.8; }
    100% { transform: translateY(var(--ty)) rotate(var(--rot)) scale(var(--sc)); opacity: 0; }
  }

  /* ── First Place: Glow pulse ── */
  @keyframes fp-glow-pulse {
    0%,100% { opacity: 0.35; transform: scale(1); }
    50%     { opacity: 0.65; transform: scale(1.04); }
  }

  /* ── First Place: Medal drop ── */
  @keyframes fp-medal-drop {
    0%   { transform: translateY(-60px) rotate(-30deg) scale(0.4); opacity: 0; }
    60%  { transform: translateY(4px) rotate(8deg) scale(1.15); opacity: 1; }
    75%  { transform: translateY(-3px) rotate(-4deg) scale(0.98); }
    100% { transform: translateY(0) rotate(0deg) scale(1); opacity: 1; }
  }

  /* ── First Place: Particles ── */
  @keyframes fp-particle {
    0%   { transform: translate(0,0) scale(1); opacity: 1; }
    100% { transform: translate(var(--px), var(--py)) scale(0); opacity: 0; }
  }

  /* ── First Place: Scan line ── */
  @keyframes fp-scan {
    from { transform: translateY(-100%); }
    to   { transform: translateY(400%); }
  }
`;


const compatColor = (p: number) => p >= 80 ? "#6ee7b7" : p >= 60 ? "#D4AF37" : p >= 40 ? "#fb923c" : "#f87171";

// ── FirstPlaceReveal component ────────────────────────────────────────────────
function FirstPlaceReveal({ song, secondPlace }: {
  song: { title: string; artist: string; average: number; voteCount: number };
  secondPlace: { title: string; artist: string; average: number | null; voteCount: number } | null;
}) {
  const confetti = React.useMemo(() =>
    Array.from({ length: 28 }, (_, i) => ({
      id: i,
      left: `${5 + Math.random() * 90}%`,
      delay: `${Math.random() * 0.6}s`,
      dur: `${1.2 + Math.random() * 1}s`,
      color: ["#D4AF37", "#FFE066", "#FFC94D", "#fff", "#f0c040", "#ffe8a0", "#ffd700"][i % 7],
      ty: `${80 + Math.random() * 120}px`,
      rot: `${(Math.random() - 0.5) * 720}deg`,
      sc: `${0.1 + Math.random() * 0.5}`,
      size: `${6 + Math.random() * 8}px`,
      shape: i % 3,
    }))
  , []);

  const rays = Array.from({ length: 12 }, (_, i) => i * 30);

  const particles = React.useMemo(() =>
    Array.from({ length: 16 }, (_, i) => {
      const angle = (i / 16) * Math.PI * 2;
      const dist = 55 + Math.random() * 30;
      return {
        id: i,
        px: `${Math.cos(angle) * dist}px`,
        py: `${Math.sin(angle) * dist}px`,
        delay: `${Math.random() * 0.3}s`,
        size: `${3 + Math.random() * 4}px`,
        color: i % 2 === 0 ? "#D4AF37" : "#FFF",
      };
    })
  , []);

  return (
    <>
    <div
      style={{
        position: "relative",
        flexShrink: 0,
        marginBottom: 10,
        borderRadius: 18,
        overflow: "hidden",
        background: "linear-gradient(135deg, rgba(212,175,55,0.13) 0%, rgba(20,16,0,0.95) 60%, rgba(212,175,55,0.07) 100%)",
        border: "1.5px solid rgba(212,175,55,0.45)",
        padding: "22px 18px 18px",
        minHeight: 200,
      }}
    >
      <div style={{
        position: "absolute", inset: -2 as any, borderRadius: 20,
        boxShadow: "0 0 60px rgba(212,175,55,0.35), 0 0 120px rgba(212,175,55,0.15)",
        animation: "fp-glow-pulse 1.8s ease-in-out infinite",
        pointerEvents: "none", zIndex: 0,
      }} />

      <div style={{
        position: "absolute", top: "50%", left: "50%",
        width: 320, height: 320,
        marginLeft: -160, marginTop: -160,
        animation: "fp-ray-spin 18s linear infinite",
        pointerEvents: "none", zIndex: 1, opacity: 0.18,
      }}>
        {rays.map((deg) => (
          <div key={deg} style={{
            position: "absolute",
            top: "50%", left: "50%",
            width: 2, height: 160,
            marginLeft: -1,
            transformOrigin: "top center",
            background: "linear-gradient(to bottom, transparent 0%, #D4AF37 40%, transparent 100%)",
            transform: `rotate(${deg}deg)`,
            animation: "fp-ray-fadein 0.6s ease both",
            animationDelay: `${(deg / 360 * 0.5).toFixed(2)}s`,
            ["--deg" as any]: `${deg}deg`,
          }} />
        ))}
      </div>

      <div style={{
        position: "absolute", top: 0, left: 0, right: 0, height: "30%",
        background: "linear-gradient(to bottom, transparent, rgba(212,175,55,0.06), transparent)",
        animation: "fp-scan 2.5s linear infinite",
        pointerEvents: "none", zIndex: 2,
      }} />

      {confetti.map((c) => (
        <div key={c.id} style={{
          position: "absolute",
          top: "20%", left: c.left,
          width: c.size, height: c.size,
          borderRadius: c.shape === 0 ? "50%" : c.shape === 1 ? "2px" : "0",
          background: c.color,
          animation: `fp-conf ${c.dur} ease-out ${c.delay} both`,
          ["--ty" as any]: c.ty,
          ["--rot" as any]: c.rot,
          ["--sc" as any]: c.sc,
          zIndex: 3, pointerEvents: "none",
        }} />
      ))}

      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", gap: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14, position: "relative" }}>
          <div style={{ position: "relative", flexShrink: 0 }}>
            {particles.map((p) => (
              <div key={p.id} style={{
                position: "absolute",
                top: "50%", left: "50%",
                width: p.size, height: p.size,
                borderRadius: "50%",
                background: p.color,
                animation: `fp-particle 0.9s ease-out ${p.delay} both`,
                ["--px" as any]: p.px,
                ["--py" as any]: p.py,
                zIndex: 5, pointerEvents: "none",
              }} />
            ))}
            <span style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: 72,
              fontWeight: 400,
              lineHeight: 1,
              letterSpacing: "-3px",
              display: "block",
              animation: "fp-num-slam 0.75s cubic-bezier(0.16,1,0.3,1) 0.05s both",
              background: "linear-gradient(135deg, #FFE566 0%, #D4AF37 35%, #FFF8DC 55%, #D4AF37 70%, #B8860B 100%)",
              backgroundSize: "200% auto",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              1°
            </span>
          </div>
          <span style={{
            fontSize: 44,
            lineHeight: 1,
            display: "block",
            animation: "fp-medal-drop 0.7s cubic-bezier(0.34,1.56,0.64,1) 0.4s both",
            filter: "drop-shadow(0 4px 16px rgba(212,175,55,0.6))",
          }}>🥇</span>
        </div>

        <div style={{
          fontSize: 26,
          fontWeight: 800,
          lineHeight: 1.15,
          letterSpacing: "-0.5px",
          marginBottom: 5,
          background: "linear-gradient(90deg, #FFE566, #D4AF37 40%, #FFF8DC 55%, #D4AF37 80%, #FFE566)",
          backgroundSize: "200% auto",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
          animationName: "fp-title-up, fp-shimmer",
          animationDuration: "0.55s, 3s",
          animationDelay: "0.6s, 1.2s",
          animationTimingFunction: "ease, linear",
          animationFillMode: "both, none",
          animationIterationCount: "1, infinite",
        } as React.CSSProperties}>
          {song.title}
        </div>

        <div style={{
          fontSize: 10,
          color: "rgba(255,255,255,0.35)",
          letterSpacing: "0.1em",
          textTransform: "uppercase",
          marginBottom: 16,
          animation: "fp-title-up 0.45s ease 0.75s both",
        }}>
          {song.artist}
        </div>

        <div style={{
          display: "flex",
          alignItems: "baseline",
          gap: 10,
          borderTop: "1px solid rgba(212,175,55,0.25)",
          paddingTop: 14,
          animation: "fp-score-pop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.85s both",
        }}>
          <span style={{
            fontFamily: "'DM Mono', monospace",
            fontSize: 54,
            fontWeight: 400,
            color: "#D4AF37",
            lineHeight: 1,
            letterSpacing: "-2px",
            filter: "drop-shadow(0 0 20px rgba(212,175,55,0.6))",
          }}>
            {song.average.toFixed(1)}
          </span>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>
              {song.voteCount} {song.voteCount === 1 ? "voto" : "voti"}
            </span>
            <span style={{ fontSize: 9, color: "rgba(212,175,55,0.5)", letterSpacing: "0.07em", textTransform: "uppercase", marginTop: 1 }}>
              media finale
            </span>
          </div>
        </div>
      </div>

      {(["top", "bottom"] as const).flatMap((v) =>
        (["left", "right"] as const).map((h) => (
          <div key={`${v}-${h}`} style={{
            position: "absolute",
            [v]: 8, [h]: 8,
            width: 18, height: 18,
            borderTop: v === "top" ? "2px solid rgba(212,175,55,0.5)" : "none",
            borderBottom: v === "bottom" ? "2px solid rgba(212,175,55,0.5)" : "none",
            borderLeft: h === "left" ? "2px solid rgba(212,175,55,0.5)" : "none",
            borderRight: h === "right" ? "2px solid rgba(212,175,55,0.5)" : "none",
            pointerEvents: "none", zIndex: 20,
          }} />
        ))
      )}
    </div>

    {secondPlace && secondPlace.average !== null && (
      <div style={{
        position: "relative",
        borderRadius: 12,
        overflow: "hidden",
        background: "linear-gradient(135deg, rgba(192,192,192,0.08) 0%, rgba(10,10,14,0.95) 100%)",
        border: "1px solid rgba(192,192,192,0.2)",
        padding: "10px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        animation: "fp-title-up 0.45s ease 1.1s both",
        flexShrink: 0,
      }}>
        <span style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 22,
          fontWeight: 400,
          color: "#C0C0C0",
          lineHeight: 1,
          letterSpacing: "-1px",
          flexShrink: 0,
        }}>2°</span>
        <span style={{ fontSize: 20, lineHeight: 1, flexShrink: 0 }}>🥈</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 13,
            fontWeight: 700,
            color: "#C0C0C0",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            letterSpacing: "-0.2px",
          }}>{secondPlace.title}</div>
          <div style={{
            fontSize: 9,
            color: "rgba(192,192,192,0.4)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            marginTop: 2,
          }}>{secondPlace.artist}</div>
        </div>
        <span style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: 20,
          fontWeight: 400,
          color: "#C0C0C0",
          letterSpacing: "-1px",
          flexShrink: 0,
        }}>{secondPlace.average.toFixed(1)}</span>
      </div>
    )}
    </>
  );
}
// ─────────────────────────────────────────────────────────────────────────────

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

  type FinalEntry = { id: number; title: string; artist: string; average: number | null; voteCount: number };
  type CumulativeEntry = FinalEntry & { rawAverage?: number; trend?: "up" | "down" | "same" | "new"; previousRank?: number | null; nightCount?: number };
  const [finalLeaderboard, setFinalLeaderboard] = useState<FinalEntry[]>([]);
  const [finalCountdown, setFinalCountdown] = useState<number | null>(null);
  const [showFinalLeaderboard, setShowFinalLeaderboard] = useState(false);
  const [myVotes, setMyVotes] = useState<{ songId: number; value: number; night?: number }[]>([]);
  const [allRoomVotes, setAllRoomVotes] = useState<{ profile_id: number; song_id: number; value: number }[]>([]);
  const [lbView, setLbView] = useState<"stanza" | "mia" | "affinita">("stanza");
  const [lbMode, setLbMode] = useState<"serata" | "cumulativa">("serata");
  const [cumulativeLeaderboard, setCumulativeLeaderboard] = useState<CumulativeEntry[]>([]);
  const finalCountdownRef = useRef<NodeJS.Timeout | null>(null);
  const finalLeaderboardRef = useRef<FinalEntry[]>([]);
  const [firstPlaceLocked, setFirstPlaceLocked] = useState(false);
  const firstPlaceShownRef = useRef(false);
  const [userDismissedFirstPlace, setUserDismissedFirstPlace] = useState(false);

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

  useEffect(() => { finalLeaderboardRef.current = finalLeaderboard; }, [finalLeaderboard]);

  // ── Determina se l'utente corrente è host ──────────────────────────────
  const isHost = currentUser
    ? users.find((u) => u.profile_id === currentUser.profile_id)?.isHost ?? false
    : false;

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

  const votesKey = votes.map(v => `${v.profile_id}:${v.value}`).join(",");
  useEffect(() => {
    onVotedUsersChange?.(votes.map((v) => v.profile_id));
    onVotesChange?.(votes);
    if (showResultsRef.current && votes.length > 0) {
      setResultsVotes(votes);
      setRoomVotes((prev) => ({ ...prev, [roomCode]: votes }));
    }
  }, [votesKey]);

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
      if (!userToken) return;
      try {
        const res = await fetch(`/api/get-my-votes?roomCode=${roomCode}`, {
          headers: { Authorization: `Bearer ${userToken}` },
        });
        if (res.ok) setMyVotes(await res.json());
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

  const { chatComments } = useComments({ songId, roomCode, isEsibizione: status?.type === "esibizione", users });
  const chatEndRef = useRef<HTMLDivElement>(null);
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatComments.length]);
  const { floating, combo, sendReaction } = useReactions({ songId, roomCode, userToken });

  // ── AI Commento — sincronizzato via DB, generato solo dall'host ────────
  const aiStates = ["esibizione", "presentazione", "spot", "pausa", "attesa", "ospite", "collegamento"];
  const { visible: aiVisible, testo: aiTesto, triggerNow: aiTriggerNow } = useAiCommento({
    type: status?.type,
    eventIndex: status?.eventIndex ?? 0,
    songTitle: status?.song?.title,
    songArtist: status?.song?.artist,
    enabled: !!status?.type && aiStates.includes(status.type),
    isHost,                                       // ← nuovo: solo il host genera
    aiTesto: status?.aiTesto ?? null,             // ← nuovo: testo dal server
    aiCommentoAt: status?.aiCommentoAt ?? null,   // ← nuovo: timestamp dal server
  });

  useEffect(() => { if (status?.type) onFestivalTypeChange?.(status.type); }, [status?.type]);
  useEffect(() => { onSongIdChange?.(songId); }, [songId]);
  useEffect(() => { onShowResults?.(showResults); }, [showResults]);
  useEffect(() => {
    if (timeLeft === 0) { setShowResults(false); showResultsRef.current = false; setTimeLeft(null); }
  }, [timeLeft]);

  useEffect(() => {
    if (status?.type !== "classifica") {
      firstPlaceShownRef.current = false;
      setFirstPlaceLocked(false);
      setUserDismissedFirstPlace(false);
      return;
    }
    if (firstPlaceShownRef.current) return;
    if (userDismissedFirstPlace) return;
    if (!showFinalLeaderboard) return;

    const withVotes = finalLeaderboard.filter((s) => s.average !== null);
    const ascending = [...withVotes].sort((a, b) => (a.average ?? 0) - (b.average ?? 0));
    const total = ascending.length;
    const cidx = status?.classificaIndex ?? 0;
    const shownIndex = cidx - 1;
    const isWinner = total > 0 && shownIndex >= 0 && shownIndex === total - 1;

    if (isWinner) {
      firstPlaceShownRef.current = true;
      setFirstPlaceLocked(true);
    }
  }, [status?.type, status?.classificaIndex, finalLeaderboard, showFinalLeaderboard]);

  if (!status || !currentUser) return null;

  // ── Classifica finale render ──────────────────────────────────────────
  const renderClassificaFinale = () => {
    if (!showFinalLeaderboard && !firstPlaceLocked) {
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

    const withVotes = finalLeaderboard.filter((s) => s.average !== null);
    const ascending = [...withVotes].sort((a, b) => (a.average ?? 0) - (b.average ?? 0));
    const total = ascending.length;
    const cidx = status?.classificaIndex ?? 0;
    const shownIndex = cidx - 1;
    const isComplete = userDismissedFirstPlace || ((total > 0 && shownIndex > total - 1) && !firstPlaceLocked);

    if (!isComplete) {
      const effectiveCidx = firstPlaceLocked ? total : cidx;
      const shown = effectiveCidx > 0 ? ascending[effectiveCidx - 1] : null;
      const realPos = total - effectiveCidx + 1;
      const prevRevealed = ascending.slice(0, Math.max(0, effectiveCidx - 1)).reverse();

      const isTop3 = cidx > 0 && realPos <= 3;
      const medal = realPos === 1 ? "🥇" : realPos === 2 ? "🥈" : realPos === 3 ? "🥉" : null;

      const podiumColor = realPos === 1 ? "#D4AF37" : realPos === 2 ? "#C0C0C0" : realPos === 3 ? "#CD7F32" : "#ededed";
      const podiumBg = realPos === 1
        ? "linear-gradient(135deg, rgba(212,175,55,0.12) 0%, rgba(212,175,55,0.04) 100%)"
        : realPos === 2
        ? "linear-gradient(135deg, rgba(192,192,192,0.1) 0%, rgba(192,192,192,0.03) 100%)"
        : realPos === 3
        ? "linear-gradient(135deg, rgba(205,127,50,0.1) 0%, rgba(205,127,50,0.03) 100%)"
        : "transparent";
      const podiumBorder = realPos === 1
        ? "rgba(212,175,55,0.3)"
        : realPos === 2
        ? "rgba(192,192,192,0.2)"
        : realPos === 3
        ? "rgba(205,127,50,0.2)"
        : "rgba(255,255,255,0.06)";

      return (
        <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "16px 14px 14px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexShrink: 0 }}>
            <span className="ib-pill" style={{ borderColor: "rgba(212,175,55,0.25)", color: "rgba(212,175,55,0.8)" }}>
              <Trophy size={9} color="#D4AF37" strokeWidth={2} style={{ marginRight: 2 }} />
              Classifica finale
            </span>
            {cidx > 0 && (
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "rgba(255,255,255,0.18)" }}>
                {realPos}° / {total}
              </span>
            )}
          </div>

          {shown && realPos === 1 ? (
            <FirstPlaceReveal
              key="fp-winner"
              song={{ title: shown.title, artist: shown.artist, average: shown.average!, voteCount: shown.voteCount }}
              secondPlace={ascending.length >= 2 ? ascending[ascending.length - 2] : null}
            />
          ) : shown ? (
            <div
              key={`entry-${cidx}`}
              className="cl-reveal-entry"
              style={{
                flexShrink: 0,
                marginBottom: prevRevealed.length > 0 ? 14 : 0,
                background: podiumBg,
                border: `1px solid ${podiumBorder}`,
                borderRadius: 16,
                padding: "18px 16px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <span
                  className={isTop3 ? "cl-pos-pop" : undefined}
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: isTop3 ? 42 : 28,
                    fontWeight: 400,
                    color: podiumColor,
                    lineHeight: 1,
                    letterSpacing: "-1px",
                  }}
                >
                  {realPos}°
                </span>
                {medal && <span style={{ fontSize: 32, lineHeight: 1 }}>{medal}</span>}
              </div>
              <div style={{ fontSize: isTop3 ? 24 : 20, fontWeight: 800, color: isTop3 ? podiumColor : "#ededed", lineHeight: 1.15, letterSpacing: "-0.3px", marginBottom: 4 }}>
                {shown.title}
              </div>
              <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 14 }}>
                {shown.artist}
              </div>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8, borderTop: `1px solid ${podiumBorder}`, paddingTop: 12 }}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 48, fontWeight: 400, color: podiumColor, lineHeight: 1, letterSpacing: "-2px" }}>
                  {shown.average!.toFixed(1)}
                </span>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.25)" }}>
                  {shown.voteCount} {shown.voteCount === 1 ? "voto" : "voti"}
                </span>
              </div>
            </div>
          ) : (
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: 14, background: "rgba(212,175,55,0.06)", border: "1px solid rgba(212,175,55,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Trophy size={20} color="#D4AF37" strokeWidth={1.5} style={{ opacity: 0.5 }} />
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.2)", letterSpacing: "0.04em" }}>In attesa…</div>
              <div style={{ fontSize: 11, color: "rgba(255,255,255,0.1)" }}>{total} {total === 1 ? "canzone" : "canzoni"} in gara</div>
            </div>
          )}

          {prevRevealed.length > 0 && (
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 3, minHeight: 0 }}>
              <div style={{ fontSize: 9, letterSpacing: "0.08em", textTransform: "uppercase", color: "rgba(255,255,255,0.18)", fontWeight: 600, marginBottom: 4, flexShrink: 0 }}>
                Già svelate
              </div>
              {prevRevealed.map((song, i) => {
                const pos = total - (cidx - 2 - i);
                const m = pos === 1 ? "🥇" : pos === 2 ? "🥈" : pos === 3 ? "🥉" : null;
                return (
                  <div key={song.id} className="ib-row ib-row-other cl-reveal-row" style={{ opacity: 0.55, animationDelay: `${i * 30}ms` }}>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.2)", width: 20, textAlign: "center", flexShrink: 0 }}>{m ?? pos}</span>
                    <span style={{ flex: 1, minWidth: 0 }}>
                      <span style={{ display: "block", fontSize: 12, color: "rgba(255,255,255,0.45)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{song.title}</span>
                      <span style={{ display: "block", fontSize: 9, color: "rgba(255,255,255,0.18)", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 1 }}>{song.artist}</span>
                    </span>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "rgba(255,255,255,0.35)", flexShrink: 0 }}>{song.average!.toFixed(1)}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      );
    }

    // ── CLASSIFICA COMPLETA ─────────────────────────────────────────────
    const myVotesMap = (() => {
      const latestNight = myVotes.length > 0 ? Math.max(...myVotes.map((v) => v.night ?? 0)) : 0;
      const filtered = isFinite(latestNight) ? myVotes.filter((v) => v.night === latestNight) : myVotes;
      return new Map<number, number>(filtered.map((v) => [v.songId, v.value]));
    })();

    const baseList = lbMode === "cumulativa" && cumulativeLeaderboard.length > 0 ? cumulativeLeaderboard : finalLeaderboard;
    const baseWithVotes = baseList.filter((s) => s.average !== null);
    const overall = baseWithVotes.length > 0 ? baseWithVotes.reduce((s, e) => s + e.average!, 0) / baseWithVotes.length : null;

    const personalList = [...baseList].sort((a, b) => {
      const vA = myVotesMap.get(a.id) ?? null;
      const vB = myVotesMap.get(b.id) ?? null;
      if (vA !== null && vB !== null) return vB - vA;
      if (vA !== null) return -1;
      if (vB !== null) return 1;
      if (a.average !== null && b.average !== null) return b.average - a.average;
      return 0;
    });
    const roomRankMap = new Map(baseList.map((s, i) => [s.id, i + 1]));
    const activeList = lbView === "stanza" ? baseList : personalList;

    const myProfileId = currentUser.profile_id;
    const myAllVotes = allRoomVotes.filter((v) => v.profile_id === myProfileId);
    let roomCompat: number | null = null;
    if (myAllVotes.length > 0) {
      const pairs: { my: number; avg: number }[] = [];
      myAllVotes.forEach((mv) => {
        const others = allRoomVotes.filter((v) => v.song_id === mv.song_id && v.profile_id !== myProfileId);
        if (!others.length) return;
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
      if (!pairs.length) return null;
      const avgDiff = pairs.reduce((s, p) => s + Math.abs(p.my - p.their), 0) / pairs.length;
      const pct = Math.max(0, Math.round((1 - avgDiff / 9) * 100));
      const user = users.find((u) => u.profile_id === pid);
      return user ? { user, pct, songs: pairs.length } : null;
    }).filter(Boolean).sort((a, b) => b!.pct - a!.pct) as { user: User; pct: number; songs: number }[];
    const hasCompat = roomCompat !== null || personCompats.length > 0;

    return (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "16px 14px 14px" }}>
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
                <button key={v} onClick={() => setLbView(v as any)}
                  style={{ width: 34, height: 28, display: "flex", alignItems: "center", justifyContent: "center", borderRadius: 6, border: "none", cursor: "pointer", transition: "background 0.15s", background: isActive ? "rgba(255,255,255,0.09)" : "transparent", color: isActive ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.28)" }}>
                  <Icon size={13} strokeWidth={isActive ? 2.5 : 1.5} />
                </button>
              );
            })}
          </div>
        </div>

        {(lbView === "stanza" || lbView === "mia") && cumulativeLeaderboard.length > 0 && (
          <div style={{ display: "flex", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 8, padding: 2, gap: 2, marginBottom: 12, flexShrink: 0 }}>
            {(["serata", "cumulativa"] as const).map((m) => (
              <button key={m} onClick={() => setLbMode(m)} style={{ flex: 1, padding: "5px 0", borderRadius: 6, border: "none", fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.15s", background: lbMode === m ? "rgba(255,255,255,0.08)" : "transparent", color: lbMode === m ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.28)" }}>
                {m === "serata" ? "Questa serata" : "Tutte le serate"}
              </button>
            ))}
          </div>
        )}

        {lbView === "stanza" && overall !== null && (
          <div style={{ flexShrink: 0, marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 52, fontWeight: 400, color: "#ededed", lineHeight: 1, letterSpacing: "-1px" }}>{overall.toFixed(2)}</div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginTop: 4 }}>
              {lbMode === "cumulativa" ? "media cumulativa" : "media serata"} · {baseWithVotes.length} {baseWithVotes.length === 1 ? "canzone" : "canzoni"}
            </div>
          </div>
        )}

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

        {(lbView === "stanza" || lbView === "mia") && (
          <div style={{ display: "flex", flexDirection: "column", gap: 5, overflowY: "auto", flex: 1 }}>
            {activeList.length === 0 ? (
              <div style={{ fontSize: 13, color: "rgba(255,255,255,0.22)", textAlign: "center", paddingTop: 24 }}>Caricamento…</div>
            ) : activeList.map((song, i) => {
              const hasV = song.average !== null;
              const isFirst = lbView === "stanza" && hasV && i === 0;
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
                <div key={song.id} className={"ib-row " + (isFirst ? "ib-row-first" : "ib-row-other")} style={{ opacity: hasV ? 1 : 0.4 }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: isFirst ? "#D4AF37" : "rgba(255,255,255,0.2)", width: 16, textAlign: "center", flexShrink: 0 }}>
                    {isFirst ? <Trophy size={11} color="#D4AF37" strokeWidth={2} /> : i + 1}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: isFirst ? 700 : 400, color: hasV ? "#ededed" : "rgba(255,255,255,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{song.title}</span>
                    <span style={{ display: "block", fontSize: 9, color: isFirst ? "rgba(212,175,55,0.6)" : "rgba(255,255,255,0.25)", letterSpacing: "0.06em", textTransform: "uppercase", marginTop: 1 }}>{song.artist}</span>
                  </span>
                  {arrow && <span style={{ fontSize: 10, flexShrink: 0, marginRight: 4, color: arrow === "up" ? "#6ee7b7" : "#f87171" }}>{arrow === "up" ? "▲" : "▼"}</span>}
                  {isNew && <span style={{ fontSize: 8, flexShrink: 0, marginRight: 6, color: "#D4AF37", fontFamily: "'DM Mono', monospace", fontWeight: 600, background: "rgba(212,175,55,0.12)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 4, padding: "1px 4px" }}>NEW</span>}
                  {lbView === "mia" && roomRank !== null && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.18)", flexShrink: 0, marginRight: 6 }}>#{roomRank}</span>}
                  {lbView === "stanza" && hasV && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.2)", flexShrink: 0, marginRight: 6 }}>{song.voteCount}v</span>}
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: isFirst ? 17 : 15, color: isFirst ? "#D4AF37" : hasV ? "#ededed" : "rgba(255,255,255,0.15)", flexShrink: 0 }}>
                    {lbView === "mia" && myVote !== null ? myVote.toFixed(1) : hasV ? song.average!.toFixed(1) : "—"}
                  </span>
                </div>
              );
            })}
          </div>
        )}

        {lbView === "affinita" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 14, overflowY: "auto", flex: 1 }}>
            {!hasCompat ? (
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", textAlign: "center", marginTop: 20 }}>Dati non disponibili</div>
            ) : (
              <>
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
                  const votingUsers = users.filter((u) => songVotes.some((v) => v.profile_id === u.profile_id));
                  const pairCompats: { userA: string; userB: string; pct: number }[] = [];
                  for (let a = 0; a < votingUsers.length; a++) {
                    for (let b = a + 1; b < votingUsers.length; b++) {
                      const vA = songVotes.find((v) => v.profile_id === votingUsers[a].profile_id)?.value;
                      const vB = songVotes.find((v) => v.profile_id === votingUsers[b].profile_id)?.value;
                      if (vA !== undefined && vB !== undefined)
                        pairCompats.push({ userA: votingUsers[a].username, userB: votingUsers[b].username, pct: Math.max(0, Math.round((1 - Math.abs(vA - vB) / 9) * 100)) });
                    }
                  }
                  pairCompats.sort((a, b) => b.pct - a.pct);
                  if (songRoomCompat === null && !pairCompats.length) return null;
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
      case "presentazione": {
        const eIdx = status.eventIndex ?? 0;
        return <ScreenPresentazione eventDetails={SERATA_TIMELINE[eIdx] as any} nextEvent={SERATA_TIMELINE[eIdx + 1] as any} aiTesto={aiVisible ? aiTesto : undefined} />;
      }
      case "spot": {
        const eIdx = status.eventIndex ?? 0;
        return <ScreenSpot eventDetails={SERATA_TIMELINE[eIdx] as any} nextEvent={SERATA_TIMELINE[eIdx + 1] as any} aiTesto={aiVisible ? aiTesto : undefined} />;
      }
      case "pausa": {
        const eIdx = status.eventIndex ?? 0;
        return <ScreenPausa eventDetails={SERATA_TIMELINE[eIdx] as any} nextEvent={SERATA_TIMELINE[eIdx + 1] as any} aiTesto={aiVisible ? aiTesto : undefined} />;
      }
      case "attesa": {
        const eIdx = status.eventIndex ?? 0;
        return <ScreenAttesa eventDetails={SERATA_TIMELINE[eIdx] as any} nextEvent={SERATA_TIMELINE[eIdx + 1] as any} aiTesto={aiVisible ? aiTesto : undefined} />;
      }
      case "fine": return <ScreenFine />;
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
      if (firstPlaceLocked) {
        return (
          <button
            className="ib-btn ib-btn-live"
            onClick={() => { setFirstPlaceLocked(false); setUserDismissedFirstPlace(true); }}
            style={{ background: "rgba(212,175,55,0.12)", color: "rgba(212,175,55,0.85)", border: "1px solid rgba(212,175,55,0.25)" }}
          >
            🏆 Vedi le statistiche
          </button>
        );
      }
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
      <style dangerouslySetInnerHTML={{ __html: styles + statusScreenStyles }} />
      <div className="ib-root ib-fadein" style={{ display: "flex", flexDirection: "column", gap: 10, height: "100%", padding: "0 0px" }}>
        <div className="ib-card" style={{ flex: 1, minHeight: 0, position: "relative" }}>
          {renderCard()}
        </div>
        <div style={{ flexShrink: 0 }}>{renderButton()}</div>
      </div>
    </>
  );
}