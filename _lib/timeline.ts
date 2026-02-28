// _lib/timeline.ts

export type TimelineEventType =
  | "ospite"
  | "presentazione"
  | "esibizione"
  | "spot"
  | "collegamento"
  | "fine"
  | "momento_speciale"
  | "premio"
  | "stop_televoto"
  | "classifica_finale";

type EventBase = {
  time: string;
  label: string;
  duration?: string;
  presenter?: string;
};

export type TimelineEvent = EventBase & (
  | {
      type: "ospite";
      description: string;
      guest: string;
      songs?: string[];
    }
  | {
      type: "presentazione";
      description?: string;
      guest?: string;
      songs?: string[];
    }
  | {
      type: "esibizione";
      songId?: number;
      coverTitle: string;
      description?: string;
      televotoCode?: string;
    }
  | {
      type: "spot";
    }
  | {
      type: "collegamento";
      description: string;
      guest?: string;
      songs?: string[];
    }
  | {
      type: "fine";
      description: string;
    }
);

export const SERATA_TIMELINE: TimelineEvent[] = [
  {
    time: "20:40",
    type: "ospite",
    label: "Apertura con Laura Pausini",
    description: "Opening live tra platea e palco con la band.",
    presenter: "Carlo Conti",
    guest: "Laura Pausini",
    songs: ["Ritorno ad amare", "Immensamente", "Io canto"],
    duration: "7'",
  },
  {
    time: "20:47",
    type: "presentazione",
    label: "Regolamento della serata",
    description: "30 cover in gara e sistema di votazione.",
    presenter: "Carlo Conti",
    duration: "2'",
  },
  {
    time: "20:49",
    type: "presentazione",
    label: "Apertura del Televoto",
    description: "Ricordo dei codici dei 30 Big.",
    presenter: "Carlo Conti",
    duration: "2'",
  },

  {
    time: "20:51",
    type: "esibizione",
    songId: 179,
    label: "Elettra Lamborghini",
    coverTitle: "Aserejé",
    description: "Performance con corpo di ballo.",
    presenter: "Carlo Conti",
    televotoCode: "01",
    duration: "3'05\"",
  },
  {
    time: "20:57",
    type: "esibizione",
    songId: 180,
    label: "Eddie Brock",
    coverTitle: "Portami via",
    description: "Versione live intensa e diretta.",
    presenter: "Carlo Conti",
    televotoCode: "02",
    duration: "3'06\"",
  },

  { time: "21:03", type: "spot", label: "Pausa pubblicitaria", duration: "5'" },

  {
    time: "21:08",
    type: "presentazione",
    label: "Ingresso di Mister X",
    description: "Intervento speciale sul palco.",
    presenter: "Carlo Conti",
    guest: "Mister X",
    duration: "3'",
  },

  {
    time: "21:11",
    type: "esibizione",
    songId: 181,
    label: "Mara Sattei",
    coverTitle: "L'ultimo bacio",
    description: "Arrangiamento orchestrale dal vivo.",
    presenter: "Carlo Conti e Mister X",
    televotoCode: "03",
    duration: "2'52\"",
  },

  {
    time: "21:17",
    type: "presentazione",
    label: "Rientro di Laura Pausini",
    description: "Nuovo look e breve intervento.",
    presenter: "Carlo Conti",
    guest: "Laura Pausini",
    duration: "1'",
  },

  {
    time: "21:18",
    type: "esibizione",
    songId: 182,
    label: "Patty Pravo",
    coverTitle: "Ti lascio una canzone",
    presenter: "Carlo Conti e Laura Pausini",
    televotoCode: "04",
    duration: "3'00\"",
  },

  {
    time: "21:24",
    type: "presentazione",
    label: "Ingresso di Bianca Balti",
    presenter: "Carlo Conti e Laura Pausini",
    guest: "Bianca Balti",
    duration: "3'",
  },

  {
    time: "21:27",
    type: "esibizione",
    songId: 154,
    label: "Levante",
    coverTitle: "I maschi",
    presenter: "Carlo Conti, Laura Pausini e Bianca Balti",
    televotoCode: "05",
    duration: "2'55\"",
  },

  {
    time: "21:39",
    type: "spot",
    label: "Pausa pubblicitaria",
    duration: "5'",
  },

  {
    time: "22:08",
    type: "presentazione",
    label: "Momento TIM",
    description: "Il pubblico canta “L’Italiano”.",
    presenter: "Carlo Conti",
    songs: ["L'Italiano"],
    duration: "3'",
  },

  {
    time: "22:43",
    type: "collegamento",
    label: "Suzuki Stage con Francesco Gabbani",
    description: "Live da Piazza Colombo.",
    guest: "Francesco Gabbani",
    songs: ["Viva la vita"],
    duration: "6'",
  },

  {
    time: "23:23",
    type: "ospite",
    label: "Premio alla Carriera a Caterina Caselli",
    description: "Consegna del riconoscimento ufficiale.",
    presenter: "Carlo Conti e Laura Pausini",
    guest: "Caterina Caselli",
    duration: "6'",
  },

  {
    time: "23:41",
    type: "collegamento",
    label: "Live dalla nave con Max Pezzali",
    description: "Collegamento speciale dalla Costa Toscana.",
    guest: "Max Pezzali",
    songs: ["Gli anni"],
    duration: "6'",
  },

  {
    time: "00:46",
    type: "ospite",
    label: "Intervento di Vincenzo Schettini",
    description: "Momento di riflessione sul palco.",
    presenter: "Carlo Conti",
    guest: "Vincenzo Schettini",
    duration: "4'",
  },

  {
    time: "01:15",
    type: "presentazione",
    label: "Chiusura del Televoto",
    description: "Stop ufficiale alle votazioni.",
    presenter: "Carlo Conti",
    duration: "1'",
  },

  {
    time: "01:22",
    type: "fine",
    label: "Classifica finale e vincitore",
    description: "Annuncio della top 10 e nuova esibizione del vincitore.",
    presenter: "Carlo Conti, Laura Pausini, Bianca Balti e Mister X",
    duration: "8'",
  },
];