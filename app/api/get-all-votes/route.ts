import { prisma } from "@/_lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const roomCode = req.nextUrl.searchParams.get("roomCode");
  if (!roomCode) return NextResponse.json([], { status: 400 });

  try {
    const room = await prisma.room.findUnique({ where: { code: roomCode } });
    if (!room) return NextResponse.json([], { status: 404 });

    const votes = await prisma.vote.findMany({
      where: { user: { room_id: room.id } },
      select: { id: true, user_id: true, song_id: true, value: true },
    });

    return NextResponse.json(votes);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}