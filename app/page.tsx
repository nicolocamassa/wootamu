"use client";
import Button from "@/_components/Button";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Room = {
  code: string;
  event: string | null;
  isHost: boolean;
  userToken: string;
};

export default function Home() {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loggedNickname, setLoggedNickname] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const userToken = localStorage.getItem("userToken");
    if (!userToken) {
      router.push("/login");
      return;
    }

    const fetchRooms = async () => {
      try {
        const res = await fetch("/api/my-rooms", {
          headers: { Authorization: `Bearer ${userToken}` },
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

    fetchRooms();
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
    <div className="flex min-h-screen items-center justify-center">
      <main className="flex min-h-screen w-full flex-col items-center justify-end py-10 px-5 max-w-100">

        <div className="w-full mb-6">
          {loggedNickname && (
            <div className="flex items-center justify-between mb-3">
              <p className="text-stone-500 text-xs uppercase tracking-widest">
                Ciao, <span className="text-white font-bold">{loggedNickname}</span>
              </p>
              <button
                onClick={handleLogout}
                className="text-xs text-stone-600 hover:text-stone-400"
              >
                Esci
              </button>
            </div>
          )}

          {rooms.length > 0 ? (
            <div className="flex flex-col gap-2">
              {rooms.map((r) => (
                <button
                  key={r.code}
                  onClick={() => handleRoomClick(r)}
                  className="w-full flex items-center justify-between border border-stone-800 rounded-2xl px-4 py-3 text-left hover:border-stone-600 transition-colors"
                >
                  <div>
                    <p className="font-bold text-white">{r.event || "Senza nome"}</p>
                    <p className="text-stone-500 text-xs">{r.code}</p>
                  </div>
                  {r.isHost && (
                    <span className="text-xs bg-blue-600/30 text-blue-400 px-2 py-0.5 rounded-full">
                      Host
                    </span>
                  )}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-stone-600 text-sm text-center mb-4">
              Non sei ancora in nessuna stanza.
            </p>
          )}
        </div>

        <div className="flex flex-col w-full gap-2 text-center">
          <Button href="/create-room" color="secondary">
            Crea un nuovo party
          </Button>
          <Button href="/join-room">Unisciti ad un party</Button>
        </div>
      </main>
    </div>
  );
}