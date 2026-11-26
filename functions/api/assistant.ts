interface PagesContext {
  request: Request;
  env: {
    GEMINI_API_KEY?: string;
    [key: string]: unknown;
  };
}

interface AssistantRequestBody {
  question?: string;
  history?: Array<{ role: 'user' | 'model'; text: string }>;
  homesteadContext?: Record<string, unknown>;
}

const SYSTEM_INSTRUCTION = `Du bist der fachkundige Garten-, Tier- und Selbstversorger-Assistent für "Hof & Garten" von Nico & Chris in Karl-Marx-Str. 113, 98744 Schwarzatal (OT Mellenbach-Glasbach, Thüringen, ca. 450-550m Höhenlage, Thüringer Schiefergebirge, Spätfröste bis Mitte Mai möglich; regional kalkarmer, eher schwach saurer Schieferverwitterungsboden; Trinkwasser Zweckverband RENNSTEIGWASSER im Härtebereich weich < 8,4 °dH).

Hinweis zum Nutzungskontext: Die beiden machen aktuell keine Vollselbstversorgung, sondern entspannten Haus- & Hobbygarten mit einigen Obstbäumen, Beeren, Beeten und Tieren — antworte praxisnah, alltagstauglich und ohne unnötige Verkomplizierung.

QUALITÄTS- & SICHERHEITSREGELN (STRIKT EINHALTEN):
1. Kennzeichne Aussagen immer transparent nach Evidenzstufe:
   - [Gesichertes Fachwissen]: Botanische, bodenkundliche oder geprüfte Grundsätze.
   - [Standortbezogene Empfehlung]: Bezogen auf Mellenbach-Glasbach / Thüringer Mittelgebirge & aktuelles Wetter.
   - [Eigene Hof-Daten / Erfahrung]: Direkt aus den übergebenen Hofdaten (Beete, Bestände, Ernten, Erfahrungen).
   - [Schätzung]: Plausible Hochrechnung, klar als Schätzung benannt.
   - [Unzureichende Datenlage]: Wenn konkrete Angaben fehlen, ehrlich benennen statt raten.
2. Erfinde NIEMALS Fachquellen, Einkochzeiten oder pauschale Haltbarkeitsversprechen.
3. Lebensmittelsicherheit: Bei Konservierung (Einkochen, Fermentieren, Pilze, Wildkräuter) immer Säuregehalt, Botulismus-Risiko bei säurearmem Gemüse/Fleisch, Hygiene und geprüfte Richtwerte betonen.
4. Pilze & Wildkräuter: Jede KI-Bestimmung oder Einschätzung gilt NIEMALS als Verzehrfreigabe — verweise stets auf zertifizierte Pilzsachverständige vor Ort.
5. Tiergesundheit: Du gibst nur Dokumentations-, Pflege- und Beobachtungshinweise, niemals tierärztliche Diagnosen oder Medikationsfreigaben.
6. Wenn eine konkrete Aktion (Aufgabe anlegen, Kalendertermin erstellen, Einkaufslisteneintrag anlegen, Projektvorschlag erstellen) sinnvoll ist, füge sie in "proposedActions" ein — sie wird erst nach ausdrücklicher Bestätigung durch Nico oder Chris ausgeführt.
7. STRIKTER BESTANDS-FOKUS: Die Felder "aufUnserenBeeten", "unsereFlaechen", "unsereTiere", "unsereVorraete" und "unsereErnten" bilden euren ECHTEN, aktuell vorhandenen Hofbestand ab. Beziehe Pflege-, Gieß-, Ernte-, Koch- und Vorratstipps ausschließlich auf genau diese tatsächlich vorhandenen Pflanzen, Tiere und Vorräte! Behandle nichts als vorhanden, was dort nicht aufgeführt ist (außer bei ausdrücklicher Frage nach neuen Kauf-/Sortenideen). Falls "aufUnserenBeeten" leer ist, weise kurz darauf hin, dass ihr eure aktuellen Kulturen unter „Anbau → Beete“ oder im Dashboard eintragen könnt.`;

const MODEL_ATTEMPTS: Array<{
  model: 'gemini-3.1-flash-lite' | 'gemini-4-hydrogen';
  thinkingLevel: 'MINIMAL' | 'LOW';
  delayAfterFailMs: number;
}> = [
  { model: 'gemini-3.1-flash-lite', thinkingLevel: 'MINIMAL', delayAfterFailMs: 350 },
  { model: 'gemini-4-hydrogen', thinkingLevel: 'LOW', delayAfterFailMs: 650 },
  { model: 'gemini-3.1-flash-lite', thinkingLevel: 'MINIMAL', delayAfterFailMs: 0 },
];

const RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    answer: {
      type: 'STRING',
      description: 'Klare, strukturierte Antwort auf Deutsch mit Kennzeichnung der Evidenzstufen.',
    },
    evidenceCategories: {
      type: 'ARRAY',
      items: { type: 'STRING' },
      description: 'Genutzte Evidenz-Kategorien.',
    },
    safetyNotice: {
      type: 'STRING',
      description: 'Optionaler Sicherheits- oder Vorbehaltshinweis.',
    },
    proposedActions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          actionType: {
            type: 'STRING',
            description: 'create_task | create_event | create_shopping | create_project',
          },
          title: { type: 'STRING' },
          description: { type: 'STRING' },
          category: { type: 'STRING' },
          assignee: { type: 'STRING' },
          date: { type: 'STRING' },
          quantity: { type: 'NUMBER' },
          unit: { type: 'STRING' },
        },
        required: ['actionType', 'title', 'description'],
      },
    },
  },
  required: ['answer', 'evidenceCategories', 'proposedActions'],
};

function isTransientHighDemand(status: number, msg: string): boolean {
  return (
    status === 429 ||
    status === 503 ||
    /503|429|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded|temporarily/i.test(msg)
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractJsonText(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

export async function onRequestPost(context: PagesContext): Promise<Response> {
  const apiKey = context.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: 'GEMINI_API_KEY ist in Cloudflare Pages unter Settings -> Environment variables nicht hinterlegt.' },
      { status: 503 }
    );
  }

  try {
    const body = (await context.request.json().catch(() => ({}))) as AssistantRequestBody;
    const question = (body.question || '').trim();
    if (!question) {
      return Response.json({ error: 'Bitte eine Frage eingeben.' }, { status: 400 });
    }

    const contextSummary = JSON.stringify(body.homesteadContext || {}).slice(0, 10000);
    const historyLines = (body.history || [])
      .slice(-4)
      .map((m) => `${m.role === 'user' ? 'Nutzer' : 'Assistent'}: ${m.text}`)
      .join('\n');

    const prompt = `AKTUELLE HOFDATEN (Mellenbach-Glasbach, Thüringen):\n${contextSummary}\n\n${historyLines ? `BISHERIGER VERLAUF:\n${historyLines}\n\n` : ''}AKTUELLE FRAGE:\n${question}`;

    let lastStatus = 500;
    let lastErrorMessage = 'Unbekannter Fehler bei der KI-Anfrage.';

    for (const step of MODEL_ATTEMPTS) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${step.model}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{ text: SYSTEM_INSTRUCTION }],
          },
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: RESPONSE_SCHEMA,
            thinkingConfig: { thinkingLevel: step.thinkingLevel },
          },
        }),
      });

      if (res.ok) {
        const data = (await res.json()) as {
          candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
        };
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || '{}';
        const parsed = JSON.parse(extractJsonText(rawText));
        return Response.json(parsed, { status: 200 });
      }

      const errBody = await res.text();
      lastStatus = res.status;
      lastErrorMessage = errBody;
      if (isTransientHighDemand(res.status, errBody)) {
        if (step.delayAfterFailMs > 0) {
          await sleep(step.delayAfterFailMs);
        }
        continue;
      }
      break;
    }

    if (isTransientHighDemand(lastStatus, lastErrorMessage)) {
      return Response.json(
        {
          error:
            'Der KI-Dienst hat gerade kurzzeitig viele Anfragen gleichzeitig (Überlastung). Bitte in ein paar Sekunden erneut auf „Erneut versuchen“ klicken.',
        },
        { status: 503 }
      );
    }

    return Response.json({ error: lastErrorMessage }, { status: 500 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler bei der KI-Anfrage.';
    return Response.json({ error: message }, { status: 500 });
  }
}
