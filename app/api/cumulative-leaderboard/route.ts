// /api/cumulative-leaderboard/route.ts
import { prisma } from "@/_lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const K = 3;

export async function GET(req: NextRequest) {
  const roomCode = req.nextUrl.searchParams.get("roomCode");
  if (!roomCode) return NextResponse.json([], { status: 400 });

  try {
    const room = await prisma.room.findUnique({ where: { code: roomCode } });
    if (!room) return NextResponse.json([], { status: 404 });

    if (!room.event || !room.night || room.night <= 1) {
      return NextResponse.json([]);
    }

    const allRooms = await prisma.room.findMany({
      where: { event: room.event },
      select: { id: true, night: true },
    });

    const roomIds = allRooms.map((r) => r.id);

    const allVotes = await prisma.vote.findMany({
      where: {
        user: { room_id: { in: roomIds } },
        night: { not: null },
      },
      include: {
        song: {
          select: {
            id: true,
            title: true,
            artist: true,
            artist_canonical: true,
          },
        },
      },
    });

    type ArtistEntry = {
      canonical: string;
      displayArtist: string;
      displayTitle: string;
      valuesByNight: Map<number, number[]>;
      voteCount: number;
    };

    const artistMap = new Map<string, ArtistEntry>();

    for (const vote of allVotes) {
      const song = vote.song;
      const canonical = (song.artist_canonical ?? song.artist).toLowerCase().trim();

      let entry = artistMap.get(canonical);
      if (!entry) {
        entry = {
          canonical,
          displayArtist: song.artist_canonical ?? song.artist,
          displayTitle: song.title,
          valuesByNight: new Map(),
          voteCount: 0,
        };
        artistMap.set(canonical, entry);
      }

      const night = vote.night!;
      if (!entry.valuesByNight.has(night)) entry.valuesByNight.set(night, []);
      entry.valuesByNight.get(night)!.push(vote.value);
      entry.voteCount++;
    }

    const entries = Array.from(artistMap.values()).map((entry) => {
      // Media per serata, poi media delle medie (ogni serata pesa uguale)
      const nightAverages = Array.from(entry.valuesByNight.values()).map(
        (vals) => vals.reduce((a, b) => a + b, 0) / vals.length
      );
      const rawAvg = nightAverages.reduce((a, b) => a + b, 0) / nightAverages.length;
      return { ...entry, nightCount: entry.valuesByNight.size, rawAvg };
    });

    const globalMean =
      entries.length > 0
        ? entries.reduce((s, e) => s + e.rawAvg, 0) / entries.length
        : 5;

    const result = entries
      .map((e) => {
        const n = e.voteCount;
        const bayesianScore = (n / (n + K)) * e.rawAvg + (K / (n + K)) * globalMean;
        return {
          id: e.canonical,           // stringa stabile per le frecce nel frontend
          title: e.displayTitle,
          artist: e.displayArtist,
          nightCount: e.nightCount,
          voteCount: e.voteCount,
          average: parseFloat(bayesianScore.toFixed(2)),
          rawAverage: parseFloat(e.rawAvg.toFixed(2)),
        };
      })
      .sort((a, b) => b.average - a.average);

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}