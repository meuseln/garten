import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Grid3x3,
  MapPin,
  MousePointer,
  PenTool,
  RotateCcw,
  Save,
  Sprout,
  Square,
  Trash2,
  Type,
} from 'lucide-react';
import { useHomestead } from '../../context/HomesteadContext';
import type { GardenMapItem } from '../../types/homestead';

export const GARDEN_MAP_DOC_ID = 'garden_map_schema_v1';

const MAP_WIDTH = 1425;
const MAP_HEIGHT = 1104;

type MapTool = 'select' | 'rect' | 'polygon' | 'label';

const COLOR_SWATCHES: Array<{ color: string; name: string }> = [
  { color: '#18201B', name: 'Schwarz-Weiß (Schema)' },
  { color: '#3B6912', name: 'Gemüse / Beet' },
  { color: '#D97706', name: 'Obst & Beeren' },
  { color: '#597CD4', name: 'Wasser / Gewächshaus' },
  { color: '#CF6432', name: 'Tiere & Kompost' },
  { color: '#D45B6E', name: 'Blumen & Terrasse' },
];

export const GardenMapCanvas: React.FC = () => {
  const { areas, plantings, documents, createRecord, updateRecord, pushToast } = useHomestead();
  const activeAreas = useMemo(() => areas.filter((a) => !a.archived), [areas]);
  const activePlantings = useMemo(
    () => plantings.filter((p) => !p.archived && p.payload.status !== 'Abgeerntet'),
    [plantings]
  );
  const mapDoc = useMemo(
    () => documents.find((d) => d.id === GARDEN_MAP_DOC_ID && !d.archived) || null,
    [documents]
  );

  const [items, setItems] = useState<GardenMapItem[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  // Sync from Firestore when document loads/updates remotely unless user has unsaved edits
  useEffect(() => {
    if (!hasUnsavedChanges && mapDoc?.payload?.mapItems) {
      setItems(mapDoc.payload.mapItems);
    }
  }, [mapDoc, hasUnsavedChanges]);

  const [tool, setTool] = useState<MapTool>('select');
  const [activeColor, setActiveColor] = useState<string>('#3B6912');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAerialOverlay, setShowAerialOverlay] = useState(false);
  const [showGrid, setShowGrid] = useState(false);

  // Drawing states
  const svgRef = useRef<SVGSVGElement | null>(null);
  const [rectDraft, setRectDraft] = useState<{ x1: number; y1: number; x2: number; y2: number } | null>(null);
  const [polyPoints, setPolyPoints] = useState<Array<{ x: number; y: number }>>([]);
  const [dragState, setDragState] = useState<{
    id: string;
    startX: number;
    startY: number;
    origX: number;
    origY: number;
  } | null>(null);

  const selectedItem = useMemo(
    () => items.find((it) => it.id === selectedId) || null,
    [items, selectedId]
  );

  const linkedAreaPlantings = useMemo(() => {
    if (!selectedItem?.linkedAreaId) return [];
    const linkedArea = activeAreas.find((a) => a.id === selectedItem.linkedAreaId);
    return activePlantings.filter(
      (pl) =>
        pl.payload.areaId === selectedItem.linkedAreaId ||
        (linkedArea && pl.payload.areaName.toLowerCase() === linkedArea.title.toLowerCase())
    );
  }, [selectedItem, activeAreas, activePlantings]);

  const getSvgCoords = (e: React.PointerEvent<Element>): { x: number; y: number } => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * MAP_WIDTH);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * MAP_HEIGHT);
    return {
      x: Math.max(12, Math.min(MAP_WIDTH - 12, x)),
      y: Math.max(12, Math.min(MAP_HEIGHT - 12, y)),
    };
  };

  const handleSvgPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    const pt = getSvgCoords(e);

    if (tool === 'rect') {
      setRectDraft({ x1: pt.x, y1: pt.y, x2: pt.x, y2: pt.y });
      return;
    }

    if (tool === 'polygon') {
      setPolyPoints((prev) => [...prev, pt]);
      return;
    }

    if (tool === 'label') {
      const newId = `lbl_${Date.now()}`;
      const newItem: GardenMapItem = {
        id: newId,
        kind: 'label',
        label: 'Neuer Marker',
        color: activeColor,
        x: pt.x,
        y: pt.y,
        notes: '',
      };
      setItems((prev) => [...prev, newItem]);
      setSelectedId(newId);
      setHasUnsavedChanges(true);
      setTool('select');
      return;
    }

    // Select background clears selection
    if (e.target === svgRef.current || (e.target as SVGElement).dataset?.bg === 'true') {
      setSelectedId(null);
    }
  };

  const handleSvgPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const pt = getSvgCoords(e);

    if (tool === 'rect' && rectDraft) {
      setRectDraft((prev) => (prev ? { ...prev, x2: pt.x, y2: pt.y } : null));
      return;
    }

    if (tool === 'select' && dragState) {
      const dx = pt.x - dragState.startX;
      const dy = pt.y - dragState.startY;
      setItems((prev) =>
        prev.map((it) =>
          it.id === dragState.id
            ? {
                ...it,
                x: Math.max(20, Math.min(MAP_WIDTH - 40, dragState.origX + dx)),
                y: Math.max(20, Math.min(MAP_HEIGHT - 30, dragState.origY + dy)),
              }
            : it
        )
      );
      setHasUnsavedChanges(true);
    }
  };

  const handleSvgPointerUp = () => {
    if (tool === 'rect' && rectDraft) {
      const x = Math.min(rectDraft.x1, rectDraft.x2);
      const y = Math.min(rectDraft.y1, rectDraft.y2);
      const width = Math.abs(rectDraft.x2 - rectDraft.x1);
      const height = Math.abs(rectDraft.y2 - rectDraft.y1);
      setRectDraft(null);
      if (width >= 20 && height >= 20) {
        const newId = `rect_${Date.now()}`;
        const newItem: GardenMapItem = {
          id: newId,
          kind: 'rect',
          label: `Bereich ${items.length + 1}`,
          color: activeColor,
          x,
          y,
          width,
          height,
          notes: '',
        };
        setItems((prev) => [...prev, newItem]);
        setSelectedId(newId);
        setHasUnsavedChanges(true);
        setTool('select');
      }
    }
    if (dragState) {
      setDragState(null);
    }
  };

  const finishPolygon = () => {
    if (polyPoints.length < 3) {
      pushToast('warning', 'Bitte mindestens 3 Punkte für eine Fläche setzen.');
      return;
    }
    const newId = `poly_${Date.now()}`;
    const newItem: GardenMapItem = {
      id: newId,
      kind: 'polygon',
      label: `Fläche ${items.length + 1}`,
      color: activeColor,
      points: polyPoints,
      notes: '',
    };
    setItems((prev) => [...prev, newItem]);
    setPolyPoints([]);
    setSelectedId(newId);
    setHasUnsavedChanges(true);
    setTool('select');
  };

  const updateSelected = (patch: Partial<GardenMapItem>) => {
    if (!selectedId) return;
    setItems((prev) => prev.map((it) => (it.id === selectedId ? { ...it, ...patch } : it)));
    setHasUnsavedChanges(true);
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setItems((prev) => prev.filter((it) => it.id !== selectedId));
    setSelectedId(null);
    setHasUnsavedChanges(true);
  };

  const saveMapToFirestore = async () => {
    setSaving(true);
    try {
      const payload = {
        docType: 'Grundstück' as const,
        linkedModule: 'Grundstück',
        date: new Date().toISOString().slice(0, 10),
        fileName: 'gartenkarte-schema-mellenbach.png',
        externalUrl: '',
        notes: 'Interaktive Grundstückskarte Karl-Marx-Str. 113 (Originale Schemazeichnung)',
        mapItems: items,
      };
      if (mapDoc) {
        await updateRecord('documents', GARDEN_MAP_DOC_ID, 'Gartenkarte Karl-Marx-Str. 113', payload, mapDoc.updatedAtMs);
      } else {
        await createRecord('documents', 'Gartenkarte Karl-Marx-Str. 113', payload, GARDEN_MAP_DOC_ID);
      }
      setHasUnsavedChanges(false);
      pushToast('success', 'Gartenkarte & Beschriftungen gespeichert.');
    } finally {
      setSaving(false);
    }
  };

  const loadSampleMarkers = () => {
    const samples: GardenMapItem[] = [
      {
        id: 'sample_hochbeet',
        kind: 'rect',
        label: 'Hochbeete / Gemüse',
        color: '#3B6912',
        x: 685,
        y: 355,
        width: 115,
        height: 75,
        notes: 'Sonniger Platz nah an Wohnhaus & Terrasse',
      },
      {
        id: 'sample_obst',
        kind: 'rect',
        label: 'Obstbäume & Beeren',
        color: '#D97706',
        x: 240,
        y: 165,
        width: 240,
        height: 155,
        notes: 'Oberer Garten (Hang)',
      },
      {
        id: 'sample_suedgarten',
        kind: 'label',
        label: 'Hühner / Wiese (Süd)',
        color: '#CF6432',
        x: 910,
        y: 745,
        notes: 'Unterer Garten an der Karl-Marx-Straße',
      },
    ];
    setItems((prev) => [...prev, ...samples]);
    setHasUnsavedChanges(true);
    pushToast('info', '3 Beispiel-Markierungen ergänzt — du kannst sie frei verschieben oder umbenennen.');
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-3 sm:p-4 flex flex-col xl:flex-row xl:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {[
            { id: 'select' as const, label: 'Auswählen / Ziehen', icon: MousePointer },
            { id: 'rect' as const, label: 'Rechteck zeichnen', icon: Square },
            { id: 'polygon' as const, label: 'Freie Fläche', icon: PenTool },
            { id: 'label' as const, label: 'Beschriftung', icon: Type },
          ].map((btn) => {
            const Icon = btn.icon;
            const active = tool === btn.id;
            return (
              <button
                key={btn.id}
                type="button"
                onClick={() => {
                  setTool(btn.id);
                  if (btn.id !== 'polygon') setPolyPoints([]);
                  if (btn.id !== 'rect') setRectDraft(null);
                }}
                className={`min-h-[42px] px-3 py-2 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition ${
                  active
                    ? 'bg-[#233A29] text-white'
                    : 'border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span>{btn.label}</span>
              </button>
            );
          })}

          {tool === 'polygon' && polyPoints.length > 0 && (
            <div className="flex items-center gap-1.5 ml-1">
              <button
                type="button"
                onClick={finishPolygon}
                className="min-h-[40px] px-3 rounded-xl bg-[#3B6912] text-white text-xs font-semibold inline-flex items-center gap-1"
              >
                <Check className="w-3.5 h-3.5" />
                Fläche schließen ({polyPoints.length})
              </button>
              <button
                type="button"
                onClick={() => setPolyPoints([])}
                className="min-h-[40px] px-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 text-xs"
                title="Zeichnen abbrechen"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Color Picker */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-xl border border-neutral-200 dark:border-neutral-700">
            <span className="text-[11px] text-neutral-500 mr-1">Farbe:</span>
            {COLOR_SWATCHES.map((sw) => (
              <button
                key={sw.color}
                type="button"
                title={sw.name}
                onClick={() => {
                  setActiveColor(sw.color);
                  if (selectedItem) updateSelected({ color: sw.color });
                }}
                className={`w-6 h-6 rounded-full border-2 transition ${
                  activeColor === sw.color ? 'border-neutral-900 dark:border-white scale-110' : 'border-transparent'
                }`}
                style={{ backgroundColor: sw.color }}
                aria-label={sw.name}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => setShowGrid((v) => !v)}
            className={`min-h-[40px] px-3 rounded-xl border text-xs font-medium inline-flex items-center gap-1.5 ${
              showGrid
                ? 'bg-[#233A29]/10 border-[#233A29] text-[#233A29] dark:text-[#BBE774]'
                : 'border-neutral-200 dark:border-neutral-700'
            }`}
          >
            <Grid3x3 className="w-3.5 h-3.5" />
            Raster
          </button>

          <button
            type="button"
            onClick={() => setShowAerialOverlay((v) => !v)}
            className={`min-h-[40px] px-3 rounded-xl border text-xs font-medium inline-flex items-center gap-1.5 ${
              showAerialOverlay
                ? 'bg-[#597CD4]/15 border-[#597CD4] text-[#597CD4]'
                : 'border-neutral-200 dark:border-neutral-700'
            }`}
          >
            <MapPin className="w-3.5 h-3.5" />
            {showAerialOverlay ? 'Luftbild aus' : 'Luftbild-Vergleich'}
          </button>

          {items.length === 0 && (
            <button
              type="button"
              onClick={loadSampleMarkers}
              className="min-h-[40px] px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              Beispiel-Ideen
            </button>
          )}

          <button
            type="button"
            disabled={saving}
            onClick={saveMapToFirestore}
            className={`min-h-[40px] px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition ${
              hasUnsavedChanges
                ? 'bg-[#233A29] text-white shadow-sm'
                : 'bg-neutral-900 text-white dark:bg-[#BBE774] dark:text-[#18201B]'
            }`}
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Speichert…' : hasUnsavedChanges ? 'Karte speichern *' : 'Gespeichert'}
          </button>
        </div>
      </div>

      {/* Tool usage hint */}
      <div className="text-xs text-neutral-600 dark:text-neutral-400 px-1">
        {tool === 'select' &&
          'Originale Grundstücks-Schemazeichnung (Karl-Marx-Str. 113): Tippe auf eine Markierung zum Verschieben/Verknüpfen oder wähle oben ein Zeichenwerkzeug.'}
        {tool === 'rect' &&
          'Ziehe mit Maus oder Finger ein Rechteck direkt auf deine Schemazeichnung (z.B. für ein Beet, Gewächshaus oder Hühnerauslauf).'}
        {tool === 'polygon' &&
          'Tippe nacheinander die Eckpunkte deiner gewünschten Fläche an und klicke danach auf „Fläche schließen“.'}
        {tool === 'label' &&
          'Tippe irgendwo auf die Karte, um eine frei verschiebbare Beschriftung oder einen Pin zu setzen.'}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Main Interactive Map SVG over User's Exact Schematic Drawing */}
        <div className="lg:col-span-9 bg-white border-2 border-neutral-900 rounded-2xl overflow-hidden shadow-xs">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
            className="w-full h-auto block select-none touch-none cursor-crosshair bg-white"
            onPointerDown={handleSvgPointerDown}
            onPointerMove={handleSvgPointerMove}
            onPointerUp={handleSvgPointerUp}
          >
            <defs>
              <pattern id="bw-grid" width="35" height="35" patternUnits="userSpaceOnUse">
                <path d="M 35 0 L 0 0 0 35" fill="none" stroke="#CBD5E1" strokeWidth="0.9" />
              </pattern>
            </defs>

            {/* White paper background */}
            <rect data-bg="true" x="0" y="0" width={MAP_WIDTH} height={MAP_HEIGHT} fill="#FFFFFF" />

            {/* Optional Aerial Comparison Overlay underneath schematic */}
            {showAerialOverlay && (
              <image
                href="/assets/aistudio/image_695e71a4.png"
                x="0"
                y="0"
                width={MAP_WIDTH}
                height={MAP_HEIGHT}
                preserveAspectRatio="none"
                opacity="0.32"
                style={{ pointerEvents: 'none' }}
              />
            )}

            {/* User's Exact Black-and-White Schematic Drawing */}
            <image
              href="/assets/aistudio/image_6db0e6d5.png"
              x="0"
              y="0"
              width={MAP_WIDTH}
              height={MAP_HEIGHT}
              preserveAspectRatio="xMidYMid meet"
              opacity={showAerialOverlay ? '0.78' : '1'}
              style={{ pointerEvents: 'none' }}
            />

            {/* Optional Blueprint Grid Overlay */}
            {showGrid && (
              <rect
                data-bg="true"
                x="0"
                y="0"
                width={MAP_WIDTH}
                height={MAP_HEIGHT}
                fill="url(#bw-grid)"
                opacity="0.55"
                style={{ pointerEvents: 'none' }}
              />
            )}

            {/* === USER-DRAWN INTERACTIVE AREAS & LABELS === */}
            {items.map((item) => {
              const isSelected = item.id === selectedId;
              const strokeColor = item.color || '#18201B';

              if (item.kind === 'rect') {
                const x = item.x ?? 200;
                const y = item.y ?? 200;
                const w = item.width ?? 120;
                const h = item.height ?? 75;
                const boxW = Math.min(240, Math.max(90, item.label.length * 10 + 30));
                return (
                  <g
                    key={item.id}
                    className="cursor-pointer"
                    onPointerDown={(e) => {
                      if (tool !== 'select') return;
                      e.stopPropagation();
                      const pt = getSvgCoords(e);
                      setSelectedId(item.id);
                      setDragState({ id: item.id, startX: pt.x, startY: pt.y, origX: x, origY: y });
                    }}
                  >
                    <rect
                      x={x}
                      y={y}
                      width={w}
                      height={h}
                      rx="8"
                      fill={strokeColor}
                      fillOpacity={strokeColor === '#18201B' ? 0.12 : 0.22}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 4.5 : 3}
                      strokeDasharray={isSelected ? '8 4' : undefined}
                    />
                    <rect
                      x={x + w / 2 - boxW / 2}
                      y={y + h / 2 - 15}
                      width={boxW}
                      height={30}
                      rx="6"
                      fill="#FFFFFF"
                      stroke={strokeColor}
                      strokeWidth="1.6"
                    />
                    <text
                      x={x + w / 2}
                      y={y + h / 2 + 5}
                      textAnchor="middle"
                      fill="#111827"
                      fontSize="15.5"
                      fontWeight="700"
                    >
                      {item.label}
                    </text>
                  </g>
                );
              }

              if (item.kind === 'polygon' && item.points && item.points.length >= 3) {
                const ptsStr = item.points.map((p) => `${p.x},${p.y}`).join(' ');
                const cx = Math.round(item.points.reduce((s, p) => s + p.x, 0) / item.points.length);
                const cy = Math.round(item.points.reduce((s, p) => s + p.y, 0) / item.points.length);
                const boxW = Math.min(240, Math.max(90, item.label.length * 10 + 30));
                return (
                  <g
                    key={item.id}
                    className="cursor-pointer"
                    onPointerDown={(e) => {
                      if (tool !== 'select') return;
                      e.stopPropagation();
                      setSelectedId(item.id);
                    }}
                  >
                    <polygon
                      points={ptsStr}
                      fill={strokeColor}
                      fillOpacity={strokeColor === '#18201B' ? 0.12 : 0.24}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 4.5 : 3}
                      strokeLinejoin="round"
                    />
                    <rect
                      x={cx - boxW / 2}
                      y={cy - 15}
                      width={boxW}
                      height={30}
                      rx="6"
                      fill="#FFFFFF"
                      stroke={strokeColor}
                      strokeWidth="1.6"
                    />
                    <text
                      x={cx}
                      y={cy + 5}
                      textAnchor="middle"
                      fill="#111827"
                      fontSize="15.5"
                      fontWeight="700"
                    >
                      {item.label}
                    </text>
                  </g>
                );
              }

              // Label / Marker
              const lx = item.x ?? 400;
              const ly = item.y ?? 400;
              const boxW = Math.max(100, item.label.length * 9.5 + 28);
              return (
                <g
                  key={item.id}
                  className="cursor-pointer"
                  onPointerDown={(e) => {
                    if (tool !== 'select') return;
                    e.stopPropagation();
                    const pt = getSvgCoords(e);
                    setSelectedId(item.id);
                    setDragState({ id: item.id, startX: pt.x, startY: pt.y, origX: lx, origY: ly });
                  }}
                >
                  <circle cx={lx} cy={ly} r="8" fill={strokeColor} stroke="#FFFFFF" strokeWidth="2.2" />
                  <rect
                    x={lx + 11}
                    y={ly - 17}
                    width={boxW}
                    height={32}
                    rx="7"
                    fill="#FFFFFF"
                    stroke={isSelected ? '#597CD4' : strokeColor}
                    strokeWidth={isSelected ? 3.2 : 2}
                  />
                  <text x={lx + 22} y={ly + 4} fill="#111827" fontSize="15" fontWeight="700">
                    {item.label}
                  </text>
                </g>
              );
            })}

            {/* Live Rectangle Draft */}
            {rectDraft && (
              <rect
                x={Math.min(rectDraft.x1, rectDraft.x2)}
                y={Math.min(rectDraft.y1, rectDraft.y2)}
                width={Math.abs(rectDraft.x2 - rectDraft.x1)}
                height={Math.abs(rectDraft.y2 - rectDraft.y1)}
                fill={activeColor}
                fillOpacity="0.18"
                stroke={activeColor}
                strokeWidth="3.5"
                strokeDasharray="7 5"
              />
            )}

            {/* Live Polygon Draft */}
            {polyPoints.length > 0 && (
              <g>
                <polyline
                  points={polyPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={activeColor}
                  strokeWidth="3.5"
                  strokeDasharray="7 5"
                />
                {polyPoints.map((p, idx) => (
                  <circle
                    key={`${p.x}_${p.y}_${idx}`}
                    cx={p.x}
                    cy={p.y}
                    r="7"
                    fill="#FFFFFF"
                    stroke={activeColor}
                    strokeWidth="3"
                  />
                ))}
              </g>
            )}
          </svg>
        </div>

        {/* Side Inspector & Legend */}
        <div className="lg:col-span-3 space-y-4">
          {selectedItem ? (
            <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-display text-sm font-bold">Markierung bearbeiten</h3>
                <button
                  type="button"
                  onClick={deleteSelected}
                  className="p-2 rounded-lg text-[#CF6432] hover:bg-[#CF6432]/10"
                  aria-label="Markierung löschen"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Beschriftung</label>
                <input
                  type="text"
                  value={selectedItem.label}
                  onChange={(e) => updateSelected({ label: e.target.value })}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Mit Beet/Fläche verknüpfen</label>
                <select
                  value={selectedItem.linkedAreaId || ''}
                  onChange={(e) => {
                    const area = activeAreas.find((a) => a.id === e.target.value);
                    updateSelected({
                      linkedAreaId: e.target.value,
                      label: area ? area.title : selectedItem.label,
                    });
                  }}
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-xs"
                >
                  <option value="">Freie Beschriftung</option>
                  {activeAreas.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.title} ({a.payload.areaType})
                    </option>
                  ))}
                </select>
              </div>

              {selectedItem.linkedAreaId && (
                <div className="p-2.5 rounded-xl bg-[#BBE774]/18 border border-[#65A30D]/30 text-xs space-y-1">
                  <div className="font-semibold text-[#233A29] dark:text-[#BBE774] flex items-center gap-1">
                    <Sprout className="w-3.5 h-3.5" />
                    Aktuell auf dieser Fläche:
                  </div>
                  {linkedAreaPlantings.length === 0 ? (
                    <div className="text-neutral-600 dark:text-neutral-300">
                      Noch nichts unter „Anbau → Beete“ eingetragen.
                    </div>
                  ) : (
                    <ul className="space-y-0.5 text-neutral-800 dark:text-neutral-200">
                      {linkedAreaPlantings.map((pl) => (
                        <li key={pl.id}>
                          • {pl.payload.plantName}
                          {pl.payload.variety ? ` (${pl.payload.variety})` : ''} —{' '}
                          <span className="font-medium">{pl.payload.status}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              <div>
                <label className="block text-xs font-medium mb-1">Notiz</label>
                <textarea
                  rows={2}
                  value={selectedItem.notes || ''}
                  onChange={(e) => updateSelected({ notes: e.target.value })}
                  placeholder="z.B. Sonne am Nachmittag, Wassertonne"
                  className="w-full px-3 py-2 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-transparent text-xs"
                />
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
              <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                So funktioniert eure Gartenkarte
              </div>
              <p>
                Die Karte nutzt direkt eure Schemazeichnung mit oberem Garten, Wohnhaus, unterem Garten und Karl-Marx-Straße.
              </p>
              <p>
                Zeichne Beete, Obstbäume oder den Hühnerbereich direkt ein und verknüpfe sie mit euren Flächen — so siehst du per Klick, was dort wächst.
              </p>
            </div>
          )}

          {/* List of Drawn Areas */}
          <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-sm font-bold">
                Eingezeichnete Bereiche ({items.length})
              </h3>
            </div>
            {items.length === 0 ? (
              <p className="text-xs text-neutral-500">
                Noch keine eigenen Bereiche eingezeichnet.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {items.map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(it.id);
                      setTool('select');
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl border text-xs flex items-center gap-2 transition ${
                      selectedId === it.id
                        ? 'border-[#597CD4] bg-[#597CD4]/10 font-semibold'
                        : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                    }`}
                  >
                    <span
                      className="w-3 h-3 rounded-sm shrink-0"
                      style={{ backgroundColor: it.color }}
                    />
                    <span className="truncate flex-1">{it.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
