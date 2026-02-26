// /api/room-stats/route.ts
import { prisma } from "@/_lib/prisma";
import { NextResponse } from "next/server";
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roomCode = searchParams.get("roomCode");
    if (!roomCode) return NextResponse.json({ error: "roomCode mancante" }, { status: 400 });
    const room = await prisma.room.findUnique({ where: { code: roomCode } });
    if (!room) return NextResponse.json({ error: "Stanza non trovata" }, { status: 404 });
    const currentNight = room.night ?? null;
    const performances = await prisma.songPerformance.findMany({
      where: { performed: true, ...(currentNight !== null ? { night: currentNight } : {}) },
      include: { song: { include: { votes: { where: currentNight !== null ? { night: currentNight } : {} } } } },
    });
    const songsLeft = await prisma.songPerformance.count({
      where: { performed: false, ...(currentNight !== null ? { night: currentNight } : {}) },
    });
    const allVotes = performances.flatMap((p) => p.song.votes);
    const averageTotal = allVotes.length > 0 ? allVotes.reduce((s, v) => s + v.value, 0) / allVotes.length : null;
    const withAvg = performances
      .map((p) => ({ title: p.song.title, avg: p.song.votes.length > 0 ? p.song.votes.reduce((s, v) => s + v.value, 0) / p.song.votes.length : null }))
      .filter((s) => s.avg !== null) as { title: string; avg: number }[];
    return NextResponse.json({
      averageTotal, songsLeft,
      bestSong: withAvg.length > 0 ? withAvg.reduce((a, b) => a.avg > b.avg ? a : b).title : null,
      worstSong: withAvg.length > 0 ? withAvg.reduce((a, b) => a.avg < b.avg ? a : b).title : null,
    });
  } catch (err) { console.error(err); return NextResponse.json({ error: "Errore server" }, { status: 500 }); }
}