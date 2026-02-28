"use client";
// StatusScreens.tsx

import React from "react";
import { Mic2, Tv, PauseCircle, Clock, Star, Radio } from "lucide-react";

export const statusScreenStyles = `
  @keyframes ss-fadein {
    from { opacity: 0; transform: translateY(4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes ss-pulse {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0.2; }
  }

  .ss-root {
    display: flex;
    flex-direction: column;
    width: 100%;
    height: 100%;
    padding: 0;
    box-sizing: border-box;
    animation: ss-fadein 0.3s ease both;
  }

  /* Zona top: pill tipo — occupa spazio fisso */
  .ss-top {
    display: flex;
    justify-content: center;
    padding-top: 22px;
    flex-shrink: 0;
  }

  /* Zona centro: icona + testo + meta — si espande e centra */
  .ss-center {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 0 22px;
    gap: 0;
  }

  /* Zona bottom: footer durata/poi */
  .ss-bottom {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding-bottom: 18px;
    flex-shrink: 0;
    min-height: 36px;
  }

  /* Pill tipo */
  .ss-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: rgba(255,255,255,0.05);
    border: 1px solid rgba(255,255,255,0.08);
    color: rgba(255,255,255,0.3);
  }
  .ss-pill-dot {
    width: 5px; height: 5px; border-radius: 50%;
    flex-shrink: 0;
    animation: ss-pulse 2.5s ease-in-out infinite;
  }

  /* Icona */
  .ss-icon { margin-bottom: 16px; flex-shrink: 0; }

  /* Titolo */
  .ss-title {
    font-size: 22px;
    font-weight: 800;
    color: #ededed;
    letter-spacing: -0.3px;
    line-height: 1.2;
    margin: 0 0 8px;
  }

  /* Descrizione */
  .ss-desc {
    font-size: 12px;
    color: rgba(255,255,255,0.35);
    line-height: 1.55;
    margin: 0;
    max-width: 240px;
  }

  /* Meta dettagli */
  .ss-meta {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 5px;
    margin-top: 14px;
  }
  .ss-meta-item {
    font-size: 11px;
    color: rgba(255,255,255,0.28);
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .ss-meta-item strong {
    color: rgba(255,255,255,0.55);
    font-weight: 500;
  }

  /* Footer */
  .ss-footer-dur {
    font-family: 'DM Mono', monospace;
    font-size: 10px;
    font-weight: 500;
    color: rgba(255,255,255,0.2);
  }
  .ss-footer-dot {
    width: 2px; height: 2px; border-radius: 50%;
    background: rgba(255,255,255,0.15);
    flex-shrink: 0;
  }
  .ss-footer-next {
    font-size: 10px;
    color: rgba(255,255,255,0.25);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 180px;
  }
`;

// ── Helpers ────────────────────────────────────────────────────────────────

function minutesBetween(fromTime?: string, toTime?: string): number | null {
  if (!fromTime || !toTime) return null;
  try {
    const parse = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
    let from = parse(fromTime);
    let to = parse(toTime);
    if (to < from) to += 24 * 60;
    const diff = to - from;
    if (diff <= 0 || diff > 180) return null;
    return diff;
  } catch { return null; }
}

function fmtMins(mins: number) {
  if (mins >= 60) { const h = Math.floor(mins / 60); const m = mins % 60; return m > 0 ? `${h}h ${m}m` : `${h}h`; }
  return `${mins} min`;
}

type EventDetails = {
  label?: string;
  description?: string;
  guest?: string;
  presenter?: string;
  coverTitle?: string;
  duration?: string;
  songs?: string[];
  time?: string;
};

type Props = {
  typeLabel: string;
  dotColor: string;
  icon: React.ReactNode;
  title: string;
  desc?: string;
  meta?: { icon: string; text: React.ReactNode }[];
  eventDetails?: EventDetails;
  nextEvent?: EventDetails;
};

function StatusScreen({ typeLabel, dotColor, icon, title, desc, meta, eventDetails, nextEvent }: Props) {
  const durationMins = minutesBetween(eventDetails?.time, nextEvent?.time);
  const hasFooter = durationMins !== null || !!nextEvent?.label;

  return (
    <div className="ss-root">

      {/* TOP: pill */}
      <div className="ss-top">
        <div className="ss-pill">
          <div className="ss-pill-dot" style={{ background: dotColor }} />
          {typeLabel}
        </div>
      </div>

      {/* CENTER: tutto il contenuto */}
      <div className="ss-center">
        <div className="ss-icon">{icon}</div>
        <h2 className="ss-title">{title}</h2>
        {desc && <p className="ss-desc">{desc}</p>}
        {meta && meta.length > 0 && (
          <div className="ss-meta">
            {meta.map((m, i) => (
              <div key={i} className="ss-meta-item">
                <span>{m.text}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* BOTTOM: durata + poi */}
      <div className="ss-bottom">
        {hasFooter && (
          <>
            {durationMins !== null && (
              <span className="ss-footer-dur">{fmtMins(durationMins)}</span>
            )}
            {durationMins !== null && nextEvent?.label && (
              <div className="ss-footer-dot" />
            )}
            {nextEvent?.label && (
              <span className="ss-footer-next">poi {nextEvent.label}</span>
            )}
          </>
        )}
      </div>

    </div>
  );
}

// ── Export per tipo ────────────────────────────────────────────────────────

export function ScreenPresentazione({ eventDetails, nextEvent }: { eventDetails?: EventDetails; nextEvent?: EventDetails }) {
  const meta: { icon: string; text: React.ReactNode }[] = [];
  if (eventDetails?.presenter) meta.push({ icon: "🎙️", text: eventDetails.presenter });
  if (eventDetails?.guest) meta.push({ icon: "👤", text: <strong>{eventDetails.guest}</strong> });

  return (
    <StatusScreen
      typeLabel="Presentazione"
      dotColor="rgba(212,175,55,0.7)"
      icon={<Mic2 size={26} strokeWidth={1.5} color="rgba(212,175,55,0.6)" />}
      title={eventDetails?.description ?? eventDetails?.label ?? "Presentazione"}
      desc={eventDetails?.description && eventDetails?.label ? eventDetails.label : undefined}
      meta={meta}
      eventDetails={eventDetails}
      nextEvent={nextEvent}
    />
  );
}

export function ScreenSpot({ eventDetails, nextEvent }: { eventDetails?: EventDetails; nextEvent?: EventDetails }) {
  return (
    <StatusScreen
      typeLabel="Pubblicità"
      dotColor="rgba(147,197,253,0.6)"
      icon={<Tv size={26} strokeWidth={1.5} color="rgba(147,197,253,0.55)" />}
      title="Pubblicità"
      desc="Torniamo tra poco"
      eventDetails={eventDetails}
      nextEvent={nextEvent}
    />
  );
}

export function ScreenPausa({ eventDetails, nextEvent }: { eventDetails?: EventDetails; nextEvent?: EventDetails }) {
  return (
    <StatusScreen
      typeLabel="Pausa"
      dotColor="rgba(255,255,255,0.3)"
      icon={<PauseCircle size={26} strokeWidth={1.5} color="rgba(255,255,255,0.28)" />}
      title={eventDetails?.description ?? "Pausa tecnica"}
      desc={eventDetails?.description && eventDetails?.label ? eventDetails.label : undefined}
      eventDetails={eventDetails}
      nextEvent={nextEvent}
    />
  );
}

export function ScreenAttesa({ eventDetails, nextEvent }: { eventDetails?: EventDetails; nextEvent?: EventDetails }) {
  return (
    <StatusScreen
      typeLabel="In attesa"
      dotColor="rgba(255,255,255,0.25)"
      icon={<Clock size={26} strokeWidth={1.5} color="rgba(255,255,255,0.25)" />}
      title={eventDetails?.description ?? "La serata inizia tra poco"}
      desc={eventDetails?.label}
      eventDetails={eventDetails}
      nextEvent={nextEvent}
    />
  );
}

export function ScreenFine() {
  return (
    <StatusScreen
      typeLabel="Fine serata"
      dotColor="rgba(212,175,55,0.7)"
      icon={<Star size={26} strokeWidth={1.5} color="rgba(212,175,55,0.6)" />}
      title="Grazie per aver partecipato"
      desc="Sanremo 2026"
    />
  );
}

export function ScreenOspite({ eventDetails, nextEvent }: { eventDetails?: EventDetails; nextEvent?: EventDetails }) {
  const meta: { icon: string; text: React.ReactNode }[] = [];
  if (eventDetails?.songs?.length)
    meta.push({ icon: "🎵", text: eventDetails.songs.join(" · ") });
  else if (eventDetails?.coverTitle)
    meta.push({
      icon: "🎵",
      text: (
        <>
          <strong>{eventDetails.coverTitle}</strong>
          {eventDetails.duration && (
            <span style={{ color: "rgba(255,255,255,0.22)", marginLeft: 6 }}>{eventDetails.duration}</span>
          )}
        </>
      ),
    });

  return (
    <StatusScreen
      typeLabel="Ospite"
      dotColor="rgba(196,181,253,0.6)"
      icon={<Star size={26} strokeWidth={1.5} color="rgba(196,181,253,0.55)" />}
      title={eventDetails?.guest ?? eventDetails?.label ?? "Ospite"}
      desc={eventDetails?.description}
      meta={meta}
      eventDetails={eventDetails}
      nextEvent={nextEvent}
    />
  );
}

export function ScreenCollegamento({ eventDetails, nextEvent }: { eventDetails?: EventDetails; nextEvent?: EventDetails }) {
  return (
    <StatusScreen
      typeLabel="Collegamento"
      dotColor="rgba(94,234,212,0.6)"
      icon={<Radio size={26} strokeWidth={1.5} color="rgba(94,234,212,0.55)" />}
      title={eventDetails?.description ?? eventDetails?.label ?? "Collegamento"}
      desc={eventDetails?.description && eventDetails?.label ? eventDetails.label : undefined}
      eventDetails={eventDetails}
      nextEvent={nextEvent}
    />
  );
}