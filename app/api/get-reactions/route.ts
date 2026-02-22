import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/_lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const songId = parseInt(searchParams.get("songId") ?? "");
  const roomCode = searchParams.get("roomCode");

  if (!songId || !roomCode) {
    return NextResponse.json({ error: "Missing params" }, { status: 400 });
  }

  try {
    // Fetch all reactions for this song, grouped by user and type
    const reactions = await prisma.reaction.groupBy({
      by: ["user_id", "type"],
      where: { song_id: songId },
      _count: { id: true },
    });

    // Shape: [{ user_id, type, count }]
    const result = reactions.map((r) => ({
      user_id: r.user_id,
      type: r.type,
      count: r._count.id,
    }));

    return NextResponse.json(result);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}