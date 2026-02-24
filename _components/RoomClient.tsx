"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import CurrentEvent from "./CurrentEvent";
import SongList from "./SongList";
import InteractBox from "./InteractBox";
import Header from "./Header";
import { festivalChannel } from "@/_lib/pusherClient";

type Vote = { id: number; user_id: number; value: number };
type UserRoom = { code: string; id: number; event: string | null; userToken: string };
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
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userRooms, setUserRooms] = useState<UserRoom[]>([]);

  const topRef = useRef<HTMLDivElement>(null);

  // Leggi il token una volta sola
  useEffect(() => {
    setUserToken(localStorage.getItem("userToken"));
  }, []);

  // Misura altezza blocco superiore
  useEffect(() => {
    const el = topRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {});
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // FIX: useCallback per referenza stabile — non cambia ad ogni render
  // evita il ciclo unbind/rebind in CurrentEvent e nel proprio useEffect
  const fetchRoom = useCallback(async () => {
    const token = localStorage.getItem("userToken");
    if (!token) return;
    try {
      const res = await fetch(`/api/get-room?code=${roomCode}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      setRoom(data.room);
      if (data.userRooms) setUserRooms(data.userRooms);
    } catch (err) {
      console.error("[fetchRoom] errore:", err);
    }
  }, [roomCode]);

  // Fetch iniziale + Pusher — usa festivalChannel condiviso, non risottoscrive
  useEffect(() => {
    if (!userToken) return;

    fetchRoom();

    const handleRoomUpdate = ({ roomCode: updatedCode }: { roomCode: string }) => {
      if (updatedCode === roomCode) fetchRoom();
    };

    // FIX: usa il canale condiviso già sottoscritto, non ne crea uno nuovo
    festivalChannel.bind("room-update", handleRoomUpdate);

    return () => {
      festivalChannel.unbind("room-update", handleRoomUpdate);
    };
  }, [userToken, roomCode]);

  useEffect(() => {
    setHasCommented(false);
    setCurrentVotes([]);
    setHasVoted(false);
  }, [currentSongId]);

  if (!userToken) return <p>Caricamento...</p>;
  if (!room) return <p>Caricamento stanza...</p>;

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
            onUserJoined={fetchRoom}
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
                      background: hasVotedU
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
          userRooms={userRooms}
        />
      </div>
    </div>
  );
}