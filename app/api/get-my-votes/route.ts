import { prisma } from "@/_lib/prisma";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const roomCode = req.nextUrl.searchParams.get("roomCode");
  const authHeader = req.headers.get("Authorization");
  const userToken = authHeader?.replace("Bearer ", "").trim();

  if (!roomCode || !userToken) {
    return NextResponse.json([], { status: 400 });
  }

  try {
    const user = await prisma.user.findUnique({
      where: { userToken },
      select: { id: true },
    });

    if (!user) return NextResponse.json([], { status: 401 });

    const votes = await prisma.vote.findMany({
      where: { user_id: user.id },
      select: { song_id: true, value: true },
    });

    const result = votes.map((v) => ({
      songId: v.song_id,
      value: v.value,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}