import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/_lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { type, songId, roomCode } = await req.json();
    const userToken = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!userToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const user = await prisma.user.findUnique({ where: { userToken } });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });

    const reaction = await prisma.reaction.create({
      data: { type, user_id: user.id, song_id: songId },
    });

    const EMOJI_MAP: Record<string, string> = {
      skull: "💀", fire: "🔥", heart: "❤️", clap: "👏", laugh: "😂", cringe: "🫣",
    };

    const { default: Pusher } = await import("pusher");
    const pusher = new Pusher({
      appId: process.env.PUSHER_APP_ID!,
      key: process.env.PUSHER_KEY!,
      secret: process.env.PUSHER_SECRET!,
      cluster: process.env.PUSHER_CLUSTER!,
    });

    await pusher.trigger("festival", "reaction-update", {
      emoji: EMOJI_MAP[type] ?? "⭐",
      user_id: user.id,   // ← aggiunto: serve al client per badge + dedup
      roomCode,
    });

    return NextResponse.json({ ok: true, reaction });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}