import { prisma } from "@/_lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const roomCode = req.nextUrl.searchParams.get("roomCode");
  if (!roomCode) return NextResponse.json([], { status: 400 });

  try {
    const room = await prisma.room.findUnique({ where: { code: roomCode } });
    if (!room) return NextResponse.json([], { status: 404 });

    // Tutti i voti degli utenti di questa stanza, con la canzone
    const votes = await prisma.vote.findMany({
      where: {
        user: { room_id: room.id },
      },
      include: {
        song: { select: { id: true, title: true, artist: true } },
      },
    });

    // Raggruppa per canzone
    const songMap = new Map<
      number,
      { id: number; title: string; artist: string; values: number[] }
    >();

    for (const vote of votes) {
      const s = vote.song;
      const existing = songMap.get(s.id);
      if (existing) {
        existing.values.push(vote.value);
      } else {
        songMap.set(s.id, { id: s.id, title: s.title, artist: s.artist, values: [vote.value] });
      }
    }

    const result = Array.from(songMap.values())
      .map((s) => ({
        id: s.id,
        title: s.title,
        artist: s.artist,
        voteCount: s.values.length,
        average: parseFloat(
          (s.values.reduce((a, b) => a + b, 0) / s.values.length).toFixed(2)
        ),
      }))
      .sort((a, b) => b.average - a.average);

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}