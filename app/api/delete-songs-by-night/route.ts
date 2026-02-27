import { prisma } from "@/_lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const night = searchParams.get("night");

    if (!night || isNaN(Number(night))) {
      return NextResponse.json({ error: "Parametro 'night' non valido" }, { status: 400 });
    }

    const nightNum = Number(night);

    // Trova tutte le canzoni della serata
    const performances = await prisma.songPerformance.findMany({
      where: { night: nightNum },
      select: { song_id: true },
    });

    const songIds = performances.map((p: typeof performances[number]) => p.song_id);

    // Elimina i dati associati
    await prisma.vote.deleteMany({
      where: { song: { performances: { some: { night: nightNum } } } },
    });

    await prisma.reaction.deleteMany({
      where: { song: { performances: { some: { night: nightNum } } } },
    });

    await prisma.comment.deleteMany({
      where: { song: { performances: { some: { night: nightNum } } } },
    });

    // Elimina le performance
    await prisma.songPerformance.deleteMany({
      where: { night: nightNum },
    });

    // Elimina le canzoni che non hanno altre performance
    for (const songId of songIds) {
      const otherPerformances = await prisma.songPerformance.count({
        where: { song_id: songId },
      });
      if (otherPerformances === 0) {
        await prisma.song.delete({
          where: { id: songId },
        });
      }
    }

    return NextResponse.json({ 
      ok: true, 
      deletedSongs: songIds.length,
      message: `Eliminate canzoni della serata ${nightNum}` 
    });
  } catch (err) {
    console.error("Errore eliminazione canzoni per serata:", err);
    return NextResponse.json({ error: "Errore eliminazione" }, { status: 500 });
  }
}
