import PusherJS from "pusher-js";

PusherJS.logToConsole = false;

export const pusherClient = new PusherJS(
  process.env.NEXT_PUBLIC_PUSHER_KEY!,
  { cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER! }
);

// Canale sottoscritto UNA SOLA VOLTA a livello di modulo
export const festivalChannel = pusherClient.subscribe("festival");

// ─── Event bus a livello di modulo ────────────────────────────────────────────
// Invece di fare bind/unbind da React (che con StrictMode causa doppi handler
// o handler rimossi), registriamo UN SOLO handler per evento sul canale Pusher
// e dispatchamo a tutti i listener registrati tramite questo bus.
// React può registrare/rimuovere listener dal bus senza toccare Pusher.

type Listener<T = unknown> = (data: T) => void;
const listeners: Record<string, Set<Listener>> = {};

function getListeners(event: string): Set<Listener> {
  if (!listeners[event]) listeners[event] = new Set();
  return listeners[event];
}

// Registra un solo handler Pusher per ogni evento, che fa da dispatcher
const boundEvents = new Set<string>();
function ensureBound(event: string) {
  if (boundEvents.has(event)) return;
  boundEvents.add(event);
  festivalChannel.bind(event, (data: unknown) => {
    getListeners(event).forEach((fn) => fn(data));
  });
}

/** Aggiunge un listener per un evento Pusher. Sicuro con React StrictMode. */
export function onFestivalEvent<T = unknown>(event: string, fn: Listener<T>): () => void {
  ensureBound(event);
  const set = getListeners(event);
  set.add(fn as Listener);
  // Restituisce la funzione di cleanup — React può chiamarla liberamente
  return () => { set.delete(fn as Listener); };
}