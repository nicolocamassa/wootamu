// types.ts — tipi condivisi tra tutti i componenti del festival
export type Vote = {
  id: number;
  user_id: number;
  song_id?: number;
  value: number;
};
export type Song = {
  id: number;
  title: string;
  artist: string;
  image_url?: string;
  image_url_nobg?: string;
  votes: Vote[];
};
export type FestivalType =
  | "attesa"
  | "presentazione"
  | "esibizione"
  | "votazione"
  | "spot"
  | "pausa"
  | "classifica"
  | "fine";
export type FestivalStatus = {
  type: FestivalType;
  songId?: number | null;
  lastSongId?: number | null;
  song?: Song | null;
};
export type User = {
  id: number;
  username: string;
};
export type Comment = {
  id: number;
  text: string;
  likes: number;
  dislikes: number;
  user: { username: string };
};
export type UserRoom = {
  code: string;
  id: number;
  event: string | null;
  userToken: string;
};
export type FloatingReaction = {
  id: number;
  emoji: string;
  x: number;
};
export type VotePhase =
  | "idle"
  | "open"
  | "submitting"
  | "done";