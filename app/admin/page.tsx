"use client";
import { useState, useEffect, useRef } from "react";

type StatusType = "attesa" | "presentazione" | "esibizione" | "votazione" | "spot" | "pausa" | "classifica" | "fine";

type Song = {
  id: number;
  title: string;
  artist: string;
  image_url?: string;
  image_url_nobg?: string;
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

  .adm-card {
    background: #0F0F14;
    border: 1px solid rgba(255,255,255,0.07);
    border-radius: 18px;
    padding: 20px;
    margin-bottom: 20px;
    max-width: 480px;
  }

  .adm-section-title {
    font-size: 13px;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    color: rgba(255,255,255,0.35);
    margin-bottom: 14px;
  }

  .adm-input {
    width: 100%;
    background: rgba(255,255,255,0.04);
    border: 1px solid rgba(255,255,255,0.08);
    border-radius: 10px;
    padding: 10px 12px;
    color: #ededed;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    outline: none;
    margin-bottom: 8px;
    box-sizing: border-box;
  }
  .adm-input::placeholder { color: rgba(255,255,255,0.2); }
  .adm-input:focus { border-color: rgba(255,255,255,0.18); }

  .adm-btn {
    width: 100%;
    padding: 12px;
    border-radius: 12px;
    border: none;
    font-family: 'Inter', sans-serif;
    font-weight: 700;
    font-size: 12px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    cursor: pointer;
    margin-bottom: 8px;
    transition: opacity 0.2s, background 0.2s;
  }
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

  .adm-pending-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(255,255,255,0.03);
    border: 1px solid rgba(255,255,255,0.06);
    border-radius: 12px;
    padding: 12px 14px;
    margin-bottom: 8px;
  }

  /* Leaderboard */
  .adm-lb-row {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 10px 12px;
    border-radius: 12px;
    border: 1px solid transparent;
    margin-bottom: 6px;
  }
  .adm-lb-row-first {
    background: rgba(212,175,55,0.08);
    border-color: rgba(212,175,55,0.2);
  }
  .adm-lb-row-other { background: rgba(255,255,255,0.02); border-color: rgba(255,255,255,0.04); }
  .adm-lb-row-novotes { background: rgba(255,255,255,0.015); opacity: 0.5; }
`;

export default function FestivalControlPage() {
  const [loading, setLoading] = useState(false);
  const [songId, setSongId] = useState<number | "">("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [performanceTime, setPerformanceTime] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageUrlNobg, setImageUrlNobg] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const [pendingProfiles, setPendingProfiles] = useState<PendingProfile[]>([]);
  const [leaderboard, setLeaderboard] = useState<SongResult[]>([]);
  const [lbLoading, setLbLoading] = useState(false);
  const [roomCode, setRoomCode] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const handleAddSong = async () => {
    if (!title || !artist) return;
    try {
      await fetch("/api/add-song", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          artist,
          performanceTime,
          imageUrl: imageUrl || null,
          imageUrlNobg: imageUrlNobg || null,
        }),
      });
      setTitle(""); setArtist(""); setPerformanceTime(""); setImageUrl(""); setImageUrlNobg("");
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
      const songsToImport: { title: string; artist: string; performance_time?: string; image_url?: string; image_url_nobg?: string; }[] =
        Array.isArray(parsed) ? parsed : parsed.songs;
      if (!Array.isArray(songsToImport)) { setImportStatus("❌ Formato JSON non valido."); return; }
      setImportStatus(`⏳ Importazione di ${songsToImport.length} canzoni...`);
      let success = 0;
      for (const song of songsToImport) {
        if (!song.title || !song.artist) continue;
        const res = await fetch("/api/add-song", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: song.title, artist: song.artist, performanceTime: song.performance_time ?? null, imageUrl: song.image_url ?? null, imageUrlNobg: song.image_url_nobg ?? null }),
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

  const updateStatus = async (type: StatusType) => {
    setLoading(true);
    try {
      await fetch("/api/festival-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, songId: type === "esibizione" || type === "votazione" ? songId : null }),
      });
    } catch (error) {
      console.error("Errore aggiornamento stato", error);
    } finally {
      setLoading(false);
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
          <input className="adm-input" type="text" placeholder="Artista" value={artist} onChange={(e) => setArtist(e.target.value)} />
          <input className="adm-input" type="datetime-local" value={performanceTime} onChange={(e) => setPerformanceTime(e.target.value)} />
          <input className="adm-input" type="url" placeholder="URL immagine artista (opzionale)" value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} />
          <input className="adm-input" type="url" placeholder="URL immagine senza sfondo (opzionale)" value={imageUrlNobg} onChange={(e) => setImageUrlNobg(e.target.value)} />
          <button onClick={handleAddSong} className="adm-btn adm-btn-gold" style={{ marginTop: 4 }}>Aggiungi</button>

          <hr className="adm-divider" />
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 8 }}>Importa da file JSON:</p>
          <p style={{ fontSize: 11, color: "rgba(255,255,255,0.18)", marginBottom: 10, fontFamily: "monospace" }}>
            {"[{ title, artist, performance_time?, image_url?, image_url_nobg? }]"}
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
          <button onClick={() => updateStatus("attesa")} className="adm-btn adm-btn-gray">⏳ In attesa</button>
          <button onClick={() => updateStatus("presentazione")} className="adm-btn adm-btn-blue">🎤 Presentazione</button>
          <button onClick={() => updateStatus("spot")} className="adm-btn adm-btn-yellow">📺 Spot Pubblicitario</button>
          <button onClick={() => updateStatus("pausa")} className="adm-btn adm-btn-gray">⏸ Pausa</button>
          <button onClick={() => updateStatus("classifica" as StatusType)} className="adm-btn adm-btn-gold">🏆 Classifica finale</button>
          <button onClick={() => updateStatus("fine")} className="adm-btn adm-btn-red">🏁 Fine serata</button>

          <hr className="adm-divider" />
          <p style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", marginBottom: 10 }}>Seleziona canzone per esibizione / votazione</p>
          <select
            value={songId}
            onChange={(e) => setSongId(Number(e.target.value))}
            className="adm-input"
            style={{ marginBottom: 12 }}
          >
            <option value="">-- Seleziona canzone --</option>
            {songs.map((s) => (
              <option key={s.id} value={s.id}>{s.artist} – {s.title}</option>
            ))}
          </select>
          <button onClick={() => updateStatus("esibizione")} className="adm-btn adm-btn-green">▶ Avvia Esibizione</button>
          <button onClick={() => updateStatus("votazione")} className="adm-btn adm-btn-purple">🗳 Apri Votazione</button>
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
              {/* Media generale */}
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
                    </div>
                  </div>
                );
              })()}

              {/* Righe classifica */}
              {leaderboard.map((song, i) => {
                const hasVotes = song.average !== null;
                const isFirst = hasVotes && i === 0;
                let rowClass = "adm-lb-row ";
                if (isFirst) rowClass += "adm-lb-row-first";
                else if (!hasVotes) rowClass += "adm-lb-row-novotes";
                else rowClass += "adm-lb-row-other";

                return (
                  <div key={song.id} className={rowClass}>
                    {/* Posizione */}
                    <div style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: isFirst ? 14 : 11,
                      color: isFirst ? "#D4AF37" : "rgba(255,255,255,0.2)",
                      width: 22,
                      textAlign: "center",
                      flexShrink: 0,
                    }}>
                      {hasVotes ? (isFirst ? "🏆" : i + 1) : "—"}
                    </div>

                    {/* Titolo + artista */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: 13,
                        fontWeight: isFirst ? 700 : 500,
                        color: hasVotes ? "#ededed" : "rgba(255,255,255,0.3)",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}>
                        {song.title}
                      </div>
                      <div style={{
                        fontSize: 10,
                        color: isFirst ? "rgba(212,175,55,0.6)" : "rgba(255,255,255,0.25)",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                        marginTop: 1,
                      }}>
                        {song.artist}
                      </div>
                    </div>

                    {/* Voti count */}
                    {hasVotes && (
                      <div style={{
                        fontSize: 10,
                        color: "rgba(255,255,255,0.22)",
                        fontFamily: "'DM Mono', monospace",
                        flexShrink: 0,
                        marginRight: 8,
                      }}>
                        {song.voteCount}v
                      </div>
                    )}

                    {/* Media */}
                    <div style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: isFirst ? 18 : 15,
                      fontWeight: isFirst ? 700 : 400,
                      color: isFirst ? "#D4AF37" : hasVotes ? "#ededed" : "rgba(255,255,255,0.15)",
                      flexShrink: 0,
                    }}>
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
      </div>
    </>
  );
}