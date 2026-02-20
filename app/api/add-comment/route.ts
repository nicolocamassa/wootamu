import { prisma } from "@/_lib/prisma";
import { pusher } from "@/_lib/pusher";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { text, songId, roomCode, userToken } = await req.json();

    if (!text || !songId || !roomCode || !userToken) {
      return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { userToken } });
    if (!user) return NextResponse.json({ error: "Utente non trovato" }, { status: 404 });

    const room = await prisma.room.findUnique({ where: { code: roomCode } });
    if (!room) return NextResponse.json({ error: "Stanza non trovata" }, { status: 404 });

    const existing = await prisma.comment.findFirst({
      where: { user_id: user.id, song_id: songId, room_id: room.id },
    });
    if (existing) {
      return NextResponse.json({ error: "Hai già commentato" }, { status: 400 });
    }

    const comment = await prisma.comment.create({
      data: {
        text,
        user_id: user.id,
        song_id: songId,
        room_id: room.id,
      },
      include: { user: true },
    });

    // Notifica tutti i client connessi
    await pusher.trigger("festival", "comment-update", { songId, roomCode });

    return NextResponse.json(comment);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}