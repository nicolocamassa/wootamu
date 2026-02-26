// /api/room-notification/route.ts
import { pusher } from "@/_lib/pusher";
import { NextRequest, NextResponse } from "next/server";
export async function POST(req: NextRequest) {
  try {
    const { roomCode, text, type, voteValue, voterProfileId } = await req.json();
    if (!roomCode || !type) return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    if (type !== "vote" && !text) return NextResponse.json({ error: "Missing text" }, { status: 400 });
    await pusher.trigger("festival", "room-notification", { roomCode, text, type, voteValue, voterProfileId });
    return NextResponse.json({ ok: true });
  } catch (err) { console.error(err); return NextResponse.json({ error: "Internal error" }, { status: 500 }); }
}