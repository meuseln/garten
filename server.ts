import 'dotenv/config';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI, Type } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const app = express();
app.use(express.json({ limit: '2mb' }));

const SYSTEM_INSTRUCTION = `Du bist der fachkundige Garten-, Tier- und Selbstversorger-Assistent für "Hof & Garten" von Nico & Chris in Karl-Marx-Str. 113, 98744 Schwarzatal (OT Mellenbach-Glasbach, Thüringen, ca. 450-550m Höhenlage, Thüringer Schiefergebirge, Spätfröste bis Mitte Mai möglich; regional kalkarmer, eher schwach saurer Schieferverwitterungsboden; Trinkwasser Zweckverband RENNSTEIGWASSER im Härtebereich weich < 8,4 °dH).

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

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'hof-und-garten' });
});

app.post('/api/assistant', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(503).json({
      error: 'GEMINI_API_KEY ist auf dem Server nicht konfiguriert. Bitte unter Settings > Secrets hinterlegen.',
    });
    return;
  }

  try {
    const body = req.body as {
      question?: string;
      history?: Array<{ role: 'user' | 'model'; text: string }>;
      homesteadContext?: Record<string, unknown>;
    };

    const question = (body?.question || '').trim();
    if (!question) {
      res.status(400).json({ error: 'Bitte eine Frage eingeben.' });
      return;
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    const contextSummary = JSON.stringify(body.homesteadContext || {}, null, 2).slice(0, 24000);
    const historyLines = (body.history || [])
      .slice(-6)
      .map((m) => `${m.role === 'user' ? 'Nutzer' : 'Assistent'}: ${m.text}`)
      .join('\n');

    const prompt = `AKTUELLE HOFDATEN (Mellenbach-Glasbach, Thüringen):\n${contextSummary}\n\n${historyLines ? `BISHERIGER VERLAUF:\n${historyLines}\n\n` : ''}AKTUELLE FRAGE:\n${question}`;

    const response = await ai.models.generateContent({
      model: 'gemini-4-hydrogen',
      contents: prompt,
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            answer: {
              type: Type.STRING,
              description: 'Klare, strukturierte Antwort auf Deutsch mit Kennzeichnung der Evidenzstufen.',
            },
            evidenceCategories: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: 'Genutzte Evidenz-Kategorien.',
            },
            safetyNotice: {
              type: Type.STRING,
              description: 'Optionaler Sicherheits- oder Vorbehaltshinweis.',
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
        },
      },
    });

    const text = (response.text || '{}').trim();
    const parsed = JSON.parse(text);
    res.json(parsed);
  } catch (err) {
    console.error('Gemini assistant error:', err);
    const message = err instanceof Error ? err.message : 'Unbekannter Fehler bei der KI-Anfrage.';
    res.status(500).json({ error: message });
  }
});

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production' && fs.existsSync(path.join(__dirname, 'dist', 'index.html'));

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hof & Garten Server läuft auf http://0.0.0.0:${PORT}`);
  });
}

startServer();
