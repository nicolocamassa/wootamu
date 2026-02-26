// /api/add-reaction/route.ts
import { prisma } from "@/_lib/prisma";
import { pusher } from "@/_lib/pusher";
import { NextRequest, NextResponse } from "next/server";
export async function POST(req: NextRequest) {
  try {
    const { type, songId, roomCode } = await req.json();
    const userToken = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!userToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    let profileId: number | null = null;
    if (userToken.startsWith("profile_")) profileId = parseInt(userToken.replace("profile_", ""));
    else { const m = await prisma.roomMember.findUnique({ where: { userToken }, select: { profile_id: true } }); profileId = m?.profile_id ?? null; }
    if (!profileId) return NextResponse.json({ error: "Profilo non trovato" }, { status: 404 });
    const reaction = await prisma.reaction.create({ data: { type, profile_id: profileId, song_id: songId } });
    const EMOJI_MAP: Record<string, string> = { skull: "💀", fire: "🔥", heart: "❤️", clap: "👏", laugh: "😂", cringe: "🫣" };
    await pusher.trigger("festival", "reaction-update", { emoji: EMOJI_MAP[type] ?? "⭐", profile_id: profileId, roomCode });
    return NextResponse.json({ ok: true, reaction });
  } catch (err) { console.error(err); return NextResponse.json({ error: "Server error" }, { status: 500 }); }
}