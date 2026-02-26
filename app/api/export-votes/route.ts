// /api/export-votes/route.ts
import { prisma } from "@/_lib/prisma";

const TARGET_PROFILES = ["Nicolino", "Manuè", "Mieru a culuni"];

export async function GET() {
  try {
    const profiles = await prisma.profile.findMany({
      where: { username: { in: TARGET_PROFILES } },
    });

    if (profiles.length === 0) {
      return new Response("Nessun profilo trovato", { status: 404 });
    }

    const users: { id: number; username: string }[] = [];
    for (const profile of profiles) {
      const user = await prisma.user.findFirst({
        where: { profile_id: profile.id },
      });
      if (user) users.push({ id: user.id, username: profile.username });
    }

    if (users.length === 0) {
      return new Response("Nessun utente trovato", { status: 404 });
    }

    // Voti con song separato (senza night su song)
    const votes = await prisma.vote.findMany({
      where: { user_id: { in: users.map((u) => u.id) } },
    });

    // Carica le canzoni separatamente
    const songIds = [...new Set(votes.map((v) => v.song_id))];
    const songs = await prisma.song.findMany({
      where: { id: { in: songIds } },
      select: { id: true, title: true, artist: true, performance_time: true },
    });
    const songById = new Map(songs.map((s) => [s.id, s]));

    const userToProfile = new Map<number, string>();
    for (const u of users) userToProfile.set(u.id, u.username);

    type SongEntry = {
      title: string;
      artist: string;
      performance_time: Date | null;
      votesByUser: Map<string, number>;
    };

    const byNight = new Map<number, Map<number, SongEntry>>();

    for (const vote of votes) {
      const night = vote.night ?? 1;
      const songId = vote.song_id;
      const username = userToProfile.get(vote.user_id) ?? "?";
      const song = songById.get(songId);
      if (!song) continue;

      if (!byNight.has(night)) byNight.set(night, new Map());
      const nightMap = byNight.get(night)!;

      if (!nightMap.has(songId)) {
        nightMap.set(songId, {
          title: song.title,
          artist: song.artist,
          performance_time: song.performance_time,
          votesByUser: new Map(),
        });
      }

      nightMap.get(songId)!.votesByUser.set(username, vote.value);
    }

    const lines: string[] = [];
    const sortedNights = Array.from(byNight.keys()).sort((a, b) => a - b);

    for (const night of sortedNights) {
      lines.push("=".repeat(40));
      lines.push(`SERATA ${night}`);
      lines.push("=".repeat(40));
      lines.push("");

      const songMap = byNight.get(night)!;
      const sortedSongs = Array.from(songMap.entries()).sort((a, b) => {
        const ta = a[1].performance_time?.getTime() ?? 0;
        const tb = b[1].performance_time?.getTime() ?? 0;
        return ta - tb;
      });

      for (const [, song] of sortedSongs) {
        lines.push(song.artist);
        for (const profileName of TARGET_PROFILES) {
          const val = song.votesByUser.get(profileName);
          if (val !== undefined) lines.push(`  ${profileName}: ${val}`);
        }
        lines.push("");
      }
    }

    return new Response(lines.join("\n"), {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="voti-sanremo.txt"`,
      },
    });
  } catch (err) {
    console.error("Errore export-votes:", err);
    return new Response("Errore interno server", { status: 500 });
  }
}