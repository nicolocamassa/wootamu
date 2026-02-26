// /api/set-night/route.ts
import { prisma } from "@/_lib/prisma";
import { pusher } from "@/_lib/pusher";
import { NextResponse } from "next/server";
export async function POST(req: Request) {
  try {
    const { night } = await req.json();
    if (!night || typeof night !== "number")
      return NextResponse.json({ error: "night obbligatorio" }, { status: 400 });
    await prisma.room.updateMany({ data: { night } });
    await pusher.trigger("festival", "night-update", { night });
    return NextResponse.json({ ok: true, night });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}