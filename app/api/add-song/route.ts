import { prisma } from "@/_lib/prisma";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, artist, performanceTime, imageUrl, imageUrlNobg } = body;

    if (!title || !artist) {
      return new Response(JSON.stringify({ error: "Titolo e artista obbligatori" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const newSong = await prisma.song.create({
      data: {
        title,
        artist,
        image_url: imageUrl ?? null, 
        image_url_nobg: imageUrlNobg ?? null,
        performance_time: performanceTime ? new Date(performanceTime) : null,
      },
    });

    return new Response(JSON.stringify(newSong), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Errore durante l'aggiunta della canzone:", error);
    return new Response(JSON.stringify({ error: "Errore interno del server" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}