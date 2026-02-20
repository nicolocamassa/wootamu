"use client";
import { useState } from "react";
import Button from "@/_components/Button";

export default function VoteSlider({
  songId,
  roomCode,
  onVoteAdded,
}: {
  songId: number;
  roomCode: string;
  onVoteAdded?: (vote: any) => void;
}) {
  const [value, setValue] = useState(5); // valore iniziale
  const [loading, setLoading] = useState(false);

  const handleConfirmVote = async () => {
    const token = localStorage.getItem("userToken");
    if (!token) return alert("Utente non autenticato");

    setLoading(true);
    try {
      const res = await fetch("/api/add-vote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomCode,
          songId,
          value,
          userToken: token,
        }),
      });

      if (!res.ok) throw new Error("Errore voto");

      const data = await res.json();
      console.log("Voto aggiunto:", data.vote);
      if (onVoteAdded) onVoteAdded(data.vote);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <label>
        Vota (1-10): {value.toFixed(1)}
        <input
          type="range"
          min={1}
          max={10}
          step={0.1} // permette decimali
          value={value}
          onChange={(e) => setValue(parseFloat(e.target.value))}
        />
      </label>
      <Button onClick={handleConfirmVote} disabled={loading}>
        {loading ? "Invio..." : "Conferma"}
      </Button>
    </div>
  );
}
