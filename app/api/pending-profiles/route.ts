import { prisma } from "@/_lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const profiles = await prisma.profile.findMany({
      where: { approved: false },
      orderBy: { created_at: "desc" },
    });
    return NextResponse.json(profiles);
  } catch (error) {
    console.error("Errore pending-profiles:", error);
    return NextResponse.json([], { status: 200 });
  }
}