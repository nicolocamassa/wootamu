import { prisma } from "@/_lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const songId = parseInt(searchParams.get("songId") || "");
    const roomCode = searchParams.get("roomCode");

    if (!songId || !roomCode) {
      return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
    }

    const room = await prisma.room.findUnique({ where: { code: roomCode } });
    if (!room) return NextResponse.json({ error: "Stanza non trovata" }, { status: 404 });

    const comments = await prisma.comment.findMany({
      where: { song_id: songId, room_id: room.id },
      include: { user: true },
      orderBy: { created_at: "asc" },
    });

    return NextResponse.json(comments);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}