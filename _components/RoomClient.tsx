"use client";
import { useState, useEffect, useRef } from "react";
import CurrentEvent from "./CurrentEvent";
import SongList from "./SongList";
import InteractBox from "./InteractBox";
import Header from "./Header";
import { pusherClient } from "@/_lib/pusherClient";

type Vote = { id: number; user_id: number; value: number };
type Song = { id: number; title: string; artist: string; votes: Vote[] };
type User = { id: number; username: string; isHost: boolean; userToken: string };
type Room = { code: string; users: User[]; songs: Song[] };
type StatusType = "attesa" | "presentazione" | "esibizione" | "votazione" | "spot" | "pausa" | "fine";

export default function RoomClient({ roomCode }: { roomCode: string }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [votedUserIds, setVotedUserIds] = useState<number[]>([]);
  const [currentVotes, setCurrentVotes] = useState<Vote[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [festivalType, setFestivalType] = useState<StatusType | null>(null);
  const [currentSongId, setCurrentSongId] = useState<number | null>(null);
  const [hasCommented, setHasCommented] = useState(false);
  const [hasVoted, setHasVoted] = useState(false);

  const topRef = useRef<HTMLDivElement>(null);
  const [topHeight, setTopHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = topRef.current;
    if (!el) return;
    const update = () => setTopHeight(el.getBoundingClientRect().bottom);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const userToken = typeof window !== "undefined" ? localStorage.getItem("userToken") : null;

  const fetchRoom = async () => {
    try {
      if (!userToken) return;
      const res = await fetch(`/api/get-room?code=${roomCode}`, {
        headers: { Authorization: `Bearer ${userToken}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRoom(data.room);
    } catch (err) { console.error(err); }
  };

  useEffect(() => {
    fetchRoom();
    const channel = pusherClient.subscribe("festival");
    const handleRoomUpdate = ({ roomCode: updatedCode }: { roomCode: string }) => {
      if (updatedCode === roomCode) fetchRoom();
    };
    channel.bind("room-update", handleRoomUpdate);
    return () => { channel.unbind("room-update", handleRoomUpdate); };
  }, [roomCode]);

  useEffect(() => {
    setHasCommented(false);
    setCurrentVotes([]);
    setHasVoted(false);
  }, [currentSongId]);

  if (!room) return <p>Caricamento stanza...</p>;
  if (!userToken) return <p>Errore: token non trovato</p>;

  const currentUser = room.users.find((u) => u.userToken === userToken);

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div ref={topRef} style={{ flexShrink: 0 }}>
        <Header isRoom usersCount={room.users.length} festivalType={festivalType} />

        <div style={{ padding: "0 0px", marginBottom: 2 }}>
          <CurrentEvent
            festivalType={festivalType}
            songId={currentSongId}
            roomCode={room.code}
            userToken={userToken}
            onCommentSent={() => setHasCommented(true)}
            hasCommented={hasCommented}
            users={room.users}
            votes={currentVotes}
            currentUser={currentUser}
            hasVoted={hasVoted}
          />
        </div>

        <SongList roomCode={roomCode} currentSongId={currentSongId} />

        <div className="flex items-center gap-3 my-4 overflow-x-auto" style={{ scrollbarWidth: "none", paddingLeft: 0, paddingRight: 0 }}>
          <span className="text-stone-600 text-xs font-bold bg-stone-900 px-2.5 py-1 rounded-full flex-shrink-0">
            <span className="text-stone-600 text-xs font-normal mr-0.5">Stanza:</span>
            <span>{room.code}</span>
          </span>
          <div className="w-px h-3 bg-stone-800 flex-shrink-0" />
          <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {room.users.map((u) => {
              const isMe = u.userToken === userToken;
              const hasVotedU = votedUserIds.includes(u.id);
              return (
                <div
                  key={u.id}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs flex-shrink-0"
                  style={{
                    background: isMe ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.03)",
                    border: isMe ? "1px solid rgba(255,255,255,0.12)" : "1px solid rgba(255,255,255,0.06)",
                  }}
                >
                  <span
                    className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                    style={{
                      background: hasVotedU && !showResults
                        ? "rgb(134,239,172)"
                        : isMe ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
                    }}
                  />
                  <span className={isMe ? "text-white font-bold" : "text-stone-400"}>{u.username}</span>
                  {u.isHost && <span className="text-stone-600">host</span>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, padding: "0 0 24px", display: "flex", flexDirection: "column" }}>
        <InteractBox
          roomCode={room.code}
          currentUser={currentUser}
          users={room.users}
          userToken={userToken}
          onVotedUsersChange={setVotedUserIds}
          onShowResults={setShowResults}
          onFestivalTypeChange={(type) => setFestivalType(type as StatusType)}
          onSongIdChange={setCurrentSongId}
          onVotesChange={setCurrentVotes}
          onHasVotedChange={setHasVoted}
        />
      </div>
    </div>
  );
}