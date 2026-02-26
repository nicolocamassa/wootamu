// /api/get-room/route.ts
import { prisma } from "@/_lib/prisma";
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const userToken = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!code) return new Response(JSON.stringify({ error: "Code mancante" }), { status: 400 });
    const room = await prisma.room.findUnique({ where: { code }, include: { members: { include: { profile: true } } } });
    if (!room) return new Response(JSON.stringify({ error: "Stanza non trovata" }), { status: 404 });
    let userRooms: object[] = [{ code: room.code, id: room.id }];
    if (userToken && !userToken.startsWith("profile_")) {
      const m = await prisma.roomMember.findUnique({ where: { userToken }, select: { profile_id: true } });
      if (m?.profile_id) {
        const all = await prisma.roomMember.findMany({ where: { profile_id: m.profile_id }, include: { room: { select: { code: true, id: true, name: true } } } });
        userRooms = all.map((x) => ({ code: x.room.code, id: x.room.id, name: x.room.name, userToken: x.userToken }));
      }
    }
    return new Response(JSON.stringify({ room, userRooms }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) { console.error(err); return new Response(JSON.stringify({ error: "Errore server" }), { status: 500 }); }
}