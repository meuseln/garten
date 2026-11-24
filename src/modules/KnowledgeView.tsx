import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  BookOpen,
  CheckCircle2,
  Edit3,
  NotebookPen,
  Plus,
  Send,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { useHomestead } from '../context/HomesteadContext';
import { REGIONAL_SOIL_WATER_REFERENCE } from '../lib/weather';
import {
  EmptyState,
  Modal,
  ModuleHeader,
  PaginationControls,
  SegmentedTabs,
  usePagination,
} from '../components/ui/SharedUI';
import type { AssigneeScope, CalendarCategory, HomesteadRecord, KnowledgePayload } from '../types/homestead';

interface ProposedAction {
  actionType: 'create_task' | 'create_event' | 'create_shopping' | 'create_project' | string;
  title: string;
  description: string;
  category?: string;
  assignee?: string;
  date?: string;
  quantity?: number;
  unit?: string;
}

interface AssistantTurn {
  id: string;
  role: 'user' | 'model';
  text: string;
  evidenceCategories?: string[];
  safetyNotice?: string;
  proposedActions?: ProposedAction[];
  executedActionIndices?: number[];
}

export const KnowledgeView: React.FC = () => {
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
    updateRecord,
    archiveRecord,
    pushToast,
  } = useHomestead();

  const [tab, setTab] = useState<'fachwissen' | 'erfahrung' | 'assistent'>('fachwissen');
  const [searchTerm, setSearchTerm] = useState('');

  // Knowledge CRUD modal
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<HomesteadRecord<KnowledgePayload> | null>(null);
  const [title, setTitle] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [payload, setPayload] = useState<KnowledgePayload>({
    domainType: 'Fachwissen',
    category: 'Pflanzenbau & Boden',
    content: '',
    source: '',
    isVerifiedSource: true,
    safetyWarning: '',
    date: new Date().toISOString().slice(0, 10),
    locationNote: '',
    tags: [],
  });

  // Assistant state
  const [question, setQuestion] = useState('');
  const [assistantBusy, setAssistantBusy] = useState(false);
  const [assistantError, setAssistantError] = useState<string | null>(null);
  const [conversation, setConversation] = useState<AssistantTurn[]>([]);

  const fachwissenEntries = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return knowledgeEntries
      .filter((k) => !k.archived && k.payload.domainType === 'Fachwissen')
      .filter((k) =>
        q
          ? k.title.toLowerCase().includes(q) ||
            k.payload.content.toLowerCase().includes(q) ||
            (k.payload.source || '').toLowerCase().includes(q)
          : true
      );
  }, [knowledgeEntries, searchTerm]);

  const erfahrungEntries = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return knowledgeEntries
      .filter((k) => !k.archived && k.payload.domainType === 'Erfahrungswissen')
      .filter((k) =>
        q
          ? k.title.toLowerCase().includes(q) ||
            k.payload.content.toLowerCase().includes(q) ||
            (k.payload.category || '').toLowerCase().includes(q)
          : true
      );
  }, [knowledgeEntries, searchTerm]);

  const pagedFachwissen = usePagination(fachwissenEntries, 4);
  const pagedErfahrung = usePagination(erfahrungEntries, 4);

  const openNew = (domainType: 'Fachwissen' | 'Erfahrungswissen') => {
    setEditing(null);
    setTitle('');
    setTagsText('');
    setPayload({
      domainType,
      category: domainType === 'Fachwissen' ? 'Gemüsebau & Aussaat' : 'Gartentagebuch',
      content: '',
      source: domainType === 'Fachwissen' ? '' : `${activeIdentity || 'Hof-Team'} — Eigene Hofbeobachtung`,
      isVerifiedSource: domainType === 'Fachwissen',
      safetyWarning: '',
      date: new Date().toISOString().slice(0, 10),
      locationNote: '',
      tags: [],
    });
    setShowModal(true);
  };

  const openEdit = (entry: HomesteadRecord<KnowledgePayload>) => {
    setEditing(entry);
    setTitle(entry.title);
    setTagsText((entry.payload.tags || []).join(', '));
    setPayload({ ...entry.payload });
    setShowModal(true);
  };

  const saveEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !payload.content.trim()) return;
    if (payload.domainType === 'Fachwissen' && !payload.source.trim()) {
      pushToast('warning', 'Für Fachwissen bitte immer eine nachvollziehbare Quelle angeben.');
      return;
    }
    const nextPayload: KnowledgePayload = {
      ...payload,
      tags: tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };
    if (editing) {
      await updateRecord('knowledgeEntries', editing.id, title, nextPayload, editing.updatedAtMs);
      pushToast('success', 'Wissenseintrag aktualisiert.');
    } else {
      await createRecord('knowledgeEntries', title, nextPayload);
      pushToast('success', 'Wissenseintrag gespeichert.');
    }
    setShowModal(false);
  };

  const buildHomesteadSummary = () => ({
    standort: REGIONAL_SOIL_WATER_REFERENCE.address,
    bodenWasserReferenz: {
      geologie: REGIONAL_SOIL_WATER_REFERENCE.geology,
      wasserhaerte: REGIONAL_SOIL_WATER_REFERENCE.waterHardness,
    },
    aktuellesDatum: new Date().toISOString().slice(0, 10),
    aktiverNutzer: activeIdentity,
    wetter: weather
      ? {
          aktuellTempC: weather.current.temp,
          heuteMinC: weather.today.tempMin,
          heuteMaxC: weather.today.tempMax,
          regenHeuteMm: weather.daily[0]?.precipSum,
          warnungen: weather.gardenAlerts.map((a) => `${a.title}: ${a.recommendation}`),
        }
      : null,
    flaechen: areas.filter((a) => !a.archived).map((a) => ({ name: a.title, typ: a.payload.areaType, qm: a.payload.sizeSqm, boden: a.payload.soilType })),
    sorten: plants.filter((p) => !p.archived).slice(0, 25).map((p) => ({ name: p.title, art: p.payload.species, bewertung: p.payload.experienceRating })),
    pflanzungen: plantings.filter((p) => !p.archived).slice(0, 25).map((p) => ({ kultur: p.title, beet: p.payload.areaName, status: p.payload.status, erntemonat: p.payload.harvestMonth })),
    saatgut: seeds.filter((s) => !s.archived).slice(0, 20).map((s) => ({ sorte: s.title, menge: s.payload.quantity, einheit: s.payload.unit, nachbestellen: s.payload.reorderNeeded })),
    tiere: animalGroups.filter((g) => !g.archived).map((g) => ({ gruppe: g.title, anzahl: g.payload.count, futterplan: g.payload.feedingPlan })),
    futter: feedStocks.filter((f) => !f.archived).map((f) => ({ futter: f.title, kg: f.payload.quantityKg, minKg: f.payload.minStockKg })),
    vorraete: inventoryItems.filter((i) => !i.archived).slice(0, 25).map((i) => ({ artikel: i.title, menge: i.payload.quantity, einheit: i.payload.unit, ort: i.payload.location })),
    letzteErnten: harvests.filter((h) => !h.archived).slice(0, 15).map((h) => ({ kultur: h.title, menge: h.payload.amount, einheit: h.payload.unit, datum: h.payload.date })),
    projekte: projects.filter((p) => !p.archived).map((p) => ({ projekt: p.title, status: p.payload.status })),
    offeneAufgaben: calendarEvents.filter((c) => !c.archived && !c.payload.completed).slice(0, 15).map((c) => ({ titel: c.title, datum: c.payload.date, zustaendig: c.payload.assignee })),
    erfahrungswissen: erfahrungEntries.slice(0, 10).map((k) => ({ titel: k.title, inhalt: k.payload.content.slice(0, 200) })),
  });

  const askAssistant = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanQ = question.trim();
    if (!cleanQ || assistantBusy) return;

    setAssistantError(null);
    const userTurn: AssistantTurn = {
      id: `u_${Date.now()}`,
      role: 'user',
      text: cleanQ,
    };
    const nextHistory = [...conversation, userTurn];
    setConversation(nextHistory);
    setQuestion('');
    setAssistantBusy(true);

    try {
      const res = await fetch('/api/assistant', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: cleanQ,
          history: conversation.slice(-6).map((t) => ({ role: t.role, text: t.text })),
          homesteadContext: buildHomesteadSummary(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || `HTTP ${res.status}`);
      }
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
          : 'Verbindung zum Hof-Assistenten fehlgeschlagen.'
      );
    } finally {
      setAssistantBusy(false);
    }
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

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Wissensdatenbank & Hof-Assistent"
        subtitle="Strikte Trennung von belegtem Fachwissen und eigenem Hof-Erfahrungswissen"
        actions={
          tab !== 'assistent' && (
            <button
              type="button"
              onClick={() => openNew(tab === 'fachwissen' ? 'Fachwissen' : 'Erfahrungswissen')}
              className="px-3.5 py-2 rounded-xl bg-[#233A29] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 hover:opacity-90 transition"
            >
              <Plus className="w-4 h-4" />
              {tab === 'fachwissen' ? 'Fachwissen erfassen' : 'Erfahrung / Notiz erfassen'}
            </button>
          )
        }
      />

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <SegmentedTabs
          tabs={[
            { id: 'fachwissen', label: 'A · Fachwissen (mit Quellen)' },
            { id: 'erfahrung', label: 'B · Eigenes Erfahrungswissen' },
            { id: 'assistent', label: 'C · Hof-Assistent' },
          ]}
          activeTab={tab}
          onChange={(id) => setTab(id as typeof tab)}
        />
        {tab !== 'assistent' && (
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Wissen durchsuchen…"
            className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-xs w-full sm:w-64"
          />
        )}
      </div>

      {/* A: Verified / Sourced Fachwissen */}
      {tab === 'fachwissen' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#597CD4]/10 border border-[#597CD4]/30 text-xs text-neutral-800 dark:text-neutral-200">
            <strong>Bereich A — Geprüftes Fachwissen:</strong> Jeder Eintrag enthält eine explizite Fachquelle (z.B. DWD, LWK/TLLLR Thüringen, BfR, Fachliteratur) und bleibt klar von persönlichen Hof-Erfahrungen getrennt.
          </div>

          {fachwissenEntries.length === 0 ? (
            <EmptyState
              title="Noch kein Fachwissen erfasst"
              description="Lege hier geprüfte Regeln zu Fruchtfolge, Einkoch-Sicherheit (Botulismus-Prävention), Baumschnitt oder Tierhaltung mit Quellenangabe ab."
              actionLabel="Fachwissen anlegen"
              onAction={() => openNew('Fachwissen')}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pagedFachwissen.pageItems.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display text-base font-bold flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-[#597CD4]" />
                        {entry.title}
                      </h3>
                      <div className="text-xs text-neutral-500 mt-0.5">
                        Fachwissen · {entry.payload.category} · <span className="font-mono-num">{entry.payload.date}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(entry)}
                        className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700"
                        aria-label="Bearbeiten"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => archiveRecord('knowledgeEntries', entry.id, entry.title)}
                        className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-[#CF6432]"
                        aria-label="Archivieren"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
                    {entry.payload.content}
                  </p>
                  <div className="text-xs text-neutral-600 dark:text-neutral-400 border-t border-neutral-100 dark:border-neutral-800 pt-2">
                    <strong>Quelle:</strong> {entry.payload.source}
                  </div>
                </div>
              ))}
              </div>
              <PaginationControls
                page={pagedFachwissen.page}
                totalPages={pagedFachwissen.totalPages}
                totalItems={pagedFachwissen.totalItems}
                onPageChange={pagedFachwissen.setPage}
              />
            </>
          )}
        </div>
      )}

      {/* B: Personal Experience & Garden Diary */}
      {tab === 'erfahrung' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#BBE774]/18 border border-[#84B835]/35 text-xs text-neutral-800 dark:text-neutral-200">
            <strong>Bereich B — Eigenes Erfahrungswissen:</strong> Euer Gartentagebuch, lokale Beobachtungen in Mellenbach-Glasbach, Sortenerfahrungen und erprobte Familienrezepte.
          </div>

          {erfahrungEntries.length === 0 ? (
            <EmptyState
              title="Noch keine eigenen Erfahrungen dokumentiert"
              description="Halte fest, welche Sorten in eurem Mikroklima überzeugt haben, wann der letzte Spätfrost auftrat oder was ihr nächstes Jahr anders machen wollt."
              actionLabel="Tagebucheintrag anlegen"
              onAction={() => openNew('Erfahrungswissen')}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pagedErfahrung.pageItems.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display text-base font-bold flex items-center gap-2">
                        <NotebookPen className="w-4 h-4 text-[#3B6912] dark:text-[#BBE774]" />
                        {entry.title}
                      </h3>
                      <div className="text-xs text-neutral-500 mt-0.5">
                        Eigene Erfahrung · {entry.payload.category} · <span className="font-mono-num">{entry.payload.date}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEdit(entry)}
                        className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700"
                        aria-label="Bearbeiten"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => archiveRecord('knowledgeEntries', entry.id, entry.title)}
                        className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 text-[#CF6432]"
                        aria-label="Archivieren"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
                    {entry.payload.content}
                  </p>
                </div>
              ))}
              </div>
              <PaginationControls
                page={pagedErfahrung.page}
                totalPages={pagedErfahrung.totalPages}
                totalItems={pagedErfahrung.totalItems}
                onPageChange={pagedErfahrung.setPage}
              />
            </>
          )}
        </div>
      )}

      {/* C: Smart Homestead Assistant */}
      {tab === 'assistent' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 text-xs text-neutral-600 dark:text-neutral-400 space-y-1">
            <div className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-[#233A29] dark:text-[#BBE774]" />
              Hof-Assistent für Mellenbach-Glasbach (mit aktuellem Hof- & Wetterkontext)
            </div>
            <p>
              Der Assistent kennt eure aktuellen Beete, Sorten, Vorräte, Tierbestände, Wetterdaten und Aufgaben. Antworten trennen transparent zwischen Fachwissen, Standortempfehlung, Hof-Daten und Schätzung. Vorgeschlagene Aktionen werden erst nach eurer Bestätigung ausgeführt.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {[
              'Was steht diese Woche bei dem Wetter in Mellenbach im Garten & Stall an?',
              'Welche Rezepte passen zu unseren aktuellen Vorräten & Ernten?',
              'Prüfe unseren Saatgut- und Futterbestand auf knappe Reserven.',
            ].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => setQuestion(sample)}
                className="text-xs px-3 py-1.5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161D1A] hover:bg-neutral-50 dark:hover:bg-neutral-900 text-left"
              >
                {sample}
              </button>
            ))}
          </div>

          <div className="space-y-4">
            {conversation.map((turn) => (
              <div
                key={turn.id}
                className={`rounded-2xl p-5 border ${
                  turn.role === 'user'
                    ? 'bg-[#233A29] text-white border-[#233A29] ml-auto max-w-2xl'
                    : 'bg-white dark:bg-[#161D1A] border-neutral-200 dark:border-neutral-800 space-y-3'
                }`}
              >
                <div className="text-sm leading-relaxed whitespace-pre-line">{turn.text}</div>

                {turn.evidenceCategories && turn.evidenceCategories.length > 0 && (
                  <div className="text-xs text-neutral-500 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    <strong>Evidenzstufen:</strong> {turn.evidenceCategories.join(' · ')}
                  </div>
                )}

                {turn.safetyNotice && (
                  <div className="p-3 rounded-xl bg-[#CF6432]/12 border border-[#CF6432]/35 text-xs flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 text-[#CF6432] shrink-0 mt-0.5" />
                    <span>{turn.safetyNotice}</span>
                  </div>
                )}

                {turn.proposedActions && turn.proposedActions.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <div className="text-xs font-semibold text-neutral-700 dark:text-neutral-300">
                      Vorgeschlagene Aktionen (Ausführung erst nach Bestätigung):
                    </div>
                    {turn.proposedActions.map((act, idx) => {
                      const alreadyExecuted = turn.executedActionIndices?.includes(idx);
                      return (
                        <div
                          key={`${turn.id}_act_${idx}`}
                          className="p-3 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412] border border-neutral-200 dark:border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                        >
                          <div>
                            <div className="font-semibold">{act.title}</div>
                            <div className="text-neutral-600 dark:text-neutral-400">
                              {act.description}
                              {act.date ? ` · Datum: ${act.date}` : ''}
                              {act.assignee ? ` · Zuständig: ${act.assignee}` : ''}
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
                              className="px-3 py-2 rounded-xl bg-[#233A29] text-white font-semibold shrink-0 hover:opacity-90"
                            >
                              Bestätigen & anlegen
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

          {assistantError && (
            <div className="p-4 rounded-xl bg-[#CF6432]/12 border border-[#CF6432]/35 text-xs text-[#9A3E14] dark:text-[#F49D76] flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{assistantError}</span>
            </div>
          )}

          <form onSubmit={askAssistant} className="flex gap-2">
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Frage an den Hof-Assistenten stellen…"
              className="flex-1 px-4 py-3 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-sm"
            />
            <button
              type="submit"
              disabled={assistantBusy || !question.trim()}
              className="px-4 py-3 rounded-xl bg-[#233A29] text-white text-sm font-semibold inline-flex items-center gap-2 hover:opacity-90 disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
              {assistantBusy ? 'Denkt…' : 'Fragen'}
            </button>
          </form>
        </div>
      )}

      {/* Knowledge CRUD Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Wissenseintrag bearbeiten' : `${payload.domainType} erfassen`}
      >
        <form onSubmit={saveEntry} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Titel *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Kategorie</label>
              <input
                type="text"
                value={payload.category}
                onChange={(e) => setPayload({ ...payload, category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">
                {payload.domainType === 'Fachwissen' ? 'Quelle / Referenz *' : 'Autor / Beobachtungsort'}
              </label>
              <input
                type="text"
                required={payload.domainType === 'Fachwissen'}
                value={payload.source}
                onChange={(e) => setPayload({ ...payload, source: e.target.value })}
                placeholder={
                  payload.domainType === 'Fachwissen'
                    ? 'z.B. TLLLR Thüringen / BfR Merkblatt Einkochen'
                    : 'z.B. Nico · Hochbeet Süd'
                }
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Datum</label>
              <input
                type="date"
                value={payload.date}
                onChange={(e) => setPayload({ ...payload, date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Inhalt *</label>
            <textarea
              rows={5}
              required
              value={payload.content}
              onChange={(e) => setPayload({ ...payload, content: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Stichworte (kommagetrennt)</label>
            <input
              type="text"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-medium"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#233A29] text-white text-xs font-semibold"
            >
              Speichern
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
