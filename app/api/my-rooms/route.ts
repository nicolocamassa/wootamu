// /api/my-rooms/route.ts
import { prisma } from "@/_lib/prisma";
import { NextResponse } from "next/server";
export async function GET(req: Request) {
  try {
    const userToken = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!userToken) return NextResponse.json({ rooms: [], nickname: null });
    let profile;
    if (userToken.startsWith("profile_")) {
      profile = await prisma.profile.findUnique({ where: { id: parseInt(userToken.replace("profile_", "")) } });
    } else {
      const member = await prisma.roomMember.findUnique({ where: { userToken }, include: { profile: true } });
      profile = member?.profile ?? null;
    }
    if (!profile) return NextResponse.json({ rooms: [], nickname: null });
    const memberships = await prisma.roomMember.findMany({ where: { profile_id: profile.id }, include: { room: true } });
    const rooms = await Promise.all(memberships.map(async (m) => ({
      code: m.room.code, name: m.room.name ?? null, isHost: m.isHost, userToken: m.userToken,
      usersCount: await prisma.roomMember.count({ where: { room_id: m.room_id } }),
    })));
    return NextResponse.json({ rooms, nickname: profile.username });
  } catch (err) { console.error(err); return NextResponse.json({ rooms: [], nickname: null }); }
}