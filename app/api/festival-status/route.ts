// /api/festival-status/route.ts
import { prisma } from "@/_lib/prisma";
import { pusher } from "@/_lib/pusher";
import { NextResponse } from "next/server";

async function notify(roomCode: string, text: string, type: string) {
  await pusher.trigger("festival", "room-notification", { roomCode, text, type });
}

// Prende la serata attiva dalla prima room disponibile (set-night aggiorna tutte)
async function getCurrentNight(): Promise<number> {
  const room = await prisma.room.findFirst({ select: { night: true } });
  return room?.night ?? 1;
}

async function getNightStats(roomCode: string) {
  const currentNight = await getCurrentNight();
  const performances = await prisma.songPerformance.findMany({
    where: { performed: true, night: currentNight },
    include: { song: { include: { votes: { where: { night: currentNight } } } } },
  });
  const songsLeft = await prisma.songPerformance.count({
    where: { performed: false, night: currentNight },
  });
  const allVotes = performances.flatMap((p) => p.song.votes);
  const averageTotal = allVotes.length > 0
    ? allVotes.reduce((s, v) => s + v.value, 0) / allVotes.length
    : null;
  const withAvg = performances
    .map((p) => ({
      title: p.song.title,
      avg: p.song.votes.length > 0
        ? p.song.votes.reduce((s, v) => s + v.value, 0) / p.song.votes.length
        : null,
    }))
    .filter((s) => s.avg !== null) as { title: string; avg: number }[];
  return {
    averageTotal,
    songsLeft,
    bestSong: withAvg.length > 0 ? withAvg.reduce((a, b) => a.avg > b.avg ? a : b).title : null,
    worstSong: withAvg.length > 0 ? withAvg.reduce((a, b) => a.avg < b.avg ? a : b).title : null,
  };
}

async function scheduleStats(roomCode: string) {
  const stats = await getNightStats(roomCode);
  const messages: string[] = [];
  if (stats.averageTotal !== null) messages.push(`Media finora: ${stats.averageTotal.toFixed(1)} ⭐`);
  if (stats.bestSong) messages.push(`Canzone più amata finora: ${stats.bestSong} 🏆`);
  if (stats.worstSong && stats.worstSong !== stats.bestSong) messages.push(`Meno amata: ${stats.worstSong} 💀`);
  if (stats.songsLeft === 1) messages.push("Ultima canzone! 🏁");
  else if (stats.songsLeft > 1) messages.push(`Ancora ${stats.songsLeft} canzoni 🎵`);
  let delay = 15000;
  for (const text of messages.sort(() => Math.random() - 0.5).slice(0, 3)) {
    const d = delay;
    setTimeout(() => notify(roomCode, text, "stat"), d);
    delay += 15000 + Math.random() * 30000;
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    console.log("[festival-status] POST body", body);
    const { type, songId, roomCode, eventIndex, classificaIndex } = body;
    if (!type) {
      console.log("[festival-status] missing type in body", body);
      return NextResponse.json({ error: "Type obbligatorio" }, { status: 400 });
    }

    const currentNight = await getCurrentNight();

    // Aggiorna SongPerformance quando inizia esibizione o votazione
    if ((type === "esibizione" || type === "votazione") && songId) {
      // assicurati che la canzone esista, altrimenti la upsert fallirà con vincolo FK
      const songExists = await prisma.song.findUnique({ where: { id: songId } });
      if (songExists) {
        try {
          await prisma.songPerformance.upsert({
            where: { song_id_night: { song_id: songId, night: currentNight } },
            update: { performed: true, performance_time: new Date() },
            create: { song_id: songId, night: currentNight, performed: true, performance_time: new Date() },
          });
        } catch (err) {
          console.error("[festival-status] failed to upsert songPerformance", err);
        }
      } else {
        console.warn(`[festival-status] canzone con id ${songId} non trovata, salto aggiornamento performance`);
      }
    }

    const current = await prisma.festivalStatus.findUnique({ where: { id: 1 } });

    // ensure songId is real before we put it in festivalStatus
    let validSongId: number | null = null;
    if (typeof songId === "number") {
      const songCheck = await prisma.song.findUnique({ where: { id: songId } });
      if (songCheck) {
        validSongId = songId;
      } else {
        console.warn(`[festival-status] received invalid songId ${songId}, ignoring for status`);
      }
    }

    const lastSongId = validSongId ?? current?.lastSongId ?? current?.songId ?? null;

    const updateData: any = { type };
    updateData.songId = validSongId;
    updateData.lastSongId = lastSongId;
    if (typeof eventIndex === "number") updateData.eventIndex = eventIndex;
    if (typeof classificaIndex === "number") updateData.classificaIndex = classificaIndex;

    // Try to upsert; if the Prisma client was not regenerated after schema change
    // the `classificaIndex` field may cause an unknown-arg error. In that case
    // retry excluding that field and attempt a raw SQL update as a fallback.
    let updated: any = null;
    let appliedClassifica = false;
    try {
      updated = await prisma.festivalStatus.upsert({
        where: { id: 1 },
        update: updateData,
        create: { id: 1, type, songId: validSongId, lastSongId, eventIndex: typeof eventIndex === "number" ? eventIndex : 0, classificaIndex: typeof classificaIndex === "number" ? classificaIndex : 0 },
        include: {
          song: { include: { votes: { where: { night: currentNight } } } },
          lastSong: { include: { votes: { where: { night: currentNight } } } },
        },
      });
      appliedClassifica = typeof updated.classificaIndex === "number";
    } catch (err) {
      console.warn("[festival-status] upsert failed, retrying without classificaIndex", String(err));
      // retry without classificaIndex in case Prisma client doesn't know the field
      if (updateData.classificaIndex !== undefined) delete updateData.classificaIndex;
      try {
        updated = await prisma.festivalStatus.upsert({
          where: { id: 1 },
          update: updateData,
          create: { id: 1, type, songId: validSongId, lastSongId, eventIndex: typeof eventIndex === "number" ? eventIndex : 0 },
          include: {
            song: { include: { votes: { where: { night: currentNight } } } },
            lastSong: { include: { votes: { where: { night: currentNight } } } },
          },
        });
      } catch (err2) {
        console.error("[festival-status] upsert retry failed", err2);
        throw err2; // rethrow to be handled by outer catch
      }
    }

    // If caller asked to set classificaIndex but the upsert above didn't apply it
    // (client/schema mismatch), attempt a direct SQL update as a fallback.
    if (typeof classificaIndex === "number" && !appliedClassifica) {
      try {
        await prisma.$executeRaw`UPDATE festivalstatus SET classificaIndex = ${classificaIndex} WHERE id = 1`;
        // refetch to reflect the change
        updated = await prisma.festivalStatus.findUnique({
          where: { id: 1 },
          include: {
            song: { include: { votes: { where: { night: currentNight } } } },
            lastSong: { include: { votes: { where: { night: currentNight } } } },
          },
        });
      } catch (err3) {
        console.error("[festival-status] raw update classificaIndex failed", err3);
      }
    }

    await pusher.trigger("festival", "status-update", {
      ...updated,
      song: updated?.song ? { ...updated.song, votes: [] } : null,
      lastSong: updated?.lastSong ? { ...updated.lastSong, votes: [] } : null,
      eventIndex: updated?.eventIndex ?? 0,
      classificaIndex: updated?.classificaIndex ?? classificaIndex ?? 0,
    });

    if (roomCode) {
      if (type === "esibizione" && updated.song)
        await notify(roomCode, `Ora in scena: ${updated.song.artist} — ${updated.song.title} 🎤`, "alert");
      if (type === "votazione" && updated.song)
        await notify(roomCode, `Vota ${updated.song.title}! 🗳️`, "alert");
      if (type === "presentazione")
        await notify(roomCode, "Carlo Conti sta presentando il prossimo artista 🎙️", "stat");
      if (type === "spot") { await notify(roomCode, "Pubblicità — torniamo tra poco 📺", "stat"); void scheduleStats(roomCode); }
      if (type === "pausa") { await notify(roomCode, "Pausa tecnica ⏸️", "stat"); void scheduleStats(roomCode); }
      if (type === "attesa") await notify(roomCode, "La serata sta per iniziare… 🎭", "stat");
      if (type === "fine") {
        const stats = await getNightStats(roomCode);
        await notify(roomCode, "La serata è finita! Grazie per aver partecipato 🌟", "alert");
        if (stats.bestSong) setTimeout(() => notify(roomCode, `Canzone più amata: ${stats.bestSong} 🏆`, "alert"), 3000);
        if (stats.averageTotal !== null) setTimeout(() => notify(roomCode, `Media serata: ${stats.averageTotal!.toFixed(1)} ⭐`, "stat"), 7000);
      }
      if (["presentazione", "spot", "pausa"].includes(type)) {
        const songForStats = updated.song ?? updated.lastSong;
        if (songForStats?.votes?.length) {
          const vals = songForStats.votes.map((v) => v.value);
          const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
          const max = Math.max(...vals);
          const min = Math.min(...vals);
          setTimeout(() => notify(roomCode, `Voto finale: ${avg.toFixed(1)} ⭐`, "stat"), 2000);
          const topVote = songForStats.votes.find((v) => v.value === max)!;
          const lowVote = songForStats.votes.find((v) => v.value === min)!;
          const topProfile = await prisma.profile.findUnique({ where: { id: topVote.profile_id } });
          const lowProfile = await prisma.profile.findUnique({ where: { id: lowVote.profile_id } });
          if (topProfile) setTimeout(() => notify(roomCode, `Più generoso: ${topProfile.username} con ${max} 😄`, "stat"), 6000);
          if (lowProfile && lowProfile.id !== topProfile?.id) setTimeout(() => notify(roomCode, `Più severo: ${lowProfile.username} con ${min} 😤`, "stat"), 10000);
          if (max - min >= 5) setTimeout(() => notify(roomCode, `Grande divisione! (${(max - min).toFixed(1)} punti) 🤔`, "alert"), 14000);
        }
      }
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("[festival-status] POST error", err);
    return NextResponse.json({ error: "Errore aggiornamento stato", details: String(err) }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const roomCode = searchParams.get("roomCode");
    const userToken = searchParams.get("userToken");

    const currentNight = await getCurrentNight();

    let status = await prisma.festivalStatus.findUnique({
      where: { id: 1 },
      include: {
        song: { include: { votes: { where: { night: currentNight } } } },
        lastSong: { include: { votes: { where: { night: currentNight } } } },
      },
    });

    if (!status) {
      status = await prisma.festivalStatus.create({
        data: { id: 1, type: "attesa", songId: null, lastSongId: null, eventIndex: 0 },
        include: {
          song: { include: { votes: { where: { night: currentNight } } } },
          lastSong: { include: { votes: { where: { night: currentNight } } } },
        },
      });
    }

    const referenceSong = status.song ?? status.lastSong ?? null;

    let hasVoted = false;
    if (userToken && referenceSong) {
      let profileId: number | null = null;
      if (userToken.startsWith("profile_")) {
        profileId = parseInt(userToken.replace("profile_", ""));
      } else {
        const m = await prisma.roomMember.findUnique({
          where: { userToken },
          select: { profile_id: true },
        });
        profileId = m?.profile_id ?? null;
      }
      if (profileId) {
        const existing = await prisma.vote.findFirst({
          where: { profile_id: profileId, song_id: referenceSong.id, night: currentNight },
        });
        hasVoted = !!existing;
      }
    }

    return NextResponse.json({ 
      id: status.id,
      type: status.type,
      songId: status.songId,
      lastSongId: status.lastSongId,
      eventIndex: status.eventIndex ?? 0,
      classificaIndex: status.classificaIndex ?? 0,
      updatedAt: status.updatedAt,
      song: referenceSong, 
      hasVoted 
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Errore fetch stato" }, { status: 500 });
  }
}