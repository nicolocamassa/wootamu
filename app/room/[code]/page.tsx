import RoomClient from "@/_components/RoomClient";

// 1. Aggiungi "async" e aggiorna i tipi di params in Promise
export default async function RoomPage({ params }: { params: Promise<{ code: string }> }) {
  // 2. Fai l'await dei params
  const resolvedParams = await params;
  
  // 3. Ora puoi usare resolvedParams.code in sicurezza
  return <RoomClient roomCode={resolvedParams.code} />;
}