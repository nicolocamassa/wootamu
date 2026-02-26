// /api/create-room/route.ts
import { prisma } from "@/_lib/prisma";
import { pusher } from "@/_lib/pusher";
import { randomUUID } from "crypto";
export async function POST(req: Request) {
  try {
    const userToken = req.headers.get("Authorization")?.replace("Bearer ", "");
    const { code, name } = await req.json();
    if (!userToken || !code) return new Response(JSON.stringify({ error: "Dati mancanti" }), { status: 400 });
    let profile;
    if (userToken.startsWith("profile_")) profile = await prisma.profile.findUnique({ where: { id: parseInt(userToken.replace("profile_", "")) } });
    else { const m = await prisma.roomMember.findUnique({ where: { userToken }, include: { profile: true } }); profile = m?.profile ?? null; }
    if (!profile) return new Response(JSON.stringify({ error: "Profilo non trovato" }), { status: 404 });
    let room = await prisma.room.findUnique({ where: { code } });
    if (!room) room = await prisma.room.create({ data: { code, name: name ?? null } });
    let member = await prisma.roomMember.findUnique({ where: { room_id_profile_id: { room_id: room.id, profile_id: profile.id } } });
    if (!member) member = await prisma.roomMember.create({ data: { room_id: room.id, profile_id: profile.id, isHost: true, userToken: randomUUID() } });
    await pusher.trigger("festival", "room-update", { roomCode: code });
    return new Response(JSON.stringify({ room, userToken: member.userToken }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) { console.error(err); return new Response(JSON.stringify({ error: "Errore server" }), { status: 500 }); }
}