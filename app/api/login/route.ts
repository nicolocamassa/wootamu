import { prisma } from "@/_lib/prisma";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { nickname, pin } = await req.json();

    if (!nickname || !pin) {
      return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
    }

    let profile = await prisma.profile.findUnique({ where: { username: nickname } });

    if (!profile) {
      // Prima volta — crea il profilo in attesa di approvazione
      profile = await prisma.profile.create({
        data: { username: nickname, pin, approved: false },
      });
      return NextResponse.json({ pending: true }, { status: 200 });
    }

    if (profile.pin !== pin) {
      return NextResponse.json({ error: "PIN non corretto" }, { status: 401 });
    }

    if (!profile.approved) {
      return NextResponse.json({ pending: true }, { status: 200 });
    }

    const lastUser = await prisma.user.findFirst({
      where: { profile_id: profile.id },
      orderBy: { created_at: "desc" },
    });

    const userToken = lastUser?.userToken ?? `profile_${profile.id}`;

    return NextResponse.json({ userToken, nickname: profile.username });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const nickname = searchParams.get("nickname");

    if (!nickname) return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });

    const profile = await prisma.profile.findUnique({ where: { username: nickname } });
    if (!profile) return NextResponse.json({ error: "Profilo non trovato" }, { status: 404 });

    if (!profile.approved) return NextResponse.json({ approved: false });

    const lastUser = await prisma.user.findFirst({
      where: { profile_id: profile.id },
      orderBy: { created_at: "desc" },
    });

    const userToken = lastUser?.userToken ?? `profile_${profile.id}`;
    return NextResponse.json({ approved: true, userToken, nickname: profile.username });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Errore server" }, { status: 500 });
  }
}