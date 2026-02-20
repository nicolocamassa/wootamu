"use client";
import { useEffect, useState, useRef } from "react";
import { pusherClient } from "@/_lib/pusherClient";

type Song = {
  id: number;
  title: string;
  artist: string;
  image_url?: string;
  performance_time?: string;
};

type SongListProps = {
  roomCode: string;
  currentSongId?: number | null;
};

export default function SongList({ roomCode, currentSongId }: SongListProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchSongs = async () => {
    try {
      const res = await fetch(`/api/get-songs?roomCode=${roomCode}`);
      if (!res.ok) throw new Error("Errore fetch canzoni");
      const data: Song[] = await res.json();
      setSongs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSongs();

    const channel = pusherClient.subscribe("festival");

    const handleStatusUpdate = () => fetchSongs();
    channel.bind("status-update", handleStatusUpdate);

    return () => {
      channel.unbind("status-update", handleStatusUpdate);
    };
  }, [roomCode]);

  if (loading) return <p>Caricamento canzoni...</p>;
  if (!songs.length) return null;

  return (
    <>
      <h2 className="font-bold text-md mt-4">Prossime canzoni</h2>
      <div
        ref={containerRef}
        className="flex overflow-x-auto gap-4 snap-x snap-mandatory scroll-smooth py-3"
        style={{ scrollPadding: "1rem" }}
      >
        {songs.map((s) => (
          <div
            key={s.id}
            className="flex-shrink-0 flex items-center justify-between w-72 border rounded-2xl py-4 px-5 border-yellow-300/25 snap-center"
          >
            <div className="flex items-center gap-3">
              {s.image_url ? (
                <img
                  src={s.image_url}
                  alt={s.artist}
                  className="w-12 h-12 rounded-xl object-cover flex-shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-stone-700 flex-shrink-0" />
              )}
              <div className="flex flex-col">
                <span className="font-bold">{s.title}</span>
                <span className="text-stone-500 text-sm">{s.artist}</span>
              </div>
            </div>
            <span className="bg-stone-400/15 px-2 rounded-full text-sm text-stone-400 ml-2 inline-block whitespace-nowrap">
              {s.performance_time &&
                new Date(s.performance_time).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
            </span>
          </div>
        ))}
      </div>
    </>
  );
}