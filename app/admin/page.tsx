"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { SERATA_TIMELINE, TimelineEvent } from "@/_lib/timeline";

type StatusType = "attesa" | "presentazione" | "esibizione" | "votazione" | "spot" | "pausa" | "classifica" | "fine";

type Song = {
  id: number;
  title: string;
  artist: string;
  night?: number | null;
  image_url?: string;
  performance_time?: string | null;
};

type SongResult = {
  id: number;
  title: string;
  artist: string;
  average: number | null;
  voteCount: number;
};

type PendingProfile = {
  id: number;
  username: string;
  created_at: string;
};

const adminStyles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');

  .adm-root { font-family: 'Inter', sans-serif; background: #09090D; min-height: 100vh; padding: 32px 24px; color: #ededed; }
  .adm-title { font-size: 22px; font-weight: 800; margin-bottom: 28px; color: #ededed; letter-spacing: -0.3px; }
  .adm-card { background: #0F0F14; border: 1px solid rgba(255,255,255,0.07); border-radius: 18px; padding: 20px; margin-bottom: 20px; max-width: 480px; }
  .adm-section-title { font-size: 13px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: rgba(255,255,255,0.35); margin-bottom: 14px; }
  .adm-input { width: 100%; background: rgba(255,255,255,0.04); border: 1px solid rgba(255,255,255,0.08); border-radius: 10px; padding: 10px 12px; color: #ededed; font-family: 'Inter', sans-serif; font-size: 13px; outline: none; margin-bottom: 8px; box-sizing: border-box; }
  .adm-input::placeholder { color: rgba(255,255,255,0.2); }
  .adm-input:focus { border-color: rgba(255,255,255,0.18); }
  .adm-btn { width: 100%; padding: 12px; border-radius: 12px; border: none; font-family: 'Inter', sans-serif; font-weight: 700; font-size: 12px; letter-spacing: 0.06em; text-transform: uppercase; cursor: pointer; margin-bottom: 8px; transition: opacity 0.2s, background 0.2s; display: flex; align-items: center; justify-content: space-between; gap: 8px; }
  .adm-btn:last-child { margin-bottom: 0; }
  .adm-btn-gold   { background: #D4AF37; color: #0F0F14; }
  .adm-btn-gold:hover { opacity: 0.88; }
  .adm-btn-green  { background: rgba(34,197,94,0.15); color: rgba(134,239,172,0.9); border: 1px solid rgba(34,197,94,0.2); }
  .adm-btn-green:hover { background: rgba(34,197,94,0.22); }
  .adm-btn-purple { background: rgba(147,51,234,0.15); color: rgba(196,181,253,0.9); border: 1px solid rgba(147,51,234,0.2); }
  .adm-btn-purple:hover { background: rgba(147,51,234,0.22); }
  .adm-btn-blue   { background: rgba(59,130,246,0.15); color: rgba(147,197,253,0.9); border: 1px solid rgba(59,130,246,0.2); }
  .adm-btn-blue:hover { background: rgba(59,130,246,0.22); }
  .adm-btn-gray   { background: rgba(255,255,255,0.06); color: rgba(255,255,255,0.5); }
  .adm-btn-gray:hover { background: rgba(255,255,255,0.1); color: rgba(255,255,255,0.75); }
  .adm-btn-red    { background: rgba(220,60,60,0.15); color: rgba(255,100,100,0.85); border: 1px solid rgba(220,60,60,0.2); }
  .adm-btn-red:hover { background: rgba(220,60,60,0.22); }
  .adm-btn-yellow { background: rgba(234,179,8,0.15); color: rgba(253,224,71,0.9); border: 1px solid rgba(234,179,8,0.2); }
  .adm-btn-yellow:hover { background: rgba(234,179,8,0.22); }
  .adm-divider { border: none; border-top: 1px solid rgba(255,255,255,0.06); margin: 16px 0; }
  .adm-pending-row { display: flex; align-items: center; justify-content: space-between; background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 12px 14px; margin-bottom: 8px; }
  .adm-lb-row { display: flex; align-items: center; gap: 12px; padding: 10px 12px; border-radius: 12px; border: 1px solid transparent; margin-bottom: 6px; }
  .adm-lb-row-first { background: rgba(212,175,55,0.08); border-color: rgba(212,175,55,0.2); }
  .adm-lb-row-other { background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.04); }
  .adm-lb-row-novotes { background: rgba(255,255,255,0.015); opacity: 0.5; }
  .adm-kbd { display: inline-flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.25); border: 1px solid rgba(255,255,255,0.15); border-radius: 5px; font-family: 'DM Mono', monospace; font-size: 10px; font-weight: 500; padding: 2px 6px; letter-spacing: 0; text-transform: none; flex-shrink: 0; line-height: 1.4; }
  .adm-night-btn { flex: 1; padding: 14px 8px; border-radius: 12px; border: 1px solid rgba(255,255,255,0.07); background: rgba(255,255,255,0.03); color: rgba(255,255,255,0.35); font-family: 'Inter', sans-serif; font-size: 11px; font-weight: 700; letter-spacing: 0.05em; text-transform: uppercase; cursor: pointer; transition: all 0.2s; display: flex; flex-direction: column; align-items: center; gap: 4px; }
  .adm-night-btn:hover { background: rgba(255,255,255,0.07); color: rgba(255,255,255,0.6); }
  .adm-night-btn-active { background: rgba(212,175,55,0.12) !important; border-color: rgba(212,175,55,0.35) !important; color: #D4AF37 !important; }
  @keyframes adm-toast-in { from { opacity: 0; transform: translateY(8px) translateX(-50%); } to { opacity: 1; transform: translateY(0) translateX(-50%); } }
  @keyframes adm-toast-out { from { opacity: 1; } to { opacity: 0; } }
  .adm-toast { position: fixed; bottom: 28px; left: 50%; transform: translateX(-50%); background: rgba(15,15,20,0.92); backdrop-filter: blur(12px); border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 10px 18px; font-size: 13px; color: #ededed; z-index: 999; white-space: nowrap; animation: adm-toast-in 0.2s ease both; }
  .adm-toast-out { animation: adm-toast-out 0.3s ease forwards; }
  .adm-next-song { background: rgba(34,197,94,0.07); border: 1px solid rgba(34,197,94,0.2); border-radius: 12px; padding: 12px 14px; margin-bottom: 12px; display: flex; align-items: center; gap: 10px; }

  /* Song picker */
  .adm-picker-dropdown { background: #13131A; border: 1px solid rgba(255,255,255,0.1); border-radius: 14px; overflow: hidden; margin-bottom: 10px; max-height: 320px; overflow-y: auto; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.08) transparent; }
  .adm-picker-row { width: 100%; display: flex; align-items: center; gap: 10px; padding: 10px 12px; background: transparent; border: none; border-bottom: 1px solid rgba(255,255,255,0.04); cursor: pointer; text-align: left; transition: background 0.12s; }
  .adm-picker-row:last-child { border-bottom: none; }
  .adm-picker-row:hover { background: rgba(255,255,255,0.05); }
  .adm-picker-row-active { background: rgba(212,175,55,0.09) !important; }
  .adm-selected-song { display: flex; align-items: center; gap: 10px; background: rgba(212,175,55,0.07); border: 1px solid rgba(212,175,55,0.2); border-radius: 12px; padding: 10px 12px; margin-bottom: 10px; }

  /* Big action buttons */
  .adm-action-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 10px; }
  .adm-action-big { border-radius: 14px; border: none; font-family: 'Inter', sans-serif; font-weight: 700; cursor: pointer; transition: opacity 0.15s, transform 0.1s; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 20px 10px; font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; }
  .adm-action-big:active { transform: scale(0.96); }
  .adm-action-big-next { background: rgba(34,197,94,0.15); color: rgba(134,239,172,0.9); border: 1px solid rgba(34,197,94,0.25); }
  .adm-action-big-next:hover { background: rgba(34,197,94,0.22); }
  .adm-action-big-vote { background: rgba(147,51,234,0.15); color: rgba(196,181,253,0.9); border: 1px solid rgba(147,51,234,0.25); }
  .adm-action-big-vote:hover { background: rgba(147,51,234,0.22); }
  .adm-action-big-esibi { background: rgba(34,197,94,0.08); color: rgba(134,239,172,0.7); border: 1px solid rgba(34,197,94,0.15); }
`;

function Kbd({ children }: { children: string }) {
  return <span className="adm-kbd">{children}</span>;
}

const NIGHTS = [
  { n: 1, label: "1ª Serata" },
  { n: 2, label: "2ª Serata" },
  { n: 3, label: "3ª Serata" },
  { n: 4, label: "4ª Serata" },
  { n: 5, label: "5ª Serata" },
];

export default function FestivalControlPage() {
  const [loading, setLoading] = useState(false);
  const [songId, setSongId] = useState<number | "">("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [songSearch, setSongSearch] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [artistCanonical, setArtistCanonical] = useState("");
  const [songNight, setSongNight] = useState<number | "">("");
  const [performanceTime, setPerformanceTime] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageUrlNobg, setImageUrlNobg] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [clearNightBeforeImport, setClearNightBeforeImport] = useState<number | "">("");
  const [pendingProfiles, setPendingProfiles] = useState<PendingProfile[]>([]);
  const [leaderboard, setLeaderboard] = useState<SongResult[]>([]);
  const [lbLoading, setLbLoading] = useState(false);
  const [roomCode, setRoomCode] = useState<string>("");
  const [toast, setToast] = useState<{ text: string; out: boolean } | null>(null);
  const [activeNight, setActiveNight] = useState<number | null>(null);
  const [eventIndex, setEventIndex] = useState(0);
  const [statusType, setStatusType] = useState<StatusType>("attesa");
  const [classificaIndex, setClassificaIndex] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);
  const nextEventToApplyRef = useRef<number | null>(null);

  const songsRef = useRef<Song[]>([]);
  const songIdRef = useRef<number | "">("");
  useEffect(() => { songsRef.current = songs; }, [songs]);
  useEffect(() => { songIdRef.current = songId; }, [songId]);

  // Close picker on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Filtered songs for picker
  const filteredSongs = songs.filter((s) => {
    const q = songSearch.toLowerCase();
    const nightMatch = activeNight === null || s.night === activeNight || s.night == null;
    const textMatch = !q || s.artist.toLowerCase().includes(q) || s.title.toLowerCase().includes(q);
    return nightMatch && textMatch;
  });

  const selectedSong = songs.find((s) => s.id === songId);

  const fetchSongs = async (n: number | null | undefined = activeNight) => {
    // use /api/get-songs which knows how to return only the songs for a
    // particular night (and includes performance_time/played flags). When
    // `n` is undefined we fall back to fetching everything.
    const url = n != null ? `/api/get-songs?night=${n}` : "/api/songs";
    const res = await fetch(url);
    const data = await res.json();
    setSongs(data);
  };

  const fetchEventIndex = async () => {
    try {
      const res = await fetch("/api/festival-status");
      if (!res.ok) return;
      const data = await res.json();
      setEventIndex(data.eventIndex ?? 0);
      setStatusType(data.type);
      setClassificaIndex(data.classificaIndex ?? 0);
    } catch (error) {
      console.error("Errore caricamento evento:", error);
    }
  };

  useEffect(() => {
    fetchSongs();
    fetchPending();
    fetchEventIndex();
    const interval = setInterval(fetchPending, 10000);
    return () => clearInterval(interval);
  }, []);

  const showToast = useCallback((text: string) => {
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    setToast({ text, out: false });
    toastTimerRef.current = setTimeout(() => {
      setToast((t) => t ? { ...t, out: true } : null);
      setTimeout(() => setToast(null), 350);
    }, 2200);
  }, []);

  const updateStatus = useCallback(async (type: StatusType, overrideSongId?: number | "", eventIndex?: number, classIndex?: number) => {
    setLoading(true);
    const sid = overrideSongId !== undefined ? overrideSongId : songIdRef.current;
    try {
      const body: any = {
        type,
        songId: type === "esibizione" || type === "votazione" ? sid : null,
      };
      if (typeof eventIndex === "number") body.eventIndex = eventIndex;
      if (typeof classIndex === "number") {
        body.classificaIndex = classIndex;
      } else if (type === "classifica") {
        // when switching into classifica without explicit index, reset on server
        body.classificaIndex = 0;
      }
      console.log("[admin] updateStatus body", body);
      await fetch("/api/festival-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      // update local UI state immediately
      setStatusType(type);
      if (typeof classIndex === "number") {
        setClassificaIndex(classIndex);
      }
      // entering classifica mode should reset to start if no explicit index given
      if (type === "classifica" && typeof classIndex !== "number") {
        setClassificaIndex(0);
      }
      if (type !== "classifica") {
        setClassificaIndex(0);
      }
    } catch (error) {
      console.error("Errore aggiornamento stato", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateEventIndex = useCallback(async (idx: number) => {
    if (idx < 0 || idx >= SERATA_TIMELINE.length) return;
    try {
      const currentEvent = SERATA_TIMELINE[eventIndex];
      const newEvent = SERATA_TIMELINE[idx];
      
      // Se stiamo navigando da un'esibizione a un'altra esibizione,
      // prima inseriamo uno step di votazione
      if (
        currentEvent?.type === "esibizione" &&
        newEvent?.type === "esibizione" &&
        idx !== eventIndex
      ) {
        // Se non siamo già in votazione, cambia a votazione e salva il prossimo evento
        const res = await fetch("/api/festival-status");
        const status = await res.json();
        
        if (status.type !== "votazione") {
          // Metti in votazione la canzone attuale
          updateStatus("votazione", songIdRef.current);
          // Salva l'indice che vuoi applicare dopo
          nextEventToApplyRef.current = idx;
          showToast(`🗳 Vota prima! Poi avanzi a ${newEvent.label}`);
          return; // Non cambiare ancora l'evento indice
        }
      }
      
      // Se c'è un evento in sospeso da applicare, applicalo adesso
      if (nextEventToApplyRef.current !== null) {
        idx = nextEventToApplyRef.current;
        nextEventToApplyRef.current = null;
      }
      
      const event = SERATA_TIMELINE[idx];
      
      // Mappa il tipo di evento al tipo di status della festa
      let statusType: StatusType = "attesa";
      const eventType = (event as any).type;
      switch (eventType) {
        case "ospite":
        case "presentazione":
        case "momento_speciale":
        case "collegamento":
        case "premio":
          statusType = "presentazione";
          break;
        case "esibizione":
          statusType = "esibizione";
          break;
        case "spot":
          statusType = "spot";
          break;
        case "stop_televoto":
          statusType = "attesa";
          break;
        case "classifica_finale":
          statusType = "classifica";
          break;
        default:
          statusType = "attesa";
      }

      // Aggiorna il tipo di status della festa (e la canzone + eventIndex, se presenti)
      // se l'evento è un'esibizione, proviamo a determinare automaticamente la
      // canzone corretta. la timeline può contenere un songId esplicito ma
      // in caso contrario utilizziamo la logica "next song" già presente
      // nell'app (doNext/getNextSong) per auto-selezionare la performance.
      let overrideSongId: number | undefined;
      if (event.type === "esibizione") {
        if ((event as any).songId !== undefined) {
          overrideSongId = (event as any).songId;
        } else {
          // calcola canzone successiva come fa doNext
          const list = songsRef.current.filter((s) => activeNight === null || s.night === activeNight || s.night == null);
          if (list.length > 0) {
            const withTime = list
              .filter((s) => s.performance_time)
              .sort((a, b) => new Date(a.performance_time!).getTime() - new Date(b.performance_time!).getTime());
            let candidate: Song | null = null;
            if (withTime.length > 0) {
              const currentId = songIdRef.current;
              if (currentId) {
                const idxSong = withTime.findIndex((s) => s.id === currentId);
                if (idxSong >= 0 && idxSong + 1 < withTime.length) candidate = withTime[idxSong + 1];
              }
              if (!candidate) {
                const now = new Date();
                candidate = withTime.find((s) => new Date(s.performance_time!) >= now) ?? withTime[0];
              }
            }
            if (!candidate && songIdRef.current) {
              const idxSong = list.findIndex((s) => s.id === songIdRef.current);
              if (idxSong >= 0 && idxSong + 1 < list.length) candidate = list[idxSong + 1];
            }
            if (!candidate) candidate = list[0];
            overrideSongId = candidate?.id;
          }
        }
      }
      // debug log to trace what we're about to send
      console.log("[admin] updating eventIndex", idx, "event", event, "overrideSongId", overrideSongId);
      // if we picked a song from the timeline, make sure it actually exists in
      // our current song list; otherwise the server will ignore it and the
      // interact box will stay on whatever was selected previously.
      if (overrideSongId != null && !songsRef.current.find((s) => s.id === overrideSongId)) {
        console.warn("[admin] timeline songId not present in song list", overrideSongId);
        showToast("⚠️ Canzone evento non trovata, aggiungila prima");
        // clear it so updateStatus doesn't send the bogus id
        overrideSongId = undefined;
      }

      updateStatus(statusType, overrideSongId, idx, statusType === "classifica" ? 0 : undefined);
      // sincronizziamo anche lo stato del picker in admin
      if (overrideSongId !== undefined) {
        setSongId(overrideSongId ?? "");
      }

      setEventIndex(idx);
      setStatusType(statusType);
      // reset classifica index when we leave classifica event
      if (statusType !== "classifica") setClassificaIndex(0);
      showToast(`⏱ ${event.time} — ${event.label}`);
    } catch (error) {
      console.error("Errore aggiornamento evento:", error);
      showToast("❌ Errore aggiornamento evento");
    }
  }, [showToast, activeNight, eventIndex, updateStatus]);

  const fetchPending = async () => {
    const res = await fetch("/api/pending-profiles");
    const data = await res.json();
    setPendingProfiles(data);
  };

  const fetchLeaderboard = async () => {
    if (!roomCode.trim()) return;
    setLbLoading(true);
    try {
      const res = await fetch(`/api/room-leaderboard?roomCode=${roomCode.trim()}`);
      const data: SongResult[] = await res.json();
      setLeaderboard(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLbLoading(false);
    }
  };

  const setNight = useCallback(async (n: number) => {
    try {
      await fetch("/api/set-night", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ night: n }),
      });
      setActiveNight(n);
      showToast(`🌙 Serata ${n} attivata`);
      // rifetch delle canzoni in base alla serata appena cambiata
      await fetchSongs(n);
    } catch {
      showToast("❌ Errore impostazione serata");
    }
  }, [showToast]);

  const getNextSong = useCallback((): Song | null => {
    const list = songsRef.current.filter((s) => activeNight === null || s.night === activeNight || s.night == null);
    if (!list.length) return null;
    const withTime = list
      .filter((s) => s.performance_time)
      .sort((a, b) => new Date(a.performance_time!).getTime() - new Date(b.performance_time!).getTime());
    const currentId = songIdRef.current;
    if (withTime.length > 0) {
      if (currentId) {
        const idx = withTime.findIndex((s) => s.id === currentId);
        if (idx >= 0 && idx + 1 < withTime.length) return withTime[idx + 1];
      }
      const now = new Date();
      return withTime.find((s) => new Date(s.performance_time!) >= now) ?? withTime[0];
    }
    if (currentId) {
      const idx = list.findIndex((s) => s.id === currentId);
      if (idx >= 0 && idx + 1 < list.length) return list[idx + 1];
    }
    return list[0];
  }, [activeNight]);

  const doNext = useCallback(() => {
    const next = getNextSong();
    if (!next) { showToast("⚠️ Nessuna canzone disponibile"); return; }
    setSongId(next.id);
    setSongSearch("");
    setPickerOpen(false);
    updateStatus("esibizione", next.id);
    showToast(`▶ ${next.artist} – ${next.title}`);
  }, [getNextSong, showToast, updateStatus]);

  const doVote = useCallback(() => {
    const sid = songIdRef.current;
    if (!sid) { showToast("⚠️ Nessuna canzone selezionata"); return; }
    updateStatus("votazione", sid);
    const song = songsRef.current.find((s) => s.id === sid);
    showToast(`🗳 Votazione: ${song ? `${song.artist} – ${song.title}` : sid}`);
  }, [showToast, updateStatus]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      const key = e.key.toLowerCase();
      if (key === "n") { doNext(); return; }
      if (key === "v") { doVote(); return; }
      if (key === "1") { updateStatus("presentazione"); showToast("🎤 Presentazione"); return; }
      if (key === "2") { updateStatus("spot"); showToast("📺 Spot pubblicitario"); return; }
      if (key === "3") { updateStatus("pausa"); showToast("⏸ Pausa"); return; }
      if (key === "4") { updateStatus("attesa"); showToast("⏳ In attesa"); return; }
      if (key === "5") { updateStatus("classifica"); showToast("🏆 Classifica finale"); return; }
      if (key === "6") { updateStatus("fine"); showToast("🏁 Fine serata"); return; }
      
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [updateStatus, doNext, doVote, showToast]);

  const nextSong = getNextSong();

  const handleAddSong = async () => {
    if (!title || !artist) return;
    try {
      await fetch("/api/add-song", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title, artist,
          artistCanonical: artistCanonical || null,
          night: songNight !== "" ? Number(songNight) : null,
          performanceTime,
          imageUrl: imageUrl || null,
          imageUrlNobg: imageUrlNobg || null,
        }),
      });
      setTitle(""); setArtist(""); setArtistCanonical(""); setSongNight(""); setPerformanceTime(""); setImageUrl(""); setImageUrlNobg("");
      await fetchSongs();
    } catch (error) {
      console.error("Errore aggiunta canzone", error);
    }
  };

  const handleImportJSON = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const songsToImport: any[] = Array.isArray(parsed) ? parsed : parsed.songs;
      if (!Array.isArray(songsToImport)) { setImportStatus("❌ Formato JSON non valido."); return; }
      
      // Se una serata è selezionata, elimina le canzoni di quella serata prima di importare
      if (clearNightBeforeImport !== "") {
        setImportStatus(`⏳ Eliminazione canzoni della serata ${clearNightBeforeImport}...`);
        try {
          const deleteRes = await fetch(`/api/delete-songs-by-night?night=${clearNightBeforeImport}`, {
            method: "DELETE",
          });
          if (!deleteRes.ok) {
            setImportStatus("❌ Errore eliminazione canzoni precedenti");
            return;
          }
        } catch (err) {
          console.error("Errore eliminazione:", err);
          setImportStatus("❌ Errore eliminazione canzoni precedenti");
          return;
        }
      }
      
      setImportStatus(`⏳ Importazione di ${songsToImport.length} canzoni...`);
      let success = 0;
      for (const song of songsToImport) {
        if (!song.title || !song.artist) continue;
        const res = await fetch("/api/add-song", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: song.title, artist: song.artist,
            artistCanonical: song.artist_canonical ?? null,
            night: song.night ?? null,
            performanceTime: song.performance_time ?? null,
            imageUrl: song.image_url ?? null,
            imageUrlNobg: song.image_url_nobg ?? null,
          }),
        });
        if (res.ok) success++;
      }
      setImportStatus(`✅ Importate ${success} canzoni su ${songsToImport.length}`);
      setClearNightBeforeImport("");
      await fetchSongs();
    } catch (err) {
      console.error(err);
      setImportStatus("❌ Errore nel parsing del file JSON");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleApprove = async (profileId: number, action: "approve" | "reject") => {
    await fetch("/api/approve-profile", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profileId, action }),
    });
    await fetchPending();
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: adminStyles }} />
      <div className="adm-root">
        <h1 className="adm-title">🎛 Regia Festival</h1>

        {/* ── SERATA ATTIVA ── */}
        <div className="adm-card" style={{ borderColor: "rgba(212,175,55,0.2)" }}>
          <div className="adm-section-title" style={{ color: "#D4AF37" }}>🌙 Serata attiva</div>
          <div style={{ display: "flex", gap: 8 }}>
            {NIGHTS.map(({ n, label }) => (
              <button key={n} onClick={() => setNight(n)} className={`adm-night-btn ${activeNight === n ? "adm-night-btn-active" : ""}`}>
                <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 18, lineHeight: 1 }}>{n}</span>
                <span style={{ fontSize: 9, letterSpacing: "0.06em" }}>{label.split(" ")[1]}</span>
              </button>
            ))}
          </div>
          {activeNight !== null && (
            <div style={{ marginTop: 12, fontSize: 12, color: "rgba(212,175,55,0.7)", display: "flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#D4AF37", display: "inline-block" }} />
              Serata attiva: <strong style={{ color: "#D4AF37" }}>{activeNight}ª serata</strong>
            </div>
          )}
        </div>

        {/* ── CONTROLLI STATO + SONG PICKER ── */}
        <div className="adm-card">
          <div className="adm-section-title">🎛 Controlli stato</div>

          {/* Stato buttons */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 8 }}>
            {[
              { type: "attesa" as StatusType, label: "⏳ In attesa", cls: "adm-btn-gray", kbd: "4" },
              { type: "presentazione" as StatusType, label: "🎤 Presentazione", cls: "adm-btn-blue", kbd: "1" },
              { type: "spot" as StatusType, label: "📺 Spot", cls: "adm-btn-yellow", kbd: "2" },
              { type: "pausa" as StatusType, label: "⏸ Pausa", cls: "adm-btn-gray", kbd: "3" },
              { type: "classifica" as StatusType, label: "🏆 Classifica", cls: "adm-btn-gold", kbd: "5" },
              { type: "fine" as StatusType, label: "🏁 Fine serata", cls: "adm-btn-red", kbd: "6" },
            ].map(({ type, label, cls, kbd }) => (
              <button
                key={type}
                onClick={() => { updateStatus(type); showToast(label); }}
                className={`adm-btn ${cls}`}
                style={{ margin: 0, justifyContent: "space-between" }}
              >
                <span style={{ fontSize: 11 }}>{label}</span>
                <Kbd>{kbd}</Kbd>
              </button>
            ))}
          </div>
          {statusType === "classifica" && (
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <button
                onClick={() => {
                  const next = classificaIndex + 1;
                  updateStatus("classifica", undefined, undefined, next);
                  setClassificaIndex(next);
                  showToast("Avanza classifica");
                }}
                className="adm-btn adm-btn-green"
              >➜ Avanza</button>
              
              <button
                onClick={() => {
                  updateStatus("classifica", undefined, undefined, 0);
                  setClassificaIndex(0);
                  showToast("Reset classifica");
                }}
                className="adm-btn adm-btn-purple"
              >🔄 Reset</button>
              <div style={{ alignSelf: "center", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                {classificaIndex + 1}
              </div>
            </div>
          )}

          <hr className="adm-divider" />

          {/* ── Song Picker ── */}
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>Seleziona canzone</p>

          <div ref={pickerRef} style={{ position: "relative" }}>
            {/* Search input */}
            <div style={{ position: "relative", marginBottom: pickerOpen ? 0 : 8 }}>
              <span style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", fontSize: 13, opacity: 0.35, pointerEvents: "none" }}>🔍</span>
              <input
                className="adm-input"
                style={{ marginBottom: 0, paddingLeft: 32, paddingRight: 32, borderRadius: pickerOpen ? "10px 10px 0 0" : 10 }}
                type="text"
                placeholder="Cerca artista o titolo…"
                value={songSearch}
                onChange={(e) => { setSongSearch(e.target.value); setPickerOpen(true); }}
                onFocus={() => setPickerOpen(true)}
              />
              {songSearch && (
                <button
                  onClick={() => { setSongSearch(""); setPickerOpen(false); setSongId(""); }}
                  style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 18, lineHeight: 1, padding: 2 }}
                >×</button>
              )}
            </div>

            {/* Dropdown */}
            {pickerOpen && (
              <div className="adm-picker-dropdown" style={{ borderRadius: "0 0 14px 14px", marginBottom: 8 }}>
                {filteredSongs.length === 0 ? (
                  <div style={{ padding: "14px 12px", fontSize: 12, color: "rgba(255,255,255,0.25)", textAlign: "center" }}>
                    Nessuna canzone trovata
                  </div>
                ) : filteredSongs.map((s) => {
                  const isActive = songId === s.id;
                  return (
                    <button
                      key={s.id}
                      className={`adm-picker-row ${isActive ? "adm-picker-row-active" : ""}`}
                      onClick={() => { setSongId(s.id); setSongSearch(""); setPickerOpen(false); }}
                    >
                      {s.image_url ? (
                        <img src={s.image_url} alt="" style={{ width: 34, height: 34, borderRadius: 7, objectFit: "cover", flexShrink: 0 }} />
                      ) : (
                        <div style={{ width: 34, height: 34, borderRadius: 7, background: "rgba(255,255,255,0.06)", flexShrink: 0 }} />
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: isActive ? "#D4AF37" : "#ededed", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {s.title}
                        </div>
                        <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
                          {s.artist}
                          {s.night != null && <span style={{ marginLeft: 6, color: "rgba(212,175,55,0.4)" }}>· S{s.night}</span>}
                        </div>
                      </div>
                      {s.performance_time && (
                        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: "rgba(255,255,255,0.22)", flexShrink: 0 }}>
                          {new Date(s.performance_time).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      )}
                      {isActive && <span style={{ color: "#D4AF37", fontSize: 14, flexShrink: 0 }}>✓</span>}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Canzone selezionata badge */}
          {selectedSong && !pickerOpen && (
            <div className="adm-selected-song" style={{ marginBottom: 10 }}>
              {selectedSong.image_url && (
                <img src={selectedSong.image_url} alt="" style={{ width: 36, height: 36, borderRadius: 8, objectFit: "cover", flexShrink: 0 }} />
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#D4AF37", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{selectedSong.title}</div>
                <div style={{ fontSize: 10, color: "rgba(212,175,55,0.5)", marginTop: 1 }}>{selectedSong.artist}</div>
              </div>
              <button onClick={() => { setSongId(""); setSongSearch(""); }} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.25)", cursor: "pointer", fontSize: 20, padding: 0 }}>×</button>
            </div>
          )}

          {/* Prossima con N */}
          {nextSong && (
            <div className="adm-next-song" style={{ marginBottom: 10 }}>
              <span style={{ fontSize: 16 }}>⏭</span>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: 10, color: "rgba(134,239,172,0.5)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 2 }}>
                  Prossima con <Kbd>N</Kbd>
                </div>
                <div style={{ fontSize: 13, fontWeight: 700, color: "#ededed", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {nextSong.artist} – {nextSong.title}
                </div>
              </div>
            </div>
          )}

          {/* Big action buttons */}
          <div className="adm-action-grid">
            <button
              className="adm-action-big adm-action-big-next"
              onClick={doNext}
            >
              <span style={{ fontSize: 28 }}>⏭</span>
              <span>Next</span>
              <Kbd>N</Kbd>
            </button>
            <button
              className="adm-action-big adm-action-big-vote"
              onClick={doVote}
            >
              <span style={{ fontSize: 28 }}>🗳</span>
              <span>Votazione</span>
              <Kbd>V</Kbd>
            </button>
          </div>

          <button
            className="adm-btn adm-action-big-esibi"
            style={{ justifyContent: "center", border: "1px solid rgba(34,197,94,0.15)", borderRadius: 12 }}
            onClick={() => {
              if (!songId) { showToast("⚠️ Seleziona una canzone prima"); return; }
              updateStatus("esibizione", songId);
              showToast(`▶ Esibizione: ${selectedSong ? `${selectedSong.artist} – ${selectedSong.title}` : songId}`);
            }}
          >
            ▶ Avvia esibizione canzone selezionata
          </button>

          {loading && <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 10 }}>Aggiornamento in corso…</p>}
        </div>

        {/* ── TIMELINE EVENTO ── */}
        <div className="adm-card" style={{ borderColor: "rgba(212,175,55,0.2)" }}>
          <div className="adm-section-title" style={{ color: "#D4AF37" }}>⏱ Timeline Evento</div>
          
          {SERATA_TIMELINE.length > 0 && (
            <>
              {/* Evento attuale */}
              {eventIndex < SERATA_TIMELINE.length && (
                <div style={{ background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 12, padding: 14, marginBottom: 12 }}>
                  <div style={{ fontSize: 10, color: "#D4AF37", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 6 }}>Evento attuale</div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#ededed", marginBottom: 4 }}>
                    {SERATA_TIMELINE[eventIndex].time} — {SERATA_TIMELINE[eventIndex].label}
                  </div>
                  {(SERATA_TIMELINE[eventIndex] as any).description && (
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.35)" }}>
                      {(SERATA_TIMELINE[eventIndex] as any).description}
                    </div>
                  )}
                  {(SERATA_TIMELINE[eventIndex] as any).guest && (
                    <div style={{ fontSize: 11, color: "rgba(212,175,55,0.7)", marginTop: 8 }}>
                      👤 {(SERATA_TIMELINE[eventIndex] as any).guest}
                    </div>
                  )}
                  {(SERATA_TIMELINE[eventIndex] as any).presenter && (
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", marginTop: 4 }}>
                      con {(SERATA_TIMELINE[eventIndex] as any).presenter}
                    </div>
                  )}
                  {(SERATA_TIMELINE[eventIndex] as any).coverTitle && (
                    <div style={{ fontSize: 11, color: "rgba(134,239,172,0.8)", marginTop: 8, fontWeight: 600 }}>
                      🎵 {(SERATA_TIMELINE[eventIndex] as any).coverTitle}
                    </div>
                  )}
                </div>
              )}

              {/* Scorrimento timeline */}
              <div style={{ display: "flex", gap: 8, marginBottom: 8 }} suppressHydrationWarning>
                <button
                  onClick={() => updateEventIndex(Math.max(0, eventIndex - 1))}
                  disabled={eventIndex <= 0}
                  suppressHydrationWarning
                  className="adm-btn"
                  style={{
                    padding: "10px 14px",
                    marginBottom: 0,
                    backgroundColor: eventIndex === 0 ? "rgba(255,255,255,0.05)" : "rgba(147,51,234,0.15)",
                    color: eventIndex === 0 ? "rgba(255,255,255,0.2)" : "rgba(196,181,253,0.9)",
                    border: `1px solid ${eventIndex === 0 ? "rgba(255,255,255,0.07)" : "rgba(147,51,234,0.2)"}`,
                    cursor: eventIndex === 0 ? "not-allowed" : "pointer",
                    flex: 1,
                    justifyContent: "center",
                  }}
                >
                  ← Indietro
                </button>
                <button
                  onClick={() => updateEventIndex(Math.min(SERATA_TIMELINE.length - 1, eventIndex + 1))}
                  disabled={eventIndex >= SERATA_TIMELINE.length - 1}
                  suppressHydrationWarning
                  className="adm-btn"
                  style={{
                    padding: "10px 14px",
                    marginBottom: 0,
                    backgroundColor: eventIndex === SERATA_TIMELINE.length - 1 ? "rgba(255,255,255,0.05)" : "rgba(34,197,94,0.15)",
                    color: eventIndex === SERATA_TIMELINE.length - 1 ? "rgba(255,255,255,0.2)" : "rgba(134,239,172,0.9)",
                    border: `1px solid ${eventIndex === SERATA_TIMELINE.length - 1 ? "rgba(255,255,255,0.07)" : "rgba(34,197,94,0.2)"}`,
                    cursor: eventIndex === SERATA_TIMELINE.length - 1 ? "not-allowed" : "pointer",
                    flex: 1,
                    justifyContent: "center",
                  }}
                >
                  Avanti →
                </button>
              </div>

              {/* Indice evento */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 12px", fontSize: 12, color: "rgba(255,255,255,0.35)" }}>
                <span>{eventIndex + 1} / {SERATA_TIMELINE.length}</span>
                <input
                  type="range"
                  min="0"
                  max={SERATA_TIMELINE.length - 1}
                  value={eventIndex}
                  onChange={(e) => updateEventIndex(Number(e.target.value))}
                  className="ib-slider"
                  style={{ flex: 1, margin: "0 12px", cursor: "pointer" }}
                />
              </div>
            </>
          )}
        </div>

        {/* ── Scorciatoie ── */}
        <div className="adm-card">
          <div className="adm-section-title">⌨️ Scorciatoie tastiera</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 12px" }}>
            {[
              { key: "N", label: "Prossima esibizione", color: "rgba(134,239,172,0.9)" },
              { key: "V", label: "Apri votazione", color: "rgba(196,181,253,0.9)" },
              { key: "1", label: "Presentazione", color: "rgba(147,197,253,0.9)" },
              { key: "2", label: "Spot pubblicitario", color: "rgba(253,224,71,0.9)" },
              { key: "3", label: "Pausa", color: "rgba(255,255,255,0.45)" },
              { key: "4", label: "In attesa", color: "rgba(255,255,255,0.45)" },
              { key: "5", label: "Classifica finale", color: "#D4AF37" },
              { key: "6", label: "Fine serata", color: "rgba(255,100,100,0.85)" },
            ].map(({ key, label, color }) => (
              <div key={key} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Kbd>{key}</Kbd>
                <span style={{ fontSize: 12, color }}>{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Utenti in attesa ── */}
        {pendingProfiles.length > 0 && (
          <div className="adm-card" style={{ borderColor: "rgba(212,175,55,0.2)" }}>
            <div className="adm-section-title" style={{ color: "#D4AF37" }}>👤 Utenti in attesa ({pendingProfiles.length})</div>
            {pendingProfiles.map((p) => (
              <div key={p.id} className="adm-pending-row">
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{p.username}</p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)" }}>{new Date(p.created_at).toLocaleString("it-IT")}</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => handleApprove(p.id, "approve")} className="adm-btn adm-btn-green" style={{ width: "auto", padding: "7px 14px", marginBottom: 0 }}>✓</button>
                  <button onClick={() => handleApprove(p.id, "reject")} className="adm-btn adm-btn-red" style={{ width: "auto", padding: "7px 14px", marginBottom: 0 }}>✕</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Aggiungi canzone ── */}
        <div className="adm-card">
          <div className="adm-section-title">➕ Aggiungi Canzone</div>
          <input className="adm-input" type="text" placeholder="Titolo" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="adm-input" type="text" placeholder="Artista" value={artist} onChange={(e) => setArtist(e.target.value)} />
          <input className="adm-input" type="text" placeholder="Artista canonico (es. Marco Mengoni)" value={artistCanonical} onChange={(e) => setArtistCanonical(e.target.value)} />
          <select value={songNight} onChange={(e) => setSongNight(e.target.value !== "" ? Number(e.target.value) : "")} className="adm-input" style={{ backgroundColor: "#1a1a24", color: songNight !== "" ? "#ededed" : "rgba(255,255,255,0.2)" }}>
            <option value="" style={{ background: "#1a1a24" }}>-- Serata (opzionale) --</option>
            {[1,2,3,4,5].map((n) => <option key={n} value={n} style={{ background: "#1a1a24" }}>{n}ª serata</option>)}
          </select>
          <input className="adm-input" type="datetime-local" value={performanceTime} onChange={(e) => setPerformanceTime(e.target.value)} />
          <input className="adm-input" type="url" placeholder="URL immagine (opzionale)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          <button onClick={handleAddSong} className="adm-btn adm-btn-gold" style={{ marginTop: 4 }}>Aggiungi</button>
          <hr className="adm-divider" />
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>Importa da file JSON:</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", marginBottom: 10, fontFamily: "monospace" }}>{"[{ title, artist, artist_canonical?, night?, performance_time?, image_url? }]"}</p>
          <select value={clearNightBeforeImport} onChange={(e) => setClearNightBeforeImport(e.target.value !== "" ? Number(e.target.value) : "")} className="adm-input" style={{ backgroundColor: "#1a1a24", color: clearNightBeforeImport !== "" ? "#ededed" : "rgba(255,255,255,0.2)", marginBottom: 8 }}>
            <option value="" style={{ background: "#1a1a24" }}>-- Pulisci serata (opzionale) --</option>
            {[1,2,3,4,5].map((n) => <option key={n} value={n} style={{ background: "#1a1a24" }}>{n}ª serata</option>)}
          </select>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportJSON} style={{ display: "none" }} />
          <button onClick={() => fileInputRef.current?.click()} className="adm-btn adm-btn-gray">📂 Carica file JSON</button>
          {importStatus && <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 8 }}>{importStatus}</p>}
          <hr className="adm-divider" />
          <button onClick={async () => { if (!confirm("Sei sicuro? Verranno eliminate tutte le canzoni.")) return; await fetch("/api/delete-all-songs", { method: "DELETE" }); await fetchSongs(); }} className="adm-btn adm-btn-red">
            🗑 Elimina tutte le canzoni
          </button>
        </div>

        {/* ── Classifica ── */}
        <div className="adm-card">
          <div className="adm-section-title">🏆 Classifica Finale Stanza</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input className="adm-input" style={{ marginBottom: 0, flex: 1 }} type="text" placeholder="Codice stanza (es. ABC123)" value={roomCode} onChange={(e) => setRoomCode(e.target.value.toUpperCase())} onKeyDown={(e) => e.key === "Enter" && fetchLeaderboard()} />
            <button onClick={fetchLeaderboard} className="adm-btn adm-btn-gold" style={{ width: "auto", padding: "0 18px", marginBottom: 0, flexShrink: 0 }}>Carica</button>
          </div>
          {lbLoading && <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "16px 0" }}>Caricamento…</p>}
          {!lbLoading && leaderboard.length > 0 && leaderboard.map((song, i) => {
            const hasVotes = song.average !== null;
            const isFirst = hasVotes && i === 0;
            return (
              <div key={song.id} className={`adm-lb-row ${isFirst ? "adm-lb-row-first" : !hasVotes ? "adm-lb-row-novotes" : "adm-lb-row-other"}`}>
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: isFirst ? "#D4AF37" : "rgba(255,255,255,0.2)", width: 22, textAlign: "center", flexShrink: 0 }}>{hasVotes ? (isFirst ? "🏆" : i + 1) : "—"}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: isFirst ? 700 : 500, color: hasVotes ? "#ededed" : "rgba(255,255,255,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{song.title}</div>
                  <div style={{ fontSize: 10, color: "rgba(255,255,255,0.25)", textTransform: "uppercase", marginTop: 1 }}>{song.artist}</div>
                </div>
                {hasVotes && <div style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", fontFamily: "'DM Mono', monospace", flexShrink: 0, marginRight: 8 }}>{song.voteCount}v</div>}
                <div style={{ fontFamily: "'DM Mono', monospace", fontSize: isFirst ? 18 : 15, color: isFirst ? "#D4AF37" : hasVotes ? "#ededed" : "rgba(255,255,255,0.15)", flexShrink: 0 }}>{hasVotes ? song.average!.toFixed(1) : "—"}</div>
              </div>
            );
          })}
        </div>

        {/* ── Esporta voti ── */}
        <div className="adm-card">
          <div className="adm-section-title">📥 Esporta voti</div>
          <button onClick={() => window.open("/api/export-votes", "_blank")} className="adm-btn adm-btn-blue">
            <span>📥 Scarica voti.txt</span>
          </button>
        </div>
      </div>

      {toast && (
        <div className={`adm-toast${toast.out ? " adm-toast-out" : ""}`}>{toast.text}</div>
      )}
    </>
  );
}