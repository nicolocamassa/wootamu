// /api/get-reactions/route.ts
import { prisma } from "@/_lib/prisma";
import { NextRequest, NextResponse } from "next/server";
export async function GET(req: NextRequest) {
  const songId = parseInt(req.nextUrl.searchParams.get("songId") ?? "");
  if (!songId) return NextResponse.json({ error: "Missing params" }, { status: 400 });
  try {
    const reactions = await prisma.reaction.groupBy({
      by: ["profile_id", "type"], where: { song_id: songId }, _count: { id: true },
    });
    return NextResponse.json(reactions.map((r) => ({ profile_id: r.profile_id, type: r.type, count: r._count.id })));
  } catch (err) { console.error(err); return NextResponse.json({ error: "Internal error" }, { status: 500 }); }
}