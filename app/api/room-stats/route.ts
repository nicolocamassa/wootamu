import { prisma } from "@/_lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roomCode = searchParams.get("roomCode");
    if (!roomCode) return NextResponse.json({ error: "roomCode mancante" }, { status: 400 });

    const room = await prisma.room.findUnique({ where: { code: roomCode } });
    if (!room) return NextResponse.json({ error: "Stanza non trovata" }, { status: 404 });

    // Tutte le canzoni già esibite con i voti
    const performedSongs = await prisma.song.findMany({
      where: { performed: true },
      include: {
        votes: {
          where: { user: { room_id: room.id } },
        },
      },
    });

    // Canzoni ancora da esibire
    const songsLeft = await prisma.song.count({
      where: { performed: false },
    });

    // Media totale
    const allVotes = performedSongs.flatMap((s) => s.votes);
    const averageTotal =
      allVotes.length > 0
        ? allVotes.reduce((sum, v) => sum + v.value, 0) / allVotes.length
        : null;

    // Canzone migliore e peggiore
    const songsWithAvg = performedSongs
      .map((s) => ({
        title: s.title,
        avg:
          s.votes.length > 0
            ? s.votes.reduce((sum, v) => sum + v.value, 0) / s.votes.length
            : null,
      }))
      .filter((s) => s.avg !== null) as { title: string; avg: number }[];

    const bestSong =
      songsWithAvg.length > 0
        ? songsWithAvg.reduce((a, b) => (a.avg > b.avg ? a : b)).title
        : null;

    const worstSong =
      songsWithAvg.length > 0
        ? songsWithAvg.reduce((a, b) => (a.avg < b.avg ? a : b)).title
        : null;

    return NextResponse.json({ averageTotal, songsLeft, bestSong, worstSong });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}