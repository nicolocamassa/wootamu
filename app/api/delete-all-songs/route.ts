// /api/delete-all-songs/route.ts
import { prisma } from "@/_lib/prisma";
import { NextResponse } from "next/server";
export async function DELETE() {
  try {
    await prisma.vote.deleteMany({});
    await prisma.reaction.deleteMany({});
    await prisma.comment.deleteMany({});
    await prisma.songPerformance.deleteMany({});
    await prisma.song.deleteMany({});
    return NextResponse.json({ ok: true });
  } catch (err) { console.error(err); return NextResponse.json({ error: "Errore eliminazione" }, { status: 500 }); }
}