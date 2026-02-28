// /app/api/ai-commento-tick/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/_lib/prisma";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-8b-instant";
const MIN_INTERVAL_MS = 25_000;

const SYSTEM_PROMPT = `Sei un cinico commentatore del basso Salento.
REGOLA TASSATIVA: DEVI RISPONDERE CON MASSIMO 4-6 PAROLE. NON UNA DI PIÙ.
Sii un cecchino: fulmineo, rozzo, letale e comico. ZERO emoji. ZERO punteggiatura inutile. Non descrivere, spara la battuta.
Alterna insulti allo show a frecciate ai tuoi amici:
- MANUEL: tappo, barbuto, riccio, stonato.
- MATTIA: scroccone, sfasciabici.
- NICOLÒ: un re. Manuel e Mattia devono dargli 10 euro, subito.
Esempi di tono: "Canta peggio di Manuel.", "Mattia, caccia 10 euro a Nicolò.", "Che strazio, vado a dormire.", "Meglio il cambio rotto."`;

function buildPrompt(body: any): string {
  const { type, eventType, label, description, guest, presenter, coverTitle, songTitle, songArtist, aiContext } = body;
  const effectiveType = eventType ?? type;
  let contextStr = aiContext ? ` | Nota: ${aiContext}` : "";
  let p = "";
  switch (effectiveType) {
    case "esibizione":
      p = `Esibizione: ${label ?? songArtist ?? "N/A"} canta "${coverTitle ?? songTitle ?? "N/A"}". Presenta ${presenter ?? "N/A"}${contextStr}`;
      break;
    case "ospite":
      p = `Ospite sul palco: ${guest ?? "N/A"}${contextStr}`;
      break;
    case "presentazione":
      p = `Presentazione: ${label ?? "N/A"}. Ospite: ${guest ?? "N/A"}${contextStr}`;
      break;
    case "collegamento":
      p = `Collegamento esterno con ${guest ?? "N/A"}${contextStr}`;
      break;
    case "spot":
      p = `Pubblicità in corso.${contextStr}`;
      break;
    case "pausa":
    case "attesa":
      p = `Pausa. Pubblico in attesa.${contextStr}`;
      break;
    default:
      p = `Evento: ${label ?? "Qualcosa succede"}. ${description ?? ""}${contextStr}`;
  }
  return `${p.trim()}\n\nFai la tua battuta. MASSIMO 5 PAROLE:`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, eventType } = body;
    const effectiveType = eventType ?? type;

    if (!effectiveType) {
      return NextResponse.json({ error: "Tipo non valido" }, { status: 400 });
    }

    // ── Throttle: evita di rigenerare se è troppo presto ──
    const current = await prisma.festivalStatus.findUnique({ where: { id: 1 } });
    if (current?.aiCommentoAt) {
      const elapsed = Date.now() - current.aiCommentoAt.getTime();
      if (elapsed < MIN_INTERVAL_MS) {
        console.log(`[ai-commento-tick] Troppo presto, elapsed: ${elapsed}ms. Skipping.`);
        return NextResponse.json({ testo: current.aiTesto ?? "", skipped: true });
      }
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GROQ_API_KEY mancante nel .env.local" }, { status: 500 });
    }

    const userPrompt = buildPrompt(body);
    console.log("[ai-commento-tick] Prompt:", userPrompt);

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        max_tokens: 15,
        temperature: 1.2,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[ai-commento-tick] Groq error", response.status, errText);
      return NextResponse.json({ error: "Errore Groq", detail: errText }, { status: 500 });
    }

    const data = await response.json();
    let testo = data.choices?.[0]?.message?.content?.trim() ?? "";
    if (testo.split(" ").length > 8) {
      testo = testo.split(" ").slice(0, 6).join(" ") + "...";
    }

    console.log("[ai-commento-tick] Testo generato:", testo);

    // ── Salva nel DB: ora tutti i client lo vedranno al prossimo poll ──
    await prisma.festivalStatus.update({
      where: { id: 1 },
      data: {
        aiTesto: testo,
        aiCommentoAt: new Date(),
      },
    });

    return NextResponse.json({ testo });
  } catch (err) {
    console.error("[ai-commento-tick] CRASH:", err);
    return NextResponse.json({ error: "Errore interno", detail: String(err) }, { status: 500 });
  }
}