import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Archive,
  ArrowRight,
  CalendarPlus,
  Check,
  Edit3,
  GitCompare,
  Plus,
  RefreshCw,
  Search,
  Snowflake,
  Sparkles,
  Sprout,
  Star,
  ThermometerSun,
  Trees,
} from 'lucide-react';
import { useHomestead } from '../context/HomesteadContext';
import {
  BOTANICAL_SPECIES_GROUPS,
  MONTHLY_GARDEN_CALENDAR,
  PHENOLOGICAL_PHASES,
  buildStarterPlants,
  getTreeIdentificationFallback,
  suggestCropRotation,
} from '../data/botanicalCatalog';
import {
  EmptyState,
  Modal,
  ModuleHeader,
  PaginationControls,
  SegmentedTabs,
  usePagination,
} from '../components/ui/SharedUI';
import type {
  HomesteadRecord,
  PlantingPayload,
  PlantPayload,
  SeedPayload,
} from '../types/homestead';

function getGroupColor(group: string): string {
  switch (group) {
    case 'Fruchtgemüse':
      return '#EF4444';
    case 'Wurzel- & Knollengemüse':
      return '#EA580C';
    case 'Kohlgemüse':
      return '#16A34A';
    case 'Blattgemüse':
      return '#65A30D';
    case 'Hülsenfrüchte':
      return '#0D9488';
    case 'Zwiebelgewächse':
      return '#9333EA';
    case 'Obst & Beeren':
      return '#D45B6E';
    case 'Nüsse':
      return '#92400E';
    case 'Pilze':
      return '#7C3AED';
    case 'Kräuter':
      return '#0284C7';
    default:
      return '#3B6912';
  }
}

const EMPTY_PLANT: PlantPayload = {
  species: 'Tomaten',
  variety: '',
  group: 'Fruchtgemüse',
  description: '',
  origin: '',
  daysToMaturity: '',
  preCultureWindow: '',
  sowingWindow: '',
  plantingWindow: '',
  harvestWindow: '',
  plantSpacingCm: '',
  rowSpacingCm: '',
  lightNeed: '',
  waterNeed: '',
  nutrientNeed: 'Mittelzehrer',
  soilRequirement: '',
  hardiness: '',
  diseaseSusceptibility: '',
  yieldPotential: '',
  storageLife: '',
  taste: '',
  usage: '',
  processingSuitability: '',
  seedSource: '',
  sourceRef: '',
  goodNeighbors: '',
  badNeighbors: '',
  careTip: '',
  isTree: false,
};

export const CultivationView: React.FC = () => {
  const {
    plants,
    plantings,
    seeds,
    areas,
    activeIdentity,
    createRecord,
    updateRecord,
    archiveRecord,
    seedReferenceDatabases,
    pushToast,
  } = useHomestead();

  const [tab, setTab] = useState<'varieties' | 'season' | 'beds' | 'seeds' | 'trees'>('varieties');
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState<string>('Alle');
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [syncingStarter, setSyncingStarter] = useState(false);

  // Quick relaxed bed entry state
  const [quickBedAreaId, setQuickBedAreaId] = useState('');
  const [quickBedCustomArea, setQuickBedCustomArea] = useState('');
  const [quickBedPlantId, setQuickBedPlantId] = useState('');
  const [quickBedCustomPlant, setQuickBedCustomPlant] = useState('');
  const [quickBedStatus, setQuickBedStatus] = useState<PlantingPayload['status']>('Gepflanzt');
  const [quickBedYear, setQuickBedYear] = useState<number>(() => new Date().getFullYear());
  const [savingQuickBed, setSavingQuickBed] = useState(false);

  // Plant Modal
  const [plantModal, setPlantModal] = useState(false);
  const [editingPlant, setEditingPlant] = useState<HomesteadRecord<PlantPayload> | null>(null);
  const [plantForm, setPlantForm] = useState<PlantPayload>(EMPTY_PLANT);

  // Planting Modal
  const [plantingModal, setPlantingModal] = useState(false);
  const [editingPlanting, setEditingPlanting] = useState<HomesteadRecord<PlantingPayload> | null>(null);
  const [plantingForm, setPlantingForm] = useState<PlantingPayload>({
    areaId: '',
    areaName: '',
    plantId: '',
    plantName: '',
    variety: '',
    year: new Date().getFullYear(),
    seasonPhase: 'Aussaat',
    preCultureMonth: 'März',
    sowingMonth: 'April',
    plantingMonth: 'Mai',
    harvestMonth: 'Juli – September',
    preCrop: '',
    nextCrop: '',
    companionPlants: '',
    nutrientNeed: 'Mittelzehrer',
    successionPlan: '',
    status: 'Geplant',
    notes: '',
  });

  // Seed Modal
  const [seedModal, setSeedModal] = useState(false);
  const [editingSeed, setEditingSeed] = useState<HomesteadRecord<SeedPayload> | null>(null);
  const [seedForm, setSeedForm] = useState<SeedPayload>({
    variety: '',
    species: 'Tomaten',
    manufacturer: '',
    source: '',
    purchaseDate: new Date().toISOString().slice(0, 10),
    quantity: 30,
    unit: 'Korn',
    storageLocation: 'Saatgutkiste',
    bestBefore: `${new Date().getFullYear() + 2}-12-31`,
    germinationRate: 85,
    lastGermTest: new Date().toISOString().slice(0, 10),
    selfHarvested: false,
    harvestYear: new Date().getFullYear(),
    motherPlantNotes: '',
    dryingNotes: '',
    reorderNeeded: false,
  });

  const activePlants = useMemo(() => plants.filter((p) => !p.archived), [plants]);
  const activePlantings = useMemo(() => plantings.filter((p) => !p.archived), [plantings]);
  const activeSeeds = useMemo(() => seeds.filter((s) => !s.archived), [seeds]);
  const activeAreas = useMemo(() => areas.filter((a) => !a.archived), [areas]);

  const missingStarterCount = useMemo(() => {
    const existingKeys = new Set(
      activePlants.map((p) => `${p.payload.species.toLowerCase()}::${p.payload.variety.toLowerCase()}`)
    );
    const existingTitles = new Set(activePlants.map((p) => p.title.toLowerCase()));
    return buildStarterPlants().filter((sp) => {
      const key = `${sp.payload.species.toLowerCase()}::${sp.payload.variety.toLowerCase()}`;
      return !existingKeys.has(key) && !existingTitles.has(sp.title.toLowerCase());
    }).length;
  }, [activePlants]);

  const handleSyncStarterPlants = async () => {
    setSyncingStarter(true);
    try {
      const res = await seedReferenceDatabases();
      if (res.added > 0) {
        pushToast('success', `${res.added} neue Obst-, Gemüse- & Fachwissen-Einträge geladen.`);
      } else {
        pushToast('info', 'Alle Sorten aus dem Starter-Katalog sind bereits vorhanden.');
      }
    } catch {
      pushToast('error', 'Nachladen fehlgeschlagen.');
    } finally {
      setSyncingStarter(false);
    }
  };

  const [treeGroupFilter, setTreeGroupFilter] = useState<'Alle' | 'Obst & Beeren' | 'Nüsse' | 'Gehölze'>('Alle');

  const isTreeOrShrubRecord = (p: HomesteadRecord<PlantPayload>) =>
    Boolean(p.payload.isTree) ||
    p.payload.group === 'Obst & Beeren' ||
    p.payload.group === 'Nüsse' ||
    p.payload.group === 'Gehölze';

  const treeCount = useMemo(() => activePlants.filter(isTreeOrShrubRecord).length, [activePlants]);

  const filteredPlants = useMemo(() => {
    return activePlants.filter((p) => {
      if (tab === 'trees') {
        if (!isTreeOrShrubRecord(p)) return false;
        if (treeGroupFilter !== 'Alle' && p.payload.group !== treeGroupFilter) return false;
      } else {
        if (groupFilter !== 'Alle' && p.payload.group !== groupFilter) return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const fb = getTreeIdentificationFallback(p.payload.species, p.title);
        const leaf = (p.payload.leafShape || fb?.leafShape || '').toLowerCase();
        const bark = (p.payload.barkAndBuds || fb?.barkAndBuds || '').toLowerCase();
        const traits = (p.payload.identificationTraits || fb?.identificationTraits || '').toLowerCase();
        const uses = (p.payload.practicalUses || fb?.practicalUses || p.payload.usage || '').toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.payload.species.toLowerCase().includes(q) ||
          p.payload.variety.toLowerCase().includes(q) ||
          p.payload.description.toLowerCase().includes(q) ||
          leaf.includes(q) ||
          bark.includes(q) ||
          traits.includes(q) ||
          uses.includes(q)
        );
      }
      return true;
    });
  }, [activePlants, tab, groupFilter, treeGroupFilter, search]);

  const compareList = useMemo(
    () => activePlants.filter((p) => compareIds.includes(p.id)),
    [activePlants, compareIds]
  );

  const toggleCompare = (id: string) => {
    setCompareIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  const openNewPlant = (asTree = false) => {
    setEditingPlant(null);
    setPlantForm({
      ...EMPTY_PLANT,
      isTree: asTree,
      group: asTree ? 'Obst & Beeren' : 'Fruchtgemüse',
      species: asTree ? 'Äpfel' : 'Tomaten',
    });
    setPlantModal(true);
  };

  const openEditPlant = (rec: HomesteadRecord<PlantPayload>) => {
    setEditingPlant(rec);
    const fb = getTreeIdentificationFallback(rec.payload.species, rec.title);
    setPlantForm({
      ...EMPTY_PLANT,
      ...rec.payload,
      leafShape: rec.payload.leafShape || fb?.leafShape || '',
      barkAndBuds: rec.payload.barkAndBuds || fb?.barkAndBuds || '',
      identificationTraits: rec.payload.identificationTraits || fb?.identificationTraits || '',
      practicalUses: rec.payload.practicalUses || fb?.practicalUses || '',
    });
    setPlantModal(true);
  };

  const savePlant = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = `${plantForm.species} · ${plantForm.variety || 'Standardsorte'}`;
    if (editingPlant) {
      await updateRecord('plants', editingPlant.id, title, plantForm, editingPlant.updatedAtMs);
      pushToast('success', `Sorte „${title}“ aktualisiert.`);
    } else {
      await createRecord('plants', title, plantForm);
      pushToast('success', `Sorte „${title}“ gespeichert.`);
    }
    setPlantModal(false);
  };

  const savePlanting = async (e: React.FormEvent) => {
    e.preventDefault();
    const selectedArea = activeAreas.find((a) => a.id === plantingForm.areaId);
    const areaName = selectedArea?.title || plantingForm.areaName || 'Beet';
    const payload: PlantingPayload = { ...plantingForm, areaName };
    const title = `${payload.variety || payload.plantName} · ${areaName}`;
    if (editingPlanting) {
      await updateRecord('plantings', editingPlanting.id, title, payload, editingPlanting.updatedAtMs);
      pushToast('success', 'Anbauplanung aktualisiert.');
    } else {
      await createRecord('plantings', title, payload);
      pushToast('success', 'Anbauplanung hinzugefügt.');
    }
    setPlantingModal(false);
  };

  const saveSeed = async (e: React.FormEvent) => {
    e.preventDefault();
    const title = `${seedForm.species} ${seedForm.variety}${seedForm.selfHarvested ? ' (Eigengewinnung)' : ''}`;
    if (editingSeed) {
      await updateRecord('seeds', editingSeed.id, title, seedForm, editingSeed.updatedAtMs);
      pushToast('success', 'Saatgut aktualisiert.');
    } else {
      await createRecord('seeds', title, seedForm);
      pushToast('success', 'Saatgut eingetragen.');
    }
    setSeedModal(false);
  };

  const generateAnnualCalendarPlan = async () => {
    const year = new Date().getFullYear();
    if (activePlantings.length === 0) {
      pushToast('warning', 'Bitte zuerst mindestens eine Kultur in der Beetplanung anlegen.');
      return;
    }
    const monthToNumber: Record<string, string> = {
      Januar: '01', Februar: '02', März: '03', April: '04', Mai: '05', Juni: '06',
      Juli: '07', August: '08', September: '09', Oktober: '10', November: '11', Dezember: '12',
    };
    let created = 0;
    for (const pl of activePlantings) {
      const m = monthToNumber[pl.payload.sowingMonth] || '04';
      const title = `Aussaat: ${pl.payload.plantName} (${pl.payload.variety})`;
      await createRecord('calendarEvents', title, {
        eventType: 'task',
        description: `Beet: ${pl.payload.areaName} · Mischkultur: ${pl.payload.companionPlants || '—'}`,
        date: `${year}-${m}-10`,
        startTime: '09:00',
        endTime: '10:00',
        category: 'Aussaat',
        assignee: activeIdentity || 'Gemeinsam',
        recurrence: 'none',
        reminderMinutes: 60,
        areaName: pl.payload.areaName,
        completed: false,
        notes: pl.payload.notes || 'Automatisch aus Anbauplanung erzeugt.',
      });
      created++;
    }
    pushToast('success', `${created} Aussaat-Aufgabe(n) für ${year} in den Kalender übernommen.`);
  };

  const seedMatchesForPlantings = useMemo(() => {
    return activePlantings.map((pl) => {
      const match = activeSeeds.find(
        (s) =>
          s.payload.variety.toLowerCase() === pl.payload.variety.toLowerCase() &&
          s.payload.species.toLowerCase() === pl.payload.plantName.toLowerCase()
      );
      return {
        planting: pl,
        seed: match || null,
      };
    });
  }, [activePlantings, activeSeeds]);

  const handleQuickBedSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const chosenArea = activeAreas.find((a) => a.id === quickBedAreaId);
    const areaName = chosenArea?.title || quickBedCustomArea.trim() || 'Gartenbeet';
    const chosenPlant = activePlants.find((p) => p.id === quickBedPlantId);
    const plantName = chosenPlant?.payload.species || quickBedCustomPlant.trim();
    if (!plantName) {
      pushToast('warning', 'Bitte kurz auswählen oder eintippen, was auf dem Beet steht.');
      return;
    }
    const variety = chosenPlant?.payload.variety || '';
    const monthNow = new Date().toLocaleDateString('de-DE', { month: 'long' });
    setSavingQuickBed(true);
    try {
      const title = `${variety ? `${plantName} (${variety})` : plantName} · ${areaName}`;
      await createRecord('plantings', title, {
        areaId: chosenArea?.id || '',
        areaName,
        plantId: chosenPlant?.id || '',
        plantName,
        variety,
        year: quickBedYear,
        seasonPhase: quickBedStatus === 'Ausgesät' ? 'Aussaat' : 'Pflanzung',
        preCultureMonth: chosenPlant?.payload.preCultureWindow || '',
        sowingMonth: chosenPlant?.payload.sowingWindow || monthNow,
        plantingMonth: chosenPlant?.payload.plantingWindow || monthNow,
        harvestMonth: chosenPlant?.payload.harvestWindow || '',
        preCrop: '',
        nextCrop: '',
        companionPlants: chosenPlant?.payload.goodNeighbors || '',
        nutrientNeed: chosenPlant?.payload.nutrientNeed || 'Mittelzehrer',
        successionPlan: '',
        status: quickBedStatus,
        notes: 'Locker als aktuelle Beetbelegung erfasst.',
      });
      setQuickBedPlantId('');
      setQuickBedCustomPlant('');
      pushToast('success', `„${plantName}“ auf „${areaName}“ eingetragen.`);
    } finally {
      setSavingQuickBed(false);
    }
  };

  const handleReserveNextYearCrop = async (
    source: HomesteadRecord<PlantingPayload>,
    option: { plantName: string; variety: string; nutrientNeed: string }
  ) => {
    const nextYear = source.payload.year + 1;
    const areaName = source.payload.areaName || 'Beet';
    const preCropLabel = `${source.payload.plantName}${source.payload.variety ? ` (${source.payload.variety})` : ''}`;
    const title = `${option.plantName} (${option.variety}) · ${areaName}`;
    await createRecord('plantings', title, {
      areaId: source.payload.areaId || '',
      areaName,
      plantId: '',
      plantName: option.plantName,
      variety: option.variety,
      year: nextYear,
      seasonPhase: 'Aussaat',
      preCultureMonth: '',
      sowingMonth: '',
      plantingMonth: '',
      harvestMonth: '',
      preCrop: preCropLabel,
      nextCrop: '',
      companionPlants: '',
      nutrientNeed: option.nutrientNeed,
      successionPlan: `Automatische Pflanzfolge nach ${source.payload.plantName}`,
      status: 'Geplant',
      notes: `Aus Pflanzfolge-Generator für ${nextYear} vorgemerkt.`,
    });
    if (!source.payload.nextCrop) {
      await updateRecord(
        'plantings',
        source.id,
        source.title,
        { ...source.payload, nextCrop: `${option.plantName} (${option.variety})` },
        source.updatedAtMs
      );
    }
    pushToast('success', `„${option.plantName}“ für ${nextYear} auf „${areaName}“ vorgemerkt.`);
  };

  const plantPagination = usePagination(filteredPlants, 6);
  const phasePagination = usePagination(PHENOLOGICAL_PHASES, 3);
  const plantingPagination = usePagination(activePlantings, 6);
  const seedPagination = usePagination(activeSeeds, 6);
  const currentMonthGuide = MONTHLY_GARDEN_CALENDAR[new Date().getMonth()] || MONTHLY_GARDEN_CALENDAR[0];

  const isFrostSensitiveCrop = (name: string): boolean =>
    /tomate|paprika|chili|gurke|zucchini|kürbis|bohne|basilikum|mais|melone|aubergine|physalis/i.test(name);

  const currentStandingPlantings = useMemo(
    () => activePlantings.filter((p) => p.payload.status !== 'Abgeerntet'),
    [activePlantings]
  );

  const groupedActiveBeds = useMemo(() => {
    const map = new Map<string, HomesteadRecord<PlantingPayload>[]>();
    for (const pl of currentStandingPlantings) {
      const key = pl.payload.areaName || 'Gartenbeet';
      const list = map.get(key) || [];
      list.push(pl);
      map.set(key, list);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [currentStandingPlantings]);

  const scheduleFrostAndPreCultureTasks = async () => {
    if (currentStandingPlantings.length === 0) {
      pushToast('warning', 'Trage zuerst unter „Beete“ ein, was bei euch wächst.');
      return;
    }
    const year = new Date().getFullYear();
    let count = 0;
    for (const pl of currentStandingPlantings) {
      const frostSensitive = isFrostSensitiveCrop(pl.payload.plantName);
      if (frostSensitive) {
        await createRecord('calendarEvents', `Vorziehen: ${pl.payload.plantName} (${pl.payload.areaName || 'Beet'})`, {
          eventType: 'task',
          description: `Fensterbank / Anzuchtplatte vorbereiten für ${pl.payload.plantName}${pl.payload.variety ? ` (${pl.payload.variety})` : ''}.`,
          date: `${year}-03-20`,
          startTime: '09:00',
          endTime: '09:30',
          category: 'Aussaat',
          assignee: activeIdentity || 'Gemeinsam',
          recurrence: 'none',
          reminderMinutes: 60,
          areaName: pl.payload.areaName,
          completed: false,
          notes: 'Automatisch aus Vorzucht-/Eisheiligen-Checkliste Schwarzatal.',
        });
        await createRecord('calendarEvents', `Auspflanzen (nach Eisheiligen): ${pl.payload.plantName}`, {
          eventType: 'task',
          description: `In Schwarzatal (~500 m) erst nach Spätfrost-Gefahr ins Beet „${pl.payload.areaName || 'Garten'}“ setzen.`,
          date: `${year}-05-20`,
          startTime: '10:00',
          endTime: '11:00',
          category: 'Pflanzung',
          assignee: activeIdentity || 'Gemeinsam',
          recurrence: 'none',
          reminderMinutes: 120,
          areaName: pl.payload.areaName,
          completed: false,
          notes: 'Eisheiligen-Schutztermin (Schwarzatal).',
        });
        count += 2;
      } else {
        await createRecord('calendarEvents', `Direktsaat / Beetstart: ${pl.payload.plantName}`, {
          eventType: 'task',
          description: `Robuste Kultur für „${pl.payload.areaName || 'Garten'}“ ab Mitte April direkt ins Beet bringen.`,
          date: `${year}-04-15`,
          startTime: '10:00',
          endTime: '10:45',
          category: 'Aussaat',
          assignee: activeIdentity || 'Gemeinsam',
          recurrence: 'none',
          reminderMinutes: 60,
          areaName: pl.payload.areaName,
          completed: false,
          notes: 'Automatisch aus Vorzucht-/Eisheiligen-Checkliste Schwarzatal.',
        });
        count += 1;
      }
    }
    pushToast('success', `${count} Vorzucht- & Eisheiligen-Termine für ${year} im Kalender angelegt.`);
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Anbau, Sorten & Saatgut"
        subtitle="Sortenbibliothek, Thüringer Saisonkalender, Fruchtfolge, Saatgutabgleich & Obstgehölze"
        actions={
          <>
            {tab === 'varieties' && compareIds.length >= 2 && (
              <button
                type="button"
                onClick={() => setShowCompareModal(true)}
                className="px-3.5 py-2 rounded-xl bg-[#597CD4] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5"
              >
                <GitCompare className="w-4 h-4" />
                Vergleichen ({compareIds.length})
              </button>
            )}
            {(tab === 'varieties' || tab === 'trees') && (
              <button
                type="button"
                onClick={() => openNewPlant(tab === 'trees')}
                className="px-3.5 py-2 rounded-xl bg-[#233A29] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                {tab === 'trees' ? 'Neuer Obstbaum / Gehölz' : 'Neue Sorte'}
              </button>
            )}
            {tab === 'beds' && (
              <button
                type="button"
                onClick={() => {
                  setEditingPlanting(null);
                  setPlantingModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-[#233A29] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Pflanzung planen
              </button>
            )}
            {tab === 'seeds' && (
              <button
                type="button"
                onClick={() => {
                  setEditingSeed(null);
                  setSeedModal(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-[#233A29] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                Saatgut erfassen
              </button>
            )}
          </>
        }
      />

      <SegmentedTabs
        activeTab={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: 'varieties', label: `Sorten (${activePlants.length})` },
          { id: 'trees', label: `Bäume & Gehölze (${treeCount})` },
          { id: 'season', label: 'Saisonkalender & Phänologie' },
          { id: 'beds', label: `Beete & Pflanzfolge (${activePlantings.length})` },
          { id: 'seeds', label: `Saatgut (${activeSeeds.length})` },
        ]}
      />

      {/* TAB 1 & 5: Varieties & Trees */}
      {(tab === 'varieties' || tab === 'trees') && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={
                  tab === 'trees'
                    ? 'Baum, Blattform, Rinde oder Nutzen (z.B. Waschmittel, gefiedert)…'
                    : 'Pflanze, Sorte oder Eigenschaft suchen…'
                }
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-sm"
              />
            </div>
            {tab === 'varieties' && (
              <select
                value={groupFilter}
                onChange={(e) => setGroupFilter(e.target.value)}
                className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-sm"
              >
                <option value="Alle">Alle Pflanzengruppen</option>
                {BOTANICAL_SPECIES_GROUPS.map((g) => (
                  <option key={g.group} value={g.group}>
                    {g.group}
                  </option>
                ))}
                <option value="Gehölze">Gehölze (Wald-, Nutz- &amp; Klettergehölze)</option>
              </select>
            )}
            {tab === 'trees' && (
              <select
                value={treeGroupFilter}
                onChange={(e) => setTreeGroupFilter(e.target.value as typeof treeGroupFilter)}
                className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-sm"
              >
                <option value="Alle">Alle Bäume &amp; Gehölze ({treeCount})</option>
                <option value="Gehölze">Wald-, Park- &amp; Nutzgehölze (Eiche, Fichte, Efeu…)</option>
                <option value="Nüsse">Nussbäume (Walnuss, Haselnuss, Esskastanie)</option>
                <option value="Obst & Beeren">Obstbäume &amp; Beerensträucher</option>
              </select>
            )}
          </div>

          {missingStarterCount > 0 && (
            <div className="bg-gradient-to-r from-[#BBE774]/25 via-[#FFC814]/15 to-[#597CD4]/15 dark:from-[#BBE774]/12 dark:via-[#FFC814]/10 dark:to-[#597CD4]/10 border border-[#65A30D]/35 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="text-xs space-y-0.5">
                <div className="font-semibold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#3B6912] dark:text-[#BBE774]" />
                  {missingStarterCount} weitere Baum-, Gehölz-, Obst-, Gemüse- &amp; Pilzeinträge verfügbar
                </div>
                <p className="text-neutral-600 dark:text-neutral-300">
                  Inklusive heimischer Bäume mit Blattform &amp; Rinden-Erkennung (Eiche, Buche, Birke, Fichte, Tanne, Rosskastanie, Efeu), Obst &amp; Mischkultur-Tipps.
                </p>
              </div>
              <button
                type="button"
                onClick={handleSyncStarterPlants}
                disabled={syncingStarter}
                className="px-3.5 py-2 rounded-xl bg-[#233A29] text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 hover:opacity-90 disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${syncingStarter ? 'animate-spin' : ''}`} />
                {syncingStarter ? 'Lade Sorten…' : 'Sorten & Tipps nachladen'}
              </button>
            </div>
          )}

          {filteredPlants.length === 0 ? (
            <EmptyState
              title={tab === 'trees' ? 'Noch keine Obstbäume oder Gehölze' : 'Keine Sorten gefunden'}
              description="Erfasse Sorten mit Aussaatfenstern, guten Nachbarn, Pflegetipps und eigenen Gartenerfahrungen."
              actionLabel={tab === 'trees' ? 'Ersten Baum erfassen' : 'Erste Sorte erfassen'}
              onAction={() => openNewPlant(tab === 'trees')}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {plantPagination.pageItems.map((p) => {
                  const isSelected = compareIds.includes(p.id);
                  const accentColor = getGroupColor(p.payload.group);
                  return (
                    <article
                      key={p.id}
                      className={`bg-white dark:bg-[#161D1A] border rounded-2xl overflow-hidden flex flex-col justify-between ${
                        isSelected ? 'border-[#597CD4] ring-1 ring-[#597CD4]/40' : 'border-neutral-200 dark:border-neutral-800'
                      }`}
                    >
                      <div className="h-1.5 w-full" style={{ backgroundColor: accentColor }} />
                      <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between gap-4">
                        <div className="space-y-2.5">
                          <div className="text-xs text-neutral-500 flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 font-medium">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: accentColor }} />
                              {p.payload.group} · {p.payload.nutrientNeed}
                            </span>
                            {p.payload.experienceRating ? (
                              <span className="inline-flex items-center gap-1 font-mono-num text-[#63390C] dark:text-[#FFC814]">
                                <Star className="w-3.5 h-3.5 fill-current" />
                                {p.payload.experienceRating}/5
                              </span>
                            ) : null}
                          </div>
                          <h3 className="font-display text-lg font-semibold flex items-center gap-2">
                            {p.payload.isTree && <Trees className="w-4 h-4 shrink-0" style={{ color: accentColor }} />}
                            <span className="truncate">{p.title}</span>
                          </h3>
                          <p className="text-xs text-neutral-600 dark:text-neutral-400 line-clamp-2">
                            {p.payload.description || 'Keine Beschreibung hinterlegt.'}
                          </p>
                          <dl className="grid grid-cols-2 gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                            <div>
                              <dt className="text-neutral-500">{p.payload.isTree ? 'Blüte / Unterlage' : 'Aussaat / Vorzucht'}</dt>
                              <dd className="font-medium truncate">
                                {p.payload.isTree
                                  ? `${p.payload.bloomWindow || '—'} · ${p.payload.rootstock || '—'}`
                                  : p.payload.sowingWindow || p.payload.preCultureWindow || '—'}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-neutral-500">Ernte / Reife</dt>
                              <dd className="font-medium truncate">{p.payload.harvestWindow || '—'}</dd>
                            </div>
                            <div>
                              <dt className="text-neutral-500">Abstand</dt>
                              <dd className="font-medium truncate">
                                {p.payload.plantSpacingCm || '—'} × {p.payload.rowSpacingCm || '—'}
                              </dd>
                            </div>
                            <div>
                              <dt className="text-neutral-500">Geschmack</dt>
                              <dd className="font-medium truncate">{p.payload.taste || p.payload.sourceRef || '—'}</dd>
                            </div>
                          </dl>

                          {(() => {
                            const fb = getTreeIdentificationFallback(p.payload.species, p.title);
                            const leafShape = p.payload.leafShape || fb?.leafShape;
                            const barkAndBuds = p.payload.barkAndBuds || fb?.barkAndBuds;
                            const idTraits = p.payload.identificationTraits || fb?.identificationTraits;
                            const practicalUses = p.payload.practicalUses || fb?.practicalUses;
                            const showTreeDetails =
                              (tab === 'trees' || isTreeOrShrubRecord(p)) &&
                              Boolean(leafShape || barkAndBuds || idTraits || practicalUses);

                            return (
                              <>
                                {showTreeDetails && (
                                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-1.5 text-[11px] bg-[#233A29]/[0.04] dark:bg-[#BBE774]/[0.06] rounded-xl p-2.5">
                                    <div className="font-semibold text-[#233A29] dark:text-[#BBE774]">
                                      Erkennungsmerkmale &amp; Nutzen
                                    </div>
                                    {leafShape && (
                                      <div className="text-neutral-700 dark:text-neutral-300">
                                        <strong>Blatt / Nadeln:</strong> {leafShape}
                                      </div>
                                    )}
                                    {barkAndBuds && (
                                      <div className="text-neutral-700 dark:text-neutral-300">
                                        <strong>Rinde &amp; Knospen:</strong> {barkAndBuds}
                                      </div>
                                    )}
                                    {idTraits && (
                                      <div className="text-neutral-700 dark:text-neutral-300">
                                        <strong>Frucht / Verwechslung:</strong> {idTraits}
                                      </div>
                                    )}
                                    {practicalUses && (
                                      <div className="text-[#3B6912] dark:text-[#BBE774]">
                                        <strong>Alltags- &amp; Heilnutzen:</strong> {practicalUses}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {(p.payload.goodNeighbors || p.payload.badNeighbors || p.payload.careTip) && (
                                  <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 space-y-1 text-[11px]">
                                    {p.payload.goodNeighbors && (
                                      <div className="text-[#233A29] dark:text-[#BBE774]">
                                        <strong>Gute Nachbarn:</strong> {p.payload.goodNeighbors}
                                      </div>
                                    )}
                                    {p.payload.badNeighbors && (
                                      <div className="text-[#CF6432]">
                                        <strong>Lieber trennen von:</strong> {p.payload.badNeighbors}
                                      </div>
                                    )}
                                    {p.payload.careTip && (
                                      <div className="text-neutral-600 dark:text-neutral-300 bg-[#F7F7F5] dark:bg-[#0F1412] rounded-lg px-2.5 py-1.5">
                                        <strong>Tipp:</strong> {p.payload.careTip}
                                      </div>
                                    )}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                          <button
                            type="button"
                            onClick={() => toggleCompare(p.id)}
                            className={`min-h-[36px] px-2.5 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 ${
                              isSelected
                                ? 'bg-[#597CD4] text-white'
                                : 'border border-neutral-200 dark:border-neutral-700'
                            }`}
                          >
                            <GitCompare className="w-3.5 h-3.5" />
                            {isSelected ? 'Im Vergleich' : 'Vergleich'}
                          </button>
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => openEditPlant(p)}
                              className="min-h-[36px] px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-medium inline-flex items-center gap-1"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              Profil
                            </button>
                            <button
                              type="button"
                              onClick={() => archiveRecord('plants', p.id, p.title)}
                              className="min-h-[36px] min-w-[36px] flex items-center justify-center rounded-lg text-[#CF6432] hover:bg-[#CF6432]/10"
                              aria-label="Archivieren"
                            >
                              <Archive className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
              <PaginationControls
                page={plantPagination.page}
                totalPages={plantPagination.totalPages}
                totalItems={plantPagination.totalItems}
                onPageChange={plantPagination.setPage}
                itemLabel="Sorten"
              />
            </>
          )}

          {/* Reference Taxonomy Overview */}
          <details className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5">
            <summary className="font-display text-sm font-semibold cursor-pointer">
              Vollständige Arten-Systematik (Gemüse, Obst, Beeren & Kräuter) anzeigen
            </summary>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-xs">
              {BOTANICAL_SPECIES_GROUPS.map((g) => (
                <div key={g.group} className="space-y-1">
                  <div className="font-semibold text-neutral-900 dark:text-neutral-100">{g.group}</div>
                  <div className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {g.species.join(', ')}
                  </div>
                </div>
              ))}
            </div>
          </details>
        </div>
      )}

      {/* TAB 2: Saisonkalender & Phänologie */}
      {tab === 'season' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
            <div className="h-1.5 w-full" style={{ backgroundColor: currentMonthGuide.seasonColor }} />
            <div className="p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="font-display text-lg font-semibold">
                    Aktuell im {currentMonthGuide.monthName}: {currentMonthGuide.seasonLabel}
                  </h2>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                    Orientiert an der Phänologischen Uhr (DWD) & angepasst an Spätfröste in Mellenbach-Glasbach (~500 m ü. NN).
                  </p>
                </div>
                <button
                  type="button"
                  onClick={generateAnnualCalendarPlan}
                  className="px-4 py-2 rounded-xl bg-[#233A29] text-white text-xs font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0"
                >
                  <CalendarPlus className="w-4 h-4" />
                  Beete in Kalender übernehmen
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#BBE774]/20 dark:bg-[#BBE774]/10 border border-[#65A30D]/30">
                  <div className="font-semibold text-[#233A29] dark:text-[#BBE774] mb-1">Jetzt säen & pflanzen</div>
                  <div className="text-neutral-700 dark:text-neutral-300">{currentMonthGuide.sowingAndPlanting.join(' · ')}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#FFC814]/20 dark:bg-[#FFC814]/10 border border-[#D97706]/30">
                  <div className="font-semibold text-[#7A4400] dark:text-[#FFD65A] mb-1">Jetzt ernten</div>
                  <div className="text-neutral-700 dark:text-neutral-300">{currentMonthGuide.harvest.join(' · ')}</div>
                </div>
                <div className="p-3 rounded-xl bg-[#CF6432]/12 dark:bg-[#CF6432]/15 border border-[#CF6432]/30">
                  <div className="font-semibold text-[#8A3614] dark:text-[#F4A07B] mb-1">Pflege & Vorzucht</div>
                  <div className="text-neutral-700 dark:text-neutral-300">{currentMonthGuide.care.join(' · ')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Vorzieh- & Eisheiligen-Checkliste (Schwarzatal ~500m) */}
          <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="font-display text-base font-bold flex items-center gap-2">
                  <Snowflake className="w-4 h-4 text-[#597CD4]" />
                  Vorzucht- &amp; Eisheiligen-Checkliste (Schwarzatal ~500 m)
                </h3>
                <p className="text-xs text-neutral-600 dark:text-neutral-400">
                  Automatisch geprüft für eure aktuell eingetragenen Kulturen ({currentStandingPlantings.length}): Spätfröste sind im Schiefergebirge bis ca. 20. Mai möglich.
                </p>
              </div>
              <button
                type="button"
                onClick={scheduleFrostAndPreCultureTasks}
                className="px-3.5 py-2 rounded-xl bg-[#597CD4] text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 hover:opacity-90"
              >
                <CalendarPlus className="w-4 h-4" />
                Vorzucht &amp; Eisheiligen in Kalender
              </button>
            </div>

            {currentStandingPlantings.length === 0 ? (
              <p className="text-xs text-neutral-500">
                Tragt unter „Beete &amp; Pflanzfolge“ ein, was ihr anbaut — dann teilt diese Checkliste eure Kulturen automatisch in Vorzucht (ab 20. Mai raus) und Direktsaat ein.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-xl bg-[#597CD4]/10 border border-[#597CD4]/30 space-y-1.5">
                  <div className="font-semibold text-[#1E3A8A] dark:text-[#93C5FD] flex items-center gap-1.5">
                    <ThermometerSun className="w-4 h-4" />
                    Wärmeliebend · Vorziehen &amp; erst nach Eisheiligen (~20. Mai) raus
                  </div>
                  {currentStandingPlantings.filter((p) => isFrostSensitiveCrop(p.payload.plantName)).length === 0 ? (
                    <p className="text-neutral-500">Aktuell keine frostempfindlichen Kulturen eingetragen.</p>
                  ) : (
                    <ul className="space-y-1 text-neutral-700 dark:text-neutral-300">
                      {currentStandingPlantings
                        .filter((p) => isFrostSensitiveCrop(p.payload.plantName))
                        .map((p) => (
                          <li key={`frost-${p.id}`}>
                            • <strong>{p.payload.plantName}</strong> ({p.payload.areaName || 'Beet'}) — bei Frost unter +2 °C schützen
                          </li>
                        ))}
                    </ul>
                  )}
                </div>

                <div className="p-3.5 rounded-xl bg-[#BBE774]/18 border border-[#65A30D]/30 space-y-1.5">
                  <div className="font-semibold text-[#233A29] dark:text-[#BBE774] flex items-center gap-1.5">
                    <Sprout className="w-4 h-4" />
                    Robust / Frosthart · Ab April direkt ins Beet
                  </div>
                  {currentStandingPlantings.filter((p) => !isFrostSensitiveCrop(p.payload.plantName)).length === 0 ? (
                    <p className="text-neutral-500">Aktuell keine robusten Direktsaat-Kulturen eingetragen.</p>
                  ) : (
                    <ul className="space-y-1 text-neutral-700 dark:text-neutral-300">
                      {currentStandingPlantings
                        .filter((p) => !isFrostSensitiveCrop(p.payload.plantName))
                        .map((p) => (
                          <li key={`hardy-${p.id}`}>
                            • <strong>{p.payload.plantName}</strong> ({p.payload.areaName || 'Beet'}) — verträgt leichte Schiefergebirgs-Fröste
                          </li>
                        ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {phasePagination.pageItems.map((ph) => (
              <div
                key={ph.id}
                className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden flex flex-col"
              >
                <div className="h-1.5 w-full bg-[#65A30D]" />
                <div className="p-4 space-y-2">
                  <div className="text-xs text-neutral-500">{ph.typicalMonths}</div>
                  <h3 className="font-display text-base font-bold">{ph.phase}</h3>
                  <div className="text-xs font-medium text-[#3B6912] dark:text-[#BBE774]">
                    Natur-Zeiger (DWD): {ph.indicatorPlant}
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-snug">
                    Dieses Entwicklungsstadium in der Natur (z. B. Blüte, Fruchtreife oder Laubfall) markiert biologisch den Beginn dieser Jahreszeit vor Ort.
                  </p>
                  <p className="text-xs text-neutral-600 dark:text-neutral-400">{ph.thuringiaTimingNote}</p>
                  <ul className="text-xs space-y-1 pt-2 border-t border-neutral-100 dark:border-neutral-800 list-disc list-inside text-neutral-700 dark:text-neutral-300">
                    {ph.gardenTasks.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
          <PaginationControls
            page={phasePagination.page}
            totalPages={phasePagination.totalPages}
            totalItems={phasePagination.totalItems}
            onPageChange={phasePagination.setPage}
            itemLabel="Phasen"
          />
        </div>
      )}

      {/* TAB 3: Aktuelle Beete & Automatische Pflanzfolge */}
      {tab === 'beds' && (
        <div className="space-y-6">
          {/* Relaxed Quick-Entry: What's on the beds right now? */}
          <section className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
            <div className="h-1.5 w-full bg-gradient-to-r from-[#BBE774] via-[#FFC814] to-[#597CD4]" />
            <form onSubmit={handleQuickBedSubmit} className="p-4 sm:p-5 space-y-3">
              <div>
                <h2 className="font-display text-base font-semibold flex items-center gap-2">
                  <Sprout className="w-4 h-4 text-[#3B6912] dark:text-[#BBE774]" />
                  Was steht aktuell auf unseren Beeten?
                </h2>
                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                  Ganz unkompliziert eintragen, was ihr gerade eingepflanzt oder gesät habt — daraus wird automatisch eine lockere Pflanzfolge für die nächsten Jahre vorgeschlagen.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium mb-1">Beet / Ecke</label>
                  <select
                    value={quickBedAreaId}
                    onChange={(e) => setQuickBedAreaId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-xs"
                  >
                    <option value="">Freien Namen eingeben…</option>
                    {activeAreas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.title}
                      </option>
                    ))}
                  </select>
                  {!quickBedAreaId && (
                    <input
                      type="text"
                      value={quickBedCustomArea}
                      onChange={(e) => setQuickBedCustomArea(e.target.value)}
                      placeholder="z.B. Hochbeet vorne, Tomatendach"
                      className="mt-1.5 w-full px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-xs"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Pflanze / Sorte</label>
                  <select
                    value={quickBedPlantId}
                    onChange={(e) => setQuickBedPlantId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-xs"
                  >
                    <option value="">Frei eintippen oder wählen…</option>
                    {activePlants.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.payload.species} · {p.payload.variety}
                      </option>
                    ))}
                  </select>
                  {!quickBedPlantId && (
                    <input
                      type="text"
                      value={quickBedCustomPlant}
                      onChange={(e) => setQuickBedCustomPlant(e.target.value)}
                      placeholder="z.B. Tomaten, Erdbeeren, Salat"
                      className="mt-1.5 w-full px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-xs"
                    />
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Status</label>
                  <select
                    value={quickBedStatus}
                    onChange={(e) => setQuickBedStatus(e.target.value as PlantingPayload['status'])}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-xs"
                  >
                    <option value="Gepflanzt">Gepflanzt (steht drin)</option>
                    <option value="Ausgesät">Ausgesät</option>
                    <option value="Erntereif">Erntereif</option>
                    <option value="Geplant">Geplant</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium mb-1">Jahr</label>
                  <input
                    type="number"
                    value={quickBedYear}
                    onChange={(e) => setQuickBedYear(Number(e.target.value) || new Date().getFullYear())}
                    className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-xs font-mono-num"
                  />
                </div>

                <button
                  type="submit"
                  disabled={savingQuickBed}
                  className="px-4 py-2 rounded-xl bg-[#233A29] text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 min-h-[38px] hover:opacity-90 disabled:opacity-60"
                >
                  <Plus className="w-4 h-4" />
                  {savingQuickBed ? 'Speichere…' : 'Auf Beet eintragen'}
                </button>
              </div>
            </form>
          </section>

          {/* Schnelle Bestands-Tafel: Was steht aktuell auf unseren Beeten? */}
          {groupedActiveBeds.length > 0 && (
            <section className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-base font-semibold flex items-center gap-2">
                    <Sprout className="w-4 h-4 text-[#3B6912] dark:text-[#BBE774]" />
                    Aktueller Beet-Bestand ({currentStandingPlantings.length} aktive Kulturen)
                  </h2>
                  <p className="text-xs text-neutral-500 dark:text-neutral-400">
                    Schnell einsehen, was wo wächst — genau diese Kulturen nutzt der Hof-Assistent für seine Tipps.
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {groupedActiveBeds.map(([areaName, list]) => (
                  <div
                    key={`bed-board-${areaName}`}
                    className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-2.5"
                  >
                    <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                      <h3 className="font-display text-sm font-bold text-neutral-900 dark:text-neutral-100">
                        {areaName}
                      </h3>
                      <span className="text-[11px] font-mono-num text-neutral-500">
                        {list.length} {list.length === 1 ? 'Kultur' : 'Kulturen'}
                      </span>
                    </div>
                    <div className="space-y-1.5">
                      {list.map((pl) => (
                        <div
                          key={`chip-${pl.id}`}
                          className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412] text-xs"
                        >
                          <div className="min-w-0">
                            <span className="font-semibold truncate block">
                              {pl.payload.plantName}
                              {pl.payload.variety ? ` · ${pl.payload.variety}` : ''}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              const nextStatus: PlantingPayload['status'] =
                                pl.payload.status === 'Gepflanzt' || pl.payload.status === 'Ausgesät'
                                  ? 'Erntereif'
                                  : pl.payload.status === 'Erntereif'
                                  ? 'Abgeerntet'
                                  : 'Gepflanzt';
                              await updateRecord(
                                'plantings',
                                pl.id,
                                pl.title,
                                { ...pl.payload, status: nextStatus },
                                pl.updatedAtMs
                              );
                              pushToast('info', `${pl.payload.plantName}: Status → ${nextStatus}`);
                            }}
                            title="Klicken zum Status wechseln"
                            className={`px-2 py-0.5 rounded font-medium text-[11px] shrink-0 transition ${
                              pl.payload.status === 'Erntereif'
                                ? 'bg-[#FFC814]/30 text-[#7A4400] dark:text-[#FFD65A]'
                                : 'bg-[#BBE774]/25 text-[#233A29] dark:text-[#BBE774]'
                            }`}
                          >
                            {pl.payload.status}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {activePlantings.length === 0 ? (
            <EmptyState
              title="Noch keine Beetbelegung eingetragen"
              description="Tragt oben einfach ein, was aktuell bei euch auf einem Beet steht — danach erscheint hier automatisch eure passende Pflanzfolge."
              actionLabel="Detail-Pflanzung öffnen"
              onAction={() => setPlantingModal(true)}
            />
          ) : (
            <>
              {/* Automatic Crop Rotation Generator */}
              <section className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <h2 className="font-display text-base font-semibold flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-[#D97706]" />
                      Automatischer Pflanzfolge-Generator
                    </h2>
                    <p className="text-xs text-neutral-500 dark:text-neutral-400">
                      Direkt aus euren eingetragenen Beeten berechnet — ohne Druck, einfach als Orientierung für nächstes & übernächstes Jahr.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {plantingPagination.pageItems.map((pl) => {
                    const rotation = suggestCropRotation(pl.payload.plantName, pl.payload.nutrientNeed);
                    return (
                      <div
                        key={`rot-${pl.id}`}
                        className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden flex flex-col"
                      >
                        <div className="h-1.5 w-full bg-[#16A34A]" />
                        <div className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="text-xs text-neutral-500">
                                {pl.payload.areaName || 'Beet'} · {rotation.detectedCategory}
                              </div>
                              <h3 className="font-display text-base font-semibold">
                                {pl.payload.year}: {pl.payload.plantName}
                                {pl.payload.variety ? ` (${pl.payload.variety})` : ''}
                              </h3>
                            </div>
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-[#BBE774]/25 text-[#233A29] dark:text-[#BBE774]">
                              {pl.payload.status}
                            </span>
                          </div>

                          <div className="p-3 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412] space-y-2 text-xs">
                            <div className="font-semibold text-[#233A29] dark:text-[#BBE774] flex items-center gap-1.5">
                              <ArrowRight className="w-3.5 h-3.5 shrink-0" />
                              Vorschlag für {pl.payload.year + 1}: {rotation.year2Label}
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {rotation.year2Options.map((opt) => (
                                <button
                                  key={`${opt.plantName}-${opt.variety}`}
                                  type="button"
                                  onClick={() => handleReserveNextYearCrop(pl, opt)}
                                  className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-[#161D1A] border border-[#65A30D]/40 hover:bg-[#BBE774]/20 text-xs font-medium inline-flex items-center gap-1.5 transition"
                                  title={`Als Planung für ${pl.payload.year + 1} speichern`}
                                >
                                  <Plus className="w-3.5 h-3.5 text-[#3B6912] dark:text-[#BBE774]" />
                                  {opt.plantName} ({opt.variety}) vormerken
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                            <div className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800">
                              <div className="font-semibold text-neutral-700 dark:text-neutral-200">
                                {pl.payload.year + 2}: {rotation.year3Label}
                              </div>
                              <div className="text-neutral-500 mt-0.5">
                                z.B. {rotation.year3Options.map((o) => o.plantName).join(', ')}
                              </div>
                            </div>
                            <div className="p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800">
                              <div className="font-semibold text-neutral-700 dark:text-neutral-200">
                                {pl.payload.year + 3}: Danach
                              </div>
                              <div className="text-neutral-500 mt-0.5">{rotation.year4Label}</div>
                            </div>
                          </div>

                          <p className="text-[11px] text-neutral-600 dark:text-neutral-400 leading-relaxed">
                            <strong className="text-[#CF6432]">Hinweis:</strong> {rotation.warningNote}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Classic Bed List / Table */}
              <div className="md:hidden space-y-3">
                {plantingPagination.pageItems.map((pl) => (
                  <div
                    key={pl.id}
                    className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-2 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-semibold text-sm text-neutral-900 dark:text-neutral-100">
                          {pl.payload.plantName} {pl.payload.variety ? `· ${pl.payload.variety}` : ''}
                        </div>
                        <div className="text-neutral-500">
                          {pl.payload.areaName} · {pl.payload.status}
                        </div>
                      </div>
                      <span className="font-mono-num text-neutral-500">{pl.payload.year}</span>
                    </div>
                    <div className="font-mono-num text-neutral-700 dark:text-neutral-300">
                      {pl.payload.preCultureMonth || '—'} / {pl.payload.sowingMonth || '—'} / {pl.payload.harvestMonth || '—'}
                    </div>
                    <div className="text-neutral-600 dark:text-neutral-400">
                      Vor: {pl.payload.preCrop || '—'} · Nach: {pl.payload.nextCrop || '—'}
                      {pl.payload.companionPlants ? ` · Mischkultur: ${pl.payload.companionPlants}` : ''}
                    </div>
                    <div className="flex justify-end gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingPlanting(pl);
                          setPlantingForm(pl.payload);
                          setPlantingModal(true);
                        }}
                        className="min-h-[36px] font-medium text-[#597CD4]"
                      >
                        Bearbeiten
                      </button>
                      <button
                        type="button"
                        onClick={() => archiveRecord('plantings', pl.id, pl.title)}
                        className="min-h-[36px] font-medium text-[#CF6432]"
                      >
                        Archivieren
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="hidden md:block bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-x-auto">
                <table className="w-full text-xs sm:text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left text-xs text-neutral-500">
                      <th className="py-3 px-4">Kultur & Sorte</th>
                      <th className="py-3 px-4">Beet / Fläche</th>
                      <th className="py-3 px-4">Fenster (Vorzucht / Saat / Ernte)</th>
                      <th className="py-3 px-4">Fruchtfolge & Mischkultur</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                    {plantingPagination.pageItems.map((pl) => (
                      <tr key={pl.id}>
                        <td className="py-3 px-4">
                          <div className="font-semibold">
                            {pl.payload.plantName} {pl.payload.variety ? `· ${pl.payload.variety}` : ''}
                          </div>
                          <div className="text-xs text-neutral-500">
                            {pl.payload.nutrientNeed} · Jahr {pl.payload.year}
                          </div>
                        </td>
                        <td className="py-3 px-4 text-xs">{pl.payload.areaName}</td>
                        <td className="py-3 px-4 text-xs font-mono-num">
                          {pl.payload.preCultureMonth || '—'} / {pl.payload.sowingMonth || '—'} /{' '}
                          {pl.payload.harvestMonth || '—'}
                        </td>
                        <td className="py-3 px-4 text-xs">
                          <div>Vor: {pl.payload.preCrop || '—'} · Nach: {pl.payload.nextCrop || '—'}</div>
                          <div className="text-neutral-500">Mischkultur: {pl.payload.companionPlants || '—'}</div>
                        </td>
                        <td className="py-3 px-4 text-xs font-medium">{pl.payload.status}</td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingPlanting(pl);
                              setPlantingForm(pl.payload);
                              setPlantingModal(true);
                            }}
                            className="text-xs font-medium text-[#597CD4] hover:underline mr-3"
                          >
                            Bearbeiten
                          </button>
                          <button
                            type="button"
                            onClick={() => archiveRecord('plantings', pl.id, pl.title)}
                            className="text-xs font-medium text-[#CF6432] hover:underline"
                          >
                            Archivieren
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <PaginationControls
                page={plantingPagination.page}
                totalPages={plantingPagination.totalPages}
                totalItems={plantingPagination.totalItems}
                onPageChange={plantingPagination.setPage}
                itemLabel="Beeteinträge"
              />
            </>
          )}
        </div>
      )}

      {/* TAB 4: Saatgutverwaltung */}
      {tab === 'seeds' && (
        <div className="space-y-5">
          {seedMatchesForPlantings.length > 0 && (
            <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-2">
              <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                Abgleich: Geplanter Anbau vs. Saatgutbestand
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                {seedMatchesForPlantings.map(({ planting, seed }) => (
                  <div
                    key={planting.id}
                    className={`p-2.5 rounded-xl border flex items-center justify-between gap-2 ${
                      seed && !seed.payload.reorderNeeded
                        ? 'border-[#BBE774]/60 bg-[#BBE774]/10'
                        : 'border-[#CF6432]/40 bg-[#CF6432]/10'
                    }`}
                  >
                    <span className="truncate font-medium">
                      {planting.payload.plantName} {planting.payload.variety}
                    </span>
                    <span className="shrink-0 flex items-center gap-1">
                      {seed ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-[#3B6912]" />
                          {seed.payload.quantity} {seed.payload.unit}
                        </>
                      ) : (
                        <>
                          <AlertCircle className="w-3.5 h-3.5 text-[#CF6432]" />
                          Fehlt
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeSeeds.length === 0 ? (
            <EmptyState
              title="Noch kein Saatgut erfasst"
              description="Verwalte gekauftes und selbst gewonnenes Saatgut inklusive Keimtests, Mutterpflanze und Trocknungsnotizen."
              actionLabel="Saatgut hinzufügen"
              onAction={() => setSeedModal(true)}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {seedPagination.pageItems.map((s) => (
                  <div
                    key={s.id}
                    className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs text-neutral-500">
                      <span>{s.payload.selfHarvested ? 'Eigengewinnung' : s.payload.manufacturer || 'Zukauf'}</span>
                      <span className="font-mono-num">Keimrate {s.payload.germinationRate}%</span>
                    </div>
                    <h3 className="font-display text-base font-bold">{s.title}</h3>
                    <dl className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <dt className="text-neutral-500">Menge</dt>
                        <dd className="font-mono-num font-medium">
                          {s.payload.quantity} {s.payload.unit}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-neutral-500">Haltbar / Ernte</dt>
                        <dd className="font-mono-num font-medium">
                          {s.payload.selfHarvested ? `Ernte ${s.payload.harvestYear}` : s.payload.bestBefore}
                        </dd>
                      </div>
                      <div className="col-span-2">
                        <dt className="text-neutral-500">Lagerort</dt>
                        <dd className="font-medium">{s.payload.storageLocation}</dd>
                      </div>
                    </dl>
                    {s.payload.selfHarvested && s.payload.motherPlantNotes && (
                      <p className="text-xs text-neutral-600 dark:text-neutral-400">
                        Mutterpflanze: {s.payload.motherPlantNotes}
                      </p>
                    )}
                    <div className="flex justify-end gap-3 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingSeed(s);
                          setSeedForm(s.payload);
                          setSeedModal(true);
                        }}
                        className="min-h-[36px] text-xs font-medium text-[#597CD4] hover:underline"
                      >
                        Bearbeiten
                      </button>
                      <button
                        type="button"
                        onClick={() => archiveRecord('seeds', s.id, s.title)}
                        className="min-h-[36px] text-xs font-medium text-[#CF6432] hover:underline"
                      >
                        Archivieren
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <PaginationControls
                page={seedPagination.page}
                totalPages={seedPagination.totalPages}
                totalItems={seedPagination.totalItems}
                onPageChange={seedPagination.setPage}
                itemLabel="Saatgut-Posten"
              />
            </>
          )}
        </div>
      )}

      {/* Sortenvergleich Modal */}
      <Modal
        open={showCompareModal}
        onClose={() => setShowCompareModal(false)}
        title="Sortenvergleich nebeneinander"
        maxWidthClass="max-w-4xl"
      >
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800">
                <th className="py-2 pr-4 text-left text-neutral-500">Merkmal</th>
                {compareList.map((p) => (
                  <th key={p.id} className="py-2 px-3 text-left font-semibold">
                    {p.title}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {[
                ['Reifezeit', (p: PlantPayload) => p.daysToMaturity],
                ['Aussaat', (p: PlantPayload) => p.sowingWindow],
                ['Pflanzzeit', (p: PlantPayload) => p.plantingWindow],
                ['Erntezeit', (p: PlantPayload) => p.harvestWindow],
                ['Nährstoffbedarf', (p: PlantPayload) => p.nutrientNeed],
                ['Standort & Wasser', (p: PlantPayload) => `${p.lightNeed || '—'} / ${p.waterNeed || '—'}`],
                ['Blattform / Nadeln', (p: PlantPayload) => p.leafShape || getTreeIdentificationFallback(p.species)?.leafShape || '—'],
                ['Rinde & Knospen', (p: PlantPayload) => p.barkAndBuds || getTreeIdentificationFallback(p.species)?.barkAndBuds || '—'],
                ['Alltags- & Heilnutzen', (p: PlantPayload) => p.practicalUses || getTreeIdentificationFallback(p.species)?.practicalUses || p.usage],
                ['Geschmack', (p: PlantPayload) => p.taste],
                ['Lagerfähigkeit', (p: PlantPayload) => p.storageLife],
                ['Verarbeitung', (p: PlantPayload) => p.processingSuitability],
                ['Krankheitsanfälligkeit', (p: PlantPayload) => p.diseaseSusceptibility],
                ['Eigene Bewertung', (p: PlantPayload) => (p.experienceRating ? `${p.experienceRating} / 5` : 'Noch nicht bewertet')],
              ].map(([label, getter]) => (
                <tr key={String(label)}>
                  <td className="py-2 pr-4 font-medium text-neutral-500">{String(label)}</td>
                  {compareList.map((p) => (
                    <td key={p.id} className="py-2 px-3">
                      {(getter as (x: PlantPayload) => string)(p.payload) || 'Nicht angegeben'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Modal>

      {/* Plant & Variety Modal */}
      <Modal
        open={plantModal}
        onClose={() => setPlantModal(false)}
        title={editingPlant ? 'Sortenprofil & Erfahrungen' : 'Neue Sorte / Gehölz erfassen'}
        maxWidthClass="max-w-3xl"
      >
        <form onSubmit={savePlant} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Gruppe *</label>
              <select
                value={plantForm.group}
                onChange={(e) => setPlantForm({ ...plantForm, group: e.target.value as PlantPayload['group'] })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-sm"
              >
                {BOTANICAL_SPECIES_GROUPS.map((g) => (
                  <option key={g.group} value={g.group}>{g.group}</option>
                ))}
                <option value="Gehölze">Gehölze</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Pflanzenart *</label>
              <input
                type="text"
                required
                value={plantForm.species}
                onChange={(e) => setPlantForm({ ...plantForm, species: e.target.value })}
                placeholder="z.B. Tomaten, Äpfel, Salbei"
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Sortenname *</label>
              <input
                type="text"
                required
                value={plantForm.variety}
                onChange={(e) => setPlantForm({ ...plantForm, variety: e.target.value })}
                placeholder="z.B. Harzfeuer"
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Nährstoffbedarf</label>
              <select
                value={plantForm.nutrientNeed}
                onChange={(e) => setPlantForm({ ...plantForm, nutrientNeed: e.target.value as PlantPayload['nutrientNeed'] })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-sm"
              >
                <option value="Starkzehrer">Starkzehrer</option>
                <option value="Mittelzehrer">Mittelzehrer</option>
                <option value="Schwachzehrer">Schwachzehrer</option>
                <option value="Dauerkultur">Dauerkultur</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Aussaat / Vorzucht</label>
              <input
                type="text"
                value={plantForm.sowingWindow}
                onChange={(e) => setPlantForm({ ...plantForm, sowingWindow: e.target.value })}
                placeholder="z.B. März – April"
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Erntezeit</label>
              <input
                type="text"
                value={plantForm.harvestWindow}
                onChange={(e) => setPlantForm({ ...plantForm, harvestWindow: e.target.value })}
                placeholder="z.B. Juli – Oktober"
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Pflanzabstand</label>
              <input
                type="text"
                value={plantForm.plantSpacingCm}
                onChange={(e) => setPlantForm({ ...plantForm, plantSpacingCm: e.target.value })}
                placeholder="z.B. 50 cm"
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Reihenabstand</label>
              <input
                type="text"
                value={plantForm.rowSpacingCm}
                onChange={(e) => setPlantForm({ ...plantForm, rowSpacingCm: e.target.value })}
                placeholder="z.B. 80 cm"
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Fachquelle (nicht erfinden)</label>
              <input
                type="text"
                value={plantForm.sourceRef}
                onChange={(e) => setPlantForm({ ...plantForm, sourceRef: e.target.value })}
                placeholder="z.B. Bundessortenamt"
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Geschmack & Verwendung</label>
              <input
                type="text"
                value={plantForm.taste}
                onChange={(e) => setPlantForm({ ...plantForm, taste: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Verarbeitungseignung & Lagerung</label>
              <input
                type="text"
                value={plantForm.processingSuitability}
                onChange={(e) => setPlantForm({ ...plantForm, processingSuitability: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Gute Nachbarn (Mischkultur)</label>
              <input
                type="text"
                value={plantForm.goodNeighbors || ''}
                onChange={(e) => setPlantForm({ ...plantForm, goodNeighbors: e.target.value })}
                placeholder="z.B. Basilikum, Kopfsalat, Tagetes"
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Schlechte Nachbarn</label>
              <input
                type="text"
                value={plantForm.badNeighbors || ''}
                onChange={(e) => setPlantForm({ ...plantForm, badNeighbors: e.target.value })}
                placeholder="z.B. Kartoffeln, Fenchel"
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">Lockerer Pflege- & Praxistipp</label>
              <input
                type="text"
                value={plantForm.careTip || ''}
                onChange={(e) => setPlantForm({ ...plantForm, careTip: e.target.value })}
                placeholder="z.B. Immer an die Wurzeln gießen und leicht mulchen"
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              checked={Boolean(plantForm.isTree)}
              onChange={(e) => setPlantForm({ ...plantForm, isTree: e.target.checked })}
            />
            Obstbaum- / Gehölzakte (Unterlage, Befruchtungspartner, Schnitt, Winterschutz)
          </label>

          {plantForm.isTree && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800">
              <div>
                <label className="block text-xs font-medium mb-1">Unterlage</label>
                <input
                  type="text"
                  value={plantForm.rootstock || ''}
                  onChange={(e) => setPlantForm({ ...plantForm, rootstock: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Befruchtungspartner</label>
                <input
                  type="text"
                  value={plantForm.pollinator || ''}
                  onChange={(e) => setPlantForm({ ...plantForm, pollinator: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Pflanzdatum</label>
                <input
                  type="date"
                  value={plantForm.plantedDate || ''}
                  onChange={(e) => setPlantForm({ ...plantForm, plantedDate: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent text-xs"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium mb-1">Schnittmaßnahmen &amp; Winterschutz</label>
                <input
                  type="text"
                  value={plantForm.pruningNotes || ''}
                  onChange={(e) => setPlantForm({ ...plantForm, pruningNotes: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent text-xs"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium mb-1">Erkennungsmerkmal: Blattform / Nadeln</label>
                <input
                  type="text"
                  value={plantForm.leafShape || ''}
                  onChange={(e) => setPlantForm({ ...plantForm, leafShape: e.target.value })}
                  placeholder="z.B. 5-lappig handförmig, gegenständig oder 2 Nadeln im Paar"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent text-xs"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium mb-1">Erkennungsmerkmal: Rinde, Stamm &amp; Knospen</label>
                <input
                  type="text"
                  value={plantForm.barkAndBuds || ''}
                  onChange={(e) => setPlantForm({ ...plantForm, barkAndBuds: e.target.value })}
                  placeholder="z.B. glatte silbergraue Elefantenhaut, tiefschwarze Winterknospen"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent text-xs"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium mb-1">Früchte / Zapfen &amp; Verwechslungs-Check</label>
                <input
                  type="text"
                  value={plantForm.identificationTraits || ''}
                  onChange={(e) => setPlantForm({ ...plantForm, identificationTraits: e.target.value })}
                  placeholder="z.B. gestielte Eicheln im Becher, Unterschied Eibe vs. Weißtanne"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent text-xs"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium mb-1">Alltags-, Holz-, Heil- &amp; Haushaltsnutzen</label>
                <input
                  type="text"
                  value={plantForm.practicalUses || ''}
                  onChange={(e) => setPlantForm({ ...plantForm, practicalUses: e.target.value })}
                  placeholder="z.B. Waschmittel, Wipfelsirup, Tee, Zaunholz, Bienenweide"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent text-xs"
                />
              </div>
            </div>
          )}

          <div className="p-3 rounded-xl bg-[#BBE774]/10 border border-[#BBE774]/40 space-y-2">
            <div className="text-xs font-semibold">Eigene Anbauerfahrungen (Mellenbach-Glasbach)</div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs mb-1">Eigene Bewertung (1–5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  value={plantForm.experienceRating || ''}
                  onChange={(e) => setPlantForm({ ...plantForm, experienceRating: Number(e.target.value) || undefined })}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-xs font-mono-num"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs mb-1">Ertrag, Wetterverträglichkeit & Geschmack</label>
                <input
                  type="text"
                  value={plantForm.experienceTasteNote || ''}
                  onChange={(e) => setPlantForm({ ...plantForm, experienceTasteNote: e.target.value })}
                  placeholder="z.B. Sehr ertragreich im kühlen Sommer 2025"
                  className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-xs"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setPlantModal(false)} className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-medium">
              Abbrechen
            </button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#233A29] text-white text-xs font-semibold">
              Speichern
            </button>
          </div>
        </form>
      </Modal>

      {/* Planting Modal */}
      <Modal
        open={plantingModal}
        onClose={() => setPlantingModal(false)}
        title="Beetplanung & Fruchtfolge"
      >
        <form onSubmit={savePlanting} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Pflanze *</label>
              <input
                type="text"
                required
                value={plantingForm.plantName}
                onChange={(e) => setPlantingForm({ ...plantingForm, plantName: e.target.value })}
                placeholder="z.B. Tomaten"
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Sorte *</label>
              <input
                type="text"
                required
                value={plantingForm.variety}
                onChange={(e) => setPlantingForm({ ...plantingForm, variety: e.target.value })}
                placeholder="z.B. Harzfeuer"
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Beet / Grundstücksbereich</label>
              <select
                value={plantingForm.areaId}
                onChange={(e) => setPlantingForm({ ...plantingForm, areaId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-sm"
              >
                <option value="">Bereich wählen…</option>
                {activeAreas.map((a) => (
                  <option key={a.id} value={a.id}>{a.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Status</label>
              <select
                value={plantingForm.status}
                onChange={(e) => setPlantingForm({ ...plantingForm, status: e.target.value as PlantingPayload['status'] })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-sm"
              >
                {['Geplant', 'Vorgezogen', 'Ausgesät', 'Gepflanzt', 'In Pflege', 'Erntereif', 'Abgeerntet', 'Regeneration'].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Aussaat-Monat</label>
              <input
                type="text"
                value={plantingForm.sowingMonth}
                onChange={(e) => setPlantingForm({ ...plantingForm, sowingMonth: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Ernte-Monat</label>
              <input
                type="text"
                value={plantingForm.harvestMonth}
                onChange={(e) => setPlantingForm({ ...plantingForm, harvestMonth: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Vorkultur</label>
              <input
                type="text"
                value={plantingForm.preCrop}
                onChange={(e) => setPlantingForm({ ...plantingForm, preCrop: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Nachkultur</label>
              <input
                type="text"
                value={plantingForm.nextCrop}
                onChange={(e) => setPlantingForm({ ...plantingForm, nextCrop: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Mischkultur-Partner</label>
            <input
              type="text"
              value={plantingForm.companionPlants}
              onChange={(e) => setPlantingForm({ ...plantingForm, companionPlants: e.target.value })}
              placeholder="z.B. Basilikum, Tagetes"
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setPlantingModal(false)} className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-medium">
              Abbrechen
            </button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#233A29] text-white text-xs font-semibold">
              Speichern
            </button>
          </div>
        </form>
      </Modal>

      {/* Seed Modal */}
      <Modal
        open={seedModal}
        onClose={() => setSeedModal(false)}
        title={editingSeed ? 'Saatgut bearbeiten' : 'Saatgut erfassen'}
      >
        <form onSubmit={saveSeed} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Pflanzenart *</label>
              <input
                type="text"
                required
                value={seedForm.species}
                onChange={(e) => setSeedForm({ ...seedForm, species: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Sorte *</label>
              <input
                type="text"
                required
                value={seedForm.variety}
                onChange={(e) => setSeedForm({ ...seedForm, variety: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Menge</label>
              <input
                type="number"
                value={seedForm.quantity}
                onChange={(e) => setSeedForm({ ...seedForm, quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Einheit</label>
              <select
                value={seedForm.unit}
                onChange={(e) => setSeedForm({ ...seedForm, unit: e.target.value as SeedPayload['unit'] })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-sm"
              >
                <option value="Korn">Korn</option>
                <option value="g">g</option>
                <option value="Tütchen">Tütchen</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Keimfähigkeit (%)</label>
              <input
                type="number"
                min="0"
                max="100"
                value={seedForm.germinationRate}
                onChange={(e) => setSeedForm({ ...seedForm, germinationRate: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Lagerort</label>
              <input
                type="text"
                value={seedForm.storageLocation}
                onChange={(e) => setSeedForm({ ...seedForm, storageLocation: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
              />
            </div>
          </div>

          <label className="inline-flex items-center gap-2 text-xs font-medium">
            <input
              type="checkbox"
              checked={seedForm.selfHarvested}
              onChange={(e) => setSeedForm({ ...seedForm, selfHarvested: e.target.checked })}
            />
            Eigengewinnung / eigene Vermehrung
          </label>

          {seedForm.selfHarvested && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Mutterpflanze & Selektion</label>
                <input
                  type="text"
                  value={seedForm.motherPlantNotes}
                  onChange={(e) => setSeedForm({ ...seedForm, motherPlantNotes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-xs"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Gewinnung & Trocknung</label>
                <input
                  type="text"
                  value={seedForm.dryingNotes}
                  onChange={(e) => setSeedForm({ ...seedForm, dryingNotes: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-xs"
                />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setSeedModal(false)} className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-medium">
              Abbrechen
            </button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#233A29] text-white text-xs font-semibold">
              Speichern
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
