// /api/add-song/route.ts
import { prisma } from "@/_lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { title, artist, artistCanonical, night, performanceTime, imageUrl } = await req.json();
    if (!title || !artist)
      return NextResponse.json({ error: "title e artist sono obbligatori" }, { status: 400 });

    const nightNum = night ? Number(night) : null;

    // Cerca canzone esistente — prima per artista esatto.
    // MySQL collation è case-insensitive di default (utf8mb4_unicode_ci)
    // quindi la query normale funziona già case-insensitive.
    //
    // In passato veniva anche cercato solo per artist_canonical così da
    // raggruppare tutte le performance dello stesso interprete, ma questo
    // causava fusioni indesiderate quando caricavo duetti o cover con lo
    // stesso canonical: il record originale veniva aggiornato e la nuova
    // performance veniva attaccata a quel titolo, rendendo la canzone
    // non selezionabile in admin. Ora facciamo match su canonical **solo
    // se coincide anche il titolo**, preservando le entry distinte.
    // In alternativa si cerca anche per titolo+canonical (ridondante, ma
    // aiuta a chiarire l'intento).

    let existingSong = await prisma.song.findFirst({
      where: { artist: artist.trim() },
    });

    if (!existingSong && artistCanonical) {
      existingSong = await prisma.song.findFirst({
        where: {
          artist_canonical: artistCanonical.trim(),
          title: title.trim(),
        },
      });
    }

    // precedente logica (solo canonical) rimossa per evitare fusioni

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
      // Se la canzone esiste già, potremmo avere nuovi metadati nel JSON
      // (titolo/artist/artist_canonical). Aggiorniamo il record se differisce
      // per riflettere lo stato più recente, altrimenti le performance avranno
      // orari corretti ma descrizioni sbagliate come segnalato dall'utente.
      const updates: Record<string, any> = {};
      const t = title.trim();
      const a = artist.trim();
      const ac = artistCanonical?.trim() ?? null;
      if (song.title !== t) updates.title = t;
      if (song.artist !== a) updates.artist = a;
      if (ac !== null && song.artist_canonical !== ac) updates.artist_canonical = ac;
      if (imageUrl && !song.image_url) updates.image_url = imageUrl;

      if (Object.keys(updates).length > 0) {
        song = await prisma.song.update({
          where: { id: song.id },
          data: updates,
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