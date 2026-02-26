// /api/get-votes/route.ts
import { prisma } from "@/_lib/prisma";
import { NextRequest, NextResponse } from "next/server";
export async function GET(req: NextRequest) {
  const songId = parseInt(req.nextUrl.searchParams.get("songId") ?? "");
  if (!songId) return NextResponse.json({ error: "Missing songId" }, { status: 400 });
  try {
    const votes = await prisma.vote.findMany({
      where: { song_id: songId },
      select: { id: true, profile_id: true, value: true },
    });
    return NextResponse.json(votes);
  } catch (err) { console.error(err); return NextResponse.json({ error: "Internal error" }, { status: 500 }); }
}