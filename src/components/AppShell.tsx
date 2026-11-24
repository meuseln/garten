import React, { useState } from 'react';
import {
  Archive,
  Bell,
  BookOpen,
  Calendar,
  CloudSun,
  Download,
  Droplets,
  FolderKanban,
  Hammer,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Moon,
  Send,
  Settings,
  Sprout,
  Sun,
  UserCheck,
  Warehouse,
  WifiOff,
  X,
  Bird,
  Binoculars,
} from 'lucide-react';
import { useHomestead } from '../context/HomesteadContext';
import { usePWAInstall } from '../lib/offlineSync';
import type { MainModuleId } from '../types/homestead';

export const NAV_ITEMS: Array<{
  id: MainModuleId;
  label: string;
  color: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { id: 'dashboard', label: 'Dashboard', color: '#3B6912', icon: LayoutDashboard },
  { id: 'property', label: 'Grundstück', color: '#0D9488', icon: MapPin },
  { id: 'cultivation', label: 'Anbau', color: '#16A34A', icon: Sprout },
  { id: 'animals', label: 'Tiere', color: '#D97706', icon: Bird },
  { id: 'pantry', label: 'Vorräte', color: '#EA580C', icon: Warehouse },
  { id: 'calendar', label: 'Kalender', color: '#597CD4', icon: Calendar },
  { id: 'resources', label: 'Ressourcen', color: '#0284C7', icon: Droplets },
  { id: 'projects', label: 'Projekte', color: '#9333EA', icon: Hammer },
  { id: 'knowledge', label: 'Wissen', color: '#2563EB', icon: BookOpen },
  { id: 'nature', label: 'Vögel & Pilze', color: '#65A30D', icon: Binoculars },
  { id: 'management', label: 'Verwaltung', color: '#CF6432', icon: FolderKanban },
];

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const {
    activeModule,
    setActiveModule,
    userProfile,
    activeIdentity,
    otherIdentity,
    members,
    resolvedTheme,
    setThemePreference,
    logoutUser,
    pings,
    pingCooldownSec,
    sendPing,
    acknowledgePing,
    notifications,
    markAllNotificationsRead,
    toasts,
    isOnline,
    offlineQueue,
    syncConflicts,
    resolveSyncConflict,
  } = useHomestead();

  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showNotifPanel, setShowNotifPanel] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showMobileDrawer, setShowMobileDrawer] = useState(false);
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  const unreadNotifs = notifications.filter((n) => !n.read).length;
  const unackIncomingPings = pings.filter((p) => p.toName === activeIdentity && !p.acknowledged);
  const lastPing = pings[0];
  const otherMember = members.find((m) => m.displayName === otherIdentity);
  const otherOnline =
    otherMember?.lastSeenAtMs && Date.now() - otherMember.lastSeenAtMs < 3 * 60 * 1000;

  const avatarGradient =
    activeIdentity === 'Chris'
      ? 'from-[#F9B4BE] via-[#F28090] to-[#D45B6E]'
      : 'from-[#D6F3A2] via-[#BBE774] to-[#88BC38]';
  const activeInitial = activeIdentity ? activeIdentity.slice(0, 1).toUpperCase() : 'H';

  const currentNavLabel =
    activeModule === 'weather'
      ? 'Wetter'
      : NAV_ITEMS.find((n) => n.id === activeModule)?.label || 'Dashboard';

  return (
    <div className="min-h-screen flex bg-[#F7F7F5] dark:bg-[#0F1412] text-neutral-900 dark:text-neutral-100">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#161D1A] sticky top-0 h-screen">
        <div className="h-16 px-5 flex items-center gap-3 border-b border-neutral-200 dark:border-neutral-800">
          <div className="w-8 h-8 rounded-lg bg-[#233A29] flex items-center justify-center shrink-0">
            <Sprout className="w-4 h-4 text-[#BBE774]" />
          </div>
          <span className="font-display text-lg font-bold tracking-tight whitespace-nowrap">
            Hof & Garten
          </span>
        </div>

        <nav className="flex-1 overflow-y-auto p-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeModule === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => setActiveModule(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                  active
                    ? 'bg-[#233A29] text-white'
                    : 'text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/70'
                }`}
              >
                <span style={{ color: active ? '#BBE774' : item.color }} className="shrink-0">
                  <Icon className="w-4 h-4" />
                </span>
                <span>{item.label}</span>
              </button>
            );
          })}

          <div className="pt-2 mt-2 border-t border-neutral-200 dark:border-neutral-800">
            <button
              type="button"
              onClick={() => setActiveModule('weather')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition whitespace-nowrap ${
                activeModule === 'weather'
                  ? 'bg-[#597CD4] text-white'
                  : 'text-neutral-600 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800/70'
              }`}
            >
              <CloudSun className="w-4 h-4 shrink-0" />
              <span>Wetter Mellenbach</span>
            </button>
          </div>
        </nav>

        <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 space-y-2">
          {!isInstalled && isInstallable && (
            <button
              type="button"
              onClick={install}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-[#BBE774]/25 hover:bg-[#BBE774]/40 text-xs font-semibold text-neutral-900 dark:text-neutral-100 transition"
            >
              <Download className="w-3.5 h-3.5" />
              Als App installieren
            </button>
          )}
          {!isInstalled && !isInstallable && isIOS && (
            <button
              type="button"
              onClick={() => setShowIOSGuide(true)}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-neutral-200 dark:border-neutral-700 text-xs font-medium text-neutral-700 dark:text-neutral-300"
            >
              <Download className="w-3.5 h-3.5" />
              Auf iPhone installieren
            </button>
          )}
          <div className="px-2 py-1 text-xs text-neutral-500 dark:text-neutral-400">
            <div>Mellenbach-Glasbach</div>
            {otherIdentity && (
              <div className="mt-0.5 text-[11px]">
                {otherIdentity}: {otherOnline ? 'Gerade aktiv' : 'Nicht geöffnet'}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Sticky Top Header + Mobile Top Tab-Bar */}
        <div className="sticky top-0 z-30 bg-white/95 dark:bg-[#161D1A]/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-800">
          <header className="h-14 sm:h-16 px-3 sm:px-6 flex items-center justify-between gap-4">
          {/* Zone 1: Brand on mobile / Section Title on Desktop */}
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setActiveModule('dashboard')}
              className="lg:hidden w-8 h-8 rounded-lg bg-[#233A29] flex items-center justify-center shrink-0"
              aria-label="Zur Startseite"
            >
              <Sprout className="w-4 h-4 text-[#BBE774]" />
            </button>
            <div className="min-w-0">
              <span className="font-display text-base sm:text-lg font-semibold text-neutral-900 dark:text-neutral-100 truncate block">
                {currentNavLabel}
              </span>
            </div>
          </div>

          {/* Zone 2 & 3: Ping + Notifications + Theme + User */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Prominent 1-Click Ping Button */}
            {otherIdentity && (
              <button
                type="button"
                onClick={sendPing}
                disabled={pingCooldownSec > 0}
                title={
                  lastPing
                    ? `Letzter Ping: ${lastPing.fromName} → ${lastPing.toName} (${new Date(lastPing.createdAtMs).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })})`
                    : `${otherIdentity} mit einem Klick anpingen`
                }
                style={{
                  backgroundColor: otherIdentity === 'Chris' ? '#F28090' : '#BBE774',
                  color: '#18201B',
                }}
                className="min-h-[40px] px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 hover:opacity-90 transition disabled:opacity-60 whitespace-nowrap shrink-0"
              >
                <Send className="w-3.5 h-3.5 shrink-0" />
                <span>
                  {pingCooldownSec > 0
                    ? `Ping (${pingCooldownSec}s)`
                    : `${otherIdentity} anpingen`}
                </span>
              </button>
            )}

            {/* Notifications */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowNotifPanel((v) => !v);
                  setShowProfileMenu(false);
                }}
                aria-label="Benachrichtigungen"
                className="relative min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                <Bell className="w-4 h-4" />
                {(unreadNotifs > 0 || unackIncomingPings.length > 0) && (
                  <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-[#CF6432] text-white text-[10px] font-bold flex items-center justify-center tabular-nums">
                    {unreadNotifs + unackIncomingPings.length}
                  </span>
                )}
              </button>

              {showNotifPanel && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 max-h-[75vh] overflow-y-auto bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl p-4 space-y-3 z-50">
                  <div className="flex items-center justify-between">
                    <span className="font-display font-semibold text-sm">Meldungen & Pings</span>
                    <button
                      type="button"
                      onClick={markAllNotificationsRead}
                      className="text-xs text-[#597CD4] hover:underline"
                    >
                      Alle gelesen
                    </button>
                  </div>

                  {lastPing && (
                    <div className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs space-y-1">
                      <div className="font-medium">
                        Letzter Ping: {lastPing.fromName} → {lastPing.toName}
                      </div>
                      <div className="text-neutral-500">
                        {new Date(lastPing.createdAtMs).toLocaleString('de-DE')}
                      </div>
                      {lastPing.toName === activeIdentity && !lastPing.acknowledged && (
                        <button
                          type="button"
                          onClick={() => acknowledgePing(lastPing.id)}
                          className="mt-1 px-2.5 py-1 rounded-lg bg-[#233A29] text-white text-xs font-medium"
                        >
                          Gesehen bestätigen
                        </button>
                      )}
                    </div>
                  )}

                  {notifications.length === 0 ? (
                    <p className="text-xs text-neutral-500 py-3">Keine neuen Benachrichtigungen.</p>
                  ) : (
                    <div className="space-y-2">
                      {notifications.slice(0, 10).map((n) => (
                        <div
                          key={n.id}
                          className={`p-3 rounded-xl border text-xs space-y-1 ${
                            n.priority === 'emergency'
                              ? 'border-[#CF6432]/50 bg-[#CF6432]/10'
                              : 'border-neutral-200 dark:border-neutral-800'
                          }`}
                        >
                          <div className="font-semibold text-neutral-900 dark:text-neutral-100">{n.title}</div>
                          <div className="text-neutral-600 dark:text-neutral-400">{n.body}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Theme Toggle */}
            <button
              type="button"
              onClick={() => setThemePreference(resolvedTheme === 'dark' ? 'light' : 'dark')}
              aria-label="Darstellungsmodus wechseln"
              className="hidden sm:flex min-h-[40px] min-w-[40px] items-center justify-center rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
            >
              {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* User Profile & Settings Switcher */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  setShowProfileMenu((v) => !v);
                  setShowNotifPanel(false);
                }}
                className="min-h-[40px] pl-1.5 pr-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700 flex items-center gap-2 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition"
              >
                <span
                  aria-hidden="true"
                  className={`w-7 h-7 rounded-full bg-gradient-to-br ${avatarGradient} text-[#18201B] text-xs font-display font-bold flex items-center justify-center shrink-0`}
                >
                  {activeInitial}
                </span>
                <span className="text-xs sm:text-sm font-semibold hidden sm:inline whitespace-nowrap">
                  {activeIdentity}
                </span>
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl shadow-xl p-3 space-y-2 z-50">
                  <div className="px-2 py-1.5 border-b border-neutral-200 dark:border-neutral-800">
                    <div className="text-sm font-semibold flex items-center gap-2">
                      <UserCheck className="w-4 h-4" />
                      {activeIdentity}
                    </div>
                    <div className="text-xs text-neutral-500 truncate">{userProfile?.email}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModule('management');
                      setShowProfileMenu(false);
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left"
                  >
                    <Settings className="w-4 h-4" />
                    Einstellungen & Benachrichtigungen
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setThemePreference(resolvedTheme === 'dark' ? 'light' : 'dark');
                    }}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium hover:bg-neutral-100 dark:hover:bg-neutral-800 text-left sm:hidden"
                  >
                    {resolvedTheme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                    {resolvedTheme === 'dark' ? 'Heller Modus' : 'Dunkler Modus'}
                  </button>
                  <button
                    type="button"
                    onClick={() => logoutUser()}
                    className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-[#CF6432] hover:bg-[#CF6432]/10 text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    Abmelden
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

          {/* Mobile Top Navigation Tab-Bar (moved to top so nothing at the bottom gets covered) */}
          <nav
            aria-label="Mobile Navigation"
            className="lg:hidden border-t border-neutral-100 dark:border-neutral-800/80 grid grid-cols-5 items-center bg-white/95 dark:bg-[#161D1A]/95"
          >
            {(
              [
                { id: 'dashboard', label: 'Start', color: '#3B6912', icon: LayoutDashboard },
                { id: 'property', label: 'Karte', color: '#0D9488', icon: MapPin },
                { id: 'cultivation', label: 'Anbau', color: '#16A34A', icon: Sprout },
                { id: 'calendar', label: 'Kalender', color: '#597CD4', icon: Calendar },
              ] as Array<{ id: MainModuleId; label: string; color: string; icon: React.ComponentType<{ className?: string }> }>
            ).map((item) => {
              const Icon = item.icon;
              const active = activeModule === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveModule(item.id)}
                  className={`flex flex-col items-center justify-center min-h-[46px] py-1 text-[11px] border-b-2 transition ${
                    active
                      ? 'border-[#233A29] dark:border-[#BBE774] text-[#233A29] dark:text-[#BBE774] font-semibold bg-[#BBE774]/10'
                      : 'border-transparent text-neutral-600 dark:text-neutral-400 font-medium'
                  }`}
                >
                  <span style={{ color: active ? undefined : item.color }}>
                    <Icon className="w-4 h-4 mb-0.5" />
                  </span>
                  <span>{item.label}</span>
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setShowMobileDrawer(true)}
              className={`flex flex-col items-center justify-center min-h-[46px] py-1 text-[11px] border-b-2 transition ${
                !['dashboard', 'property', 'cultivation', 'calendar'].includes(activeModule)
                  ? 'border-[#CF6432] text-[#CF6432] font-semibold bg-[#CF6432]/10'
                  : 'border-transparent text-neutral-600 dark:text-neutral-400 font-medium'
              }`}
            >
              <Menu className="w-4 h-4 mb-0.5" />
              <span>Mehr</span>
            </button>
          </nav>
        </div>

        {/* Incoming Unacknowledged Ping Banner */}
        {unackIncomingPings.length > 0 && (
          <div
            style={{
              backgroundColor: activeIdentity === 'Chris' ? '#F28090' : '#BBE774',
              color: '#18201B',
            }}
            className="px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-sm font-medium"
          >
            <span>{unackIncomingPings[0].message}</span>
            <button
              type="button"
              onClick={() => acknowledgePing(unackIncomingPings[0].id)}
              className="px-3 py-1 rounded-lg bg-[#18201B] text-white text-xs font-semibold"
            >
              Verstanden
            </button>
          </div>
        )}

        {/* Offline / Queue / Sync Conflict Bar */}
        {(!isOnline || offlineQueue.length > 0 || syncConflicts.length > 0) && (
          <div className="bg-[#FFC814]/25 border-b border-[#FFC814]/50 px-4 py-2 text-xs text-neutral-900 dark:text-neutral-100 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <WifiOff className="w-3.5 h-3.5 shrink-0" />
              <span>
                {!isOnline
                  ? 'Offline-Modus aktiv — zwischengespeicherte Hofdaten werden genutzt.'
                  : `${offlineQueue.length} Offline-Änderung(en) werden synchronisiert…`}
              </span>
            </div>
            {syncConflicts.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-[#CF6432]">
                  Konflikt bei „{syncConflicts[0].title}“:
                </span>
                <button
                  type="button"
                  onClick={() => resolveSyncConflict(syncConflicts[0].id, 'keep_local')}
                  className="px-2 py-1 rounded bg-neutral-900 text-white"
                >
                  Meine Version
                </button>
                <button
                  type="button"
                  onClick={() => resolveSyncConflict(syncConflicts[0].id, 'keep_remote')}
                  className="px-2 py-1 rounded border border-neutral-400"
                >
                  Cloud-Version
                </button>
              </div>
            )}
          </div>
        )}

        {/* Main Viewport */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 pb-8 lg:pb-10 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>

      {/* Mobile Full Module Drawer */}
      {showMobileDrawer && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-start justify-center pt-4 px-3">
          <div className="w-full max-w-md bg-white dark:bg-[#161D1A] rounded-2xl p-5 max-h-[82vh] overflow-y-auto space-y-4 shadow-2xl border border-neutral-200 dark:border-neutral-800">
            <div className="flex items-center justify-between">
              <span className="font-display font-bold text-lg">Alle Bereiche</span>
              <button
                type="button"
                onClick={() => setShowMobileDrawer(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {[...NAV_ITEMS, { id: 'weather' as MainModuleId, label: 'Wetter', color: '#597CD4', icon: CloudSun }].map(
                (item) => {
                  const Icon = item.icon;
                  const active = activeModule === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setActiveModule(item.id);
                        setShowMobileDrawer(false);
                      }}
                      className={`flex items-center gap-3 p-3.5 rounded-xl border text-sm font-medium min-h-[48px] ${
                        active
                          ? 'bg-[#233A29] text-white border-[#233A29]'
                          : 'border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200'
                      }`}
                    >
                      <span style={{ color: active ? '#BBE774' : item.color }} className="shrink-0">
                        <Icon className="w-4 h-4" />
                      </span>
                      <span className="truncate">{item.label}</span>
                    </button>
                  );
                }
              )}
            </div>
          </div>
        </div>
      )}

      {/* iOS PWA Install Guide */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-w-sm w-full bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 space-y-3">
            <h3 className="font-display text-lg font-bold">Hof & Garten auf iPhone installieren</h3>
            <p className="text-sm text-neutral-600 dark:text-neutral-300 leading-relaxed">
              1. Tippe in Safari unten auf das <strong>Teilen</strong>-Symbol.<br />
              2. Wähle <strong>Zum Home-Bildschirm</strong>.<br />
              3. Öffne die App anschließend vom Home-Bildschirm — erst dann unterstützt iOS Safari Web-Push-Benachrichtigungen.
            </p>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="w-full py-2.5 rounded-xl bg-[#233A29] text-white text-sm font-medium"
            >
              Verstanden
            </button>
          </div>
        </div>
      )}

      {/* Toast Stack */}
      <div className="fixed bottom-4 lg:bottom-6 right-4 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`px-4 py-2.5 rounded-xl text-xs font-medium shadow-lg border ${
              t.kind === 'error'
                ? 'bg-[#CF6432] text-white border-[#CF6432]'
                : t.kind === 'warning'
                ? 'bg-[#FFC814] text-[#18201B] border-[#E0AD00]'
                : t.kind === 'success'
                ? 'bg-[#233A29] text-white border-[#233A29]'
                : 'bg-white dark:bg-[#161D1A] text-neutral-900 dark:text-neutral-100 border-neutral-200 dark:border-neutral-800'
            }`}
          >
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
};
