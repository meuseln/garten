import React, { useMemo, useState } from 'react';
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
import { Modal, ModuleHeader, SegmentedTabs } from '../components/ui/SharedUI';
import { HomesteadAssistantPanel } from '../components/assistant/HomesteadAssistantPanel';
import type { DashboardCardConfig } from '../types/homestead';

export const DashboardView: React.FC = () => {
  const {
    activeIdentity,
    userProfile,
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

  const layout: DashboardCardConfig[] = useMemo(() => {
    const saved =
      userProfile?.dashboardLayout && userProfile.dashboardLayout.length > 0
        ? userProfile.dashboardLayout
        : DEFAULT_DASHBOARD_LAYOUT;
    const savedIds = new Set(saved.map((c) => c.id));
    const missing = DEFAULT_DASHBOARD_LAYOUT.filter((d) => !savedIds.has(d.id));
    return [...saved, ...missing].sort((a, b) => a.priority - b.priority);
  }, [userProfile?.dashboardLayout]);

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
    .slice(0, 4);

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
    <div className="space-y-6">
      <ModuleHeader
        title={`Guten Tag, ${activeIdentity || 'Hof-Team'}`}
        subtitle={`Mellenbach-Glasbach, Thüringen · Phänologische Phase: ${currentPheno.phase} (${currentPheno.indicatorPlant})`}
        actions={
          <>
            <button
              type="button"
              onClick={() => setActiveModule('calendar')}
              className="px-3.5 py-2 rounded-xl bg-[#233A29] text-white text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 hover:opacity-90 transition whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              Aufgabe / Termin
            </button>
            <button
              type="button"
              onClick={() => setShowConfigModal(true)}
              className="px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition whitespace-nowrap"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Dashboard anpassen
            </button>
          </>
        }
      />

      {isEmptyHomestead && (
        <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <h2 className="font-display text-lg font-bold flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#233A29] dark:text-[#BBE774]" />
              Erste Einrichtung für euren Selbstversorgerhof
            </h2>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 max-w-2xl">
              Eure Datenbank ist noch leer. Ihr könnt mit einem Klick erprobte Grundbereiche (Hochbeet, Gewächshaus, Streuobstwiese, Hühnerstall, Kaninchen, Kompost), Sorten, Rezepte und Notfallvorlagen für Mellenbach-Glasbach anlegen und anschließend frei anpassen.
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
            className="px-4 py-2.5 rounded-xl bg-[#233A29] text-white text-sm font-semibold hover:opacity-90 transition whitespace-nowrap shrink-0"
          >
            {seeding ? 'Wird eingerichtet…' : 'Hof-Grundstruktur anlegen'}
          </button>
        </div>
      )}

      {/* Mobile Paged Section Selector (prevents vertical scrolling on phones) */}
      <div className="lg:hidden space-y-2">
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

      {/* Configurable Cards Grid (Desktop: full grid, Mobile: paged by section) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
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

            if (card.id === 'assistant') {
              return (
                <section
                  key="assistant"
                  className={`${mobileHideClass} lg:col-span-5 bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden flex flex-col`}
                >
                  <div className="h-1.5 w-full bg-gradient-to-r from-[#3B6912] via-[#BBE774] to-[#597CD4]" />
                  <div className="p-5 space-y-3 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                          <Sparkles className="w-5 h-5 text-[#3B6912] dark:text-[#BBE774]" />
                          Hof-Assistent
                        </h2>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          Tipps für Garten, Beete, Rezepte & Wetter — direkt gefragt
                        </p>
                      </div>
                    </div>
                    <HomesteadAssistantPanel
                      compact
                      onOpenFull={() => setActiveModule('knowledge')}
                    />
                  </div>
                </section>
              );
            }

            if (card.id === 'weather') {
              const cond = weather ? describeWeatherCode(weather.current.weatherCode) : null;
              return (
                <section
                  key="weather"
                  className={`${mobileHideClass} lg:col-span-7 bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden space-y-4`}
                >
                  <div className="h-1.5 w-full bg-gradient-to-r from-[#597CD4] to-[#38BDF8]" />
                  <div className="px-5 pb-5 space-y-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                        <CloudSun className="w-5 h-5 text-[#597CD4]" />
                        Wetter & Gartenwetter
                      </h2>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        Mellenbach-Glasbach · {weather?.isStale ? 'Zwischengespeicherte Daten' : 'Aktuelle Open-Meteo Daten'}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveModule('weather')}
                      className="text-xs font-semibold text-[#597CD4] hover:underline whitespace-nowrap"
                    >
                      Vollansicht →
                    </button>
                  </div>

                  {weather ? (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="p-3 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412]">
                          <div className="text-xs text-neutral-500">Aktuell</div>
                          <div className="text-2xl font-bold font-mono-num mt-0.5">
                            {weather.current.temp.toFixed(1)} °C
                          </div>
                          <div className="text-xs text-neutral-600 dark:text-neutral-400 truncate">
                            {cond?.label}
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412]">
                          <div className="text-xs text-neutral-500">Regenrisiko</div>
                          <div className="text-2xl font-bold font-mono-num mt-0.5">
                            {weather.today.precipProbMax} %
                          </div>
                          <div className="text-xs text-neutral-600 dark:text-neutral-400 font-mono-num">
                            {weather.daily[0]?.precipSum.toFixed(1)} mm heute
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412]">
                          <div className="text-xs text-neutral-500">Min / Max</div>
                          <div className="text-xl font-bold font-mono-num mt-0.5">
                            {weather.today.tempMin.toFixed(0)}° / {weather.today.tempMax.toFixed(0)}°
                          </div>
                          <div className="text-xs text-neutral-600 dark:text-neutral-400">
                            Gefühlt {weather.current.apparentTemp.toFixed(1)} °C
                          </div>
                        </div>
                        <div className="p-3 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412]">
                          <div className="text-xs text-neutral-500">Wind</div>
                          <div className="text-2xl font-bold font-mono-num mt-0.5">
                            {Math.round(weather.current.windSpeed)} <span className="text-xs font-normal">km/h</span>
                          </div>
                          <div className="text-xs text-neutral-600 dark:text-neutral-400 font-mono-num">
                            Böen {Math.round(weather.current.windGusts)} km/h
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        {weather.gardenAlerts.slice(0, 2).map((al) => (
                          <div
                            key={al.id}
                            className={`p-3 rounded-xl border text-xs ${
                              al.level === 'warning'
                                ? 'bg-[#CF6432]/10 border-[#CF6432]/35 text-neutral-900 dark:text-neutral-100'
                                : al.level === 'caution'
                                ? 'bg-[#FFC814]/15 border-[#FFC814]/45 text-neutral-900 dark:text-neutral-100'
                                : 'bg-[#A8F0D7]/20 border-[#A8F0D7]/50 text-neutral-900 dark:text-neutral-100'
                            }`}
                          >
                            <div className="font-semibold">{al.title}</div>
                            <div className="text-neutral-600 dark:text-neutral-300 mt-0.5">{al.recommendation}</div>
                          </div>
                        ))}
                      </div>

                      <div className="grid grid-cols-7 gap-1.5 pt-1 text-center">
                        {weather.daily.slice(0, 7).map((d) => (
                          <div key={d.date} className="p-2 rounded-lg bg-[#F7F7F5] dark:bg-[#0F1412] text-xs">
                            <div className="text-neutral-500 font-medium">
                              {new Date(d.date + 'T12:00:00').toLocaleDateString('de-DE', { weekday: 'short' })}
                            </div>
                            <div className="font-mono-num font-semibold mt-1">
                              {Math.round(d.tempMax)}°
                            </div>
                            <div className="font-mono-num text-neutral-500">
                              {Math.round(d.tempMin)}°
                            </div>
                            <div className="font-mono-num text-[10px] text-[#597CD4] mt-0.5">
                              {d.precipProbMax}%
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                  <div className="text-sm text-neutral-500 py-4">Wetterdaten werden geladen…</div>
                  )}
                  </div>
                </section>
              );
            }

            if (card.id === 'tasks') {
              return (
                <section
                  key="tasks"
                  className={`${mobileHideClass} lg:col-span-4 bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4`}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-lg font-semibold">Aufgaben & Termine</h2>
                    <button
                      type="button"
                      onClick={() => setActiveModule('calendar')}
                      className="text-xs font-semibold text-[#233A29] dark:text-[#BBE774] hover:underline"
                    >
                      Kalender →
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div className="p-2.5 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412]">
                      <div className="text-lg font-bold font-mono-num">{todayTasks.length}</div>
                      <div className="text-[11px] text-neutral-500">Heute</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#BBE774]/20">
                      <div className="text-lg font-bold font-mono-num">{nicoTasks.length}</div>
                      <div className="text-[11px] text-neutral-700 dark:text-neutral-300">Nico</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#F28090]/20">
                      <div className="text-lg font-bold font-mono-num">{chrisTasks.length}</div>
                      <div className="text-[11px] text-neutral-700 dark:text-neutral-300">Chris</div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-[#CF6432]/15">
                      <div className="text-lg font-bold font-mono-num text-[#CF6432]">{overdueTasks.length}</div>
                      <div className="text-[11px] text-neutral-700 dark:text-neutral-300">Überfällig</div>
                    </div>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {tasks.length === 0 ? (
                      <p className="text-xs text-neutral-500 py-3">Keine offenen Aufgaben.</p>
                    ) : (
                      tasks.slice(0, 6).map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between gap-3 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800"
                        >
                          <div className="min-w-0">
                            <div className="text-sm font-medium truncate">{t.title}</div>
                            <div className="text-xs text-neutral-500 flex items-center gap-1.5">
                              <span>{t.payload.assignee}</span>
                              <span>·</span>
                              <span className="font-mono-num">{t.payload.date}</span>
                              {t.payload.date < todayStr && (
                                <>
                                  <span>·</span>
                                  <span className="text-[#CF6432] font-medium">Überfällig</span>
                                </>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => toggleTaskDone(t)}
                            aria-label="Aufgabe erledigen"
                            className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-[#BBE774]/30 transition shrink-0"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {upcomingEvents.length > 0 && (
                    <div className="pt-2 border-t border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-400">
                      <span className="font-semibold text-neutral-900 dark:text-neutral-200">
                        Nächste Termine ({sharedTasks.length} gemeinsam):{' '}
                      </span>
                      {upcomingEvents.map((e) => `${e.title} (${e.payload.date})`).join(' · ')}
                    </div>
                  )}
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
                  className={`${mobileHideClass} lg:col-span-4 bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden`}
                >
                  <div className="h-1.5 w-full bg-[#3B6912]" />
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                        <Sprout className="w-4 h-4 text-[#3B6912] dark:text-[#BBE774]" />
                        Garten & Anbau
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveModule('cultivation')}
                        className="text-xs font-semibold text-[#3B6912] dark:text-[#BBE774] hover:underline"
                      >
                        Anbau →
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 rounded-xl bg-[#BBE774]/20">
                        <div className="text-lg font-bold font-mono-num">{gardenBeds.length}</div>
                        <div className="text-[11px] text-neutral-600 dark:text-neutral-300">Beete/Flächen</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#65A30D]/15">
                        <div className="text-lg font-bold font-mono-num">{activePlants.length}</div>
                        <div className="text-[11px] text-neutral-600 dark:text-neutral-300">Sorten</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#0D9488]/15">
                        <div className="text-lg font-bold font-mono-num">{activePlantings.length}</div>
                        <div className="text-[11px] text-neutral-600 dark:text-neutral-300">Auf Beeten</div>
                      </div>
                    </div>
                    <div className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1">
                      <div className="font-semibold text-neutral-900 dark:text-neutral-200">
                        Im {currentMonthGuide.monthName} machbar:
                      </div>
                      <p>
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
                  className={`${mobileHideClass} lg:col-span-4 bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden`}
                >
                  <div className="h-1.5 w-full bg-[#D97706]" />
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                        <Bird className="w-4 h-4 text-[#D97706]" />
                        Tiere & Futter
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveModule('animals')}
                        className="text-xs font-semibold text-[#D97706] hover:underline"
                      >
                        Tierbereich →
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 rounded-xl bg-[#FFC814]/20">
                        <div className="text-lg font-bold font-mono-num">{totalAnimalsCount}</div>
                        <div className="text-[11px] text-neutral-600 dark:text-neutral-300">Tiere gesamt</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#D97706]/15">
                        <div className="text-lg font-bold font-mono-num">{recentEggs}</div>
                        <div className="text-[11px] text-neutral-600 dark:text-neutral-300">Eier (7 Tage)</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#CF6432]/15">
                        <div className={`text-lg font-bold font-mono-num ${lowFeed.length > 0 ? 'text-[#CF6432]' : ''}`}>
                          {lowFeed.length}
                        </div>
                        <div className="text-[11px] text-neutral-600 dark:text-neutral-300">Futter knapp</div>
                      </div>
                    </div>
                    <div className="text-xs text-neutral-600 dark:text-neutral-400">
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
                  className={`${mobileHideClass} lg:col-span-4 bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden`}
                >
                  <div className="h-1.5 w-full bg-[#EA580C]" />
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                        <Warehouse className="w-4 h-4 text-[#EA580C]" />
                        Vorräte & Ernten
                      </h2>
                      <button
                        type="button"
                        onClick={() => setActiveModule('pantry')}
                        className="text-xs font-semibold text-[#CF6432] hover:underline"
                      >
                        Vorräte →
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="p-2.5 rounded-xl bg-[#EA580C]/12">
                        <div className="text-lg font-bold font-mono-num">{activeInventory.length}</div>
                        <div className="text-[11px] text-neutral-600 dark:text-neutral-300">Vorräte</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#F28090]/20">
                        <div className="text-lg font-bold font-mono-num">{activeBatches.length}</div>
                        <div className="text-[11px] text-neutral-600 dark:text-neutral-300">Chargen</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#BBE774]/25">
                        <div className="text-lg font-bold font-mono-num">{activeHarvests.length}</div>
                        <div className="text-[11px] text-neutral-600 dark:text-neutral-300">Ernten</div>
                      </div>
                    </div>
                    <div className="text-xs text-neutral-600 dark:text-neutral-400">
                      {lowInventory.length > 0
                        ? `Niedrige Bestände: ${lowInventory.map((i) => i.title).slice(0, 3).join(', ')}`
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
                  className={`${mobileHideClass} lg:col-span-4 bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden`}
                >
                  <div className="h-1.5 w-full bg-[#9333EA]" />
                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h2 className="font-display text-lg font-semibold flex items-center gap-2">
                        <Hammer className="w-4 h-4 text-[#9333EA]" />
                        Projekte & Einkauf
                      </h2>
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => setActiveModule('projects')}
                          className="text-xs font-semibold text-[#9333EA] hover:underline"
                        >
                          Projekte →
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveModule('management')}
                          className="text-xs font-semibold text-[#597CD4] hover:underline"
                        >
                          Einkauf ({activeShopping.length}) →
                        </button>
                      </div>
                    </div>
                    {activeProjects.length === 0 ? (
                      <p className="text-xs text-neutral-500">Keine laufenden Bau- oder Hofprojekte.</p>
                    ) : (
                      <div className="space-y-2.5">
                        {activeProjects.slice(0, 3).map((proj) => {
                          const steps = proj.payload.steps || [];
                          const done = steps.filter((s) => s.done).length;
                          const pct = steps.length > 0 ? Math.round((done / steps.length) * 100) : 0;
                          return (
                            <div key={proj.id} className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="font-medium">{proj.title}</span>
                                <span className="text-neutral-500 font-mono-num">
                                  {proj.payload.status} · {pct}%
                                </span>
                              </div>
                              <div className="h-1.5 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                                <div
                                  className="h-full bg-[#9333EA]"
                                  style={{ width: `${pct}%` }}
                                />
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
                  className={`${mobileHideClass} lg:col-span-4 bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-3`}
                >
                  <div className="flex items-center justify-between">
                    <h2 className="font-display text-lg font-semibold">
                      Persönliche Notizen ({activeIdentity})
                    </h2>
                    <button
                      type="button"
                      onClick={() => updatePersonalNotes(notesDraft)}
                      className="px-3 py-1.5 rounded-lg bg-[#233A29] text-white text-xs font-medium hover:opacity-90 transition"
                    >
                      Speichern
                    </button>
                  </div>
                  <textarea
                    rows={4}
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                    placeholder="Private Notizen, Ideen oder Merkzettel — nur für dein Konto sichtbar…"
                    className="w-full rounded-xl border border-neutral-200 dark:border-neutral-800 bg-[#F7F7F5] dark:bg-[#0F1412] p-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#233A29]"
                  />
                </section>
              );
            }

            return null;
          })}
      </div>

      {/* Dashboard Customization Modal */}
      <Modal
        open={showConfigModal}
        onClose={() => setShowConfigModal(false)}
        title="Dashboard individuell konfigurieren"
      >
        <div className="space-y-3">
          <p className="text-xs text-neutral-600 dark:text-neutral-400">
            Reihenfolge, Priorität und Sichtbarkeit der Karten werden persönlich für {activeIdentity} gespeichert.
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
