"use client";
import Button from "@/_components/Button";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Room = {
  code: string;
  event: string | null;
  isHost: boolean;
  userToken: string;
  usersCount?: number;
};

export default function Home() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loggedNickname, setLoggedNickname] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const fetchRooms = async (token: string) => {
    try {
      const res = await fetch("/api/my-rooms", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setRooms(data.rooms ?? []);
      if (data.nickname) setLoggedNickname(data.nickname);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const userToken = localStorage.getItem("userToken");
    if (!userToken) {
      router.push("/login");
      return;
    }
    fetchRooms(userToken);
  }, []);

  const handleRoomClick = (room: Room) => {
    localStorage.setItem("userToken", room.userToken);
    router.push(`/room/${room.code}`);
  };

  const handleLogout = () => {
    localStorage.removeItem("userToken");
    router.push("/login");
  };

  if (loading) return null;

  return (
  <div
    className="flex flex-col px-5 text-white overflow-hidden"
    style={{ height: "100dvh" }}
  >
    {/* Header */}
    <div className="flex items-center justify-between h-14 flex-shrink-0">
      <h1 className="font-bold text-xl">Wootamu</h1>
      {loggedNickname && (
        <button
          onClick={handleLogout}
          className="text-xs text-stone-600 hover:text-stone-400"
        >
          Esci
        </button>
      )}
    </div>

    {/* Saluto */}
    {loggedNickname && (
      <p className="text-stone-400 text-sm mb-4 flex-shrink-0">
        Ciao, <span className="text-white font-bold">{loggedNickname}</span>
      </p>
    )}

    {/* Contenuto centrale */}
    <div className="flex-1 overflow-y-auto min-h-0">
      {rooms.length > 0 ? (
        <div className="flex flex-col gap-3 pb-4">
          {rooms.map((r) => (
            <button
              key={r.code}
              onClick={() => handleRoomClick(r)}
              className="w-full text-left rounded-3xl p-5 transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg, #0d1b4b 0%, #1a1a6e 50%, #0d3b6e 100%)",
              }}
            >
              <div className="flex items-start justify-between mb-3">
                <h3 className="font-black text-white text-xl leading-tight">
                  {r.event || "Senza nome"}
                </h3>
                {r.isHost && (
                  <span className="text-xs bg-white/10 text-white px-2 py-0.5 rounded-full flex-shrink-0 ml-2">
                    Host
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3 text-xs text-stone-400">
                {r.usersCount !== undefined && (
                  <span>{r.usersCount} utenti</span>
                )}
                <span>Stanza: {r.code}</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center h-full text-center">
          <p className="text-white font-black text-2xl mb-2">
            Non sei in nessun party
          </p>
          <p className="text-stone-500 text-sm max-w-xs">
            Qui troverai tutti i party a cui ti sei unito anche per le prossime giornate.
          </p>
        </div>
      )}
    </div>

    {/* Bottoni in basso */}
    <div className="flex flex-col gap-2 pb-8 pt-4 flex-shrink-0 text-center">
      <Button href="/join-room">Entra in un party</Button>
      <Button href="/create-room" color="secondary">Crea un nuovo party</Button>
    </div>
  </div>
);
}