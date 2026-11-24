import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Bell,
  CalendarPlus,
  Check,
  Download,
  Edit3,
  FileText,
  History,
  Plus,
  RotateCcw,
  ShieldAlert,
  ShoppingCart,
  Trash2,
  Wrench,
} from 'lucide-react';
import { DEFAULT_NOTIFICATION_SETTINGS, useHomestead } from '../context/HomesteadContext';
import {
  downloadIcsFile,
  exportCsv,
  exportExcelWorkbook,
  exportJsonBackup,
  exportSummaryPdf,
} from '../lib/exports';
import { FIREBASE_DATABASE_ID, FIREBASE_PROJECT_ID } from '../lib/firebase';
import {
  EmptyState,
  Modal,
  ModuleHeader,
  PaginationControls,
  SegmentedTabs,
  usePagination,
} from '../components/ui/SharedUI';
import type {
  DocumentPayload,
  EmergencyConfigPayload,
  EquipmentPayload,
  FinancePayload,
  HomesteadRecord,
  ShoppingPayload,
  UserNotificationSettings,
} from '../types/homestead';

type ManagementTab =
  | 'finanzen'
  | 'werkzeuge'
  | 'einkauf'
  | 'notfall'
  | 'bericht'
  | 'einstellungen';

function addDaysIso(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return dateStr;
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export const ManagementView: React.FC = () => {
  const {
    activeIdentity,
    userProfile,
    areas,
    plants,
    plantings,
    seeds,
    animalGroups,
    animalLogs,
    feedStocks,
    harvests,
    recipes,
    batches,
    inventoryItems,
    resources,
    projects,
    calendarEvents,
    knowledgeEntries,
    equipment,
    financeEntries,
    shoppingItems,
    documents,
    emergencyConfig,
    auditLogs,
    createRecord,
    updateRecord,
    archiveRecord,
    restoreRecord,
    deleteRecordPermanently,
    updateNotificationSettings,
    requestPushPermission,
    deleteOwnAccount,
    pushToast,
  } = useHomestead();

  const [tab, setTab] = useState<ManagementTab>('finanzen');
  const todayStr = new Date().toISOString().slice(0, 10);
  const currentYearNum = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(currentYearNum);

  // Finance modal
  const [showFinModal, setShowFinModal] = useState(false);
  const [editingFin, setEditingFin] = useState<HomesteadRecord<FinancePayload> | null>(null);
  const [finTitle, setFinTitle] = useState('');
  const [finPayload, setFinPayload] = useState<FinancePayload>({
    entryType: 'Ausgabe',
    category: 'Saatgut & Pflanzen',
    linkedModule: 'Anbau',
    amountEur: 0,
    selfSupplyNeedEur: 0,
    date: todayStr,
    notes: '',
  });

  // Equipment modal
  const [showEquipModal, setShowEquipModal] = useState(false);
  const [editingEquip, setEditingEquip] = useState<HomesteadRecord<EquipmentPayload> | null>(null);
  const [equipTitle, setEquipTitle] = useState('');
  const [equipPayload, setEquipPayload] = useState<EquipmentPayload>({
    category: 'Gartengerät',
    manufacturer: '',
    purchaseDate: todayStr,
    purchasePriceEur: 0,
    location: 'Geräteschuppen',
    maintenanceIntervalDays: 90,
    lastMaintenanceDate: todayStr,
    repairsLog: '',
    spareParts: '',
    manualNotes: '',
  });

  // Shopping modal
  const [showShopModal, setShowShopModal] = useState(false);
  const [shopTitle, setShopTitle] = useState('');
  const [shopPayload, setShopPayload] = useState<ShoppingPayload>({
    category: 'Verbrauchsmaterial',
    quantity: 1,
    unit: 'Stück',
    source: 'Raiffeisen / Baumarkt',
    estimatedPriceEur: 0,
    purchased: false,
    linkedProject: '',
  });

  // Document modal
  const [showDocModal, setShowDocModal] = useState(false);
  const [docTitle, setDocTitle] = useState('');
  const [docPayload, setDocPayload] = useState<DocumentPayload>({
    docType: 'Rechnung',
    linkedModule: 'Verwaltung',
    date: todayStr,
    fileName: '',
    externalUrl: '',
    notes: '',
  });

  // Emergency config draft
  const activeEmergencyDoc = emergencyConfig.find((e) => !e.archived) || null;
  const [emergencyDraft, setEmergencyDraft] = useState<EmergencyConfigPayload | null>(null);
  const effectiveEmergency: EmergencyConfigPayload = emergencyDraft ||
    activeEmergencyDoc?.payload || {
      vacationActive: false,
      substituteName: '',
      substitutePhone: '',
      startDate: todayStr,
      endDate: todayStr,
      feedingInstructions: '',
      waterInstructions: '',
      coopInstructions: '',
      gardenInstructions: '',
      vetName: '',
      vetPhone: '',
      vetEmergencyPhone: '',
      otherContacts: '',
      protocolPowerOutage: '',
      protocolWaterOutage: '',
      protocolStorm: '',
      protocolAnimalEmergency: '',
    };

  // Notification draft
  const notifPrefs: UserNotificationSettings =
    userProfile?.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS;

  // Delete account modal
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  // Filtered Year Finances & Annual Report Calculations
  const activeFinances = useMemo(() => financeEntries.filter((f) => !f.archived), [financeEntries]);
  const yearFinances = useMemo(
    () => activeFinances.filter((f) => f.payload.date.startsWith(String(selectedYear))),
    [activeFinances, selectedYear]
  );

  const yearExpenses = yearFinances
    .filter((f) => f.payload.entryType === 'Ausgabe')
    .reduce((s, f) => s + (f.payload.amountEur || 0), 0);
  const yearIncome = yearFinances
    .filter((f) => f.payload.entryType === 'Einnahme')
    .reduce((s, f) => s + (f.payload.amountEur || 0), 0);
  const yearSelfSupplyNeed = yearFinances.reduce((s, f) => s + (f.payload.selfSupplyNeedEur || 0), 0);

  // Real consumption-based self-sufficiency calculation
  const activeInventory = useMemo(() => inventoryItems.filter((i) => !i.archived), [inventoryItems]);
  const totalConsumedUnits = activeInventory.reduce((s, i) => s + (i.payload.consumedTotal || 0), 0);
  const yearHarvestKg = useMemo(
    () =>
      harvests
        .filter((h) => !h.archived && h.payload.date.startsWith(String(selectedYear)))
        .reduce((s, h) => s + (h.payload.unit === 'g' ? h.payload.amount / 1000 : h.payload.amount), 0),
    [harvests, selectedYear]
  );
  const prevYearHarvestKg = useMemo(
    () =>
      harvests
        .filter((h) => !h.archived && h.payload.date.startsWith(String(selectedYear - 1)))
        .reduce((s, h) => s + (h.payload.unit === 'g' ? h.payload.amount / 1000 : h.payload.amount), 0),
    [harvests, selectedYear]
  );
  const yearEggs = useMemo(
    () =>
      animalLogs
        .filter(
          (l) =>
            !l.archived &&
            l.payload.logType === 'Eier' &&
            l.payload.date.startsWith(String(selectedYear))
        )
        .reduce((s, l) => s + (l.payload.quantity || 0), 0),
    [animalLogs, selectedYear]
  );

  // Self-sufficiency ratio derived from documented self-supply savings vs total household food budget (or consumption ratio)
  const selfSufficiencyPercent = useMemo(() => {
    if (yearSelfSupplyNeed > 0 && yearIncome > 0) {
      return Math.min(100, Math.round((yearIncome / yearSelfSupplyNeed) * 100));
    }
    const producedStock = activeInventory.reduce((s, i) => s + (i.payload.quantity || 0), 0);
    const denom = totalConsumedUnits + producedStock;
    return denom > 0 ? Math.min(100, Math.round((totalConsumedUnits / denom) * 100)) : 0;
  }, [yearSelfSupplyNeed, yearIncome, activeInventory, totalConsumedUnits]);

  // Equipment with maintenance due
  const activeEquipment = useMemo(() => equipment.filter((e) => !e.archived), [equipment]);
  const activeShopping = useMemo(() => shoppingItems.filter((s) => !s.archived), [shoppingItems]);
  const activeDocuments = useMemo(
    () => documents.filter((d) => !d.archived && d.id !== 'garden_map_schema_v1'),
    [documents]
  );

  // Collect all archived records across collections for soft-delete trash
  const archivedAll = useMemo(() => {
    const groups: Array<{ col: string; label: string; records: HomesteadRecord[] }> = [
      { col: 'areas', label: 'Grundstück', records: areas.filter((r) => r.archived) },
      { col: 'plants', label: 'Sorten', records: plants.filter((r) => r.archived) },
      { col: 'plantings', label: 'Pflanzungen', records: plantings.filter((r) => r.archived) },
      { col: 'seeds', label: 'Saatgut', records: seeds.filter((r) => r.archived) },
      { col: 'animalGroups', label: 'Tiergruppen', records: animalGroups.filter((r) => r.archived) },
      { col: 'animalLogs', label: 'Tierlogs', records: animalLogs.filter((r) => r.archived) },
      { col: 'feedStocks', label: 'Futter', records: feedStocks.filter((r) => r.archived) },
      { col: 'harvests', label: 'Ernten', records: harvests.filter((r) => r.archived) },
      { col: 'recipes', label: 'Rezepte', records: recipes.filter((r) => r.archived) },
      { col: 'batches', label: 'Chargen', records: batches.filter((r) => r.archived) },
      { col: 'inventoryItems', label: 'Vorräte', records: inventoryItems.filter((r) => r.archived) },
      { col: 'resources', label: 'Ressourcen', records: resources.filter((r) => r.archived) },
      { col: 'projects', label: 'Projekte', records: projects.filter((r) => r.archived) },
      { col: 'calendarEvents', label: 'Kalender', records: calendarEvents.filter((r) => r.archived) },
      { col: 'knowledgeEntries', label: 'Wissen', records: knowledgeEntries.filter((r) => r.archived) },
      { col: 'equipment', label: 'Werkzeuge', records: equipment.filter((r) => r.archived) },
      { col: 'financeEntries', label: 'Finanzen', records: financeEntries.filter((r) => r.archived) },
      { col: 'shoppingItems', label: 'Einkauf', records: shoppingItems.filter((r) => r.archived) },
      { col: 'documents', label: 'Dokumente', records: documents.filter((r) => r.archived) },
    ];
    return groups.flatMap((g) => g.records.map((rec) => ({ col: g.col, label: g.label, rec })));
  }, [
    areas,
    plants,
    plantings,
    seeds,
    animalGroups,
    animalLogs,
    feedStocks,
    harvests,
    recipes,
    batches,
    inventoryItems,
    resources,
    projects,
    calendarEvents,
    knowledgeEntries,
    equipment,
    financeEntries,
    shoppingItems,
    documents,
  ]);

  const financePagination = usePagination(yearFinances, 6);
  const equipmentPagination = usePagination(activeEquipment, 4);
  const shoppingPagination = usePagination(activeShopping, 6);
  const documentPagination = usePagination(activeDocuments, 6);
  const auditPagination = usePagination(auditLogs, 8);
  const trashPagination = usePagination(archivedAll, 6);

  const saveFinance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finTitle.trim()) return;
    if (editingFin) {
      await updateRecord('financeEntries', editingFin.id, finTitle, finPayload, editingFin.updatedAtMs);
      pushToast('success', 'Finanzeintrag aktualisiert.');
    } else {
      await createRecord('financeEntries', finTitle, finPayload);
      pushToast('success', 'Finanzeintrag gespeichert.');
    }
    setShowFinModal(false);
  };

  const saveEquipment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipTitle.trim()) return;
    if (editingEquip) {
      await updateRecord('equipment', editingEquip.id, equipTitle, equipPayload, editingEquip.updatedAtMs);
      pushToast('success', 'Gerät aktualisiert.');
    } else {
      await createRecord('equipment', equipTitle, equipPayload);
      pushToast('success', 'Gerät gespeichert.');
    }
    setShowEquipModal(false);
  };

  const markMaintenanceDoneToday = async (eq: HomesteadRecord<EquipmentPayload>) => {
    await updateRecord(
      'equipment',
      eq.id,
      eq.title,
      { ...eq.payload, lastMaintenanceDate: todayStr },
      eq.updatedAtMs
    );
    pushToast('success', `Wartung für „${eq.title}“ heute eingetragen.`);
  };

  const createMaintenanceReminder = async (eq: HomesteadRecord<EquipmentPayload>) => {
    const dueDate = addDaysIso(eq.payload.lastMaintenanceDate, eq.payload.maintenanceIntervalDays);
    await createRecord('calendarEvents', `Wartung: ${eq.title}`, {
      eventType: 'task',
      description: `Planmäßige Wartung (${eq.payload.location}). Ersatzteile: ${eq.payload.spareParts || 'keine angegeben'}`,
      date: dueDate,
      startTime: '10:00',
      endTime: '11:00',
      category: 'Wartung',
      assignee: activeIdentity || 'Gemeinsam',
      recurrence: 'none',
      reminderMinutes: 1440,
      areaId: '',
      areaName: eq.payload.location,
      completed: false,
      notes: eq.payload.manualNotes,
    });
    pushToast('success', `Wartungstermin am ${dueDate} im Kalender eingetragen.`);
  };

  const autoGenerateShoppingNeeds = async () => {
    const existingOpen = new Set(
      activeShopping.filter((s) => !s.payload.purchased).map((s) => s.title.toLowerCase())
    );
    let added = 0;

    for (const f of feedStocks.filter((x) => !x.archived)) {
      if (f.payload.quantityKg <= f.payload.minStockKg && !existingOpen.has(f.title.toLowerCase())) {
        await createRecord('shoppingItems', f.title, {
          category: 'Futter',
          quantity: Math.max(10, Math.round(f.payload.minStockKg * 2)),
          unit: 'kg',
          source: f.payload.source || 'Futtermittelhandel',
          estimatedPriceEur: f.payload.costPerPurchaseEur || 0,
          purchased: false,
          linkedProject: 'Futterbestand',
        });
        added++;
      }
    }

    for (const item of activeInventory) {
      if (
        item.payload.quantity <= item.payload.minQuantity &&
        !existingOpen.has(item.title.toLowerCase())
      ) {
        await createRecord('shoppingItems', `${item.title} (Mindestbestand)`, {
          category: 'Vorrat',
          quantity: Math.max(1, item.payload.minQuantity - item.payload.quantity + 1),
          unit: item.payload.unit,
          source: item.payload.origin || 'Nachproduktion / Einkauf',
          estimatedPriceEur: 0,
          purchased: false,
          linkedProject: 'Vorratsprüfung',
        });
        added++;
      }
    }

    for (const s of seeds.filter((x) => !x.archived)) {
      if (s.payload.reorderNeeded && !existingOpen.has(s.title.toLowerCase())) {
        await createRecord('shoppingItems', `Saatgut: ${s.title}`, {
          category: 'Saatgut',
          quantity: 1,
          unit: 'Tütchen',
          source: s.payload.source || s.payload.manufacturer || 'Saatguthandel',
          estimatedPriceEur: 3.5,
          purchased: false,
          linkedProject: 'Anbauplanung',
        });
        added++;
      }
    }

    pushToast(
      added > 0 ? 'success' : 'info',
      added > 0
        ? `${added} fehlende Position(en) automatisch auf die Einkaufsliste gesetzt.`
        : 'Keine neuen Unterbestände bei Futter, Vorräten oder Saatgut erkannt.'
    );
  };

  const saveEmergency = async (e: React.FormEvent) => {
    e.preventDefault();
    if (activeEmergencyDoc) {
      await updateRecord(
        'emergencyConfig',
        activeEmergencyDoc.id,
        'Hof-Notfall- & Urlaubsplan',
        effectiveEmergency,
        activeEmergencyDoc.updatedAtMs
      );
    } else {
      await createRecord('emergencyConfig', 'Hof-Notfall- & Urlaubsplan', effectiveEmergency);
    }
    pushToast('success', 'Urlaubs- & Notfallplan gespeichert (offline verfügbar).');
  };

  const handleFullExcelExport = () => {
    exportExcelWorkbook(
      [
        {
          name: 'Flächen',
          rows: areas.filter((a) => !a.archived).map((a) => ({ Name: a.title, Typ: a.payload.areaType, qm: a.payload.sizeSqm, Boden: a.payload.soilType })),
        },
        {
          name: 'Sorten',
          rows: plants.filter((p) => !p.archived).map((p) => ({ Name: p.title, Art: p.payload.species, Gruppe: p.payload.group, Bewertung: p.payload.experienceRating || '' })),
        },
        {
          name: 'Ernten',
          rows: harvests.filter((h) => !h.archived).map((h) => ({ Datum: h.payload.date, Kultur: h.title, Menge: h.payload.amount, Einheit: h.payload.unit, Beet: h.payload.areaName })),
        },
        {
          name: 'Vorräte',
          rows: activeInventory.map((i) => ({ Artikel: i.title, Kategorie: i.payload.category, Bestand: i.payload.quantity, Einheit: i.payload.unit, Ort: i.payload.location, Verbraucht: i.payload.consumedTotal })),
        },
        {
          name: 'Tiere',
          rows: animalGroups.filter((g) => !g.archived).map((g) => ({ Gruppe: g.title, Art: g.payload.species, Anzahl: g.payload.count, Stall: g.payload.areaName })),
        },
        {
          name: 'Finanzen',
          rows: activeFinances.map((f) => ({ Datum: f.payload.date, Typ: f.payload.entryType, Titel: f.title, BetragEUR: f.payload.amountEur, Kategorie: f.payload.category })),
        },
      ],
      `hof-und-garten-gesamtexport-${todayStr}`
    );
    pushToast('success', 'Excel-Arbeitsmappe (.xlsx) heruntergeladen.');
  };

  const handleAnnualPdf = () => {
    exportSummaryPdf(
      `Jahresbericht ${selectedYear} — Hof & Garten`,
      `Mellenbach-Glasbach, Thüringen · Erstellt am ${todayStr}`,
      [
        {
          heading: '1. Ernte & Selbstversorgung',
          lines: [
            `Erntemenge ${selectedYear}: ${yearHarvestKg.toFixed(1)} kg (Vorjahr ${selectedYear - 1}: ${prevYearHarvestKg.toFixed(1)} kg)`,
            `Dokumentierte Eier (${selectedYear}): ${yearEggs} Stück`,
            `Aktive Verarbeitungschargen: ${batches.filter((b) => !b.archived).length}`,
            `Aktuelle Vorratsartikel: ${activeInventory.length} (Verbrauchte Einheiten gesamt: ${totalConsumedUnits})`,
          ],
        },
        {
          heading: '2. Finanzen & Projekte',
          lines: [
            `Ausgaben ${selectedYear}: ${yearExpenses.toFixed(2)} €`,
            `Dokumentierte Erträge / Einsparungen ${selectedYear}: ${yearIncome.toFixed(2)} €`,
            `Selbstversorgungsgrad (verbrauchs-/bedarfsbasiert): ${selfSufficiencyPercent} %`,
            `Abgeschlossene Projekte: ${projects.filter((p) => !p.archived && p.payload.status === 'Abgeschlossen').length}`,
          ],
        },
        {
          heading: '3. Bestand & Flächen',
          lines: [
            `Grundstücksbereiche: ${areas.filter((a) => !a.archived).length}`,
            `Pflanzensorten: ${plants.filter((p) => !p.archived).length}`,
            `Tiergruppen: ${animalGroups.filter((g) => !g.archived).map((g) => `${g.title} (${g.payload.count})`).join(', ') || 'keine'}`,
          ],
        },
      ],
      `hof-jahresbericht-${selectedYear}`
    );
    pushToast('success', `Jahresbericht ${selectedYear} als PDF exportiert.`);
  };

  const handleFullJsonBackup = () => {
    exportJsonBackup(
      {
        exportedAt: new Date().toISOString(),
        homesteadId: 'mellenbach-hof',
        areas,
        plants,
        plantings,
        seeds,
        animalGroups,
        animalLogs,
        feedStocks,
        harvests,
        recipes,
        batches,
        inventoryItems,
        resources,
        projects,
        calendarEvents,
        knowledgeEntries,
        equipment,
        financeEntries,
        shoppingItems,
        documents,
        emergencyConfig,
      },
      `hof-und-garten-backup-${todayStr}`
    );
    pushToast('success', 'Vollständiges JSON-Backup mit IDs & Relationen heruntergeladen.');
  };

  const updateNotifField = async (next: UserNotificationSettings) => {
    await updateNotificationSettings(next);
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Verwaltung, Finanzen & Berichte"
        subtitle="Kosten & Selbstversorgung, Werkzeuge, Einkauf, Notfallmodus, Jahresbericht, Exporte, Verlauf & Papierkorb"
      />

      <SegmentedTabs
        tabs={[
          { id: 'finanzen', label: 'Finanzen & Bedarf' },
          { id: 'werkzeuge', label: 'Werkzeuge' },
          { id: 'einkauf', label: 'Einkauf & Dokumente' },
          { id: 'notfall', label: 'Urlaub & Notfall' },
          { id: 'bericht', label: 'Jahresbericht & Exporte' },
          { id: 'einstellungen', label: 'Einstellungen, Verlauf & Papierkorb' },
        ]}
        activeTab={tab}
        onChange={(id) => setTab(id as ManagementTab)}
      />

      {/* 1. FINANZEN */}
      {tab === 'finanzen' && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium">Jahr:</label>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-xs font-mono-num"
              >
                {[currentYearNum - 1, currentYearNum, currentYearNum + 1].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <button
              type="button"
              onClick={() => {
                setEditingFin(null);
                setFinTitle('');
                setFinPayload({
                  entryType: 'Ausgabe',
                  category: 'Saatgut & Pflanzen',
                  linkedModule: 'Anbau',
                  amountEur: 0,
                  selfSupplyNeedEur: 0,
                  date: todayStr,
                  notes: '',
                });
                setShowFinModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-[#233A29] text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Buchung erfassen
            </button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4">
              <div className="text-xs text-neutral-500">Ausgaben ({selectedYear})</div>
              <div className="text-2xl font-bold font-mono-num mt-1 text-[#CF6432]">
                {yearExpenses.toFixed(2)} €
              </div>
            </div>
            <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4">
              <div className="text-xs text-neutral-500">Erträge / Einsparung</div>
              <div className="text-2xl font-bold font-mono-num mt-1 text-[#3B6912] dark:text-[#BBE774]">
                {yearIncome.toFixed(2)} €
              </div>
            </div>
            <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4">
              <div className="text-xs text-neutral-500">Verbrauchte Vorräte</div>
              <div className="text-2xl font-bold font-mono-num mt-1">{totalConsumedUnits}</div>
            </div>
            <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4">
              <div className="text-xs text-neutral-500">Selbstversorgungsgrad</div>
              <div className="text-2xl font-bold font-mono-num mt-1">{selfSufficiencyPercent} %</div>
              <div className="text-[11px] text-neutral-500">Verbrauchs-/Bedarfsbasis</div>
            </div>
          </div>

          {yearFinances.length === 0 ? (
            <EmptyState
              title={`Keine Buchungen für ${selectedYear}`}
              description="Erfasse Kosten (Saatgut, Futter, Baumaterial, Werkzeug) und Einnahmen/Eigenwert für eine belastbare Jahresbilanz."
            />
          ) : (
            <>
              <div className="space-y-2.5">
                {financePagination.pageItems.map((f) => (
                  <div
                    key={f.id}
                    className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-xl p-4 flex items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-sm truncate">{f.title}</div>
                      <div className="text-xs text-neutral-500">
                        <span className="font-mono-num">{f.payload.date}</span> · {f.payload.entryType} ·{' '}
                        {f.payload.category} · {f.payload.linkedModule}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <span
                        className={`font-mono-num font-bold text-sm ${
                          f.payload.entryType === 'Ausgabe'
                            ? 'text-[#CF6432]'
                            : 'text-[#3B6912] dark:text-[#BBE774]'
                        }`}
                      >
                        {f.payload.entryType === 'Ausgabe' ? '-' : '+'}
                        {f.payload.amountEur.toFixed(2)} €
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingFin(f);
                          setFinTitle(f.title);
                          setFinPayload({ ...f.payload });
                          setShowFinModal(true);
                        }}
                        className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => archiveRecord('financeEntries', f.id, f.title)}
                        className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700 text-[#CF6432]"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <PaginationControls
                page={financePagination.page}
                totalPages={financePagination.totalPages}
                totalItems={financePagination.totalItems}
                onPageChange={financePagination.setPage}
                itemLabel="Buchungen"
              />
            </>
          )}
        </div>
      )}

      {/* 2. WERKZEUGE & GERÄTE */}
      {tab === 'werkzeuge' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              type="button"
              onClick={() => {
                setEditingEquip(null);
                setEquipTitle('');
                setEquipPayload({
                  category: 'Gartengerät',
                  manufacturer: '',
                  purchaseDate: todayStr,
                  purchasePriceEur: 0,
                  location: 'Geräteschuppen',
                  maintenanceIntervalDays: 90,
                  lastMaintenanceDate: todayStr,
                  repairsLog: '',
                  spareParts: '',
                  manualNotes: '',
                });
                setShowEquipModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-[#233A29] text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Gerät / Werkzeug anlegen
            </button>
          </div>

          {activeEquipment.length === 0 ? (
            <EmptyState
              title="Noch keine Werkzeuge oder Geräte erfasst"
              description="Verwalte Gartengeräte, Werkzeuge, Maschinen und Einkochausrüstung inklusive Wartungsintervallen und Ersatzteilen."
            />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {equipmentPagination.pageItems.map((eq) => {
                  const p = eq.payload;
                  const nextDue = addDaysIso(p.lastMaintenanceDate, p.maintenanceIntervalDays || 90);
                  const isDue = nextDue <= todayStr;
                  return (
                    <div
                      key={eq.id}
                      className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <h3 className="font-display text-base font-bold flex items-center gap-2">
                            <Wrench className="w-4 h-4 text-[#63390C] dark:text-[#FFC814]" />
                            {eq.title}
                          </h3>
                          <div className="text-xs text-neutral-500">
                            {p.category} · {p.manufacturer || 'Hersteller offen'} · Standort: {p.location}
                          </div>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEquip(eq);
                              setEquipTitle(eq.title);
                              setEquipPayload({ ...eq.payload });
                              setShowEquipModal(true);
                            }}
                            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => archiveRecord('equipment', eq.id, eq.title)}
                            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700 text-[#CF6432]"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412]">
                          <div className="text-neutral-500">Letzte Wartung</div>
                          <div className="font-mono-num font-semibold">{p.lastMaintenanceDate}</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412]">
                          <div className="text-neutral-500">Nächste fällig</div>
                          <div className={`font-mono-num font-semibold ${isDue ? 'text-[#CF6432]' : ''}`}>
                            {nextDue}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412]">
                          <div className="text-neutral-500">Kaufpreis</div>
                          <div className="font-mono-num font-semibold">{p.purchasePriceEur.toFixed(0)} €</div>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => markMaintenanceDoneToday(eq)}
                          className="min-h-[38px] px-3 py-1.5 rounded-lg bg-[#233A29] text-white text-xs font-medium inline-flex items-center gap-1"
                        >
                          <Check className="w-3.5 h-3.5" />
                          Wartung heute erledigt
                        </button>
                        <button
                          type="button"
                          onClick={() => createMaintenanceReminder(eq)}
                          className="min-h-[38px] px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-medium inline-flex items-center gap-1"
                        >
                          <CalendarPlus className="w-3.5 h-3.5" />
                          Termin in Kalender
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <PaginationControls
                page={equipmentPagination.page}
                totalPages={equipmentPagination.totalPages}
                totalItems={equipmentPagination.totalItems}
                onPageChange={equipmentPagination.setPage}
                itemLabel="Geräte"
              />
            </>
          )}
        </div>
      )}

      {/* 3. EINKAUF & DOKUMENTE */}
      {tab === 'einkauf' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-[#233A29] dark:text-[#BBE774]" />
                Gemeinsame Einkaufsliste
              </h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={autoGenerateShoppingNeeds}
                  className="px-3 py-1.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
                >
                  Bedarf automatisch prüfen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShopTitle('');
                    setShowShopModal(true);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-[#233A29] text-white text-xs font-semibold inline-flex items-center gap-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Artikel
                </button>
              </div>
            </div>

            {activeShopping.length === 0 ? (
              <EmptyState
                title="Einkaufsliste ist leer"
                description="Prüfe automatisch Futter-, Vorrats- und Saatgutbestände oder füge manuell Bedarf hinzu."
              />
            ) : (
              <>
                <div className="space-y-2">
                  {shoppingPagination.pageItems.map((item) => (
                    <div
                      key={item.id}
                      className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 flex items-center justify-between gap-3"
                    >
                      <button
                        type="button"
                        onClick={() =>
                          updateRecord(
                            'shoppingItems',
                            item.id,
                            item.title,
                            { ...item.payload, purchased: !item.payload.purchased },
                            item.updatedAtMs
                          )
                        }
                        className="flex items-center gap-3 text-left min-w-0"
                      >
                        <span
                          className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 ${
                            item.payload.purchased
                              ? 'bg-[#233A29] border-[#233A29] text-white'
                              : 'border-neutral-300 dark:border-neutral-700'
                          }`}
                        >
                          {item.payload.purchased && <Check className="w-3.5 h-3.5" />}
                        </span>
                        <div className="min-w-0">
                          <div className={`text-sm font-medium truncate ${item.payload.purchased ? 'line-through text-neutral-400' : ''}`}>
                            {item.title}
                          </div>
                          <div className="text-xs text-neutral-500">
                            <span className="font-mono-num">
                              {item.payload.quantity} {item.payload.unit}
                            </span>{' '}
                            · {item.payload.category}
                            {item.payload.source ? ` · ${item.payload.source}` : ''}
                          </div>
                        </div>
                      </button>
                      <button
                        type="button"
                        onClick={() => archiveRecord('shoppingItems', item.id, item.title)}
                        className="min-h-[38px] min-w-[38px] flex items-center justify-center text-[#CF6432] hover:bg-[#CF6432]/10 rounded-lg"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <PaginationControls
                  page={shoppingPagination.page}
                  totalPages={shoppingPagination.totalPages}
                  totalItems={shoppingPagination.totalItems}
                  onPageChange={shoppingPagination.setPage}
                  itemLabel="Artikel"
                />
              </>
            )}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#597CD4]" />
                Dokumentenablage
              </h2>
              <button
                type="button"
                onClick={() => {
                  setDocTitle('');
                  setShowDocModal(true);
                }}
                className="px-3 py-1.5 rounded-xl bg-[#233A29] text-white text-xs font-semibold inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Dokument
              </button>
            </div>

            {activeDocuments.length === 0 ? (
              <EmptyState
                title="Noch keine Dokumente verknüpft"
                description="Lege Verweise auf Rechnungen, Baupläne, Tierunterlagen, Bodenanalysen oder Bedienungsanleitungen ab."
              />
            ) : (
              <>
                <div className="space-y-2">
                  {documentPagination.pageItems.map((d) => (
                    <div
                      key={d.id}
                      className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-xl p-3.5 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-sm truncate">{d.title}</div>
                        <div className="text-xs text-neutral-500">
                          {d.payload.docType} · {d.payload.linkedModule} · <span className="font-mono-num">{d.payload.date}</span>
                        </div>
                        {d.payload.notes && (
                          <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-0.5 truncate">
                            {d.payload.notes}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => archiveRecord('documents', d.id, d.title)}
                        className="min-h-[38px] min-w-[38px] flex items-center justify-center text-[#CF6432] hover:bg-[#CF6432]/10 rounded-lg shrink-0"
                      >
                        <Archive className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <PaginationControls
                  page={documentPagination.page}
                  totalPages={documentPagination.totalPages}
                  totalItems={documentPagination.totalItems}
                  onPageChange={documentPagination.setPage}
                  itemLabel="Dokumente"
                />
              </>
            )}
          </section>
        </div>
      )}

      {/* 4. URLAUBS- & NOTFALLMODUS */}
      {tab === 'notfall' && (
        <form onSubmit={saveEmergency} className="space-y-5">
          <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display text-lg font-bold flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#CF6432]" />
                Urlaubs- & Notfallmodus (Offline verfügbar)
              </h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                Alle Vertretungspläne, Tierarzt-Kontakte und Ausfall-Checklisten werden automatisch lokal für Offline-Zugriff zwischengespeichert.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() =>
                  exportSummaryPdf(
                    'Notfall- & Urlaubsmappe — Hof & Garten',
                    `Mellenbach-Glasbach · Stand: ${todayStr}`,
                    [
                      {
                        heading: 'Vertretung & Zeitraum',
                        lines: [
                          `Urlaubsmodus aktiv: ${effectiveEmergency.vacationActive ? 'Ja' : 'Nein'}`,
                          `Vertretung: ${effectiveEmergency.substituteName || '–'} (${effectiveEmergency.substitutePhone || '–'})`,
                          `Zeitraum: ${effectiveEmergency.startDate} bis ${effectiveEmergency.endDate}`,
                        ],
                      },
                      {
                        heading: 'Tier- & Gartenanweisungen',
                        lines: [
                          `Fütterung: ${effectiveEmergency.feedingInstructions}`,
                          `Wasser: ${effectiveEmergency.waterInstructions}`,
                          `Stall/Klappen: ${effectiveEmergency.coopInstructions}`,
                          `Garten/Gewächshaus: ${effectiveEmergency.gardenInstructions}`,
                        ],
                      },
                      {
                        heading: 'Notfallkontakte & Protokolle',
                        lines: [
                          `Tierarzt: ${effectiveEmergency.vetName} (${effectiveEmergency.vetPhone} / Notdienst: ${effectiveEmergency.vetEmergencyPhone})`,
                          `Stromausfall: ${effectiveEmergency.protocolPowerOutage}`,
                          `Wasserausfall: ${effectiveEmergency.protocolWaterOutage}`,
                          `Sturm/Unwetter: ${effectiveEmergency.protocolStorm}`,
                          `Tiernotfall: ${effectiveEmergency.protocolAnimalEmergency}`,
                        ],
                      },
                    ],
                    `hof-notfallmappe-${todayStr}`
                  )
                }
                className="px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-medium inline-flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                Notfallmappe PDF
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#233A29] text-white text-xs font-semibold"
              >
                Plan speichern
              </button>
            </div>
          </div>

          <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <label className="md:col-span-2 flex items-center gap-2 font-semibold text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={effectiveEmergency.vacationActive}
                onChange={(e) =>
                  setEmergencyDraft({ ...effectiveEmergency, vacationActive: e.target.checked })
                }
              />
              Urlaubs-Vertretung aktuell aktivieren
            </label>

            <div>
              <label className="block font-medium mb-1">Vertretungsperson</label>
              <input
                type="text"
                value={effectiveEmergency.substituteName}
                onChange={(e) =>
                  setEmergencyDraft({ ...effectiveEmergency, substituteName: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412]"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Telefon Vertretung</label>
              <input
                type="text"
                value={effectiveEmergency.substitutePhone}
                onChange={(e) =>
                  setEmergencyDraft({ ...effectiveEmergency, substitutePhone: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412]"
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Fütterungsanleitung (Tiere)</label>
              <textarea
                rows={3}
                value={effectiveEmergency.feedingInstructions}
                onChange={(e) =>
                  setEmergencyDraft({ ...effectiveEmergency, feedingInstructions: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412]"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Stall / Tränken / Gewächshaus</label>
              <textarea
                rows={3}
                value={effectiveEmergency.coopInstructions}
                onChange={(e) =>
                  setEmergencyDraft({ ...effectiveEmergency, coopInstructions: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412]"
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Tierarzt & Notdienst</label>
              <input
                type="text"
                value={effectiveEmergency.vetName}
                onChange={(e) => setEmergencyDraft({ ...effectiveEmergency, vetName: e.target.value })}
                placeholder="Praxisname"
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] mb-2"
              />
              <input
                type="text"
                value={effectiveEmergency.vetEmergencyPhone}
                onChange={(e) =>
                  setEmergencyDraft({ ...effectiveEmergency, vetEmergencyPhone: e.target.value })
                }
                placeholder="Notrufnummer"
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412]"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Garten- & Gießanweisungen</label>
              <textarea
                rows={3}
                value={effectiveEmergency.gardenInstructions}
                onChange={(e) =>
                  setEmergencyDraft({ ...effectiveEmergency, gardenInstructions: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412]"
              />
            </div>

            <div>
              <label className="block font-medium mb-1">Protokoll Stromausfall</label>
              <textarea
                rows={2}
                value={effectiveEmergency.protocolPowerOutage}
                onChange={(e) =>
                  setEmergencyDraft({ ...effectiveEmergency, protocolPowerOutage: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412]"
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Protokoll Wasserausfall / Frost</label>
              <textarea
                rows={2}
                value={effectiveEmergency.protocolWaterOutage}
                onChange={(e) =>
                  setEmergencyDraft({ ...effectiveEmergency, protocolWaterOutage: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412]"
              />
            </div>
          </div>
        </form>
      )}

      {/* 5. JAHRESBERICHT & EXPORTE */}
      {tab === 'bericht' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold">
                  Jahresrückblick {selectedYear} (Vergleich zu {selectedYear - 1})
                </h2>
                <p className="text-xs text-neutral-500">
                  Automatisch aus euren echten Hofdaten berechnet
                </p>
              </div>
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-xs font-mono-num"
              >
                {[currentYearNum - 1, currentYearNum, currentYearNum + 1].map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412]">
                <div className="text-xs text-neutral-500">Ernte {selectedYear}</div>
                <div className="text-xl font-bold font-mono-num mt-1">{yearHarvestKg.toFixed(1)} kg</div>
                <div className="text-[11px] text-neutral-500 font-mono-num">
                  Vorjahr: {prevYearHarvestKg.toFixed(1)} kg
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412]">
                <div className="text-xs text-neutral-500">Eier {selectedYear}</div>
                <div className="text-xl font-bold font-mono-num mt-1">{yearEggs} Stk.</div>
              </div>
              <div className="p-4 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412]">
                <div className="text-xs text-neutral-500">Bilanz {selectedYear}</div>
                <div className="text-xl font-bold font-mono-num mt-1">
                  {(yearIncome - yearExpenses).toFixed(2)} €
                </div>
              </div>
              <div className="p-4 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412]">
                <div className="text-xs text-neutral-500">Selbstversorgung</div>
                <div className="text-xl font-bold font-mono-num mt-1">{selfSufficiencyPercent} %</div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-3">
            <h3 className="font-display text-base font-bold">Vollständige Datenexporte & Backups</h3>
            <p className="text-xs text-neutral-500">
              Alle Exporte enthalten ausschließlich echte Datenbankinhalte. JSON-Backups sichern alle IDs und Verknüpfungen.
            </p>
            <div className="flex flex-wrap gap-2.5 pt-1">
              <button
                type="button"
                onClick={handleAnnualPdf}
                className="px-4 py-2.5 rounded-xl bg-[#233A29] text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Download className="w-4 h-4" />
                Jahresbericht (.pdf)
              </button>
              <button
                type="button"
                onClick={handleFullExcelExport}
                className="px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <Download className="w-4 h-4" />
                Gesamtexport Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => {
                  exportCsv(
                    harvests
                      .filter((h) => !h.archived)
                      .map((h) => ({
                        Datum: h.payload.date,
                        Kultur: h.title,
                        Sorte: h.payload.variety,
                        Beet: h.payload.areaName,
                        Menge: h.payload.amount,
                        Einheit: h.payload.unit,
                      })),
                    `hof-ernten-${todayStr}`
                  );
                }}
                className="px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <Download className="w-4 h-4" />
                Ernten (.csv)
              </button>
              <button
                type="button"
                onClick={() => downloadIcsFile(calendarEvents.filter((e) => !e.archived), `hof-kalender-${todayStr}`)}
                className="px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <Download className="w-4 h-4" />
                Kalender (.ics)
              </button>
              <button
                type="button"
                onClick={handleFullJsonBackup}
                className="px-4 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold inline-flex items-center gap-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <Download className="w-4 h-4" />
                Vollständiges Backup (.json)
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 6. EINSTELLUNGEN, PUSH, AUDIT LOG & PAPIERKORB */}
      {tab === 'einstellungen' && (
        <div className="space-y-6">
          {/* Notification Settings */}
          <section className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="font-display text-lg font-bold flex items-center gap-2">
                  <Bell className="w-4 h-4 text-[#597CD4]" />
                  Benachrichtigungen & Web-Push ({activeIdentity})
                </h2>
                <p className="text-xs text-neutral-500">
                  Persönliche Einstellungen pro Konto · Auf iPhone nach „Zum Home-Bildschirm“ verfügbar
                </p>
              </div>
              <button
                type="button"
                onClick={async () => {
                  const res = await requestPushPermission();
                  pushToast(
                    res.granted ? 'success' : 'warning',
                    res.reason || 'Push-Benachrichtigungen aktiviert.'
                  );
                }}
                className="px-3.5 py-2 rounded-xl bg-[#233A29] text-white text-xs font-semibold"
              >
                Push-Berechtigung aktivieren
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifPrefs.instantPush}
                  onChange={(e) => updateNotifField({ ...notifPrefs, instantPush: e.target.checked })}
                />
                Sofortige Benachrichtigungen (inkl. Ping)
              </label>
              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifPrefs.dailySummary}
                  onChange={(e) => updateNotifField({ ...notifPrefs, dailySummary: e.target.checked })}
                />
                Tägliche Zusammenfassung
              </label>
              <label className="flex items-center gap-2 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 cursor-pointer">
                <input
                  type="checkbox"
                  checked={notifPrefs.quietHoursEnabled}
                  onChange={(e) =>
                    updateNotifField({ ...notifPrefs, quietHoursEnabled: e.target.checked })
                  }
                />
                Ruhezeiten ({notifPrefs.quietStart} – {notifPrefs.quietEnd})
              </label>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 text-xs">
              {(
                [
                  ['general', 'Allgemein & Ping'],
                  ['calendar', 'Kalender'],
                  ['weather', 'Wetter'],
                  ['garden', 'Garten'],
                  ['animals', 'Tiere'],
                  ['pantry', 'Vorräte'],
                  ['projects', 'Projekte'],
                ] as const
              ).map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-1.5 p-2 rounded-lg bg-[#F7F7F5] dark:bg-[#0F1412] cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={notifPrefs.categories[key]}
                    onChange={(e) =>
                      updateNotifField({
                        ...notifPrefs,
                        categories: { ...notifPrefs.categories, [key]: e.target.checked },
                      })
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </section>

          {/* Firebase & Netlify Deployment Reference */}
          <section className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-2 text-xs">
            <h3 className="font-display text-base font-bold">
              Projektkonfiguration (Firebase & GitHub/Netlify)
            </h3>
            <p className="text-neutral-600 dark:text-neutral-400">
              Firebase-Projekt: <code className="font-mono">{FIREBASE_PROJECT_ID}</code> · Datenbank:{' '}
              <code className="font-mono">{FIREBASE_DATABASE_ID}</code>
            </p>
            <p className="text-neutral-600 dark:text-neutral-400">
              Für GitHub + Netlify Deployment sind <code className="font-mono">netlify.toml</code>,{' '}
              <code className="font-mono">netlify/functions/assistant.ts</code> und{' '}
              <code className="font-mono">DEPLOYMENT.md</code> im Repository eingerichtet.
            </p>
          </section>

          {/* Audit Log */}
          <section className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-3">
            <h3 className="font-display text-base font-bold flex items-center gap-2">
              <History className="w-4 h-4 text-[#597CD4]" />
              Änderungsverlauf (Wer · Was · Wann)
            </h3>
            {auditLogs.length === 0 ? (
              <p className="text-xs text-neutral-500">Noch keine protokollierten Änderungen.</p>
            ) : (
              <>
                <div className="space-y-1.5 text-xs">
                  {auditPagination.pageItems.map((log) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between gap-2 py-1.5 border-b border-neutral-100 dark:border-neutral-800/70"
                    >
                      <span className="truncate">
                        <strong>{log.actorName}</strong> · {log.summary}
                      </span>
                      <span className="font-mono-num text-neutral-500 shrink-0">
                        {new Date(log.createdAtMs).toLocaleString('de-DE')}
                      </span>
                    </div>
                  ))}
                </div>
                <PaginationControls
                  page={auditPagination.page}
                  totalPages={auditPagination.totalPages}
                  totalItems={auditPagination.totalItems}
                  onPageChange={auditPagination.setPage}
                  itemLabel="Einträge"
                />
              </>
            )}
          </section>

          {/* Soft-Delete Trash / Restore */}
          <section className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-3">
            <h3 className="font-display text-base font-bold flex items-center gap-2">
              <Trash2 className="w-4 h-4 text-[#CF6432]" />
              Papierkorb & Wiederherstellung ({archivedAll.length})
            </h3>
            {archivedAll.length === 0 ? (
              <p className="text-xs text-neutral-500">Der Papierkorb ist leer.</p>
            ) : (
              <>
                <div className="space-y-2">
                  {trashPagination.pageItems.map(({ col, label, rec }) => (
                    <div
                      key={`${col}_${rec.id}`}
                      className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412] text-xs"
                    >
                      <div className="min-w-0">
                        <div className="font-medium truncate">{rec.title}</div>
                        <div className="text-neutral-500">{label}</div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => restoreRecord(col, rec.id, rec.title)}
                          className="min-h-[36px] px-2.5 py-1.5 rounded-lg bg-[#233A29] text-white inline-flex items-center gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Wiederherstellen
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteRecordPermanently(col, rec.id, rec.title)}
                          className="min-h-[36px] px-2.5 py-1.5 rounded-lg border border-[#CF6432]/40 text-[#CF6432]"
                        >
                          Endgültig löschen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <PaginationControls
                  page={trashPagination.page}
                  totalPages={trashPagination.totalPages}
                  totalItems={trashPagination.totalItems}
                  onPageChange={trashPagination.setPage}
                  itemLabel="Einträge"
                />
              </>
            )}
          </section>

          {/* Account Deletion */}
          <section className="bg-white dark:bg-[#161D1A] border border-[#CF6432]/40 rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-base font-bold text-[#CF6432]">
                Eigenes Benutzerkonto löschen
              </h3>
              <p className="text-xs text-neutral-600 dark:text-neutral-400">
                Entfernt dein persönliches Konto ({userProfile?.email}). Gemeinsame Hofdaten bleiben erhalten.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteAccountModal(true)}
              className="px-4 py-2 rounded-xl border border-[#CF6432] text-[#CF6432] text-xs font-semibold hover:bg-[#CF6432]/10 shrink-0"
            >
              Konto löschen
            </button>
          </section>
        </div>
      )}

      {/* Finance Modal */}
      <Modal
        open={showFinModal}
        onClose={() => setShowFinModal(false)}
        title={editingFin ? 'Buchung bearbeiten' : 'Neue Ausgabe / Einnahme'}
      >
        <form onSubmit={saveFinance} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFinPayload({ ...finPayload, entryType: 'Ausgabe' })}
              className={`py-2 rounded-xl border text-xs font-semibold ${
                finPayload.entryType === 'Ausgabe'
                  ? 'bg-[#CF6432] text-white border-[#CF6432]'
                  : 'border-neutral-300 dark:border-neutral-700'
              }`}
            >
              Ausgabe
            </button>
            <button
              type="button"
              onClick={() => setFinPayload({ ...finPayload, entryType: 'Einnahme' })}
              className={`py-2 rounded-xl border text-xs font-semibold ${
                finPayload.entryType === 'Einnahme'
                  ? 'bg-[#233A29] text-white border-[#233A29]'
                  : 'border-neutral-300 dark:border-neutral-700'
              }`}
            >
              Einnahme / Eigenwert
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Bezeichnung *</label>
              <input
                type="text"
                required
                value={finTitle}
                onChange={(e) => setFinTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Betrag (€)</label>
              <input
                type="number"
                step="0.01"
                required
                value={finPayload.amountEur}
                onChange={(e) => setFinPayload({ ...finPayload, amountEur: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Datum</label>
              <input
                type="date"
                value={finPayload.date}
                onChange={(e) => setFinPayload({ ...finPayload, date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Kategorie</label>
              <input
                type="text"
                value={finPayload.category}
                onChange={(e) => setFinPayload({ ...finPayload, category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Haushaltsbedarf (€ optional)</label>
              <input
                type="number"
                step="0.01"
                value={finPayload.selfSupplyNeedEur || 0}
                onChange={(e) =>
                  setFinPayload({ ...finPayload, selfSupplyNeedEur: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowFinModal(false)}
              className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs"
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

      {/* Equipment Modal */}
      <Modal
        open={showEquipModal}
        onClose={() => setShowEquipModal(false)}
        title={editingEquip ? 'Werkzeug / Gerät bearbeiten' : 'Werkzeug / Gerät erfassen'}
      >
        <form onSubmit={saveEquipment} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Bezeichnung *</label>
              <input
                type="text"
                required
                value={equipTitle}
                onChange={(e) => setEquipTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Kategorie</label>
              <input
                type="text"
                value={equipPayload.category}
                onChange={(e) => setEquipPayload({ ...equipPayload, category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Lagerort</label>
              <input
                type="text"
                value={equipPayload.location}
                onChange={(e) => setEquipPayload({ ...equipPayload, location: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Wartungsintervall (Tage)</label>
              <input
                type="number"
                value={equipPayload.maintenanceIntervalDays}
                onChange={(e) =>
                  setEquipPayload({ ...equipPayload, maintenanceIntervalDays: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Letzte Wartung</label>
              <input
                type="date"
                value={equipPayload.lastMaintenanceDate}
                onChange={(e) =>
                  setEquipPayload({ ...equipPayload, lastMaintenanceDate: e.target.value })
                }
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Hersteller</label>
              <input
                type="text"
                value={equipPayload.manufacturer}
                onChange={(e) => setEquipPayload({ ...equipPayload, manufacturer: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Kaufpreis (€)</label>
              <input
                type="number"
                value={equipPayload.purchasePriceEur}
                onChange={(e) =>
                  setEquipPayload({ ...equipPayload, purchasePriceEur: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowEquipModal(false)}
              className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs"
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

      {/* Shopping Modal */}
      <Modal
        open={showShopModal}
        onClose={() => setShowShopModal(false)}
        title="Einkaufsartikel hinzufügen"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!shopTitle.trim()) return;
            await createRecord('shoppingItems', shopTitle, shopPayload);
            pushToast('success', 'Zur Einkaufsliste hinzugefügt.');
            setShowShopModal(false);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-medium mb-1">Artikel *</label>
            <input
              type="text"
              required
              value={shopTitle}
              onChange={(e) => setShopTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Menge</label>
              <input
                type="number"
                value={shopPayload.quantity}
                onChange={(e) => setShopPayload({ ...shopPayload, quantity: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Einheit</label>
              <input
                type="text"
                value={shopPayload.unit}
                onChange={(e) => setShopPayload({ ...shopPayload, unit: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Kategorie</label>
              <select
                value={shopPayload.category}
                onChange={(e) =>
                  setShopPayload({
                    ...shopPayload,
                    category: e.target.value as ShoppingPayload['category'],
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              >
                <option value="Saatgut">Saatgut</option>
                <option value="Futter">Futter</option>
                <option value="Baumaterial">Baumaterial</option>
                <option value="Verbrauchsmaterial">Verbrauchsmaterial</option>
                <option value="Vorrat">Vorrat</option>
                <option value="Werkzeug">Werkzeug</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowShopModal(false)}
              className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-[#233A29] text-white text-xs font-semibold"
            >
              Hinzufügen
            </button>
          </div>
        </form>
      </Modal>

      {/* Document Modal */}
      <Modal
        open={showDocModal}
        onClose={() => setShowDocModal(false)}
        title="Dokumenteintrag erfassen"
      >
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!docTitle.trim()) return;
            await createRecord('documents', docTitle, docPayload);
            pushToast('success', 'Dokument gespeichert.');
            setShowDocModal(false);
          }}
          className="space-y-4"
        >
          <div>
            <label className="block text-xs font-medium mb-1">Dokumenttitel *</label>
            <input
              type="text"
              required
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Typ</label>
              <select
                value={docPayload.docType}
                onChange={(e) =>
                  setDocPayload({ ...docPayload, docType: e.target.value as DocumentPayload['docType'] })
                }
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              >
                <option value="Rechnung">Rechnung</option>
                <option value="Bauplan">Bauplan</option>
                <option value="Bedienungsanleitung">Bedienungsanleitung</option>
                <option value="Tierunterlage">Tierunterlage</option>
                <option value="Rezept">Rezept</option>
                <option value="Bodenanalyse">Bodenanalyse</option>
                <option value="Pflanzplan">Pflanzplan</option>
                <option value="Grundstück">Grundstück</option>
                <option value="Sonstiges">Sonstiges</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Datum</label>
              <input
                type="date"
                value={docPayload.date}
                onChange={(e) => setDocPayload({ ...docPayload, date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Ablageort / Notiz</label>
            <textarea
              rows={2}
              value={docPayload.notes}
              onChange={(e) => setDocPayload({ ...docPayload, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowDocModal(false)}
              className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs"
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

      {/* Account Deletion Modal */}
      <Modal
        open={showDeleteAccountModal}
        onClose={() => setShowDeleteAccountModal(false)}
        title="Benutzerkonto unwiderruflich löschen"
        maxWidthClass="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-[#CF6432]/15 text-[#9A3E14] dark:text-[#F49D76] flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              Diese Aktion löscht dein Firebase-Login-Konto ({userProfile?.email}) und dein persönliches Profil. Gemeinsame Hof-Einträge bleiben bestehen.
            </span>
          </div>
          <div>
            <label className="block font-medium mb-1">
              Tippe zur Bestätigung <strong>LÖSCHEN</strong> ein:
            </label>
            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412]"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowDeleteAccountModal(false)}
              className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700"
            >
              Abbrechen
            </button>
            <button
              type="button"
              disabled={deleteConfirmText !== 'LÖSCHEN'}
              onClick={async () => {
                await deleteOwnAccount();
                setShowDeleteAccountModal(false);
              }}
              className="px-4 py-2 rounded-xl bg-[#CF6432] text-white font-semibold disabled:opacity-40"
            >
              Endgültig löschen
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
