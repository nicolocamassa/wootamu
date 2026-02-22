"use client";
import { useEffect, useState } from "react";
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

export default function SongList({ roomCode }: SongListProps) {
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);

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

  if (loading || !songs.length) return null;

  return (
    <div className="mt-5 mb-2 w-full overflow-hidden">
      <p
        style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: 12,
          fontWeight: 500,
          letterSpacing: "0.07em",
          textTransform: "uppercase",
          color: "rgba(255,255,255,0.3)",
          marginBottom: 10,
          paddingLeft: 0,
        }}
      >
        Prossime canzoni
      </p>

      <div
        className="flex overflow-x-auto gap-2 pb-1 snap-x snap-mandatory"
        style={{
          paddingLeft: 0,
          paddingRight: 16,
          scrollbarWidth: "none",
          scrollPaddingLeft: "1.25rem",
          maskImage:
            "linear-gradient(to right, transparent 0%, black 2%, black 96%, transparent 100%)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent 0%, black 2%, black 96%, transparent 100%)",
        }}
      >
        {songs.map((s) => (
          <div
            key={s.id}
            className="flex-shrink-0 flex items-center gap-2.5 snap-start"
            style={{
              width: 230,
              padding: "9px 10px",
              borderRadius: 12,
              background: "#0F0F14",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            {s.image_url ? (
              <img
                src={s.image_url}
                alt={s.artist}
                style={{ width: 38, height: 38, borderRadius: 8, objectFit: "cover", flexShrink: 0 }}
              />
            ) : (
              <div style={{ width: 38, height: 38, borderRadius: 8, background: "rgba(255,255,255,0.05)", flexShrink: 0 }} />
            )}

            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 13, fontWeight: 600, color: "#ededed", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", lineHeight: 1.3 }}>
                {s.title}
              </div>
              <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 11, color: "rgba(255,255,255,0.3)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", marginTop: 2 }}>
                {s.artist}
              </div>
            </div>

            {s.performance_time && (
              <div style={{
                flexShrink: 0,
                fontFamily: "'DM Mono', monospace",
                fontSize: 10,
                fontWeight: 500,
                color: "rgba(255,255,255,0.35)",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 6,
                padding: "3px 6px",
                lineHeight: 1.4,
              }}>
                {new Date(s.performance_time).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}