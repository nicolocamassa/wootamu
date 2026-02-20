import { prisma } from "@/_lib/prisma";
import { pusher } from "@/_lib/pusher";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { roomCode, songId, value, userToken } = body;

    if (!roomCode || !songId || !value || !userToken) {
      return new Response(JSON.stringify({ error: "Parametri mancanti" }), { status: 400 });
    }

    const room = await prisma.room.findUnique({
      where: { code: roomCode },
      include: { users: true },
    });
    if (!room) return new Response(JSON.stringify({ error: "Stanza non trovata" }), { status: 404 });

    const user = room.users.find(u => u.userToken === userToken);
    if (!user) return new Response(JSON.stringify({ error: "Utente non autorizzato" }), { status: 403 });

    const existingVote = await prisma.vote.findFirst({
      where: {
        user_id: user.id,
        song_id: songId,
      },
    });
    if (existingVote) {
      return new Response(JSON.stringify({ error: "Hai già votato questa canzone" }), { status: 400 });
    }

    const vote = await prisma.vote.create({
      data: {
        value,
        user_id: user.id,
        song_id: songId,
      },
    });

    // Notifica tutti i client connessi
    await pusher.trigger("festival", "vote-update", { songId, roomCode });

    return new Response(JSON.stringify({ vote }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Errore add-vote:", err);
    return new Response(JSON.stringify({ error: "Errore interno server" }), { status: 500 });
  }
}