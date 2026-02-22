"use client";
import { useState, useEffect, useRef } from "react";
import { SendHorizonal } from "lucide-react";
import { pusherClient } from "@/_lib/pusherClient";

type CurrentEventProps = {
  festivalType: string | null;
  songId: number | null;
  roomCode: string;
  userToken: string | null;
  onCommentSent: () => void;
  hasCommented: boolean;
  users: { id: number; username: string }[];
  votes?: { user_id: number; value: number }[];
  currentUser?: { id: number; username: string };
  hasVoted?: boolean;
};
type MessageType = "join" | "leave" | "stat" | "vote" | "alert";
type Message = {
  id: number;
  text: string;
  type: MessageType;
};
type PusherNotification = {
  roomCode: string;
  text: string;
  type: MessageType;
  voteValue?: number;
  voterUserId?: number;
};
type RoomStats = {
  averageTotal: number | null;
  songsLeft: number;
  bestSong: string | null;
  worstSong: string | null;
};
type StatPanel = {
  label: string;
  value: string;
  color?: string;
};

const msgColor = (type: MessageType) => {
  switch (type) {
    case "join":  return "rgba(147,197,253,0.9)";
    case "leave": return "rgba(255,255,255,0.25)";
    case "vote":  return "rgba(134,239,172,0.9)";
    case "alert": return "#D4AF37";
    case "stat":  return "rgba(255,255,255,0.45)";
  }
};

async function broadcastNotification(payload: PusherNotification) {
  try {
    await fetch("/api/room-notification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
  } catch (err) {
    console.error("broadcastNotification error", err);
  }
}

export default function CurrentEvent({
  festivalType,
  songId,
  roomCode,
  userToken,
  onCommentSent,
  hasCommented,
  users,
  votes = [],
  currentUser,
  hasVoted = false,
}: CurrentEventProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<Message | null>(null);
  const [stats, setStats] = useState<RoomStats | null>(null);
  const [flash, setFlash] = useState(false);
  const [panelIndex, setPanelIndex] = useState(0);

  const touchStartX = useRef<number | null>(null);
  const panelResetRef = useRef<NodeJS.Timeout | null>(null);
  const messageIdRef = useRef(0);
  const queueRef = useRef<Message[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const randomTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isShowingRef = useRef(false);
  const statsRef = useRef<RoomStats | null>(null);
  const votesRef = useRef(votes);
  const festivalTypeRef = useRef(festivalType);
  const usersRef = useRef(users);
  const hasVotedRef = useRef(hasVoted);

  useEffect(() => { statsRef.current = stats; }, [stats]);
  useEffect(() => { votesRef.current = votes; }, [votes]);
  useEffect(() => { festivalTypeRef.current = festivalType; }, [festivalType]);
  useEffect(() => { usersRef.current = users; }, [users]);
  useEffect(() => { hasVotedRef.current = hasVoted; }, [hasVoted]);

  const prevUsersRef = useRef<{ id: number; username: string }[]>([]);
  const prevVotesRef = useRef<{ user_id: number; value: number }[]>([]);
  const prevFestivalTypeRef = useRef<string | null>(null);
  const broadcastedKeysRef = useRef<Set<string>>(new Set());

  // ─── Queue display ────────────────────────────────────────────────────────
  const showNext = () => {
    if (queueRef.current.length === 0) {
      setCurrentMessage(null);
      isShowingRef.current = false;
      return;
    }
    const next = queueRef.current.shift()!;
    setCurrentMessage(next);
    isShowingRef.current = true;
    timerRef.current = setTimeout(showNext, 4500);
  };

  const enqueueLocal = (text: string, type: MessageType) => {
    const msg: Message = { id: messageIdRef.current++, text, type };
    queueRef.current.push(msg);
    if (!isShowingRef.current) showNext();
  };

  const broadcastOnce = (key: string, payload: Omit<PusherNotification, "roomCode">) => {
    if (broadcastedKeysRef.current.has(key)) return;
    broadcastedKeysRef.current.add(key);
    broadcastNotification({ ...payload, roomCode });
  };

  // ─── Pusher listener ──────────────────────────────────────────────────────
  useEffect(() => {
    const channel = pusherClient.subscribe("festival");
    const handleNotification = (data: PusherNotification) => {
      if (data.roomCode !== roomCode) return;
      if (data.type === "vote" && data.voteValue !== undefined && data.voterUserId !== undefined) {
        const isMe = data.voterUserId === currentUser?.id;
        if (isMe) return;
        const showValue = festivalTypeRef.current !== "votazione" || hasVotedRef.current;
        const voterName = usersRef.current.find((u) => u.id === data.voterUserId)?.username ?? "Qualcuno";
        const displayText = showValue
          ? `${voterName} ha votato ${data.voteValue!.toFixed(1)} ✅`
          : `${voterName} ha votato ✅`;
        enqueueLocal(displayText, "vote");
        return;
      }
      enqueueLocal(data.text, data.type);
    };
    channel.bind("room-notification", handleNotification);
    return () => { channel.unbind("room-notification", handleNotification); };
  }, [roomCode, currentUser?.id]);

  // ─── Reset on song change ─────────────────────────────────────────────────
  useEffect(() => {
    broadcastedKeysRef.current = new Set();
    queueRef.current = [];
    setCurrentMessage(null);
    isShowingRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    setPanelIndex(0);
    prevVotesRef.current = [];
  }, [songId]);

  // ─── Join / Leave ─────────────────────────────────────────────────────────
  useEffect(() => {
    const prev = prevUsersRef.current;
    if (prev.length === 0) { prevUsersRef.current = users; return; }
    const joined = users.filter((u) => !prev.find((p) => p.id === u.id));
    const left   = prev.filter((p) => !users.find((u) => u.id === p.id));
    joined.forEach((u) => {
      broadcastOnce(`join_${u.id}_${songId}`, { text: `${u.username} si è unito 👋`, type: "join" });
      setFlash(true);
      setTimeout(() => setFlash(false), 1000);
    });
    left.forEach((u) => {
      broadcastOnce(`leave_${u.id}_${Date.now()}`, { text: `${u.username} ha lasciato la stanza`, type: "leave" });
    });
    prevUsersRef.current = users;
  }, [users]);

  // ─── Votes ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const prev = prevVotesRef.current;
    if (prev.length === 0 && votes.length > 0) {
      prevVotesRef.current = votes;
      return;
    }
    const newVotes = votes.filter((v) => !prev.find((p) => p.user_id === v.user_id));
    newVotes.forEach((v) => {
      broadcastOnce(`vote_${v.user_id}_${songId}`, {
        text: "",
        type: "vote",
        voteValue: v.value,
        voterUserId: v.user_id,
      });
    });
    if (newVotes.length > 0) prevVotesRef.current = votes;
    if (festivalType !== "votazione") return;
    const votedCount = votes.length;
    const totalCount = users.length;
    if (votedCount === Math.floor(totalCount / 2) && votedCount > 0)
      broadcastOnce(`half_voted_${songId}`, { text: `${votedCount} su ${totalCount} hanno votato`, type: "stat" });
    if (votedCount === totalCount - 1 && totalCount > 1)
      broadcastOnce(`one_left_${songId}`, { text: "Manca solo un voto! ⏳", type: "alert" });
    if (votedCount === totalCount && totalCount > 0)
      broadcastOnce(`all_voted_${songId}`, { text: "Tutti hanno votato! 🎉", type: "alert" });
    if (votes.length >= 2) {
      const values = votes.map((v) => v.value);
      const max = Math.max(...values), min = Math.min(...values);
      const diff = parseFloat((max - min).toFixed(1));
      const avg = parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
      if (diff <= 1.5)
        broadcastOnce(`agree_${avg}_${songId}`, { text: `La stanza è d'accordo! Media ${avg} 🤝`, type: "stat" });
      else if (diff >= 5)
        broadcastOnce(`split_${diff}_${songId}`, { text: `Pareri divisi! Differenza di ${diff} punti 🤔`, type: "alert" });
      broadcastOnce(`avg_${avg}_${songId}`, { text: `Media attuale: ${avg} ⭐`, type: "stat" });
      if (stats?.averageTotal != null) {
        const g = stats.averageTotal;
        if (avg > g + 1)
          broadcastOnce(`above_avg_${avg}_${songId}`, { text: `Meglio della media serata (${g.toFixed(1)}) 🔥`, type: "alert" });
        else if (avg < g - 1)
          broadcastOnce(`below_avg_${avg}_${songId}`, { text: `Sotto la media serata (${g.toFixed(1)}) 📉`, type: "stat" });
      }
    }
  }, [votes, festivalType]);

  // ─── Post-voting summary ──────────────────────────────────────────────────
  useEffect(() => {
    const prev = prevFestivalTypeRef.current;
    if (prev === "votazione" && festivalType !== "votazione" && votes.length > 0) {
      const values = votes.map((v) => v.value);
      const avg = parseFloat((values.reduce((a, b) => a + b, 0) / values.length).toFixed(1));
      const max = Math.max(...values), min = Math.min(...values);
      const diff = parseFloat((max - min).toFixed(1));
      const topVoter = users.find((u) => u.id === votes.find((v) => v.value === max)?.user_id);
      const lowVoter = users.find((u) => u.id === votes.find((v) => v.value === min)?.user_id);
      setTimeout(() => broadcastOnce(`final_avg_${songId}`, { text: `Voto finale: ${avg} ⭐`, type: "stat" }), 1000);
      if (topVoter)
        setTimeout(() => broadcastOnce(`top_voter_${songId}`, { text: `Più generoso: ${topVoter.username} con ${max} 😄`, type: "stat" }), 6000);
      if (lowVoter && lowVoter.id !== topVoter?.id)
        setTimeout(() => broadcastOnce(`low_voter_${songId}`, { text: `Più severo: ${lowVoter.username} con ${min} 😤`, type: "stat" }), 11000);
      if (diff >= 5)
        setTimeout(() => broadcastOnce(`big_diff_${songId}`, { text: `Grande divisione! (${diff} punti di differenza) 🤔`, type: "alert" }), 16000);
    }
    prevFestivalTypeRef.current = festivalType;
  }, [festivalType]);

  // ─── Room stats fetch ─────────────────────────────────────────────────────
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await fetch(`/api/room-stats?roomCode=${roomCode}`);
        if (!res.ok) return;
        setStats(await res.json());
      } catch (err) { console.error(err); }
    };
    fetchStats();
  }, [songId]);

  // ─── Random stat panel ────────────────────────────────────────────────────
  const buildPanels = (
    s: RoomStats | null,
    v: { user_id: number; value: number }[],
    ft: string | null,
    hv: boolean
  ): StatPanel[] => {
    const panels: StatPanel[] = [];

    // Primo panel sempre presente: stato corrente
    const idleLabel = (() => {
      if (!ft || ft === "pausa") return "In pausa ☕";
      if (ft === "votazione") {
        if (v.length === 0) return "In attesa dei voti…";
        if (v.length < usersRef.current.length) return `${v.length} / ${usersRef.current.length} voti ricevuti`;
        return "Tutti hanno votato! 🎉";
      }
      return "Nessuna nuova notifica";
    })();
    panels.push({ label: "", value: idleLabel, color: "rgba(255,255,255,0.2)" });

    if (s?.averageTotal !== null && s?.averageTotal !== undefined)
      panels.push({ label: "Media serata", value: `${s.averageTotal.toFixed(1)} ⭐` });
    if (s?.bestSong)
      panels.push({ label: "Più amata", value: s.bestSong, color: "#D4AF37" });
    if (s?.worstSong && s.worstSong !== s.bestSong)
      panels.push({ label: "Meno amata", value: s.worstSong });
    if (s?.songsLeft !== undefined && s.songsLeft > 0)
      panels.push({ label: "Canzoni rimaste", value: `${s.songsLeft} 🎵` });
    if (v.length >= 2 && (ft === "votazione" || hv)) {
      const values = v.map((x) => x.value);
      const avg = (values.reduce((a, b) => a + b, 0) / values.length).toFixed(1);
      const max = Math.max(...values), min = Math.min(...values);
      panels.push({ label: "Media voti", value: `${avg} ⭐` });
      panels.push({ label: "Max / Min", value: `${max} / ${min}` });
    }
    panels.push({ label: "Partecipanti", value: `${usersRef.current.length} 👥` });
    return panels;
  };

  useEffect(() => {
    // Solo il client con l'id più basso tra gli utenti presenti fa da "leader"
    // e broadcasta la notifica per tutti. Gli altri la ricevono via Pusher.
    const amLeader = () => {
      const ids = usersRef.current.map((u) => u.id);
      if (ids.length === 0) return false;
      return currentUser?.id === Math.min(...ids);
    };

    const scheduleRandom = () => {
      if (randomTimerRef.current) clearTimeout(randomTimerRef.current);
      const delay = 45000 + Math.random() * 90000;
      randomTimerRef.current = setTimeout(() => {
        if (amLeader()) {
          const panels = buildPanels(statsRef.current, votesRef.current, festivalTypeRef.current, hasVotedRef.current);
          // Escludi il primo panel (idle) dagli annunci random
          const broadcastable = panels.slice(1);
          if (broadcastable.length > 0) {
            const pick = broadcastable[Math.floor(Math.random() * broadcastable.length)];
            const text = pick.label ? `${pick.label}: ${pick.value}` : pick.value;
            broadcastNotification({ roomCode, text, type: "stat" });
          }
        }
        scheduleRandom();
      }, delay);
    };
    scheduleRandom();
    return () => { if (randomTimerRef.current) clearTimeout(randomTimerRef.current); };
  }, []);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (randomTimerRef.current) clearTimeout(randomTimerRef.current);
      if (panelResetRef.current) clearTimeout(panelResetRef.current);
    };
  }, []);

  // ─── Comment submit ───────────────────────────────────────────────────────
  const canComment = festivalType === "esibizione" && !!songId && !hasCommented;

  const handleSubmit = async () => {
    if (!text.trim() || !canComment || !userToken) return;
    setLoading(true);
    try {
      const res = await fetch("/api/add-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), songId, roomCode, userToken }),
      });
      if (!res.ok) throw new Error();
      setText("");
      onCommentSent();
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  // ─── Swipe panels ─────────────────────────────────────────────────────────
  const schedulePanelReset = () => {
    if (panelResetRef.current) clearTimeout(panelResetRef.current);
    panelResetRef.current = setTimeout(() => {
      setPanelIndex(0);
    }, 8000);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const panels = buildPanels(stats, votes, festivalType, hasVoted);
    if (Math.abs(dx) > 40 && panels.length > 1) {
      if (dx < 0) setPanelIndex((i) => (i + 1) % panels.length);
      else         setPanelIndex((i) => (i - 1 + panels.length) % panels.length);
      schedulePanelReset();
    }
    touchStartX.current = null;
  };

  const panels = buildPanels(stats, votes, festivalType, hasVoted);
  const safeIndex = panels.length > 0 ? panelIndex % panels.length : 0;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        width: "100%",
        borderRadius: 14,
        border: `1px solid ${flash ? "rgba(147,197,253,0.3)" : "rgba(255,255,255,0.07)"}`,
        background: "#0F0F14",
        height: 64,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "border-color 0.4s ease",
        marginBottom: 4,
        fontFamily: "'Inter', sans-serif",
        userSelect: "none",
        overflow: "hidden",
        boxSizing: "border-box",
        padding: "0 12px",
        position: "relative",
      }}
      onTouchStart={festivalType !== "esibizione" ? handleTouchStart : undefined}
      onTouchEnd={festivalType !== "esibizione" ? handleTouchEnd : undefined}
    >
      {festivalType === "esibizione" ? (
        /* ── Modalità commento ── */
        <div style={{ width: "100%", display: "flex", alignItems: "center" }}>
          {hasCommented ? (
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", textAlign: "center", margin: 0, width: "100%" }}>
              Commento inviato — aspetta il prossimo artista
            </p>
          ) : (
            <div style={{ display: "flex", gap: 8, alignItems: "center", width: "100%" }}>
              <input
                type="text"
                maxLength={80}
                placeholder="Scrivi un commento…"
                value={text}
                onChange={(e) => setText(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                style={{
                  flex: 1,
                  background: "transparent",
                  border: "none",
                  outline: "none",
                  fontSize: 13,
                  color: "#ededed",
                  fontFamily: "'Inter', sans-serif",
                  caretColor: "#D4AF37",
                }}
              />
              <button
                onClick={handleSubmit}
                disabled={!text.trim() || loading}
                style={{
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  width: 32,
                  height: 32,
                  borderRadius: 9,
                  border: "none",
                  cursor: text.trim() && !loading ? "pointer" : "not-allowed",
                  background: text.trim() && !loading ? "#D4AF37" : "rgba(255,255,255,0.06)",
                  color: text.trim() && !loading ? "#0F0F14" : "rgba(255,255,255,0.2)",
                  transition: "background 0.2s, color 0.2s",
                }}
              >
                <SendHorizonal size={13} />
              </button>
            </div>
          )}
        </div>
      ) : (
        /* ── Modalità notifiche / panels ── */
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>

          {/* Testo centrato nella box */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", flex: 1, width: "100%", overflow: "hidden" }}>
            {currentMessage ? (
              <p
                key={currentMessage.id}
                style={{
                  fontSize: 12,
                  textAlign: "center",
                  margin: 0,
                  color: msgColor(currentMessage.type),
                  animation: "ce-fadein 0.3s ease both",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  maxWidth: "100%",
                  lineHeight: 1,
                }}
              >
                {currentMessage.text}
              </p>
            ) : (
              <div style={{ textAlign: "center" }}>
                {panels[safeIndex]?.label ? (
                  <p style={{
                    fontSize: 9,
                    color: "rgba(255,255,255,0.22)",
                    margin: "0 0 3px",
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    lineHeight: 1,
                  }}>
                    {panels[safeIndex].label}
                  </p>
                ) : null}
                <p style={{
                  fontSize: 13,
                  color: panels[safeIndex]?.color ?? "rgba(255,255,255,0.55)",
                  margin: 0,
                  lineHeight: 1,
                  fontWeight: safeIndex === 0 ? 400 : 500,
                }}>
                  {panels[safeIndex]?.value ?? ""}
                </p>
              </div>
            )}
          </div>

          {/* Dot indicators — fissi in basso, dentro la box, non sotto */}
          <div style={{
            position: "absolute",
            bottom: 6,
            left: 0,
            right: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 4,
            height: 6,
          }}>
            {panels.length > 1 && !currentMessage &&
              panels.map((_, i) => (
                <div
                  key={i}
                  onClick={() => { setPanelIndex(i); schedulePanelReset(); }}
                  style={{
                    width: 3,
                    height: 3,
                    borderRadius: "50%",
                    background: i === safeIndex ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)",
                    cursor: "pointer",
                    transition: "background 0.2s",
                  }}
                />
              ))
            }
          </div>
        </div>
      )}

      <style>{`
        @keyframes ce-fadein {
          from { opacity: 0; transform: translateY(3px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        input::placeholder { color: rgba(255,255,255,0.2); }
      `}</style>
    </div>
  );
}