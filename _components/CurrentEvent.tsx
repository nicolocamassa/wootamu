"use client";
import { useState } from "react";
import { SendHorizonal } from "lucide-react";

type CurrentEventProps = {
  festivalType: string | null;
  songId: number | null;
  roomCode: string;
  userToken: string | null;
  onCommentSent: () => void;
  hasCommented: boolean;
};

export default function CurrentEvent({
  festivalType,
  songId,
  roomCode,
  userToken,
  onCommentSent,
  hasCommented,
}: CurrentEventProps) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  const canComment = festivalType === "esibizione" && !!songId && !hasCommented;

  const handleSubmit = async () => {
    if (!text.trim() || !canComment || !userToken) return;
    setLoading(true);
    try {
      const res = await fetch("/api/add-comment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), songId, roomCode, userToken }),
      });
      if (!res.ok) throw new Error("Errore invio commento");
      setText("");
      onCommentSent();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (festivalType !== "esibizione") {
    return (
      <div className="w-full p-5 rounded-xl border border-stone-700 flex justify-center mb-3">
        <span className="text-stone-500">In attesa della prossima esibizione</span>
      </div>
    );
  }

  return (
    <div className="w-full p-4 rounded-xl border border-stone-700 mb-3">
      {hasCommented ? (
        <p className="text-stone-500 text-sm text-center">
          Commento inviato! Aspetta il prossimo artista.
        </p>
      ) : (
        <div className="flex gap-2 items-center">
          <input
            type="text"
            maxLength={80}
            placeholder="Scrivi un commento sull'esibizione..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            className="flex-1 bg-stone-900 border border-stone-700 rounded-lg px-3 py-2 text-sm outline-none"
          />
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || loading}
            className="bg-blue-600 disabled:opacity-40 px-4 py-3 rounded-lg text-sm font-bold"
          >
            <SendHorizonal size={14} />
          </button>
        </div>
      )}
    </div>
  );
}