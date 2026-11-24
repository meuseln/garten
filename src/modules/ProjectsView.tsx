import React, { useMemo, useState } from 'react';
import {
  Archive,
  CheckSquare,
  Edit3,
  Hammer,
  Plus,
  ShoppingCart,
  Square,
  Trash2,
} from 'lucide-react';
import { useHomestead } from '../context/HomesteadContext';
import { EmptyState, Modal, ModuleHeader, PaginationControls, usePagination } from '../components/ui/SharedUI';
import type { AssigneeScope, HomesteadRecord, ProjectPayload, ProjectStep } from '../types/homestead';

const PROJECT_STATUSES: ProjectPayload['status'][] = [
  'Idee',
  'Geplant',
  'Vorbereitet',
  'In Arbeit',
  'Pausiert',
  'Abgeschlossen',
  'Zurückgestellt',
];

const PROJECT_CATEGORIES = [
  'Hühnerstall & Auslauf',
  'Kaninchengehege',
  'Gewächshaus',
  'Hochbeete',
  'Kompostsystem',
  'Zäune & Tore',
  'Wege & Flächen',
  'Wasseranlagen',
  'Lager & Keller',
  'Werkstatt & Technik',
  'Sonstiges',
];

export const ProjectsView: React.FC = () => {
  const {
    projects,
    activeIdentity,
    createRecord,
    updateRecord,
    archiveRecord,
    pushToast,
  } = useHomestead();

  const [statusFilter, setStatusFilter] = useState<'Alle' | ProjectPayload['status']>('Alle');
  const [assigneeFilter, setAssigneeFilter] = useState<'Alle' | AssigneeScope>('Alle');
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState<HomesteadRecord<ProjectPayload> | null>(null);

  const [title, setTitle] = useState('');
  const [materialsText, setMaterialsText] = useState('');
  const [toolsText, setToolsText] = useState('');
  const [newStepLabel, setNewStepLabel] = useState('');
  const [payload, setPayload] = useState<ProjectPayload>({
    category: 'Hühnerstall & Auslauf',
    description: '',
    status: 'Geplant',
    priority: 'Mittel',
    startDate: new Date().toISOString().slice(0, 10),
    targetDate: '',
    assignee: activeIdentity || 'Gemeinsam',
    budgetPlannedEur: 0,
    budgetSpentEur: 0,
    materials: [],
    tools: [],
    steps: [],
    finalReport: '',
  });

  const activeProjects = useMemo(
    () =>
      projects
        .filter((p) => !p.archived)
        .filter((p) => (statusFilter === 'Alle' ? true : p.payload.status === statusFilter))
        .filter((p) => (assigneeFilter === 'Alle' ? true : p.payload.assignee === assigneeFilter)),
    [projects, statusFilter, assigneeFilter]
  );
  const pagedProjects = usePagination(activeProjects, 4);

  const openNew = () => {
    setEditing(null);
    setTitle('');
    setMaterialsText('');
    setToolsText('');
    setNewStepLabel('');
    setPayload({
      category: 'Hühnerstall & Auslauf',
      description: '',
      status: 'Idee',
      priority: 'Mittel',
      startDate: new Date().toISOString().slice(0, 10),
      targetDate: '',
      assignee: activeIdentity || 'Gemeinsam',
      budgetPlannedEur: 0,
      budgetSpentEur: 0,
      materials: [],
      tools: [],
      steps: [],
      finalReport: '',
    });
    setShowModal(true);
  };

  const openEdit = (proj: HomesteadRecord<ProjectPayload>) => {
    setEditing(proj);
    setTitle(proj.title);
    setMaterialsText((proj.payload.materials || []).join('\n'));
    setToolsText((proj.payload.tools || []).join(', '));
    setNewStepLabel('');
    setPayload({
      ...proj.payload,
      steps: [...(proj.payload.steps || [])],
    });
    setShowModal(true);
  };

  const addStepToForm = () => {
    const clean = newStepLabel.trim();
    if (!clean) return;
    const step: ProjectStep = {
      id: `step_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      label: clean,
      done: false,
    };
    setPayload((prev) => ({ ...prev, steps: [...(prev.steps || []), step] }));
    setNewStepLabel('');
  };

  const saveProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const nextPayload: ProjectPayload = {
      ...payload,
      materials: materialsText
        .split(/\r?\n|,/)
        .map((m) => m.trim())
        .filter(Boolean),
      tools: toolsText
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean),
    };
    if (editing) {
      await updateRecord('projects', editing.id, title, nextPayload, editing.updatedAtMs);
      pushToast('success', 'Projekt aktualisiert.');
    } else {
      await createRecord('projects', title, nextPayload);
      pushToast('success', 'Neues Projekt angelegt.');
    }
    setShowModal(false);
  };

  const toggleProjectStep = async (proj: HomesteadRecord<ProjectPayload>, stepId: string) => {
    const updatedSteps = (proj.payload.steps || []).map((s) =>
      s.id === stepId ? { ...s, done: !s.done } : s
    );
    await updateRecord(
      'projects',
      proj.id,
      proj.title,
      { ...proj.payload, steps: updatedSteps },
      proj.updatedAtMs
    );
  };

  const pushMaterialsToShopping = async (proj: HomesteadRecord<ProjectPayload>) => {
    const mats = proj.payload.materials || [];
    if (mats.length === 0) {
      pushToast('info', 'Keine Materialien im Projekt hinterlegt.');
      return;
    }
    for (const mat of mats) {
      await createRecord('shoppingItems', mat, {
        category: 'Baumaterial',
        quantity: 1,
        unit: 'Position',
        source: 'Baumarkt / Fachhandel',
        estimatedPriceEur: 0,
        purchased: false,
        linkedProject: proj.title,
      });
    }
    pushToast('success', `${mats.length} Material(ien) aus „${proj.title}“ auf die Einkaufsliste gesetzt.`);
  };

  const totalBudgetPlanned = activeProjects.reduce((s, p) => s + (p.payload.budgetPlannedEur || 0), 0);
  const totalBudgetSpent = activeProjects.reduce((s, p) => s + (p.payload.budgetSpentEur || 0), 0);

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Hof- & Bauprojekte"
        subtitle="Von der Idee bis zum Abschlussbericht · Checklisten, Budget, Werkzeugbedarf & Einkaufsverknüpfung"
        actions={
          <button
            type="button"
            onClick={openNew}
            className="px-3.5 py-2 rounded-xl bg-[#233A29] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 hover:opacity-90 transition"
          >
            <Plus className="w-4 h-4" />
            Neues Projekt
          </button>
        }
      />

      {/* Summary Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4">
          <div className="text-xs text-neutral-500">Projekte (gefiltert)</div>
          <div className="text-2xl font-bold font-mono-num mt-1">{activeProjects.length}</div>
        </div>
        <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4">
          <div className="text-xs text-neutral-500">In Arbeit</div>
          <div className="text-2xl font-bold font-mono-num mt-1">
            {activeProjects.filter((p) => p.payload.status === 'In Arbeit').length}
          </div>
        </div>
        <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4">
          <div className="text-xs text-neutral-500">Geplantes Budget</div>
          <div className="text-2xl font-bold font-mono-num mt-1">{totalBudgetPlanned.toFixed(0)} €</div>
        </div>
        <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4">
          <div className="text-xs text-neutral-500">Bisherige Ausgaben</div>
          <div className="text-2xl font-bold font-mono-num mt-1">{totalBudgetSpent.toFixed(0)} €</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as 'Alle' | ProjectPayload['status'])}
          className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-xs"
        >
          <option value="Alle">Alle Status</option>
          {PROJECT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={assigneeFilter}
          onChange={(e) => setAssigneeFilter(e.target.value as 'Alle' | AssigneeScope)}
          className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-xs"
        >
          <option value="Alle">Alle Zuständigkeiten</option>
          <option value="Nico">Nico</option>
          <option value="Chris">Chris</option>
          <option value="Gemeinsam">Gemeinsam</option>
        </select>
      </div>

      {/* Project List */}
      {activeProjects.length === 0 ? (
        <EmptyState
          title="Keine Projekte vorhanden"
          description="Plane Bauprojekte wie Hühnerstall, Kaninchengehege, Gewächshaus, Hochbeete oder Wasseranlagen mit Checkliste und Materialplan."
          actionLabel="Erstes Projekt erstellen"
          onAction={openNew}
        />
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {pagedProjects.pageItems.map((proj) => {
            const p = proj.payload;
            const steps = p.steps || [];
            const doneCount = steps.filter((s) => s.done).length;
            const pct = steps.length > 0 ? Math.round((doneCount / steps.length) * 100) : 0;

            return (
              <div
                key={proj.id}
                className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-display text-lg font-bold flex items-center gap-2">
                      <Hammer className="w-4 h-4 text-[#233A29] dark:text-[#BBE774]" />
                      {proj.title}
                    </h3>
                    <div className="text-xs text-neutral-500 mt-0.5">
                      {p.category} · {p.status} · Priorität {p.priority} · {p.assignee}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEdit(proj)}
                      className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      aria-label="Bearbeiten"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => archiveRecord('projects', proj.id, proj.title)}
                      className="p-2 rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-[#CF6432]/15 text-[#CF6432]"
                      aria-label="In Papierkorb"
                    >
                      <Archive className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {p.description && (
                  <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
                    {p.description}
                  </p>
                )}

                {/* Progress Bar */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-neutral-500">
                      Fortschritt ({doneCount}/{steps.length} Schritte)
                    </span>
                    <span className="font-mono-num font-semibold">{pct}%</span>
                  </div>
                  <div className="h-2 rounded-full bg-neutral-200 dark:bg-neutral-800 overflow-hidden">
                    <div
                      className="h-full bg-[#233A29] dark:bg-[#BBE774] transition-all"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>

                {/* Interactive Checklist */}
                {steps.length > 0 && (
                  <div className="space-y-1.5 max-h-44 overflow-y-auto">
                    {steps.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => toggleProjectStep(proj, s.id)}
                        className="w-full flex items-center gap-2 text-left text-xs p-2 rounded-lg hover:bg-[#F7F7F5] dark:hover:bg-[#0F1412]"
                      >
                        {s.done ? (
                          <CheckSquare className="w-4 h-4 text-[#3B6912] dark:text-[#BBE774] shrink-0" />
                        ) : (
                          <Square className="w-4 h-4 text-neutral-400 shrink-0" />
                        )}
                        <span className={s.done ? 'line-through text-neutral-400' : ''}>{s.label}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Budget & Dates */}
                <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                  <div className="p-2.5 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412]">
                    <div className="text-neutral-500">Start / Ziel</div>
                    <div className="font-mono-num font-medium truncate">
                      {p.startDate || '–'} / {p.targetDate || 'offen'}
                    </div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412]">
                    <div className="text-neutral-500">Budget</div>
                    <div className="font-mono-num font-semibold">{p.budgetPlannedEur.toFixed(0)} €</div>
                  </div>
                  <div className="p-2.5 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412]">
                    <div className="text-neutral-500">Ausgegeben</div>
                    <div
                      className={`font-mono-num font-semibold ${
                        p.budgetSpentEur > p.budgetPlannedEur && p.budgetPlannedEur > 0
                          ? 'text-[#CF6432]'
                          : ''
                      }`}
                    >
                      {p.budgetSpentEur.toFixed(0)} €
                    </div>
                  </div>
                </div>

                {/* Materials & Tools */}
                {(p.materials?.length > 0 || p.tools?.length > 0) && (
                  <div className="text-xs text-neutral-600 dark:text-neutral-400 space-y-1 border-t border-neutral-100 dark:border-neutral-800 pt-3">
                    {p.materials?.length > 0 && (
                      <div>
                        <strong>Materialien:</strong> {p.materials.join(', ')}
                      </div>
                    )}
                    {p.tools?.length > 0 && (
                      <div>
                        <strong>Werkzeuge:</strong> {p.tools.join(', ')}
                      </div>
                    )}
                    {p.materials?.length > 0 && (
                      <button
                        type="button"
                        onClick={() => pushMaterialsToShopping(proj)}
                        className="mt-1.5 px-3 py-1.5 rounded-lg border border-neutral-300 dark:border-neutral-700 text-xs font-medium inline-flex items-center gap-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        Material auf Einkaufsliste setzen
                      </button>
                    )}
                  </div>
                )}

                {p.finalReport && (
                  <div className="p-3 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412] text-xs">
                    <div className="font-semibold mb-0.5">Abschlussbericht:</div>
                    <p className="text-neutral-600 dark:text-neutral-400">{p.finalReport}</p>
                  </div>
                )}
              </div>
            );
          })}
          </div>
          <PaginationControls
            page={pagedProjects.page}
            totalPages={pagedProjects.totalPages}
            totalItems={pagedProjects.totalItems}
            onPageChange={pagedProjects.setPage}
            itemLabel="Projekte"
          />
        </>
      )}

      {/* Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Projekt bearbeiten' : 'Neues Hofprojekt'}
      >
        <form onSubmit={saveProject} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Projekttitel *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="z.B. Gewächshaus Fundament & Verglasung"
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Bereich / Kategorie</label>
              <select
                value={payload.category}
                onChange={(e) => setPayload({ ...payload, category: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              >
                {PROJECT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Status</label>
              <select
                value={payload.status}
                onChange={(e) =>
                  setPayload({ ...payload, status: e.target.value as ProjectPayload['status'] })
                }
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              >
                {PROJECT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Priorität</label>
              <select
                value={payload.priority}
                onChange={(e) =>
                  setPayload({ ...payload, priority: e.target.value as ProjectPayload['priority'] })
                }
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              >
                <option value="Niedrig">Niedrig</option>
                <option value="Mittel">Mittel</option>
                <option value="Hoch">Hoch</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Zuständig</label>
              <select
                value={payload.assignee}
                onChange={(e) => setPayload({ ...payload, assignee: e.target.value as AssigneeScope })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              >
                <option value="Nico">Nico</option>
                <option value="Chris">Chris</option>
                <option value="Gemeinsam">Gemeinsam</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Startdatum</label>
              <input
                type="date"
                value={payload.startDate}
                onChange={(e) => setPayload({ ...payload, startDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Zieldatum</label>
              <input
                type="date"
                value={payload.targetDate}
                onChange={(e) => setPayload({ ...payload, targetDate: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Budget (€)</label>
              <input
                type="number"
                step="1"
                value={payload.budgetPlannedEur}
                onChange={(e) => setPayload({ ...payload, budgetPlannedEur: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Ausgegeben (€)</label>
              <input
                type="number"
                step="1"
                value={payload.budgetSpentEur}
                onChange={(e) => setPayload({ ...payload, budgetSpentEur: Number(e.target.value) })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Beschreibung / Bauplan-Hinweise</label>
            <textarea
              rows={2}
              value={payload.description}
              onChange={(e) => setPayload({ ...payload, description: e.target.value })}
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-xs font-medium">Checkliste / Arbeitsschritte</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={newStepLabel}
                onChange={(e) => setNewStepLabel(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addStepToForm();
                  }
                }}
                placeholder="Neuen Schritt hinzufügen…"
                className="flex-1 px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
              <button
                type="button"
                onClick={addStepToForm}
                className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs font-semibold"
              >
                Hinzufügen
              </button>
            </div>
            {payload.steps.length > 0 && (
              <div className="space-y-1 max-h-36 overflow-y-auto">
                {payload.steps.map((s) => (
                  <div
                    key={s.id}
                    className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-[#F7F7F5] dark:bg-[#0F1412] text-xs"
                  >
                    <span>{s.label}</span>
                    <button
                      type="button"
                      onClick={() =>
                        setPayload((prev) => ({
                          ...prev,
                          steps: prev.steps.filter((st) => st.id !== s.id),
                        }))
                      }
                      className="text-neutral-400 hover:text-[#CF6432]"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Materialien (pro Zeile oder Komma)</label>
              <textarea
                rows={3}
                value={materialsText}
                onChange={(e) => setMaterialsText(e.target.value)}
                placeholder="Lärchenholz-Bretter&#10;Edelstahlschrauben&#10;Volierendraht"
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Benötigte Werkzeuge (Komma)</label>
              <textarea
                rows={3}
                value={toolsText}
                onChange={(e) => setToolsText(e.target.value)}
                placeholder="Akkuschrauber, Kappsäge, Wasserwaage"
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Abschlussbericht / Lernerfahrungen</label>
            <textarea
              rows={2}
              value={payload.finalReport}
              onChange={(e) => setPayload({ ...payload, finalReport: e.target.value })}
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
