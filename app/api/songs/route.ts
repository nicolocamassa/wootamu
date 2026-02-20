import { prisma } from "@/_lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  const songs = await prisma.song.findMany({
    orderBy: { created_at: "desc" },
  });
  return NextResponse.json(songs);
}