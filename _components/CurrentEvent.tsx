"use client";
import { useState, useEffect, useRef } from "react";
import { SendHorizonal } from "lucide-react";
import { onFestivalEvent } from "@/_lib/pusherClient";

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
  // FIX: callback opzionale per notificare RoomClient che qualcuno è entrato/uscito
  onUserJoined?: () => void;
};
type MessageType = "join" | "leave" | "stat" | "vote" | "alert";
type Message = { id: number; text: string; type: MessageType };
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
type StatPanel = { label: string; value: string; color?: string };

const msgColor = (type: MessageType) => {
  switch (type) {
    case "join":  return "rgba(147,197,253,0.9)";
    case "leave": return "rgba(255,255,255,0.25)";
    case "vote":  return "rgba(134,239,172,0.9)";
    case "alert": return "#D4AF37";
    case "stat":  return "rgba(255,255,255,0.45)";
  }
};

const buildPanels = (
  s: RoomStats | null,
  v: { user_id: number; value: number }[],
  ft: string | null,
  hv: boolean,
  usersCount: number,
): StatPanel[] => {
  const panels: StatPanel[] = [];

  const idleLabel = (() => {
    if (!ft || ft === "pausa") return "In pausa ☕";
    if (ft === "votazione") {
      if (v.length === 0) return "In attesa dei voti…";
      if (v.length < usersCount) return `${v.length} / ${usersCount} voti ricevuti`;
      return "Tutti hanno votato! 🎉";
    }
    return "In attesa della prossima esibizione";
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
  panels.push({ label: "Partecipanti", value: `${usersCount} 👥` });
  return panels;
};

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
  onUserJoined,
}: CurrentEventProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [currentMessage, setCurrentMessage] = useState<Message | null>(null);
  const [stats, setStats] = useState<RoomStats | null>(null);
  const [flash, setFlash] = useState(false);
  const [panelIndex, setPanelIndex] = useState(0);

  const messageIdRef = useRef(0);
  const queueRef = useRef<Message[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const panelResetRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number | null>(null);
  const isShowingRef = useRef(false);
  const festivalTypeRef = useRef(festivalType);
  const hasVotedRef = useRef(hasVoted);
  const usersRef = useRef(users);
  // FIX: ref per tutti i valori usati nel handler Pusher, così il bind è stabile con []
  const roomCodeRef = useRef(roomCode);
  const currentUserIdRef = useRef(currentUser?.id);
  const onUserJoinedRef = useRef(onUserJoined);

  useEffect(() => { festivalTypeRef.current = festivalType; }, [festivalType]);
  useEffect(() => { hasVotedRef.current = hasVoted; }, [hasVoted]);
  useEffect(() => { usersRef.current = users; }, [users]);
  useEffect(() => { roomCodeRef.current = roomCode; }, [roomCode]);
  useEffect(() => { currentUserIdRef.current = currentUser?.id; }, [currentUser?.id]);
  useEffect(() => { onUserJoinedRef.current = onUserJoined; }, [onUserJoined]);

  // ─── Queue ────────────────────────────────────────────────────────────────
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

  const enqueue = (text: string, type: MessageType) => {
    const msg: Message = { id: messageIdRef.current++, text, type };
    queueRef.current.push(msg);
    if (!isShowingRef.current) showNext();
  };

  // ─── Pusher: solo ricezione ───────────────────────────────────────────────
  // onFestivalEvent usa un event bus a livello di modulo: sicuro con StrictMode.
  // Il cleanup rimuove il listener dal bus senza toccare il canale Pusher.
  useEffect(() => {
    const handleNotification = (data: PusherNotification) => {
      if (data.roomCode !== roomCodeRef.current) return;

      if (data.type === "vote" && data.voterUserId !== undefined) {
        const isMe = data.voterUserId === currentUserIdRef.current;
        if (isMe) return;
        const showValue = festivalTypeRef.current !== "votazione" || hasVotedRef.current;
        const voterName = usersRef.current.find((u) => u.id === data.voterUserId)?.username ?? "Qualcuno";
        const displayText = showValue && data.voteValue !== undefined
          ? `${voterName} ha votato ${data.voteValue.toFixed(1)} ✅`
          : `${voterName} ha votato ✅`;
        enqueue(displayText, "vote");
        return;
      }

      if (data.type === "join") {
        setFlash(true);
        setTimeout(() => setFlash(false), 1000);
        onUserJoinedRef.current?.();
      }

      if (data.type === "leave") {
        onUserJoinedRef.current?.();
      }

      enqueue(data.text, data.type);
    };

    return onFestivalEvent<PusherNotification>("room-notification", handleNotification);
  }, []);

  // ─── Reset on song change ─────────────────────────────────────────────────
  useEffect(() => {
    queueRef.current = [];
    setCurrentMessage(null);
    isShowingRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    setPanelIndex(0);
  }, [songId]);

  // ─── Stats fetch ──────────────────────────────────────────────────────────
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

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (panelResetRef.current) clearTimeout(panelResetRef.current);
    };
  }, []);

  // ─── Swipe panels ─────────────────────────────────────────────────────────
  const panels = buildPanels(stats, votes, festivalType, hasVoted, users.length);
  const safeIndex = panels.length > 0 ? panelIndex % panels.length : 0;

  const schedulePanelReset = () => {
    if (panelResetRef.current) clearTimeout(panelResetRef.current);
    panelResetRef.current = setTimeout(() => setPanelIndex(0), 8000);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(dx) > 40 && panels.length > 1) {
      setPanelIndex((i) => dx < 0 ? (i + 1) % panels.length : (i - 1 + panels.length) % panels.length);
      schedulePanelReset();
    }
    touchStartX.current = null;
  };

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
        overflow: "hidden",
        boxSizing: "border-box",
        padding: "0 12px",
        position: "relative",
        userSelect: "none",
      }}
      onTouchStart={festivalType !== "esibizione" ? handleTouchStart : undefined}
      onTouchEnd={festivalType !== "esibizione" ? handleTouchEnd : undefined}
    >
      {festivalType === "esibizione" ? (
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
        /* ── Notifiche + panel swipabili ── */
        <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", position: "relative" }}>
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

          {/* Dots navigazione */}
          {panels.length > 1 && !currentMessage && (
            <div style={{
              position: "absolute",
              bottom: 6,
              display: "flex",
              gap: 4,
            }}>
              {panels.map((_, i) => (
                <div
                  key={i}
                  onClick={() => { setPanelIndex(i); schedulePanelReset(); }}
                  style={{
                    width: 3, height: 3,
                    borderRadius: "50%",
                    background: i === safeIndex ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.1)",
                    cursor: "pointer",
                    transition: "background 0.2s",
                  }}
                />
              ))}
            </div>
          )}
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