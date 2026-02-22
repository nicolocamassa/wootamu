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
      router.replace("/login");
      // lascia loading: true così non renderizza nulla durante il redirect
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
      className="flex flex-col text-white"
      style={{ height: "100dvh", fontFamily: "'Inter', sans-serif" }}
    >
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap');`}</style>

      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0" style={{ padding: "0 20px", height: 56 }}>
        <h1 style={{ fontWeight: 800, fontSize: 20, letterSpacing: "-0.3px" }}>Wootamu</h1>
        {loggedNickname && (
          <button
            onClick={handleLogout}
            style={{ fontSize: 12, color: "rgba(255,255,255,0.25)", background: "none", border: "none", cursor: "pointer" }}
          >
            Esci
          </button>
        )}
      </div>

      {/* Saluto */}
      {loggedNickname && (
        <p style={{ fontSize: 13, color: "rgba(255,255,255,0.35)", padding: "0 20px", marginBottom: 20, flexShrink: 0 }}>
          Ciao, <span style={{ color: "#ededed", fontWeight: 600 }}>{loggedNickname}</span>
        </p>
      )}

      {/* Lista room */}
      <div style={{ flex: 1, overflowY: "auto", minHeight: 0, padding: "0 20px" }}>
        {rooms.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingBottom: 16 }}>
            {rooms.map((r) => (
              <button
                key={r.code}
                onClick={() => handleRoomClick(r)}
                style={{
                  width: "100%",
                  textAlign: "left",
                  background: "#0F0F14",
                  border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 16,
                  padding: "16px 16px",
                  cursor: "pointer",
                  transition: "opacity 0.15s",
                  fontFamily: "'Inter', sans-serif",
                }}
                onTouchStart={(e) => (e.currentTarget.style.opacity = "0.7")}
                onTouchEnd={(e) => (e.currentTarget.style.opacity = "1")}
              >
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
                  <h3 style={{ fontWeight: 700, fontSize: 16, color: "#ededed", lineHeight: 1.3, letterSpacing: "-0.2px" }}>
                    {r.event || "Senza nome"}
                  </h3>
                  {r.isHost && (
                    <span style={{
                      fontSize: 10,
                      fontWeight: 500,
                      color: "#D4AF37",
                      background: "rgba(212,175,55,0.1)",
                      border: "1px solid rgba(212,175,55,0.2)",
                      borderRadius: 999,
                      padding: "2px 8px",
                      flexShrink: 0,
                      marginLeft: 8,
                      letterSpacing: "0.05em",
                      textTransform: "uppercase",
                    }}>
                      Host
                    </span>
                  )}
                </div>

                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  {r.usersCount !== undefined && (
                    <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                      {r.usersCount} {r.usersCount === 1 ? "utente" : "utenti"}
                    </span>
                  )}
                  <span style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 11,
                    color: "rgba(255,255,255,0.2)",
                    background: "rgba(255,255,255,0.04)",
                    border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 6,
                    padding: "2px 7px",
                  }}>
                    {r.code}
                  </span>
                </div>
              </button>
            ))}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "100%", textAlign: "center" }}>
            <p style={{ fontWeight: 800, fontSize: 22, color: "#ededed", marginBottom: 8, letterSpacing: "-0.3px" }}>
              Non sei in nessun party
            </p>
            <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)", maxWidth: 260, lineHeight: 1.6 }}>
              Qui troverai tutti i party a cui ti sei unito anche per le prossime giornate.
            </p>
          </div>
        )}
      </div>

      {/* Bottoni in basso */}
      <div className="text-center" style={{ flexShrink: 0, padding: "16px 20px 32px", display: "flex", flexDirection: "column", gap: 8 }}>
        <Button href="/join-room">Entra in un party</Button>
        <Button href="/create-room" color="secondary">Crea un nuovo party</Button>
      </div>
    </div>
  );
}