// /api/login/route.ts
import { prisma } from "@/_lib/prisma";
import { NextResponse } from "next/server";
export async function POST(req: Request) {
  try {
    const { nickname, pin } = await req.json();
    if (!nickname || !pin) return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
    let profile = await prisma.profile.findUnique({ where: { username: nickname } });
    if (!profile) {
      profile = await prisma.profile.create({ data: { username: nickname, pin, approved: false } });
      return NextResponse.json({ pending: true });
    }
    if (profile.pin !== pin) return NextResponse.json({ error: "PIN non corretto" }, { status: 401 });
    if (!profile.approved) return NextResponse.json({ pending: true });
    const lastMember = await prisma.roomMember.findFirst({ where: { profile_id: profile.id }, orderBy: { joined_at: "desc" } });
    return NextResponse.json({ userToken: lastMember?.userToken ?? `profile_${profile.id}`, nickname: profile.username });
  } catch (err) { console.error(err); return NextResponse.json({ error: "Errore server" }, { status: 500 }); }
}
export async function GET(req: Request) {
  try {
    const nickname = new URL(req.url).searchParams.get("nickname");
    if (!nickname) return NextResponse.json({ error: "Dati mancanti" }, { status: 400 });
    const profile = await prisma.profile.findUnique({ where: { username: nickname } });
    if (!profile) return NextResponse.json({ error: "Profilo non trovato" }, { status: 404 });
    if (!profile.approved) return NextResponse.json({ approved: false });
    const lastMember = await prisma.roomMember.findFirst({ where: { profile_id: profile.id }, orderBy: { joined_at: "desc" } });
    return NextResponse.json({ approved: true, userToken: lastMember?.userToken ?? `profile_${profile.id}`, nickname: profile.username });
  } catch (err) { console.error(err); return NextResponse.json({ error: "Errore server" }, { status: 500 }); }
}