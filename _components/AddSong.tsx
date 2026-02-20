"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Button from "./Button";

export default function SongForm({ roomCode }: { roomCode: string }) {
  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [time, setTime] = useState("");
  const [songs, setSongs] = useState<any[]>([]);
  const router = useRouter()

  const handleAddSong = async () => {
    try {
      const res = await fetch("/api/add-song", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ roomCode, title, artist, performanceTime: time }),
      });
      if (!res.ok) throw new Error("Errore server");

      const newSong = await res.json();
      setSongs((prev) => [...prev, newSong]);

      // Pulisci input
      setTitle("");
      setArtist("");
      setTime("");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div>
      <h3>Aggiungi canzone</h3>
      <input
        type="text"
        placeholder="Titolo"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <input
        type="text"
        placeholder="Artista"
        value={artist}
        onChange={(e) => setArtist(e.target.value)}
      />
      <input
        type="datetime-local"
        placeholder="Orario performance"
        value={time}
        onChange={(e) => setTime(e.target.value)}
      />
      <button onClick={handleAddSong}>Aggiungi</button>

      <ul>
        {songs.map((s) => (
          <li key={s.id}>
            {s.title} - {s.artist} ({new Date(s.performance_time).toLocaleTimeString()})
          </li>
        ))}
      </ul>
    </div>
  );
}
