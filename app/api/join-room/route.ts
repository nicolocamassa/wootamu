// /api/join-room/route.ts
import { prisma } from "@/_lib/prisma";
import { pusher } from "@/_lib/pusher";
import { randomUUID } from "crypto";
export async function POST(req: Request) {
  try {
    const userToken = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { code } = await req.json();
    if (!userToken || !code) return new Response(JSON.stringify({ error: "Dati mancanti" }), { status: 400 });
    let profile;
    if (userToken.startsWith("profile_")) {
      profile = await prisma.profile.findUnique({ where: { id: parseInt(userToken.replace("profile_", "")) } });
    } else {
      const m = await prisma.roomMember.findUnique({ where: { userToken }, include: { profile: true } });
      profile = m?.profile ?? null;
    }
    if (!profile) return new Response(JSON.stringify({ error: "Profilo non trovato" }), { status: 404 });
    const room = await prisma.room.findUnique({ where: { code } });
    if (!room) return new Response(JSON.stringify({ error: "Stanza non trovata" }), { status: 404 });
    let member = await prisma.roomMember.findUnique({ where: { room_id_profile_id: { room_id: room.id, profile_id: profile.id } } });
    const isNew = !member;
    if (!member) member = await prisma.roomMember.create({ data: { room_id: room.id, profile_id: profile.id, isHost: false, userToken: randomUUID() } });
    await pusher.trigger("festival", "room-update", { roomCode: code });
    if (isNew) await pusher.trigger("festival", "room-notification", { roomCode: code, type: "join", text: `${profile.username} è entrato nella stanza 👋` });
    return new Response(JSON.stringify({ room, userToken: member.userToken }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) { console.error(err); return new Response(JSON.stringify({ error: "Errore server" }), { status: 500 }); }
}