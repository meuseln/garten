import React, { useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  KeyRound,
  Lock,
  Mail,
  RefreshCw,
  ShieldCheck,
  Sprout,
} from 'lucide-react';
import { useHomestead } from '../context/HomesteadContext';
import { FIREBASE_PROJECT_ID } from '../lib/firebase';
import type { UserIdentity } from '../types/homestead';

export const AuthScreen: React.FC = () => {
  const {
    firebaseUser,
    userProfile,
    profileLoading,
    loginWithEmail,
    sendResetPassword,
    resendVerificationEmail,
    refreshAuthUser,
    setupIdentityProfile,
    logoutUser,
    members,
  } = useHomestead();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'login' | 'reset'>('login');
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [infoMsg, setInfoMsg] = useState<string | null>(null);
  const [needsConsoleSetup, setNeedsConsoleSetup] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setNeedsConsoleSetup(false);
    setBusy(true);
    try {
      await loginWithEmail(email, password);
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code || '';
      if (code === 'auth/operation-not-allowed' || code === 'auth/configuration-not-found') {
        setNeedsConsoleSetup(true);
        setErrorMsg('Die E-Mail/Passwort-Anmeldung muss einmalig in der Firebase Console aktiviert werden.');
      } else if (code === 'auth/invalid-credential' || code === 'auth/wrong-password' || code === 'auth/user-not-found') {
        setErrorMsg('E-Mail-Adresse oder Passwort ist nicht korrekt.');
      } else if (code === 'auth/too-many-requests') {
        setErrorMsg('Zu viele fehlgeschlagene Versuche. Bitte kurz warten oder Passwort zurücksetzen.');
      } else {
        setErrorMsg(err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen.');
      }
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setInfoMsg(null);
    setBusy(true);
    try {
      await sendResetPassword(email);
      setInfoMsg('Wenn ein Konto für diese E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet.');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Fehler beim Zurücksetzen.');
    } finally {
      setBusy(false);
    }
  };

  const handleChooseIdentity = async (identity: UserIdentity) => {
    setBusy(true);
    setErrorMsg(null);
    try {
      await setupIdentityProfile(identity);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Profil konnte nicht gespeichert werden.');
    } finally {
      setBusy(false);
    }
  };

  const calmBg =
    'min-h-screen flex items-center justify-center bg-gradient-to-b from-[#F4F6F1] to-[#E6ECE2] dark:from-[#0F1412] dark:to-[#131B17] p-4 sm:p-6';

  // Case 1: Logged in, waiting for email verification
  if (firebaseUser && !firebaseUser.emailVerified) {
    return (
      <div className={calmBg}>
        <div className="max-w-md w-full bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 space-y-5 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#233A29] text-[#BBE774] flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-bold text-neutral-900 dark:text-neutral-100">E-Mail bestätigen</h1>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 truncate">{firebaseUser.email}</p>
            </div>
          </div>
          <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed">
            Aus Sicherheitsgründen (Firestore-Zugriffsschutz) muss deine E-Mail-Adresse einmalig bestätigt sein.
            Klicke auf den Link in deinem Postfach und prüfe anschließend den Status.
          </p>
          {infoMsg && (
            <div className="p-3 rounded-lg bg-[#BBE774]/20 border border-[#BBE774]/50 text-xs text-neutral-900 dark:text-neutral-100">
              {infoMsg}
            </div>
          )}
          {errorMsg && (
            <div className="p-3 rounded-lg bg-[#CF6432]/15 border border-[#CF6432]/40 text-xs text-[#CF6432]">
              {errorMsg}
            </div>
          )}
          <div className="flex flex-col gap-2.5">
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                const verified = await refreshAuthUser();
                setBusy(false);
                if (!verified) {
                  setInfoMsg('Noch nicht bestätigt — bitte den Link in deiner E-Mail öffnen.');
                }
              }}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#233A29] text-white text-sm font-medium hover:opacity-90 transition flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              Bestätigung prüfen & weiter
            </button>
            <button
              disabled={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await resendVerificationEmail();
                  setInfoMsg('Bestätigungs-E-Mail wurde gesendet.');
                } catch (err) {
                  setErrorMsg(err instanceof Error ? err.message : 'Versand fehlgeschlagen.');
                } finally {
                  setBusy(false);
                }
              }}
              className="w-full min-h-[44px] py-2.5 px-4 rounded-xl border border-neutral-300 dark:border-neutral-700 text-sm font-medium text-neutral-700 dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition"
            >
              Bestätigungs-E-Mail erneut senden
            </button>
            <button
              onClick={() => logoutUser()}
              className="w-full min-h-[40px] py-2 text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
            >
              Abmelden
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Case 2: Logged in & verified, needs first-time Nico/Chris profile selection
  if (firebaseUser && firebaseUser.emailVerified && !profileLoading && !userProfile) {
    const takenNames = new Set(members.map((m) => m.displayName));
    return (
      <div className={calmBg}>
        <div className="max-w-lg w-full bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl p-6 space-y-6 shadow-xs">
          <div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">Hofprofil zuordnen</h1>
            <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
              Angemeldet als {firebaseUser.email}. Bitte wähle dein persönliches Profil für Aufgaben, Kalenderfarben und Pings:
            </p>
          </div>
          {errorMsg && (
            <div className="p-3 rounded-lg bg-[#CF6432]/15 border border-[#CF6432]/40 text-xs text-[#CF6432]">
              {errorMsg}
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <button
              disabled={busy}
              onClick={() => handleChooseIdentity('Nico')}
              className="text-left p-4 min-h-[68px] rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-[#BBE774] transition flex items-center gap-4 bg-[#F7F7F5]/60 dark:bg-[#0F1412]/60"
            >
              <div className="w-12 h-12 rounded-full shrink-0 border-2 border-[#BBE774] bg-gradient-to-br from-[#D6F3A2] via-[#BBE774] to-[#88BC38] text-[#18201B] font-display font-bold text-lg flex items-center justify-center">
                N
              </div>
              <div>
                <div className="font-semibold text-neutral-900 dark:text-neutral-100">Nico</div>
                <div className="text-xs text-neutral-500 mt-0.5">Akzentfarbe Hellgrün</div>
                {takenNames.has('Nico') && (
                  <div className="text-[11px] text-neutral-500 mt-1">Bereits verknüpft</div>
                )}
              </div>
            </button>

            <button
              disabled={busy}
              onClick={() => handleChooseIdentity('Chris')}
              className="text-left p-4 min-h-[68px] rounded-xl border border-neutral-200 dark:border-neutral-800 hover:border-[#F28090] transition flex items-center gap-4 bg-[#F7F7F5]/60 dark:bg-[#0F1412]/60"
            >
              <div className="w-12 h-12 rounded-full shrink-0 border-2 border-[#F28090] bg-gradient-to-br from-[#F9B4BE] via-[#F28090] to-[#D45B6E] text-[#18201B] font-display font-bold text-lg flex items-center justify-center">
                C
              </div>
              <div>
                <div className="font-semibold text-neutral-900 dark:text-neutral-100">Chris</div>
                <div className="text-xs text-neutral-500 mt-0.5">Akzentfarbe Rosa</div>
                {takenNames.has('Chris') && (
                  <div className="text-[11px] text-neutral-500 mt-1">Bereits verknüpft</div>
                )}
              </div>
            </button>
          </div>
          <button
            onClick={() => logoutUser()}
            className="min-h-[40px] text-xs text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200"
          >
            Mit anderem Konto anmelden
          </button>
        </div>
      </div>
    );
  }

  // Case 3: Colorful, calm Login with simple garden illustration & Schwarzatal coordinates
  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-12 bg-gradient-to-br from-[#F4F7EF] via-[#F7F7F5] to-[#ECF3EA] dark:from-[#0F1412] dark:to-[#131B17]">
      {/* Desktop Visual Panel */}
      <div className="relative hidden lg:block lg:col-span-7 overflow-hidden bg-gradient-to-br from-[#233A29] via-[#2F4E37] to-[#4A6B52]">
        <img
          src="/src/assets/images/schwarzatal_garden_illustration_1795520601447.jpg"
          alt="Illustration eines Bauerngartens im Thüringer Schiefergebirge"
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-[#132017]/90 via-[#132017]/20 to-[#132017]/55"
        />
        <div className="relative z-10 h-full flex flex-col justify-between p-10 xl:p-12 text-[#F5F8F2]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#233A29]/85 backdrop-blur-xs border border-white/20 flex items-center justify-center shrink-0">
              <Sprout className="w-5 h-5 text-[#BBE774]" />
            </div>
            <span className="font-display text-xl font-semibold tracking-tight drop-shadow-xs">
              Hof & Garten
            </span>
          </div>

          <div className="max-w-xl space-y-2.5">
            <h1 className="font-display text-3xl xl:text-4xl font-bold leading-tight text-balance">
              Mellenbach-Glasbach
            </h1>
            <p className="text-sm xl:text-base text-[#EDF3EA]/95 leading-relaxed">
              Gemeinsame Hof-, Garten- und Vorratsverwaltung für Nico und Chris.
            </p>
            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-medium text-[#E3ECE0] pt-1">
              <span>Thüringer Schiefergebirge</span>
              <span aria-hidden="true">·</span>
              <span>98744 Schwarzatal</span>
              <span aria-hidden="true">·</span>
              <span className="font-mono-num">50.60° N, 11.12° O</span>
              <span aria-hidden="true">·</span>
              <span>Privater Zugang</span>
            </div>
          </div>
        </div>
      </div>

      {/* Login Form Column */}
      <div className="lg:col-span-5 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-md bg-white dark:bg-[#161D1A] border border-neutral-200 dark:border-neutral-800 rounded-2xl overflow-hidden shadow-xs">
          {/* Mobile Compact Visual Banner */}
          <div className="relative lg:hidden h-36 overflow-hidden bg-gradient-to-br from-[#233A29] to-[#4A6B52]">
            <img
              src="/src/assets/images/schwarzatal_garden_illustration_1795520601447.jpg"
              alt="Gartenillustration Thüringer Schiefergebirge"
              referrerPolicy="no-referrer"
              className="absolute inset-0 w-full h-full object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-[#132017]/90 via-[#132017]/30 to-transparent"
            />
            <div className="relative z-10 h-full flex flex-col justify-end p-4 text-[#F5F8F2]">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#233A29]/90 flex items-center justify-center shrink-0">
                  <Sprout className="w-4 h-4 text-[#BBE774]" />
                </div>
                <span className="font-display text-base font-bold">Hof & Garten</span>
              </div>
              <div className="text-[11px] text-[#E3ECE0] mt-1 font-mono-num">
                Thüringer Schiefergebirge · 50.60° N, 11.12° O
              </div>
            </div>
          </div>

          {/* Subtle colorful accent bar (Nico lime -> Sun gold -> Chris coral) */}
          <div
            aria-hidden="true"
            className="h-1 w-full bg-gradient-to-r from-[#BBE774] via-[#FFC814] to-[#F28090]"
          />

          <div className="p-5 sm:p-7 space-y-5">
            <div>
              <h2 className="font-display text-xl sm:text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                {mode === 'login' ? 'Anmelden' : 'Passwort zurücksetzen'}
              </h2>
              <p className="text-xs sm:text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                {mode === 'login'
                  ? 'Zugang für Nico und Chris mit E-Mail und Passwort.'
                  : 'E-Mail-Adresse eingeben, um einen Reset-Link zu erhalten.'}
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-[#CF6432]/12 border border-[#CF6432]/35 text-xs text-[#9A3E14] dark:text-[#F49D76] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            {infoMsg && (
              <div className="p-3 rounded-xl bg-[#BBE774]/25 border border-[#84B835]/40 text-xs text-neutral-900 dark:text-neutral-100 flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-[#3B6912] dark:text-[#BBE774]" />
                <span>{infoMsg}</span>
              </div>
            )}

            {needsConsoleSetup && (
              <div className="p-3.5 rounded-xl bg-[#F7F7F5] dark:bg-[#0F1412] border border-neutral-200 dark:border-neutral-800 text-xs text-neutral-700 dark:text-neutral-300 space-y-1.5">
                <div className="font-semibold text-neutral-900 dark:text-neutral-100">
                  Einmalige Einrichtung in Firebase:
                </div>
                <ol className="list-decimal list-inside space-y-1">
                  <li>
                    Projekt <code className="font-mono">{FIREBASE_PROJECT_ID}</code> öffnen.
                  </li>
                  <li>Authentication → Sign-in method → „E-Mail/Passwort“ aktivieren.</li>
                  <li>Unter Users Konten für Nico und Chris anlegen.</li>
                </ol>
              </div>
            )}

            {mode === 'login' ? (
              <form onSubmit={handleLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    E-Mail-Adresse
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@beispiel.de"
                      className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#233A29]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Passwort
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="password"
                      required
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#233A29]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={busy}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#233A29] text-white text-sm font-semibold hover:opacity-95 transition disabled:opacity-60"
                >
                  {busy ? 'Anmeldung läuft…' : 'Anmelden'}
                </button>

                <div className="flex items-center justify-between pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('reset');
                      setErrorMsg(null);
                      setInfoMsg(null);
                    }}
                    className="min-h-[40px] text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-neutral-100 inline-flex items-center gap-1.5"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    Passwort vergessen?
                  </button>
                  <span className="text-xs text-neutral-500">Privater Hofzugang</span>
                </div>
              </form>
            ) : (
              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    E-Mail-Adresse
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-neutral-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@beispiel.de"
                      className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 rounded-xl border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-[#0F1412] text-sm text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-2 focus:ring-[#233A29]"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={busy}
                  className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-[#233A29] text-white text-sm font-semibold hover:opacity-95 transition disabled:opacity-60"
                >
                  {busy ? 'Sende E-Mail…' : 'Reset-Link senden'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode('login');
                    setErrorMsg(null);
                    setInfoMsg(null);
                  }}
                  className="min-h-[40px] inline-flex items-center gap-1.5 text-xs font-medium text-neutral-600 dark:text-neutral-400 hover:text-neutral-900"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Zurück zur Anmeldung
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
