import { prisma } from "@/_lib/prisma";
import { pusher } from "@/_lib/pusher";
import { NextResponse } from "next/server";

async function notify(roomCode: string, text: string, type: string, extra?: object) {
  await pusher.trigger("festival", "room-notification", { roomCode, text, type, ...extra });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { type, songId, roomCode } = body;

    if (!type) {
      return NextResponse.json({ error: "Type è obbligatorio" }, { status: 400 });
    }

    const updated = await prisma.festivalStatus.upsert({
      where: { id: 1 },
      update: { type, songId: songId ?? null },
      create: { id: 1, type, songId: songId ?? null },
      include: { song: { include: { votes: true } } },
    });

    // Segna la canzone come esibita
    if ((type === "esibizione" || type === "votazione") && songId) {
      await prisma.song.update({
        where: { id: songId },
        data: { performed: true },
      });
    }

    // Notifica cambio stato a tutti i client
    await pusher.trigger("festival", "status-update", updated);

    // ── Notifiche sincronizzate per tipo ──────────────────────────────────
    if (roomCode) {
      if (type === "esibizione" && updated.song) {
        await notify(roomCode, `Ora in scena: ${updated.song.artist} — ${updated.song.title} 🎤`, "alert");
      }

      if (type === "votazione" && updated.song) {
        await notify(roomCode, `Vota ${updated.song.title}! 🗳️`, "alert");
      }

      if (type === "presentazione") {
        await notify(roomCode, "Carlo Conti sta presentando il prossimo artista 🎙️", "stat");
      }

      if (type === "spot") {
        await notify(roomCode, "Pubblicità — torniamo tra poco 📺", "stat");

        // Statistiche random durante lo spot (con delay)
        scheduleStatNotifications(roomCode);
      }

      if (type === "pausa") {
        await notify(roomCode, "Pausa tecnica ⏸️", "stat");
        scheduleStatNotifications(roomCode);
      }

      if (type === "attesa") {
        await notify(roomCode, "La serata sta per iniziare… 🎭", "stat");
      }

      if (type === "fine") {
        // Notifica finale con stats
        const stats = await getRoomStats(roomCode);
        await notify(roomCode, "La serata è finita! Grazie per aver partecipato 🌟", "alert");
        if (stats.bestSong)
          setTimeout(() => notify(roomCode, `Canzone più amata della serata: ${stats.bestSong} 🏆`, "alert"), 3000);
        if (stats.averageTotal !== null)
          setTimeout(() => notify(roomCode, `Media generale della serata: ${stats.averageTotal!.toFixed(1)} ⭐`, "stat"), 7000);
      }

      // Post-votazione: riepilogo voti
      if (type === "presentazione" || type === "spot" || type === "pausa") {
        const prevStatus = await prisma.festivalStatus.findUnique({
          where: { id: 1 },
          include: { song: { include: { votes: true } } },
        });
        if (prevStatus?.song?.votes && prevStatus.song.votes.length > 0) {
          const votes = prevStatus.song.votes;
          const values = votes.map((v) => v.value);
          const avg = values.reduce((a, b) => a + b, 0) / values.length;
          const max = Math.max(...values);
          const min = Math.min(...values);

          setTimeout(() => notify(roomCode, `Voto finale: ${avg.toFixed(1)} ⭐`, "stat"), 2000);

          const topVoter = await prisma.user.findUnique({ where: { id: votes.find((v) => v.value === max)!.user_id } });
          const lowVoter = await prisma.user.findUnique({ where: { id: votes.find((v) => v.value === min)!.user_id } });

          if (topVoter)
            setTimeout(() => notify(roomCode, `Più generoso: ${topVoter.username} con ${max} 😄`, "stat"), 6000);
          if (lowVoter && lowVoter.id !== topVoter?.id)
            setTimeout(() => notify(roomCode, `Più severo: ${lowVoter.username} con ${min} 😤`, "stat"), 10000);
          if (max - min >= 5)
            setTimeout(() => notify(roomCode, `Grande divisione! (${(max - min).toFixed(1)} punti di differenza) 🤔`, "alert"), 14000);
        }
      }
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Errore aggiornamento stato" }, { status: 500 });
  }
}

// Manda 2-3 statistiche random durante pausa/spot
async function scheduleStatNotifications(roomCode: string) {
  const stats = await getRoomStats(roomCode);
  const messages: string[] = [];

  if (stats.averageTotal !== null)
    messages.push(`Media serata finora: ${stats.averageTotal.toFixed(1)} ⭐`);
  if (stats.bestSong)
    messages.push(`Canzone più amata finora: ${stats.bestSong} 🏆`);
  if (stats.worstSong && stats.worstSong !== stats.bestSong)
    messages.push(`Canzone meno amata: ${stats.worstSong} 💀`);
  if (stats.songsLeft === 1)
    messages.push("Ultima canzone della serata! 🏁");
  else if (stats.songsLeft > 1)
    messages.push(`Ancora ${stats.songsLeft} canzoni 🎵`);

  // Manda massimo 3 messaggi a intervalli random tra 15s e 60s
  const shuffled = messages.sort(() => Math.random() - 0.5).slice(0, 3);
  let delay = 15000;
  for (const text of shuffled) {
    const d = delay;
    setTimeout(() => notify(roomCode, text, "stat"), d);
    delay += 15000 + Math.random() * 30000;
  }
}

async function getRoomStats(roomCode: string) {
  const room = await prisma.room.findUnique({ where: { code: roomCode } });
  const performedSongs = await prisma.song.findMany({
    where: { performed: true },
    include: { votes: room ? { where: { user: { room_id: room.id } } } : true },
  });
  const songsLeft = await prisma.song.count({ where: { performed: false } });
  const allVotes = performedSongs.flatMap((s) => s.votes);
  const averageTotal = allVotes.length > 0
    ? allVotes.reduce((sum, v) => sum + v.value, 0) / allVotes.length
    : null;
  const songsWithAvg = performedSongs
    .map((s) => ({ title: s.title, avg: s.votes.length > 0 ? s.votes.reduce((sum, v) => sum + v.value, 0) / s.votes.length : null }))
    .filter((s) => s.avg !== null) as { title: string; avg: number }[];
  const bestSong = songsWithAvg.length > 0 ? songsWithAvg.reduce((a, b) => a.avg > b.avg ? a : b).title : null;
  const worstSong = songsWithAvg.length > 0 ? songsWithAvg.reduce((a, b) => a.avg < b.avg ? a : b).title : null;
  return { averageTotal, songsLeft, bestSong, worstSong };
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roomCode = searchParams.get("roomCode");
    let status = await prisma.festivalStatus.findUnique({
      where: { id: 1 },
      include: {
        song: {
          include: {
            votes: roomCode
              ? { where: { user: { room: { code: roomCode } } } }
              : true,
          },
        },
      },
    });
    if (!status) {
      status = await prisma.festivalStatus.create({
        data: { id: 1, type: "attesa", songId: null },
        include: { song: { include: { votes: true } } },
      });
    }
    return NextResponse.json(status);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Errore fetch stato" }, { status: 500 });
  }
}