"use client";
import { useState, useEffect } from "react";
import CurrentEvent from "./CurrentEvent";
import SongList from "./SongList";
import InteractBox from "./InteractBox";
import Header from "./Header";
import { pusherClient } from "@/_lib/pusherClient";

type Vote = {
  id: number;
  user_id: number;
  value: number;
};

type Song = {
  id: number;
  title: string;
  artist: string;
  votes: Vote[];
};

type User = {
  id: number;
  username: string;
  isHost: boolean;
  userToken: string;
};

type Room = {
  code: string;
  users: User[];
  songs: Song[];
};

type StatusType =
  | "attesa"
  | "presentazione"
  | "esibizione"
  | "votazione"
  | "spot"
  | "pausa"
  | "fine";

export default function RoomClient({ roomCode }: { roomCode: string }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [votedUserIds, setVotedUserIds] = useState<number[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [festivalType, setFestivalType] = useState<StatusType | null>(null);
  const [currentSongId, setCurrentSongId] = useState<number | null>(null);
  const [hasCommented, setHasCommented] = useState(false);

  const userToken =
    typeof window !== "undefined" ? localStorage.getItem("userToken") : null;

  const fetchRoom = async () => {
    try {
      if (!userToken) return;
      const res = await fetch(`/api/get-room?code=${roomCode}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (!res.ok) throw new Error("Errore caricamento stanza");
      const data = await res.json();
      setRoom(data.room);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchRoom();

    const channel = pusherClient.subscribe("festival");

    const handleRoomUpdate = ({ roomCode: updatedCode }: { roomCode: string }) => {
      if (updatedCode === roomCode) fetchRoom();
    };

    channel.bind("room-update", handleRoomUpdate);

    return () => {
      channel.unbind("room-update", handleRoomUpdate); // unbind solo questo evento
    };
  }, [roomCode]);

  useEffect(() => {
    setHasCommented(false);
  }, [currentSongId]);

  if (!room) return <p>Caricamento stanza...</p>;
  if (!userToken) return <p>Errore: token non trovato</p>;

  const currentUser = room.users.find((u) => u.userToken === userToken);

  return (
    <div>
      <Header isRoom usersCount={room.users.length} festivalType={festivalType} />
      <CurrentEvent
        festivalType={festivalType}
        songId={currentSongId}
        roomCode={roomCode}
        userToken={userToken}
        onCommentSent={() => setHasCommented(true)}
        hasCommented={hasCommented}
      />
      <SongList roomCode={roomCode} currentSongId={currentSongId} />

      <div className="flex gap-2 text-xs my-3 text-stone-500 items-center">
        <span>Stanza: {room.code}</span>
        <div className="w-px bg-stone-500 h-3"></div>
        <ul className="flex gap-1 flex-wrap">
          {room.users.map((u, i) => (
            <li key={u.id} className="flex items-center gap-1">
              <span className={u.userToken === userToken ? "font-bold text-stone-400" : ""}>
                {u.username}{u.isHost ? " (Host)" : ""}
              </span>
              {!showResults && votedUserIds.includes(u.id) && (
                <span className="text-green-400">✓</span>
              )}
              {i < room.users.length - 1 && <span>,</span>}
            </li>
          ))}
        </ul>
      </div>

      <InteractBox
        roomCode={room.code}
        currentUser={currentUser}
        users={room.users}
        userToken={userToken}
        onVotedUsersChange={setVotedUserIds}
        onShowResults={setShowResults}
        onFestivalTypeChange={(type) => setFestivalType(type as StatusType)}
        onSongIdChange={setCurrentSongId}
      />
    </div>
  );
}