import React, { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Archive,
  Minus,
  Plus,
  Printer,
  QrCode,
  Save,
  ShieldAlert,
  ShoppingCart,
  Sparkles,
  UtensilsCrossed,
} from 'lucide-react';
import { useHomestead } from '../context/HomesteadContext';
import {
  EmptyState,
  Modal,
  ModuleHeader,
  PaginationControls,
  SegmentedTabs,
  usePagination,
} from '../components/ui/SharedUI';
import type {
  BatchPayload,
  HarvestAllocationType,
  HarvestPayload,
  HomesteadRecord,
  InventoryItemPayload,
  MealPlanDayEntry,
  RecipePayload,
} from '../types/homestead';

const WEEKDAYS_DE = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

const ALLOCATION_OPTIONS: HarvestAllocationType[] = [
  'Frischverbrauch',
  'Einkochen',
  'Einfrieren',
  'Fermentieren',
  'Trocknen',
  'Entsaften',
  'Marmeladen & Gelees',
  'Lagerung',
  'Tierfutter',
  'Verschenken',
];

const STORAGE_LOCATIONS: InventoryItemPayload['location'][] = [
  'Vorratsraum',
  'Keller',
  'Gefrierschrank',
  'Kühlschrank',
  'Regal',
  'Schrank',
  'Speisekammer',
  'Sonstiger Ort',
];

export const PantryView: React.FC = () => {
  const {
    harvests,
    batches,
    inventoryItems,
    recipes,
    areas,
    plantings,
    animalLogs,
    sharedMealPlan,
    updateMealPlan,
    deepLinkBatch,
    setDeepLinkBatch,
    createRecord,
    updateRecord,
    archiveRecord,
    pushToast,
  } = useHomestead();

  const [tab, setTab] = useState<'harvests' | 'batches' | 'inventory' | 'recipes' | 'mealplan'>('inventory');
  const [mealDraft, setMealDraft] = useState<Record<string, MealPlanDayEntry>>({});
  const [savingMealPlan, setSavingMealPlan] = useState(false);
  const [quickMissingItem, setQuickMissingItem] = useState('');
  const [qrBatchModal, setQrBatchModal] = useState<HomesteadRecord<BatchPayload> | null>(null);

  useEffect(() => {
    setMealDraft(sharedMealPlan || {});
  }, [sharedMealPlan]);

  // Recipe scaling & suggestions
  const [availableInputKg, setAvailableInputKg] = useState<number>(4.5);
  const [availableCropInput, setAvailableCropInput] = useState<string>('Johannisbeeren');
  const [selectedRecipe, setSelectedRecipe] = useState<HomesteadRecord<RecipePayload> | null>(null);
  const [scaleRawKg, setScaleRawKg] = useState<number>(1.0);

  // Harvest modal
  const [harvestModal, setHarvestModal] = useState(false);
  const [harvestForm, setHarvestForm] = useState<HarvestPayload>({
    plantId: '',
    plantName: 'Johannisbeeren',
    variety: '',
    areaId: '',
    areaName: '',
    date: new Date().toISOString().slice(0, 10),
    amount: 4.5,
    unit: 'kg',
    quality: 'Sehr gut',
    allocations: { 'Marmeladen & Gelees': 3.5, Frischverbrauch: 1.0 },
    notes: '',
  });

  // Batch modal
  const [batchModal, setBatchModal] = useState(false);
  const [batchForm, setBatchForm] = useState<BatchPayload>({
    batchNumber: `CH-${new Date().getFullYear()}-${String(batches.length + 1).padStart(3, '0')}`,
    product: '',
    category: 'Einkochen',
    date: new Date().toISOString().slice(0, 10),
    rawMaterial: '',
    rawAmountKg: 2,
    ingredientsSummary: '',
    method: '',
    unitCount: 6,
    packageSize: '350 ml Glas',
    storageLocation: 'Keller',
    costEur: 4.5,
    qualityControl: 'Bestanden',
    hygieneChecked: true,
    safetyTemperatureNote: '',
    notes: '',
  });

  // Inventory modal
  const [invModal, setInvModal] = useState(false);
  const [invForm, setInvForm] = useState<InventoryItemPayload>({
    category: 'Einkochen',
    quantity: 6,
    unit: 'Gläser',
    producedDate: new Date().toISOString().slice(0, 10),
    storedDate: new Date().toISOString().slice(0, 10),
    location: 'Keller',
    origin: 'Eigene Ernte',
    batchNumber: '',
    qualityStatus: 'Einwandfrei',
    minQuantity: 2,
    consumedTotal: 0,
    notes: '',
  });
  const [invTitle, setInvTitle] = useState('');

  const activeHarvests = useMemo(() => harvests.filter((h) => !h.archived), [harvests]);
  const activeBatches = useMemo(() => batches.filter((b) => !b.archived), [batches]);
  const activeInventory = useMemo(() => inventoryItems.filter((i) => !i.archived), [inventoryItems]);
  const activeRecipes = useMemo(() => recipes.filter((r) => !r.archived), [recipes]);
  const activeAreas = useMemo(() => areas.filter((a) => !a.archived), [areas]);

  // Open scanned QR batch automatically when ?batch=... is present
  useEffect(() => {
    if (!deepLinkBatch || activeBatches.length === 0) return;
    const found = activeBatches.find((b) => b.payload.batchNumber === deepLinkBatch);
    if (found) {
      setTab('batches');
      setQrBatchModal(found);
      setDeepLinkBatch(null);
    }
  }, [deepLinkBatch, activeBatches, setDeepLinkBatch]);

  // Harvest analytics
  const harvestByPlant = useMemo(() => {
    const map = new Map<string, number>();
    for (const h of activeHarvests) {
      if (h.payload.unit === 'kg') {
        map.set(h.payload.plantName, (map.get(h.payload.plantName) || 0) + h.payload.amount);
      }
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [activeHarvests]);

  const harvestByArea = useMemo(() => {
    const map = new Map<string, { kg: number; sqm: number }>();
    for (const h of activeHarvests) {
      if (h.payload.unit === 'kg') {
        const area = activeAreas.find((a) => a.title === h.payload.areaName);
        const cur = map.get(h.payload.areaName || 'Unbekannt') || { kg: 0, sqm: area?.payload.sizeSqm || 0 };
        cur.kg += h.payload.amount;
        map.set(h.payload.areaName || 'Unbekannt', cur);
      }
    }
    return Array.from(map.entries());
  }, [activeHarvests, activeAreas]);

  const suggestedRecipes = useMemo(() => {
    const q = availableCropInput.trim().toLowerCase();
    return activeRecipes.filter((r) => {
      if (!q) return true;
      return (
        r.payload.linkedPlant.toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.payload.ingredients.some((ing) => ing.name.toLowerCase().includes(q))
      );
    });
  }, [activeRecipes, availableCropInput]);

  const inventoryPagination = usePagination(activeInventory, 6);
  const batchPagination = usePagination(activeBatches, 4);
  const harvestPagination = usePagination(activeHarvests, 5);
  const recipePagination = usePagination(suggestedRecipes, 4);

  const saveHarvest = async (e: React.FormEvent) => {
    e.preventDefault();
    const areaObj = activeAreas.find((a) => a.id === harvestForm.areaId);
    const areaName = areaObj?.title || harvestForm.areaName || 'Garten';
    const title = `${harvestForm.plantName} (${harvestForm.amount} ${harvestForm.unit})`;
    await createRecord('harvests', title, { ...harvestForm, areaName });
    pushToast('success', `Ernte „${title}“ gespeichert.`);
    setHarvestModal(false);
  };

  const saveBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!batchForm.hygieneChecked) {
      pushToast('warning', 'Bitte Hygienekontrolle bestätigen.');
      return;
    }
    const title = `${batchForm.product} (${batchForm.batchNumber})`;
    await createRecord('batches', title, batchForm);
    // Automatically add resulting units to Vorratskammer
    await createRecord('inventoryItems', batchForm.product, {
      category: batchForm.category,
      quantity: batchForm.unitCount,
      unit: batchForm.packageSize,
      producedDate: batchForm.date,
      storedDate: batchForm.date,
      location: (STORAGE_LOCATIONS.includes(batchForm.storageLocation as InventoryItemPayload['location'])
        ? batchForm.storageLocation
        : 'Vorratsraum') as InventoryItemPayload['location'],
      origin: `Charge ${batchForm.batchNumber}`,
      batchNumber: batchForm.batchNumber,
      qualityStatus: 'Einwandfrei',
      minQuantity: 1,
      consumedTotal: 0,
      notes: batchForm.notes,
    });
    pushToast('success', `Charge ${batchForm.batchNumber} erstellt & in den Vorrat eingebucht.`);
    setBatchModal(false);
  };

  const saveInventory = async (e: React.FormEvent) => {
    e.preventDefault();
    await createRecord('inventoryItems', invTitle, invForm);
    pushToast('success', `Vorrat „${invTitle}“ gespeichert.`);
    setInvModal(false);
  };

  const withdrawOne = async (item: HomesteadRecord<InventoryItemPayload>) => {
    if (item.payload.quantity <= 0) return;
    await updateRecord(
      'inventoryItems',
      item.id,
      item.title,
      {
        ...item.payload,
        quantity: Math.max(0, item.payload.quantity - 1),
        consumedTotal: (item.payload.consumedTotal || 0) + 1,
      },
      item.updatedAtMs
    );
    pushToast('info', `1 Entnahme von „${item.title}“ verbucht.`);
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Ernte, Verarbeitung & Vorratskammer"
        subtitle="Erntedokumentation, geprüfte Konservierung, Chargen mit QR-Etikett, Lagerorte & Rezeptvorschläge"
        actions={
          <>
            <button
              type="button"
              onClick={() => setHarvestModal(true)}
              className="px-3.5 py-2 rounded-xl bg-[#FFC814] text-[#18201B] text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Ernte erfassen
            </button>
            <button
              type="button"
              onClick={() => {
                setBatchForm({
                  ...batchForm,
                  batchNumber: `CH-${new Date().getFullYear()}-${String(batches.length + 1).padStart(3, '0')}`,
                });
                setBatchModal(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-[#CF6432] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Neue Charge
            </button>
            <button
              type="button"
              onClick={() => setInvModal(true)}
              className="px-3.5 py-2 rounded-xl bg-[#233A29] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Vorrat
            </button>
          </>
        }
      />

      <SegmentedTabs
        activeTab={tab}
        onChange={(id) => setTab(id as typeof tab)}
        tabs={[
          { id: 'inventory', label: `Vorratskammer (${activeInventory.length})` },
          { id: 'mealplan', label: 'Wochenplan & Küche' },
          { id: 'batches', label: `Chargen & QR (${activeBatches.length})` },
          { id: 'harvests', label: `Ernten (${activeHarvests.length})` },
          { id: 'recipes', label: `Rezepte & Vorschläge (${activeRecipes.length})` },
        ]}
      />

      {/* TAB 1: Vorratskammer */}
      {tab === 'inventory' && (
        <>
          {activeInventory.length === 0 ? (
            <EmptyState
              title="Vorratskammer ist leer"
              description="Neue Verarbeitungschargen werden automatisch eingebucht, oder du legst Frisch- und Trockenvorräte direkt an."
              actionLabel="Ersten Vorrat anlegen"
              onAction={() => setInvModal(true)}
            />
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {inventoryPagination.pageItems.map((item) => {
                  const low = item.payload.quantity <= item.payload.minQuantity;
                  return (
                    <div
                      key={item.id}
                      className={`bg-white dark:bg-[#161D1A] border rounded-2xl p-4 sm:p-5 space-y-3 ${
                        low ? 'border-[#CF6432]' : 'border-neutral-200 dark:border-neutral-800'
                      }`}
                    >
                      <div className="flex items-center justify-between text-xs text-neutral-500">
                        <span>{item.payload.location} · {item.payload.category}</span>
                        {item.payload.batchNumber && (
                          <span className="font-mono-num">{item.payload.batchNumber}</span>
                        )}
                      </div>
                      <h3 className="font-display text-base font-bold">{item.title}</h3>
                      <div className="flex items-end justify-between">
                        <div>
                          <span className="text-2xl font-bold font-mono-num">{item.payload.quantity}</span>{' '}
                          <span className="text-xs text-neutral-500">{item.payload.unit}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => withdrawOne(item)}
                          disabled={item.payload.quantity <= 0}
                          className="min-h-[38px] px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-medium inline-flex items-center gap-1 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-40"
                        >
                          <Minus className="w-3.5 h-3.5" />
                          1 Entnahme
                        </button>
                      </div>
                      <div className="text-xs text-neutral-500 flex items-center justify-between pt-2 border-t border-neutral-100 dark:border-neutral-800 gap-2">
                        <button
                          type="button"
                          onClick={() =>
                            updateRecord(
                              'inventoryItems',
                              item.id,
                              item.title,
                              {
                                ...item.payload,
                                qualityStatus:
                                  item.payload.qualityStatus === 'Bald verbrauchen'
                                    ? 'Einwandfrei'
                                    : 'Bald verbrauchen',
                              },
                              item.updatedAtMs
                            )
                          }
                          className={`px-2 py-0.5 rounded font-medium ${
                            item.payload.qualityStatus === 'Bald verbrauchen'
                              ? 'bg-[#FFC814]/25 text-[#7A4400] dark:text-[#FFD65A]'
                              : 'hover:bg-neutral-100 dark:hover:bg-neutral-800'
                          }`}
                          title="Klicken zum Umschalten: Einwandfrei / Bald verbrauchen"
                        >
                          {item.payload.qualityStatus}
                        </button>
                        <button
                          type="button"
                          onClick={() => archiveRecord('inventoryItems', item.id, item.title)}
                          className="min-h-[32px] text-[#CF6432] hover:underline"
                        >
                          Archivieren
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
              <PaginationControls
                page={inventoryPagination.page}
                totalPages={inventoryPagination.totalPages}
                totalItems={inventoryPagination.totalItems}
                onPageChange={inventoryPagination.setPage}
                itemLabel="Vorräte"
              />
            </div>
          )}
        </>
      )}

      {/* TAB 2: Chargen & QR-Etiketten */}
      {tab === 'batches' && (
        <div className="space-y-4">
          <div className="p-4 rounded-xl bg-[#CF6432]/10 border border-[#CF6432]/35 text-xs flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-[#CF6432] shrink-0 mt-0.5" />
            <span>
              <strong>Lebensmittelsicherheit:</strong> Einkochzeiten und -temperaturen richten sich strikt nach geprüften Standardverfahren (z.B. BZfE / Weck) und dem Säuregehalt des Rohguts. Keine pauschalen Haltbarkeitsversprechen.
            </span>
          </div>

          {activeBatches.length === 0 ? (
            <EmptyState
              title="Noch keine Verarbeitungscharge"
              description="Lege eine Charge mit eindeutiger Chargennummer an, um QR-Etiketten für Gläser und Vorräte zu drucken."
              actionLabel="Erste Charge anlegen"
              onAction={() => setBatchModal(true)}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {batchPagination.pageItems.map((b) => (
                  <div
                    key={b.id}
                    className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1.5 min-w-0">
                      <div className="text-xs font-mono-num text-[#CF6432] font-semibold">
                        {b.payload.batchNumber} · {b.payload.date}
                      </div>
                      <h3 className="font-display text-lg font-bold truncate">{b.payload.product}</h3>
                      <div className="text-xs text-neutral-600 dark:text-neutral-400">
                        {b.payload.unitCount} × {b.payload.packageSize} · Lagerort: {b.payload.storageLocation}
                      </div>
                      <div className="text-xs text-neutral-500">
                        Verfahren: {b.payload.method || b.payload.category} · Qualität: {b.payload.qualityControl}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => setQrBatchModal(b)}
                        className="min-h-[38px] px-3 py-2 rounded-xl bg-[#233A29] text-white text-xs font-semibold inline-flex items-center gap-1.5"
                      >
                        <QrCode className="w-4 h-4" />
                        QR-Etikett
                      </button>
                      <button
                        type="button"
                        onClick={() => archiveRecord('batches', b.id, b.title)}
                        className="min-h-[32px] text-xs text-[#CF6432] hover:underline"
                      >
                        Archivieren
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              <PaginationControls
                page={batchPagination.page}
                totalPages={batchPagination.totalPages}
                totalItems={batchPagination.totalItems}
                onPageChange={batchPagination.setPage}
                itemLabel="Chargen"
              />
            </>
          )}
        </div>
      )}

      {/* TAB 3: Ernteverwaltung & Auswertungen */}
      {tab === 'harvests' && (
        <div className="space-y-5">
          {harvestByPlant.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-2">
                <h3 className="font-display text-base font-semibold">Ernte pro Pflanze (kg)</h3>
                <div className="space-y-1.5 text-xs">
                  {harvestByPlant.map(([plant, kg]) => (
                    <div key={plant} className="flex justify-between">
                      <span>{plant}</span>
                      <span className="font-mono-num font-semibold">{kg.toFixed(2)} kg</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-2">
                <h3 className="font-display text-base font-semibold">Ernte pro Beet & pro m²</h3>
                <div className="space-y-1.5 text-xs">
                  {harvestByArea.map(([area, info]) => (
                    <div key={area} className="flex justify-between">
                      <span>{area}</span>
                      <span className="font-mono-num font-semibold">
                        {info.kg.toFixed(2)} kg{' '}
                        {info.sqm > 0 ? `(${(info.kg / info.sqm).toFixed(2)} kg/m²)` : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeHarvests.length === 0 ? (
            <EmptyState
              title="Noch keine Ernten dokumentiert"
              description="Erfasse jede Ernte mit Menge, Qualität und Verwendungsaufteilung (Frisch, Einkochen, Einfrieren, Trocknen…)."
              actionLabel="Erste Ernte erfassen"
              onAction={() => setHarvestModal(true)}
            />
          ) : (
            <>
              <div className="space-y-3">
                {harvestPagination.pageItems.map((h) => (
                  <div
                    key={h.id}
                    className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-semibold text-sm">
                        {h.payload.plantName} {h.payload.variety ? `(${h.payload.variety})` : ''} —{' '}
                        <span className="font-mono-num">
                          {h.payload.amount} {h.payload.unit}
                        </span>
                      </div>
                      <div className="text-xs text-neutral-500 mt-0.5">
                        {h.payload.date} · {h.payload.areaName || 'Garten'} · Qualität: {h.payload.quality}
                      </div>
                      {Object.keys(h.payload.allocations || {}).length > 0 && (
                        <div className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">
                          Verwendung:{' '}
                          {Object.entries(h.payload.allocations)
                            .filter(([, v]) => Number(v) > 0)
                            .map(([k, v]) => `${k}: ${v} ${h.payload.unit}`)
                            .join(' · ')}
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => archiveRecord('harvests', h.id, h.title)}
                      className="min-h-[36px] text-xs text-[#CF6432] hover:underline"
                    >
                      <Archive className="w-4 h-4 inline mr-1" />
                      Archivieren
                    </button>
                  </div>
                ))}
              </div>
              <PaginationControls
                page={harvestPagination.page}
                totalPages={harvestPagination.totalPages}
                totalItems={harvestPagination.totalItems}
                onPageChange={harvestPagination.setPage}
                itemLabel="Ernten"
              />
            </>
          )}
        </div>
      )}

      {/* TAB 4: Rezepte & Automatische Vorschläge */}
      {tab === 'recipes' && (
        <div className="space-y-5">
          <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-3">
            <h3 className="font-display text-base font-semibold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#CF6432]" />
              Automatischer Rezeptvorschlag & Zutatenrechner
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Verfügbares Erntegut</label>
                <input
                  type="text"
                  value={availableCropInput}
                  onChange={(e) => setAvailableCropInput(e.target.value)}
                  placeholder="z.B. Johannisbeeren, Äpfel, Weißkohl"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Verfügbare Menge (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  min="0.1"
                  value={availableInputKg}
                  onChange={(e) => setAvailableInputKg(Number(e.target.value) || 1)}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm font-mono-num"
                />
              </div>
              <div className="flex items-end text-xs text-neutral-500 pb-2">
                {suggestedRecipes.length} passende Rezept(e) gefunden — Mengen werden automatisch skaliert.
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {recipePagination.pageItems.map((r) => {
              const factor = r.payload.baseRawAmountKg > 0 ? availableInputKg / r.payload.baseRawAmountKg : 1;
              return (
                <div
                  key={r.id}
                  className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-3"
                >
                  <div className="text-xs text-neutral-500">
                    {r.payload.category} · Quelle: {r.payload.verifiedSource}
                  </div>
                  <h4 className="font-display text-lg font-bold">{r.title}</h4>
                  <div className="text-xs font-medium text-[#3B6912] dark:text-[#BBE774]">
                    Ertrag bei {availableInputKg} kg: ca. {(r.payload.baseYieldAmount * factor).toFixed(1)}{' '}
                    {r.payload.baseYieldUnit}
                  </div>
                  <ul className="text-xs space-y-1">
                    {r.payload.ingredients.map((ing) => (
                      <li key={ing.name} className="flex justify-between border-b border-neutral-100 dark:border-neutral-800 py-1">
                        <span>{ing.name}</span>
                        <span className="font-mono-num font-semibold">
                          {(ing.amount * factor).toFixed(0)} {ing.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <div className="text-xs text-neutral-600 dark:text-neutral-400">
                    <strong>Sicherheit:</strong> {r.payload.acidityAndSafetyNote}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRecipe(r);
                      setScaleRawKg(availableInputKg);
                    }}
                    className="min-h-[36px] text-xs font-semibold text-[#597CD4] hover:underline"
                  >
                    Zubereitung & Skalierung öffnen →
                  </button>
                </div>
              );
            })}
          </div>
          <PaginationControls
            page={recipePagination.page}
            totalPages={recipePagination.totalPages}
            totalItems={recipePagination.totalItems}
            onPageChange={recipePagination.setPage}
            itemLabel="Rezepte"
          />
        </div>
      )}

      {/* TAB 5: Wochenplan & Küche aus Bestand */}
      {tab === 'mealplan' && (() => {
        const useSoonItems = activeInventory.filter(
          (i) => i.payload.quantity > 0 && i.payload.qualityStatus === 'Bald verbrauchen'
        );
        const recentEggs = animalLogs
          .filter(
            (l) =>
              !l.archived &&
              l.payload.logType === 'Eier' &&
              l.payload.date >= new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
          )
          .reduce((s, l) => s + (l.payload.quantity || 0), 0);
        const activeBedCrops = plantings.filter((p) => !p.archived && p.payload.status !== 'Abgeerntet');

        return (
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="bg-white dark:bg-[#161D1A] border border-[#FFC814]/50 rounded-2xl p-4 space-y-1.5">
                <div className="font-semibold text-[#7A4400] dark:text-[#FFD65A] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4" />
                  Bald verbrauchen ({useSoonItems.length})
                </div>
                {useSoonItems.length === 0 ? (
                  <p className="text-neutral-500">
                    Markiere Vorräte im Tab „Vorratskammer“ mit „Bald verbrauchen“, damit sie hier zuerst auftauchen.
                  </p>
                ) : (
                  <ul className="space-y-1">
                    {useSoonItems.slice(0, 4).map((i) => (
                      <li key={i.id} className="flex items-center justify-between gap-2">
                        <span className="truncate font-medium">{i.title}</span>
                        <span className="font-mono-num text-neutral-500 shrink-0">
                          {i.payload.quantity} {i.payload.unit}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="bg-white dark:bg-[#161D1A] border border-[#65A30D]/40 rounded-2xl p-4 space-y-1.5">
                <div className="font-semibold text-[#233A29] dark:text-[#BBE774]">
                  Frisch von unseren Beeten ({activeBedCrops.length})
                </div>
                {activeBedCrops.length === 0 ? (
                  <p className="text-neutral-500">Noch keine aktiven Beetbelegungen eingetragen.</p>
                ) : (
                  <p className="text-neutral-700 dark:text-neutral-300 leading-relaxed">
                    {activeBedCrops
                      .slice(0, 8)
                      .map((p) => `${p.payload.plantName} (${p.payload.status})`)
                      .join(' · ')}
                  </p>
                )}
              </div>

              <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-2">
                <div className="font-semibold flex items-center justify-between">
                  <span>Eier &amp; Einkauf</span>
                  <span className="font-mono-num text-[#D97706]">{recentEggs} Eier / 7 T.</span>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={quickMissingItem}
                    onChange={(e) => setQuickMissingItem(e.target.value)}
                    placeholder="Fehlende Zutat merken…"
                    className="flex-1 min-w-0 px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent text-xs"
                  />
                  <button
                    type="button"
                    disabled={!quickMissingItem.trim()}
                    onClick={async () => {
                      await createRecord('shoppingItems', quickMissingItem.trim(), {
                        category: 'Vorrat',
                        quantity: 1,
                        unit: 'Stück',
                        source: 'Wochenplan',
                        estimatedPriceEur: 0,
                        purchased: false,
                      });
                      pushToast('success', `„${quickMissingItem.trim()}“ auf Einkaufsliste gesetzt.`);
                      setQuickMissingItem('');
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-[#233A29] text-white font-semibold inline-flex items-center gap-1 disabled:opacity-40"
                  >
                    <ShoppingCart className="w-3.5 h-3.5" />
                    +
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="font-display text-base font-bold flex items-center gap-2">
                    <UtensilsCrossed className="w-4 h-4 text-[#CF6432]" />
                    Gemeinsamer Wochenplan (Nico &amp; Chris)
                  </h2>
                  <p className="text-xs text-neutral-500">
                    Plant locker vor, was aus Vorratskammer, Gefrierschrank, Eiern &amp; Beet auf den Tisch kommt.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={savingMealPlan}
                  onClick={async () => {
                    setSavingMealPlan(true);
                    try {
                      await updateMealPlan(mealDraft);
                    } finally {
                      setSavingMealPlan(false);
                    }
                  }}
                  className="px-4 py-2 rounded-xl bg-[#233A29] text-white text-xs font-semibold inline-flex items-center gap-1.5 shrink-0 hover:opacity-90 disabled:opacity-50"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingMealPlan ? 'Speichert…' : 'Wochenplan speichern'}
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {WEEKDAYS_DE.map((day) => {
                  const entry = mealDraft[day] || { meal: '', usesInventory: '', notes: '' };
                  return (
                    <div
                      key={day}
                      className="p-3 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412] border border-neutral-200 dark:border-neutral-800 space-y-2 text-xs"
                    >
                      <div className="font-display font-bold text-neutral-900 dark:text-neutral-100">{day}</div>
                      <input
                        type="text"
                        value={entry.meal}
                        onChange={(e) =>
                          setMealDraft((prev) => ({
                            ...prev,
                            [day]: { ...entry, meal: e.target.value },
                          }))
                        }
                        placeholder="z.B. Omelett mit Kräutern & Salat"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-xs"
                      />
                      <input
                        type="text"
                        value={entry.usesInventory || ''}
                        onChange={(e) =>
                          setMealDraft((prev) => ({
                            ...prev,
                            [day]: { ...entry, usesInventory: e.target.value },
                          }))
                        }
                        placeholder="Vorrat / Beet (z.B. Eier, Glas Bohnen)"
                        className="w-full px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161D1A] text-[11px]"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* QR Batch Label Modal */}
      <Modal
        open={Boolean(qrBatchModal)}
        onClose={() => setQrBatchModal(null)}
        title={qrBatchModal ? `Chargen-Etikett: ${qrBatchModal.payload.batchNumber}` : 'QR-Etikett'}
      >
        {qrBatchModal && (
          <div className="space-y-4">
            <div className="p-6 rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-white text-neutral-900 flex flex-col sm:flex-row items-center gap-6">
              <QRCodeSVG
                value={`${window.location.origin}/?batch=${encodeURIComponent(qrBatchModal.payload.batchNumber)}`}
                size={148}
                includeMargin
              />
              <div className="space-y-1.5 text-sm">
                <div className="font-mono text-xs font-bold text-[#CF6432]">
                  {qrBatchModal.payload.batchNumber}
                </div>
                <div className="font-display text-xl font-bold">{qrBatchModal.payload.product}</div>
                <div className="text-xs text-neutral-600">
                  Hergestellt: {qrBatchModal.payload.date} · {qrBatchModal.payload.packageSize}
                </div>
                <div className="text-xs text-neutral-600">
                  Verfahren: {qrBatchModal.payload.method || qrBatchModal.payload.category}
                </div>
                <div className="text-xs text-neutral-600">
                  Lagerort: {qrBatchModal.payload.storageLocation}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-2 no-print">
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-[#233A29] text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Etikett drucken
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Recipe Detail Modal */}
      <Modal
        open={Boolean(selectedRecipe)}
        onClose={() => setSelectedRecipe(null)}
        title={selectedRecipe?.title || 'Rezept'}
      >
        {selectedRecipe && (
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3">
              <label className="text-xs font-medium">Rohware skalieren (kg):</label>
              <input
                type="number"
                step="0.1"
                min="0.1"
                value={scaleRawKg}
                onChange={(e) => setScaleRawKg(Number(e.target.value) || 1)}
                className="w-24 px-2.5 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm font-mono-num"
              />
            </div>
            <div>
              <div className="font-semibold text-xs text-neutral-500 mb-1">Zutaten</div>
              <ul className="space-y-1 text-xs">
                {selectedRecipe.payload.ingredients.map((ing) => {
                  const factor = selectedRecipe.payload.baseRawAmountKg > 0 ? scaleRawKg / selectedRecipe.payload.baseRawAmountKg : 1;
                  return (
                    <li key={ing.name} className="flex justify-between py-1 border-b border-neutral-100 dark:border-neutral-800">
                      <span>{ing.name}</span>
                      <span className="font-mono-num font-semibold">
                        {(ing.amount * factor).toFixed(0)} {ing.unit}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
            <div>
              <div className="font-semibold text-xs text-neutral-500 mb-1">Zubereitung</div>
              <p className="text-xs leading-relaxed">{selectedRecipe.payload.instructions}</p>
            </div>
            <div className="p-3 rounded-xl bg-[#CF6432]/10 border border-[#CF6432]/30 text-xs">
              <strong>Sicherheit & Säure:</strong> {selectedRecipe.payload.acidityAndSafetyNote}
            </div>
          </div>
        )}
      </Modal>

      {/* Harvest Modal */}
      <Modal open={harvestModal} onClose={() => setHarvestModal(false)} title="Ernte dokumentieren">
        <form onSubmit={saveHarvest} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Pflanze *</label>
              <input type="text" required value={harvestForm.plantName} onChange={(e) => setHarvestForm({ ...harvestForm, plantName: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Sorte</label>
              <input type="text" value={harvestForm.variety} onChange={(e) => setHarvestForm({ ...harvestForm, variety: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Beet / Fläche</label>
              <select value={harvestForm.areaId} onChange={(e) => setHarvestForm({ ...harvestForm, areaId: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-sm">
                <option value="">Bereich wählen…</option>
                {activeAreas.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Erntedatum</label>
              <input type="date" value={harvestForm.date} onChange={(e) => setHarvestForm({ ...harvestForm, date: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium mb-1">Menge</label>
                <input type="number" step="0.1" value={harvestForm.amount} onChange={(e) => setHarvestForm({ ...harvestForm, amount: Number(e.target.value) })} className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm font-mono-num" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Einheit</label>
                <select value={harvestForm.unit} onChange={(e) => setHarvestForm({ ...harvestForm, unit: e.target.value as HarvestPayload['unit'] })} className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-sm">
                  {['kg', 'g', 'Stück', 'Bund', 'Liter'].map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Qualität</label>
              <select value={harvestForm.quality} onChange={(e) => setHarvestForm({ ...harvestForm, quality: e.target.value as HarvestPayload['quality'] })} className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-sm">
                {['Sehr gut', 'Gut', 'B-Ware / Verarbeitung'].map((q) => <option key={q} value={q}>{q}</option>)}
              </select>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-2">
            <div className="text-xs font-semibold">Aufteilung der Erntemenge ({harvestForm.unit})</div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {ALLOCATION_OPTIONS.map((opt) => (
                <div key={opt} className="flex items-center justify-between gap-1 text-xs">
                  <span className="truncate">{opt}</span>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    value={harvestForm.allocations[opt] ?? ''}
                    onChange={(e) =>
                      setHarvestForm({
                        ...harvestForm,
                        allocations: {
                          ...harvestForm.allocations,
                          [opt]: Number(e.target.value) || 0,
                        },
                      })
                    }
                    className="w-16 px-2 py-1 rounded border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] font-mono-num text-right"
                  />
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setHarvestModal(false)} className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-medium">Abbrechen</button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#233A29] text-white text-xs font-semibold">Speichern</button>
          </div>
        </form>
      </Modal>

      {/* Batch Modal */}
      <Modal open={batchModal} onClose={() => setBatchModal(false)} title="Verarbeitungscharge erstellen">
        <form onSubmit={saveBatch} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Chargennummer *</label>
              <input type="text" required value={batchForm.batchNumber} onChange={(e) => setBatchForm({ ...batchForm, batchNumber: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm font-mono-num" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Produkt *</label>
              <input type="text" required value={batchForm.product} onChange={(e) => setBatchForm({ ...batchForm, product: e.target.value })} placeholder="z.B. Johannisbeergelee" className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Kategorie</label>
              <select value={batchForm.category} onChange={(e) => setBatchForm({ ...batchForm, category: e.target.value as BatchPayload['category'] })} className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-sm">
                {['Einkochen', 'Einfrieren', 'Fermentieren', 'Trocknen', 'Lagerung', 'Entsaften', 'Marmeladen & Gelees', 'Sonstiges'].map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Lagerort</label>
              <select value={batchForm.storageLocation} onChange={(e) => setBatchForm({ ...batchForm, storageLocation: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-sm">
                {STORAGE_LOCATIONS.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Anzahl Gläser / Packungen</label>
              <input type="number" min="1" value={batchForm.unitCount} onChange={(e) => setBatchForm({ ...batchForm, unitCount: Number(e.target.value) })} className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm font-mono-num" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Verpackungsgröße</label>
              <input type="text" value={batchForm.packageSize} onChange={(e) => setBatchForm({ ...batchForm, packageSize: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Verfahren, Temperatur & Zeit dokumentieren</label>
            <input type="text" value={batchForm.method} onChange={(e) => setBatchForm({ ...batchForm, method: e.target.value })} placeholder="z.B. 90 °C / 30 Min. Einkochautomat" className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm" />
          </div>
          <label className="inline-flex items-center gap-2 text-xs font-medium">
            <input type="checkbox" checked={batchForm.hygieneChecked} onChange={(e) => setBatchForm({ ...batchForm, hygieneChecked: e.target.checked })} />
            Gläser sterilisiert, Deckelrand sauber & Säuregehalt geprüft
          </label>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setBatchModal(false)} className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-medium">Abbrechen</button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#CF6432] text-white text-xs font-semibold">Charge & QR erstellen</button>
          </div>
        </form>
      </Modal>

      {/* Inventory Modal */}
      <Modal open={invModal} onClose={() => setInvModal(false)} title="Vorrat erfassen">
        <form onSubmit={saveInventory} className="space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Produktname *</label>
              <input type="text" required value={invTitle} onChange={(e) => setInvTitle(e.target.value)} className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Lagerort</label>
              <select value={invForm.location} onChange={(e) => setInvForm({ ...invForm, location: e.target.value as InventoryItemPayload['location'] })} className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-sm">
                {STORAGE_LOCATIONS.map((loc) => <option key={loc} value={loc}>{loc}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Menge</label>
              <input type="number" step="0.1" value={invForm.quantity} onChange={(e) => setInvForm({ ...invForm, quantity: Number(e.target.value) })} className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm font-mono-num" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Einheit</label>
              <input type="text" value={invForm.unit} onChange={(e) => setInvForm({ ...invForm, unit: e.target.value })} className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setInvModal(false)} className="px-4 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-medium">Abbrechen</button>
            <button type="submit" className="px-4 py-2 rounded-xl bg-[#233A29] text-white text-xs font-semibold">Speichern</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
