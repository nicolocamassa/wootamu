// /api/add-vote/route.ts
import { prisma } from "@/_lib/prisma";
import { pusher } from "@/_lib/pusher";
export async function POST(req: Request) {
  try {
    const { roomCode, songId, value, userToken } = await req.json();
    if (!roomCode || !songId || !value || !userToken) return new Response(JSON.stringify({ error: "Parametri mancanti" }), { status: 400 });
    const member = await prisma.roomMember.findFirst({ where: { userToken, room: { code: roomCode } }, include: { room: true, profile: true } });
    if (!member) return new Response(JSON.stringify({ error: "Utente non trovato in questa stanza" }), { status: 403 });
    const currentNight = member.room.night ?? 1;
    try {
      await prisma.vote.create({ data: { value, profile_id: member.profile_id, song_id: songId, night: currentNight } });
    } catch {
      return new Response(JSON.stringify({ error: "Hai già votato questa canzone" }), { status: 400 });
    }
    const allMemberships = await prisma.roomMember.findMany({ where: { profile_id: member.profile_id }, include: { room: true } });
    for (const m of allMemberships) {
      await pusher.trigger("festival", "vote-update", { songId, roomCode: m.room.code });
      await pusher.trigger("festival", "room-notification", { roomCode: m.room.code, type: "vote", text: `${member.profile.username} ha votato ✅`, voteValue: value, voterProfileId: member.profile_id });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) { console.error("Errore add-vote:", err); return new Response(JSON.stringify({ error: "Errore interno server" }), { status: 500 }); }
}