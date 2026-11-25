import React, { useState } from 'react';
import { AlertTriangle, CheckCircle2, RefreshCw, Send, ShieldAlert, Sparkles } from 'lucide-react';
import { useHomestead } from '../../context/HomesteadContext';
import { REGIONAL_SOIL_WATER_REFERENCE } from '../../lib/weather';
import type { AssigneeScope, CalendarCategory } from '../../types/homestead';

export interface ProposedAction {
  actionType: 'create_task' | 'create_event' | 'create_shopping' | 'create_project' | string;
  title: string;
  description: string;
  category?: string;
  assignee?: string;
  date?: string;
  quantity?: number;
  unit?: string;
}

export interface AssistantTurn {
  id: string;
  role: 'user' | 'model';
  text: string;
  evidenceCategories?: string[];
  safetyNotice?: string;
  proposedActions?: ProposedAction[];
  executedActionIndices?: number[];
}

export const HomesteadAssistantPanel: React.FC<{
  compact?: boolean;
  onOpenFull?: () => void;
}> = ({ compact = false, onOpenFull }) => {
  const {
    knowledgeEntries,
    areas,
    plants,
    plantings,
    seeds,
    animalGroups,
    feedStocks,
    harvests,
    inventoryItems,
    projects,
    calendarEvents,
    weather,
    activeIdentity,
    createRecord,
    pushToast,
  } = useHomestead();

  const [question, setQuestion] = useState('');
  const [lastAskedQuestion, setLastAskedQuestion] = useState('');
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<AssistantTurn[]>([]);

  const erfahrungEntries = knowledgeEntries.filter(
    (k) => !k.archived && k.payload.domainType === 'Erfahrungswissen'
  );

  const buildHomesteadSummary = () => ({
    standort: REGIONAL_SOIL_WATER_REFERENCE.address,
    datum: new Date().toISOString().slice(0, 10),
    nutzer: activeIdentity,
    wetter: weather
      ? {
          tempC: Math.round(weather.current.temp * 10) / 10,
          minMaxC: `${Math.round(weather.today.tempMin)}/${Math.round(weather.today.tempMax)}`,
          regenMm: weather.daily[0]?.precipSum,
          warnung: weather.gardenAlerts[0]?.title || '',
        }
      : null,
    flaechen: areas
      .filter((a) => !a.archived)
      .slice(0, 12)
      .map((a) => `${a.title} (${a.payload.areaType}, ${a.payload.sizeSqm}qm)`),
    sorten: plants
      .filter((p) => !p.archived)
      .slice(0, 18)
      .map((p) => p.title),
    beeteAktuell: plantings
      .filter((p) => !p.archived)
      .slice(0, 18)
      .map((p) => `${p.title} [${p.payload.status}]`),
    saatgutKnapp: seeds
      .filter((s) => !s.archived && s.payload.reorderNeeded)
      .slice(0, 10)
      .map((s) => s.title),
    tiere: animalGroups
      .filter((g) => !g.archived)
      .map((g) => `${g.title}: ${g.payload.count}`),
    futter: feedStocks
      .filter((f) => !f.archived)
      .map((f) => `${f.title}: ${f.payload.quantityKg}kg (Min ${f.payload.minStockKg}kg)`),
    vorraete: inventoryItems
      .filter((i) => !i.archived)
      .slice(0, 15)
      .map((i) => `${i.title}: ${i.payload.quantity} ${i.payload.unit}`),
    ernten: harvests
      .filter((h) => !h.archived)
      .slice(0, 10)
      .map((h) => `${h.title}: ${h.payload.amount} ${h.payload.unit}`),
    projekte: projects
      .filter((p) => !p.archived && p.payload.status !== 'Abgeschlossen')
      .slice(0, 8)
      .map((p) => `${p.title} (${p.payload.status})`),
    aufgaben: calendarEvents
      .filter((c) => !c.archived && !c.payload.completed)
      .slice(0, 10)
      .map((c) => `${c.title} (${c.payload.date})`),
    erfahrung: erfahrungEntries
      .slice(0, 6)
      .map((k) => `${k.title}: ${k.payload.content.slice(0, 120)}`),
  });

  const callAssistantEndpoint = async (cleanQ: string, historySlice: Array<{ role: 'user' | 'model'; text: string }>) => {
    const payloadStr = JSON.stringify({
      question: cleanQ,
      history: historySlice,
      homesteadContext: buildHomesteadSummary(),
    });

    for (let attempt = 0; attempt < 2; attempt++) {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payloadStr,
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) return data;

      if (res.status === 503 && attempt === 0) {
        await new Promise((r) => setTimeout(r, 1100));
        continue;
      }

      const msg =
        typeof data?.error === 'string'
          ? data.error
          : data?.error?.message || `Der Hof-Assistent hat mit Status ${res.status} geantwortet.`;
      throw new Error(msg);
    }
  };

  const submitQuestion = async (rawQuestion: string, isRetry = false) => {
    const cleanQ = rawQuestion.trim();
    if (!cleanQ || assistantBusy) return;

    setAssistantError(null);
    setLastAskedQuestion(cleanQ);
    if (!isRetry) {
      const userTurn: AssistantTurn = {
        id: `u_${Date.now()}`,
        role: 'user',
        text: cleanQ,
      };
      setConversation((prev) => [...prev, userTurn]);
      setQuestion('');
    }
    setAssistantBusy(true);

    try {
      const historySlice = conversation.slice(-4).map((t) => ({ role: t.role, text: t.text }));
      const data = await callAssistantEndpoint(cleanQ, historySlice);
      const modelTurn: AssistantTurn = {
        id: `m_${Date.now()}`,
        role: 'model',
        text: String(data.answer || 'Keine Antwort erhalten.'),
        evidenceCategories: Array.isArray(data.evidenceCategories) ? data.evidenceCategories : [],
        safetyNotice: typeof data.safetyNotice === 'string' ? data.safetyNotice : '',
        proposedActions: Array.isArray(data.proposedActions) ? data.proposedActions : [],
        executedActionIndices: [],
      };
      setConversation((prev) => [...prev, modelTurn]);
    } catch (err) {
      setAssistantError(
        err instanceof Error
          ? err.message
          : 'Verbindung zum Hof-Assistenten fehlgeschlagen. Bitte kurz warten und erneut fragen.'
      );
    } finally {
      setAssistantBusy(false);
    }
  };

  const askAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitQuestion(question);
  };

  const executeProposedAction = async (turnId: string, actionIdx: number, act: ProposedAction) => {
    const today = new Date().toISOString().slice(0, 10);
    const validAssignee: AssigneeScope =
      act.assignee === 'Nico' || act.assignee === 'Chris' || act.assignee === 'Gemeinsam'
        ? act.assignee
        : activeIdentity || 'Gemeinsam';

    if (act.actionType === 'create_task' || act.actionType === 'create_event') {
      await createRecord('calendarEvents', act.title, {
        eventType: act.actionType === 'create_event' ? 'event' : 'task',
        description: act.description,
        date: act.date && /^\d{4}-\d{2}-\d{2}$/.test(act.date) ? act.date : today,
        startTime: '09:00',
        endTime: '10:00',
        category: (act.category as CalendarCategory) || 'Garten',
        assignee: validAssignee,
        recurrence: 'none',
        reminderMinutes: 30,
        areaId: '',
        areaName: '',
        completed: false,
        notes: 'Übernommen aus Hof-Assistent nach Bestätigung.',
      });
      pushToast('success', `In Kalender angelegt: ${act.title}`);
    } else if (act.actionType === 'create_shopping') {
      await createRecord('shoppingItems', act.title, {
        category: 'Verbrauchsmaterial',
        quantity: act.quantity && act.quantity > 0 ? act.quantity : 1,
        unit: act.unit || 'Stück',
        source: 'Hof-Assistent Vorschlag',
        estimatedPriceEur: 0,
        purchased: false,
        linkedProject: '',
      });
      pushToast('success', `Auf Einkaufsliste gesetzt: ${act.title}`);
    } else if (act.actionType === 'create_project') {
      await createRecord('projects', act.title, {
        category: act.category || 'Sonstiges',
        description: act.description,
        status: 'Idee',
        priority: 'Mittel',
        startDate: today,
        targetDate: '',
        assignee: validAssignee,
        budgetPlannedEur: 0,
        budgetSpentEur: 0,
        materials: [],
        tools: [],
        steps: [],
        finalReport: '',
      });
      pushToast('success', `Projektidee angelegt: ${act.title}`);
    }

    setConversation((prev) =>
      prev.map((t) =>
        t.id === turnId
          ? { ...t, executedActionIndices: [...(t.executedActionIndices || []), actionIdx] }
          : t
      )
    );
  };

  const quickPrompts = compact
    ? [
        'Was steht bei diesem Wetter im Garten an?',
        'Was passt jetzt als Nachkultur aufs Beet?',
      ]
    : [
        'Was steht diese Woche bei dem Wetter in Mellenbach im Garten & Stall an?',
        'Welche Rezepte passen zu unseren aktuellen Vorräten & Ernten?',
        'Prüfe unseren Saatgut- und Futterbestand auf knappe Reserven.',
      ];

  const visibleTurns = compact ? conversation.slice(-2) : conversation;

  return (
    <div className={compact ? 'space-y-2' : 'space-y-3'}>
      {!compact && (
        <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 text-xs text-neutral-600 dark:text-neutral-400 space-y-1">
          <div className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#3B6912] dark:text-[#BBE774]" />
            Hof-Assistent für Mellenbach-Glasbach (mit aktuellem Hof- & Wetterkontext)
          </div>
          <p>
            Der Assistent kennt eure aktuellen Beete, Sorten, Vorräte, Tierbestände, Wetterdaten und Aufgaben. Vorgeschlagene Aktionen werden erst nach eurer Bestätigung gespeichert.
          </p>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {quickPrompts.map((sample) => (
          <button
            key={sample}
            type="button"
            disabled={assistantBusy}
            onClick={() => submitQuestion(sample)}
            className={`${
              compact ? 'text-[11px] px-2.5 py-1 rounded-lg' : 'text-xs px-3 py-1.5 rounded-xl'
            } border border-neutral-200 dark:border-neutral-800 bg-[#F7F7F5] dark:bg-[#0F1412] hover:bg-[#BBE774]/20 text-left transition`}
          >
            {sample}
          </button>
        ))}
      </div>

      {visibleTurns.length > 0 && (
        <div className={`space-y-2 ${compact ? 'max-h-24 overflow-y-auto pr-1' : ''}`}>
          {visibleTurns.map((turn) => (
            <div
              key={turn.id}
              className={`${compact ? 'rounded-xl p-2.5' : 'rounded-2xl p-3.5 sm:p-4'} border ${
                turn.role === 'user'
                  ? 'bg-[#233A29] text-white border-[#233A29] ml-auto max-w-xl'
                  : 'bg-[#F7F7F5] dark:bg-[#0F1412] border-neutral-200 dark:border-neutral-800 space-y-2'
              }`}
            >
              <div className={`${compact ? 'text-xs' : 'text-xs sm:text-sm'} leading-relaxed whitespace-pre-line`}>
                {turn.text}
              </div>

              {!compact && turn.evidenceCategories && turn.evidenceCategories.length > 0 && (
                <div className="text-xs text-neutral-500 pt-2 border-t border-neutral-200 dark:border-neutral-800">
                  <strong>Evidenzstufen:</strong> {turn.evidenceCategories.join(' · ')}
                </div>
              )}

              {turn.safetyNotice && (
                <div className="p-2 rounded-xl bg-[#CF6432]/12 border border-[#CF6432]/35 text-xs flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#CF6432] shrink-0 mt-0.5" />
                  <span>{turn.safetyNotice}</span>
                </div>
              )}

              {turn.proposedActions && turn.proposedActions.length > 0 && (
                <div className="space-y-1.5 pt-1">
                  <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                    Vorschlag übernehmen:
                  </div>
                  {turn.proposedActions.map((act, idx) => {
                    const alreadyExecuted = turn.executedActionIndices?.includes(idx);
                    return (
                      <div
                        key={`${turn.id}_act_${idx}`}
                        className="p-2 rounded-xl bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                      >
                        <div>
                          <div className="font-semibold">{act.title}</div>
                          <div className="text-neutral-600 dark:text-neutral-400">
                            {act.description}
                            {act.date ? ` · ${act.date}` : ''}
                          </div>
                        </div>
                        {alreadyExecuted ? (
                          <span className="inline-flex items-center gap-1 text-[#3B6912] dark:text-[#BBE774] font-semibold shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                            Übernommen
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => executeProposedAction(turn.id, idx, act)}
                            className="px-3 py-1 rounded-lg bg-[#233A29] text-white font-semibold shrink-0 hover:opacity-90"
                          >
                            Anlegen
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {assistantError && (
        <div className="p-2.5 rounded-xl bg-[#CF6432]/12 border border-[#CF6432]/35 text-xs text-[#9A3E14] dark:text-[#F49D76] flex items-start justify-between gap-2">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{assistantError}</span>
          </div>
          {lastAskedQuestion && (
            <button
              type="button"
              disabled={assistantBusy}
              onClick={() => submitQuestion(lastAskedQuestion, true)}
              className="px-2.5 py-1 rounded-lg bg-[#CF6432] text-white font-semibold inline-flex items-center gap-1 shrink-0 hover:opacity-90"
            >
              <RefreshCw className="w-3 h-3" />
              Erneut versuchen
            </button>
          )}
        </div>
      )}

      <form onSubmit={askAssistant} className="flex gap-2">
        <input
          type="text"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="Frage an Hof-Assistenten stellen…"
          className={`flex-1 min-w-0 px-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] ${
            compact ? 'h-9 text-xs' : 'py-2.5 text-sm'
          }`}
        />
        <button
          type="submit"
          disabled={assistantBusy || !question.trim()}
          className={`${
            compact ? 'h-9 px-3 text-xs' : 'min-h-[42px] px-4 py-2 text-xs sm:text-sm'
          } rounded-xl bg-[#233A29] text-white font-semibold inline-flex items-center gap-1.5 hover:opacity-90 disabled:opacity-50 shrink-0`}
        >
          <Send className="w-3.5 h-3.5" />
          {assistantBusy ? 'Denkt…' : 'Fragen'}
        </button>
      </form>

      {compact && onOpenFull && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={onOpenFull}
            className="text-[11px] font-medium text-[#597CD4] hover:underline"
          >
            Großen Hof-Assistent & Wissensarchiv öffnen →
          </button>
        </div>
      )}
    </div>
  );
};
