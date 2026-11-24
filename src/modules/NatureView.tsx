import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Binoculars,
  Camera,
  CheckCircle2,
  Edit3,
  Eye,
  Plus,
  ShieldAlert,
  Square,
  Volume2,
} from 'lucide-react';
import { useHomestead } from '../context/HomesteadContext';
import {
  BIRD_SPECIES,
  MONTH_SHORT_DE,
  MUSHROOM_SPECIES,
  WILDCAM_MAMMALS,
  type BirdSpecies,
  type MushroomSpecies,
} from '../data/natureCatalog';
import { playBirdCall, stopBirdCall } from '../lib/birdCalls';
import { BirdPlateSvg, MushroomPlateSvg } from '../components/nature/NatureIllustrations';
import {
  EmptyState,
  Modal,
  ModuleHeader,
  PaginationControls,
  SegmentedTabs,
  usePagination,
} from '../components/ui/SharedUI';
import type { AssigneeScope, HomesteadRecord, KnowledgePayload } from '../types/homestead';

const BIRDWATCHING_BANNER_IMG = '/src/assets/images/birdwatching_schwarzatal_plate_1795520895531.jpg';
const MUSHROOM_BANNER_IMG = '/src/assets/images/mushroom_foraging_slateforest_1795520896228.jpg';

const HABITAT_PRESETS = [
  'Futterhaus / Terrasse',
  'Streuobstwiese',
  'Waldrand / Schieferhang',
  'Wildkamera Bachlauf',
  'Wildkamera Kompost / Garten',
  'Hühnerauslauf / Stall',
];

const MUSHROOM_SPOT_PRESETS = [
  'Schwarzatal Fichtenhang',
  'Mellenbach Mischwald',
  'Streuobstwiese (Gras)',
  'Waldrand unter Buchen',
  'Moosige Wegböschung',
];

export const NatureView: React.FC = () => {
  const {
    knowledgeEntries,
    activeIdentity,
    createRecord,
    updateRecord,
    archiveRecord,
    pushToast,
  } = useHomestead();

  const currentMonth = new Date().getMonth() + 1; // 1..12
  const currentMonthLabel = MONTH_SHORT_DE[currentMonth - 1];

  const [tab, setTab] = useState<'birds' | 'sightings' | 'mushrooms'>('birds');
  const [birdFilter, setBirdFilter] = useState<'all' | 'season' | 'wildcam' | 'mammals'>('all');
  const [birdSearch, setBirdSearch] = useState('');
  const [playingBirdId, setPlayingBirdId] = useState<string | null>(null);

  const [mushroomFilter, setMushroomFilter] = useState<'all' | 'edible' | 'toxic' | 'season' | 'finds'>('all');
  const [mushroomSearch, setMushroomSearch] = useState('');

  const [sightingFilter, setSightingFilter] = useState<'all' | 'wildcam' | 'Nico' | 'Chris'>('all');

  // Detail Modals
  const [selectedBird, setSelectedBird] = useState<BirdSpecies | null>(null);
  const [selectedMushroom, setSelectedMushroom] = useState<MushroomSpecies | null>(null);

  // Sighting Form Modal
  const [showSightingModal, setShowSightingModal] = useState(false);
  const [editingSighting, setEditingSighting] = useState<HomesteadRecord<KnowledgePayload> | null>(null);
  const [sightingSpeciesId, setSightingSpeciesId] = useState('rotkehlchen');
  const [sightingCustomName, setSightingCustomName] = useState('');
  const [sightingDate, setSightingDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sightingTime, setSightingTime] = useState(() => new Date().toTimeString().slice(0, 5));
  const [sightingSource, setSightingSource] = useState<'Direktsichtung' | 'Futterhaus' | 'Wildkamera' | 'Ruf gehört'>('Direktsichtung');
  const [sightingCount, setSightingCount] = useState(1);
  const [sightingZone, setSightingZone] = useState('Futterhaus / Terrasse');
  const [sightingObserver, setSightingObserver] = useState<AssigneeScope>(activeIdentity || 'Nico');
  const [sightingNotes, setSightingNotes] = useState('');

  // Mushroom Find Modal
  const [showFindModal, setShowFindModal] = useState(false);
  const [editingFind, setEditingFind] = useState<HomesteadRecord<KnowledgePayload> | null>(null);
  const [findSpeciesId, setFindSpeciesId] = useState('steinpilz');
  const [findCustomName, setFindCustomName] = useState('');
  const [findDate, setFindDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [findSpot, setFindSpot] = useState('Mellenbach Mischwald');
  const [findObserver, setFindObserver] = useState<AssigneeScope>(activeIdentity || 'Nico');
  const [findVerified, setFindVerified] = useState(false);
  const [findNotes, setFindNotes] = useState('');

  useEffect(() => {
    return () => {
      stopBirdCall();
    };
  }, []);

  const toggleCall = (bird: BirdSpecies) => {
    if (playingBirdId === bird.id) {
      stopBirdCall();
      setPlayingBirdId(null);
      return;
    }
    setPlayingBirdId(bird.id);
    playBirdCall(bird.callPattern, () => {
      setPlayingBirdId((curr) => (curr === bird.id ? null : curr));
    });
  };

  // Filtered birds
  const filteredBirds = useMemo(() => {
    const q = birdSearch.trim().toLowerCase();
    return BIRD_SPECIES.filter((b) => {
      if (birdFilter === 'season' && !b.activeMonths.includes(currentMonth)) return false;
      if (
        birdFilter === 'wildcam' &&
        b.wildcamLikelihood !== 'Sehr häufig' &&
        b.wildcamLikelihood !== 'Nachts / Dämmerung'
      ) {
        return false;
      }
      if (!q) return true;
      return (
        b.name.toLowerCase().includes(q) ||
        b.latinName.toLowerCase().includes(q) ||
        b.diet.some((d) => d.toLowerCase().includes(q)) ||
        b.habitat.toLowerCase().includes(q)
      );
    });
  }, [birdFilter, birdSearch, currentMonth]);

  const birdPagination = usePagination(filteredBirds, 4);

  // Persisted Bird Sightings from Firestore
  const allSightings = useMemo(
    () =>
      knowledgeEntries
        .filter((k) => !k.archived && k.payload.domainType === 'Vogelsichtung')
        .sort((a, b) => {
          const da = `${a.payload.date || ''} ${a.payload.sightingTime || '00:00'}`;
          const db = `${b.payload.date || ''} ${b.payload.sightingTime || '00:00'}`;
          return db.localeCompare(da);
        }),
    [knowledgeEntries]
  );

  const filteredSightings = useMemo(() => {
    return allSightings.filter((s) => {
      if (sightingFilter === 'wildcam') return s.payload.observationSource === 'Wildkamera';
      if (sightingFilter === 'Nico') return s.payload.observer === 'Nico';
      if (sightingFilter === 'Chris') return s.payload.observer === 'Chris';
      return true;
    });
  }, [allSightings, sightingFilter]);

  const sightingPagination = usePagination(filteredSightings, 5);

  const uniqueBirdSpeciesSeen = useMemo(() => {
    const set = new Set<string>();
    allSightings.forEach((s) => {
      set.add((s.payload.speciesName || s.title).toLowerCase());
    });
    return set.size;
  }, [allSightings]);

  const wildcamCount = useMemo(
    () => allSightings.filter((s) => s.payload.observationSource === 'Wildkamera').length,
    [allSightings]
  );

  // Filtered mushrooms
  const filteredMushrooms = useMemo(() => {
    const q = mushroomSearch.trim().toLowerCase();
    return MUSHROOM_SPECIES.filter((m) => {
      if (mushroomFilter === 'edible' && m.isToxic) return false;
      if (mushroomFilter === 'toxic' && !m.isToxic) return false;
      if (mushroomFilter === 'season' && !m.seasonMonths.includes(currentMonth)) return false;
      if (!q) return true;
      return (
        m.name.toLowerCase().includes(q) ||
        m.latinName.toLowerCase().includes(q) ||
        m.whereToFind.toLowerCase().includes(q) ||
        m.falseFriends.some((f) => f.name.toLowerCase().includes(q))
      );
    });
  }, [mushroomFilter, mushroomSearch, currentMonth]);

  const mushroomPagination = usePagination(filteredMushrooms, 4);

  // Persisted Mushroom Finds from Firestore
  const allMushroomFinds = useMemo(
    () =>
      knowledgeEntries
        .filter((k) => !k.archived && k.payload.domainType === 'Pilzfund')
        .sort((a, b) => (b.payload.date || '').localeCompare(a.payload.date || '')),
    [knowledgeEntries]
  );

  const mushroomFindPagination = usePagination(allMushroomFinds, 5);

  const openNewSighting = (presetBird?: BirdSpecies, presetMammalName?: string) => {
    setEditingSighting(null);
    if (presetBird) {
      setSightingSpeciesId(presetBird.id);
      setSightingCustomName(presetBird.name);
      setSightingSource(
        presetBird.wildcamLikelihood === 'Nachts / Dämmerung' ? 'Wildkamera' : 'Direktsichtung'
      );
    } else if (presetMammalName) {
      setSightingSpeciesId('custom');
      setSightingCustomName(presetMammalName);
      setSightingSource('Wildkamera');
    } else {
      setSightingSpeciesId('rotkehlchen');
      setSightingCustomName('Rotkehlchen');
      setSightingSource('Direktsichtung');
    }
    setSightingDate(new Date().toISOString().slice(0, 10));
    setSightingTime(new Date().toTimeString().slice(0, 5));
    setSightingCount(1);
    setSightingZone('Futterhaus / Terrasse');
    setSightingObserver(activeIdentity || 'Nico');
    setSightingNotes('');
    setShowSightingModal(true);
  };

  const openEditSighting = (entry: HomesteadRecord<KnowledgePayload>) => {
    setEditingSighting(entry);
    setSightingSpeciesId(entry.payload.speciesId || 'custom');
    setSightingCustomName(entry.payload.speciesName || entry.title);
    setSightingDate(entry.payload.date || new Date().toISOString().slice(0, 10));
    setSightingTime(entry.payload.sightingTime || '08:00');
    setSightingSource(
      entry.payload.observationSource === 'Futterhaus' ||
        entry.payload.observationSource === 'Wildkamera' ||
        entry.payload.observationSource === 'Ruf gehört'
        ? entry.payload.observationSource
        : 'Direktsichtung'
    );
    setSightingCount(entry.payload.count || 1);
    setSightingZone(entry.payload.habitatZone || entry.payload.locationNote || 'Futterhaus / Terrasse');
    setSightingObserver(entry.payload.observer || activeIdentity || 'Nico');
    setSightingNotes(entry.payload.content || '');
    setShowSightingModal(true);
  };

  const saveSighting = async (e: React.FormEvent) => {
    e.preventDefault();
    const matchedBird = BIRD_SPECIES.find((b) => b.id === sightingSpeciesId);
    const resolvedName =
      sightingSpeciesId === 'custom'
        ? sightingCustomName.trim()
        : matchedBird?.name || sightingCustomName.trim();
    if (!resolvedName) return;

    const recordTitle = `${resolvedName} (${sightingCount}× · ${sightingSource})`;
    const summaryText =
      sightingNotes.trim() ||
      `${resolvedName} beobachtet (${sightingSource}) am ${sightingDate} um ${sightingTime} Uhr — Bereich: ${sightingZone}.`;

    const payload: KnowledgePayload = {
      domainType: 'Vogelsichtung',
      category: sightingSource,
      content: summaryText,
      source: `${sightingObserver} · ${sightingZone}`,
      isVerifiedSource: false,
      date: sightingDate,
      locationNote: sightingZone,
      tags: ['Birdwatching', sightingSource, resolvedName],
      speciesId: sightingSpeciesId,
      speciesName: resolvedName,
      sightingTime,
      observationSource: sightingSource,
      count: Math.max(1, Number(sightingCount) || 1),
      observer: sightingObserver,
      habitatZone: sightingZone,
    };

    if (editingSighting) {
      await updateRecord('knowledgeEntries', editingSighting.id, recordTitle, payload, editingSighting.updatedAtMs);
      pushToast('success', `Sichtung „${resolvedName}“ aktualisiert.`);
    } else {
      await createRecord('knowledgeEntries', recordTitle, payload);
      pushToast('success', `Sichtung eingetragen: ${resolvedName}`);
    }
    setShowSightingModal(false);
  };

  const openNewFind = (presetMushroom?: MushroomSpecies) => {
    setEditingFind(null);
    if (presetMushroom) {
      setFindSpeciesId(presetMushroom.id);
      setFindCustomName(presetMushroom.name);
    } else {
      setFindSpeciesId('steinpilz');
      setFindCustomName('Gemeiner Steinpilz');
    }
    setFindDate(new Date().toISOString().slice(0, 10));
    setFindSpot('Mellenbach Mischwald');
    setFindObserver(activeIdentity || 'Nico');
    setFindVerified(false);
    setFindNotes('');
    setShowFindModal(true);
  };

  const openEditFind = (entry: HomesteadRecord<KnowledgePayload>) => {
    setEditingFind(entry);
    setFindSpeciesId(entry.payload.speciesId || 'custom');
    setFindCustomName(entry.payload.speciesName || entry.title);
    setFindDate(entry.payload.date || new Date().toISOString().slice(0, 10));
    setFindSpot(entry.payload.habitatZone || entry.payload.locationNote || 'Mellenbach Mischwald');
    setFindObserver(entry.payload.observer || activeIdentity || 'Nico');
    setFindVerified(Boolean(entry.payload.mushroomVerified));
    setFindNotes(entry.payload.content || '');
    setShowFindModal(true);
  };

  const saveFind = async (e: React.FormEvent) => {
    e.preventDefault();
    const matched = MUSHROOM_SPECIES.find((m) => m.id === findSpeciesId);
    const resolvedName =
      findSpeciesId === 'custom'
        ? findCustomName.trim()
        : matched?.name || findCustomName.trim();
    if (!resolvedName) return;

    const summaryText =
      findNotes.trim() || `${resolvedName} entdeckt am ${findDate} (${findSpot}).`;

    const payload: KnowledgePayload = {
      domainType: 'Pilzfund',
      category: matched?.category || 'Pilzfund',
      content: summaryText,
      source: `${findObserver} · ${findSpot}`,
      isVerifiedSource: findVerified,
      safetyWarning:
        'Keine automatische Verzehrfreigabe — unbekannte oder unsichere Pilze immer durch Pilzsachverständige (PSV) prüfen lassen.',
      date: findDate,
      locationNote: findSpot,
      tags: ['Pilze', resolvedName, findSpot],
      speciesId: findSpeciesId,
      speciesName: resolvedName,
      observationSource: 'Pilzfund',
      observer: findObserver,
      habitatZone: findSpot,
      mushroomVerified: findVerified,
    };

    if (editingFind) {
      await updateRecord('knowledgeEntries', editingFind.id, resolvedName, payload, editingFind.updatedAtMs);
      pushToast('success', `Pilzfund „${resolvedName}“ aktualisiert.`);
    } else {
      await createRecord('knowledgeEntries', resolvedName, payload);
      pushToast('success', `Pilzfund gespeichert: ${resolvedName}`);
    }
    setShowFindModal(false);
  };

  return (
    <div className="space-y-5">
      <ModuleHeader
        title="Vögel, Wildkamera & Pilze"
        subtitle="Heimische Arten rund um 98744 Schwarzatal · Rufe, Wildkamera-Hilfe, Sichtungsbuch & Pilz-Doppelgänger"
        actions={
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => openNewSighting()}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#233A29] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 hover:opacity-90 transition"
            >
              <Plus className="w-4 h-4" />
              Vogelsichtung eintragen
            </button>
            <button
              type="button"
              onClick={() => openNewFind()}
              className="min-h-[44px] px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
            >
              <Plus className="w-4 h-4" />
              Pilzfund notieren
            </button>
          </div>
        }
      />

      <SegmentedTabs
        tabs={[
          { id: 'birds', label: `Vogelarten & Wildkamera (${BIRD_SPECIES.length})` },
          { id: 'sightings', label: `Sichtungsbuch (${allSightings.length})` },
          { id: 'mushrooms', label: `Pilzdatenbank (${MUSHROOM_SPECIES.length})` },
        ]}
        activeTab={tab}
        onChange={(id) => setTab(id as typeof tab)}
      />

      {/* TAB 1: BIRDS & WILDCAM GUIDE */}
      {tab === 'birds' && (
        <div className="space-y-4">
          {/* Atmospheric compact field-guide banner */}
          <div className="relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-gradient-to-br from-[#233A29] via-[#34543C] to-[#527359]">
            <div className="grid grid-cols-1 md:grid-cols-12 items-stretch">
              <div className="md:col-span-5 h-36 sm:h-44 md:h-auto relative">
                <img
                  src={BIRDWATCHING_BANNER_IMG}
                  alt="Heimische Gartenvögel im Thüringer Schiefergebirge"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="md:col-span-7 p-4 sm:p-5 bg-white dark:bg-[#161D1A] flex flex-col justify-center space-y-2">
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  Mellenbach-Glasbach · Thüringer Schiefergebirge · Aktiver Monat: {currentMonthLabel}
                </div>
                <h2 className="font-display text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  Heimische Vögel erkennen, Rufe anhören & Wildkamera auswerten
                </h2>
                <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  Tippe auf eine Art für vollständige Nahrungsangaben, Monatskalender und Wildkamera-Erkennungstipps (inklusive häufigem nächtlichem Säugetier-Beifang).
                </p>
              </div>
            </div>
          </div>

          {/* Filters + Search */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-neutral-200/70 dark:bg-neutral-800/70 rounded-xl overflow-x-auto">
              {[
                { id: 'all', label: 'Alle Vögel' },
                { id: 'season', label: `Aktiv im ${currentMonthLabel}` },
                { id: 'wildcam', label: 'Wildkamera-Klassiker' },
                { id: 'mammals', label: 'Wildkamera: Säugetiere' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setBirdFilter(f.id as typeof birdFilter)}
                  className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition ${
                    birdFilter === f.id
                      ? 'bg-white dark:bg-[#161D1A] text-neutral-900 dark:text-neutral-100 shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {birdFilter !== 'mammals' && (
              <input
                type="search"
                value={birdSearch}
                onChange={(e) => setBirdSearch(e.target.value)}
                placeholder="Vogel, Futter oder Ort suchen…"
                className="min-h-[44px] px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-xs w-full sm:w-64"
              />
            )}
          </div>

          {/* Wildcam Mammals View */}
          {birdFilter === 'mammals' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {WILDCAM_MAMMALS.map((m) => (
                <div
                  key={m.id}
                  className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs text-neutral-500 dark:text-neutral-400">
                        Wildkamera-Beifang · {m.latinName} · <span className="font-mono-num">{m.sizeCm}</span>
                      </div>
                      <h3 className="font-display text-lg font-bold text-neutral-900 dark:text-neutral-100 mt-0.5">
                        {m.name}
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => openNewSighting(undefined, m.name)}
                      className="min-h-[44px] px-3 py-2 rounded-xl bg-[#233A29] text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      Notieren
                    </button>
                  </div>
                  <div className="text-xs space-y-1.5 text-neutral-700 dark:text-neutral-300">
                    <div>
                      <strong>Aktivzeit:</strong> {m.activity}
                    </div>
                    <div>
                      <strong>Erkennung auf IR-Wildkamera:</strong> {m.irClues}
                    </div>
                    <div>
                      <strong>Nahrung:</strong> {m.diet}
                    </div>
                    <div className="text-neutral-500 dark:text-neutral-400 pt-1">{m.note}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : filteredBirds.length === 0 ? (
            <EmptyState
              title="Keine passenden Vogelarten gefunden"
              description="Passe Suche oder Filter an, um alle heimischen Arten rund ums Schwarzatal anzuzeigen."
            />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {birdPagination.pageItems.map((bird) => {
                  const isPlaying = playingBirdId === bird.id;
                  const activeNow = bird.activeMonths.includes(currentMonth);
                  return (
                    <div
                      key={bird.id}
                      className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden flex flex-col"
                    >
                      <div className="grid grid-cols-12 items-stretch">
                        <button
                          type="button"
                          onClick={() => setSelectedBird(bird)}
                          className="col-span-5 sm:col-span-4 bg-[#EDF3EA] dark:bg-[#1B241F] flex items-center justify-center p-2 hover:opacity-95 transition text-left"
                          aria-label={`${bird.name} Details öffnen`}
                        >
                          <BirdPlateSvg birdId={bird.id} className="w-full h-28 sm:h-32 object-contain" />
                        </button>
                        <div className="col-span-7 sm:col-span-8 p-4 flex flex-col justify-between gap-2">
                          <div>
                            <div className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                              {bird.group} · {bird.sizeCm} · {activeNow ? `Aktiv (${currentMonthLabel})` : 'Saisonal'}
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedBird(bird)}
                              className="font-display text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 hover:underline text-left mt-0.5"
                            >
                              {bird.name}
                            </button>
                            <div className="text-xs italic text-neutral-500 dark:text-neutral-400">
                              {bird.latinName}
                            </div>
                          </div>

                          <div className="text-xs text-neutral-700 dark:text-neutral-300 space-y-1">
                            <div className="line-clamp-2">
                              <strong>Frisst:</strong> {bird.diet.slice(0, 3).join(', ')}
                            </div>
                            <div className="text-[11px] text-neutral-500 dark:text-neutral-400">
                              Wildkamera: {bird.wildcamLikelihood}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="px-4 py-2.5 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 flex flex-wrap items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => toggleCall(bird)}
                          className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-medium inline-flex items-center gap-1.5 border transition ${
                            isPlaying
                              ? 'bg-[#233A29] text-white border-[#233A29]'
                              : 'bg-white dark:bg-[#161D1A] border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                          }`}
                        >
                          {isPlaying ? <Square className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                          <span>{isPlaying ? 'Stopp' : 'Ruf anhören'}</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSelectedBird(bird)}
                            className="min-h-[44px] px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-xs font-medium inline-flex items-center gap-1.5"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Details</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => openNewSighting(bird)}
                            className="min-h-[44px] px-3 py-1.5 rounded-xl bg-[#BBE774] text-[#18201B] text-xs font-semibold inline-flex items-center gap-1.5 hover:opacity-90"
                          >
                            <Binoculars className="w-3.5 h-3.5" />
                            <span>Sichtung</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <PaginationControls
                page={birdPagination.page}
                totalPages={birdPagination.totalPages}
                totalItems={birdPagination.totalItems}
                itemLabel="Arten"
                onPageChange={birdPagination.setPage}
              />
            </>
          )}
        </div>
      )}

      {/* TAB 2: SIGHTING LOG (BIRDWATCHING & WILDCAM) */}
      {tab === 'sightings' && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2.5 sm:gap-4">
            <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-3.5 sm:p-4">
              <div className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400">Sichtungen gesamt</div>
              <div className="font-display text-xl sm:text-2xl font-bold font-mono-num mt-0.5">
                {allSightings.length}
              </div>
            </div>
            <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-3.5 sm:p-4">
              <div className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400">Entdeckte Arten</div>
              <div className="font-display text-xl sm:text-2xl font-bold font-mono-num mt-0.5">
                {uniqueBirdSpeciesSeen}
              </div>
            </div>
            <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-3.5 sm:p-4">
              <div className="text-[11px] sm:text-xs text-neutral-500 dark:text-neutral-400">Wildkamera-Treffer</div>
              <div className="font-display text-xl sm:text-2xl font-bold font-mono-num mt-0.5">
                {wildcamCount}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1 p-1 bg-neutral-200/70 dark:bg-neutral-800/70 rounded-xl overflow-x-auto">
              {[
                { id: 'all', label: 'Alle Sichtungen' },
                { id: 'wildcam', label: 'Nur Wildkamera' },
                { id: 'Nico', label: 'Nico' },
                { id: 'Chris', label: 'Chris' },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setSightingFilter(f.id as typeof sightingFilter)}
                  className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                    sightingFilter === f.id
                      ? 'bg-white dark:bg-[#161D1A] text-neutral-900 dark:text-neutral-100 shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => openNewSighting()}
              className="min-h-[44px] px-3.5 py-2 rounded-xl bg-[#233A29] text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Neue Sichtung
            </button>
          </div>

          {filteredSightings.length === 0 ? (
            <EmptyState
              title="Noch keine Sichtungen eingetragen"
              description="Trage hier ein, wann du oder Chris welchen Vogel am Futterhaus, im Garten oder auf der Wildkamera entdeckt habt."
              actionLabel="Erste Sichtung eintragen"
              onAction={() => openNewSighting()}
            />
          ) : (
            <>
              <div className="space-y-2.5">
                {sightingPagination.pageItems.map((entry) => (
                  <div
                    key={entry.id}
                    className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono-num">
                        {entry.payload.date} · {entry.payload.sightingTime || '—'} Uhr · {entry.payload.observationSource || 'Direktsichtung'} · {entry.payload.observer || 'Hof'}
                      </div>
                      <div className="font-display text-base font-bold text-neutral-900 dark:text-neutral-100">
                        {entry.payload.speciesName || entry.title}
                        {entry.payload.count && entry.payload.count > 1 ? ` (${entry.payload.count}×)` : ''}
                      </div>
                      <div className="text-xs text-neutral-600 dark:text-neutral-400">
                        {entry.payload.habitatZone || entry.payload.locationNote}
                        {entry.payload.content ? ` — ${entry.payload.content}` : ''}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => openEditSighting(entry)}
                        aria-label="Sichtung bearbeiten"
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => archiveRecord('knowledgeEntries', entry.id, entry.title)}
                        aria-label="Sichtung archivieren"
                        className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-700 text-[#CF6432] hover:bg-[#CF6432]/10"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <PaginationControls
                page={sightingPagination.page}
                totalPages={sightingPagination.totalPages}
                totalItems={sightingPagination.totalItems}
                itemLabel="Sichtungen"
                onPageChange={sightingPagination.setPage}
              />
            </>
          )}
        </div>
      )}

      {/* TAB 3: MUSHROOM DATABASE & FALSE FRIENDS */}
      {tab === 'mushrooms' && (
        <div className="space-y-4">
          {/* Atmospheric banner + Safety Rule */}
          <div className="relative overflow-hidden rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-gradient-to-br from-[#233A29] via-[#3A5338] to-[#6E5A44]">
            <div className="grid grid-cols-1 md:grid-cols-12 items-stretch">
              <div className="md:col-span-5 h-36 sm:h-44 md:h-auto relative">
                <img
                  src={MUSHROOM_BANNER_IMG}
                  alt="Heimische Speisepilze im moosigen Thüringer Wald"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="md:col-span-7 p-4 sm:p-5 bg-white dark:bg-[#161D1A] flex flex-col justify-center space-y-2">
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  Saurer Schieferboden · Fichten- & Buchenwald · Monat: {currentMonthLabel}
                </div>
                <h2 className="font-display text-lg font-bold text-neutral-900 dark:text-neutral-100">
                  Pilzdatenbank: Speisepilze & gefährliche Doppelgänger
                </h2>
                <div className="p-2.5 rounded-xl bg-[#CF6432]/12 border border-[#CF6432]/35 text-xs text-neutral-800 dark:text-neutral-200 flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-[#CF6432] shrink-0 mt-0.5" />
                  <span>
                    <strong>Wichtiger Sicherheitshinweis:</strong> Keine Verzehrfreigabe durch App oder Textvergleich. Unbekannte Pilze vor dem Verzehr immer von einer zertifizierten Pilzsachverständigen (PSV) in Thüringen prüfen lassen.
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 p-1 bg-neutral-200/70 dark:bg-neutral-800/70 rounded-xl overflow-x-auto">
              {[
                { id: 'all', label: 'Alle Pilze' },
                { id: 'edible', label: 'Speisepilze' },
                { id: 'toxic', label: 'Giftige Doppelgänger' },
                { id: 'season', label: `Saison (${currentMonthLabel})` },
                { id: 'finds', label: `Meine Pilzfunde (${allMushroomFinds.length})` },
              ].map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setMushroomFilter(f.id as typeof mushroomFilter)}
                  className={`min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition ${
                    mushroomFilter === f.id
                      ? 'bg-white dark:bg-[#161D1A] text-neutral-900 dark:text-neutral-100 shadow-xs'
                      : 'text-neutral-600 dark:text-neutral-400'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
            {mushroomFilter !== 'finds' && (
              <input
                type="search"
                value={mushroomSearch}
                onChange={(e) => setMushroomSearch(e.target.value)}
                placeholder="Pilz, Baum oder Doppelgänger suchen…"
                className="min-h-[44px] px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-xs w-full sm:w-64"
              />
            )}
          </div>

          {mushroomFilter === 'finds' ? (
            allMushroomFinds.length === 0 ? (
              <EmptyState
                title="Noch keine Pilzfunde protokolliert"
                description="Halte deine Fundorte im Schwarzatal und in Mellenbach fest — inklusive Datum und ob der Fund fachlich geprüft wurde."
                actionLabel="Pilzfund eintragen"
                onAction={() => openNewFind()}
              />
            ) : (
              <>
                <div className="space-y-2.5">
                  {mushroomFindPagination.pageItems.map((entry) => (
                    <div
                      key={entry.id}
                      className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="text-xs text-neutral-500 dark:text-neutral-400 font-mono-num">
                          {entry.payload.date} · {entry.payload.habitatZone || entry.payload.locationNote} · {entry.payload.observer || 'Hof'}
                          {entry.payload.mushroomVerified ? ' · PSV-geprüft' : ' · Eigene Bestimmung'}
                        </div>
                        <div className="font-display text-base font-bold text-neutral-900 dark:text-neutral-100">
                          {entry.payload.speciesName || entry.title}
                        </div>
                        <div className="text-xs text-neutral-600 dark:text-neutral-400">{entry.payload.content}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openEditFind(entry)}
                          aria-label="Pilzfund bearbeiten"
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-700"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => archiveRecord('knowledgeEntries', entry.id, entry.title)}
                          aria-label="Pilzfund archivieren"
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-700 text-[#CF6432]"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <PaginationControls
                  page={mushroomFindPagination.page}
                  totalPages={mushroomFindPagination.totalPages}
                  totalItems={mushroomFindPagination.totalItems}
                  itemLabel="Funde"
                  onPageChange={mushroomFindPagination.setPage}
                />
              </>
            )
          ) : filteredMushrooms.length === 0 ? (
            <EmptyState
              title="Kein passender Pilzeintrag"
              description="Passe Suche oder Saisonfilter an, um Speisepilze und Verwechslungspartner anzuzeigen."
            />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {mushroomPagination.pageItems.map((m) => (
                  <div
                    key={m.id}
                    className={`bg-white dark:bg-[#161D1A] border rounded-2xl overflow-hidden flex flex-col ${
                      m.isToxic
                        ? 'border-[#CF6432]/50 dark:border-[#CF6432]/45'
                        : 'border-neutral-200 dark:border-neutral-800'
                    }`}
                  >
                    <div className="grid grid-cols-12 items-stretch">
                      <button
                        type="button"
                        onClick={() => setSelectedMushroom(m)}
                        className="col-span-5 sm:col-span-4 bg-[#EFF3EB] dark:bg-[#1A221D] flex items-center justify-center p-2"
                        aria-label={`${m.name} Details öffnen`}
                      >
                        <MushroomPlateSvg mushroomId={m.id} className="w-full h-28 sm:h-32 object-contain" />
                      </button>
                      <div className="col-span-7 sm:col-span-8 p-4 flex flex-col justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                            {m.isToxic ? (
                              <span className="inline-flex items-center gap-1 text-[#B64818] dark:text-[#F49D76]">
                                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                                {m.edibility}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[#3B6912] dark:text-[#BBE774]">
                                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                                {m.edibility}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setSelectedMushroom(m)}
                            className="font-display text-base sm:text-lg font-bold text-neutral-900 dark:text-neutral-100 hover:underline text-left mt-0.5"
                          >
                            {m.name}
                          </button>
                          <div className="text-xs italic text-neutral-500 dark:text-neutral-400">
                            {m.category} · {m.seasonLabel}
                          </div>
                        </div>

                        <div className="text-xs text-neutral-700 dark:text-neutral-300 space-y-1">
                          <div className="line-clamp-2">
                            <strong>Wo:</strong> {m.whereToFind}
                          </div>
                          {m.falseFriends.length > 0 && (
                            <div className="text-[11px] text-[#B64818] dark:text-[#F49D76] line-clamp-1">
                              Doppelgänger: {m.falseFriends.map((f) => f.name).join(', ')}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="px-4 py-2.5 border-t border-neutral-100 dark:border-neutral-800 bg-neutral-50/70 dark:bg-neutral-900/40 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate">
                        {m.undersideType.split(':')[0]}
                      </span>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => setSelectedMushroom(m)}
                          className="min-h-[44px] px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-xs font-medium inline-flex items-center gap-1.5"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Erkennen & Vergleich</span>
                        </button>
                        {!m.isToxic && (
                          <button
                            type="button"
                            onClick={() => openNewFind(m)}
                            className="min-h-[44px] px-3 py-1.5 rounded-xl bg-[#233A29] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Fund</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <PaginationControls
                page={mushroomPagination.page}
                totalPages={mushroomPagination.totalPages}
                totalItems={mushroomPagination.totalItems}
                itemLabel="Pilzarten"
                onPageChange={mushroomPagination.setPage}
              />
            </>
          )}
        </div>
      )}

      {/* BIRD DETAIL MODAL */}
      <Modal
        open={Boolean(selectedBird)}
        onClose={() => setSelectedBird(null)}
        title={selectedBird ? `${selectedBird.name} (${selectedBird.latinName})` : ''}
      >
        {selectedBird && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-5 rounded-2xl overflow-hidden bg-[#EDF3EA] dark:bg-[#1B241F] p-2">
                <BirdPlateSvg birdId={selectedBird.id} className="w-full h-40 object-contain" />
              </div>
              <div className="sm:col-span-7 space-y-2.5">
                <div className="text-xs text-neutral-500 dark:text-neutral-400">
                  {selectedBird.group} · Körperlänge {selectedBird.sizeCm} · {selectedBird.seasonSummary}
                </div>
                <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-1.5">
                  <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                    Stimme & Ruf
                  </div>
                  <div className="text-xs text-neutral-700 dark:text-neutral-300">{selectedBird.callText}</div>
                  <div className="text-[11px] text-neutral-500 dark:text-neutral-400">{selectedBird.callNotes}</div>
                  <button
                    type="button"
                    onClick={() => toggleCall(selectedBird)}
                    className="min-h-[44px] mt-1 px-3.5 py-2 rounded-xl bg-[#233A29] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                  >
                    {playingBirdId === selectedBird.id ? (
                      <Square className="w-3.5 h-3.5" />
                    ) : (
                      <Volume2 className="w-3.5 h-3.5" />
                    )}
                    <span>{playingBirdId === selectedBird.id ? 'Wiedergabe stoppen' : 'Ruf abspielen'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Active 12-month bar */}
            <div>
              <div className="text-xs font-semibold mb-1.5">Aktive Jahreszeiten in Thüringen</div>
              <div className="grid grid-cols-6 sm:grid-cols-12 gap-1">
                {MONTH_SHORT_DE.map((label, idx) => {
                  const active = selectedBird.activeMonths.includes(idx + 1);
                  return (
                    <div
                      key={label}
                      className={`py-1.5 rounded-lg text-center text-[11px] font-mono-num border ${
                        active
                          ? 'bg-[#BBE774]/30 border-[#84B835]/50 text-neutral-900 dark:text-neutral-100 font-semibold'
                          : 'bg-neutral-100 dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 text-neutral-400'
                      }`}
                    >
                      {label}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-1.5">
                <div className="font-semibold text-neutral-900 dark:text-neutral-100">Was frisst diese Art?</div>
                <ul className="list-disc pl-4 space-y-1 text-neutral-700 dark:text-neutral-300">
                  {selectedBird.diet.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <div className="text-[11px] text-neutral-500 dark:text-neutral-400 pt-1">
                  <strong>Futterstelle:</strong> {selectedBird.feederTip}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-1.5">
                <div className="font-semibold text-neutral-900 dark:text-neutral-100">Erkennen & Wildkamera</div>
                <ul className="list-disc pl-4 space-y-1 text-neutral-700 dark:text-neutral-300">
                  {selectedBird.keyFeatures.map((feat) => (
                    <li key={feat}>{feat}</li>
                  ))}
                </ul>
                <div className="text-[11px] text-neutral-700 dark:text-neutral-300 pt-1">
                  <strong>Wildkamera-Hinweis ({selectedBird.wildcamLikelihood}):</strong> {selectedBird.wildcamTips}
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedBird(null)}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-medium"
              >
                Schließen
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = selectedBird;
                  setSelectedBird(null);
                  openNewSighting(target);
                }}
                className="min-h-[44px] px-4 py-2 rounded-xl bg-[#233A29] text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Binoculars className="w-4 h-4" />
                Sichtung jetzt eintragen
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* MUSHROOM DETAIL MODAL */}
      <Modal
        open={Boolean(selectedMushroom)}
        onClose={() => setSelectedMushroom(null)}
        title={selectedMushroom ? `${selectedMushroom.name} (${selectedMushroom.latinName})` : ''}
      >
        {selectedMushroom && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
              <div className="sm:col-span-5 rounded-2xl overflow-hidden bg-[#EFF3EB] dark:bg-[#1A221D] p-2">
                <MushroomPlateSvg mushroomId={selectedMushroom.id} className="w-full h-40 object-contain" />
              </div>
              <div className="sm:col-span-7 space-y-2 text-xs">
                <div className="font-semibold flex items-center gap-1.5">
                  {selectedMushroom.isToxic ? (
                    <span className="text-[#B64818] dark:text-[#F49D76] inline-flex items-center gap-1">
                      <AlertTriangle className="w-4 h-4" />
                      {selectedMushroom.edibility}
                    </span>
                  ) : (
                    <span className="text-[#3B6912] dark:text-[#BBE774] inline-flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4" />
                      {selectedMushroom.edibility}
                    </span>
                  )}
                </div>
                <div className="text-neutral-600 dark:text-neutral-400">
                  {selectedMushroom.category} · Saison: {selectedMushroom.seasonLabel}
                </div>
                <div className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  <strong>Wo finden (Schiefergebirge):</strong> {selectedMushroom.whereToFind}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-1.5">
                <div className="font-semibold text-neutral-900 dark:text-neutral-100">Bestimmungsmerkmale</div>
                <div>
                  <strong>Hut:</strong> {selectedMushroom.capFeatures}
                </div>
                <div>
                  <strong>Unterseite:</strong> {selectedMushroom.undersideType}
                </div>
                <div>
                  <strong>Stiel & Fleisch:</strong> {selectedMushroom.stemAndFlesh}
                </div>
                <div>
                  <strong>Geruch:</strong> {selectedMushroom.smell}
                </div>
              </div>

              <div className="p-3.5 rounded-xl border border-[#CF6432]/40 bg-[#CF6432]/8 space-y-2">
                <div className="font-semibold text-[#B64818] dark:text-[#F49D76] flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4" />
                  Achtung Verwechslungsgefahr (False Friends)
                </div>
                {selectedMushroom.falseFriends.map((ff) => (
                  <div key={ff.name} className="space-y-0.5 pb-2 border-b border-[#CF6432]/20 last:border-b-0 last:pb-0">
                    <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                      {ff.name} — <span className="text-[#B64818] dark:text-[#F49D76]">{ff.danger}</span>
                    </div>
                    <div className="text-neutral-700 dark:text-neutral-300">{ff.keyDifference}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-700 dark:text-neutral-300">
              <strong>Praxistipp & Sicherheit:</strong> {selectedMushroom.safetyHint}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedMushroom(null)}
                className="min-h-[44px] px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-medium"
              >
                Schließen
              </button>
              {!selectedMushroom.isToxic && (
                <button
                  type="button"
                  onClick={() => {
                    const target = selectedMushroom;
                    setSelectedMushroom(null);
                    openNewFind(target);
                  }}
                  className="min-h-[44px] px-4 py-2 rounded-xl bg-[#233A29] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  Pilzfund notieren
                </button>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* BIRD / WILDCAM SIGHTING MODAL */}
      <Modal
        open={showSightingModal}
        onClose={() => setShowSightingModal(false)}
        title={editingSighting ? 'Sichtung bearbeiten' : 'Vogel- oder Wildkamera-Sichtung eintragen'}
      >
        <form onSubmit={saveSighting} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Art auswählen *</label>
              <select
                value={sightingSpeciesId}
                onChange={(e) => {
                  const id = e.target.value;
                  setSightingSpeciesId(id);
                  const found = BIRD_SPECIES.find((b) => b.id === id);
                  if (found) setSightingCustomName(found.name);
                  else if (id === 'custom') setSightingCustomName('');
                }}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              >
                {BIRD_SPECIES.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} ({b.group})
                  </option>
                ))}
                <option value="custom">Andere Art / Wildkamera-Tier eingeben…</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Artname (bei Bedarf anpassen) *</label>
              <input
                type="text"
                required
                value={sightingCustomName}
                onChange={(e) => setSightingCustomName(e.target.value)}
                placeholder="z. B. Rotkehlchen, Rotfuchs, Sperber"
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Datum *</label>
              <input
                type="date"
                required
                value={sightingDate}
                onChange={(e) => setSightingDate(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Uhrzeit</label>
              <input
                type="time"
                value={sightingTime}
                onChange={(e) => setSightingTime(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Anzahl</label>
              <input
                type="number"
                min={1}
                max={200}
                value={sightingCount}
                onChange={(e) => setSightingCount(Number(e.target.value) || 1)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Beobachtet von</label>
              <select
                value={sightingObserver}
                onChange={(e) => setSightingObserver(e.target.value as AssigneeScope)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              >
                <option value="Nico">Nico</option>
                <option value="Chris">Chris</option>
                <option value="Gemeinsam">Gemeinsam</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Beobachtungsart</label>
              <select
                value={sightingSource}
                onChange={(e) => setSightingSource(e.target.value as typeof sightingSource)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              >
                <option value="Direktsichtung">Direktsichtung / Fernglas</option>
                <option value="Futterhaus">Am Futterhaus</option>
                <option value="Wildkamera">Wildkamera-Aufnahme</option>
                <option value="Ruf gehört">Nur Ruf / Gesang gehört</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Bereich / Standort</label>
              <input
                type="text"
                list="bird-habitat-presets"
                value={sightingZone}
                onChange={(e) => setSightingZone(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
              <datalist id="bird-habitat-presets">
                {HABITAT_PRESETS.map((z) => (
                  <option key={z} value={z} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Verhalten / Notiz</label>
            <textarea
              rows={3}
              value={sightingNotes}
              onChange={(e) => setSightingNotes(e.target.value)}
              placeholder="z. B. Pärchen am Meisenknödel, oder auf der Wildkamera abends beim Scharren im Laub."
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowSightingModal(false)}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-medium"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#233A29] text-white text-xs font-semibold"
            >
              Sichtung speichern
            </button>
          </div>
        </form>
      </Modal>

      {/* MUSHROOM FIND MODAL */}
      <Modal
        open={showFindModal}
        onClose={() => setShowFindModal(false)}
        title={editingFind ? 'Pilzfund bearbeiten' : 'Pilzfund notieren'}
      >
        <form onSubmit={saveFind} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Pilzart *</label>
              <select
                value={findSpeciesId}
                onChange={(e) => {
                  const id = e.target.value;
                  setFindSpeciesId(id);
                  const found = MUSHROOM_SPECIES.find((m) => m.id === id);
                  if (found) setFindCustomName(found.name);
                  else if (id === 'custom') setFindCustomName('');
                }}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              >
                {MUSHROOM_SPECIES.filter((m) => !m.isToxic).map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
                <option value="custom">Andere Pilzart eingeben…</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Artname *</label>
              <input
                type="text"
                required
                value={findCustomName}
                onChange={(e) => setFindCustomName(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Funddatum *</label>
              <input
                type="date"
                required
                value={findDate}
                onChange={(e) => setFindDate(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Fundort / Waldstück</label>
              <input
                type="text"
                list="mushroom-spot-presets"
                value={findSpot}
                onChange={(e) => setFindSpot(e.target.value)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
              <datalist id="mushroom-spot-presets">
                {MUSHROOM_SPOT_PRESETS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Sammler</label>
              <select
                value={findObserver}
                onChange={(e) => setFindObserver(e.target.value as AssigneeScope)}
                className="w-full min-h-[44px] px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              >
                <option value="Nico">Nico</option>
                <option value="Chris">Chris</option>
                <option value="Gemeinsam">Gemeinsam</option>
              </select>
            </div>
          </div>

          <label className="flex items-center gap-2.5 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              checked={findVerified}
              onChange={(e) => setFindVerified(e.target.checked)}
              className="w-4 h-4 rounded"
            />
            <span>Fund durch Pilzsachverständige (PSV) geprüft oder zu 100 % eindeutig bestimmter Röhrling</span>
          </label>

          <div>
            <label className="block text-xs font-medium mb-1">Notizen (Baum, Boden, Zustand)</label>
            <textarea
              rows={3}
              value={findNotes}
              onChange={(e) => setFindNotes(e.target.value)}
              placeholder="z. B. 4 feste Maronen im Moos unter jungen Fichten nach zwei Regentagen."
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowFindModal(false)}
              className="min-h-[44px] px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-medium"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="min-h-[44px] px-4 py-2 rounded-xl bg-[#233A29] text-white text-xs font-semibold"
            >
              Pilzfund speichern
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
