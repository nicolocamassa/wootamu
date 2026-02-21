"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Lottie from "lottie-react";
import waitingAnimation from "../../public/waiting.json";
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

export default function LoginPage() {
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [pendingNickname, setPendingNickname] = useState("");
  const [songs, setSongs] = useState<Song[]>([]);
  const [festivalType, setFestivalType] = useState<StatusType | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  useEffect(() => {
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

  useEffect(() => {
    if (!pending || !pendingNickname) return;

    pollingRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/login?nickname=${encodeURIComponent(pendingNickname)}`);
        const data = await res.json();
        if (data.approved) {
          clearInterval(pollingRef.current!);
          localStorage.setItem("userToken", data.userToken);
          router.push("/");
        }
      } catch (err) {
        console.error(err);
      }
    }, 3000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [pending, pendingNickname]);

  const handleAccess = async () => {
    if (!nickname || pin.length < 4) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nickname, pin }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Errore");
        return;
      }

      if (data.pending) {
        setPendingNickname(nickname);
        setPending(true);
        return;
      }

      localStorage.setItem("userToken", data.userToken);
      router.push("/");
    } catch (err) {
      console.error(err);
      setError("Errore di connessione");
    } finally {
      setLoading(false);
    }
  };

  const isLive = festivalType ? LIVE_STATES.includes(festivalType) : false;

  if (pending) {
    return (
      <div className="flex flex-col overflow-hidden" style={{ height: "100dvh" }}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-14 flex-shrink-0">
          <h1 className="font-bold text-xl text-white">Wootamu</h1>
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

        <div className="flex flex-col items-center justify-center flex-1 px-6 text-white text-center">
          <Lottie animationData={waitingAnimation} loop className="w-18 h-18" />
          <h1 className="text-2xl font-bold my-2">Richiesta inviata</h1>
          <p className="text-stone-400 text-sm max-w-xs">
            Ti sei registrato ma adesso il grande capo ti deve accettare.
          </p>
          <button
            onClick={() => {
              setPending(false);
              if (pollingRef.current) clearInterval(pollingRef.current);
            }}
            className="mt-8 text-stone-600 text-xs underline"
          >
            Torna al login
          </button>
        </div>
      </div>
    );
  }

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

      {/* Login centrato */}
      <div className="flex flex-col items-center justify-center flex-shrink-0 px-5 py-6">
        <h1 className="text-3xl font-black mb-2 text-center">Welcome mbà</h1>
        <p className="text-stone-500 text-sm mb-1 text-center">
          Scegli un nuovo nickname e un PIN.
        </p>
        <p className="text-stone-600 text-xs mb-6 text-center">
          L'hai fatto già l'altra volta? Metti nickname e PIN dell'altra volta.
        </p>

        <div className="flex flex-col gap-3 w-full">
          <input
            type="text"
            placeholder="Nickname"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            className="w-full p-3 rounded-2xl bg-transparent border border-stone-700 text-white placeholder-stone-600"
          />
          <input
            type="password"
            placeholder="PIN (4 cifre)"
            maxLength={4}
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
            className="w-full p-3 rounded-2xl bg-transparent border border-stone-700 text-white placeholder-stone-600"
          />
          {error && <p className="text-red-400 text-sm text-center">{error}</p>}
          <button
            onClick={handleAccess}
            disabled={loading || !nickname || pin.length < 4}
            className="w-full py-3 rounded-2xl font-bold text-white bg-active-button disabled:bg-disabled-button mt-1"
          >
            {loading ? "Accesso..." : "Trasi"}
          </button>
        </div>
      </div>

      {/* Lista canzoni — scorre solo questa */}
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