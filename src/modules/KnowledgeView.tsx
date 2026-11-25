import React, { useMemo, useState } from 'react';
import {
  Archive,
  BookOpen,
  CheckCircle2,
  Database,
  Edit3,
  NotebookPen,
  Plus,
  ShieldAlert,
} from 'lucide-react';
import { useHomestead } from '../context/HomesteadContext';
import {
  buildStarterKnowledge,
  buildStarterPlants,
  buildStarterRecipes,
} from '../data/botanicalCatalog';
import {
  EmptyState,
  Modal,
  ModuleHeader,
  PaginationControls,
  SegmentedTabs,
  usePagination,
} from '../components/ui/SharedUI';
import type { HomesteadRecord, KnowledgePayload } from '../types/homestead';
import { HomesteadAssistantPanel } from '../components/assistant/HomesteadAssistantPanel';

export const KnowledgeView: React.FC = () => {
  const {
    knowledgeEntries,
    plants,
    recipes,
    activeIdentity,
    createRecord,
    updateRecord,
    archiveRecord,
    seedReferenceDatabases,
    pushToast,
  } = useHomestead();

  const [tab, setTab] = useState<'fachwissen' | 'erfahrung' | 'assistent'>('fachwissen');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('Alle');
  const [seedingRefs, setSeedingRefs] = useState(false);

  const missingRefStats = useMemo(() => {
    const kSet = new Set(knowledgeEntries.map((k) => k.title.trim().toLowerCase()));
    const pSet = new Set(plants.map((p) => p.title.trim().toLowerCase()));
    const rSet = new Set(recipes.map((r) => r.title.trim().toLowerCase()));
    const missingKnowledge = buildStarterKnowledge().filter((k) => !kSet.has(k.title.trim().toLowerCase())).length;
    const missingPlants = buildStarterPlants().filter((p) => !pSet.has(p.title.trim().toLowerCase())).length;
    const missingRecipes = buildStarterRecipes().filter((r) => !rSet.has(r.title.trim().toLowerCase())).length;
    return {
      missingKnowledge,
      missingPlants,
      missingRecipes,
      totalMissing: missingKnowledge + missingPlants + missingRecipes,
    };
  }, [knowledgeEntries, plants, recipes]);

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

  const allFactualEntries = useMemo(
    () =>
      knowledgeEntries.filter(
        (k) =>
          !k.archived &&
          (k.payload.domainType === 'Fachwissen' ||
            k.payload.domainType === 'Pilze & Wildkräuter' ||
            k.payload.domainType === 'Natur & Biodiversität')
      ),
    [knowledgeEntries]
  );

  const fachwissenCategories = useMemo(
    () => Array.from(new Set(allFactualEntries.map((k) => k.payload.category).filter(Boolean))).sort(),
    [allFactualEntries]
  );

  const fachwissenEntries = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return allFactualEntries
      .filter((k) => (categoryFilter === 'Alle' ? true : k.payload.category === categoryFilter))
      .filter((k) =>
        q
          ? k.title.toLowerCase().includes(q) ||
            k.payload.content.toLowerCase().includes(q) ||
            k.payload.category.toLowerCase().includes(q) ||
            (k.payload.tags || []).some((t) => t.toLowerCase().includes(q)) ||
            (k.payload.source || '').toLowerCase().includes(q)
          : true
      );
  }, [allFactualEntries, categoryFilter, searchTerm]);

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

  const pagedFachwissen = usePagination(fachwissenEntries, 6);
  const pagedErfahrung = usePagination(erfahrungEntries, 6);

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
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {tab === 'fachwissen' && (
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-xs"
              >
                <option value="Alle">Alle Themen ({allFactualEntries.length})</option>
                {fachwissenCategories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            )}
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Wissen durchsuchen…"
              className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-xs w-full sm:w-56"
            />
          </div>
        )}
      </div>

      {/* A: Verified / Sourced Fachwissen */}
      {tab === 'fachwissen' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#597CD4]/10 border border-[#597CD4]/30 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs text-neutral-800 dark:text-neutral-200">
            <div className="space-y-1">
              <div>
                <strong>Bereich A — Geprüftes Fachwissen:</strong> Jeder Eintrag enthält eine explizite Fachquelle (z.B. BfR, BZfE, TLLLR Thüringen, LWG Bayern, StIKo Vet/FLI) und bleibt klar von persönlichen Hof-Erfahrungen getrennt.
              </div>
              {missingRefStats.totalMissing === 0 && (
                <div className="text-[#3B6912] dark:text-[#BBE774] font-medium inline-flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Vollständige Fachwissen-, Sorten- und Rezept-Bibliothek in Firebase vorhanden.
                </div>
              )}
            </div>
            {missingRefStats.totalMissing > 0 && (
              <button
                type="button"
                disabled={seedingRefs}
                onClick={async () => {
                  setSeedingRefs(true);
                  try {
                    await seedReferenceDatabases();
                  } finally {
                    setSeedingRefs(false);
                  }
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#233A29] text-white text-xs font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50 transition whitespace-nowrap shrink-0"
              >
                <Database className="w-4 h-4" />
                {seedingRefs
                  ? 'Wird in Firebase gespeichert…'
                  : `Fachwissen-Datenbank ergänzen (${missingRefStats.totalMissing} neu)`}
              </button>
            )}
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
                        <BookOpen className="w-4 h-4 text-[#597CD4] shrink-0" />
                        {entry.title}
                      </h3>
                      <div className="text-xs text-neutral-500 mt-0.5">
                        Fachwissen · {entry.payload.category} · <span className="font-mono-num">{entry.payload.date}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEdit(entry)}
                        className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700"
                        aria-label="Bearbeiten"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => archiveRecord('knowledgeEntries', entry.id, entry.title)}
                        className="p-2.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-[#CF6432]"
                        aria-label="Archivieren"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed whitespace-pre-line">
                    {entry.payload.content}
                  </p>
                  {entry.payload.safetyWarning && (
                    <div className="p-3 rounded-xl bg-[#CF6432]/12 border border-[#CF6432]/35 text-xs text-[#9A3E14] dark:text-[#F49D76] flex items-start gap-2">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{entry.payload.safetyWarning}</span>
                    </div>
                  )}
                  <div className="text-xs text-neutral-600 dark:text-neutral-400 border-t border-neutral-100 dark:border-neutral-800 pt-2 space-y-1">
                    <div>
                      <strong>Quelle:</strong> {entry.payload.source}
                    </div>
                    {entry.payload.tags && entry.payload.tags.length > 0 && (
                      <div className="text-[11px] text-neutral-500">
                        Stichworte: {entry.payload.tags.join(' · ')}
                      </div>
                    )}
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
      {tab === 'assistent' && <HomesteadAssistantPanel />}

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
