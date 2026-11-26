import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  CalendarPlus,
  CloudRain,
  Compass,
  Droplets,
  MapPin,
  Plus,
  RefreshCw,
  Snowflake,
  Sprout,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  Wind,
} from 'lucide-react';
import { useHomestead } from '../context/HomesteadContext';
import {
  buildLivePlantingForecast,
  describeWeatherCode,
  GARDEN_MICROCLIMATE_ZONES,
  HOMESTEAD_LOCATION,
  MELLENBACH_CLIMATE_NORMALS,
  PLANTING_FORECAST_GUIDES,
  windDirectionLabel,
  type GardenMicroclimateZone,
} from '../lib/weather';
import { ModuleHeader, PaginationControls, SegmentedTabs, usePagination } from '../components/ui/SharedUI';

export const WeatherView: React.FC = () => {
  const {
    weather,
    weatherLoading,
    weatherError,
    refreshWeather,
    createRecord,
    activeIdentity,
    pushToast,
  } = useHomestead();
  const [weatherTab, setWeatherTab] = useState<'overview' | 'forecast' | 'hourly' | 'daily'>('overview');
  const [selectedMonth, setSelectedMonth] = useState<number>(() => new Date().getMonth());
  const [selectedZone, setSelectedZone] = useState<'all' | GardenMicroclimateZone['id']>('all');

  const hourlyPagination = usePagination(weather?.hourly || [], 6);

  const liveForecast = useMemo(
    () => buildLivePlantingForecast(weather, selectedMonth),
    [weather, selectedMonth]
  );

  const matchingGuides = useMemo(() => {
    return PLANTING_FORECAST_GUIDES.filter((g) => {
      const monthMatch = g.months.includes(selectedMonth);
      const zoneMatch = selectedZone === 'all' || g.preferredZoneIds.includes(selectedZone);
      return monthMatch && zoneMatch;
    });
  }, [selectedMonth, selectedZone]);

  const upcomingGuides = useMemo(() => {
    if (matchingGuides.length > 0) return [];
    const nextMonth = (selectedMonth + 1) % 12;
    return PLANTING_FORECAST_GUIDES.filter(
      (g) => g.months.includes(nextMonth) && (selectedZone === 'all' || g.preferredZoneIds.includes(selectedZone))
    );
  }, [matchingGuides.length, selectedMonth, selectedZone]);

  const handleCreateWeatherTask = async (title: string, description: string, targetArea: string) => {
    const today = new Date().toISOString().slice(0, 10);
    await createRecord('calendarEvents', title, {
      eventType: 'task',
      description,
      date: today,
      startTime: '18:00',
      endTime: '18:30',
      category: 'Garten',
      assignee: activeIdentity || 'Gemeinsam',
      recurrence: 'none',
      reminderMinutes: 30,
      areaName: targetArea,
      completed: false,
      notes: 'Aus Gartenwetter-Hinweis erstellt.',
    });
    pushToast('success', `Aufgabe „${title}“ im Kalender angelegt.`);
  };

  const selectedNormal = MELLENBACH_CLIMATE_NORMALS[selectedMonth] || MELLENBACH_CLIMATE_NORMALS[0];

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Wetter, Klima & Pflanz-Forecast — Schwarzatal"
        subtitle={`${HOMESTEAD_LOCATION.address} · ca. 480–520 m ü. NN · Live Open-Meteo & Klimanormale`}
        actions={
          <button
            type="button"
            disabled={weatherLoading}
            onClick={refreshWeather}
            className="px-4 py-2 rounded-xl bg-[#597CD4] text-white text-xs sm:text-sm font-semibold inline-flex items-center gap-2 hover:opacity-90 transition disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${weatherLoading ? 'animate-spin' : ''}`} />
            Aktualisieren
          </button>
        }
      />

      {weather?.isStale && (
        <div className="p-3.5 rounded-xl bg-[#FFC814]/25 border border-[#FFC814]/50 text-xs text-neutral-900 dark:text-neutral-100 flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-[#63390C]" />
          <span>
            Hinweis: Diese Wetterdaten sind veraltet (Stand:{' '}
            {new Date(weather.fetchedAtMs).toLocaleString('de-DE')}). Bitte bei Verbindung aktualisieren.
          </span>
        </div>
      )}

      {weatherError && (
        <div className="p-3.5 rounded-xl bg-[#CF6432]/15 border border-[#CF6432]/40 text-xs text-[#CF6432]">
          {weatherError}
        </div>
      )}

      <SegmentedTabs
        tabs={[
          { id: 'overview', label: 'Aktuell & Hinweise' },
          { id: 'forecast', label: 'Klima, Sonne & Pflanz-Forecast' },
          { id: 'hourly', label: '24h-Stunden' },
          { id: 'daily', label: '7-Tage-Trend' },
        ]}
        activeTab={weatherTab}
        onChange={(id) => setWeatherTab(id as typeof weatherTab)}
      />

      {!weather && weatherTab !== 'forecast' ? (
        <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 text-center text-sm text-neutral-500">
          Wetterdaten für Mellenbach-Glasbach werden geladen… (Unter „Klima, Sonne &amp; Pflanz-Forecast“ sind die Jahresdaten sofort verfügbar.)
        </div>
      ) : (
        <>
          {/* Current Weather Overview */}
          {weather && (
            <div className={`${weatherTab === 'overview' ? 'grid' : 'hidden'} grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3`}>
              <div className="col-span-2 bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 flex items-center justify-between">
                <div>
                  <div className="text-xs text-neutral-500">Aktuell</div>
                  <div className="text-4xl font-bold font-mono-num mt-1">
                    {weather.current.temp.toFixed(1)} °C
                  </div>
                  <div className="text-sm font-medium mt-1">
                    {describeWeatherCode(weather.current.weatherCode).label}
                  </div>
                  <div className="text-xs text-neutral-500 mt-1 font-mono-num">
                    Gefühlt {weather.current.apparentTemp.toFixed(1)} °C · Max {weather.today.tempMax.toFixed(1)}° / Min {weather.today.tempMin.toFixed(1)}°
                  </div>
                </div>
                <Thermometer className="w-10 h-10 text-[#597CD4]" />
              </div>

              <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-1">
                <div className="text-xs text-neutral-500 flex items-center gap-1.5">
                  <Droplets className="w-3.5 h-3.5 text-[#597CD4]" />
                  Luftfeuchte &amp; Regen
                </div>
                <div className="text-xl font-bold font-mono-num">{weather.current.humidity} %</div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400 font-mono-num">
                  Regenrisiko: {weather.today.precipProbMax} %
                </div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400 font-mono-num">
                  Menge: {weather.current.precip.toFixed(1)} mm
                </div>
              </div>

              <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-1">
                <div className="text-xs text-neutral-500 flex items-center gap-1.5">
                  <Snowflake className="w-3.5 h-3.5 text-[#597CD4]" />
                  Schnee
                </div>
                <div className="text-xl font-bold font-mono-num">{weather.today.snowProbMax} %</div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400 font-mono-num">
                  Aktuell: {weather.current.snowfall.toFixed(1)} cm
                </div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400 font-mono-num">
                  Tag: {(weather.daily[0]?.snowfallSum ?? 0).toFixed(1)} cm
                </div>
              </div>

              <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-1">
                <div className="text-xs text-neutral-500 flex items-center gap-1.5">
                  <Wind className="w-3.5 h-3.5 text-[#597CD4]" />
                  Wind
                </div>
                <div className="text-xl font-bold font-mono-num">{Math.round(weather.current.windSpeed)} km/h</div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-1">
                  <Compass className="w-3 h-3" />
                  {windDirectionLabel(weather.current.windDirection)} ({Math.round(weather.current.windDirection)}°)
                </div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400 font-mono-num">
                  Böen: {Math.round(weather.current.windGusts)} km/h
                </div>
              </div>

              <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-4 space-y-1">
                <div className="text-xs text-neutral-500 flex items-center gap-1.5">
                  <Sun className="w-3.5 h-3.5 text-[#FFC814]" />
                  Sonne &amp; UV
                </div>
                <div className="text-xl font-bold font-mono-num">
                  {typeof weather.today.sunshineHours === 'number'
                    ? `${weather.today.sunshineHours.toFixed(1)} h`
                    : `UV ${weather.today.uvIndexMax.toFixed(1)}`}
                </div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400 font-mono-num">
                  UV max: {weather.today.uvIndexMax.toFixed(1)}
                </div>
                <div className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-2 font-mono-num">
                  <span className="inline-flex items-center gap-0.5">
                    <Sunrise className="w-3 h-3" />
                    {weather.today.sunrise.slice(11, 16)}
                  </span>
                  <span className="inline-flex items-center gap-0.5">
                    <Sunset className="w-3 h-3" />
                    {weather.today.sunset.slice(11, 16)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Gartenwetter — Verknüpfung mit Hofbereichen */}
          {weather && (
            <section className={`${weatherTab === 'overview' ? 'block' : 'hidden'} bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-3`}>
              <h2 className="font-display text-lg font-semibold">Gartenwetter-Hinweise für euren Hof</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {weather.gardenAlerts.map((alert) => (
                  <div
                    key={alert.id}
                    className={`p-4 rounded-xl border flex flex-col justify-between gap-3 ${
                      alert.level === 'warning'
                        ? 'bg-[#CF6432]/10 border-[#CF6432]/40'
                        : alert.level === 'caution'
                        ? 'bg-[#FFC814]/15 border-[#FFC814]/45'
                        : 'bg-[#A8F0D7]/20 border-[#A8F0D7]/50'
                    }`}
                  >
                    <div>
                      <div className="text-xs text-neutral-500">{alert.targetArea}</div>
                      <div className="font-semibold text-sm mt-0.5">{alert.title}</div>
                      <p className="text-xs text-neutral-700 dark:text-neutral-300 mt-1 leading-relaxed">
                        {alert.recommendation}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        handleCreateWeatherTask(
                          `Wetter-Check: ${alert.title}`,
                          alert.recommendation,
                          alert.targetArea
                        )
                      }
                      className="self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#233A29] text-white text-xs font-medium hover:opacity-90 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Als Aufgabe speichern
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* === TAB: KLIMA, SONNENSTUNDEN & WANN/WO PFLANZ-FORECAST === */}
          <div className={`${weatherTab === 'forecast' ? 'space-y-6' : 'hidden'}`}>
            {/* Live + Seasonal Forecast Banner */}
            <section className="bg-gradient-to-br from-amber-50 via-white to-emerald-50/70 dark:from-[#221D11] dark:via-[#161D1A] dark:to-[#132219] border border-amber-300/60 dark:border-amber-700/40 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">
                    Pflanz-Forecast Mellenbach-Glasbach (Schwarzatal · ~480–520 m NN)
                  </div>
                  <h2 className="font-display text-lg sm:text-xl font-bold mt-1">
                    {liveForecast.headline}
                  </h2>
                  <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1">
                    {liveForecast.summary}
                  </p>
                </div>
                {weather && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs shrink-0">
                    <div className="px-3 py-2 rounded-xl bg-white/80 dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800">
                      <div className="text-[11px] text-neutral-500">7-Tage Temp</div>
                      <div className="font-bold font-mono-num">
                        {liveForecast.next7DaysAvgMin.toFixed(0)}° / {liveForecast.next7DaysAvgMax.toFixed(0)}°C
                      </div>
                    </div>
                    <div className="px-3 py-2 rounded-xl bg-white/80 dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800">
                      <div className="text-[11px] text-neutral-500">7-Tage Sonne</div>
                      <div className="font-bold font-mono-num text-amber-700 dark:text-amber-300">
                        {liveForecast.next7DaysSunHours.toFixed(0)} h
                      </div>
                    </div>
                    <div className="px-3 py-2 rounded-xl bg-white/80 dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800">
                      <div className="text-[11px] text-neutral-500">7-Tage Regen</div>
                      <div className="font-bold font-mono-num text-[#597CD4]">
                        {liveForecast.next7DaysRainMm.toFixed(1)} mm
                      </div>
                    </div>
                    <div className="px-3 py-2 rounded-xl bg-white/80 dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800">
                      <div className="text-[11px] text-neutral-500">Max Böen</div>
                      <div className="font-bold font-mono-num">
                        {Math.round(liveForecast.next7DaysMaxWind)} km/h
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                {liveForecast.actionableTips.map((tip, i) => (
                  <div
                    key={i}
                    className="p-3 rounded-xl bg-white/85 dark:bg-[#161D1A]/90 border border-neutral-200/80 dark:border-neutral-800 text-xs text-neutral-800 dark:text-neutral-200 leading-relaxed"
                  >
                    {tip}
                  </div>
                ))}
              </div>
            </section>

            {/* 12-Month Climate Normals Chart (Sun, Rain, Wind, Temps) */}
            <section className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="font-display text-base sm:text-lg font-bold">
                    Jahresklima Schwarzatal / Mellenbach-Glasbach (DWD-Referenzwerte)
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Klicke auf einen Monat, um Sonnenstunden, Niederschlag, Wind &amp; Pflanz-Forecast anzuzeigen.
                  </p>
                </div>
                <span className="text-[11px] text-neutral-500">
                  Jahressumme: ~1.566 h Sonne · ~926 mm Niederschlag · Hauptwind SW/W
                </span>
              </div>

              {/* 12-Month Selectable Bars */}
              <div className="grid grid-cols-3 sm:grid-cols-6 lg:grid-cols-12 gap-2">
                {MELLENBACH_CLIMATE_NORMALS.map((m) => {
                  const isSelected = m.monthIndex === selectedMonth;
                  const isCurrent = m.monthIndex === new Date().getMonth();
                  const sunPct = Math.max(12, Math.round((m.sunshineHoursMonth / 220) * 100));
                  const rainPct = Math.max(15, Math.round((m.precipMm / 100) * 100));
                  return (
                    <button
                      key={m.monthIndex}
                      type="button"
                      onClick={() => setSelectedMonth(m.monthIndex)}
                      className={`p-2.5 rounded-xl border text-left transition flex flex-col justify-between gap-2 ${
                        isSelected
                          ? 'border-[#233A29] bg-[#BBE774]/22 ring-1 ring-[#233A29] dark:border-[#BBE774]'
                          : 'border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold">{m.monthShort}</span>
                        {isCurrent && (
                          <span className="text-[9px] font-bold px-1 py-0.5 rounded bg-[#597CD4] text-white">
                            Jetzt
                          </span>
                        )}
                      </div>

                      {/* Mini SVG Sun & Rain Bars */}
                      <svg viewBox="0 0 40 36" className="w-full h-9">
                        <rect x="4" y={34 - (sunPct * 0.3)} width="13" height={sunPct * 0.3} rx="2" fill="#F59E0B" />
                        <rect x="22" y={34 - (rainPct * 0.3)} width="13" height={rainPct * 0.3} rx="2" fill="#597CD4" />
                      </svg>

                      <div className="space-y-0.5 text-[10px] font-mono-num leading-tight">
                        <div className="text-amber-700 dark:text-amber-300 font-semibold">
                          ☀ {m.sunshineHoursMonth} h
                        </div>
                        <div className="text-[#597CD4] font-semibold">
                          💧 {m.precipMm} mm
                        </div>
                        <div className="text-neutral-500">
                          {m.tempMinC.toFixed(0)}°/{m.tempMaxC.toFixed(0)}°C
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Month Deep Metrics */}
              <div className="p-4 rounded-xl bg-neutral-50 dark:bg-[#0F1412] border border-neutral-200 dark:border-neutral-800 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
                <div>
                  <div className="text-neutral-500">Monat &amp; Phase</div>
                  <div className="font-bold text-sm mt-0.5">{selectedNormal.month}</div>
                  <div className="text-[11px] text-[#3B6912] dark:text-[#BBE774] font-semibold">
                    {selectedNormal.plantingPhase}
                  </div>
                </div>
                <div>
                  <div className="text-neutral-500">Sonnenstunden</div>
                  <div className="font-bold text-sm font-mono-num mt-0.5 text-amber-700 dark:text-amber-300">
                    {selectedNormal.sunshineHoursMonth} h / Monat
                  </div>
                  <div className="text-[11px] text-neutral-500 font-mono-num">
                    Ø {selectedNormal.sunshineHoursDay} h / Tag
                  </div>
                </div>
                <div>
                  <div className="text-neutral-500">Niederschlag</div>
                  <div className="font-bold text-sm font-mono-num mt-0.5 text-[#597CD4]">
                    {selectedNormal.precipMm} mm
                  </div>
                  <div className="text-[11px] text-neutral-500 font-mono-num">
                    ca. {selectedNormal.rainDays} Regentage
                  </div>
                </div>
                <div>
                  <div className="text-neutral-500">Temperatur &amp; Boden</div>
                  <div className="font-bold text-sm font-mono-num mt-0.5">
                    {selectedNormal.tempMinC}° bis {selectedNormal.tempMaxC}°C
                  </div>
                  <div className="text-[11px] text-neutral-500 font-mono-num">
                    Boden ca. {selectedNormal.soilTempEstimateC} °C
                  </div>
                </div>
                <div>
                  <div className="text-neutral-500">Frost &amp; Wind</div>
                  <div className="font-bold text-sm font-mono-num mt-0.5">
                    {selectedNormal.frostDays} Frosttage
                  </div>
                  <div className="text-[11px] text-neutral-500">
                    Wind Ø {selectedNormal.windMeanKmh} km/h ({selectedNormal.prevailingWind})
                  </div>
                </div>
                <div className="col-span-2 sm:col-span-3 lg:col-span-1 flex items-center">
                  <p className="text-[11px] text-neutral-700 dark:text-neutral-300 leading-relaxed">
                    {selectedNormal.gardenSummary}
                  </p>
                </div>
              </div>
            </section>

            {/* Wann & Wo im Garten pflanzen? */}
            <section className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="font-display text-base sm:text-lg font-bold flex items-center gap-2">
                    <Sprout className="w-5 h-5 text-[#3B6912] dark:text-[#BBE774]" />
                    Wann &amp; Wo lohnt sich was im {selectedNormal.month}?
                  </h3>
                  <p className="text-xs text-neutral-500">
                    Abgestimmt auf eure 4 Grundstückszonen (Sonnenseite Wohnhaus, Unterer Süd-Garten, Oberer Hang &amp; Nordseite).
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSelectedZone('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                      selectedZone === 'all'
                        ? 'bg-[#233A29] text-white border-[#233A29]'
                        : 'border-neutral-200 dark:border-neutral-700'
                    }`}
                  >
                    Alle Zonen
                  </button>
                  {GARDEN_MICROCLIMATE_ZONES.map((z) => (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => setSelectedZone(z.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                        selectedZone === z.id
                          ? 'bg-[#D97706] text-white border-[#D97706]'
                          : 'border-neutral-200 dark:border-neutral-700'
                      }`}
                    >
                      {z.id === 'suedwand'
                        ? 'Sonnenseite Haus'
                        : z.id === 'suedgarten'
                        ? 'Unterer Süd-Garten'
                        : z.id === 'oberer_hang'
                        ? 'Oberer Hang'
                        : 'Nordseite'}
                    </button>
                  ))}
                </div>
              </div>

              {matchingGuides.length === 0 ? (
                <div className="p-4 rounded-xl bg-neutral-50 dark:bg-[#0F1412] border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-600 dark:text-neutral-300 space-y-2">
                  <div className="font-semibold">
                    Im {selectedNormal.month} herrscht in Mellenbach meist Winterruhe / Vorbereitungszeit für diese Zone.
                  </div>
                  <p>
                    Nutze den Monat für Vorzuchtplanung, Schnitt an frostfreien Tagen (nicht bei Walnuss!) und Kompostvorbereitung.
                  </p>
                  {upcomingGuides.length > 0 && (
                    <div className="pt-1 text-[#3B6912] dark:text-[#BBE774] font-medium">
                      Nächster Startpunkt: {upcomingGuides.map((u) => u.title).join(' · ')}
                    </div>
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {matchingGuides.map((guide) => (
                    <div
                      key={guide.id}
                      className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/70 dark:bg-[#0F1412] flex flex-col justify-between gap-3"
                    >
                      <div className="space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#BBE774]/30 text-[#233A29] dark:text-[#BBE774]">
                              {guide.category}
                            </span>
                            <h4 className="font-display text-base font-bold mt-1">{guide.title}</h4>
                          </div>
                          <span className="text-[11px] font-mono-num text-neutral-500 shrink-0">
                            ab {guide.minSoilTempC} °C Boden
                          </span>
                        </div>

                        <p className="text-xs text-neutral-700 dark:text-neutral-300 leading-relaxed">
                          <strong>Warum jetzt:</strong> {guide.whyThisTiming}
                        </p>
                        <p className="text-xs text-amber-900 dark:text-amber-200 bg-amber-50 dark:bg-amber-950/30 p-2.5 rounded-lg border border-amber-200/70 dark:border-amber-800/40 leading-relaxed">
                          <strong>Wo auf eurem Hof:</strong> {guide.placementAdvice}
                        </p>
                        <div className="text-xs text-neutral-600 dark:text-neutral-400">
                          <strong>Ideal dafür:</strong> {guide.crops.join(' · ')}
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-2 border-t border-neutral-200 dark:border-neutral-800 text-[11px]">
                        <span className="text-neutral-500">{guide.sunDemand}</span>
                        <button
                          type="button"
                          onClick={() =>
                            handleCreateWeatherTask(
                              `${selectedNormal.month}: ${guide.title}`,
                              `${guide.placementAdvice} Kulturen: ${guide.crops.join(', ')}`,
                              guide.preferredZoneIds[0] === 'suedwand'
                                ? 'Sonnenseite Wohnhaus'
                                : guide.preferredZoneIds[0] === 'suedgarten'
                                ? 'Unterer Garten'
                                : 'Oberer Garten'
                            )
                          }
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#233A29] text-white font-semibold shrink-0 hover:opacity-90"
                        >
                          <CalendarPlus className="w-3.5 h-3.5" />
                          In Kalender
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* 4 Microclimate Zones of Karl-Marx-Str. 113 */}
            <section className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-4">
              <h3 className="font-display text-base sm:text-lg font-bold flex items-center gap-2">
                <MapPin className="w-5 h-5 text-[#D97706]" />
                Sonnenseiten &amp; Mikroklima auf eurem Grundstück (Karl-Marx-Str. 113)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {GARDEN_MICROCLIMATE_ZONES.filter((z) => selectedZone === 'all' || z.id === selectedZone).map((zone) => (
                  <div
                    key={zone.id}
                    className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 space-y-2.5 text-xs"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-display text-sm font-bold">{zone.name}</h4>
                        <div className="text-[11px] text-neutral-500">{zone.aspect}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 font-mono-num text-[11px] shrink-0">
                        ☀ Sommer {zone.summerSunHours}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px] text-neutral-600 dark:text-neutral-300">
                      <div>
                        <strong>Frühjahr-Sonne:</strong> {zone.springSunHours}
                      </div>
                      <div>
                        <strong>Wind:</strong> {zone.windExposure}
                      </div>
                    </div>
                    <div className="text-[11px] text-neutral-600 dark:text-neutral-300">
                      <strong>Frostverhalten:</strong> {zone.frostBehavior}
                    </div>
                    <ul className="space-y-1 text-neutral-800 dark:text-neutral-200">
                      {zone.idealFor.map((item) => (
                        <li key={item}>• {item}</li>
                      ))}
                    </ul>
                    <div className="text-[11px] text-[#3B6912] dark:text-[#BBE774] pt-1 border-t border-neutral-100 dark:border-neutral-800">
                      💡 {zone.tip}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          </div>

          {/* Stündliche Vorhersage (Seitenweise à 6 Stunden) */}
          {weather && (
            <section className={`${weatherTab === 'hourly' ? 'block' : 'hidden'} bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-3`}>
              <h2 className="font-display text-lg font-semibold">Stündliche Vorhersage (6-Std.-Seiten)</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-neutral-200 dark:border-neutral-800 text-neutral-500 text-left">
                      <th className="py-2 pr-4">Uhrzeit</th>
                      <th className="py-2 pr-4">Zustand</th>
                      <th className="py-2 pr-4 text-right">Temp</th>
                      <th className="py-2 pr-4 text-right">Regen %</th>
                      <th className="py-2 pr-4 text-right">Menge</th>
                      <th className="py-2 pr-4 text-right">Schnee</th>
                      <th className="py-2 text-right">Wind</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/70">
                    {hourlyPagination.pageItems.map((h) => (
                      <tr key={h.time}>
                        <td className="py-2.5 pr-4 font-mono-num font-medium">{h.time.slice(11, 16)}</td>
                        <td className="py-2.5 pr-4">{describeWeatherCode(h.weatherCode).label}</td>
                        <td className="py-2.5 pr-4 text-right font-mono-num">{h.temp.toFixed(1)} °C</td>
                        <td className="py-2.5 pr-4 text-right font-mono-num text-[#597CD4]">{h.precipProb} %</td>
                        <td className="py-2.5 pr-4 text-right font-mono-num">{h.precip.toFixed(1)} mm</td>
                        <td className="py-2.5 pr-4 text-right font-mono-num">{h.snowfall.toFixed(1)} cm</td>
                        <td className="py-2.5 text-right font-mono-num">{Math.round(h.windSpeed)} km/h</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <PaginationControls
                page={hourlyPagination.page}
                totalPages={hourlyPagination.totalPages}
                totalItems={hourlyPagination.totalItems}
                onPageChange={hourlyPagination.setPage}
                itemLabel="Stunden"
              />
            </section>
          )}

          {/* 7-Tage Vorhersage */}
          {weather && (
            <section className={`${weatherTab === 'daily' ? 'block' : 'hidden'} bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-5 space-y-3`}>
              <h2 className="font-display text-lg font-semibold">7-Tage-Vorhersage</h2>
              <div className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {weather.daily.map((d) => {
                  const frost = d.tempMin <= 0;
                  return (
                    <div
                      key={d.date}
                      className="py-3 flex flex-wrap items-center justify-between gap-3 text-sm"
                    >
                      <div className="min-w-[140px]">
                        <div className="font-semibold">
                          {new Date(d.date + 'T12:00:00').toLocaleDateString('de-DE', {
                            weekday: 'long',
                            day: '2-digit',
                            month: '2-digit',
                          })}
                        </div>
                        <div className="text-xs text-neutral-500">
                          {describeWeatherCode(d.weatherCode).label}
                          {frost ? ' · Frostgefahr' : ''}
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 text-xs font-mono-num">
                        {typeof d.sunshineHours === 'number' && (
                          <span className="inline-flex items-center gap-1 text-amber-700 dark:text-amber-300 font-semibold">
                            <Sun className="w-3.5 h-3.5 text-[#F59E0B]" />
                            {d.sunshineHours.toFixed(1)} h Sonne
                          </span>
                        )}
                        <span className="inline-flex items-center gap-1 text-[#597CD4]">
                          <CloudRain className="w-3.5 h-3.5" />
                          {d.precipProbMax}% ({d.precipSum.toFixed(1)} mm)
                        </span>
                        {d.snowfallSum > 0 && (
                          <span className="inline-flex items-center gap-1">
                            <Snowflake className="w-3.5 h-3.5 text-[#597CD4]" />
                            {d.snowfallSum.toFixed(1)} cm
                          </span>
                        )}
                        <span>Wind max {Math.round(d.windSpeedMax)} km/h</span>
                        <span className="font-semibold text-sm">
                          {d.tempMin.toFixed(0)}° / {d.tempMax.toFixed(0)}°C
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};
