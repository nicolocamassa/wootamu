import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/_lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const songId = parseInt(searchParams.get("songId") ?? "");

  if (!songId) {
    return NextResponse.json({ error: "Missing songId" }, { status: 400 });
  }

  try {
    const votes = await prisma.vote.findMany({
      where: { song_id: songId },
      select: { id: true, user_id: true, value: true },
    });

    return NextResponse.json(votes);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}