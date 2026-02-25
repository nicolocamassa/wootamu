// /api/add-song/route.ts
import { prisma } from "@/_lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { title, artist, artistCanonical, performanceTime, imageUrl, imageUrlNobg } = await req.json();

    if (!title || !artist) {
      return NextResponse.json({ error: "title e artist sono obbligatori" }, { status: 400 });
    }

    const song = await prisma.song.create({
      data: {
        title,
        artist,
        artist_canonical: artistCanonical ?? null,
        performance_time: performanceTime ? new Date(performanceTime) : null,
        image_url: imageUrl ?? null,
        image_url_nobg: imageUrlNobg ?? null,
      },
    });

    return NextResponse.json(song, { status: 201 });
  } catch (err) {
    console.error("Errore add-song:", err);
    return NextResponse.json({ error: "Errore interno server" }, { status: 500 });
  }
}