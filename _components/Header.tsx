import { Radio, Users } from "lucide-react";

type StatusType =
  | "attesa"
  | "presentazione"
  | "esibizione"
  | "votazione"
  | "spot"
  | "pausa"
  | "fine";

type HeaderProps = {
  usersCount: number;
  festivalType: StatusType | null;
};

const LIVE_STATES: StatusType[] = ["presentazione", "esibizione", "votazione", "spot", "pausa"];

export default function Header({ usersCount, festivalType }: HeaderProps) {
  const isLive = festivalType ? LIVE_STATES.includes(festivalType) : false;

  return (
    <header className="w-full h-15 flex items-center justify-between px-2">
      <h1 className="font-bold text-xl">Wootamu</h1>
      <div className="flex gap-2 text-sm text-stone-500 items-center">
        {isLive ? (
          <span className="bg-red-500/35 text-red-500 rounded-full px-2 flex items-center gap-1">
            <Radio size={14} />
            Live
          </span>
        ) : (
          <span className="bg-stone-800 text-stone-400 rounded-full px-2 py-0.5 flex items-center gap-1 text-xs">
            {festivalType === "fine" ? "Serata conclusa" : "21:30"}
          </span>
        )}
        <span className="px-2 bg-stone-900 rounded-full flex items-center gap-1">
          <Users size={14} />
          {usersCount}
        </span>
      </div>
    </header>
  );
}