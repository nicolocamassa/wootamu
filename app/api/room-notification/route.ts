import { pusher } from "@/_lib/pusher";
import { NextRequest, NextResponse } from "next/server";

export type RoomNotificationPayload = {
  roomCode: string;
  text: string;
  type: "join" | "leave" | "stat" | "vote" | "alert";
  // Solo per i voti: inviamo anche il valore grezzo.
  // Il client decide se mostrarlo o nasconderlo in base al proprio stato.
  voteValue?: number;
  voterUserId?: number;
};

export async function POST(req: NextRequest) {
  try {
    const body: RoomNotificationPayload = await req.json();
    const { roomCode, text, type, voteValue, voterUserId } = body;

    if (!roomCode || !type) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // Per i voti il testo è vuoto intenzionalmente:
    // ogni client lo costruisce lato suo in base al proprio stato (hasVoted).
    if (type !== "vote" && !text) {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    await pusher.trigger("festival", "room-notification", {
      roomCode,
      text,
      type,
      voteValue,
      voterUserId,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}