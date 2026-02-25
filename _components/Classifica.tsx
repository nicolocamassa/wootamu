"use client";
// Classifica.tsx — classifica voti per singola canzone con tab affinità

import React, { useState } from "react";
import { Trophy, Users } from "lucide-react";
import type { Vote, User, UserRoom } from "./types";

const RESULTS_DURATION = 60;

type ClassificaProps = {
  votes: Vote[];
  users: User[];
  currentUserId: number;
  timeLeft: number | null;
  roomCode: string;
  userRooms: UserRoom[];
  activeRoomIndex: number;
  onRoomChange: (i: number) => void;
  roomVotes: Record<string, Vote[]>;
  roomUsers: Record<string, User[]>;
};

const compatColor = (p: number) =>
  p >= 80 ? "#6ee7b7" : p >= 60 ? "#D4AF37" : p >= 40 ? "#fb923c" : "#f87171";

const compatLabel = (p: number) =>
  p >= 85 ? "Gemelli" : p >= 70 ? "In sintonia" : p >= 55 ? "Simili" : p >= 40 ? "Diversi" : "Opposti";

function singleSongCompat(myValue: number, theirValue: number): number {
  return Math.max(0, Math.round((1 - Math.abs(myValue - theirValue) / 9) * 100));
}

type View = "classifica" | "affinita";

export function Classifica({
  votes,
  users,
  currentUserId,
  timeLeft,
  roomCode,
  userRooms,
  activeRoomIndex,
  onRoomChange,
  roomVotes,
  roomUsers,
}: ClassificaProps) {
  const [view, setView] = useState<View>("classifica");

  const isMultiRoom = userRooms.length > 1;
  const activeCode = isMultiRoom
    ? (userRooms[activeRoomIndex]?.code ?? roomCode)
    : roomCode;

  const activeVotes = isMultiRoom
    ? (roomVotes[activeCode]?.length > 0 ? roomVotes[activeCode] : (activeCode === roomCode ? votes : []))
    : votes;

  const activeUsers = isMultiRoom
    ? (roomUsers[activeCode]?.length > 0 ? roomUsers[activeCode] : (activeCode === roomCode ? users : []))
    : users;

  const sorted = [...activeUsers].sort((a, b) => {
    const vA = activeVotes.find((v) => v.user_id === a.id)?.value ?? -1;
    const vB = activeVotes.find((v) => v.user_id === b.id)?.value ?? -1;
    return vB - vA;
  });

  const voted = activeVotes.filter((v) => v.value !== undefined);
  const average = voted.length > 0
    ? voted.reduce((s, v) => s + v.value, 0) / voted.length
    : null;

  // Compatibilità sulla singola canzone
  const myVote = activeVotes.find((v) => v.user_id === currentUserId);
  const othersVotes = activeVotes.filter((v) => v.user_id !== currentUserId);

  let roomCompat: number | null = null;
  if (myVote && othersVotes.length > 0) {
    const avg = othersVotes.reduce((s, v) => s + v.value, 0) / othersVotes.length;
    roomCompat = Math.max(0, Math.round((1 - Math.abs(myVote.value - avg) / 9) * 100));
  }

  const personCompats = activeUsers
    .filter((u) => u.id !== currentUserId)
    .map((u) => {
      const their = activeVotes.find((v) => v.user_id === u.id);
      if (!myVote || !their) return null;
      return { user: u, pct: singleSongCompat(myVote.value, their.value) };
    })
    .filter(Boolean)
    .sort((a, b) => b!.pct - a!.pct) as { user: User; pct: number }[];

  const hasCompat = myVote !== undefined && (roomCompat !== null || personCompats.length > 0);

  const circ = 2 * Math.PI * 10;

  return (
    <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "16px 14px 14px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, flexShrink: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span className="ib-pill">
            <span className="ib-dot" />
            Risultati
          </span>
          {isMultiRoom && (
            <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "'DM Mono', monospace" }}>
              {activeCode}
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          {hasCompat && (
            <div style={{ display: "flex", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 8, padding: 2, gap: 2 }}>
              <button
                onClick={() => setView("classifica")}
                style={{ padding: "4px 9px", borderRadius: 6, border: "none", fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.15s", background: view === "classifica" ? "rgba(255,255,255,0.09)" : "transparent", color: view === "classifica" ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.28)" }}
              >
                <Trophy size={9} style={{ marginRight: 3, verticalAlign: "middle" }} />
                Voti
              </button>
              <button
                onClick={() => setView("affinita")}
                style={{ padding: "4px 9px", borderRadius: 6, border: "none", fontFamily: "'Inter', sans-serif", fontSize: 10, fontWeight: 600, letterSpacing: "0.04em", textTransform: "uppercase", cursor: "pointer", transition: "all 0.15s", background: view === "affinita" ? "rgba(255,255,255,0.09)" : "transparent", color: view === "affinita" ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.28)" }}
              >
                <Users size={9} style={{ marginRight: 3, verticalAlign: "middle" }} />
                Affinità
              </button>
            </div>
          )}

          {timeLeft !== null && timeLeft > 0 && (
            <div style={{ position: "relative", width: 30, height: 30, flexShrink: 0 }}>
              <svg width="30" height="30" viewBox="0 0 24 24" style={{ transform: "rotate(-90deg)" }}>
                <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="1.5" />
                <circle cx="12" cy="12" r="10" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="1.5"
                  strokeDasharray={`${circ}`}
                  strokeDashoffset={`${circ * (1 - timeLeft / RESULTS_DURATION)}`}
                  strokeLinecap="round" style={{ transition: "stroke-dashoffset 1s linear" }}
                />
              </svg>
              <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'DM Mono', monospace", fontSize: 8, color: "rgba(255,255,255,0.35)" }}>
                {timeLeft}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Media */}
      <div style={{ flexShrink: 0, marginBottom: 14, paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        {average !== null ? (
          <>
            <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 52, fontWeight: 400, color: "#ededed", lineHeight: 1, letterSpacing: "-1px" }}>
              {average.toFixed(1)}
            </div>
            <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginTop: 4 }}>
              {voted.length} {voted.length === 1 ? "voto" : "voti"}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: "rgba(255,255,255,0.22)" }}>
            {activeUsers.length === 0 ? "Caricamento…" : "In attesa dei voti…"}
          </div>
        )}
      </div>

      {/* ── VISTA CLASSIFICA ── */}
      {view === "classifica" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 5, overflowY: "auto", flex: 1 }}>
          {activeUsers.length === 0 ? (
            <div style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", textAlign: "center", marginTop: 20 }}>
              Caricamento utenti…
            </div>
          ) : sorted.map((u, i) => {
            const vote = activeVotes.find((v) => v.user_id === u.id);
            const isMe = u.id === currentUserId;
            const isFirst = !!vote && i === 0;
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
                  {isMe && <span style={{ color: "rgba(255,255,255,0.22)", fontWeight: 400 }}> · tu</span>}
                </span>
                {vote ? (
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, color: isFirst ? "#D4AF37" : "#ededed" }}>
                    {vote.value.toFixed(1)}
                  </span>
                ) : (
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: "rgba(255,255,255,0.15)" }}>—</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── VISTA AFFINITÀ ── */}
      {view === "affinita" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 10, overflowY: "auto", flex: 1 }}>

          {/* Il mio voto */}
          {myVote && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Il tuo voto</span>
              <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, color: "#ededed" }}>{myVote.value.toFixed(1)}</span>
            </div>
          )}

          {/* Vs stanza */}
          {roomCompat !== null && (
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 12, padding: "12px 14px" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                <span style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontWeight: 500 }}>Con la stanza</span>
                <div style={{ display: "flex", alignItems: "baseline", gap: 5 }}>
                  <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 22, color: compatColor(roomCompat), lineHeight: 1 }}>
                    {roomCompat}%
                  </span>
                  <span style={{ fontSize: 10, color: compatColor(roomCompat), opacity: 0.7 }}>
                    {compatLabel(roomCompat)}
                  </span>
                </div>
              </div>
              <div style={{ height: 3, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div style={{ height: "100%", width: `${roomCompat}%`, borderRadius: 999, background: compatColor(roomCompat), transition: "width 0.6s ease" }} />
              </div>
              {average !== null && myVote && (
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8 }}>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
                    Tu: <span style={{ color: "rgba(255,255,255,0.5)" }}>{myVote.value.toFixed(1)}</span>
                  </span>
                  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)" }}>
                    Media stanza: <span style={{ color: "rgba(255,255,255,0.5)" }}>{average.toFixed(1)}</span>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Vs singoli */}
          {personCompats.length > 0 && (
            <>
              <p style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", letterSpacing: "0.07em", textTransform: "uppercase", margin: "2px 0 2px", fontWeight: 500 }}>
                Persona per persona
              </p>
              {personCompats.map(({ user: u, pct }) => {
                const their = activeVotes.find((v) => v.user_id === u.id);
                return (
                  <div key={u.id} className="ib-row ib-row-other">
                    <span style={{ flex: 1, fontSize: 13, color: "rgba(255,255,255,0.55)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {u.username}
                    </span>
                    {their && (
                      <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: "rgba(255,255,255,0.25)", marginRight: 8, flexShrink: 0 }}>
                        {their.value.toFixed(1)}
                      </span>
                    )}
                    <div style={{ width: 50, height: 3, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden", flexShrink: 0, marginRight: 8 }}>
                      <div style={{ height: "100%", width: `${pct}%`, borderRadius: 999, background: compatColor(pct), transition: "width 0.6s ease" }} />
                    </div>
                    <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: compatColor(pct), flexShrink: 0, minWidth: 34, textAlign: "right" }}>
                      {pct}%
                    </span>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* Tab stanze multi-room */}
      {isMultiRoom && (
        <div style={{ display: "flex", gap: 6, marginTop: 12, flexShrink: 0, justifyContent: "center" }}>
          {userRooms.map((r, i) => (
            <button key={r.code} onClick={() => onRoomChange(i)} style={{ padding: "4px 10px", borderRadius: 999, border: `1px solid ${i === activeRoomIndex ? "rgba(212,175,55,0.3)" : "rgba(255,255,255,0.07)"}`, fontSize: 10, fontFamily: "'DM Mono', monospace", fontWeight: 500, cursor: "pointer", background: i === activeRoomIndex ? "rgba(212,175,55,0.15)" : "rgba(255,255,255,0.05)", color: i === activeRoomIndex ? "#D4AF37" : "rgba(255,255,255,0.35)", transition: "all 0.15s" }}>
              {r.event}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}