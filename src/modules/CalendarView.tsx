import React, { useMemo, useState } from 'react';
import {
  Archive,
  Calendar as CalendarIcon,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Edit3,
  Plus,
  Repeat,
  RotateCcw,
} from 'lucide-react';
import { useHomestead } from '../context/HomesteadContext';
import { downloadIcsFile } from '../lib/exports';
import {
  EmptyState,
  Modal,
  ModuleHeader,
  PaginationControls,
  SegmentedTabs,
  usePagination,
} from '../components/ui/SharedUI';
import type {
  AssigneeScope,
  CalendarCategory,
  CalendarEventPayload,
  HomesteadRecord,
} from '../types/homestead';

const CATEGORIES: CalendarCategory[] = [
  'Allgemein',
  'Garten',
  'Aussaat',
  'Pflanzung',
  'Pflege',
  'Ernte',
  'Tierpflege',
  'Fütterung',
  'Reinigung',
  'Tierarzt',
  'Verarbeitung',
  'Vorratskontrolle',
  'Projekte',
  'Wartung',
  'Saison',
];

const RECURRENCE_LABELS: Record<CalendarEventPayload['recurrence'], string> = {
  none: 'Einmalig',
  daily: 'Täglich',
  weekly: 'Wöchentlich',
  monthly: 'Monatlich',
  yearly: 'Jährlich',
};

function addRecurrenceDate(dateStr: string, recurrence: CalendarEventPayload['recurrence']): string {
  const base = new Date(dateStr + 'T12:00:00');
  if (Number.isNaN(base.getTime())) return dateStr;
  if (recurrence === 'daily') base.setDate(base.getDate() + 1);
  else if (recurrence === 'weekly') base.setDate(base.getDate() + 7);
  else if (recurrence === 'monthly') base.setMonth(base.getMonth() + 1);
  else if (recurrence === 'yearly') base.setFullYear(base.getFullYear() + 1);
  return base.toISOString().slice(0, 10);
}

function getAssigneeDotColor(assignee: AssigneeScope): string {
  if (assignee === 'Nico') return '#BBE774';
  if (assignee === 'Chris') return '#F28090';
  return '#597CD4';
}

function startOfWeekMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(12, 0, 0, 0);
  return d;
}

export const CalendarView: React.FC = () => {
  const {
    calendarEvents,
    areas,
    activeIdentity,
    createRecord,
    updateRecord,
    archiveRecord,
    pushToast,
  } = useHomestead();

  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month' | 'year' | 'tasks'>('month');
  const [cursorDate, setCursorDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [filterAssignee, setFilterAssignee] = useState<'Alle' | AssigneeScope>('Alle');
  const [filterCategory, setFilterCategory] = useState<'Alle' | CalendarCategory>('Alle');
  const [hideCompleted, setHideCompleted] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const [editing, setEditing] = useState<HomesteadRecord<CalendarEventPayload> | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formPayload, setFormPayload] = useState<CalendarEventPayload>({
    eventType: 'task',
    description: '',
    date: new Date().toISOString().slice(0, 10),
    startTime: '09:00',
    endTime: '10:00',
    category: 'Garten',
    assignee: activeIdentity || 'Gemeinsam',
    recurrence: 'none',
    reminderMinutes: 30,
    areaId: '',
    areaName: '',
    completed: false,
    notes: '',
  });

  const activeAreas = useMemo(() => areas.filter((a) => !a.archived), [areas]);
  const todayStr = new Date().toISOString().slice(0, 10);

  const filteredEvents = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return calendarEvents
      .filter((e) => !e.archived)
      .filter((e) => (filterAssignee === 'Alle' ? true : e.payload.assignee === filterAssignee))
      .filter((e) => (filterCategory === 'Alle' ? true : e.payload.category === filterCategory))
      .filter((e) => (hideCompleted ? !e.payload.completed : true))
      .filter((e) =>
        q
          ? e.title.toLowerCase().includes(q) ||
            (e.payload.description || '').toLowerCase().includes(q) ||
            (e.payload.areaName || '').toLowerCase().includes(q)
          : true
      )
      .sort((a, b) => {
        const cmp = a.payload.date.localeCompare(b.payload.date);
        return cmp !== 0 ? cmp : (a.payload.startTime || '').localeCompare(b.payload.startTime || '');
      });
  }, [calendarEvents, filterAssignee, filterCategory, hideCompleted, searchTerm]);

  const pagedTasks = usePagination(filteredEvents, 6);

  const openNewModal = (defaultDate?: string, defaultType: 'event' | 'task' = 'task') => {
    setEditing(null);
    setFormTitle('');
    setFormPayload({
      eventType: defaultType,
      description: '',
      date: defaultDate || cursorDate || todayStr,
      startTime: '09:00',
      endTime: '10:00',
      category: 'Garten',
      assignee: activeIdentity || 'Gemeinsam',
      recurrence: 'none',
      reminderMinutes: 30,
      areaId: '',
      areaName: '',
      completed: false,
      notes: '',
    });
    setShowModal(true);
  };

  const openEditModal = (ev: HomesteadRecord<CalendarEventPayload>) => {
    setEditing(ev);
    setFormTitle(ev.title);
    setFormPayload({ ...ev.payload });
    setShowModal(true);
  };

  const saveModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;
    const areaMatch = activeAreas.find((a) => a.id === formPayload.areaId);
    const payload: CalendarEventPayload = {
      ...formPayload,
      areaName: areaMatch ? areaMatch.title : formPayload.areaName || '',
    };
    if (editing) {
      await updateRecord('calendarEvents', editing.id, formTitle, payload, editing.updatedAtMs);
      pushToast('success', 'Kalendereintrag aktualisiert.');
    } else {
      await createRecord('calendarEvents', formTitle, payload);
      pushToast('success', 'Neuer Kalendereintrag gespeichert.');
    }
    setShowModal(false);
  };

  const toggleCompleted = async (ev: HomesteadRecord<CalendarEventPayload>) => {
    const nextDone = !ev.payload.completed;
    await updateRecord(
      'calendarEvents',
      ev.id,
      ev.title,
      { ...ev.payload, completed: nextDone },
      ev.updatedAtMs
    );
    if (nextDone && ev.payload.recurrence && ev.payload.recurrence !== 'none') {
      const nextDate = addRecurrenceDate(ev.payload.date, ev.payload.recurrence);
      await createRecord('calendarEvents', ev.title, {
        ...ev.payload,
        date: nextDate,
        completed: false,
      });
      pushToast('success', `Erledigt & nächste Wiederholung für ${nextDate} angelegt.`);
    } else {
      pushToast('success', nextDone ? 'Als erledigt markiert.' : 'Wieder geöffnet.');
    }
  };

  const shiftCursor = (dir: -1 | 1) => {
    const d = new Date(cursorDate + 'T12:00:00');
    if (viewMode === 'day') d.setDate(d.getDate() + dir);
    else if (viewMode === 'week') d.setDate(d.getDate() + dir * 7);
    else if (viewMode === 'month') d.setMonth(d.getMonth() + dir);
    else if (viewMode === 'year') d.setFullYear(d.getFullYear() + dir);
    setCursorDate(d.toISOString().slice(0, 10));
  };

  const cursorObj = new Date(cursorDate + 'T12:00:00');
  const currentYear = cursorObj.getFullYear();
  const currentMonth = cursorObj.getMonth();

  const monthGridDays = useMemo(() => {
    const first = new Date(currentYear, currentMonth, 1, 12, 0, 0);
    const start = startOfWeekMonday(first);
    return Array.from({ length: 42 }, (_, idx) => {
      const d = new Date(start);
      d.setDate(start.getDate() + idx);
      return {
        dateStr: d.toISOString().slice(0, 10),
        dayNum: d.getDate(),
        inMonth: d.getMonth() === currentMonth,
      };
    });
  }, [currentYear, currentMonth]);

  const weekDays = useMemo(() => {
    const start = startOfWeekMonday(cursorObj);
    return Array.from({ length: 7 }, (_, idx) => {
      const d = new Date(start);
      d.setDate(start.getDate() + idx);
      return {
        dateStr: d.toISOString().slice(0, 10),
        label: d.toLocaleDateString('de-DE', { weekday: 'short', day: '2-digit', month: '2-digit' }),
      };
    });
  }, [cursorDate]);

  const eventsByDate = useMemo(() => {
    const map = new Map<string, HomesteadRecord<CalendarEventPayload>[]>();
    for (const ev of filteredEvents) {
      const arr = map.get(ev.payload.date) || [];
      arr.push(ev);
      map.set(ev.payload.date, arr);
    }
    return map;
  }, [filteredEvents]);

  const renderEventRow = (ev: HomesteadRecord<CalendarEventPayload>) => {
    const dotColor = getAssigneeDotColor(ev.payload.assignee);
    const isOverdue = ev.payload.eventType === 'task' && !ev.payload.completed && ev.payload.date < todayStr;
    return (
      <div
        key={ev.id}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800"
      >
        <div className="flex items-start gap-3 min-w-0">
          <button
            type="button"
            onClick={() => toggleCompleted(ev)}
            aria-label={ev.payload.completed ? 'Wieder öffnen' : 'Als erledigt markieren'}
            className={`mt-0.5 min-w-[36px] min-h-[36px] rounded-lg border flex items-center justify-center transition shrink-0 ${
              ev.payload.completed
                ? 'bg-[#233A29] border-[#233A29] text-white'
                : 'border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
            }`}
          >
            {ev.payload.completed ? <RotateCcw className="w-4 h-4" /> : <Check className="w-4 h-4" />}
          </button>

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: dotColor }}
                aria-hidden="true"
              />
              <span
                className={`font-semibold text-sm ${
                  ev.payload.completed ? 'line-through text-neutral-400' : 'text-neutral-900 dark:text-neutral-100'
                }`}
              >
                {ev.title}
              </span>
              {ev.payload.recurrence !== 'none' && (
                <Repeat className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
              )}
            </div>
            <div className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="font-mono-num">{ev.payload.date}</span>
              {ev.payload.startTime && (
                <>
                  <span>·</span>
                  <span className="font-mono-num">
                    {ev.payload.startTime}
                    {ev.payload.endTime ? `–${ev.payload.endTime}` : ''}
                  </span>
                </>
              )}
              <span>·</span>
              <span>{ev.payload.assignee}</span>
              <span>·</span>
              <span>{ev.payload.category}</span>
              {ev.payload.areaName && (
                <>
                  <span>·</span>
                  <span>{ev.payload.areaName}</span>
                </>
              )}
              {isOverdue && (
                <>
                  <span>·</span>
                  <span className="text-[#CF6432] font-semibold">Überfällig</span>
                </>
              )}
            </div>
            {ev.payload.description && (
              <p className="text-xs text-neutral-600 dark:text-neutral-400 mt-1">{ev.payload.description}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              downloadIcsFile([ev], `termin-${ev.payload.date}-${ev.title.toLowerCase().replace(/[^a-z0-9]+/gi, '-')}`);
              pushToast('success', 'iCalendar (.ics) für Apple Kalender / iPhone heruntergeladen.');
            }}
            className="px-2.5 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-700 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 inline-flex items-center gap-1"
            title="Einzelnen Termin als .ics für Apple Kalender exportieren"
          >
            <Download className="w-3.5 h-3.5" />
            iPhone (.ics)
          </button>
          <button
            type="button"
            onClick={() => openEditModal(ev)}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Bearbeiten"
          >
            <Edit3 className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => archiveRecord('calendarEvents', ev.id, ev.title)}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-[#CF6432]/15 text-[#CF6432]"
            aria-label="In Papierkorb"
          >
            <Archive className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Gemeinsamer Hofkalender & Aufgaben"
        subtitle="Nico (Hellgrün), Chris (Rosa) & Gemeinsam · mit direktem iPhone-/Apple-Kalender-.ics-Export"
        actions={
          <>
            <button
              type="button"
              disabled={filteredEvents.length === 0}
              onClick={() => {
                downloadIcsFile(filteredEvents, `hof-und-garten-kalender-${todayStr}`);
                pushToast('success', `${filteredEvents.length} Einträge als .ics exportiert.`);
              }}
              className="px-3.5 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs sm:text-sm font-medium inline-flex items-center gap-1.5 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition disabled:opacity-50"
            >
              <Download className="w-4 h-4" />
              iPhone-Kalender (.ics)
            </button>
            <button
              type="button"
              onClick={() => openNewModal(cursorDate, 'task')}
              className="px-3.5 py-2 rounded-xl bg-[#233A29] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 hover:opacity-90 transition"
            >
              <Plus className="w-4 h-4" />
              Aufgabe / Termin
            </button>
          </>
        }
      />

      {/* Legend & Honest Apple Calendar Info */}
      <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="w-3 h-3 rounded-full bg-[#BBE774]" /> Nico
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="w-3 h-3 rounded-full bg-[#F28090]" /> Chris
          </span>
          <span className="inline-flex items-center gap-1.5 font-medium">
            <span className="w-3 h-3 rounded-full bg-[#597CD4]" /> Gemeinsam
          </span>
        </div>
        <p className="text-neutral-600 dark:text-neutral-400">
          Apple-Kalender-Hinweis: Der Button „iPhone (.ics)“ erzeugt eine standardkonforme iCalendar-Datei inkl. Zeitzone Berlin, Wiederholung & Erinnerung zum direkten Hinzufügen auf dem iPhone (Einweg-Export ohne Google-Konto).
        </p>
      </div>

      {/* View Switcher & Filters */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <SegmentedTabs
          tabs={[
            { id: 'day', label: 'Tag' },
            { id: 'week', label: 'Woche' },
            { id: 'month', label: 'Monat' },
            { id: 'year', label: 'Jahr' },
            { id: 'tasks', label: 'Aufgabenliste' },
          ]}
          activeTab={viewMode}
          onChange={(id) => setViewMode(id as typeof viewMode)}
        />

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Suche in Terminen…"
            className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-xs w-44"
          />
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value as 'Alle' | AssigneeScope)}
            className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-xs"
          >
            <option value="Alle">Alle Personen</option>
            <option value="Nico">Nico</option>
            <option value="Chris">Chris</option>
            <option value="Gemeinsam">Gemeinsam</option>
          </select>
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value as 'Alle' | CalendarCategory)}
            className="px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#161D1A] text-xs"
          >
            <option value="Alle">Alle Kategorien</option>
            {CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <label className="inline-flex items-center gap-1.5 text-xs px-2.5 py-2 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161D1A] cursor-pointer">
            <input
              type="checkbox"
              checked={hideCompleted}
              onChange={(e) => setHideCompleted(e.target.checked)}
            />
            Offene zuerst / Erledigte aus
          </label>
        </div>
      </div>

      {/* Period Navigation Bar (except pure task list) */}
      {viewMode !== 'tasks' && (
        <div className="flex items-center justify-between bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl px-4 py-3">
          <button
            type="button"
            onClick={() => shiftCursor(-1)}
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Vorheriger Zeitraum"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-3">
            <span className="font-display font-semibold text-sm sm:text-base">
              {viewMode === 'day' &&
                cursorObj.toLocaleDateString('de-DE', {
                  weekday: 'long',
                  day: '2-digit',
                  month: 'long',
                  year: 'numeric',
                })}
              {viewMode === 'week' && `Woche ab ${weekDays[0]?.label}`}
              {viewMode === 'month' &&
                cursorObj.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}
              {viewMode === 'year' && `Jahresübersicht ${currentYear}`}
            </span>
            <button
              type="button"
              onClick={() => setCursorDate(todayStr)}
              className="text-xs px-2.5 py-1 rounded-lg border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Heute
            </button>
          </div>
          <button
            type="button"
            onClick={() => shiftCursor(1)}
            className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-lg border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Nächster Zeitraum"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Day View */}
      {viewMode === 'day' && (
        <div className="space-y-3">
          {(eventsByDate.get(cursorDate) || []).length === 0 ? (
            <EmptyState
              title="Keine Einträge an diesem Tag"
              description={`Für den ${cursorDate} liegen keine gefilterten Termine oder Aufgaben vor.`}
              actionLabel="Für diesen Tag planen"
              onAction={() => openNewModal(cursorDate, 'task')}
            />
          ) : (
            (eventsByDate.get(cursorDate) || []).map(renderEventRow)
          )}
        </div>
      )}

      {/* Week View */}
      {viewMode === 'week' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
          {weekDays.map((day) => {
            const list = eventsByDate.get(day.dateStr) || [];
            const isToday = day.dateStr === todayStr;
            return (
              <div
                key={day.dateStr}
                className={`bg-white dark:bg-[#161D1A] border rounded-2xl p-3 flex flex-col gap-2 min-h-[180px] ${
                  isToday ? 'border-[#233A29] dark:border-[#BBE774]' : 'border-neutral-200 dark:border-neutral-800'
                }`}
              >
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-neutral-800 pb-2">
                  <span className="text-xs font-semibold">{day.label}</span>
                  <button
                    type="button"
                    onClick={() => openNewModal(day.dateStr, 'task')}
                    className="text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
                    aria-label="Neuer Eintrag"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-1.5">
                  {list.map((ev) => (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={() => openEditModal(ev)}
                      className="w-full text-left p-2 rounded-lg bg-[#F7F7F5] dark:bg-[#0F1412] hover:opacity-90 text-xs space-y-0.5"
                    >
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: getAssigneeDotColor(ev.payload.assignee) }}
                        />
                        <span className={`font-medium truncate ${ev.payload.completed ? 'line-through text-neutral-400' : ''}`}>
                          {ev.title}
                        </span>
                      </div>
                      <div className="text-[10px] text-neutral-500 font-mono-num">
                        {ev.payload.startTime || 'Ganztägig'} · {ev.payload.category}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Month View */}
      {viewMode === 'month' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden">
            <div className="grid grid-cols-7 border-b border-neutral-200 dark:border-neutral-800 text-center text-xs font-semibold text-neutral-500 py-2">
              {['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthGridDays.map((cell) => {
                const list = eventsByDate.get(cell.dateStr) || [];
                const isSelected = cell.dateStr === cursorDate;
                const isToday = cell.dateStr === todayStr;
                return (
                  <button
                    key={cell.dateStr}
                    type="button"
                    onClick={() => setCursorDate(cell.dateStr)}
                    className={`min-h-[84px] sm:min-h-[104px] p-1.5 sm:p-2 border-b border-r border-neutral-100 dark:border-neutral-800/80 text-left flex flex-col gap-1 transition hover:bg-neutral-50 dark:hover:bg-neutral-900/40 ${
                      !cell.inMonth ? 'opacity-40' : ''
                    } ${isSelected ? 'bg-[#BBE774]/15' : ''}`}
                  >
                    <span
                      className={`text-xs font-mono-num w-6 h-6 rounded-full flex items-center justify-center ${
                        isToday ? 'bg-[#233A29] text-white font-bold' : 'font-medium'
                      }`}
                    >
                      {cell.dayNum}
                    </span>
                    <div className="space-y-0.5 w-full overflow-hidden">
                      {list.slice(0, 3).map((ev) => (
                        <div
                          key={ev.id}
                          className="flex items-center gap-1 text-[10px] sm:text-[11px] truncate"
                        >
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: getAssigneeDotColor(ev.payload.assignee) }}
                          />
                          <span className={`truncate ${ev.payload.completed ? 'line-through text-neutral-400' : ''}`}>
                            {ev.title}
                          </span>
                        </div>
                      ))}
                      {list.length > 3 && (
                        <div className="text-[10px] text-neutral-500 font-mono-num">
                          +{list.length - 3} weitere
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold">
                Ausgewählter Tag: {cursorDate}
              </h2>
              <button
                type="button"
                onClick={() => openNewModal(cursorDate, 'event')}
                className="text-xs font-semibold text-[#233A29] dark:text-[#BBE774] hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Eintrag am {cursorDate}
              </button>
            </div>
            {(eventsByDate.get(cursorDate) || []).length === 0 ? (
              <p className="text-xs text-neutral-500">Keine Einträge am {cursorDate}.</p>
            ) : (
              (eventsByDate.get(cursorDate) || []).map(renderEventRow)
            )}
          </div>
        </div>
      )}

      {/* Year View */}
      {viewMode === 'year' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 12 }, (_, mIdx) => {
            const monthKey = `${currentYear}-${String(mIdx + 1).padStart(2, '0')}`;
            const monthItems = filteredEvents.filter((e) => e.payload.date.startsWith(monthKey));
            const label = new Date(currentYear, mIdx, 1).toLocaleDateString('de-DE', { month: 'long' });
            return (
              <div
                key={monthKey}
                className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setCursorDate(`${monthKey}-01`);
                      setViewMode('month');
                    }}
                    className="font-display font-semibold text-sm hover:underline"
                  >
                    {label}
                  </button>
                  <span className="text-xs font-mono-num text-neutral-500">{monthItems.length} Einträge</span>
                </div>
                {monthItems.length === 0 ? (
                  <p className="text-xs text-neutral-400">Keine Einträge</p>
                ) : (
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {monthItems.slice(0, 6).map((ev) => (
                      <button
                        key={ev.id}
                        type="button"
                        onClick={() => openEditModal(ev)}
                        className="w-full text-left text-xs flex items-center gap-1.5 hover:underline truncate"
                      >
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: getAssigneeDotColor(ev.payload.assignee) }}
                        />
                        <span className="font-mono-num text-neutral-500">{ev.payload.date.slice(8, 10)}.</span>
                        <span className="truncate">{ev.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Task List View (Paged for low scroll) */}
      {viewMode === 'tasks' && (
        <div className="space-y-3">
          {filteredEvents.length === 0 ? (
            <EmptyState
              title="Keine Aufgaben oder Termine"
              description="Erstelle eine gemeinsame oder persönliche Aufgabe für Nico oder Chris."
              actionLabel="Erste Aufgabe anlegen"
              onAction={() => openNewModal(todayStr, 'task')}
            />
          ) : (
            <>
              {pagedTasks.pageItems.map(renderEventRow)}
              <PaginationControls
                page={pagedTasks.page}
                totalPages={pagedTasks.totalPages}
                totalItems={pagedTasks.totalItems}
                onPageChange={pagedTasks.setPage}
                itemLabel="Einträge"
              />
            </>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={editing ? 'Eintrag bearbeiten' : 'Neuer Kalendereintrag / Aufgabe'}
      >
        <form onSubmit={saveModal} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setFormPayload({ ...formPayload, eventType: 'task' })}
              className={`py-2 rounded-xl border text-xs font-semibold ${
                formPayload.eventType === 'task'
                  ? 'bg-[#233A29] text-white border-[#233A29]'
                  : 'border-neutral-300 dark:border-neutral-700'
              }`}
            >
              Aufgabe (abhakbar)
            </button>
            <button
              type="button"
              onClick={() => setFormPayload({ ...formPayload, eventType: 'event' })}
              className={`py-2 rounded-xl border text-xs font-semibold ${
                formPayload.eventType === 'event'
                  ? 'bg-[#233A29] text-white border-[#233A29]'
                  : 'border-neutral-300 dark:border-neutral-700'
              }`}
            >
              Termin / Ereignis
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Titel *</label>
            <input
              type="text"
              required
              value={formTitle}
              onChange={(e) => setFormTitle(e.target.value)}
              placeholder="z.B. Tomaten pikieren oder Hühnerstall misten"
              className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Datum</label>
              <input
                type="date"
                required
                value={formPayload.date}
                onChange={(e) => setFormPayload({ ...formPayload, date: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Startzeit</label>
              <input
                type="time"
                value={formPayload.startTime}
                onChange={(e) => setFormPayload({ ...formPayload, startTime: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Endzeit</label>
              <input
                type="time"
                value={formPayload.endTime}
                onChange={(e) => setFormPayload({ ...formPayload, endTime: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Zuständig</label>
              <select
                value={formPayload.assignee}
                onChange={(e) => setFormPayload({ ...formPayload, assignee: e.target.value as AssigneeScope })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              >
                <option value="Nico">Nico (Hellgrün)</option>
                <option value="Chris">Chris (Rosa)</option>
                <option value="Gemeinsam">Gemeinsam (Blau)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Kategorie</label>
              <select
                value={formPayload.category}
                onChange={(e) => setFormPayload({ ...formPayload, category: e.target.value as CalendarCategory })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Wiederholung</label>
              <select
                value={formPayload.recurrence}
                onChange={(e) =>
                  setFormPayload({
                    ...formPayload,
                    recurrence: e.target.value as CalendarEventPayload['recurrence'],
                  })
                }
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              >
                {Object.entries(RECURRENCE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium mb-1">Grundstücksbereich (optional)</label>
              <select
                value={formPayload.areaId || ''}
                onChange={(e) => setFormPayload({ ...formPayload, areaId: e.target.value })}
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              >
                <option value="">Kein Bereich verknüpft</option>
                {activeAreas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.title} ({a.payload.areaType})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Erinnerung (.ics VALARM)</label>
              <select
                value={formPayload.reminderMinutes}
                onChange={(e) =>
                  setFormPayload({ ...formPayload, reminderMinutes: Number(e.target.value) })
                }
                className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm"
              >
                <option value={0}>Keine Erinnerung</option>
                <option value={15}>15 Minuten vorher</option>
                <option value={30}>30 Minuten vorher</option>
                <option value={60}>1 Stunde vorher</option>
                <option value={1440}>1 Tag vorher</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium mb-1">Beschreibung / Notizen</label>
            <textarea
              rows={3}
              value={formPayload.description}
              onChange={(e) => setFormPayload({ ...formPayload, description: e.target.value })}
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
              className="px-4 py-2 rounded-xl bg-[#233A29] text-white text-xs font-semibold inline-flex items-center gap-1.5"
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              Speichern
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
