import React, { useState } from 'react';
import {
  AlertTriangle,
  CloudRain,
  Compass,
  Droplets,
  Plus,
  RefreshCw,
  Snowflake,
  Sun,
  Sunrise,
  Sunset,
  Thermometer,
  Wind,
} from 'lucide-react';
import { useHomestead } from '../context/HomesteadContext';
import { describeWeatherCode, HOMESTEAD_LOCATION, windDirectionLabel } from '../lib/weather';
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
  const [weatherTab, setWeatherTab] = useState<'overview' | 'hourly' | 'daily'>('overview');
  const hourlyPagination = usePagination(weather?.hourly || [], 6);

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

  return (
    <div className="space-y-6">
      <ModuleHeader
        title="Wetter — 98744 Schwarzatal"
        subtitle={`${HOMESTEAD_LOCATION.address} · Open-Meteo (50.60° N, 11.12° O)`}
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

      {!weather ? (
        <div className="bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 text-center text-sm text-neutral-500">
          Wetterdaten für Mellenbach-Glasbach werden geladen…
        </div>
      ) : (
        <>
          <SegmentedTabs
            tabs={[
              { id: 'overview', label: 'Aktuell & Hinweise' },
              { id: 'hourly', label: '24h-Stunden' },
              { id: 'daily', label: '7-Tage-Trend' },
            ]}
            activeTab={weatherTab}
            onChange={(id) => setWeatherTab(id as typeof weatherTab)}
          />

          {/* Current Weather Overview */}
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
                Luftfeuchte & Regen
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
                Sonne & UV
              </div>
              <div className="text-xl font-bold font-mono-num">UV {weather.today.uvIndexMax.toFixed(1)}</div>
              <div className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-1 font-mono-num">
                <Sunrise className="w-3 h-3" />
                {weather.today.sunrise.slice(11, 16)}
              </div>
              <div className="text-xs text-neutral-600 dark:text-neutral-400 flex items-center gap-1 font-mono-num">
                <Sunset className="w-3 h-3" />
                {weather.today.sunset.slice(11, 16)}
              </div>
            </div>
          </div>

          {/* Gartenwetter — Verknüpfung mit Hofbereichen */}
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

          {/* Stündliche Vorhersage (Seitenweise à 6 Stunden) */}
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

          {/* 7-Tage Vorhersage */}
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
                    <div className="flex items-center gap-5 text-xs font-mono-num">
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
        </>
      )}
    </div>
  );
};
