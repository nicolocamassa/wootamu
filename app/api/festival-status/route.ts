import { prisma } from "@/_lib/prisma";
import { pusher } from "@/_lib/pusher";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, songId } = body;

    if (!type) {
      return NextResponse.json({ error: "Type è obbligatorio" }, { status: 400 });
    }

    const updated = await prisma.festivalStatus.upsert({
      where: { id: 1 },
      update: { type, songId: songId ?? null },
      create: { id: 1, type, songId: songId ?? null },
      include: {
        song: { include: { votes: true } },
      },
    });

    // Segna la canzone come esibita
    if ((type === "esibizione" || type === "votazione") && songId) {
      await prisma.song.update({
        where: { id: songId },
        data: { performed: true },
      });
    }

    await pusher.trigger("festival", "status-update", updated);

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Errore aggiornamento stato" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roomCode = searchParams.get("roomCode");

    let status = await prisma.festivalStatus.findUnique({
      where: { id: 1 },
      include: {
        song: {
          include: {
            votes: roomCode
              ? {
                  where: {
                    user: {
                      room: {
                        code: roomCode,
                      },
                    },
                  },
                }
              : true,
          },
        },
      },
    });

    if (!status) {
      status = await prisma.festivalStatus.create({
        data: { id: 1, type: "attesa", songId: null },
        include: { song: { include: { votes: true } } },
      });
    }

    return NextResponse.json(status);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Errore fetch stato" }, { status: 500 });
  }
}