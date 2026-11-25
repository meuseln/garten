import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

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
6. Wenn eine konkrete Aktion (Aufgabe anlegen, Kalendertermin erstellen, Einkaufslisteneintrag anlegen, Projektvorschlag erstellen) sinnvoll ist, füge sie in "proposedActions" ein — sie wird erst nach ausdrücklicher Bestätigung durch Nico oder Chris ausgeführt.`;

interface ModelAttemptConfig {
  model: 'gemini-3.1-flash-lite' | 'gemini-4-hydrogen';
  thinkingLevel: ThinkingLevel;
  delayAfterFailMs: number;
}

const MODEL_ATTEMPTS: ModelAttemptConfig[] = [
  { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL, delayAfterFailMs: 350 },
  { model: 'gemini-4-hydrogen', thinkingLevel: ThinkingLevel.LOW, delayAfterFailMs: 650 },
  { model: 'gemini-3.1-flash-lite', thinkingLevel: ThinkingLevel.MINIMAL, delayAfterFailMs: 0 },
];

function isTransientHighDemandError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : JSON.stringify(err || '');
  return /503|429|UNAVAILABLE|RESOURCE_EXHAUSTED|high demand|overloaded|temporarily/i.test(msg);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function extractJsonText(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced ? fenced[1].trim() : trimmed;
}

const RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    answer: {
      type: Type.STRING,
      description: 'Klare, strukturierte Antwort auf Deutsch mit Kennzeichnung der Evidenzstufen.',
    },
    evidenceCategories: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description:
        'Genutzte Evidenz-Kategorien (z.B. Gesichertes Fachwissen, Standortbezogene Empfehlung, Eigene Hof-Daten, Schätzung, Unzureichende Datenlage).',
    },
    safetyNotice: {
      type: Type.STRING,
      description:
        'Optionaler Sicherheits- oder Vorbehaltshinweis (z.B. Einkochhygiene, Tierarzt, Pilzsachverständige).',
    },
    proposedActions: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          actionType: {
            type: Type.STRING,
            description: 'create_task | create_event | create_shopping | create_project',
          },
          title: { type: Type.STRING },
          description: { type: Type.STRING },
          category: { type: Type.STRING },
          assignee: { type: Type.STRING },
          date: { type: Type.STRING },
          quantity: { type: Type.NUMBER },
          unit: { type: Type.STRING },
        },
        required: ['actionType', 'title', 'description'],
      },
    },
  },
  required: ['answer', 'evidenceCategories', 'proposedActions'],
};

async function generateWithFallback(ai: GoogleGenAI, prompt: string) {
  let lastError: unknown;
  for (const step of MODEL_ATTEMPTS) {
    try {
      return await ai.models.generateContent({
        model: step.model,
        contents: prompt,
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: RESPONSE_SCHEMA,
          thinkingConfig: { thinkingLevel: step.thinkingLevel },
        },
      });
    } catch (err) {
      lastError = err;
      console.warn(`[Netlify Hof-Assistent] ${step.model} fehlgeschlagen:`, err instanceof Error ? err.message : err);
      if (isTransientHighDemandError(err)) {
        if (step.delayAfterFailMs > 0) {
          await sleep(step.delayAfterFailMs);
        }
        continue;
      }
      throw err;
    }
  }
  throw lastError;
}

export const handler = async (event: { httpMethod: string; body: string | null }) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      statusCode: 503,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'GEMINI_API_KEY ist in der Server-Umgebung nicht konfiguriert.' }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}') as AssistantRequestBody;
    const question = (body.question || '').trim();
    if (!question) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Bitte eine Frage eingeben.' }) };
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const contextSummary = JSON.stringify(body.homesteadContext || {}).slice(0, 10000);
    const historyLines = (body.history || [])
      .slice(-4)
      .map((m) => `${m.role === 'user' ? 'Nutzer' : 'Assistent'}: ${m.text}`)
      .join('\n');

    const prompt = `AKTUELLE HOFDATEN (Mellenbach-Glasbach, Thüringen):\n${contextSummary}\n\n${historyLines ? `BISHERIGER VERLAUF:\n${historyLines}\n\n` : ''}AKTUELLE FRAGE:\n${question}`;

    const response = await generateWithFallback(ai, prompt);
    const text = extractJsonText(response.text || '{}');
    const parsed = JSON.parse(text);
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed),
    };
  } catch (err) {
    console.error('Netlify Gemini assistant error:', err);
    if (isTransientHighDemandError(err)) {
      return {
        statusCode: 503,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error:
            'Der KI-Dienst hat gerade kurzzeitig viele Anfragen gleichzeitig (Überlastung). Bitte in ein paar Sekunden erneut auf „Erneut versuchen“ klicken.',
        }),
      };
    }
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler bei der KI-Anfrage';
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: message }),
    };
  }
};
