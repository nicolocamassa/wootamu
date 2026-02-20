"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Button from "@/_components/Button";

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
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem("userToken");
    if (!token) {
      router.push("/login");
      return;
    }
    setUserToken(token);
  }, []);

  const handleCreateRoom = async () => {
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

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-black text-white">
      <h1 className="text-3xl font-bold mb-8">Crea una stanza</h1>

      <div className="w-full max-w-sm flex flex-col gap-3">
        <p className="text-stone-500 text-sm text-center">
          Codice stanza: <strong className="text-white">{code}</strong>
        </p>
        <input
          type="text"
          placeholder="Nome evento (opzionale)"
          value={eventName}
          onChange={(e) => setEventName(e.target.value)}
          className="w-full p-3 rounded-xl bg-stone-900 border border-stone-700 text-white"
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <Button
          onClick={handleCreateRoom}
          disabled={loading}
        >
          {loading ? "Creazione in corso..." : "Crea stanza"}
        </Button>
      </div>
    </div>
  );
}