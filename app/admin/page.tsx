"use client";
import { useState, useEffect, useRef } from "react";

type StatusType = "attesa" | "presentazione" | "esibizione" | "votazione" | "spot" | "pausa" | "fine";

type Song = {
  id: number;
  title: string;
  artist: string;
  image_url?: string;
  image_url_nobg?: string;
};

type PendingProfile = {
  id: number;
  username: string;
  created_at: string;
};

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
      setTitle("");
      setArtist("");
      setPerformanceTime("");
      setImageUrl("");
      setImageUrlNobg("");
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

      const songsToImport: {
        title: string;
        artist: string;
        performance_time?: string;
        image_url?: string;
        image_url_nobg?: string;
      }[] = Array.isArray(parsed) ? parsed : parsed.songs;

      if (!Array.isArray(songsToImport)) {
        setImportStatus("❌ Formato JSON non valido. Deve essere un array o { songs: [] }");
        return;
      }

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

  const updateStatus = async (type: StatusType) => {
    setLoading(true);
    try {
      await fetch("/api/festival-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          songId: type === "esibizione" || type === "votazione" ? songId : null,
        }),
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
    <div className="min-h-screen p-8 bg-black text-white">
      <h1 className="text-3xl font-bold mb-6">🎛 Regia Festival</h1>

      {/* Utenti in attesa */}
      {pendingProfiles.length > 0 && (
        <div className="max-w-md mb-8 border border-yellow-600/40 rounded-xl p-4 bg-yellow-900/10">
          <h2 className="text-xl font-bold mb-3 text-yellow-400">
            👤 Utenti in attesa ({pendingProfiles.length})
          </h2>
          <div className="flex flex-col gap-3">
            {pendingProfiles.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between bg-stone-900 rounded-xl px-4 py-3"
              >
                <div>
                  <p className="font-bold text-white">{p.username}</p>
                  <p className="text-stone-500 text-xs">
                    {new Date(p.created_at).toLocaleString("it-IT")}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleApprove(p.id, "approve")}
                    className="bg-green-700 hover:bg-green-600 px-3 py-1.5 rounded-lg text-sm font-bold"
                  >
                    ✓ Accetta
                  </button>
                  <button
                    onClick={() => handleApprove(p.id, "reject")}
                    className="bg-red-900 hover:bg-red-800 px-3 py-1.5 rounded-lg text-sm font-bold"
                  >
                    ✕ Rifiuta
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Aggiunta canzone */}
      <div className="max-w-md mb-8 border border-stone-700 rounded-xl p-4">
        <h2 className="text-xl font-bold mb-3">➕ Aggiungi Canzone</h2>
        <input
          type="text"
          placeholder="Titolo"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full p-2 rounded bg-stone-900 border border-stone-700 mb-2"
        />
        <input
          type="text"
          placeholder="Artista"
          value={artist}
          onChange={(e) => setArtist(e.target.value)}
          className="w-full p-2 rounded bg-stone-900 border border-stone-700 mb-2"
        />
        <input
          type="datetime-local"
          value={performanceTime}
          onChange={(e) => setPerformanceTime(e.target.value)}
          className="w-full p-2 rounded bg-stone-900 border border-stone-700 mb-2"
        />
        <input
          type="url"
          placeholder="URL immagine artista (opzionale)"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className="w-full p-2 rounded bg-stone-900 border border-stone-700 mb-2"
        />
        <input
          type="url"
          placeholder="URL immagine senza sfondo (opzionale)"
          value={imageUrlNobg}
          onChange={(e) => setImageUrlNobg(e.target.value)}
          className="w-full p-2 rounded bg-stone-900 border border-stone-700 mb-3"
        />
        <button
          onClick={handleAddSong}
          className="bg-orange-600 py-2 rounded-xl w-full"
        >
          Aggiungi
        </button>

        {/* Import JSON */}
        <div className="mt-4 border-t border-stone-700 pt-4">
          <p className="text-stone-400 text-sm mb-2">Oppure importa da file JSON:</p>
          <p className="text-stone-600 text-xs mb-3">
            Formato atteso:{" "}
            <code>[{"{ title, artist, performance_time?, image_url?, image_url_nobg? }"}]</code>
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImportJSON}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="bg-stone-700 hover:bg-stone-600 py-2 rounded-xl w-full"
          >
            📂 Carica file JSON
          </button>
          {importStatus && (
            <p className="text-sm mt-2 text-stone-300">{importStatus}</p>
          )}
        </div>

        <button
          onClick={async () => {
            if (!confirm("Sei sicuro? Verranno eliminate tutte le canzoni.")) return;
            await fetch("/api/delete-all-songs", { method: "DELETE" });
            await fetchSongs();
          }}
          className="bg-red-800 hover:bg-red-700 py-3 rounded-xl w-full mt-4"
        >
          🗑 Elimina tutte le canzoni
        </button>
      </div>

      {/* Controlli stato */}
      <div className="flex flex-col gap-4 max-w-md">
        <button
          onClick={() => updateStatus("attesa")}
          className="bg-stone-700 py-3 rounded-xl"
        >
          ⏳ In attesa
        </button>
        <button
          onClick={() => updateStatus("presentazione")}
          className="bg-blue-600 py-3 rounded-xl"
        >
          🎤 Presentazione
        </button>
        <button
          onClick={() => updateStatus("spot")}
          className="bg-yellow-600 py-3 rounded-xl"
        >
          📺 Spot Pubblicitario
        </button>
        <button
          onClick={() => updateStatus("pausa")}
          className="bg-gray-600 py-3 rounded-xl"
        >
          ⏸ Pausa
        </button>
        <button
          onClick={() => updateStatus("fine")}
          className="bg-red-900 border border-red-700 py-3 rounded-xl"
        >
          🏁 Fine serata
        </button>

        <div className="border-t border-stone-700 pt-4 mt-2">
          <p className="mb-2 text-stone-400">
            Seleziona canzone per esibizione/votazione
          </p>
          <select
            value={songId}
            onChange={(e) => setSongId(Number(e.target.value))}
            className="w-full p-2 rounded bg-stone-900 border border-stone-700 mb-3"
          >
            <option value="">-- Seleziona canzone --</option>
            {songs.map((s) => (
              <option key={s.id} value={s.id}>
                {s.artist} – {s.title}
              </option>
            ))}
          </select>

          <button
            onClick={() => updateStatus("esibizione")}
            className="bg-green-600 py-3 rounded-xl w-full mb-2"
          >
            ▶ Avvia Esibizione
          </button>
          <button
            onClick={() => updateStatus("votazione")}
            className="bg-purple-600 py-3 rounded-xl w-full"
          >
            🗳 Apri Votazione
          </button>
        </div>

        {loading && (
          <p className="text-sm text-stone-400 mt-4">Aggiornamento in corso...</p>
        )}
      </div>
    </div>
  );
}