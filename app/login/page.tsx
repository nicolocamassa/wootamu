"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [nickname, setNickname] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pending, setPending] = useState(false);
  const [pendingNickname, setPendingNickname] = useState("");
  const pollingRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Polling quando in attesa di approvazione
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

  if (pending) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-black text-white text-center">
        <div className="text-5xl mb-6">⏳</div>
        <h1 className="text-2xl font-bold mb-2">Richiesta inviata</h1>
        <p className="text-stone-400 text-sm max-w-xs">
          La tua registrazione è in attesa di approvazione. Attendi che l'amministratore ti accetti.
        </p>
        <div className="flex gap-1 mt-6">
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
          <span className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
        </div>
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
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6 bg-black text-white">
      <h1 className="text-3xl font-bold mb-2">Wootamu</h1>
      <p className="text-stone-500 text-sm mb-1 text-center">
        Prima volta? Scegli un nickname e un PIN.
      </p>
      <p className="text-stone-600 text-xs mb-8 text-center">
        Già registrato? Inserisci le stesse credenziali per rientrare.
      </p>

      <div className="w-full max-w-sm flex flex-col gap-3">
        <input
          type="text"
          placeholder="Nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full p-3 rounded-xl bg-stone-900 border border-stone-700 text-white"
        />
        <input
          type="password"
          placeholder="PIN (4 cifre)"
          maxLength={4}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
          className="w-full p-3 rounded-xl bg-stone-900 border border-stone-700 text-white"
        />

        {error && <p className="text-red-400 text-sm text-center">{error}</p>}

        <button
          onClick={handleAccess}
          disabled={loading || !nickname || pin.length < 4}
          className="w-full py-3 rounded-xl font-bold text-white disabled:opacity-40 mt-1"
          style={{ background: "linear-gradient(90deg, #1d4ed8, #1e40af)" }}
        >
          {loading ? "Accesso..." : "Entra"}
        </button>
      </div>
    </div>
  );
}