// /api/approve-profile/route.ts
import { prisma } from "@/_lib/prisma";
import { NextResponse } from "next/server";
export async function POST(req: Request) {
  try {
    const { profileId, action } = await req.json();
    if (action === "reject") await prisma.profile.delete({ where: { id: profileId } });
    else await prisma.profile.update({ where: { id: profileId }, data: { approved: true } });
    return NextResponse.json({ ok: true });
  } catch (err) { console.error(err); return NextResponse.json({ error: "Errore server" }, { status: 500 }); }
}