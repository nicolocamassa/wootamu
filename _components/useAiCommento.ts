// useAiCommento.ts
import { useState, useEffect, useRef, useCallback } from "react";
import { SERATA_TIMELINE } from "@/_lib/timeline";

const AI_STATES = ["esibizione", "presentazione", "spot", "pausa", "attesa", "ospite", "collegamento"];

const MIN_INTERVAL = 25_000;
const MAX_INTERVAL = 55_000;
const COMMENT_DURATION = 7_000;

interface AiCommentoState {
  visible: boolean;
  testo: string;
  loading: boolean;
  triggerNow: () => void;
}

interface UseAiCommentoOptions {
  type: string | undefined;
  eventIndex?: number;
  songTitle?: string;
  songArtist?: string;
  enabled?: boolean;
  isHost?: boolean;
  // Arrivano dal polling di festival-status
  aiTesto?: string | null;
  aiCommentoAt?: string | null;
}

export function useAiCommento({
  type,
  eventIndex,
  songTitle,
  songArtist,
  enabled = true,
  isHost = false,
  aiTesto: serverAiTesto,
  aiCommentoAt: serverAiCommentoAt,
}: UseAiCommentoOptions): AiCommentoState {

  const [visible, setVisible] = useState(false);
  const [testo, setTesto] = useState("");
  const [loading, setLoading] = useState(false);

  // ── Tutti i client: reagiscono al testo arrivato dal server ──
  const lastShownAtRef = useRef<string | null>(null);
  const hideTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!serverAiTesto || !serverAiCommentoAt) return;
    // Mostra solo se è un commento nuovo (timestamp cambiato)
    if (serverAiCommentoAt === lastShownAtRef.current) return;
    lastShownAtRef.current = serverAiCommentoAt;

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setTesto(serverAiTesto);
    setVisible(true);

    hideTimerRef.current = setTimeout(() => {
      setVisible(false);
    }, COMMENT_DURATION);
  }, [serverAiTesto, serverAiCommentoAt]);

  // Reset quando cambia tipo di stato
  useEffect(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setVisible(false);
    setTesto("");
    lastShownAtRef.current = null;
  }, [type]);

  // ── Solo host: genera il tick a intervalli casuali ──
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const activeTypeRef = useRef<string | undefined>(undefined);

  const buildPayload = useCallback((currentType: string) => {
    const event = eventIndex !== undefined ? SERATA_TIMELINE[eventIndex] : undefined;
    const payload: Record<string, any> = { type: currentType, songTitle, songArtist };
    if (event) {
      payload.eventType = event.type;
      payload.label = event.label;
      if ("description" in event) payload.description = event.description;
      if ("guest" in event) payload.guest = event.guest;
      if ("presenter" in event) payload.presenter = event.presenter;
      if ("coverTitle" in event) payload.coverTitle = event.coverTitle;
      if ("songs" in event) payload.songs = event.songs;
      if ("aiContext" in event) payload.aiContext = (event as any).aiContext;
    }
    return payload;
  }, [eventIndex, songTitle, songArtist]);

  const fireTick = useCallback(async (currentType: string) => {
    if (!isHost || !enabled) return;
    setLoading(true);
    try {
      const payload = buildPayload(currentType);
      console.log("[AI tick] Firing for type:", currentType, payload);
      await fetch("/api/ai-commento-tick", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      // Non leggiamo la risposta: arriverà a tutti tramite il prossimo poll di festival-status
    } catch (err) {
      console.error("[AI tick] error:", err);
    } finally {
      setLoading(false);
    }
  }, [isHost, enabled, buildPayload]);

  const scheduleNext = useCallback((currentType: string) => {
    const delay = MIN_INTERVAL + Math.random() * (MAX_INTERVAL - MIN_INTERVAL);
    console.log(`[AI tick] Prossimo commento tra ${Math.round(delay / 1000)}s`);
    timerRef.current = setTimeout(() => {
      if (activeTypeRef.current === currentType) {
        fireTick(currentType);
        scheduleNext(currentType);
      }
    }, delay);
  }, [fireTick]);

  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    activeTypeRef.current = type;

    if (!isHost || !type || !AI_STATES.includes(type) || !enabled) return;

    const initialDelay = 3_000 + Math.random() * 5_000;
    console.log(`[AI tick] Host: primo commento tra ${Math.round(initialDelay / 1000)}s`);
    timerRef.current = setTimeout(() => {
      if (activeTypeRef.current === type) {
        fireTick(type);
        scheduleNext(type);
      }
    }, initialDelay);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [type, isHost, enabled]);

  const triggerNow = useCallback(() => {
    if (!type || !AI_STATES.includes(type)) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    fireTick(type);
    scheduleNext(type);
  }, [type, fireTick, scheduleNext]);

  return { visible, testo, loading, triggerNow };
}