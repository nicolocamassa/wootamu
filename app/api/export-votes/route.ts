// /api/export-votes/route.ts
import { prisma } from "@/_lib/prisma";
const TARGET_PROFILES = ["Nicolino", "Manuè", "Mieru a culuni"];
export async function GET() {
  try {
    const profiles = await prisma.profile.findMany({ where: { username: { in: TARGET_PROFILES } } });
    if (profiles.length === 0) return new Response("Nessun profilo trovato", { status: 404 });
    const votes = await prisma.vote.findMany({ where: { profile_id: { in: profiles.map((p) => p.id) } } });
    const songIds = [...new Set(votes.map((v) => v.song_id))];
    const songs = await prisma.song.findMany({
      where: { id: { in: songIds } },
      select: { id: true, title: true, artist: true, performances: { select: { performance_time: true, night: true } } },
    });
    const songById = new Map(songs.map((s) => [s.id, s]));
    const profileById = new Map(profiles.map((p) => [p.id, p.username]));
    type SongEntry = { title: string; artist: string; performance_time: Date | null; votesByUser: Map<string, number> };
    const byNight = new Map<number, Map<number, SongEntry>>();
    for (const vote of votes) {
      const night = vote.night ?? 1;
      const song = songById.get(vote.song_id); if (!song) continue;
      const username = profileById.get(vote.profile_id) ?? "?";
      const perf = song.performances.find((p) => p.night === night);
      if (!byNight.has(night)) byNight.set(night, new Map());
      const nm = byNight.get(night)!;
      if (!nm.has(vote.song_id)) nm.set(vote.song_id, { title: song.title, artist: song.artist, performance_time: perf?.performance_time ?? null, votesByUser: new Map() });
      nm.get(vote.song_id)!.votesByUser.set(username, vote.value);
    }
    const lines: string[] = [];
    for (const night of Array.from(byNight.keys()).sort((a, b) => a - b)) {
      lines.push("=".repeat(40)); lines.push(`SERATA ${night}`); lines.push("=".repeat(40)); lines.push("");
      const sorted = Array.from(byNight.get(night)!.entries()).sort((a, b) => (a[1].performance_time?.getTime() ?? 0) - (b[1].performance_time?.getTime() ?? 0));
      for (const [, s] of sorted) {
        lines.push(s.artist);
        for (const n of TARGET_PROFILES) { const v = s.votesByUser.get(n); if (v !== undefined) lines.push(`  ${n}: ${v}`); }
        lines.push("");
      }
    }
    return new Response(lines.join("\n"), { headers: { "Content-Type": "text/plain; charset=utf-8", "Content-Disposition": `attachment; filename="voti-sanremo.txt"` } });
  } catch (err) { console.error(err); return new Response("Errore interno server", { status: 500 }); }
}