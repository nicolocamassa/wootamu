"use client";

import { useState, useEffect, useRef } from "react";
import CurrentEvent from "./CurrentEvent";
import SongList from "./SongList";
import InteractBox from "./InteractBox";
import Header from "./Header";
import { festivalChannel } from "@/_lib/pusherClient";
import type { Room, User, UserRoom, Vote } from "./types";

type StatusType = "attesa" | "presentazione" | "esibizione" | "votazione" | "spot" | "pausa" | "fine";

function membersToUsers(members: Room["members"]): User[] {
  return members.map((m) => ({
    id: m.id,
    profile_id: m.profile_id,
    username: m.profile.username,
    isHost: m.isHost,
    userToken: m.userToken,
  }));
}

export default function RoomClient({ roomCode }: { roomCode: string }) {
  const [room, setRoom] = useState<Room | null>(null);
  const [userToken, setUserToken] = useState<string | null>(null);
  const [userRooms, setUserRooms] = useState<UserRoom[]>([]);
  const [currentNight, setCurrentNight] = useState<number | null>(null);

  const [votedProfileIds, setVotedProfileIds] = useState<number[]>([]);
  const [currentVotes, setCurrentVotes] = useState<Vote[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [festivalType, setFestivalType] = useState<StatusType | null>(null);
  const [currentSongId, setCurrentSongId] = useState<number | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [hasCommented, setHasCommented] = useState(false);

  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setUserToken(localStorage.getItem("userToken"));
  }, []);

  const fetchRoom = async () => {
    const token = localStorage.getItem("userToken");
    if (!token) return;
    try {
      const res = await fetch(`/api/get-room?code=${roomCode}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      setRoom(data.room);
      if (data.room?.night != null) setCurrentNight(data.room.night);
      if (data.userRooms) setUserRooms(data.userRooms);
    } catch (err) {
      console.error("[fetchRoom]", err);
    }
  };

  useEffect(() => {
    if (!userToken) return;
    fetchRoom();
    pollingRef.current = setInterval(fetchRoom, 10000);
    const onVisibility = () => { if (document.visibilityState === "visible") fetchRoom(); };
    document.addEventListener("visibilitychange", onVisibility);
    const onRoomUpdate = ({ roomCode: rc }: { roomCode: string }) => { if (rc === roomCode) fetchRoom(); };
    festivalChannel.bind("room-update", onRoomUpdate);

    // Ascolta night-update da Pusher — aggiorna subito senza aspettare il polling
    const onNightUpdate = ({ night }: { night: number }) => {
      setCurrentNight(night);
    };
    festivalChannel.bind("night-update", onNightUpdate);

    return () => {
      festivalChannel.unbind("room-update", onRoomUpdate);
      festivalChannel.unbind("night-update", onNightUpdate);
      document.removeEventListener("visibilitychange", onVisibility);
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [userToken, roomCode]);

  useEffect(() => {
    setHasCommented(false);
    setCurrentVotes([]);
    setHasVoted(false);
  }, [currentSongId]);

  if (!userToken) return <p>Caricamento...</p>;
  if (!room) return <p>Caricamento stanza...</p>;

  const users = membersToUsers(room.members);

  const currentMember = room.members.find((m) => m.userToken === userToken);
  const currentUser: User | undefined = currentMember
    ? {
        id: currentMember.id,
        profile_id: currentMember.profile_id,
        username: currentMember.profile.username,
        isHost: currentMember.isHost,
        userToken: currentMember.userToken,
      }
    : undefined;

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <div style={{ flexShrink: 0 }}>
        <Header isRoom usersCount={room.members.length} festivalType={festivalType} />

        <div style={{ marginBottom: 2 }}>
          <CurrentEvent
            festivalType={festivalType}
            songId={currentSongId}
            roomCode={room.code}
            userToken={userToken}
            onCommentSent={() => setHasCommented(true)}
            hasCommented={hasCommented}
            users={users}
            votes={currentVotes}
            currentUser={currentUser}
            hasVoted={hasVoted}
          />
        </div>

        <SongList roomCode={roomCode} currentSongId={currentSongId} night={currentNight} />

        {/* Barra utenti */}
        <div
          className="flex items-center gap-3 my-4 overflow-x-auto"
          style={{ scrollbarWidth: "none" }}
        >
          <span className="text-stone-600 text-xs font-bold bg-stone-900 px-2.5 py-1 rounded-full flex-shrink-0">
            <span className="text-stone-600 text-xs font-normal mr-0.5">Stanza:</span>
            <span>{room.code}</span>
          </span>
          <div className="w-px h-3 bg-stone-800 flex-shrink-0" />
          <div className="flex gap-2 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
            {users.map((u) => {
              const isMe = u.userToken === userToken;
              const hasVotedU = votedProfileIds.includes(u.profile_id);
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
                      background: hasVotedU ? "rgb(134,239,172)" : isMe ? "rgba(255,255,255,0.3)" : "rgba(255,255,255,0.1)",
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
          users={users}
          userToken={userToken}
          onVotedUsersChange={setVotedProfileIds}
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