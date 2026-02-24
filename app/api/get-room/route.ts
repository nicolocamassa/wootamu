// api/get-room/route.ts
import { prisma } from "@/_lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const userToken = req.headers.get("Authorization")?.replace("Bearer ", "");

  if (!code) {
    return new Response(JSON.stringify({ error: "Code mancante" }), { status: 400 });
  }

  const room = await prisma.room.findUnique({
    where: { code },
    include: {
      users: true,
      songs: {
        include: { votes: true },
      },
    },
  });

  if (!room) {
    return new Response(JSON.stringify({ error: "Stanza non trovata" }), { status: 404 });
  }

  // Trova tutte le stanze in cui è iscritto questo profilo
  let userRooms: { code: string; id: number }[] = [{ code: room.code, id: room.id }];

  if (userToken) {
    const currentUser = await prisma.user.findUnique({
      where: { userToken },
      select: { profile_id: true },
    });

    if (currentUser?.profile_id) {
      const allInstances = await prisma.user.findMany({
        where: { profile_id: currentUser.profile_id },
        include: { room: { select: { code: true, id: true, event: true } } },
      });

      userRooms = allInstances.map((u) => ({
        code: u.room.code,
        id: u.room.id,
        event: u.room.event,
        userToken: u.userToken,
      })) as typeof userRooms;
    }
  }

  return new Response(JSON.stringify({ room, userRooms }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}