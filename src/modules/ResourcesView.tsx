import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  Droplets,
  Edit3,
  Leaf,
  Plus,
  Recycle,
  RefreshCw,
  Sprout,
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
import type { HomesteadRecord, KnowledgePayload, ResourcePayload } from '../types/homestead';

type ResourceTab = 'Boden' | 'Kompost' | 'Wasser' | 'Dünger & Mulch' | 'Natur' | 'Wildkräuter';

export const ResourcesView: React.FC = () => {
  const {
    resources,
    knowledgeEntries,
    areas,
    animalGroups,
    createRecord,
    updateRecord,
    archiveRecord,
    pushToast,
  } = useHomestead();

  const [tab, setTab] = useState<ResourceTab>('Boden');

  // Resource modal state
  const [editingRes, setEditingRes] = useState<HomesteadRecord<ResourcePayload> | null>(null);
  const [showResModal, setShowResModal] = useState(false);
  const [resTitle, setResTitle] = useState('');
  const [resPayload, setResPayload] = useState<ResourcePayload>({
    resourceType: 'Boden',
    date: new Date().toISOString().slice(0, 10),
    status: 'Aktiv',
    notes: '',
  });

  // Nature / Wild herbs knowledge modal state
  const [editingBio, setEditingBio] = useState<HomesteadRecord<KnowledgePayload> | null>(null);
  const [showBioModal, setShowBioModal] = useState(false);
  const [bioTitle, setBioTitle] = useState('');
  const [bioPayload, setBioPayload] = useState<KnowledgePayload>({
    domainType: 'Natur & Biodiversität',
    category: 'Vögel & Insekten',
    content: '',
    source: 'Eigene Beobachtung auf dem Hof',
    isVerifiedSource: false,
    safetyWarning: '',
    date: new Date().toISOString().slice(0, 10),
    locationNote: '',
    tags: [],
  });
  const [tagsText, setTagsText] = useState('');

  const activeAreas = useMemo(() => areas.filter((a) => !a.archived), [areas]);
  const activeAnimals = useMemo(() => animalGroups.filter((g) => !g.archived), [animalGroups]);
  const activeResources = useMemo(() => resources.filter((r) => !r.archived), [resources]);

  const currentResources = useMemo(
    () => activeResources.filter((r) => r.payload.resourceType === tab),
    [activeResources, tab]
  );

  const compostSystems = useMemo(
    () => activeResources.filter((r) => r.payload.resourceType === 'Kompost'),
    [activeResources]
  );

  const natureEntries = useMemo(
    () =>
      knowledgeEntries.filter(
        (k) => !k.archived && k.payload.domainType === 'Natur & Biodiversität'
      ),
    [knowledgeEntries]
  );

  const wildHerbEntries = useMemo(
    () =>
      knowledgeEntries.filter(
        (k) => !k.archived && k.payload.domainType === 'Pilze & Wildkräuter'
      ),
    [knowledgeEntries]
  );

  const pagedResources = usePagination(currentResources, 4);
  const pagedNature = usePagination(natureEntries, 4);
  const pagedWildHerbs = usePagination(wildHerbEntries, 4);

  const openNewResource = (type: ResourcePayload['resourceType']) => {
    setEditingRes(null);
    setResTitle('');
    setResPayload({
      resourceType: type,
      areaId: '',
      areaName: '',
      date: new Date().toISOString().slice(0, 10),
      status: type === 'Kompost' ? 'Heißrotte' : 'Aktiv',
      soilType: type === 'Boden' ? 'Lehmig-steinig (Schiefergebirge)' : undefined,
      phValue: type === 'Boden' ? 6.4 : undefined,
      humusPercent: type === 'Boden' ? 4.2 : undefined,
      compostInputs: type === 'Kompost' ? 'Hühnermist, Kanincheneinstreu, Gartengrünschnitt' : undefined,
      fillDate: type === 'Kompost' ? new Date().toISOString().slice(0, 10) : undefined,
      lastTurnedDate: type === 'Kompost' ? new Date().toISOString().slice(0, 10) : undefined,
      temperatureC: type === 'Kompost' ? 48 : undefined,
      maturityStage: type === 'Kompost' ? 'Heißrotte' : undefined,
      capacityLiters: type === 'Wasser' ? 1000 : undefined,
      currentLevelLiters: type === 'Wasser' ? 750 : undefined,
      roofAreaSqm: type === 'Wasser' ? 35 : undefined,
      dailyUsageLiters: type === 'Wasser' ? 60 : undefined,
      fertilizerOrigin: type === 'Dünger & Mulch' ? 'Eigener Kompost / Mist' : undefined,
      amountKgOrL: type === 'Dünger & Mulch' ? 25 : undefined,
      mulchMaterial: type === 'Dünger & Mulch' ? 'Stroh & Rasenschnitt' : undefined,
      linkedCircularSource: '',
      notes: '',
    });
    setShowResModal(true);
  };

  const openEditResource = (rec: HomesteadRecord<ResourcePayload>) => {
    setEditingRes(rec);
    setResTitle(rec.title);
    setResPayload({ ...rec.payload });
    setShowResModal(true);
  };

  const saveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resTitle.trim()) return;
    const areaMatch = activeAreas.find((a) => a.id === resPayload.areaId);
    const payload: ResourcePayload = {
      ...resPayload,
      areaName: areaMatch ? areaMatch.title : resPayload.areaName || '',
    };
    if (editingRes) {
      await updateRecord('resources', editingRes.id, resTitle, payload, editingRes.updatedAtMs);
      pushToast('success', 'Ressourceneintrag aktualisiert.');
    } else {
      await createRecord('resources', resTitle, payload);
      pushToast('success', 'Ressourceneintrag gespeichert.');
    }
    setShowResModal(false);
  };

  const markCompostTurnedToday = async (rec: HomesteadRecord<ResourcePayload>) => {
    const today = new Date().toISOString().slice(0, 10);
    await updateRecord(
      'resources',
      rec.id,
      rec.title,
      { ...rec.payload, lastTurnedDate: today },
      rec.updatedAtMs
    );
    pushToast('success', `${rec.title}: Umsetzung für heute dokumentiert.`);
  };

  const openNewBio = (domainType: 'Natur & Biodiversität' | 'Pilze & Wildkräuter') => {
    setEditingBio(null);
    setBioTitle('');
    setTagsText('');
    setBioPayload({
      domainType,
      category: domainType === 'Natur & Biodiversität' ? 'Nützlinge & Bestäuber' : 'Wildkräuter (Unbestätigt / Referenz)',
      content: '',
      source: 'Eigene Beobachtung in Mellenbach-Glasbach',
      isVerifiedSource: false,
      safetyWarning:
        domainType === 'Pilze & Wildkräuter'
          ? 'Keine Verzehrfreigabe! Jede sichere Pilzbestimmung erfordert eine Prüfung durch zertifizierte Pilzsachverständige vor Ort.'
          : '',
      date: new Date().toISOString().slice(0, 10),
      locationNote: '',
      tags: [],
    });
    setShowBioModal(true);
  };

  const openEditBio = (rec: HomesteadRecord<KnowledgePayload>) => {
    setEditingBio(rec);
    setBioTitle(rec.title);
    setTagsText((rec.payload.tags || []).join(', '));
    setBioPayload({ ...rec.payload });
    setShowBioModal(true);
  };

  const saveBio = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bioTitle.trim()) return;
    const payload: KnowledgePayload = {
      ...bioPayload,
      tags: tagsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };
    if (editingBio) {
      await updateRecord('knowledgeEntries', editingBio.id, bioTitle, payload, editingBio.updatedAtMs);
      pushToast('success', 'Eintrag aktualisiert.');
    } else {
      await createRecord('knowledgeEntries', bioTitle, payload);
      pushToast('success', 'Eintrag gespeichert.');
    }
    setShowBioModal(false);
  };

  const isResourceTab = tab === 'Boden' || tab === 'Kompost' || tab === 'Wasser' || tab === 'Dünger & Mulch';

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Ressourcen, Kreislaufwirtschaft & Natur"
        subtitle="Bodenproben, Kompost (Mist-Kreislauf), Regenwasserzisternen, Biodiversität & Wildkräuter"
        actions={
          <button
            type="button"
            onClick={() => {
              if (tab === 'Natur') openNewBio('Natur & Biodiversität');
              else if (tab === 'Wildkräuter') openNewBio('Pilze & Wildkräuter');
              else openNewResource(tab);
            }}
            className="px-3.5 py-2 rounded-xl bg-[#233A29] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 hover:opacity-90 transition"
          >
            <Plus className="w-4 h-4" />
            {tab === 'Natur'
              ? 'Beobachtung erfassen'
              : tab === 'Wildkräuter'
              ? 'Fundnotiz anlegen'
              : `${tab} erfassen`}
          </button>
        }
      />

      <SegmentedTabs
        tabs={[
          { id: 'Boden', label: 'Bodenproben' },
          { id: 'Kompost', label: 'Kompostanlagen' },
          { id: 'Wasser', label: 'Regenwasser & Zisternen' },
          { id: 'Dünger & Mulch', label: 'Dünger & Mulch' },
          { id: 'Natur', label: 'Natur & Biodiversität' },
          { id: 'Wildkräuter', label: 'Pilze & Wildkräuter' },
        ]}
        activeTab={tab}
        onChange={(id) => setTab(id as ResourceTab)}
      />

      {/* Circular Economy Overview */}
      {isResourceTab && (
        <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-neutral-700 dark:text-neutral-300">
            <Recycle className="w-4 h-4 text-[#3B6912] dark:text-[#BBE774] shrink-0" />
            <span>
              <strong>Hof-Kreislauf:</strong>{' '}
              {activeAnimals.length > 0
                ? activeAnimals.map((a) => `${a.title} (Mist/Einstreu)`).join(' + ')
                : 'Tierbestände'}{' '}
              → {compostSystems.length} Kompostsystem(e) → Dünger & Mulch → {activeAreas.length} Beet-/Hofbereiche
            </span>
          </div>
          <span className="font-mono-num text-neutral-500">
            Gesamtwasservorrat:{' '}
            {activeResources
              .filter((r) => r.payload.resourceType === 'Wasser')
              .reduce((s, r) => s + (r.payload.currentLevelLiters || 0), 0)}{' '}
            L
          </span>
        </div>
      )}

      {/* Regional Reference Banner for Karl-Marx-Str. 113, 98744 Schwarzatal */}
      {(tab === 'Boden' || tab === 'Wasser') && (
        <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-2 text-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <div className="font-display font-bold text-sm text-neutral-900 dark:text-neutral-100">
                Referenzstandort: {REGIONAL_SOIL_WATER_REFERENCE.address}
              </div>
              <div className="text-neutral-500">
                {tab === 'Boden'
                  ? REGIONAL_SOIL_WATER_REFERENCE.geology
                  : `${REGIONAL_SOIL_WATER_REFERENCE.waterSupplier} · ${REGIONAL_SOIL_WATER_REFERENCE.waterHardness}`}
              </div>
            </div>
            <button
              type="button"
              onClick={async () => {
                const today = new Date().toISOString().slice(0, 10);
                if (tab === 'Boden') {
                  await createRecord('resources', 'Bodenreferenz Karl-Marx-Str. 113', {
                    resourceType: 'Boden',
                    date: today,
                    status: 'Regionaler Richtwert (98744 Schwarzatal)',
                    soilType: 'Steinig-lehmiger Schieferverwitterungsboden',
                    phValue: 6.1,
                    humusPercent: 3.8,
                    nutrientsNote: REGIONAL_SOIL_WATER_REFERENCE.soilSummary,
                    notes: `Referenz: ${REGIONAL_SOIL_WATER_REFERENCE.address}`,
                  });
                } else {
                  await createRecord('resources', 'Wasserreferenz Karl-Marx-Str. 113', {
                    resourceType: 'Wasser',
                    date: today,
                    status: 'Weiches Mittelgebirgswasser (< 8,4 °dH)',
                    capacityLiters: 1000,
                    currentLevelLiters: 800,
                    roofAreaSqm: 40,
                    dailyUsageLiters: 50,
                    notes: `${REGIONAL_SOIL_WATER_REFERENCE.waterSupplier} · ${REGIONAL_SOIL_WATER_REFERENCE.waterHardness} (${REGIONAL_SOIL_WATER_REFERENCE.address})`,
                  });
                }
                pushToast('success', `${tab}-Referenz für Karl-Marx-Str. 113 übernommen.`);
              }}
              className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 shrink-0 self-start"
            >
              Als Vorlage übernehmen
            </button>
          </div>
          <p className="text-neutral-600 dark:text-neutral-400 leading-relaxed">
            {tab === 'Boden'
              ? REGIONAL_SOIL_WATER_REFERENCE.soilSummary
              : REGIONAL_SOIL_WATER_REFERENCE.waterSummary}
          </p>
        </div>
      )}

      {/* Resource Cards */}
      {isResourceTab && (
        <>
          {currentResources.length === 0 ? (
            <EmptyState
              title={`Noch keine Einträge unter „${tab}“`}
              description="Dokumentiere hier Bodenwerte, Kompostmieten, Regentonnen/Zisternen oder organische Dünger im Hofkreislauf."
              actionLabel={`${tab} anlegen`}
              onAction={() => openNewResource(tab)}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pagedResources.pageItems.map((rec) => {
                const p = rec.payload;
                const waterPct =
                  p.resourceType === 'Wasser' && p.capacityLiters
                    ? Math.min(100, Math.round(((p.currentLevelLiters || 0) / p.capacityLiters) * 100))
                    : 0;
                const waterDays =
                  p.resourceType === 'Wasser' && p.dailyUsageLiters && p.dailyUsageLiters > 0
                    ? Math.floor((p.currentLevelLiters || 0) / p.dailyUsageLiters)
                    : null;

                return (
                  <div
                    key={rec.id}
                    className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-display text-base font-bold">{rec.title}</h3>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          {p.areaName ? `${p.areaName} · ` : ''}
                          Stand: <span className="font-mono-num">{p.date}</span> · {p.status}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditResource(rec)}
                          className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                          aria-label="Bearbeiten"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => archiveRecord('resources', rec.id, rec.title)}
                          className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-[#CF6432]/15 text-[#CF6432]"
                          aria-label="Archivieren"
                        >
                          <Archive className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {p.resourceType === 'Boden' && (
                      <div className="grid grid-cols-3 gap-2 text-xs">
                        <div className="p-2.5 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412]">
                          <div className="text-neutral-500">pH-Wert</div>
                          <div className="font-bold font-mono-num text-sm">{p.phValue ?? '–'}</div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412]">
                          <div className="text-neutral-500">Humus</div>
                          <div className="font-bold font-mono-num text-sm">
                            {p.humusPercent !== undefined ? `${p.humusPercent}%` : '–'}
                          </div>
                        </div>
                        <div className="p-2.5 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412]">
                          <div className="text-neutral-500">Bodenart</div>
                          <div className="font-semibold truncate">{p.soilType || '–'}</div>
                        </div>
                        {p.nutrientsNote && (
                          <div className="col-span-3 text-neutral-600 dark:text-neutral-400">
                            Nährstoffe: {p.nutrientsNote}
                          </div>
                        )}
                      </div>
                    )}

                    {p.resourceType === 'Kompost' && (
                      <div className="space-y-2 text-xs">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="p-2.5 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412]">
                            <div className="text-neutral-500">Reifegrad</div>
                            <div className="font-semibold">{p.maturityStage || '–'}</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412]">
                            <div className="text-neutral-500">Temperatur</div>
                            <div className="font-bold font-mono-num">{p.temperatureC ?? '–'} °C</div>
                          </div>
                          <div className="p-2.5 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412]">
                            <div className="text-neutral-500">Umgesetzt</div>
                            <div className="font-mono-num">{p.lastTurnedDate || '–'}</div>
                          </div>
                        </div>
                        {p.compostInputs && (
                          <div className="text-neutral-600 dark:text-neutral-400">
                            Einträge/Inputs: {p.compostInputs}
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => markCompostTurnedToday(rec)}
                          className="px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Umsetzung heute protokollieren
                        </button>
                      </div>
                    )}

                    {p.resourceType === 'Wasser' && (
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between font-mono-num">
                          <span className="inline-flex items-center gap-1.5 font-semibold">
                            <Droplets className="w-3.5 h-3.5 text-[#597CD4]" />
                            {p.currentLevelLiters ?? 0} / {p.capacityLiters ?? 0} Liter ({waterPct}%)
                          </span>
                          {waterDays !== null && (
                            <span className={waterDays < 4 ? 'text-[#CF6432] font-semibold' : 'text-neutral-500'}>
                              Reichweite ca. {waterDays} Tage
                            </span>
                          )}
                        </div>
                        <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                          <div
                            className="h-full bg-[#597CD4]"
                            style={{ width: `${waterPct}%` }}
                          />
                        </div>
                        <div className="text-neutral-500 font-mono-num">
                          Dachfläche: {p.roofAreaSqm ?? 0} m² · Tagesbedarf: {p.dailyUsageLiters ?? 0} L/Tag
                        </div>
                      </div>
                    )}

                    {p.resourceType === 'Dünger & Mulch' && (
                      <div className="text-xs space-y-1 text-neutral-600 dark:text-neutral-400">
                        <div>
                          Herkunft: <strong>{p.fertilizerOrigin || '–'}</strong> · Menge:{' '}
                          <span className="font-mono-num">{p.amountKgOrL ?? 0} kg/L</span>
                        </div>
                        {p.mulchMaterial && <div>Mulchmaterial: {p.mulchMaterial}</div>}
                        {p.linkedCircularSource && (
                          <div>Kreislauf-Verknüpfung: {p.linkedCircularSource}</div>
                        )}
                      </div>
                    )}

                    {p.notes && <p className="text-xs text-neutral-600 dark:text-neutral-400 pt-1">{p.notes}</p>}
                  </div>
                );
              })}
              </div>
              <PaginationControls
                page={pagedResources.page}
                totalPages={pagedResources.totalPages}
                totalItems={pagedResources.totalItems}
                onPageChange={pagedResources.setPage}
              />
            </>
          )}
        </>
      )}

      {/* Nature & Biodiversity */}
      {tab === 'Natur' && (
        <div className="space-y-4">
          {natureEntries.length === 0 ? (
            <EmptyState
              title="Noch keine Natur- & Biodiversitätsbeobachtungen"
              description="Dokumentiere Vögel, Wildbienen, Nützlinge, Hecken, Totholz und Blühflächen rund um Mellenbach-Glasbach."
              actionLabel="Erste Beobachtung erfassen"
              onAction={() => openNewBio('Natur & Biodiversität')}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pagedNature.pageItems.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display text-base font-bold flex items-center gap-2">
                        <Leaf className="w-4 h-4 text-[#3B6912] dark:text-[#BBE774]" />
                        {entry.title}
                      </h3>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {entry.payload.category} · <span className="font-mono-num">{entry.payload.date}</span>
                        {entry.payload.locationNote ? ` · ${entry.payload.locationNote}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditBio(entry)}
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
                page={pagedNature.page}
                totalPages={pagedNature.totalPages}
                totalItems={pagedNature.totalItems}
                onPageChange={pagedNature.setPage}
              />
            </>
          )}
        </div>
      )}

      {/* Mushrooms & Wild Herbs (Strict Safety Warning) */}
      {tab === 'Wildkräuter' && (
        <div className="space-y-4">
          <div className="p-4 rounded-2xl bg-[#CF6432]/12 border border-[#CF6432]/40 flex items-start gap-3 text-sm text-neutral-900 dark:text-neutral-100">
            <AlertTriangle className="w-5 h-5 text-[#CF6432] shrink-0 mt-0.5" />
            <div className="space-y-1">
              <div className="font-bold">Wichtiger Sicherheitshinweis zu Pilzen & Wildkräutern</div>
              <p className="text-xs leading-relaxed text-neutral-700 dark:text-neutral-300">
                Eigene Fundnotizen, App-Einträge und KI-Hinweise sind <strong>niemals eine Verzehrfreigabe</strong>.
                Verwechslungen (z.B. Bärlauch mit Maiglöckchen/Herbstzeitlose oder Speise- mit Giftpilzen) können lebensgefährlich sein.
                Lass unsichere Funde stets vor Ort durch geprüfte Pilzsachverständige (DGfM) kontrollieren.
              </p>
            </div>
          </div>

          {wildHerbEntries.length === 0 ? (
            <EmptyState
              title="Noch keine Pilz- oder Wildkräuternotizen"
              description="Halte sichere Fundorte, Bestimmungsmerkmale, Verwechslungspartner und Termine für den Eigenbedarf fest."
              actionLabel="Fundnotiz anlegen"
              onAction={() => openNewBio('Pilze & Wildkräuter')}
            />
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {pagedWildHerbs.pageItems.map((entry) => (
                <div
                  key={entry.id}
                  className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-display text-base font-bold flex items-center gap-2">
                        <Sprout className="w-4 h-4 text-[#CF6432]" />
                        {entry.title}
                      </h3>
                      <p className="text-xs text-neutral-500 mt-0.5">
                        {entry.payload.category} · <span className="font-mono-num">{entry.payload.date}</span>
                        {entry.payload.locationNote ? ` · ${entry.payload.locationNote}` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openEditBio(entry)}
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
                  <div className="text-xs text-[#9A3E14] dark:text-[#F49D76] font-medium">
                    Vorbehalt: {entry.payload.safetyWarning || 'Keine Verzehrfreigabe durch die App.'}
                  </div>
                </div>
              ))}
              </div>
              <PaginationControls
                page={pagedWildHerbs.page}
                totalPages={pagedWildHerbs.totalPages}
                totalItems={pagedWildHerbs.totalItems}
                onPageChange={pagedWildHerbs.setPage}
              />
            </>
          )}
        </div>
      )}

      {/* Resource Modal */}
      <Modal
        open={showResModal}
        onClose={() => setShowResModal(false)}
        title={editingRes ? `${resPayload.resourceType} bearbeiten` : `${resPayload.resourceType} erfassen`}
      >
        <form onSubmit={saveResource} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Bezeichnung *</label>
              <input
                type="text"
                required
                value={resTitle}
                onChange={(e) => setResTitle(e.target.value)}
                placeholder="z.B. Thermokomposter Nord oder Zisterne Scheune"
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Verknüpfter Bereich</label>
              <select
                value={resPayload.areaId || ''}
                onChange={(e) => setResPayload({ ...resPayload, areaId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              >
                <option value="">Hof allgemein</option>
                {activeAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Datum</label>
              <input
                type="date"
                value={resPayload.date}
                onChange={(e) => setResPayload({ ...resPayload, date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Status</label>
              <input
                type="text"
                value={resPayload.status}
                onChange={(e) => setResPayload({ ...resPayload, status: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
          </div>

          {resPayload.resourceType === 'Boden' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Bodenart</label>
                <input
                  type="text"
                  value={resPayload.soilType || ''}
                  onChange={(e) => setResPayload({ ...resPayload, soilType: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">pH-Wert</label>
                <input
                  type="number"
                  step="0.1"
                  value={resPayload.phValue ?? 6.5}
                  onChange={(e) => setResPayload({ ...resPayload, phValue: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Humusgehalt (%)</label>
                <input
                  type="number"
                  step="0.1"
                  value={resPayload.humusPercent ?? 4}
                  onChange={(e) => setResPayload({ ...resPayload, humusPercent: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium mb-1">Nährstoffe & Bodenbeobachtung</label>
                <input
                  type="text"
                  value={resPayload.nutrientsNote || ''}
                  onChange={(e) => setResPayload({ ...resPayload, nutrientsNote: e.target.value })}
                  placeholder="z.B. N mittel, P/K gut, Regenwurmbesatz hoch"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
                />
              </div>
            </div>
          )}

          {resPayload.resourceType === 'Kompost' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Reifegrad</label>
                <select
                  value={resPayload.maturityStage || 'Heißrotte'}
                  onChange={(e) =>
                    setResPayload({
                      ...resPayload,
                      maturityStage: e.target.value as ResourcePayload['maturityStage'],
                    })
                  }
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
                >
                  <option value="Frisch">Frisch</option>
                  <option value="Heißrotte">Heißrotte</option>
                  <option value="Reifend">Reifend</option>
                  <option value="Fertig">Fertig (siebfähig)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Temperatur (°C)</label>
                <input
                  type="number"
                  value={resPayload.temperatureC ?? 45}
                  onChange={(e) => setResPayload({ ...resPayload, temperatureC: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Zuletzt umgesetzt</label>
                <input
                  type="date"
                  value={resPayload.lastTurnedDate || ''}
                  onChange={(e) => setResPayload({ ...resPayload, lastTurnedDate: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
                />
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-medium mb-1">Eingebrachtes Material (Mist / Grünschnitt)</label>
                <input
                  type="text"
                  value={resPayload.compostInputs || ''}
                  onChange={(e) => setResPayload({ ...resPayload, compostInputs: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
                />
              </div>
            </div>
          )}

          {resPayload.resourceType === 'Wasser' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Kapazität (L)</label>
                <input
                  type="number"
                  value={resPayload.capacityLiters ?? 1000}
                  onChange={(e) => setResPayload({ ...resPayload, capacityLiters: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Aktueller Stand (L)</label>
                <input
                  type="number"
                  value={resPayload.currentLevelLiters ?? 0}
                  onChange={(e) => setResPayload({ ...resPayload, currentLevelLiters: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Dachfläche (m²)</label>
                <input
                  type="number"
                  value={resPayload.roofAreaSqm ?? 0}
                  onChange={(e) => setResPayload({ ...resPayload, roofAreaSqm: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Verbrauch/Tag (L)</label>
                <input
                  type="number"
                  value={resPayload.dailyUsageLiters ?? 50}
                  onChange={(e) => setResPayload({ ...resPayload, dailyUsageLiters: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
                />
              </div>
            </div>
          )}

          {resPayload.resourceType === 'Dünger & Mulch' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Herkunft / Düngerart</label>
                <input
                  type="text"
                  value={resPayload.fertilizerOrigin || ''}
                  onChange={(e) => setResPayload({ ...resPayload, fertilizerOrigin: e.target.value })}
                  placeholder="z.B. Kompostmiete 1, Brennnesseljauche, Hornspäne"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Menge (kg oder Liter)</label>
                <input
                  type="number"
                  value={resPayload.amountKgOrL ?? 0}
                  onChange={(e) => setResPayload({ ...resPayload, amountKgOrL: Number(e.target.value) })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Mulchmaterial</label>
                <input
                  type="text"
                  value={resPayload.mulchMaterial || ''}
                  onChange={(e) => setResPayload({ ...resPayload, mulchMaterial: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Kreislauf-Quelle (z.B. Kompost/Tiergruppe)</label>
                <input
                  type="text"
                  value={resPayload.linkedCircularSource || ''}
                  onChange={(e) => setResPayload({ ...resPayload, linkedCircularSource: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1">Notizen</label>
            <textarea
              rows={2}
              value={resPayload.notes}
              onChange={(e) => setResPayload({ ...resPayload, notes: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowResModal(false)}
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

      {/* Nature / Wild Herbs Modal */}
      <Modal
        open={showBioModal}
        onClose={() => setShowBioModal(false)}
        title={
          editingBio
            ? `${bioPayload.domainType} bearbeiten`
            : `${bioPayload.domainType} erfassen`
        }
      >
        <form onSubmit={saveBio} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Art / Titel *</label>
              <input
                type="text"
                required
                value={bioTitle}
                onChange={(e) => setBioTitle(e.target.value)}
                placeholder={
                  bioPayload.domainType === 'Natur & Biodiversität'
                    ? 'z.B. Mauerbiene am Insektenhotel'
                    : 'z.B. Brennnessel-Standort am Waldrand'
                }
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Kategorie</label>
              <input
                type="text"
                value={bioPayload.category}
                onChange={(e) => setBioPayload({ ...bioPayload, category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Datum</label>
              <input
                type="date"
                value={bioPayload.date}
                onChange={(e) => setBioPayload({ ...bioPayload, date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Standort / Fundort</label>
              <input
                type="text"
                value={bioPayload.locationNote || ''}
                onChange={(e) => setBioPayload({ ...bioPayload, locationNote: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Beobachtung / Merkmale *</label>
            <textarea
              rows={4}
              required
              value={bioPayload.content}
              onChange={(e) => setBioPayload({ ...bioPayload, content: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
            />
          </div>

          {bioPayload.domainType === 'Pilze & Wildkräuter' && (
            <div>
              <label className="block text-xs font-medium mb-1">Verwechslungs- & Sicherheitshinweis</label>
              <input
                type="text"
                value={bioPayload.safetyWarning || ''}
                onChange={(e) => setBioPayload({ ...bioPayload, safetyWarning: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium mb-1">Stichworte (kommagetrennt)</label>
            <input
              type="text"
              value={tagsText}
              onChange={(e) => setTagsText(e.target.value)}
              placeholder="Bestäuber, Hecke, Frühling"
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowBioModal(false)}
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
