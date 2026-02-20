// api/get-room.ts
import { prisma } from "@/_lib/prisma";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code");

  if (!code) {
    return new Response(JSON.stringify({ error: "Code mancante" }), { status: 400 });
  }

  // Recupera stanza con utenti e canzoni (inclusi i voti)
  const room = await prisma.room.findUnique({
    where: { code },
    include: {
      users: true,
      songs: {
        include: {
          votes: true, // <-- così s.votes non sarà più undefined
        },
      },
    },
  });

  if (!room) {
    return new Response(JSON.stringify({ error: "Stanza non trovata" }), { status: 404 });
  }

  return new Response(JSON.stringify({ room }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
