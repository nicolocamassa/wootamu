// /api/get-songs/route.ts
import { prisma } from "@/_lib/prisma";

export async function GET(req: Request) {
  try {
    const night = new URL(req.url).searchParams.get("night");
    const n = night ? parseInt(night) : null;

    if (n !== null) {
      // Canzoni con SongPerformance esplicita per questa serata, non ancora esibite
      const performances = await prisma.songPerformance.findMany({
        where: { night: n, performed: false },
        include: { song: true },
        orderBy: { performance_time: "asc" },
      });

      if (performances.length > 0) {
        return new Response(JSON.stringify(
          performances.map((p) => ({
            ...p.song,
            performance_time: p.performance_time,
            performed: false,
          }))
        ), { status: 200, headers: { "Content-Type": "application/json" } });
      }

      // Fallback: nessuna SongPerformance con performed=false trovata
      // Prende tutte le canzoni ed esclude quelle già esibite questa serata
      const performedSongIds = new Set(
        (await prisma.songPerformance.findMany({
          where: { night: n, performed: true },
          select: { song_id: true },
        })).map((p) => p.song_id)
      );

      const allSongs = await prisma.song.findMany({
        orderBy: { created_at: "asc" },
      });

      return new Response(JSON.stringify(
        allSongs
          .filter((s) => !performedSongIds.has(s.id))
          .map((s) => ({ ...s, performed: false }))  // ← marca esplicitamente
      ), { status: 200, headers: { "Content-Type": "application/json" } });
    }

    const songs = await prisma.song.findMany({ orderBy: { created_at: "asc" } });
    return new Response(JSON.stringify(songs), {
      status: 200, headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Errore server" }), { status: 500 });
  }
}