import React, { useMemo, useState } from 'react';
import {
  Archive,
  BookOpen,
  CheckCircle2,
  Database,
  Edit3,
  HeartPulse,
  Plus,
  ShoppingCart,
} from 'lucide-react';
import { useHomestead } from '../context/HomesteadContext';
import { buildStarterKnowledge } from '../data/botanicalCatalog';
import {
  EmptyState,
  Modal,
  ModuleHeader,
  PaginationControls,
  SegmentedTabs,
  usePagination,
} from '../components/ui/SharedUI';
import type {
  AnimalGroupPayload,
  AnimalLogPayload,
  FeedStockPayload,
  HomesteadRecord,
} from '../types/homestead';

export const AnimalsView: React.FC = () => {
  const {
    animalGroups,
    animalLogs,
    feedStocks,
    areas,
    knowledgeEntries,
    setActiveModule,
    seedReferenceDatabases,
    createRecord,
    updateRecord,
    archiveRecord,
    pushToast,
  } = useHomestead();

  const [tab, setTab] = useState<'groups' | 'production' | 'feed' | 'health'>('groups');
  const [seedingRefs, setSeedingRefs] = useState(false);
  const [groupModal, setGroupModal] = useState(false);
  const [editingGroup, setEditingGroup] = useState<HomesteadRecord<AnimalGroupPayload> | null>(null);
  const [groupForm, setGroupForm] = useState<AnimalGroupPayload>({
    species: 'Hühner',
    breed: '',
    count: 6,
    femaleCount: 5,
    maleCount: 1,
    ageGroup: 'Adult',
    breedingGroup: '',
    housingSystem: 'Stall + Auslauf',
    areaId: '',
    areaName: '',
    feedingPlan: '',
    waterSchedule: 'Täglich frisch',
    beddingNotes: '',
    cleaningIntervalDays: 7,
    lastCleanedDate: new Date().toISOString().slice(0, 10),
    notes: '',
  });

  const [logModal, setLogModal] = useState(false);
  const [logForm, setLogForm] = useState<AnimalLogPayload>({
    groupId: '',
    groupName: '',
    logType: 'Eier',
    date: new Date().toISOString().slice(0, 10),
    quantity: 5,
    unit: 'Stück',
    details: '',
  });

  const [feedModal, setFeedModal] = useState(false);
  const [editingFeed, setEditingFeed] = useState<HomesteadRecord<FeedStockPayload> | null>(null);
  const [feedForm, setFeedForm] = useState<FeedStockPayload>({
    feedName: '',
    species: 'Hühner',
    manufacturer: '',
    source: '',
    quantityKg: 25,
    minStockKg: 10,
    dailyConsumptionKg: 1,
    costPerPurchaseEur: 20,
    lastPurchased: new Date().toISOString().slice(0, 10),
  });

  const activeGroups = useMemo(() => animalGroups.filter((g) => !g.archived), [animalGroups]);
  const activeLogs = useMemo(() => animalLogs.filter((l) => !l.archived), [animalLogs]);
  const activeFeed = useMemo(() => feedStocks.filter((f) => !f.archived), [feedStocks]);
  const activeAreas = useMemo(() => areas.filter((a) => !a.archived), [areas]);
  const missingKnowledgeCount = useMemo(() => {
    const existing = new Set(knowledgeEntries.map((k) => k.title.trim().toLowerCase()));
    return buildStarterKnowledge().filter((k) => !existing.has(k.title.trim().toLowerCase())).length;
  }, [knowledgeEntries]);

  const productionLogs = useMemo(
    () => activeLogs.filter((l) => !['Gesundheit', 'Tierarzt', 'Impfung'].includes(l.payload.logType)),
    [activeLogs]
  );
  const healthLogs = useMemo(
    () => activeLogs.filter((l) => ['Gesundheit', 'Tierarzt', 'Impfung'].includes(l.payload.logType)),
    [activeLogs]
  );

  const groupPagination = usePagination(activeGroups, 4);
  const productionPagination = usePagination(productionLogs, 6);
  const feedPagination = usePagination(activeFeed, 4);
  const healthPagination = usePagination(healthLogs, 5);

  const totalEggs30Days = useMemo(() => {
    const cutoff = new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10);
    return activeLogs
      .filter((l) => l.payload.logType === 'Eier' && l.payload.date >= cutoff)
      .reduce((s, l) => s + (Number(l.payload.quantity) || 0), 0);
  }, [activeLogs]);

  const saveGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = groupForm.breedingGroup
      ? `${groupForm.species} · ${groupForm.breedingGroup}`
      : `${groupForm.species} (${groupForm.breed || 'Bestand'})`;
    const areaObj = activeAreas.find((a) => a.id === groupForm.areaId);
    const payload = { ...groupForm, areaName: areaObj?.title || groupForm.areaName };
    if (editingGroup) {
      await updateRecord('animalGroups', editingGroup.id, title, payload, editingGroup.updatedAtMs);
      pushToast('success', 'Tiergruppe aktualisiert.');
    } else {
      await createRecord('animalGroups', title, payload);
      pushToast('success', 'Tiergruppe angelegt.');
    }
    setGroupModal(false);
  };

  const markCleanedToday = async (g: HomesteadRecord<AnimalGroupPayload>) => {
    const today = new Date().toISOString().slice(0, 10);
    await updateRecord('animalGroups', g.id, g.title, { ...g.payload, lastCleanedDate: today }, g.updatedAtMs);
    await createRecord('animalLogs', `Stallreinigung · ${g.title}`, {
      groupId: g.id,
      groupName: g.title,
      logType: 'Reinigung',
      date: today,
      quantity: 1,
      unit: 'Mal',
      details: 'Reguläre Stall-/Gehegereinigung durchgeführt.',
    });
    pushToast('success', `Reinigung für ${g.title} eingetragen.`);
  };

  const saveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    const grp = activeGroups.find((g) => g.id === logForm.groupId);
    const groupName = grp?.title || logForm.groupName || 'Bestand';
    const title = `${logForm.logType} · ${groupName}`;
    await createRecord('animalLogs', title, { ...logForm, groupName });
    pushToast('success', `${logForm.logType} dokumentiert.`);
    setLogModal(false);
  };

  const saveFeed = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = feedForm.feedName;
    if (editingFeed) {
      await updateRecord('feedStocks', editingFeed.id, title, feedForm, editingFeed.updatedAtMs);
      pushToast('success', 'Futterbestand aktualisiert.');
    } else {
      await createRecord('feedStocks', title, feedForm);
      pushToast('success', 'Futterart erfasst.');
    }
    setFeedModal(false);
  };

  const addFeedToShopping = async (f: HomesteadRecord<FeedStockPayload>) => {
    await createRecord('shoppingItems', f.payload.feedName, {
      category: 'Futter',
      quantity: 25,
      unit: 'kg',
      source: f.payload.source || 'Landhandel',
      estimatedPriceEur: f.payload.costPerPurchaseEur || 0,
      purchased: false,
    });
    pushToast('success', `${f.payload.feedName} auf die Einkaufsliste gesetzt.`);
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Tierhaltung & Bestände"
        subtitle="Bestandsgruppen (Hühner, Kaninchen & erweiterbar), Versorgung, Eierproduktion, Futterreichweite & Gesundheit"
        actions={
          <>
            <button
              type="button"
              onClick={() => {
                setLogForm({
                  ...logForm,
                  groupId: activeGroups[0]?.id || '',
                  logType: tab === 'health' ? 'Gesundheit' : 'Eier',
                  unit: tab === 'health' ? 'Eintrag' : 'Stück',
                });
                setLogModal(true);
              }}
              className="px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Eintrag / Eier / Gesundheit
            </button>
            {tab === 'feed' ? (
              <button
                type="button"
                onClick={() => {
                  setEditingFeed(null);
                  setFeedModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-[#233A29] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Neues Futter
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setEditingGroup(null);
                  setGroupModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-[#233A29] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Neue Tiergruppe
              </button>
            )}
          </>
        }
      />

      <SegmentedTabs
        activeTab={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: 'groups', label: `Tiergruppen (${activeGroups.length})` },
          { id: 'production', label: `Produktion & Eier (${totalEggs30Days} / 30T)` },
          { id: 'feed', label: `Futter (${activeFeed.length})` },
          { id: 'health', label: 'Gesundheit & Tierarzt' },
        ]}
      />

      <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-xl px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-2 text-neutral-600 dark:text-neutral-300">
          <BookOpen className="w-4 h-4 text-[#233A29] dark:text-[#BBE774] shrink-0" />
          <span>
            Rassen, Futter, Pflege, Vermehrung, Ausbeinen sowie Eier- &amp; Fleischlagerung für Hühner &amp; Kaninchen im Fachwissen.
          </span>
        </div>
        <div className="flex items-center gap-2">
          {missingKnowledgeCount > 0 && (
            <button
              type="button"
              disabled={seedingRefs}
              onClick={async () => {
                setSeedingRefs(true);
                try {
                  const res = await seedReferenceDatabases();
                  pushToast('success', `${res.added} neue Einträge in die Hof-Datenbanken geladen.`);
                } finally {
                  setSeedingRefs(false);
                }
              }}
              className="px-2.5 py-1.5 rounded-lg bg-[#233A29] text-white font-semibold inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Database className="w-3.5 h-3.5" />
              {seedingRefs ? 'Lädt…' : `Datenbank ergänzen (+${missingKnowledgeCount})`}
            </button>
          )}
          <button
            type="button"
            onClick={() => setActiveModule('knowledge')}
            className="px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 font-semibold text-neutral-800 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800/60"
          >
            Tier-Fachwissen öffnen →
          </button>
        </div>
      </div>

      {tab === 'groups' && (
        <>
          {activeGroups.length === 0 ? (
            <EmptyState
              title="Noch keine Tiergruppen angelegt"
              description="Die Tierhaltung arbeitet übersichtlich mit Gruppen und Beständen statt einzelner Akten pro Huhn oder Kaninchen."
              actionLabel="Erste Tiergruppe anlegen"
              onAction={() => setGroupModal(true)}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {groupPagination.pageItems.map((g) => (
                  <article
                    key={g.id}
                    className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden flex flex-col justify-between"
                  >
                    <div className="p-4 sm:p-5 space-y-3">
                      <div className="text-xs text-neutral-500 flex items-center justify-between">
                        <span>{g.payload.species} · {g.payload.breed || 'Gemischt'}</span>
                        <span className="font-mono-num font-semibold text-neutral-900 dark:text-neutral-100">
                          {g.payload.count} Tiere ({g.payload.femaleCount}w / {g.payload.maleCount}m)
                        </span>
                      </div>
                      <h3 className="font-display text-lg font-bold">{g.title}</h3>
                      <dl className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <dt className="text-neutral-500">Stall / Gehege</dt>
                          <dd className="font-medium">{g.payload.areaName || g.payload.housingSystem}</dd>
                        </div>
                        <div>
                          <dt className="text-neutral-500">Letzte Reinigung</dt>
                          <dd className="font-mono-num font-medium">
                            {g.payload.lastCleanedDate || '—'} (alle {g.payload.cleaningIntervalDays} T.)
                          </dd>
                        </div>
                        <div className="col-span-2">
                          <dt className="text-neutral-500">Fütterungsplan</dt>
                          <dd className="text-neutral-700 dark:text-neutral-300">{g.payload.feedingPlan || '—'}</dd>
                        </div>
                      </dl>
                      <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-neutral-100 dark:border-neutral-800">
                        <button
                          type="button"
                          onClick={() => markCleanedToday(g)}
                          className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#A8F0D7]/35 text-xs font-semibold text-neutral-900 dark:text-neutral-100 inline-flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Reinigung heute
                        </button>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingGroup(g);
                              setGroupForm(g.payload);
                              setGroupModal(true);
                            }}
                            className="min-h-[38px] px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-medium inline-flex items-center gap-1"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                            Bearbeiten
                          </button>
                          <button
                            type="button"
                            onClick={() => archiveRecord('animalGroups', g.id, g.title)}
                            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg text-[#CF6432] hover:bg-[#CF6432]/10"
                            aria-label="Archivieren"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
              <PaginationControls
                page={groupPagination.page}
                totalPages={groupPagination.totalPages}
                totalItems={groupPagination.totalItems}
                onPageChange={groupPagination.setPage}
                itemLabel="Tiergruppen"
              />
            </>
          )}
        </>
      )}

      {tab === 'production' && (
        <div className="space-y-4">
          {productionLogs.length === 0 ? (
            <EmptyState
              title="Noch keine Produktions- oder Stall-Einträge"
              description="Dokumentiere Eier, Fütterungen, Reinigungen oder Nachwuchs."
            />
          ) : (
            <>
              <div className="md:hidden space-y-2.5">
                {productionPagination.pageItems.map((l) => (
                  <div
                    key={l.id}
                    className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="font-semibold text-sm">
                        {l.payload.logType} · {l.payload.quantity} {l.payload.unit}
                      </div>
                      <div className="text-neutral-500 font-mono-num">
                        {l.payload.date} · {l.payload.groupName}
                      </div>
                      {l.payload.details && (
                        <div className="text-neutral-600 dark:text-neutral-400">{l.payload.details}</div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => archiveRecord('animalLogs', l.id, l.title)}
                      className="min-h-[36px] text-xs text-[#CF6432] shrink-0"
                    >
                      Entfernen
                    </button>
                  </div>
                ))}
              </div>

              <div className="hidden md:block bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left text-xs text-neutral-500">
                      <th className="py-3 px-4">Datum</th>
                      <th className="py-3 px-4">Art</th>
                      <th className="py-3 px-4">Tiergruppe</th>
                      <th className="py-3 px-4 text-right">Menge</th>
                      <th className="py-3 px-4">Details</th>
                      <th className="py-3 px-4 text-right">Aktion</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {productionPagination.pageItems.map((l) => (
                      <tr key={l.id}>
                        <td className="py-3 px-4 font-mono-num">{l.payload.date}</td>
                        <td className="py-3 px-4 font-medium">{l.payload.logType}</td>
                        <td className="py-3 px-4">{l.payload.groupName}</td>
                        <td className="py-3 px-4 text-right font-mono-num">
                          {l.payload.quantity} {l.payload.unit}
                        </td>
                        <td className="py-3 px-4 text-xs text-neutral-600 dark:text-neutral-400">{l.payload.details}</td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={() => archiveRecord('animalLogs', l.id, l.title)}
                            className="text-xs text-[#CF6432] hover:underline"
                          >
                            Entfernen
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <PaginationControls
                page={productionPagination.page}
                totalPages={productionPagination.totalPages}
                totalItems={productionPagination.totalItems}
                onPageChange={productionPagination.setPage}
                itemLabel="Einträge"
              />
            </>
          )}
        </div>
      )}

      {tab === 'feed' && (
        <div className="space-y-4">
          {activeFeed.length === 0 ? (
            <EmptyState
              title="Noch kein Futterbestand erfasst"
              description="Lege Futtersorten mit Verbrauch und Mindestbestand an."
              actionLabel="Erstes Futter anlegen"
              onAction={() => setFeedModal(true)}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {feedPagination.pageItems.map((f) => {
                  const daysLeft =
                    f.payload.dailyConsumptionKg > 0
                      ? Math.floor(f.payload.quantityKg / f.payload.dailyConsumptionKg)
                      : null;
                  const low = f.payload.quantityKg <= f.payload.minStockKg;
                  return (
                    <div
                      key={f.id}
                      className={`bg-white dark:bg-[#161D1A] border rounded-2xl p-4 sm:p-5 space-y-3 ${
                        low ? 'border-[#CF6432]' : 'border-neutral-200 dark:border-neutral-800'
                      }`}
                    >
                      <div className="text-xs text-neutral-500 flex items-center justify-between">
                        <span>{f.payload.species} · {f.payload.manufacturer}</span>
                        {low && <span className="text-[#CF6432] font-semibold">Mindestbestand!</span>}
                      </div>
                      <h3 className="font-display text-base font-bold">{f.payload.feedName}</h3>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <span className="text-neutral-500 block">Lagerbestand</span>
                          <span className="text-lg font-bold font-mono-num">{f.payload.quantityKg} kg</span>
                        </div>
                        <div>
                          <span className="text-neutral-500 block">Reichweite ca.</span>
                          <span className="text-lg font-bold font-mono-num">
                            {daysLeft !== null ? `${daysLeft} Tage` : '—'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800">
                        <button
                          type="button"
                          onClick={() => addFeedToShopping(f)}
                          className="min-h-[36px] text-xs font-medium text-[#233A29] dark:text-[#BBE774] inline-flex items-center gap-1 hover:underline"
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          Einkaufsliste
                        </button>
                        <div className="flex gap-3">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingFeed(f);
                              setFeedForm(f.payload);
                              setFeedModal(true);
                            }}
                            className="min-h-[36px] text-xs text-[#597CD4] hover:underline"
                          >
                            Bearbeiten
                          </button>
                          <button
                            type="button"
                            onClick={() => archiveRecord('feedStocks', f.id, f.title)}
                            className="min-h-[36px] text-xs text-[#CF6432] hover:underline"
                          >
                            Archivieren
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <PaginationControls
                page={feedPagination.page}
                totalPages={feedPagination.totalPages}
                totalItems={feedPagination.totalItems}
                onPageChange={feedPagination.setPage}
                itemLabel="Futtermittel"
              />
            </>
          )}
        </div>
      )}

      {tab === 'health' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#597CD4]/10 border border-[#597CD4]/35 text-xs flex items-start gap-2.5">
            <HeartPulse className="w-4 h-4 text-[#597CD4] shrink-0 mt-0.5" />
            <span>
              <strong>Dokumentationshinweis:</strong> Dieses Modul dient ausschließlich der Verlaufsdokumentation von Beobachtungen, Impfungen und Tierarztterminen — es ersetzt keine tierärztliche Diagnose.
            </span>
          </div>
          {healthLogs.length === 0 ? (
            <EmptyState
              title="Keine Gesundheits- oder Tierarzt-Einträge"
              description="Dokumentiere Impfungen, Beobachtungen oder Tierarztbesuche."
            />
          ) : (
            <>
              <div className="space-y-2">
                {healthPagination.pageItems.map((l) => (
                  <div
                    key={l.id}
                    className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 flex justify-between gap-4 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="font-semibold text-sm">
                        {l.payload.logType} · {l.payload.groupName}
                      </div>
                      <div className="text-neutral-500 font-mono-num">{l.payload.date}</div>
                      <div>{l.payload.details}</div>
                      {l.payload.symptoms && <div>Symptome: {l.payload.symptoms}</div>}
                      {l.payload.treatment && <div>Maßnahme/Medikament: {l.payload.treatment}</div>}
                    </div>
                    <button
                      type="button"
                      onClick={() => archiveRecord('animalLogs', l.id, l.title)}
                      className="min-h-[36px] text-[#CF6432] hover:underline self-start"
                    >
                      Entfernen
                    </button>
                  </div>
                ))}
              </div>
              <PaginationControls
                page={healthPagination.page}
                totalPages={healthPagination.totalPages}
                totalItems={healthPagination.totalItems}
                onPageChange={healthPagination.setPage}
                itemLabel="Einträge"
              />
            </>
          )}
        </div>
      )}

      {/* Modals */}
      <Modal open={groupModal} onClose={() => setGroupModal(false)} title="Tiergruppe verwalten">
        <form onSubmit={saveGroup} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Tierart</label>
              <select
                value={groupForm.species}
                onChange={(e) => setGroupForm({ ...groupForm, species: e.target.value as AnimalGroupPayload['species'] })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-sm"
              >
                {['Hühner', 'Kaninchen', 'Ziegen', 'Schafe', 'Enten', 'Gänse', 'Wachteln', 'Sonstige'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Rasse</label>
              <input
                type="text"
                value={groupForm.breed}
                onChange={(e) => setGroupForm({ ...groupForm, breed: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Anzahl gesamt</label>
              <input
                type="number"
                value={groupForm.count}
                onChange={(e) => setGroupForm({ ...groupForm, count: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Weiblich / Männlich</label>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="number"
                  value={groupForm.femaleCount}
                  onChange={(e) => setGroupForm({ ...groupForm, femaleCount: Number(e.target.value) })}
                  placeholder="w"
                  className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm font-mono-num"
                />
                <input
                  type="number"
                  value={groupForm.maleCount}
                  onChange={(e) => setGroupForm({ ...groupForm, maleCount: Number(e.target.value) })}
                  placeholder="m"
                  className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm font-mono-num"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Zuchtgruppe / Bezeichnung</label>
              <input
                type="text"
                value={groupForm.breedingGroup}
                onChange={(e) => setGroupForm({ ...groupForm, breedingGroup: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Stall / Bereich</label>
              <select
                value={groupForm.areaId}
                onChange={(e) => setGroupForm({ ...groupForm, areaId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-sm"
              >
                <option value="">Bereich wählen…</option>
                {activeAreas.map((a) => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Fütterungsplan</label>
            <textarea
              rows={2}
              value={groupForm.feedingPlan}
              onChange={(e) => setGroupForm({ ...groupForm, feedingPlan: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setGroupModal(false)} className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-medium">Abbrechen</button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#233A29] text-white text-xs font-semibold">Speichern</button>
          </div>
        </form>
      </Modal>

      <Modal open={logModal} onClose={() => setLogModal(false)} title="Tier-Ereignis / Produktion dokumentieren">
        <form onSubmit={saveLog} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Tiergruppe</label>
              <select
                value={logForm.groupId}
                onChange={(e) => setLogForm({ ...logForm, groupId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-sm"
              >
                {activeGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Kategorie</label>
              <select
                value={logForm.logType}
                onChange={(e) => setLogForm({ ...logForm, logType: e.target.value as AnimalLogPayload['logType'] })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-sm"
              >
                {['Eier', 'Milch', 'Fütterung', 'Reinigung', 'Gesundheit', 'Tierarzt', 'Impfung', 'Zugang/Abgang', 'Nachwuchs', 'Gewicht'].map((t) => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Datum</label>
              <input type="date" value={logForm.date} onChange={(e) => setLogForm({ ...logForm, date: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1">Menge</label>
                <input type="number" step="0.1" value={logForm.quantity} onChange={(e) => setLogForm({ ...logForm, quantity: Number(e.target.value) })} className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm font-mono-num" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Einheit</label>
                <input type="text" value={logForm.unit} onChange={(e) => setLogForm({ ...logForm, unit: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm" />
              </div>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Beobachtung / Details</label>
            <textarea rows={2} value={logForm.details} onChange={(e) => setLogForm({ ...logForm, details: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm" />
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setLogModal(false)} className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-medium">Abbrechen</button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#233A29] text-white text-xs font-semibold">Speichern</button>
          </div>
        </form>
      </Modal>

      <Modal open={feedModal} onClose={() => setFeedModal(false)} title="Futterbestand verwalten">
        <form onSubmit={saveFeed} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Futterbezeichnung *</label>
              <input type="text" required value={feedForm.feedName} onChange={(e) => setFeedForm({ ...feedForm, feedName: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Tierart</label>
              <input type="text" value={feedForm.species} onChange={(e) => setFeedForm({ ...feedForm, species: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Bestand (kg)</label>
              <input type="number" step="0.5" value={feedForm.quantityKg} onChange={(e) => setFeedForm({ ...feedForm, quantityKg: Number(e.target.value) })} className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm font-mono-num" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Tagesverbrauch (kg)</label>
              <input type="number" step="0.1" value={feedForm.dailyConsumptionKg} onChange={(e) => setFeedForm({ ...feedForm, dailyConsumptionKg: Number(e.target.value) })} className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm font-mono-num" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Mindestbestand (kg)</label>
              <input type="number" step="0.5" value={feedForm.minStockKg} onChange={(e) => setFeedForm({ ...feedForm, minStockKg: Number(e.target.value) })} className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm font-mono-num" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Bezugsquelle</label>
              <input type="text" value={feedForm.source} onChange={(e) => setFeedForm({ ...feedForm, source: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setFeedModal(false)} className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-medium">Abbrechen</button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#233A29] text-white text-xs font-semibold">Speichern</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
