import React, { useEffect, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Bird,
  Check,
  CloudSun,
  Eye,
  EyeOff,
  Hammer,
  Plus,
  SlidersHorizontal,
  Sparkles,
  Sprout,
  Warehouse,
} from 'lucide-react';
import { DEFAULT_DASHBOARD_LAYOUT, useHomestead } from '../context/HomesteadContext';
import { describeWeatherCode } from '../lib/weather';
import { MONTHLY_GARDEN_CALENDAR, PHENOLOGICAL_PHASES } from '../data/botanicalCatalog';
import { Modal, SegmentedTabs } from '../components/ui/SharedUI';
import { HomesteadAssistantPanel } from '../components/assistant/HomesteadAssistantPanel';

export const DashboardView: React.FC = () => {
  const {
    activeIdentity,
    userProfile,
    sharedDashboardLayout,
    areas,
    plants,
    plantings,
    animalGroups,
    animalLogs,
    feedStocks,
    harvests,
    batches,
    inventoryItems,
    projects,
    calendarEvents,
    shoppingItems,
    weather,
    setActiveModule,
    updateRecord,
    updatePersonalNotes,
    updateDashboardLayout,
    initializeStarterData,
    pushToast,
  } = useHomestead();

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [notesDraft, setNotesDraft] = useState(userProfile?.personalNotes ?? '');
  const [seeding, setSeeding] = useState(false);
  const [mobilePage, setMobilePage] = useState<'tasks' | 'assistant' | 'weather' | 'farm' | 'pantry' | 'notes'>('tasks');

  useEffect(() => {
    setNotesDraft(userProfile?.personalNotes ?? '');
  }, [userProfile?.personalNotes]);

  const layout = sharedDashboardLayout;

  const activeAreas = areas.filter((a) => !a.archived);
  const activePlants = plants.filter((p) => !p.archived);
  const activePlantings = plantings.filter((p) => !p.archived);
  const activeAnimals = animalGroups.filter((g) => !g.archived);
  const activeFeed = feedStocks.filter((f) => !f.archived);
  const activeHarvests = harvests.filter((h) => !h.archived);
  const activeBatches = batches.filter((b) => !b.archived);
  const activeInventory = inventoryItems.filter((i) => !i.archived);
  const activeProjects = projects.filter((p) => !p.archived && p.payload.status !== 'Abgeschlossen');
  const activeShopping = shoppingItems.filter((s) => !s.archived && !s.payload.purchased);
  const activeEvents = calendarEvents.filter((e) => !e.archived);

  const todayStr = new Date().toISOString().slice(0, 10);
  const tasks = activeEvents.filter((e) => e.payload.eventType === 'task' && !e.payload.completed);
  const todayTasks = tasks.filter((t) => t.payload.date === todayStr);
  const overdueTasks = tasks.filter((t) => t.payload.date < todayStr);
  const nicoTasks = tasks.filter((t) => t.payload.assignee === 'Nico');
  const chrisTasks = tasks.filter((t) => t.payload.assignee === 'Chris');
  const sharedTasks = tasks.filter((t) => t.payload.assignee === 'Gemeinsam');
  const upcomingEvents = activeEvents
    .filter((e) => e.payload.date >= todayStr)
    .sort((a, b) => a.payload.date.localeCompare(b.payload.date))
    .slice(0, 2);

  const totalAnimalsCount = activeAnimals.reduce((s, a) => s + (a.payload.count || 0), 0);
  const eggLogs = animalLogs.filter((l) => !l.archived && l.payload.logType === 'Eier');
  const recentEggs = eggLogs
    .filter((l) => l.payload.date >= new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10))
    .reduce((s, l) => s + (l.payload.quantity || 0), 0);

  const lowFeed = activeFeed.filter((f) => f.payload.quantityKg <= f.payload.minStockKg);
  const lowInventory = activeInventory.filter((i) => i.payload.quantity <= i.payload.minQuantity);

  const currentMonthIdx = new Date().getMonth();
  const phenoIdx = Math.min(PHENOLOGICAL_PHASES.length - 1, Math.floor((currentMonthIdx / 12) * PHENOLOGICAL_PHASES.length));
  const currentPheno = PHENOLOGICAL_PHASES[phenoIdx];
  const currentMonthGuide = MONTHLY_GARDEN_CALENDAR[currentMonthIdx];

  const toggleTaskDone = async (ev: (typeof activeEvents)[number]) => {
    await updateRecord(
      'calendarEvents',
      ev.id,
      ev.title,
      { ...ev.payload, completed: !ev.payload.completed },
      ev.updatedAtMs
    );
    pushToast('success', ev.payload.completed ? 'Aufgabe wieder geöffnet.' : 'Aufgabe abgehakt.');
  };

  const moveCard = async (id: string, dir: -1 | 1) => {
    const idx = layout.findIndex((c) => c.id === id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= layout.length) return;
    const next = [...layout];
    const tmp = next[idx];
    next[idx] = next[swapIdx];
    next[swapIdx] = tmp;
    const reindexed = next.map((c, i) => ({ ...c, priority: i + 1 }));
    await updateDashboardLayout(reindexed);
  };

  const toggleCardVisible = async (id: string) => {
    const next = layout.map((c) => (c.id === id ? { ...c, visible: !c.visible } : c));
    await updateDashboardLayout(next);
  };

  const isEmptyHomestead = activeAreas.length === 0 && activePlants.length === 0 && activeAnimals.length === 0;

  return (
    <div className="space-y-3">
      {/* Compact Single-Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2.5 border-b border-neutral-200 dark:border-neutral-800">
        <div className="min-w-0">
          <h1 className="font-display text-lg sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100 tracking-tight truncate">
            Guten Tag, {activeIdentity || 'Hof-Team'}
          </h1>
          <p className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
            Mellenbach-Glasbach · {currentPheno.phase} ({currentPheno.indicatorPlant})
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setActiveModule('calendar')}
            className="px-3 py-1.5 rounded-xl bg-[#233A29] text-white text-xs font-medium inline-flex items-center gap-1.5 hover:opacity-90 transition whitespace-nowrap"
          >
            <Plus className="w-3.5 h-3.5" />
            Aufgabe / Termin
          </button>
          <button
            type="button"
            onClick={() => setShowConfigModal(true)}
            className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition whitespace-nowrap"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            Anordnung
          </button>
        </div>
      </div>

      {isEmptyHomestead && (
        <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="space-y-1">
            <h2 className="font-display text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#233A29] dark:text-[#BBE774]" />
              Erste Einrichtung für euren Selbstversorgerhof
            </h2>
            <p className="text-xs text-neutral-600 dark:text-neutral-400 max-w-2xl">
              Mit einem Klick Grundbereiche (Hochbeet, Gewächshaus, Streuobstwiese, Hühnerstall, Kaninchen), Sorten, Rezepte und Fachwissen für Mellenbach-Glasbach anlegen.
            </p>
          </div>
          <button
            type="button"
            disabled={seeding}
            onClick={async () => {
              setSeeding(true);
              await initializeStarterData();
              setSeeding(false);
            }}
            className="px-3.5 py-2 rounded-xl bg-[#233A29] text-white text-xs font-semibold hover:opacity-90 transition whitespace-nowrap shrink-0"
          >
            {seeding ? 'Wird eingerichtet…' : 'Hof-Grundstruktur anlegen'}
          </button>
        </div>
      )}

      {/* Mobile Paged Section Selector (prevents vertical scrolling on phones) */}
      <div className="lg:hidden">
        <SegmentedTabs
          tabs={[
            { id: 'tasks', label: `Aufgaben (${tasks.length})` },
            { id: 'assistant', label: 'Assistent' },
            { id: 'weather', label: weather ? `${Math.round(weather.current.temp)}° Wetter` : 'Wetter' },
            { id: 'farm', label: 'Garten & Tiere' },
            { id: 'pantry', label: 'Vorräte & Bau' },
            { id: 'notes', label: 'Notizen' },
          ]}
          activeTab={mobilePage}
          onChange={(id) => setMobilePage(id as typeof mobilePage)}
        />
      </div>

      {/* Single-Page Compact Bento Grid (fits cleanly within 1 desktop viewport) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-3">
        {layout
          .filter((c) => c.visible)
          .map((card) => {
            const mobileVisible =
              (mobilePage === 'weather' && card.id === 'weather') ||
              (mobilePage === 'assistant' && card.id === 'assistant') ||
              (mobilePage === 'tasks' && card.id === 'tasks') ||
              (mobilePage === 'farm' && (card.id === 'garden' || card.id === 'animals')) ||
              (mobilePage === 'pantry' && (card.id === 'pantry' || card.id === 'projects')) ||
              (mobilePage === 'notes' && card.id === 'notes');
            const mobileHideClass = mobileVisible ? '' : 'hidden lg:block';

            if (card.id === 'weather') {
              const cond = weather ? describeWeatherCode(weather.current.weatherCode) : null;
              const topAlert = weather?.gardenAlerts[0];
              return (
                <section
                  key="weather"
                  className={`${mobileHideClass} lg:col-span-7 bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden flex flex-col`}
                >
                  <div className="h-1 w-full bg-gradient-to-r from-[#597CD4] to-[#38BDF8]" />
                  <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="font-display text-sm sm:text-base font-semibold flex items-center gap-1.5">
                        <CloudSun className="w-4 h-4 text-[#597CD4]" />
                        Wetter Mellenbach-Glasbach
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveModule('weather')}
                        className="text-[11px] font-semibold text-[#597CD4] hover:underline whitespace-nowrap"
                      >
                        Vollansicht →
                      </button>
                    </div>

                    {weather ? (
                      <>
                        <div className="grid grid-cols-4 gap-2">
                          <div className="px-2.5 py-1.5 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412]">
                            <div className="text-[10px] text-neutral-500">Aktuell</div>
                            <div className="text-lg font-bold font-mono-num leading-tight">
                              {weather.current.temp.toFixed(1)} °C
                            </div>
                            <div className="text-[10px] text-neutral-500 truncate">{cond?.label}</div>
                          </div>
                          <div className="px-2.5 py-1.5 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412]">
                            <div className="text-[10px] text-neutral-500">Regen</div>
                            <div className="text-lg font-bold font-mono-num leading-tight">
                              {weather.today.precipProbMax} %
                            </div>
                            <div className="text-[10px] text-neutral-500 font-mono-num">
                              {weather.daily[0]?.precipSum.toFixed(1)} mm
                            </div>
                          </div>
                          <div className="px-2.5 py-1.5 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412]">
                            <div className="text-[10px] text-neutral-500">Min / Max</div>
                            <div className="text-base font-bold font-mono-num leading-tight">
                              {weather.today.tempMin.toFixed(0)}° / {weather.today.tempMax.toFixed(0)}°
                            </div>
                            <div className="text-[10px] text-neutral-500">
                              Gef. {weather.current.apparentTemp.toFixed(0)}°C
                            </div>
                          </div>
                          <div className="px-2.5 py-1.5 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412]">
                            <div className="text-[10px] text-neutral-500">Wind</div>
                            <div className="text-lg font-bold font-mono-num leading-tight">
                              {Math.round(weather.current.windSpeed)} <span className="text-[10px] font-normal">km/h</span>
                            </div>
                            <div className="text-[10px] text-neutral-500 font-mono-num">
                              Böen {Math.round(weather.current.windGusts)}
                            </div>
                          </div>
                        </div>

                        {topAlert && (
                          <div
                            className={`px-2.5 py-1.5 rounded-xl border text-[11px] truncate ${
                              topAlert.level === 'warning'
                                ? 'bg-[#CF6432]/10 border-[#CF6432]/35 text-neutral-900 dark:text-neutral-100'
                                : topAlert.level === 'caution'
                                ? 'bg-[#FFC814]/15 border-[#FFC814]/45 text-neutral-900 dark:text-neutral-100'
                                : 'bg-[#A8F0D7]/20 border-[#A8F0D7]/50 text-neutral-900 dark:text-neutral-100'
                            }`}
                            title={`${topAlert.title}: ${topAlert.recommendation}`}
                          >
                            <strong>{topAlert.title}:</strong> {topAlert.recommendation}
                          </div>
                        )}

                        <div className="grid grid-cols-7 gap-1 text-center">
                          {weather.daily.slice(0, 7).map((d) => (
                            <div key={d.date} className="py-1 px-1 rounded-lg bg-[#F7F7F5] dark:bg-[#0F1412] text-[11px]">
                              <div className="text-[10px] text-neutral-500 font-medium">
                                {new Date(d.date + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short' })}
                              </div>
                              <div className="font-mono-num font-semibold leading-tight">
                                {Math.round(d.tempMax)}°<span className="text-neutral-400 font-normal">/{Math.round(d.tempMin)}°</span>
                              </div>
                              <div className="font-mono-num text-[10px] text-[#597CD4]">
                                {d.precipProbMax}%
                              </div>
                            </div>
                          ))}
                        </div>
                      </>
                    ) : (
                      <div className="text-xs text-neutral-500 py-4">Wetterdaten werden geladen…</div>
                    )}
                  </div>
                </section>
              );
            }

            if (card.id === 'assistant') {
              return (
                <section
                  key="assistant"
                  className={`${mobileHideClass} lg:col-span-5 bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden flex flex-col`}
                >
                  <div className="h-1 w-full bg-gradient-to-r from-[#3B6912] via-[#BBE774] to-[#597CD4]" />
                  <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="font-display text-sm sm:text-base font-semibold flex items-center gap-1.5">
                        <Sparkles className="w-4 h-4 text-[#3B6912] dark:text-[#BBE774]" />
                        Hof-Assistent
                      </h2>
                      <span className="text-[11px] text-neutral-500">Garten, Tiere & Vorrat</span>
                    </div>
                    <HomesteadAssistantPanel
                      compact
                      onOpenFull={() => setActiveModule('knowledge')}
                    />
                  </div>
                </section>
              );
            }

            if (card.id === 'tasks') {
              return (
                <section
                  key="tasks"
                  className={`${mobileHideClass} lg:col-span-4 bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden flex flex-col`}
                >
                  <div className="h-1 w-full bg-[#233A29]" />
                  <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-sm sm:text-base font-semibold">Aufgaben & Termine</h2>
                      <button
                        type="button"
                        onClick={() => setActiveModule('calendar')}
                        className="text-[11px] font-semibold text-[#233A29] dark:text-[#BBE774] hover:underline"
                      >
                        Kalender →
                      </button>
                    </div>

                    <div className="grid grid-cols-4 gap-1.5 text-center">
                      <div className="py-1.5 px-1 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412]">
                        <div className="text-base font-bold font-mono-num leading-tight">{todayTasks.length}</div>
                        <div className="text-[10px] text-neutral-500">Heute</div>
                      </div>
                      <div className="py-1.5 px-1 rounded-xl bg-[#BBE774]/20">
                        <div className="text-base font-bold font-mono-num leading-tight">{nicoTasks.length}</div>
                        <div className="text-[10px] text-neutral-700 dark:text-neutral-300">Nico</div>
                      </div>
                      <div className="py-1.5 px-1 rounded-xl bg-[#F28090]/20">
                        <div className="text-base font-bold font-mono-num leading-tight">{chrisTasks.length}</div>
                        <div className="text-[10px] text-neutral-700 dark:text-neutral-300">Chris</div>
                      </div>
                      <div className="py-1.5 px-1 rounded-xl bg-[#CF6432]/15">
                        <div className="text-base font-bold font-mono-num text-[#CF6432] leading-tight">
                          {overdueTasks.length}
                        </div>
                        <div className="text-[10px] text-neutral-700 dark:text-neutral-300">Überfällig</div>
                      </div>
                    </div>

                    <div className="space-y-1 max-h-[78px] overflow-y-auto pr-0.5">
                      {tasks.length === 0 ? (
                        <p className="text-xs text-neutral-500 py-1.5">Keine offenen Aufgaben.</p>
                      ) : (
                        tasks.slice(0, 5).map((t) => (
                          <div
                            key={t.id}
                            className="flex items-center justify-between gap-2 px-2 py-1 rounded-lg border border-neutral-200 dark:border-neutral-800"
                          >
                            <div className="min-w-0 flex items-center gap-1.5 text-xs">
                              <span className="font-medium truncate">{t.title}</span>
                              <span className="text-[10px] text-neutral-500 font-mono-num shrink-0">
                                {t.payload.date.slice(5)}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => toggleTaskDone(t)}
                              aria-label="Aufgabe erledigen"
                              className="h-6 w-6 flex items-center justify-center rounded-md border border-neutral-300 dark:border-neutral-700 hover:bg-[#BBE774]/30 transition shrink-0"
                            >
                              <Check className="w-3 h-3" />
                            </button>
                          </div>
                        ))
                      )}
                    </div>

                    {upcomingEvents.length > 0 && (
                      <div className="pt-1.5 border-t border-neutral-200 dark:border-neutral-800 text-[11px] text-neutral-600 dark:text-neutral-400 truncate">
                        <strong>Nächste ({sharedTasks.length} gem.):</strong>{' '}
                        {upcomingEvents.map((e) => `${e.title} (${e.payload.date.slice(5)})`).join(' · ')}
                      </div>
                    )}
                  </div>
                </section>
              );
            }

            if (card.id === 'garden') {
              const gardenBeds = activeAreas.filter((a) =>
                ['Gemüsebeete', 'Hochbeete', 'Gewächshaus', 'Kräuterbeete', 'Obstgarten', 'Beerenflächen'].includes(
                  a.payload.areaType
                )
              );
              return (
                <section
                  key="garden"
                  className={`${mobileHideClass} lg:col-span-4 bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden flex flex-col`}
                >
                  <div className="h-1 w-full bg-[#3B6912]" />
                  <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-sm sm:text-base font-semibold flex items-center gap-1.5">
                        <Sprout className="w-4 h-4 text-[#3B6912] dark:text-[#BBE774]" />
                        Garten & Anbau
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveModule('cultivation')}
                        className="text-[11px] font-semibold text-[#3B6912] dark:text-[#BBE774] hover:underline"
                      >
                        Anbau →
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="py-1.5 px-1 rounded-xl bg-[#BBE774]/20">
                        <div className="text-base font-bold font-mono-num leading-tight">{gardenBeds.length}</div>
                        <div className="text-[10px] text-neutral-600 dark:text-neutral-300">Beete/Flächen</div>
                      </div>
                      <div className="py-1.5 px-1 rounded-xl bg-[#65A30D]/15">
                        <div className="text-base font-bold font-mono-num leading-tight">{activePlants.length}</div>
                        <div className="text-[10px] text-neutral-600 dark:text-neutral-300">Sorten</div>
                      </div>
                      <div className="py-1.5 px-1 rounded-xl bg-[#0D9488]/15">
                        <div className="text-base font-bold font-mono-num leading-tight">{activePlantings.length}</div>
                        <div className="text-[10px] text-neutral-600 dark:text-neutral-300">Auf Beeten</div>
                      </div>
                    </div>
                    <div className="text-[11px] text-neutral-600 dark:text-neutral-400 space-y-0.5">
                      <div className="font-semibold text-neutral-900 dark:text-neutral-200 truncate">
                        Im {currentMonthGuide.monthName}:
                      </div>
                      <p className="line-clamp-2">
                        Anbau: {currentMonthGuide.sowingAndPlanting.slice(0, 2).join(', ')} · Ernte: {currentMonthGuide.harvest.slice(0, 2).join(', ')}
                      </p>
                    </div>
                  </div>
                </section>
              );
            }

            if (card.id === 'animals') {
              return (
                <section
                  key="animals"
                  className={`${mobileHideClass} lg:col-span-4 bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden flex flex-col`}
                >
                  <div className="h-1 w-full bg-[#D97706]" />
                  <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-sm sm:text-base font-semibold flex items-center gap-1.5">
                        <Bird className="w-4 h-4 text-[#D97706]" />
                        Tiere & Futter
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveModule('animals')}
                        className="text-[11px] font-semibold text-[#D97706] hover:underline"
                      >
                        Tierbereich →
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="py-1.5 px-1 rounded-xl bg-[#FFC814]/20">
                        <div className="text-base font-bold font-mono-num leading-tight">{totalAnimalsCount}</div>
                        <div className="text-[10px] text-neutral-600 dark:text-neutral-300">Tiere gesamt</div>
                      </div>
                      <div className="py-1.5 px-1 rounded-xl bg-[#D97706]/15">
                        <div className="text-base font-bold font-mono-num leading-tight">{recentEggs}</div>
                        <div className="text-[10px] text-neutral-600 dark:text-neutral-300">Eier (7 T.)</div>
                      </div>
                      <div className="py-1.5 px-1 rounded-xl bg-[#CF6432]/15">
                        <div className={`text-base font-bold font-mono-num leading-tight ${lowFeed.length > 0 ? 'text-[#CF6432]' : ''}`}>
                          {lowFeed.length}
                        </div>
                        <div className="text-[10px] text-neutral-600 dark:text-neutral-300">Futter knapp</div>
                      </div>
                    </div>
                    <div className="text-[11px] text-neutral-600 dark:text-neutral-400 line-clamp-2">
                      {activeAnimals.length === 0
                        ? 'Noch keine Tiergruppen angelegt.'
                        : activeAnimals.map((g) => `${g.title} (${g.payload.count})`).join(' · ')}
                    </div>
                  </div>
                </section>
              );
            }

            if (card.id === 'pantry') {
              return (
                <section
                  key="pantry"
                  className={`${mobileHideClass} lg:col-span-4 bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden flex flex-col`}
                >
                  <div className="h-1 w-full bg-[#EA580C]" />
                  <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-sm sm:text-base font-semibold flex items-center gap-1.5">
                        <Warehouse className="w-4 h-4 text-[#EA580C]" />
                        Vorräte & Ernten
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveModule('pantry')}
                        className="text-[11px] font-semibold text-[#CF6432] hover:underline"
                      >
                        Vorräte →
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="py-1.5 px-1 rounded-xl bg-[#EA580C]/12">
                        <div className="text-base font-bold font-mono-num leading-tight">{activeInventory.length}</div>
                        <div className="text-[10px] text-neutral-600 dark:text-neutral-300">Vorräte</div>
                      </div>
                      <div className="py-1.5 px-1 rounded-xl bg-[#F28090]/20">
                        <div className="text-base font-bold font-mono-num leading-tight">{activeBatches.length}</div>
                        <div className="text-[10px] text-neutral-600 dark:text-neutral-300">Chargen</div>
                      </div>
                      <div className="py-1.5 px-1 rounded-xl bg-[#BBE774]/25">
                        <div className="text-base font-bold font-mono-num leading-tight">{activeHarvests.length}</div>
                        <div className="text-[10px] text-neutral-600 dark:text-neutral-300">Ernten</div>
                      </div>
                    </div>
                    <div className="text-[11px] text-neutral-600 dark:text-neutral-400 truncate">
                      {lowInventory.length > 0
                        ? `Niedrig: ${lowInventory.map((i) => i.title).slice(0, 3).join(', ')}`
                        : activeBatches[0]
                        ? `Letzte Charge: ${activeBatches[0].payload.batchNumber} (${activeBatches[0].title})`
                        : 'Noch keine Vorräte oder Ernten eingetragen.'}
                    </div>
                  </div>
                </section>
              );
            }

            if (card.id === 'projects') {
              return (
                <section
                  key="projects"
                  className={`${mobileHideClass} lg:col-span-4 bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden flex flex-col`}
                >
                  <div className="h-1 w-full bg-[#9333EA]" />
                  <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="font-display text-sm sm:text-base font-semibold flex items-center gap-1.5">
                        <Hammer className="w-4 h-4 text-[#9333EA]" />
                        Projekte & Einkauf
                      </h2>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setActiveModule('projects')}
                          className="text-[11px] font-semibold text-[#9333EA] hover:underline"
                        >
                          Projekte →
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveModule('management')}
                          className="text-[11px] font-semibold text-[#597CD4] hover:underline"
                        >
                          Einkauf ({activeShopping.length}) →
                        </button>
                      </div>
                    </div>
                    {activeProjects.length === 0 ? (
                      <p className="text-xs text-neutral-500">Keine laufenden Bau- oder Hofprojekte.</p>
                    ) : (
                      <div className="space-y-1.5">
                        {activeProjects.slice(0, 2).map((proj) => {
                          const steps = proj.payload.steps || [];
                          const done = steps.filter((s) => s.done).length;
                          const pct = steps.length > 0 ? Math.round((done / steps.length) * 100) : 0;
                          return (
                            <div key={proj.id} className="space-y-0.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className="font-medium truncate">{proj.title}</span>
                                <span className="text-neutral-500 font-mono-num shrink-0">
                                  {proj.payload.status} · {pct}%
                                </span>
                              </div>
                              <div className="h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                                <div className="h-full bg-[#9333EA]" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </section>
              );
            }

            if (card.id === 'notes') {
              return (
                <section
                  key="notes"
                  className={`${mobileHideClass} lg:col-span-4 bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden flex flex-col`}
                >
                  <div className="h-1 w-full bg-neutral-400 dark:bg-neutral-600" />
                  <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                    <div className="flex items-center justify-between gap-2">
                      <h2 className="font-display text-sm sm:text-base font-semibold truncate">
                        Notizen ({activeIdentity})
                      </h2>
                      <button
                        type="button"
                        onClick={() => updatePersonalNotes(notesDraft)}
                        className="px-2.5 py-1 rounded-lg bg-[#233A29] text-white text-[11px] font-medium hover:opacity-90 transition shrink-0"
                      >
                        Speichern
                      </button>
                    </div>
                    <textarea
                      rows={2}
                      value={notesDraft}
                      onChange={(e) => setNotesDraft(e.target.value)}
                      placeholder="Private Notizen oder Merkzettel…"
                      className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[#F7F7F5] dark:bg-[#0F1412] p-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#233A29]"
                    />
                  </div>
                </section>
              );
            }

            return null;
          })}
      </div>

      {/* Shared Dashboard Customization Modal */}
      <Modal
        open={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        title="Anzeigereihenfolge für alle festlegen"
      >
        <div className="space-y-3">
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            Diese Reihenfolge und Sichtbarkeit der Dashboard-Karten gilt gemeinsam für alle Konten (Nico & Chris).
          </p>
          <div className="space-y-2">
            {layout.map((card, idx) => (
              <div
                key={card.id}
                className="flex items-center justify-between p-3 rounded-xl border border-neutral-200 dark:border-neutral-800"
              >
                <span className="text-sm font-medium">{card.label}</span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveCard(card.id, -1)}
                    className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 disabled:opacity-40"
                    aria-label="Nach oben"
                  >
                    <ArrowUp className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === layout.length - 1}
                    onClick={() => moveCard(card.id, 1)}
                    className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 disabled:opacity-40"
                    aria-label="Nach unten"
                  >
                    <ArrowDown className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => toggleCardVisible(card.id)}
                    className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700"
                    aria-label="Sichtbarkeit umschalten"
                  >
                    {card.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-neutral-400" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="pt-2 flex justify-between">
            <button
              type="button"
              onClick={() => updateDashboardLayout(DEFAULT_DASHBOARD_LAYOUT)}
              className="text-xs text-neutral-600 hover:underline"
            >
              Standard wiederherstellen
            </button>
            <button
              type="button"
              onClick={() => setShowConfigModal(false)}
              className="px-4 py-2 rounded-lg bg-[#233A29] text-white text-xs font-semibold"
            >
              Fertig
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
