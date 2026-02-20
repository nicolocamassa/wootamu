import { prisma } from "@/_lib/prisma";

export async function GET() {
  try {
    const songs = await prisma.song.findMany({
      where: {
        performed: false,
      },
      orderBy: [
        { performance_time: "asc" },
        { created_at: "asc" },
      ],
    });

    return new Response(JSON.stringify(songs), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    return new Response(JSON.stringify({ error: "Errore server" }), { status: 500 });
  }
}