// /api/add-vote/route.ts
import { prisma } from "@/_lib/prisma";
import { pusher } from "@/_lib/pusher";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { roomCode, songId, value, userToken } = body;

    if (!roomCode || !songId || !value || !userToken) {
      return new Response(JSON.stringify({ error: "Parametri mancanti" }), { status: 400 });
    }

    // Trova l'utente nella stanza corrente
    const userInRoom = await prisma.user.findFirst({
      where: { userToken, room: { code: roomCode } },
      include: { room: true },
    });

    if (!userInRoom) {
      return new Response(JSON.stringify({ error: "Utente non trovato in questa stanza" }), { status: 403 });
    }

    // Legge la serata attiva dalla room — null se non ancora impostata
    const currentNight = userInRoom.room.night ?? null;

    // Controlla se ha già votato questa canzone IN QUESTA SERATA
    // (permette di votare la stessa canzone in serate diverse)
    const existingVote = await prisma.vote.findFirst({
      where: {
        user_id: userInRoom.id,
        song_id: songId,
        night: currentNight,
      },
    });

    if (existingVote) {
      return new Response(JSON.stringify({ error: "Hai già votato questa canzone" }), { status: 400 });
    }

    // Salva il voto con il tag serata
    await prisma.vote.create({
      data: { value, user_id: userInRoom.id, song_id: songId, night: currentNight },
    });

    // Replica in tutte le altre stanze dello stesso profilo
    if (userInRoom.profile_id) {
      const otherInstances = await prisma.user.findMany({
        where: {
          profile_id: userInRoom.profile_id,
          NOT: { id: userInRoom.id },
        },
        include: { room: true },
      });

      for (const instance of otherInstances) {
        const instanceNight = instance.room.night ?? null;
        const alreadyVoted = await prisma.vote.findFirst({
          where: { user_id: instance.id, song_id: songId, night: instanceNight },
        });
        if (!alreadyVoted) {
          await prisma.vote.create({
            data: { value, user_id: instance.id, song_id: songId, night: instanceNight },
          });
          await pusher.trigger("festival", "vote-update", {
            songId,
            roomCode: instance.room.code,
          });
          await pusher.trigger("festival", "room-notification", {
            roomCode: instance.room.code,
            type: "vote",
            text: `${userInRoom.username} ha votato ✅`,
            voteValue: value,
            voterUserId: instance.id,
          });
        }
      }
    }

    // Notifica stanza corrente
    await pusher.trigger("festival", "vote-update", { songId, roomCode });
    await pusher.trigger("festival", "room-notification", {
      roomCode,
      type: "vote",
      text: `${userInRoom.username} ha votato ✅`,
      voteValue: value,
      voterUserId: userInRoom.id,
    });

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Errore add-vote:", err);
    return new Response(JSON.stringify({ error: "Errore interno server" }), { status: 500 });
  }
}