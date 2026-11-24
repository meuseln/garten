import React, { useMemo, useState } from 'react';
import { Archive, Edit3, Grid, List, Plus, Search } from 'lucide-react';
import { useHomestead } from '../context/HomesteadContext';
import { AREA_TYPES } from '../data/botanicalCatalog';
import { EmptyState, Modal, ModuleHeader, PaginationControls, SegmentedTabs, usePagination } from '../components/ui/SharedUI';
import { GardenMapCanvas } from '../components/property/GardenMapCanvas';
import type { AreaPayload, HomesteadRecord } from '../types/homestead';

const EMPTY_AREA: AreaPayload = {
  areaType: 'Gemüsebeete',
  sizeSqm: 10,
  description: '',
  currentUse: '',
  soilType: '',
  sunExposure: 'Vollsonnig',
  irrigation: '',
  linkedItems: [],
  historyNotes: '',
};

export const PropertyView: React.FC = () => {
  const { areas, createRecord, updateRecord, archiveRecord, pushToast } = useHomestead();
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('Alle');
  const [tab, setTab] = useState<'map' | 'list'>('map');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<HomesteadRecord<AreaPayload> | null>(null);
  const [title, setTitle] = useState('');
  const [form, setForm] = useState<AreaPayload>(EMPTY_AREA);
  const [customType, setCustomType] = useState('');
  const [linkedInput, setLinkedInput] = useState('');

  const activeAreas = useMemo(() => areas.filter((a) => !a.archived), [areas]);

  const allCategories = useMemo(() => {
    const set = new Set<string>(AREA_TYPES);
    activeAreas.forEach((a) => {
      if (a.payload.areaType) set.add(a.payload.areaType);
    });
    return Array.from(set);
  }, [activeAreas]);

  const filtered = useMemo(() => {
    return activeAreas.filter((a) => {
      if (typeFilter !== 'Alle' && a.payload.areaType !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          a.title.toLowerCase().includes(q) ||
          a.payload.areaType.toLowerCase().includes(q) ||
          (a.payload.currentUse || '').toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [activeAreas, typeFilter, search]);

  const totalSqm = filtered.reduce((s, a) => s + (Number(a.payload.sizeSqm) || 0), 0);
  const pagedAreas = usePagination(filtered, 6);

  const openCreate = () => {
    setEditing(null);
    setTitle('');
    setForm(EMPTY_AREA);
    setCustomType('');
    setLinkedInput('');
    setModalOpen(true);
  };

  const openEdit = (rec: HomesteadRecord<AreaPayload>) => {
    setEditing(rec);
    setTitle(rec.title);
    setForm({ ...EMPTY_AREA, ...rec.payload });
    setCustomType('');
    setLinkedInput((rec.payload.linkedItems || []).join(', '));
    setModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const finalType = customType.trim() || form.areaType;
    const payload: AreaPayload = {
      ...form,
      areaType: finalType,
      sizeSqm: Number(form.sizeSqm) || 0,
      linkedItems: linkedInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };
    if (editing) {
      await updateRecord('areas', editing.id, title, payload, editing.updatedAtMs);
      pushToast('success', `Bereich „${title}“ aktualisiert.`);
    } else {
      await createRecord('areas', title, payload);
      pushToast('success', `Bereich „${title}“ angelegt.`);
    }
    setModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Grundstück & Flächen"
        subtitle={`${activeAreas.length} aktive Bereiche · Gesamtfläche der Auswahl: ${totalSqm.toFixed(1)} m²`}
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="px-4 py-2 rounded-xl bg-[#233A29] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 hover:opacity-90 transition"
          >
            <Plus className="w-4 h-4" />
            Neuer Bereich
          </button>
        }
      />

      <SegmentedTabs
        tabs={[
          { id: 'map', label: 'Gartenkarte (S/W-Schema)' },
          { id: 'list', label: `Flächen & Beete (${activeAreas.length})` },
        ]}
        activeTab={tab}
        onChange={(id) => setTab(id as 'map' | 'list')}
      />

      {tab === 'map' && <GardenMapCanvas />}

      {tab === 'list' && (
        <>
      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-neutral-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Fläche oder Nutzung suchen…"
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-sm"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-sm"
          >
            <option value="Alle">Alle Flächentypen</option>
            {allCategories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-1 p-1 bg-neutral-200/70 dark:bg-neutral-800 rounded-xl w-fit">
          <button
            type="button"
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg ${viewMode === 'grid' ? 'bg-white dark:bg-[#161D1A] shadow-xs' : ''}`}
            aria-label="Kachelansicht"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode('list')}
            className={`p-2 rounded-lg ${viewMode === 'list' ? 'bg-white dark:bg-[#161D1A] shadow-xs' : ''}`}
            aria-label="Listenansicht"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          title="Keine Grundstücksbereiche gefunden"
          description="Lege Beete, Hochbeete, Gewächshaus, Tierbereiche, Kompostplätze oder Naturflächen an, um alle Hofdaten damit zu verknüpfen."
          actionLabel="Ersten Bereich anlegen"
          onAction={openCreate}
        />
      ) : viewMode === 'grid' ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pagedAreas.pageItems.map((area) => (
            <article
              key={area.id}
              className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 flex flex-col justify-between gap-4"
            >
              <div className="space-y-2">
                <div className="text-xs text-neutral-500 flex items-center gap-1.5">
                  <span>{area.payload.areaType}</span>
                  <span>·</span>
                  <span className="font-mono-num">{area.payload.sizeSqm} m²</span>
                  <span>·</span>
                  <span>{area.payload.sunExposure}</span>
                </div>
                <h3 className="font-display text-lg font-semibold text-neutral-900 dark:text-neutral-100">
                  {area.title}
                </h3>
                {area.payload.description && (
                  <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                    {area.payload.description}
                  </p>
                )}
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 pt-2 border-t border-neutral-100 dark:border-neutral-800 text-xs">
                  <div>
                    <dt className="text-neutral-500">Nutzung</dt>
                    <dd className="font-medium truncate">{area.payload.currentUse || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Boden</dt>
                    <dd className="font-medium truncate">{area.payload.soilType || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Bewässerung</dt>
                    <dd className="font-medium truncate">{area.payload.irrigation || '—'}</dd>
                  </div>
                  <div>
                    <dt className="text-neutral-500">Verknüpft</dt>
                    <dd className="font-medium truncate">
                      {(area.payload.linkedItems || []).join(', ') || '—'}
                    </dd>
                  </div>
                </dl>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                <button
                  type="button"
                  onClick={() => openEdit(area)}
                  className="px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Bearbeiten
                </button>
                <button
                  type="button"
                  onClick={() => archiveRecord('areas', area.id, area.title)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-[#CF6432] hover:bg-[#CF6432]/10 inline-flex items-center gap-1.5"
                >
                  <Archive className="w-3.5 h-3.5" />
                  Archivieren
                </button>
              </div>
            </article>
          ))}
          </div>
          <PaginationControls
            page={pagedAreas.page}
            totalPages={pagedAreas.totalPages}
            totalItems={pagedAreas.totalItems}
            onPageChange={pagedAreas.setPage}
            itemLabel="Bereiche"
          />
        </>
      ) : (
        <>
          <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 dark:border-neutral-800 text-left text-xs text-neutral-500">
                  <th className="py-3 px-4">Bereich</th>
                  <th className="py-3 px-4">Typ</th>
                  <th className="py-3 px-4 text-right">Größe</th>
                  <th className="py-3 px-4">Aktuelle Nutzung</th>
                  <th className="py-3 px-4">Sonne & Bewässerung</th>
                  <th className="py-3 px-4 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {pagedAreas.pageItems.map((area) => (
                <tr key={area.id} className="hover:bg-neutral-50 dark:hover:bg-neutral-900/40">
                  <td className="py-3 px-4 font-medium">{area.title}</td>
                  <td className="py-3 px-4 text-xs text-neutral-600 dark:text-neutral-400">
                    {area.payload.areaType}
                  </td>
                  <td className="py-3 px-4 text-right font-mono-num">{area.payload.sizeSqm} m²</td>
                  <td className="py-3 px-4 text-xs">{area.payload.currentUse || '—'}</td>
                  <td className="py-3 px-4 text-xs text-neutral-600 dark:text-neutral-400">
                    {area.payload.sunExposure} · {area.payload.irrigation || 'Keine Angabe'}
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => openEdit(area)}
                      className="text-xs font-medium text-[#597CD4] hover:underline mr-3"
                    >
                      Bearbeiten
                    </button>
                    <button
                      type="button"
                      onClick={() => archiveRecord('areas', area.id, area.title)}
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
          page={pagedAreas.page}
          totalPages={pagedAreas.totalPages}
          totalItems={pagedAreas.totalItems}
          onPageChange={pagedAreas.setPage}
          itemLabel="Bereiche"
        />
        </>
      )}
        </>
      )}

      {/* Create / Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Grundstücksbereich bearbeiten' : 'Neuen Grundstücksbereich anlegen'}
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Name *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. Hochbeet 2"
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Flächentyp *</label>
              <select
                value={form.areaType}
                onChange={(e) => setForm({ ...form, areaType: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-sm"
              >
                {allCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Eigene Kategorie (optional)</label>
              <input
                type="text"
                value={customType}
                onChange={(e) => setCustomType(e.target.value)}
                placeholder="Falls neuer Flächentyp gewünscht"
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Größe (m²)</label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={form.sizeSqm}
                onChange={(e) => setForm({ ...form, sizeSqm: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Sonnenverhältnisse</label>
              <select
                value={form.sunExposure}
                onChange={(e) =>
                  setForm({ ...form, sunExposure: e.target.value as AreaPayload['sunExposure'] })
                }
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-sm"
              >
                <option value="Vollsonnig">Vollsonnig</option>
                <option value="Halbschatten">Halbschatten</option>
                <option value="Schatten">Schatten</option>
                <option value="Geschützt (Unter Glas)">Geschützt (Unter Glas)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Bodenbeschaffenheit</label>
              <input
                type="text"
                value={form.soilType}
                onChange={(e) => setForm({ ...form, soilType: e.target.value })}
                placeholder="z.B. Lehmig-humos"
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Aktuelle Nutzung</label>
              <input
                type="text"
                value={form.currentUse}
                onChange={(e) => setForm({ ...form, currentUse: e.target.value })}
                placeholder="z.B. Wurzelgemüse / Hühner"
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Bewässerung</label>
              <input
                type="text"
                value={form.irrigation}
                onChange={(e) => setForm({ ...form, irrigation: e.target.value })}
                placeholder="z.B. Regentonne / Tropfschlauch"
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Zugeordnete Pflanzen oder Tiere (Komma-getrennt)</label>
            <input
              type="text"
              value={linkedInput}
              onChange={(e) => setLinkedInput(e.target.value)}
              placeholder="z.B. Tomaten Harzfeuer, Basilikum"
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Beschreibung</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Historie / Notizen</label>
            <textarea
              rows={2}
              value={form.historyNotes}
              onChange={(e) => setForm({ ...form, historyNotes: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
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
