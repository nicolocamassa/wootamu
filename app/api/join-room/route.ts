import { prisma } from "@/_lib/prisma";
import { pusher } from "@/_lib/pusher";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  try {
    const userToken = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { code } = await req.json();

    if (!userToken || !code) {
      return new Response(JSON.stringify({ error: "Dati mancanti" }), { status: 400 });
    }

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

    const room = await prisma.room.findUnique({ where: { code } });
    if (!room) {
      return new Response(JSON.stringify({ error: "Stanza non trovata" }), { status: 404 });
    }

    let user = await prisma.user.findFirst({
      where: { profile_id: profile.id, room_id: room.id },
    });

    const isNewUser = !user;

    if (!user) {
      user = await prisma.user.create({
        data: {
          username: profile.username,
          isHost: false,
          userToken: randomUUID(),
          room_id: room.id,
          profile_id: profile.id,
        },
      });
    }

    // Aggiorna la lista utenti nella stanza per tutti
    await pusher.trigger("festival", "room-update", { roomCode: code });

    // Notifica visibile in CurrentEvent solo se è un nuovo ingresso
    if (isNewUser) {
      await pusher.trigger("festival", "room-notification", {
        roomCode: code,
        type: "join",
        text: `${profile.username} è entrato nella stanza 👋`,
      });
    }

    return new Response(JSON.stringify({ room, userToken: user.userToken }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("[join-room] errore:", err);
    return new Response(JSON.stringify({ error: "Errore server" }), { status: 500 });
  }
}