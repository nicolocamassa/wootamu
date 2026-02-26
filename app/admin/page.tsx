"use client";
import { useState, useEffect, useRef, useCallback } from "react";

type StatusType = "attesa" | "presentazione" | "esibizione" | "votazione" | "spot" | "pausa" | "classifica" | "fine";

type Song = {
  id: number;
  title: string;
  artist: string;
  night?: number | null;
  image_url?: string;
  image_url_nobg?: string;
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
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [artistCanonical, setArtistCanonical] = useState("");
  const [songNight, setSongNight] = useState<number | "">("");
  const [performanceTime, setPerformanceTime] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageUrlNobg, setImageUrlNobg] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [pendingProfiles, setPendingProfiles] = useState<PendingProfile[]>([]);
  const [leaderboard, setLeaderboard] = useState<SongResult[]>([]);
  const [lbLoading, setLbLoading] = useState(false);
  const [roomCode, setRoomCode] = useState<string>("");
  const [toast, setToast] = useState<{ text: string; out: boolean } | null>(null);
  const [activeNight, setActiveNight] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimerRef = useRef<NodeJS.Timeout | null>(null);

  const songsRef = useRef<Song[]>([]);
  const songIdRef = useRef<number | "">("");
  useEffect(() => { songsRef.current = songs; }, [songs]);
  useEffect(() => { songIdRef.current = songId; }, [songId]);

  const fetchSongs = async () => {
    const res = await fetch("/api/songs");
    const data = await res.json();
    setSongs(data);
  };

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

  useEffect(() => {
    fetchSongs();
    fetchPending();
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

  const updateStatus = useCallback(async (type: StatusType, overrideSongId?: number | "", night?: number) => {
    setLoading(true);
    const sid = overrideSongId !== undefined ? overrideSongId : songIdRef.current;
    try {
      await fetch("/api/festival-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          songId: type === "esibizione" || type === "votazione" ? sid : null,
          ...(night !== undefined ? { night } : {}),
        }),
      });
    } catch (error) {
      console.error("Errore aggiornamento stato", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Imposta la serata su tutte le room dell'evento
  const setNight = useCallback(async (n: number) => {
    try {
      await fetch("/api/set-night", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ night: n }),
      });
      setActiveNight(n);
      showToast(`🌙 Serata ${n} attivata su tutte le stanze`);
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
        const currentIndex = withTime.findIndex((s) => s.id === currentId);
        if (currentIndex >= 0 && currentIndex + 1 < withTime.length) return withTime[currentIndex + 1];
      }
      const now = new Date();
      const future = withTime.find((s) => new Date(s.performance_time!) >= now);
      return future ?? withTime[0];
    }
    if (currentId) {
      const idx = list.findIndex((s) => s.id === currentId);
      if (idx >= 0 && idx + 1 < list.length) return list[idx + 1];
    }
    return list[0];
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      const key = e.key.toLowerCase();
      if (key === "n") {
        const next = getNextSong();
        if (!next) { showToast("⚠️ Nessuna canzone disponibile"); return; }
        setSongId(next.id);
        updateStatus("esibizione", next.id);
        showToast(`▶ Esibizione: ${next.artist} – ${next.title}`);
        return;
      }
      if (key === "v") {
        const sid = songIdRef.current;
        if (!sid) { showToast("⚠️ Nessuna canzone selezionata"); return; }
        updateStatus("votazione", sid);
        const song = songsRef.current.find((s) => s.id === sid);
        showToast(`🗳 Votazione: ${song ? `${song.artist} – ${song.title}` : sid}`);
        return;
      }
      if (key === "1") { updateStatus("presentazione"); showToast("🎤 Presentazione"); return; }
      if (key === "2") { updateStatus("spot"); showToast("📺 Spot pubblicitario"); return; }
      if (key === "3") { updateStatus("pausa"); showToast("⏸ Pausa"); return; }
      if (key === "4") { updateStatus("attesa"); showToast("⏳ In attesa"); return; }
      if (key === "5") { updateStatus("classifica"); showToast("🏆 Classifica finale"); return; }
      if (key === "6") { updateStatus("fine"); showToast("🏁 Fine serata"); return; }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [updateStatus, getNextSong, showToast]);

  const nextSong = getNextSong();

  const handleAddSong = async () => {
    if (!title || !artist) return;
    try {
      await fetch("/api/add-song", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          artist,
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
      const songsToImport: { title: string; artist: string; artist_canonical?: string; night?: number; performance_time?: string; image_url?: string; image_url_nobg?: string; }[] =
        Array.isArray(parsed) ? parsed : parsed.songs;
      if (!Array.isArray(songsToImport)) { setImportStatus("❌ Formato JSON non valido."); return; }
      setImportStatus(`⏳ Importazione di ${songsToImport.length} canzoni...`);
      let success = 0;
      for (const song of songsToImport) {
        if (!song.title || !song.artist) continue;
        const res = await fetch("/api/add-song", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: song.title,
            artist: song.artist,
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
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>
            Imposta la serata corrente. Tutti i voti registrati da questo momento in poi
            saranno taggati con questo numero su <strong style={{ color: "rgba(255,255,255,0.5)" }}>tutte le stanze</strong>.
          </p>

          {/* Pulsanti serata */}
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            {NIGHTS.map(({ n, label }) => (
              <button
                key={n}
                onClick={() => setNight(n)}
                className={`adm-night-btn ${activeNight === n ? "adm-night-btn-active" : ""}`}
              >
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

        {/* ── Shortcut reference card ── */}
        <div className="adm-card" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
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

          {nextSong && (
            <div style={{ marginTop: 14 }}>
              <div className="adm-next-song">
                <span style={{ fontSize: 18 }}>⏭</span>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 10, color: "rgba(134,239,172,0.6)", letterSpacing: "0.07em", textTransform: "uppercase", marginBottom: 2 }}>
                    Prossima con <Kbd>N</Kbd>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "#ededed", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {nextSong.artist} – {nextSong.title}
                  </div>
                  {nextSong.performance_time && (
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", marginTop: 2, fontFamily: "monospace" }}>
                      {new Date(nextSong.performance_time).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Utenti in attesa ── */}
        {pendingProfiles.length > 0 && (
          <div className="adm-card" style={{ borderColor: "rgba(212,175,55,0.2)" }}>
            <div className="adm-section-title" style={{ color: "#D4AF37" }}>
              👤 Utenti in attesa ({pendingProfiles.length})
            </div>
            {pendingProfiles.map((p) => (
              <div key={p.id} className="adm-pending-row">
                <div>
                  <p style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{p.username}</p>
                  <p style={{ fontSize: 11, color: "rgba(255,255,255,0.28)" }}>{new Date(p.created_at).toLocaleString("it-IT")}</p>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button onClick={() => handleApprove(p.id, "approve")} className="adm-btn adm-btn-green" style={{ width: "auto", padding: "7px 14px", marginBottom: 0 }}>✓ Accetta</button>
                  <button onClick={() => handleApprove(p.id, "reject")} className="adm-btn adm-btn-red" style={{ width: "auto", padding: "7px 14px", marginBottom: 0 }}>✕ Rifiuta</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Aggiungi canzone ── */}
        <div className="adm-card">
          <div className="adm-section-title">➕ Aggiungi Canzone</div>
          <input className="adm-input" type="text" placeholder="Titolo" value={title} onChange={(e) => setTitle(e.target.value)} />
          <input className="adm-input" type="text" placeholder="Artista (es. Marco Mengoni feat. Ultimo)" value={artist} onChange={(e) => setArtist(e.target.value)} />
          <input
            className="adm-input"
            type="text"
            placeholder="Artista canonico per cumulative (es. Marco Mengoni)"
            value={artistCanonical}
            onChange={(e) => setArtistCanonical(e.target.value)}
          />
          <p style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", marginTop: -4, marginBottom: 10, lineHeight: 1.5 }}>
            L'artista canonico serve a collegare questa canzone alle versioni in serate diverse (es. duetti).
            Lascia vuoto se non serve.
          </p>
          <select
            value={songNight}
            onChange={(e) => setSongNight(e.target.value !== "" ? Number(e.target.value) : "")}
            className="adm-input"
            style={{ backgroundColor: "#1a1a24", color: songNight !== "" ? "#ededed" : "rgba(255,255,255,0.2)" }}
          >
            <option value="" style={{ background: "#1a1a24" }}>-- Serata (opzionale) --</option>
            {[1,2,3,4,5].map((n) => (
              <option key={n} value={n} style={{ background: "#1a1a24" }}>
                {n}ª serata
              </option>
            ))}
          </select>
          <input className="adm-input" type="datetime-local" value={performanceTime} onChange={(e) => setPerformanceTime(e.target.value)} />
          <input className="adm-input" type="url" placeholder="URL immagine artista (opzionale)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          <input className="adm-input" type="url" placeholder="URL immagine senza sfondo (opzionale)" value={imageUrlNobg} onChange={(e) => setImageUrlNobg(e.target.value)} />
          <button onClick={handleAddSong} className="adm-btn adm-btn-gold" style={{ marginTop: 4 }}>Aggiungi</button>

          <hr className="adm-divider" />
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>Importa da file JSON:</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", marginBottom: 10, fontFamily: "monospace" }}>
            {"[{ title, artist, artist_canonical?, night?, performance_time?, image_url?, image_url_nobg? }]"}
          </p>
          <input ref={fileInputRef} type="file" accept=".json" onChange={handleImportJSON} style={{ display: "none" }} />
          <button onClick={() => fileInputRef.current?.click()} className="adm-btn adm-btn-gray">📂 Carica file JSON</button>
          {importStatus && <p style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginTop: 8 }}>{importStatus}</p>}

          <hr className="adm-divider" />
          <button
            onClick={async () => {
              if (!confirm("Sei sicuro? Verranno eliminate tutte le canzoni.")) return;
              await fetch("/api/delete-all-songs", { method: "DELETE" });
              await fetchSongs();
            }}
            className="adm-btn adm-btn-red"
          >
            🗑 Elimina tutte le canzoni
          </button>
        </div>

        {/* ── Controlli stato ── */}
        <div className="adm-card">
          <div className="adm-section-title">🎛 Controlli stato</div>
          <button onClick={() => { updateStatus("attesa"); showToast("⏳ In attesa"); }} className="adm-btn adm-btn-gray">
            <span>⏳ In attesa</span><Kbd>4</Kbd>
          </button>
          <button onClick={() => { updateStatus("presentazione"); showToast("🎤 Presentazione"); }} className="adm-btn adm-btn-blue">
            <span>🎤 Presentazione</span><Kbd>1</Kbd>
          </button>
          <button onClick={() => { updateStatus("spot"); showToast("📺 Spot"); }} className="adm-btn adm-btn-yellow">
            <span>📺 Spot Pubblicitario</span><Kbd>2</Kbd>
          </button>
          <button onClick={() => { updateStatus("pausa"); showToast("⏸ Pausa"); }} className="adm-btn adm-btn-gray">
            <span>⏸ Pausa</span><Kbd>3</Kbd>
          </button>
          <button onClick={() => { updateStatus("classifica"); showToast("🏆 Classifica finale"); }} className="adm-btn adm-btn-gold">
            <span>🏆 Classifica finale</span><Kbd>5</Kbd>
          </button>
          <button onClick={() => { updateStatus("fine"); showToast("🏁 Fine serata"); }} className="adm-btn adm-btn-red">
            <span>🏁 Fine serata</span><Kbd>6</Kbd>
          </button>

          <hr className="adm-divider" />
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>Seleziona canzone per esibizione / votazione</p>
          <select
            value={songId}
            onChange={(e) => setSongId(Number(e.target.value))}
            className="adm-input"
            style={{ marginBottom: 12, backgroundColor: "#1a1a24", color: "#ededed" }}
          >
            <option value="" style={{ background: "#1a1a24" }}>-- Seleziona canzone --</option>
            {songs
              .filter((s) => activeNight === null || s.night === activeNight || s.night == null)
              .map((s) => (
                <option key={s.id} value={s.id} style={{ background: "#1a1a24" }}>
                  {s.artist} – {s.title}
                  {s.performance_time ? ` (${new Date(s.performance_time).toLocaleTimeString("it-IT", { hour: "2-digit", minute: "2-digit" })})` : ""}
                </option>
              ))}
          </select>
          <button onClick={() => {
            const sid = songId;
            if (!sid) return;
            updateStatus("esibizione", sid);
            const song = songs.find((s) => s.id === sid);
            showToast(`▶ Esibizione: ${song ? `${song.artist} – ${song.title}` : sid}`);
          }} className="adm-btn adm-btn-green">
            <span>▶ Avvia Esibizione</span><Kbd>N</Kbd>
          </button>
          <button onClick={() => {
            const sid = songId;
            if (!sid) return;
            updateStatus("votazione", sid);
            const song = songs.find((s) => s.id === sid);
            showToast(`🗳 Votazione: ${song ? `${song.artist} – ${song.title}` : sid}`);
          }} className="adm-btn adm-btn-purple">
            <span>🗳 Apri Votazione</span><Kbd>V</Kbd>
          </button>
          {loading && <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginTop: 10 }}>Aggiornamento in corso…</p>}
        </div>

        {/* ── Classifica finale ── */}
        <div className="adm-card">
          <div className="adm-section-title">🏆 Classifica Finale Stanza</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
            <input
              className="adm-input"
              style={{ marginBottom: 0, flex: 1 }}
              type="text"
              placeholder="Codice stanza (es. ABC123)"
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              onKeyDown={(e) => e.key === "Enter" && fetchLeaderboard()}
            />
            <button
              onClick={fetchLeaderboard}
              className="adm-btn adm-btn-gold"
              style={{ width: "auto", padding: "0 18px", marginBottom: 0, flexShrink: 0 }}
            >
              Carica
            </button>
          </div>

          {lbLoading && (
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", textAlign: "center", padding: "16px 0" }}>
              Caricamento…
            </p>
          )}

          {!lbLoading && leaderboard.length > 0 && (
            <>
              {(() => {
                const withVotes = leaderboard.filter((s) => s.average !== null);
                if (withVotes.length === 0) return null;
                const overall = withVotes.reduce((sum, s) => sum + s.average!, 0) / withVotes.length;
                return (
                  <div style={{ marginBottom: 16, paddingBottom: 14, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 42, fontWeight: 400, color: "#ededed", lineHeight: 1, letterSpacing: "-1px" }}>
                      {overall.toFixed(2)}
                    </div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,0.28)", marginTop: 4 }}>
                      media generale serata · {withVotes.length} {withVotes.length === 1 ? "canzone votata" : "canzoni votate"}
                      {activeNight && <span style={{ marginLeft: 8, color: "rgba(212,175,55,0.5)" }}>· {activeNight}ª serata</span>}
                    </div>
                  </div>
                );
              })()}

              {leaderboard.map((song, i) => {
                const hasVotes = song.average !== null;
                const isFirst = hasVotes && i === 0;
                let rowClass = "adm-lb-row ";
                if (isFirst) rowClass += "adm-lb-row-first";
                else if (!hasVotes) rowClass += "adm-lb-row-novotes";
                else rowClass += "adm-lb-row-other";
                return (
                  <div key={song.id} className={rowClass}>
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: isFirst ? 14 : 11, color: isFirst ? "#D4AF37" : "rgba(255,255,255,0.2)", width: 22, textAlign: "center", flexShrink: 0 }}>
                      {hasVotes ? (isFirst ? "🏆" : i + 1) : "—"}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: isFirst ? 700 : 500, color: hasVotes ? "#ededed" : "rgba(255,255,255,0.3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {song.title}
                      </div>
                      <div style={{ fontSize: 10, color: isFirst ? "rgba(212,175,55,0.6)" : "rgba(255,255,255,0.25)", letterSpacing: "0.05em", textTransform: "uppercase", marginTop: 1 }}>
                        {song.artist}
                      </div>
                    </div>
                    {hasVotes && (
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.22)", fontFamily: "'DM Mono', monospace", flexShrink: 0, marginRight: 8 }}>
                        {song.voteCount}v
                      </div>
                    )}
                    <div style={{ fontFamily: "'DM Mono', monospace", fontSize: isFirst ? 18 : 15, fontWeight: isFirst ? 700 : 400, color: isFirst ? "#D4AF37" : hasVotes ? "#ededed" : "rgba(255,255,255,0.15)", flexShrink: 0 }}>
                      {hasVotes ? song.average!.toFixed(1) : "—"}
                    </div>
                  </div>
                );
              })}
            </>
          )}

          {!lbLoading && leaderboard.length === 0 && roomCode && (
            <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)", textAlign: "center", padding: "16px 0" }}>
              Nessun risultato trovato per "{roomCode}"
            </p>
          )}
        </div>

        {/* ── Esporta voti ── */}
        <div className="adm-card">
          <div className="adm-section-title">📥 Esporta voti</div>
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 12 }}>
            Scarica i voti di <strong style={{ color: "rgba(255,255,255,0.5)" }}>Nicolino</strong>, <strong style={{ color: "rgba(255,255,255,0.5)" }}>Manuè</strong> e <strong style={{ color: "rgba(255,255,255,0.5)" }}>Mieru a culuni</strong>, divisi per serata.
          </p>
          <button
            onClick={() => window.open("/api/export-votes", "_blank")}
            className="adm-btn adm-btn-blue"
          >
            <span>📥 Scarica voti.txt</span>
          </button>
        </div>
      </div>

      {toast && (
        <div className={`adm-toast${toast.out ? " adm-toast-out" : ""}`}>
          {toast.text}
        </div>
      )}
    </>
  );
}