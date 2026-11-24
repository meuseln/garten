import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Eye,
  EyeOff,
  MapPin,
  MousePointer,
  PenTool,
  RotateCcw,
  Save,
  Square,
  Trash2,
  Type,
} from 'lucide-react';
import { useHomestead } from '../../context/HomesteadContext';
import type { GardenMapItem } from '../../types/homestead';

export const GARDEN_MAP_DOC_ID = 'garden_map_schema_v1';

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
  const { areas, documents, createRecord, updateRecord, pushToast } = useHomestead();
  const activeAreas = useMemo(() => areas.filter((a) => !a.archived), [areas]);
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
  const [activeColor, setActiveColor] = useState<string>('#18201B');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showAerialOverlay, setShowAerialOverlay] = useState(false);
  const [showZoneHints, setShowZoneHints] = useState(true);

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

  const getSvgCoords = (e: React.PointerEvent<Element>): { x: number; y: number } => {
    const svg = svgRef.current;
    if (!svg) return { x: 0, y: 0 };
    const rect = svg.getBoundingClientRect();
    const x = Math.round(((e.clientX - rect.left) / rect.width) * 1000);
    const y = Math.round(((e.clientY - rect.top) / rect.height) * 740);
    return {
      x: Math.max(10, Math.min(990, x)),
      y: Math.max(10, Math.min(730, y)),
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
                x: Math.max(20, Math.min(960, dragState.origX + dx)),
                y: Math.max(20, Math.min(710, dragState.origY + dy)),
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
      if (width >= 16 && height >= 16) {
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
        fileName: 'gartenkarte-schema-mellenbach.svg',
        externalUrl: '',
        notes: 'Interaktive Grundstückskarte Karl-Marx-Str. 113 (Schwarz-Weiß-Schema)',
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
        x: 495,
        y: 255,
        width: 68,
        height: 45,
        notes: 'Sonniger Platz nah an Terrasse & Küche',
      },
      {
        id: 'sample_obst',
        kind: 'rect',
        label: 'Obstbäume & Beeren',
        color: '#D97706',
        x: 195,
        y: 165,
        width: 140,
        height: 95,
        notes: 'Oberer Hang-Garten',
      },
      {
        id: 'sample_wiese',
        kind: 'label',
        label: 'Süd-Wiese',
        color: '#18201B',
        x: 705,
        y: 575,
        notes: 'Straßenseite / Wiese',
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
            onClick={() => setShowZoneHints((v) => !v)}
            className="min-h-[40px] px-3 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-medium inline-flex items-center gap-1.5"
          >
            {showZoneHints ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            Zonen-Texte
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
            {showAerialOverlay ? 'Luftbild aus' : 'Luftbild einblenden'}
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
          'Schwarz-Weiß-Schema nach eurem Luftbild: Tippe auf einen Bereich oder Marker zum Beschriften/Verschieben, oder wähle oben ein Zeichenwerkzeug.'}
        {tool === 'rect' &&
          'Ziehe mit Maus oder Finger ein Rechteck direkt auf die Gartenkarte (z.B. für ein Beet, Gewächshaus oder Hühnerauslauf).'}
        {tool === 'polygon' &&
          'Tippe nacheinander die Eckpunkte deiner gewünschten Fläche an und klicke danach auf „Fläche schließen“.'}
        {tool === 'label' &&
          'Tippe irgendwo auf die Karte, um eine frei verschiebbare Beschriftung oder einen Pin zu setzen.'}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Main Interactive Architectural B&W Map SVG */}
        <div className="lg:col-span-9 bg-white border-2 border-neutral-900 rounded-2xl overflow-hidden shadow-xs">
          <svg
            ref={svgRef}
            viewBox="0 0 1000 740"
            className="w-full h-auto block select-none touch-none cursor-crosshair bg-white"
            onPointerDown={handleSvgPointerDown}
            onPointerMove={handleSvgPointerMove}
            onPointerUp={handleSvgPointerUp}
          >
            <defs>
              {/* Crisp Architectural Paper Grid */}
              <pattern id="bw-grid" width="25" height="25" patternUnits="userSpaceOnUse">
                <path d="M 25 0 L 0 0 0 25" fill="none" stroke="#E5E7EB" strokeWidth="0.7" />
              </pattern>
              {/* Diagonal Hatch for Wohnhaus 113 */}
              <pattern id="house-hatch" width="10" height="10" patternTransform="rotate(45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="10" stroke="#18201B" strokeWidth="2.2" />
              </pattern>
              {/* Cross-hatch / Paving for Terrasse */}
              <pattern id="terrace-paving" width="12" height="12" patternUnits="userSpaceOnUse">
                <rect width="12" height="12" fill="#F3F4F6" />
                <path d="M 12 0 L 0 0 0 12" fill="none" stroke="#6B7280" strokeWidth="0.9" />
              </pattern>
              {/* Subtle Hatch for Nebengebäude */}
              <pattern id="shed-hatch" width="8" height="8" patternTransform="rotate(-45 0 0)" patternUnits="userSpaceOnUse">
                <line x1="0" y1="0" x2="0" y2="8" stroke="#6B7280" strokeWidth="1.2" />
              </pattern>
            </defs>

            {/* White paper + subtle blueprint grid */}
            <rect data-bg="true" x="0" y="0" width="1000" height="740" fill="#FFFFFF" />
            <rect data-bg="true" x="0" y="0" width="1000" height="740" fill="url(#bw-grid)" />

            {/* Optional Aerial Comparison Overlay */}
            {showAerialOverlay && (
              <image
                href="/assets/aistudio/image_695e71a4.png"
                x="0"
                y="0"
                width="1000"
                height="740"
                preserveAspectRatio="none"
                opacity="0.34"
                style={{ pointerEvents: 'none' }}
              />
            )}

            {/* === ARCHITECTURAL BASE LAYER (Schwarz-Weiß-Schema nach Luftbild) === */}

            {/* Karl-Marx-Straße (diagonal along right edge) */}
            <polygon
              points="920,0 1000,0 1000,740 765,740"
              fill="#F3F4F6"
              stroke="#4B5563"
              strokeWidth="1.5"
              style={{ pointerEvents: 'none' }}
            />
            <line
              x1="965"
              y1="0"
              x2="808"
              y2="740"
              stroke="#9CA3AF"
              strokeWidth="2"
              strokeDasharray="14 10"
              style={{ pointerEvents: 'none' }}
            />
            <text
              x="892"
              y="390"
              fill="#111827"
              fontSize="16"
              fontWeight="700"
              letterSpacing="1.5"
              transform="rotate(-77 892 390)"
              style={{ pointerEvents: 'none' }}
            >
              KARL-MARX-STRASSE
            </text>

            {/* Nachbargebäude Nord (Context only, dashed outline) */}
            <polygon
              points="735,0 855,20 795,245 680,220"
              fill="#F9FAFB"
              stroke="#9CA3AF"
              strokeWidth="1.5"
              strokeDasharray="6 4"
              style={{ pointerEvents: 'none' }}
            />
            <text x="725" y="135" fill="#6B7280" fontSize="11" fontWeight="600" style={{ pointerEvents: 'none' }}>
              Nachbarhaus (N)
            </text>

            {/* Grundstücksgrenze 1: Oberer Hang-Garten + Hausrasen (Yellow boundary traced from image) */}
            <polygon
              points="132,74 648,252 634,312 658,334 646,428 74,280"
              fill="#FFFFFF"
              fillOpacity={showAerialOverlay ? '0.25' : '0.88'}
              stroke="#111827"
              strokeWidth="3.5"
              strokeLinejoin="round"
              style={{ pointerEvents: 'none' }}
            />

            {/* Internal fence/slope line seen in aerial photo dividing upper slope & house lawn */}
            <line
              x1="518"
              y1="205"
              x2="458"
              y2="378"
              stroke="#4B5563"
              strokeWidth="1.8"
              strokeDasharray="6 4"
              style={{ pointerEvents: 'none' }}
            />

            {/* Grundstücksgrenze 2: Süd-Wiese an der Straße (Yellow boundary bottom-right) */}
            <polygon
              points="668,444 846,496 812,712 576,622"
              fill="#FFFFFF"
              fillOpacity={showAerialOverlay ? '0.25' : '0.88'}
              stroke="#111827"
              strokeWidth="3.5"
              strokeLinejoin="round"
              style={{ pointerEvents: 'none' }}
            />

            {/* Connecting passage between Hausgarten & Süd-Wiese */}
            <line
              x1="646"
              y1="428"
              x2="668"
              y2="444"
              stroke="#111827"
              strokeWidth="2.5"
              strokeDasharray="4 3"
              style={{ pointerEvents: 'none' }}
            />

            {/* TERRASSE (directly southwest/west of Wohnhaus 113) */}
            <polygon
              points="578,318 636,328 625,408 568,398"
              fill="url(#terrace-paving)"
              stroke="#111827"
              strokeWidth="2.2"
              style={{ pointerEvents: 'none' }}
            />
            <text
              x="600"
              y="366"
              textAnchor="middle"
              fill="#111827"
              fontSize="12"
              fontWeight="800"
              style={{ pointerEvents: 'none' }}
            >
              Terrasse
            </text>

            {/* WOHNHAUS Nr. 113 */}
            <polygon
              points="638,242 758,262 742,348 626,328"
              fill="url(#house-hatch)"
              stroke="#111827"
              strokeWidth="3"
              style={{ pointerEvents: 'none' }}
            />
            <rect
              x="644"
              y="272"
              width="96"
              height="38"
              rx="4"
              fill="#FFFFFF"
              stroke="#111827"
              strokeWidth="1.8"
              style={{ pointerEvents: 'none' }}
            />
            <text
              x="692"
              y="289"
              textAnchor="middle"
              fill="#111827"
              fontSize="12"
              fontWeight="800"
              style={{ pointerEvents: 'none' }}
            >
              Wohnhaus
            </text>
            <text
              x="692"
              y="304"
              textAnchor="middle"
              fill="#111827"
              fontSize="11"
              fontWeight="700"
              style={{ pointerEvents: 'none' }}
            >
              Nr. 113
            </text>

            {/* Nebengebäude / Anbau am Hof */}
            <polygon
              points="742,318 886,362 852,456 710,412"
              fill="url(#shed-hatch)"
              stroke="#111827"
              strokeWidth="2.2"
              style={{ pointerEvents: 'none' }}
            />
            <rect
              x="752"
              y="368"
              width="88"
              height="24"
              rx="3"
              fill="#FFFFFF"
              stroke="#374151"
              strokeWidth="1.2"
              style={{ pointerEvents: 'none' }}
            />
            <text
              x="796"
              y="384"
              textAnchor="middle"
              fill="#1F2937"
              fontSize="11"
              fontWeight="700"
              style={{ pointerEvents: 'none' }}
            >
              Nebengebäude
            </text>

            {/* Kleiner Schuppen in der Süd-Wiese */}
            <polygon
              points="778,496 840,515 824,578 764,558"
              fill="url(#shed-hatch)"
              stroke="#111827"
              strokeWidth="2"
              style={{ pointerEvents: 'none' }}
            />
            <text
              x="801"
              y="542"
              textAnchor="middle"
              fill="#111827"
              fontSize="10"
              fontWeight="700"
              style={{ pointerEvents: 'none' }}
            >
              Schuppen
            </text>

            {/* Optional subtle B&W Zone Hints */}
            {showZoneHints && (
              <g style={{ pointerEvents: 'none' }}>
                <text x="275" y="215" textAnchor="middle" fill="#4B5563" fontSize="13" fontWeight="600">
                  Oberer Gartenteil (Hang)
                </text>
                <text x="535" y="305" textAnchor="middle" fill="#4B5563" fontSize="12" fontWeight="600">
                  Hausgarten
                </text>
                <text x="692" y="560" textAnchor="middle" fill="#4B5563" fontSize="13" fontWeight="600">
                  Süd-Wiese
                </text>
              </g>
            )}

            {/* === USER-DRAWN INTERACTIVE AREAS & LABELS === */}
            {items.map((item) => {
              const isSelected = item.id === selectedId;
              const strokeColor = item.color || '#18201B';

              if (item.kind === 'rect') {
                const x = item.x ?? 100;
                const y = item.y ?? 100;
                const w = item.width ?? 80;
                const h = item.height ?? 50;
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
                      rx="6"
                      fill={strokeColor}
                      fillOpacity={strokeColor === '#18201B' ? 0.1 : 0.2}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 3.5 : 2.2}
                      strokeDasharray={isSelected ? '6 3' : undefined}
                    />
                    <rect
                      x={x + w / 2 - Math.min(85, item.label.length * 4 + 12)}
                      y={y + h / 2 - 11}
                      width={Math.min(170, item.label.length * 8 + 24)}
                      height={22}
                      rx="4"
                      fill="#FFFFFF"
                      stroke={strokeColor}
                      strokeWidth="1.2"
                    />
                    <text
                      x={x + w / 2}
                      y={y + h / 2 + 4}
                      textAnchor="middle"
                      fill="#111827"
                      fontSize="11.5"
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
                      fillOpacity={strokeColor === '#18201B' ? 0.1 : 0.22}
                      stroke={strokeColor}
                      strokeWidth={isSelected ? 3.5 : 2.2}
                      strokeLinejoin="round"
                    />
                    <rect
                      x={cx - Math.min(85, item.label.length * 4 + 12)}
                      y={cy - 11}
                      width={Math.min(170, item.label.length * 8 + 24)}
                      height={22}
                      rx="4"
                      fill="#FFFFFF"
                      stroke={strokeColor}
                      strokeWidth="1.2"
                    />
                    <text
                      x={cx}
                      y={cy + 4}
                      textAnchor="middle"
                      fill="#111827"
                      fontSize="11.5"
                      fontWeight="700"
                    >
                      {item.label}
                    </text>
                  </g>
                );
              }

              // Label / Marker
              const lx = item.x ?? 300;
              const ly = item.y ?? 300;
              const boxW = Math.max(72, item.label.length * 7.4 + 22);
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
                  <circle cx={lx} cy={ly} r="5.5" fill={strokeColor} stroke="#FFFFFF" strokeWidth="1.5" />
                  <rect
                    x={lx + 8}
                    y={ly - 13}
                    width={boxW}
                    height={24}
                    rx="5"
                    fill="#FFFFFF"
                    stroke={isSelected ? '#597CD4' : strokeColor}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                  />
                  <text x={lx + 16} y={ly + 3} fill="#111827" fontSize="11.5" fontWeight="700">
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
                strokeWidth="2.5"
                strokeDasharray="5 4"
              />
            )}

            {/* Live Polygon Draft */}
            {polyPoints.length > 0 && (
              <g>
                <polyline
                  points={polyPoints.map((p) => `${p.x},${p.y}`).join(' ')}
                  fill="none"
                  stroke={activeColor}
                  strokeWidth="2.5"
                  strokeDasharray="5 4"
                />
                {polyPoints.map((p, idx) => (
                  <circle
                    key={`${p.x}_${p.y}_${idx}`}
                    cx={p.x}
                    cy={p.y}
                    r="5"
                    fill="#FFFFFF"
                    stroke={activeColor}
                    strokeWidth="2.5"
                  />
                ))}
              </g>
            )}

            {/* Architectural Header Stamp & Compass Rose (Bottom-Left) */}
            <g transform="translate(24, 650)" style={{ pointerEvents: 'none' }}>
              <rect x="0" y="0" width="320" height="66" rx="6" fill="#FFFFFF" stroke="#111827" strokeWidth="2" />
              <text x="14" y="23" fill="#111827" fontSize="13" fontWeight="800">
                HOF & GARTEN · LAGEPLAN (S/W-SCHEMA)
              </text>
              <text x="14" y="41" fill="#374151" fontSize="11" fontWeight="600">
                Karl-Marx-Str. 113 · 98744 Schwarzatal
              </text>
              <text x="14" y="56" fill="#6B7280" fontSize="10">
                Wohnhaus, Terrasse & Gartengrenze nach Luftbild
              </text>
            </g>

            {/* Compass Rose (Top-Left) */}
            <g transform="translate(48, 52)" style={{ pointerEvents: 'none' }}>
              <circle cx="0" cy="0" r="22" fill="#FFFFFF" stroke="#111827" strokeWidth="1.8" />
              <polygon points="0,-16 5,-2 0,-5 -5,-2" fill="#111827" />
              <polygon points="0,16 5,2 0,5 -5,2" fill="#E5E7EB" stroke="#111827" strokeWidth="1" />
              <text x="0" y="-26" textAnchor="middle" fill="#111827" fontSize="11" fontWeight="800">
                N
              </text>
            </g>
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
                <label className="block text-xs font-medium mb-1">Mit Fläche verknüpfen (optional)</label>
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
                So funktioniert die Gartenkarte
              </div>
              <p>
                Das Schwarz-Weiß-Schema zeigt euer Haus (Nr. 113), die Terrasse und die umgrenzten Gartenflächen aus dem Luftbild.
              </p>
              <p>
                Zeichne einfach Beete, Obstbäume, Hühnerauslauf oder Ideen direkt ein — per Klick werden Änderungen für Nico & Chris gespeichert.
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
