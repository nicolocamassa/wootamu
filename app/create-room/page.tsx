"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { pusherClient } from "@/_lib/pusherClient";
import { Radio } from "lucide-react";

type Song = {
  id: number;
  title: string;
  artist: string;
  image_url?: string;
  performance_time?: string;
};

type StatusType = "attesa" | "presentazione" | "esibizione" | "votazione" | "spot" | "pausa" | "fine";

const STATUS_LABELS: Record<StatusType, string> = {
  attesa: "A breve",
  presentazione: "Presentazione",
  esibizione: "Esibizione",
  votazione: "Votazione",
  spot: "Pubblicità",
  pausa: "Pausa",
  fine: "Fine serata",
};

const LIVE_STATES: StatusType[] = ["presentazione", "esibizione", "votazione", "spot", "pausa"];

function generateCode(length = 6) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < length; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function CreateRoom() {
  const [code] = useState(generateCode());
  const [eventName, setEventName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [songs, setSongs] = useState<Song[]>([]);
  const [festivalType, setFestivalType] = useState<StatusType | null>(null);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) {
      router.push("/login");
      return;
    }
    setUserToken(token);

    const fetchSongs = async () => {
      try {
        const res = await fetch("/api/get-songs");
        if (!res.ok) return;
        const data: Song[] = await res.json();
        setSongs(data);
      } catch (err) {
        console.error(err);
      }
    };

    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/festival-status");
        const data = await res.json();
        setFestivalType(data.type ?? null);
      } catch (err) {
        console.error(err);
      }
    };

    fetchSongs();
    fetchStatus();

    const channel = pusherClient.subscribe("festival");
    const handleUpdate = (data: { type: StatusType }) => setFestivalType(data.type);
    channel.bind("status-update", handleUpdate);

    return () => {
      channel.unbind("status-update", handleUpdate);
    };
  }, []);

  const handleCreate = async () => {
    if (!userToken) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/create-room", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ code, event: eventName }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Errore");
        return;
      }

      localStorage.setItem("userToken", data.userToken);
      router.push(`/room/${code}`);
    } catch (err) {
      console.error(err);
      setError("Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  const isLive = festivalType ? LIVE_STATES.includes(festivalType) : false;

  return (
    <div
      className="flex flex-col text-white overflow-hidden"
      style={{ height: "100dvh" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 h-14 flex-shrink-0">
        <h1 className="font-bold text-xl">Wootamu</h1>
        {isLive ? (
          <span className="bg-red-500/35 text-red-500 rounded-full px-2 py-0.5 flex items-center gap-1 text-xs">
            <Radio size={12} />
            Live
          </span>
        ) : festivalType ? (
          <span className="bg-stone-800 text-stone-400 rounded-full px-2 py-0.5 text-xs">
            {STATUS_LABELS[festivalType]}
          </span>
        ) : null}
      </div>

      {/* Form centrato */}
      <div className="flex flex-col items-center justify-center flex-shrink-0 px-5 py-6">
        <h1 className="text-3xl font-black mb-2 text-center">Crea un party</h1>
        <p className="text-stone-500 text-sm mb-1 text-center">
          Dai un nome al tuo party.
        </p>
        <p className="text-stone-600 text-xs mb-6 text-center">
          Codice stanza: <span className="text-white font-bold">{code}</span>
        </p>

        <div className="flex flex-col gap-3 w-full">
          <input
            type="text"
            placeholder="Nome evento (opzionale)"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            className="w-full p-3 rounded-2xl bg-transparent border border-stone-700 text-white placeholder-stone-600"
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            onClick={handleCreate}
            disabled={loading}
            className="w-full py-3 rounded-2xl font-bold text-white bg-active-button disabled:bg-disabled-button mt-1"
          >
            {loading ? "Creazione..." : "Conferma"}
          </button>
        </div>
      </div>

      {/* Lista canzoni */}
      {songs.length > 0 && (
        <div className="flex flex-col flex-1 overflow-hidden px-5 pb-6">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <h2 className="font-bold text-md">Prossime canzoni:</h2>
            {songs[0]?.performance_time && (
              <span className="text-xs bg-stone-800 text-stone-400 px-2 py-1 rounded-full">
                {new Date(songs[0].performance_time).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            )}
          </div>
          <div className="flex flex-col gap-2 overflow-y-auto">
            {songs.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between bg-stone-900 rounded-2xl py-3 px-4 flex-shrink-0"
              >
                <div className="flex items-center gap-3">
                  {s.image_url ? (
                    <img
                      src={s.image_url}
                      alt={s.artist}
                      className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-stone-700 flex-shrink-0" />
                  )}
                  <div className="flex flex-col">
                    <span className="font-bold text-white text-sm">{s.title}</span>
                    <span className="text-stone-500 text-xs">{s.artist}</span>
                  </div>
                </div>
                {s.performance_time && (
                  <span className="text-stone-500 text-xs whitespace-nowrap">
                    {new Date(s.performance_time).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}