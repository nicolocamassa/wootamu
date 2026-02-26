// /api/add-song/route.ts
import { prisma } from "@/_lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { title, artist, artistCanonical, night, performanceTime, imageUrl } = await req.json();
    if (!title || !artist)
      return NextResponse.json({ error: "title e artist sono obbligatori" }, { status: 400 });

    const nightNum = night ? Number(night) : null;

    // Cerca canzone esistente — prima per artista esatto, poi per canonical
    // MySQL collation è case-insensitive di default (utf8mb4_unicode_ci)
    // quindi la query normale funziona già case-insensitive
    let existingSong = await prisma.song.findFirst({
      where: { artist: artist.trim() },
    });

    // Se non trovato per artista, prova per canonical
    if (!existingSong && artistCanonical) {
      existingSong = await prisma.song.findFirst({
        where: { artist_canonical: artistCanonical.trim() },
      });
    }

    // Se non trovato per canonical, prova titolo + artista canonical
    if (!existingSong && artistCanonical) {
      existingSong = await prisma.song.findFirst({
        where: {
          title: title.trim(),
          artist_canonical: artistCanonical.trim(),
        },
      });
    }

    let song = existingSong;

    if (!song) {
      // Crea nuova canzone
      song = await prisma.song.create({
        data: {
          title: title.trim(),
          artist: artist.trim(),
          artist_canonical: artistCanonical?.trim() ?? null,
          image_url: imageUrl ?? null,
        },
      });
    } else {
      // Aggiorna image_url se mancante
      if (imageUrl && !song.image_url) {
        song = await prisma.song.update({
          where: { id: song.id },
          data: { image_url: imageUrl },
        });
      }
    }

    // Crea/aggiorna SongPerformance se c'è una serata
    if (nightNum !== null) {
      await prisma.songPerformance.upsert({
        where: { song_id_night: { song_id: song.id, night: nightNum } },
        update: {
          performance_time: performanceTime ? new Date(performanceTime) : null,
        },
        create: {
          song_id: song.id,
          night: nightNum,
          performance_time: performanceTime ? new Date(performanceTime) : null,
          performed: false,
        },
      });
    }

    const result = await prisma.song.findUnique({
      where: { id: song.id },
      include: { performances: true },
    });

    return NextResponse.json(result, { status: existingSong ? 200 : 201 });
  } catch (err) {
    console.error("Errore add-song:", err);
    return NextResponse.json({ error: "Errore interno server" }, { status: 500 });
  }
}