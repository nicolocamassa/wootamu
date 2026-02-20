"use client";

import { useEffect, useState, useRef } from "react";

type Song = {
  id: number;
  title: string;
  artist: string;
  performance_time?: string;
};

export default function SongSwipe({ roomCode }: { roomCode: string }) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const touchStartY = useRef<number | null>(null);

  useEffect(() => {
    const fetchSongs = async () => {
      try {
        const res = await fetch(`/api/get-songs?roomCode=${roomCode}`);
        if (!res.ok) throw new Error("Errore fetch canzoni");

        const data: Song[] = await res.json();
        setSongs(data);
      } catch (err) {
        console.error(err);
      }
    };

    fetchSongs();
  }, [roomCode]);

  // Gestione swipe verticale
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartY.current = e.touches[0].clientY;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartY.current === null) return;
    const deltaY = e.changedTouches[0].clientY - touchStartY.current;

    if (deltaY < -30 && currentIndex < songs.length - 1) {
      // swipe verso l'alto → canzone successiva
      setCurrentIndex((prev) => prev + 1);
    } else if (deltaY > 30 && currentIndex > 0) {
      // swipe verso il basso → canzone precedente
      setCurrentIndex((prev) => prev - 1);
    }

    touchStartY.current = null;
  };

  if (!songs.length) return <p>Nessuna canzone disponibile</p>;

  const currentSong = songs[currentIndex];

  return (
    <div
      className="border rounded-2xl p-6 border-stone-700 flex flex-col justify-between items-start max-w-md mx-auto"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <div className="flex flex-col gap-1 w-full">
        <span className="font-bold text-lg">{currentSong.title}</span>
        <span className="text-stone-500">{currentSong.artist}</span>
      </div>
      {currentSong.performance_time && (
        <span className="bg-stone-400/15 px-3 py-1 rounded-full text-sm text-stone-400 mt-3">
          {new Date(currentSong.performance_time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      )}
      <div className="text-xs text-stone-500 mt-2">
        {currentIndex + 1} / {songs.length}
      </div>
    </div>
  );
}
