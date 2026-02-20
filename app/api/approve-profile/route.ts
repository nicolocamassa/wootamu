import { prisma } from "@/_lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { profileId, action } = await req.json(); // action: "approve" | "reject"

    if (action === "reject") {
      await prisma.profile.delete({ where: { id: profileId } });
      return NextResponse.json({ ok: true });
    }

    await prisma.profile.update({
      where: { id: profileId },
      data: { approved: true },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}