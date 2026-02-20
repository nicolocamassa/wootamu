import SongForm from "./AddSong";

export default async function AddSongsPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;

  return <SongForm roomCode={code} />;
}

