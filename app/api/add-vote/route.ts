import { prisma } from "@/_lib/prisma";
import { pusher } from "@/_lib/pusher";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { roomCode, songId, value, userToken } = body;

    if (!roomCode || !songId || !value || !userToken) {
      return new Response(JSON.stringify({ error: "Parametri mancanti" }), { status: 400 });
    }

    // Trova l'utente nella stanza principale
    const user = await prisma.user.findUnique({
      where: { userToken },
      include: { profile: true },
    });

    if (!user) {
      return new Response(JSON.stringify({ error: "Utente non autorizzato" }), { status: 403 });
    }

    // Trova tutte le istanze utente dello stesso profilo (tutte le stanze)
    const allUserInstances = await prisma.user.findMany({
      where: { profile_id: user.profile_id },
      include: { room: true },
    });

    const results = [];

    for (const instance of allUserInstances) {
      // Controlla se ha già votato questa canzone in questa stanza
      const existingVote = await prisma.vote.findFirst({
        where: {
          user_id: instance.id,
          song_id: songId,
        },
      });

      if (!existingVote) {
        const vote = await prisma.vote.create({
          data: {
            value,
            user_id: instance.id,
            song_id: songId,
          },
        });
        results.push(vote);

        // Aggiorna i voti in tempo reale per tutti
        await pusher.trigger("festival", "vote-update", {
          songId,
          roomCode: instance.room.code,
        });

        // Notifica testuale visibile in CurrentEvent
        // voterUserId permette a CurrentEvent di nascondere la notifica a chi ha votato
        // e di mostrare/nascondere il valore numerico in base allo stato di voto degli altri
        await pusher.trigger("festival", "room-notification", {
          roomCode: instance.room.code,
          type: "vote",
          text: `${user.username} ha votato ✅`,
          voteValue: value,
          voterUserId: instance.id,
        });
      }
    }

    return new Response(JSON.stringify({ votes: results }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("Errore add-vote:", err);
    return new Response(JSON.stringify({ error: "Errore interno server" }), { status: 500 });
  }
}