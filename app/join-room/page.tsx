"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function JoinRoom() {
  const [code, setCode] = useState("");
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

  const handleJoin = async () => {
    if (!code || !userToken) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/join-room", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${userToken}`,
        },
        body: JSON.stringify({ code }),
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
      <h1 className="text-3xl font-bold mb-8">Unisciti alla stanza</h1>

      <div className="w-full max-w-sm flex flex-col gap-3">
        <input
          type="text"
          placeholder="Codice stanza"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          className="w-full p-3 rounded-xl bg-stone-900 border border-stone-700 text-white"
        />

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <button
          onClick={handleJoin}
          disabled={loading || !code}
          className="w-full py-3 rounded-xl bg-blue-600 font-bold disabled:opacity-40"
        >
          {loading ? "Connessione..." : "Entra"}
        </button>
      </div>
    </div>
  );
}