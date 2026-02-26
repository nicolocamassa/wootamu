// /api/get-my-votes/route.ts
import { prisma } from "@/_lib/prisma";
import { NextRequest, NextResponse } from "next/server";
export async function GET(req: NextRequest) {
  const userToken = req.headers.get("Authorization")?.replace("Bearer ", "").trim();
  if (!userToken) return NextResponse.json([], { status: 400 });
  try {
    let profileId: number | null = null;
    if (userToken.startsWith("profile_")) profileId = parseInt(userToken.replace("profile_", ""));
    else {
      const m = await prisma.roomMember.findUnique({ where: { userToken }, select: { profile_id: true } });
      profileId = m?.profile_id ?? null;
    }
    if (!profileId) return NextResponse.json([], { status: 401 });
    const votes = await prisma.vote.findMany({ where: { profile_id: profileId }, select: { song_id: true, value: true, night: true } });
    return NextResponse.json(votes.map((v) => ({ songId: v.song_id, value: v.value, night: v.night })));
  } catch (err) { console.error(err); return NextResponse.json({ error: "Internal error" }, { status: 500 }); }
}