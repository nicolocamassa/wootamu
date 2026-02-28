// /app/api/ai-commento/route.ts
import { NextRequest, NextResponse } from "next/server";

const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = "llama-3.1-8b-instant";

const SYSTEM_PROMPT = `Sei un cinico commentatore del basso Salento.
REGOLA TASSATIVA: DEVI RISPONDERE CON MASSIMO 4-6 PAROLE. NON UNA DI PIÙ.
Sii un cecchino: fulmineo, rozzo, letale e comico. ZERO emoji. ZERO punteggiatura inutile. Non descrivere, spara la battuta.
Alterna insulti allo show a frecciate ai tuoi amici:
- MANUEL: tappo, barbuto, riccio, stonato.
- MATTIA: scroccone, sfasciabici.
- NICOLÒ: un re. Manuel e Mattia devono dargli 10 euro, subito.
Esempi di tono: "Canta peggio di Manuel.", "Mattia, caccia 10 euro a Nicolò.", "Che strazio, vado a dormire.", "Meglio il cambio rotto."`;

function buildPrompt(body: any): string {
  const { type, eventType, label, description, guest, presenter, coverTitle, songs, songTitle, songArtist, aiContext } = body;
  const effectiveType = eventType ?? type;

  // Formattiamo i dati come un telegramma asciutto. Niente convenevoli.
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

  // Chiusura secca che forza il limite
  return `${p.trim()}\n\nFai la tua battuta. MASSIMO 5 PAROLE:`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("[ai-commento] Request:", body);

    const { type, eventType } = body;
    const effectiveType = eventType ?? type;

    if (!effectiveType) {
      return NextResponse.json({ error: "Tipo non valido" }, { status: 400 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    console.log("[ai-commento] API key present:", !!apiKey);
    if (!apiKey) {
      return NextResponse.json({ error: "GROQ_API_KEY mancante nel .env.local" }, { status: 500 });
    }

    const userPrompt = buildPrompt(body);
    console.log("[ai-commento] Prompt:", userPrompt);

    const response = await fetch(GROQ_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userPrompt },
        ],
        // TRUCCO: Abbassiamo i max_tokens drasticamente! 
        // 15 token sono fisicamente sufficienti per ~6/7 parole.
        // Questo taglia la testa al toro se il modello prova a dilungarsi.
        max_tokens: 15, 
        temperature: 1.2, // Leggermente più alto per battute più assurde e creative
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("[ai-commento] Groq error", response.status, errText);
      return NextResponse.json({ error: "Errore Groq", detail: errText }, { status: 500 });
    }

    const data = await response.json();
    let testo = data.choices?.[0]?.message?.content?.trim() ?? "";
    
    // Fallback di pulizia: se l'IA per qualche motivo va lunga e viene tagliata dal max_tokens (finendo senza punto), la "riassumiamo" noi
    if (testo.split(" ").length > 8) {
        testo = testo.split(" ").slice(0, 6).join(" ") + "...";
    }

    console.log("[ai-commento] Success:", testo);

    return NextResponse.json({ testo });
  } catch (err) {
    console.error("[ai-commento] CRASH:", err);
    return NextResponse.json({ error: "Errore interno", detail: String(err) }, { status: 500 });
  }
}