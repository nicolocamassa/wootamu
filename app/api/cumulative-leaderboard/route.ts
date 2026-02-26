// /api/cumulative-leaderboard/route.ts
import { prisma } from "@/_lib/prisma";
import { NextRequest, NextResponse } from "next/server";

const K = 3;

type VoteWithSong = {
  value: number;
  night: number;
  song: { id: number; title: string; artist: string; artist_canonical: string | null };
};

type Entry = {
  canonical: string;
  displayArtist: string;
  displayTitle: string;
  valuesByNight: Map<number, number[]>;
  voteCount: number;
};

function buildRanked(votes: VoteWithSong[], currentNight: number) {
  const artistMap = new Map<string, Entry>();

  for (const vote of votes) {
    const canonical = (vote.song.artist_canonical ?? vote.song.artist).toLowerCase().trim();
    const night = vote.night ?? 1;
    let e = artistMap.get(canonical);
    if (!e) {
      e = {
        canonical,
        displayArtist: vote.song.artist_canonical ?? vote.song.artist,
        displayTitle: vote.song.title,
        valuesByNight: new Map(),
        voteCount: 0,
      };
      artistMap.set(canonical, e);
    }
    if (!e.valuesByNight.has(night)) e.valuesByNight.set(night, []);
    e.valuesByNight.get(night)!.push(vote.value);
    e.voteCount++;
    if (night === currentNight) {
      e.displayTitle = vote.song.title;
      e.displayArtist = vote.song.artist_canonical ?? vote.song.artist;
    }
  }

  const entries = Array.from(artistMap.values()).map((e) => {
    const avgs = Array.from(e.valuesByNight.values()).map(
      (v) => v.reduce((a, b) => a + b, 0) / v.length
    );
    const rawAvg = avgs.reduce((a, b) => a + b, 0) / avgs.length;
    return { ...e, nightCount: e.valuesByNight.size, rawAvg };
  });

  const globalMean =
    entries.length > 0 ? entries.reduce((s, e) => s + e.rawAvg, 0) / entries.length : 5;

  return entries
    .map((e) => {
      const score =
        (e.voteCount / (e.voteCount + K)) * e.rawAvg +
        (K / (e.voteCount + K)) * globalMean;
      return {
        canonical: e.canonical,
        score,
        rawAvg: e.rawAvg,
        nightCount: e.nightCount,
        voteCount: e.voteCount,
        displayTitle: e.displayTitle,
        displayArtist: e.displayArtist,
      };
    })
    .sort((a, b) => b.score - a.score);
}

export async function GET(req: NextRequest) {
  const roomCode = req.nextUrl.searchParams.get("roomCode");
  if (!roomCode) return NextResponse.json([], { status: 400 });

  try {
    const room = await prisma.room.findUnique({ where: { code: roomCode } });
    if (!room || !room.night || room.night <= 1) return NextResponse.json([]);

    const currentNight = room.night;

    const allVotes = await prisma.vote.findMany({
      include: {
        song: { select: { id: true, title: true, artist: true, artist_canonical: true } },
      },
    });

    // Classifica cumulativa completa (inclusa notte corrente)
    const currentRanked = buildRanked(allVotes, currentNight);

    // Classifica cumulativa precedente (esclusa notte corrente)
    const previousVotes = allVotes.filter((v) => v.night !== currentNight);
    const previousRanked = buildRanked(previousVotes, currentNight - 1);
    const previousRankMap = new Map(previousRanked.map((e, i) => [e.canonical, i + 1]));

    const result = currentRanked.map((e, i) => {
      const currentRank = i + 1;
      const previousRank = previousRankMap.get(e.canonical) ?? null;
      let trend: "up" | "down" | "same" | "new";
      if (previousRank === null) {
        trend = "new";
      } else if (currentRank < previousRank) {
        trend = "up";
      } else if (currentRank > previousRank) {
        trend = "down";
      } else {
        trend = "same";
      }

      return {
        id: e.canonical,
        title: e.displayTitle,
        artist: e.displayArtist,
        nightCount: e.nightCount,
        voteCount: e.voteCount,
        average: parseFloat(e.score.toFixed(2)),
        rawAverage: parseFloat(e.rawAvg.toFixed(2)),
        previousRank,
        trend,
      };
    });

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}