import { prisma } from "@/_lib/prisma";
import { pusher } from "@/_lib/pusher";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const userToken = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { code, event } = await req.json();

    if (!userToken || !code) {
      return new Response(JSON.stringify({ error: "Dati mancanti" }), { status: 400 });
    }

    // Ricava il profilo dal token
    let profile;
    if (userToken.startsWith("profile_")) {
      const profileId = parseInt(userToken.replace("profile_", ""));
      profile = await prisma.profile.findUnique({ where: { id: profileId } });
    } else {
      const existingUser = await prisma.user.findUnique({
        where: { userToken },
        include: { profile: true },
      });
      profile = existingUser?.profile;
    }

    if (!profile) {
      return new Response(JSON.stringify({ error: "Profilo non trovato" }), { status: 404 });
    }

    // Cerca o crea la stanza
    let room = await prisma.room.findUnique({ where: { code } });
    if (!room) {
      room = await prisma.room.create({
        data: { code, event, current_status: "waiting_players" },
      });
    }

    // Cerca o crea l'utente nella stanza
    let user = await prisma.user.findFirst({
      where: { profile_id: profile.id, room_id: room.id },
    });

    if (!user) {
      user = await prisma.user.create({
        data: {
          username: profile.username,
          isHost: true,
          userToken: randomUUID(),
          room_id: room.id,
          profile_id: profile.id,
        },
      });
    }

    await pusher.trigger("festival", "room-update", { roomCode: code });

    return new Response(JSON.stringify({ room, userToken: user.userToken }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Errore server" }), { status: 500 });
  }
}