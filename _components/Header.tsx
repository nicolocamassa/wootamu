"use client";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { pusherClient } from "@/_lib/pusherClient";
import { Radio } from "lucide-react";

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

const STATUS_COLORS: Record<StatusType, string> = {
  attesa: "bg-stone-800 text-stone-400",
  presentazione: "bg-blue-500/20 text-blue-400",
  esibizione: "bg-green-500/20 text-green-400",
  votazione: "bg-purple-500/20 text-purple-400",
  spot: "bg-yellow-500/20 text-yellow-400",
  pausa: "bg-stone-800 text-stone-400",
  fine: "bg-stone-800 text-stone-400",
};

const LIVE_STATES: StatusType[] = ["presentazione", "esibizione", "votazione", "spot", "pausa"];

type HeaderProps = {
  // Props opzionali per la room
  isRoom?: boolean;
  usersCount?: number;
  festivalType?: StatusType | null;
};

export default function Header({ isRoom, usersCount, festivalType: festivalTypeProp }: HeaderProps) {
  const [festivalType, setFestivalType] = useState<StatusType | null>(festivalTypeProp ?? null);
  const pathname = usePathname();

  // Nasconde l'header nella room (la room ha il suo)
  const isRoomPage = pathname?.startsWith("/room/");

  useEffect(() => {
    if (isRoom) return; // la room gestisce da sola

    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/festival-status");
        const data = await res.json();
        setFestivalType(data.type ?? null);
      } catch (err) {
        console.error(err);
      }
    };

    fetchStatus();

    const channel = pusherClient.subscribe("festival");
    const handleUpdate = (data: { type: StatusType }) => setFestivalType(data.type);
    channel.bind("status-update", handleUpdate);

    return () => {
      channel.unbind("status-update", handleUpdate);
    };
  }, []);

  // Nella room usa i dati passati come prop
  const type = isRoom ? festivalTypeProp ?? null : festivalType;
  const isLive = type ? LIVE_STATES.includes(type) : false;

  if (isRoomPage && !isRoom) return null; // evita doppio header nella room

  return (
    <header className="w-full h-14 flex items-center justify-between px-3">
      <h1 className="font-bold text-xl">Wootamu</h1>
      <div className="flex items-center gap-2 text-sm">
        {isRoom ? (
          // Header room: Live + utenti
          <>
            {isLive ? (
              <span className="bg-red-500/35 text-red-500 rounded-full px-2 py-0.5 flex items-center gap-1 text-xs">
                <Radio size={12} />
                Live
              </span>
            ) : (
              <span className="bg-stone-800 text-stone-400 rounded-full px-2 py-0.5 text-xs">
                {type ? STATUS_LABELS[type] : "A breve"}
              </span>
            )}
            {usersCount !== undefined && (
              <span className="px-2 py-0.5 bg-stone-900 rounded-full text-stone-400 text-xs">
                {usersCount} online
              </span>
            )}
          </>
        ) : (
          // Header globale: solo badge stato
          type && (
            <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[type]}`}>
              {STATUS_LABELS[type]}
            </span>
          )
        )}
      </div>
    </header>
  );
}