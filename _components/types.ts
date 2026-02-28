// types.ts
export type Profile = {
  id: number;
  username: string;
  approved: boolean;
};
export type RoomMember = {
  id: number;
  room_id: number;
  profile_id: number;
  isHost: boolean;
  userToken: string;
  profile: Profile;
};
// "User" piatto usato dai componenti figli — unisce RoomMember + Profile
export type User = {
  id: number;          // RoomMember.id
  profile_id: number;  // Profile.id — usato per matchare i voti
  username: string;
  isHost: boolean;
  userToken: string;
};
export type UserRoom = {
  code: string;
  id: number;
  name?: string | null;
  userToken: string;
};
export type Vote = {
  id: number;
  value: number;
  profile_id: number;
  user_id?: number;    // alias compatibilità componenti vecchi
  song_id: number;
  night: number;
  created_at?: string;
};
export type Song = {
  id: number;
  title: string;
  artist: string;
  image_url?: string | null;
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
  id: number;
  type: FestivalType;
  songId: number | null;
  lastSongId?: number | null;
  song: Song | null;
  lastSong?: Song | null;
  hasVoted?: boolean;
  eventIndex?: number;
  classificaIndex?: number;
  aiTesto: string | null;
  aiCommentoAt: string | null;
};
export type VotePhase = "idle" | "submitting" | "done";
export type Room = {
  id: number;
  code: string;
  name?: string | null;
  night?: number | null;
  members: RoomMember[];
};
export type Comment = {
  id: number;
  text: string;
  likes: number;
  dislikes: number;
  user: { username: string };
};
export type FloatingReaction = {
  id: number;
  emoji: string;
  x: number;
};