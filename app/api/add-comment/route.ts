// /api/add-comment/route.ts
import { prisma } from "@/_lib/prisma";
import { pusher } from "@/_lib/pusher";
import { NextResponse } from "next/server";
export async function POST(req: Request) {
  try {
    const { text, songId, roomCode, userToken } = await req.json();
    if (!text || !songId || !roomCode || !userToken) return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
    let profileId: number | null = null;
    if (userToken.startsWith("profile_")) profileId = parseInt(userToken.replace("profile_", ""));
    else { const m = await prisma.roomMember.findUnique({ where: { userToken }, select: { profile_id: true } }); profileId = m?.profile_id ?? null; }
    if (!profileId) return NextResponse.json({ error: "Profilo non trovato" }, { status: 404 });
    const room = await prisma.room.findUnique({ where: { code: roomCode } });
    if (!room) return NextResponse.json({ error: "Stanza non trovata" }, { status: 404 });
    const existing = await prisma.comment.findFirst({ where: { profile_id: profileId, song_id: songId, room_id: room.id } });
    if (existing) return NextResponse.json({ error: "Hai già commentato" }, { status: 400 });
    const comment = await prisma.comment.create({
      data: { text, profile_id: profileId, song_id: songId, room_id: room.id },
      include: { profile: { select: { username: true } } },
    });
    await pusher.trigger("festival", "comment-update", { songId, roomCode });
    return NextResponse.json(comment);
  } catch (err) { console.error(err); return NextResponse.json({ error: "Errore server" }, { status: 500 }); }
}