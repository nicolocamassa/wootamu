import { prisma } from "@/_lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE() {
  try {
    await prisma.vote.deleteMany({});      // prima i voti (foreign key)
    await prisma.reaction.deleteMany({});  // poi le reazioni
    await prisma.song.deleteMany({});      // poi le canzoni

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Errore eliminazione canzoni" }, { status: 500 });
  }
}