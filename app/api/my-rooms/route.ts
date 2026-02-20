import { prisma } from "@/_lib/prisma";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  try {
    const userToken = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!userToken) return NextResponse.json({ rooms: [], nickname: null });

    let profileId: number | null = null;

    // Token temporaneo (utente senza stanze)
    if (userToken.startsWith("profile_")) {
      profileId = parseInt(userToken.replace("profile_", ""));
    } else {
      const user = await prisma.user.findUnique({
        where: { userToken },
        include: { profile: true },
      });
      profileId = user?.profile?.id ?? null;
    }

    if (!profileId) return NextResponse.json({ rooms: [], nickname: null });

    const profile = await prisma.profile.findUnique({
      where: { id: profileId },
    });

    const allUsers = await prisma.user.findMany({
      where: { profile_id: profileId },
      include: { room: true },
    });

    const rooms = allUsers.map((u) => ({
      code: u.room.code,
      event: u.room.event ?? null,
      isHost: u.isHost,
      userToken: u.userToken,
    }));

    return NextResponse.json({ rooms, nickname: profile?.username ?? null });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ rooms: [], nickname: null });
  }
}