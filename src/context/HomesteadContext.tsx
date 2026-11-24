import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  deleteUser,
  onAuthStateChanged,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
  type User,
} from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { getToken } from 'firebase/messaging';
import {
  auth,
  db,
  getMessagingInstance,
  handleFirestoreError,
  OperationType,
  testConnection,
} from '../lib/firebase';
import {
  loadOfflineQueue,
  loadOfflineSnapshot,
  type OfflineMutation,
  saveOfflineQueue,
  saveOfflineSnapshot,
  useOnlineStatus,
} from '../lib/offlineSync';
import { fetchMellenbachWeather, getCachedWeather } from '../lib/weather';
import {
  buildStarterDataBundle,
  buildStarterKnowledge,
  buildStarterPlants,
  buildStarterRecipes,
} from '../data/botanicalCatalog';
import type {
  AnimalGroupPayload,
  AnimalLogPayload,
  AreaPayload,
  AuditLogRecord,
  BatchPayload,
  CalendarEventPayload,
  DashboardCardConfig,
  DocumentPayload,
  EmergencyConfigPayload,
  EquipmentPayload,
  FeedStockPayload,
  FinancePayload,
  HarvestPayload,
  HomesteadMember,
  HomesteadRecord,
  InventoryItemPayload,
  KnowledgePayload,
  MainModuleId,
  PingRecord,
  PlantingPayload,
  PlantPayload,
  ProjectPayload,
  RecipePayload,
  ResourcePayload,
  SeedPayload,
  ShoppingPayload,
  ThemePreference,
  UserIdentity,
  UserNotificationSettings,
  UserPrivateProfile,
  WeatherData,
} from '../types/homestead';

export const DEFAULT_DASHBOARD_LAYOUT: DashboardCardConfig[] = [
  { id: 'weather', label: 'Wetter & Gartenwetter', visible: true, priority: 1 },
  { id: 'tasks', label: 'Aufgaben & Termine', visible: true, priority: 2 },
  { id: 'garden', label: 'Garten & Aussaaten', visible: true, priority: 3 },
  { id: 'animals', label: 'Tiere & Futter', visible: true, priority: 4 },
  { id: 'pantry', label: 'Vorräte & Ernten', visible: true, priority: 5 },
  { id: 'projects', label: 'Projekte & Einkauf', visible: true, priority: 6 },
  { id: 'notes', label: 'Persönliche Notizen', visible: true, priority: 7 },
];

export const DEFAULT_NOTIFICATION_SETTINGS: UserNotificationSettings = {
  instantPush: true,
  dailySummary: false,
  quietHoursEnabled: true,
  quietStart: '22:00',
  quietEnd: '07:00',
  priorityMinimum: 'all',
  soundEnabled: true,
  categories: {
    general: true,
    calendar: true,
    weather: true,
    garden: true,
    animals: true,
    pantry: true,
    projects: true,
  },
};

export interface SyncConflict {
  id: string;
  collectionName: string;
  docId: string;
  title: string;
  localPayload: object;
  remoteUpdatedAtMs: number;
}

export interface ToastMessage {
  id: string;
  kind: 'success' | 'info' | 'warning' | 'error';
  text: string;
}

export interface InAppNotification {
  id: string;
  category: keyof UserNotificationSettings['categories'];
  priority: 'normal' | 'important' | 'emergency';
  title: string;
  body: string;
  timestampMs: number;
  read: boolean;
}

interface HomesteadContextValue {
  // Auth & Identity
  firebaseUser: User | null;
  authReady: boolean;
  userProfile: UserPrivateProfile | null;
  profileLoading: boolean;
  members: HomesteadMember[];
  activeIdentity: UserIdentity | null;
  otherIdentity: UserIdentity | null;
  isOnline: boolean;
  dbConnected: boolean;

  // Navigation & Theme
  activeModule: MainModuleId;
  setActiveModule: (mod: MainModuleId) => void;
  resolvedTheme: 'light' | 'dark';
  setThemePreference: (pref: ThemePreference) => Promise<void>;

  // Auth Actions
  loginWithEmail: (email: string, password: string) => Promise<void>;
  sendResetPassword: (email: string) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  refreshAuthUser: () => Promise<boolean>;
  setupIdentityProfile: (identity: UserIdentity) => Promise<void>;
  logoutUser: () => Promise<void>;
  deleteOwnAccount: () => Promise<void>;

  // Personal settings actions
  updatePersonalNotes: (notes: string) => Promise<void>;
  updateNotificationSettings: (settings: UserNotificationSettings) => Promise<void>;
  updateDashboardLayout: (layout: DashboardCardConfig[]) => Promise<void>;
  requestPushPermission: () => Promise<{ granted: boolean; reason?: string }>;

  // Ping & Notifications
  pings: PingRecord[];
  pingCooldownSec: number;
  sendPing: () => Promise<void>;
  acknowledgePing: (pingId: string) => Promise<void>;
  notifications: InAppNotification[];
  markAllNotificationsRead: () => void;
  toasts: ToastMessage[];
  pushToast: (kind: ToastMessage['kind'], text: string) => void;

  // Weather
  weather: WeatherData | null;
  weatherLoading: boolean;
  weatherError: string | null;
  refreshWeather: () => Promise<void>;

  // Collections
  areas: HomesteadRecord<AreaPayload>[];
  plants: HomesteadRecord<PlantPayload>[];
  plantings: HomesteadRecord<PlantingPayload>[];
  seeds: HomesteadRecord<SeedPayload>[];
  animalGroups: HomesteadRecord<AnimalGroupPayload>[];
  animalLogs: HomesteadRecord<AnimalLogPayload>[];
  feedStocks: HomesteadRecord<FeedStockPayload>[];
  harvests: HomesteadRecord<HarvestPayload>[];
  recipes: HomesteadRecord<RecipePayload>[];
  batches: HomesteadRecord<BatchPayload>[];
  inventoryItems: HomesteadRecord<InventoryItemPayload>[];
  resources: HomesteadRecord<ResourcePayload>[];
  projects: HomesteadRecord<ProjectPayload>[];
  calendarEvents: HomesteadRecord<CalendarEventPayload>[];
  knowledgeEntries: HomesteadRecord<KnowledgePayload>[];
  equipment: HomesteadRecord<EquipmentPayload>[];
  financeEntries: HomesteadRecord<FinancePayload>[];
  shoppingItems: HomesteadRecord<ShoppingPayload>[];
  documents: HomesteadRecord<DocumentPayload>[];
  emergencyConfig: HomesteadRecord<EmergencyConfigPayload>[];
  auditLogs: AuditLogRecord[];

  // CRUD & Offline Sync
  createRecord: <T extends object>(
    collectionName: string,
    title: string,
    payload: T,
    customId?: string
  ) => Promise<string>;
  updateRecord: <T extends object>(
    collectionName: string,
    docId: string,
    title: string,
    payload: T,
    baseUpdatedAtMs?: number
  ) => Promise<void>;
  archiveRecord: (collectionName: string, docId: string, title: string) => Promise<void>;
  restoreRecord: (collectionName: string, docId: string, title: string) => Promise<void>;
  deleteRecordPermanently: (collectionName: string, docId: string, title: string) => Promise<void>;
  initializeStarterData: () => Promise<void>;
  seedReferenceDatabases: () => Promise<{ added: number; skipped: number }>;
  offlineQueue: OfflineMutation[];
  syncConflicts: SyncConflict[];
  resolveSyncConflict: (conflictId: string, choice: 'keep_local' | 'keep_remote') => Promise<void>;
  deepLinkBatch: string | null;
  setDeepLinkBatch: (batch: string | null) => void;
}

const HomesteadContext = createContext<HomesteadContextValue | null>(null);

function tsToMs(val: unknown): number {
  if (val instanceof Timestamp) return val.toMillis();
  if (typeof val === 'number') return val;
  if (val && typeof val === 'object' && 'seconds' in val) {
    return Number((val as { seconds: number }).seconds) * 1000;
  }
  return Date.now();
}

function makeDocId(prefix: string, seqIndex?: number): string {
  const rand = Math.random().toString(36).slice(2, 8);
  const seq = typeof seqIndex === 'number' ? `_${seqIndex}` : '';
  return `${prefix}_${Date.now()}${seq}_${rand}`;
}

export const HomesteadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isOnline = useOnlineStatus();
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [authRevision, setAuthRevision] = useState(0);
  const [userProfile, setUserProfile] = useState<UserPrivateProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [members, setMembers] = useState<HomesteadMember[]>([]);
  const [dbConnected, setDbConnected] = useState(true);

  const [activeModule, setActiveModule] = useState<MainModuleId>('dashboard');
  const [systemPrefDark, setSystemPrefDark] = useState(
    typeof window !== 'undefined' && window.matchMedia?.('(prefers-color-scheme: dark)').matches
  );

  // Operational collections
  const [areas, setAreas] = useState<HomesteadRecord<AreaPayload>[]>([]);
  const [plants, setPlants] = useState<HomesteadRecord<PlantPayload>[]>([]);
  const [plantings, setPlantings] = useState<HomesteadRecord<PlantingPayload>[]>([]);
  const [seeds, setSeeds] = useState<HomesteadRecord<SeedPayload>[]>([]);
  const [animalGroups, setAnimalGroups] = useState<HomesteadRecord<AnimalGroupPayload>[]>([]);
  const [animalLogs, setAnimalLogs] = useState<HomesteadRecord<AnimalLogPayload>[]>([]);
  const [feedStocks, setFeedStocks] = useState<HomesteadRecord<FeedStockPayload>[]>([]);
  const [harvests, setHarvests] = useState<HomesteadRecord<HarvestPayload>[]>([]);
  const [recipes, setRecipes] = useState<HomesteadRecord<RecipePayload>[]>([]);
  const [batches, setBatches] = useState<HomesteadRecord<BatchPayload>[]>([]);
  const [inventoryItems, setInventoryItems] = useState<HomesteadRecord<InventoryItemPayload>[]>([]);
  const [resources, setResources] = useState<HomesteadRecord<ResourcePayload>[]>([]);
  const [projects, setProjects] = useState<HomesteadRecord<ProjectPayload>[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<HomesteadRecord<CalendarEventPayload>[]>([]);
  const [knowledgeEntries, setKnowledgeEntries] = useState<HomesteadRecord<KnowledgePayload>[]>([]);
  const [equipment, setEquipment] = useState<HomesteadRecord<EquipmentPayload>[]>([]);
  const [financeEntries, setFinanceEntries] = useState<HomesteadRecord<FinancePayload>[]>([]);
  const [shoppingItems, setShoppingItems] = useState<HomesteadRecord<ShoppingPayload>[]>([]);
  const [documents, setDocuments] = useState<HomesteadRecord<DocumentPayload>[]>([]);
  const [emergencyConfig, setEmergencyConfig] = useState<HomesteadRecord<EmergencyConfigPayload>[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogRecord[]>([]);
  const [pings, setPings] = useState<PingRecord[]>([]);

  const [weather, setWeather] = useState<WeatherData | null>(() => getCachedWeather());
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  const [offlineQueue, setOfflineQueue] = useState<OfflineMutation[]>(() => loadOfflineQueue());
  const [syncConflicts, setSyncConflicts] = useState<SyncConflict[]>([]);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);
  const [pingCooldownSec, setPingCooldownSec] = useState(0);
  const [deepLinkBatch, setDeepLinkBatch] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    return params.get('batch');
  });

  const seenPingIdsRef = useRef<Set<string>>(new Set());
  const initialPingLoadRef = useRef(true);

  const pushToast = useCallback((kind: ToastMessage['kind'], text: string) => {
    const id = makeDocId('toast');
    setToasts((prev) => [...prev.slice(-4), { id, kind, text }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  }, []);

  // Jump to pantry if ?batch= QR code link was scanned
  useEffect(() => {
    if (deepLinkBatch) {
      setActiveModule('pantry');
    }
  }, [deepLinkBatch]);

  // Cooldown timer for 1-click Ping
  useEffect(() => {
    if (pingCooldownSec <= 0) return;
    const t = setInterval(() => {
      setPingCooldownSec((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [pingCooldownSec]);

  // System dark mode listener
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)');
    if (!mq) return;
    const handler = (e: MediaQueryListEvent) => setSystemPrefDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const resolvedTheme: 'light' | 'dark' = useMemo(() => {
    const pref = userProfile?.themePreference || 'light';
    if (pref === 'system') return systemPrefDark ? 'dark' : 'light';
    return pref;
  }, [userProfile?.themePreference, systemPrefDark]);

  useEffect(() => {
    const root = document.documentElement;
    if (resolvedTheme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [resolvedTheme]);

  // Initial Firestore connectivity check
  useEffect(() => {
    testConnection().then((ok) => setDbConnected(ok));
  }, []);

  // Weather auto-fetch
  const refreshWeather = useCallback(async () => {
    setWeatherLoading(true);
    setWeatherError(null);
    try {
      const fresh = await fetchMellenbachWeather();
      setWeather(fresh);
    } catch (err) {
      const cached = getCachedWeather();
      if (cached) setWeather({ ...cached, isStale: true });
      setWeatherError(err instanceof Error ? err.message : 'Wetterdaten konnten nicht aktualisiert werden.');
    } finally {
      setWeatherLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshWeather();
    const interval = setInterval(refreshWeather, 30 * 60 * 1000);
    return () => clearInterval(interval);
  }, [refreshWeather]);

  // Auth listener
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setFirebaseUser(user);
      setAuthReady(true);
      if (!user) {
        setUserProfile(null);
        setProfileLoading(false);
        setMembers([]);
      }
    });
    return () => unsub();
  }, []);

  // User private profile & member directory listener
  useEffect(() => {
    if (!authReady || !firebaseUser || !firebaseUser.emailVerified) {
      setProfileLoading(false);
      return;
    }

    let cancelled = false;
    let unsubProfile: (() => void) | undefined;
    let unsubMembers: (() => void) | undefined;

    setProfileLoading(true);

    const startListeners = async () => {
      try {
        const tokenRes = await firebaseUser.getIdTokenResult();
        if (!tokenRes.claims.email_verified) {
          await firebaseUser.getIdToken(true);
        }
      } catch {
        // Proceed with current token if offline
      }
      if (cancelled) return;

      const userDocRef = doc(db, 'users', firebaseUser.uid);
      unsubProfile = onSnapshot(
        userDocRef,
        (snap) => {
          if (snap.exists()) {
            setUserProfile(snap.data() as UserPrivateProfile);
          } else {
            setUserProfile(null);
          }
          setProfileLoading(false);
        },
        (err) => {
          setProfileLoading(false);
          handleFirestoreError(err, OperationType.GET, `users/${firebaseUser.uid}`);
        }
      );

      const membersQuery = query(
        collection(db, 'homesteadMembers'),
        where('homesteadId', '==', 'mellenbach-hof')
      );
      unsubMembers = onSnapshot(
        membersQuery,
        (snap) => {
          const list: HomesteadMember[] = snap.docs.map((d) => {
            const data = d.data();
            return {
              ...(data as HomesteadMember),
              lastSeenAtMs: tsToMs(data.lastSeenAt),
            };
          });
          setMembers(list);
        },
        (err) => {
          handleFirestoreError(err, OperationType.LIST, 'homesteadMembers');
        }
      );
    };

    void startListeners();

    return () => {
      cancelled = true;
      unsubProfile?.();
      unsubMembers?.();
    };
  }, [authReady, firebaseUser, authRevision]);

  const activeIdentity: UserIdentity | null = userProfile?.displayName ?? null;
  const otherIdentity: UserIdentity | null =
    activeIdentity === 'Nico' ? 'Chris' : activeIdentity === 'Chris' ? 'Nico' : null;

  // Presence heartbeat every 60s
  useEffect(() => {
    if (!firebaseUser?.emailVerified || !userProfile) return;
    const updatePresence = async () => {
      if (!navigator.onLine) return;
      try {
        await updateDoc(doc(db, 'homesteadMembers', firebaseUser.uid), {
          lastSeenAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch {
        // Ignore transient offline heartbeat errors
      }
    };
    updatePresence();
    const timer = setInterval(updatePresence, 60000);
    return () => clearInterval(timer);
  }, [firebaseUser, userProfile]);

  // Load offline snapshot immediately if offline
  useEffect(() => {
    if (!isOnline) {
      const snap = loadOfflineSnapshot();
      if (snap?.data) {
        const d = snap.data as Record<string, unknown>;
        if (d.areas) setAreas(d.areas as HomesteadRecord<AreaPayload>[]);
        if (d.plants) setPlants(d.plants as HomesteadRecord<PlantPayload>[]);
        if (d.plantings) setPlantings(d.plantings as HomesteadRecord<PlantingPayload>[]);
        if (d.seeds) setSeeds(d.seeds as HomesteadRecord<SeedPayload>[]);
        if (d.animalGroups) setAnimalGroups(d.animalGroups as HomesteadRecord<AnimalGroupPayload>[]);
        if (d.animalLogs) setAnimalLogs(d.animalLogs as HomesteadRecord<AnimalLogPayload>[]);
        if (d.feedStocks) setFeedStocks(d.feedStocks as HomesteadRecord<FeedStockPayload>[]);
        if (d.harvests) setHarvests(d.harvests as HomesteadRecord<HarvestPayload>[]);
        if (d.recipes) setRecipes(d.recipes as HomesteadRecord<RecipePayload>[]);
        if (d.batches) setBatches(d.batches as HomesteadRecord<BatchPayload>[]);
        if (d.inventoryItems) setInventoryItems(d.inventoryItems as HomesteadRecord<InventoryItemPayload>[]);
        if (d.resources) setResources(d.resources as HomesteadRecord<ResourcePayload>[]);
        if (d.projects) setProjects(d.projects as HomesteadRecord<ProjectPayload>[]);
        if (d.calendarEvents) setCalendarEvents(d.calendarEvents as HomesteadRecord<CalendarEventPayload>[]);
        if (d.knowledgeEntries) setKnowledgeEntries(d.knowledgeEntries as HomesteadRecord<KnowledgePayload>[]);
        if (d.equipment) setEquipment(d.equipment as HomesteadRecord<EquipmentPayload>[]);
        if (d.financeEntries) setFinanceEntries(d.financeEntries as HomesteadRecord<FinancePayload>[]);
        if (d.shoppingItems) setShoppingItems(d.shoppingItems as HomesteadRecord<ShoppingPayload>[]);
        if (d.documents) setDocuments(d.documents as HomesteadRecord<DocumentPayload>[]);
        if (d.emergencyConfig) setEmergencyConfig(d.emergencyConfig as HomesteadRecord<EmergencyConfigPayload>[]);
      }
    }
  }, [isOnline]);

  // Attach shared homestead collection listeners ONLY when authenticated, email verified, and member profile exists
  useEffect(() => {
    const isReadyMember =
      authReady &&
      firebaseUser &&
      firebaseUser.emailVerified &&
      userProfile &&
      members.some((m) => m.uid === firebaseUser.uid);

    if (!isReadyMember) return;

    const mapSnap = <T,>(docs: Array<{ id: string; data: () => Record<string, unknown> }>): HomesteadRecord<T>[] =>
      docs.map((d) => {
        const raw = d.data();
        return {
          id: d.id,
          homesteadId: 'mellenbach-hof',
          module: String(raw.module || ''),
          title: String(raw.title || ''),
          archived: Boolean(raw.archived),
          payload: (raw.payload || {}) as T,
          createdBy: String(raw.createdBy || ''),
          updatedBy: String(raw.updatedBy || ''),
          createdAtMs: tsToMs(raw.createdAt),
          updatedAtMs: tsToMs(raw.updatedAt),
        };
      });

    const subscribeCol = <T,>(
      colName: string,
      setter: React.Dispatch<React.SetStateAction<HomesteadRecord<T>[]>>
    ) => {
      const q = query(collection(db, colName), where('homesteadId', '==', 'mellenbach-hof'));
      return onSnapshot(
        q,
        (snap) => {
          const items = mapSnap<T>(snap.docs).sort((a, b) => b.updatedAtMs - a.updatedAtMs);
          setter(items);
        },
        (err) => {
          handleFirestoreError(err, OperationType.LIST, colName);
        }
      );
    };

    const unsubs = [
      subscribeCol<AreaPayload>('areas', setAreas),
      subscribeCol<PlantPayload>('plants', setPlants),
      subscribeCol<PlantingPayload>('plantings', setPlantings),
      subscribeCol<SeedPayload>('seeds', setSeeds),
      subscribeCol<AnimalGroupPayload>('animalGroups', setAnimalGroups),
      subscribeCol<AnimalLogPayload>('animalLogs', setAnimalLogs),
      subscribeCol<FeedStockPayload>('feedStocks', setFeedStocks),
      subscribeCol<HarvestPayload>('harvests', setHarvests),
      subscribeCol<RecipePayload>('recipes', setRecipes),
      subscribeCol<BatchPayload>('batches', setBatches),
      subscribeCol<InventoryItemPayload>('inventoryItems', setInventoryItems),
      subscribeCol<ResourcePayload>('resources', setResources),
      subscribeCol<ProjectPayload>('projects', setProjects),
      subscribeCol<CalendarEventPayload>('calendarEvents', setCalendarEvents),
      subscribeCol<KnowledgePayload>('knowledgeEntries', setKnowledgeEntries),
      subscribeCol<EquipmentPayload>('equipment', setEquipment),
      subscribeCol<FinancePayload>('financeEntries', setFinanceEntries),
      subscribeCol<ShoppingPayload>('shoppingItems', setShoppingItems),
      subscribeCol<DocumentPayload>('documents', setDocuments),
      subscribeCol<EmergencyConfigPayload>('emergencyConfig', setEmergencyConfig),
    ];

    // Audit Logs
    const auditQ = query(
      collection(db, 'auditLogs'),
      where('homesteadId', '==', 'mellenbach-hof'),
      orderBy('createdAt', 'desc')
    );
    unsubs.push(
      onSnapshot(
        auditQ,
        (snap) => {
          const list: AuditLogRecord[] = snap.docs.slice(0, 150).map((d) => {
            const raw = d.data();
            return {
              id: d.id,
              homesteadId: 'mellenbach-hof',
              actorUid: String(raw.actorUid || ''),
              actorName: (raw.actorName === 'Chris' ? 'Chris' : 'Nico') as UserIdentity,
              action: raw.action,
              module: String(raw.module || ''),
              recordId: String(raw.recordId || ''),
              summary: String(raw.summary || ''),
              createdAtMs: tsToMs(raw.createdAt),
            };
          });
          setAuditLogs(list);
        },
        (err) => {
          handleFirestoreError(err, OperationType.LIST, 'auditLogs');
        }
      )
    );

    // Pings listener
    const pingQ = query(
      collection(db, 'pings'),
      where('homesteadId', '==', 'mellenbach-hof'),
      orderBy('createdAt', 'desc')
    );
    unsubs.push(
      onSnapshot(
        pingQ,
        (snap) => {
          const list: PingRecord[] = snap.docs.slice(0, 30).map((d) => {
            const raw = d.data();
            return {
              id: d.id,
              homesteadId: 'mellenbach-hof',
              fromUid: String(raw.fromUid || ''),
              fromName: (raw.fromName === 'Chris' ? 'Chris' : 'Nico') as UserIdentity,
              toName: (raw.toName === 'Chris' ? 'Chris' : 'Nico') as UserIdentity,
              message: String(raw.message || ''),
              acknowledged: Boolean(raw.acknowledged),
              archived: Boolean(raw.archived),
              createdBy: String(raw.createdBy || ''),
              createdAtMs: tsToMs(raw.createdAt),
            };
          });
          setPings(list);

          if (initialPingLoadRef.current) {
            list.forEach((p) => seenPingIdsRef.current.add(p.id));
            initialPingLoadRef.current = false;
            return;
          }

          for (const p of list) {
            if (!seenPingIdsRef.current.has(p.id)) {
              seenPingIdsRef.current.add(p.id);
              if (p.toName === userProfile.displayName && !p.acknowledged) {
                pushToast('info', p.message);
                setNotifications((prev) => [
                  {
                    id: p.id,
                    category: 'general',
                    priority: 'important',
                    title: `Ping von ${p.fromName}`,
                    body: p.message,
                    timestampMs: p.createdAtMs,
                    read: false,
                  },
                  ...prev.slice(0, 29),
                ]);
                if (
                  typeof Notification !== 'undefined' &&
                  Notification.permission === 'granted' &&
                  userProfile.notificationSettings?.categories?.general !== false
                ) {
                  try {
                    new Notification('Hof & Garten', {
                      body: p.message,
                      icon: '/pwa-192x192.png',
                    });
                  } catch {
                    // Fallback when browser requires SW notification
                  }
                }
              }
            }
          }
        },
        (err) => {
          handleFirestoreError(err, OperationType.LIST, 'pings');
        }
      )
    );

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [authReady, firebaseUser, userProfile, members, pushToast]);

  // Persist offline snapshot whenever core data changes
  useEffect(() => {
    if (!userProfile) return;
    saveOfflineSnapshot({
      areas,
      plants,
      plantings,
      seeds,
      animalGroups,
      animalLogs,
      feedStocks,
      harvests,
      recipes,
      batches,
      inventoryItems,
      resources,
      projects,
      calendarEvents,
      knowledgeEntries,
      equipment,
      financeEntries,
      shoppingItems,
      documents,
      emergencyConfig,
    });
  }, [
    userProfile,
    areas,
    plants,
    plantings,
    seeds,
    animalGroups,
    animalLogs,
    feedStocks,
    harvests,
    recipes,
    batches,
    inventoryItems,
    resources,
    projects,
    calendarEvents,
    knowledgeEntries,
    equipment,
    financeEntries,
    shoppingItems,
    documents,
    emergencyConfig,
  ]);

  // Generate smart notifications from weather alerts & overdue/today tasks
  useEffect(() => {
    if (!weather || !userProfile) return;
    const importantAlerts = weather.gardenAlerts.filter((a) => a.level !== 'info');
    if (importantAlerts.length === 0) return;
    setNotifications((prev) => {
      const existingIds = new Set(prev.map((n) => n.id));
      const additions: InAppNotification[] = [];
      for (const a of importantAlerts) {
        const nid = `weather_${a.id}_${new Date().toISOString().slice(0, 10)}`;
        if (!existingIds.has(nid)) {
          additions.push({
            id: nid,
            category: 'weather',
            priority: a.level === 'warning' ? 'emergency' : 'important',
            title: a.title,
            body: a.recommendation,
            timestampMs: Date.now(),
            read: false,
          });
        }
      }
      return additions.length > 0 ? [...additions, ...prev].slice(0, 35) : prev;
    });
  }, [weather, userProfile]);

  const writeAuditLog = useCallback(
    async (
      action: AuditLogRecord['action'],
      module: string,
      recordId: string,
      summary: string
    ) => {
      if (!firebaseUser || !activeIdentity || !navigator.onLine) return;
      const logId = makeDocId('log');
      try {
        await setDoc(doc(db, 'auditLogs', logId), {
          homesteadId: 'mellenbach-hof',
          actorUid: firebaseUser.uid,
          actorName: activeIdentity,
          action,
          module,
          recordId,
          summary: summary.slice(0, 400),
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `auditLogs/${logId}`);
      }
    },
    [firebaseUser, activeIdentity]
  );

  // Sync queued offline mutations when connection returns
  useEffect(() => {
    if (!isOnline || !firebaseUser?.emailVerified || !activeIdentity || offlineQueue.length === 0) {
      return;
    }

    const processQueue = async () => {
      const remaining: OfflineMutation[] = [];
      const newConflicts: SyncConflict[] = [];
      let syncedCount = 0;

      for (const item of offlineQueue) {
        try {
          const ref = doc(db, item.collectionName, item.docId);
          if (item.operation === 'create') {
            await setDoc(ref, {
              homesteadId: 'mellenbach-hof',
              module: item.collectionName,
              title: item.title.slice(0, 200),
              archived: false,
              payload: item.payload,
              createdBy: firebaseUser.uid,
              updatedBy: firebaseUser.uid,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
            syncedCount++;
          } else if (item.operation === 'update') {
            // Check potential conflict against loaded state
            if (item.baseUpdatedAtMs) {
              const allLists: Record<string, HomesteadRecord[]> = {
                areas, plants, plantings, seeds, animalGroups, animalLogs, feedStocks,
                harvests, recipes, batches, inventoryItems, resources, projects,
                calendarEvents, knowledgeEntries, equipment, financeEntries, shoppingItems, documents, emergencyConfig,
              };
              const currentRec = (allLists[item.collectionName] || []).find((r) => r.id === item.docId);
              if (currentRec && currentRec.updatedAtMs > item.baseUpdatedAtMs && currentRec.updatedBy !== firebaseUser.uid) {
                newConflicts.push({
                  id: item.id,
                  collectionName: item.collectionName,
                  docId: item.docId,
                  title: item.title,
                  localPayload: item.payload,
                  remoteUpdatedAtMs: currentRec.updatedAtMs,
                });
                continue;
              }
            }
            await updateDoc(ref, {
              title: item.title.slice(0, 200),
              payload: item.payload,
              updatedBy: firebaseUser.uid,
              updatedAt: serverTimestamp(),
            });
            syncedCount++;
          } else if (item.operation === 'archive' || item.operation === 'restore') {
            await updateDoc(ref, {
              archived: item.operation === 'archive',
              updatedBy: firebaseUser.uid,
              updatedAt: serverTimestamp(),
            });
            syncedCount++;
          }
        } catch (err) {
          console.error('Offline queue sync error:', err);
          remaining.push(item);
        }
      }

      setOfflineQueue(remaining);
      saveOfflineQueue(remaining);
      if (newConflicts.length > 0) {
        setSyncConflicts((prev) => [...prev, ...newConflicts]);
        pushToast('warning', `${newConflicts.length} Synchronisationskonflikt(e) erkannt — bitte prüfen.`);
      }
      if (syncedCount > 0) {
        pushToast('success', `${syncedCount} Offline-Änderung(en) synchronisiert.`);
      }
    };

    processQueue();
  }, [isOnline, firebaseUser, activeIdentity, offlineQueue, areas, plants, plantings, seeds, animalGroups, animalLogs, feedStocks, harvests, recipes, batches, inventoryItems, resources, projects, calendarEvents, knowledgeEntries, equipment, financeEntries, shoppingItems, documents, emergencyConfig, pushToast]);

  // Auth Actions
  const loginWithEmail = async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password);
  };

  const sendResetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email.trim());
  };

  const resendVerificationEmail = async () => {
    if (!auth.currentUser) return;
    await sendEmailVerification(auth.currentUser);
  };

  const refreshAuthUser = async () => {
    if (!auth.currentUser) return false;
    await reload(auth.currentUser);
    if (auth.currentUser.emailVerified) {
      await auth.currentUser.getIdToken(true);
    }
    setAuthRevision((r) => r + 1);
    setFirebaseUser(auth.currentUser);
    return auth.currentUser.emailVerified;
  };

  const setupIdentityProfile = async (identity: UserIdentity) => {
    if (!firebaseUser) throw new Error('Nicht angemeldet');
    const accentColor = identity === 'Nico' ? '#BBE774' : '#F28090';
    const uid = firebaseUser.uid;
    const email = firebaseUser.email || `${identity.toLowerCase()}@hof.local`;

    try {
      // Ensure the JWT carries the latest email_verified claim for Firestore Rules
      await firebaseUser.getIdToken(true);

      const memberRef = doc(db, 'homesteadMembers', uid);
      const userRef = doc(db, 'users', uid);
      const [memberSnap, userSnap] = await Promise.all([getDoc(memberRef), getDoc(userRef)]);

      const batch = writeBatch(db);
      if (memberSnap.exists()) {
        batch.update(memberRef, {
          displayName: identity,
          accentColor,
          lastSeenAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.set(memberRef, {
          uid,
          homesteadId: 'mellenbach-hof',
          displayName: identity,
          accentColor,
          role: 'member',
          lastSeenAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      if (userSnap.exists()) {
        batch.update(userRef, {
          displayName: identity,
          accentColor,
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.set(userRef, {
          uid,
          email,
          displayName: identity,
          accentColor,
          role: 'member',
          personalNotes: '',
          themePreference: 'light',
          notificationSettings: DEFAULT_NOTIFICATION_SETTINGS,
          dashboardLayout: DEFAULT_DASHBOARD_LAYOUT,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await batch.commit();
      pushToast('success', `Willkommen, ${identity}! Dein Profil ist aktiv.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `users/${uid}`);
    }
  };

  const logoutUser = async () => {
    await signOut(auth);
  };

  const deleteOwnAccount = async () => {
    if (!firebaseUser) return;
    const uid = firebaseUser.uid;
    try {
      await deleteDoc(doc(db, 'users', uid));
      await deleteDoc(doc(db, 'homesteadMembers', uid));
      await deleteUser(firebaseUser);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `users/${uid}`);
    }
  };

  const setThemePreference = async (pref: ThemePreference) => {
    if (!firebaseUser || !userProfile) return;
    try {
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        themePreference: pref,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
    }
  };

  const updatePersonalNotes = async (notes: string) => {
    if (!firebaseUser || !userProfile) return;
    try {
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        personalNotes: notes.slice(0, 8000),
        updatedAt: serverTimestamp(),
      });
      pushToast('success', 'Persönliche Notizen gespeichert.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
    }
  };

  const updateNotificationSettings = async (settings: UserNotificationSettings) => {
    if (!firebaseUser || !userProfile) return;
    try {
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        notificationSettings: settings,
        updatedAt: serverTimestamp(),
      });
      pushToast('success', 'Benachrichtigungseinstellungen gespeichert.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
    }
  };

  const updateDashboardLayout = async (layout: DashboardCardConfig[]) => {
    if (!firebaseUser || !userProfile) return;
    try {
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        dashboardLayout: layout,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${firebaseUser.uid}`);
    }
  };

  const requestPushPermission = async (): Promise<{ granted: boolean; reason?: string }> => {
    if (typeof Notification === 'undefined') {
      return { granted: false, reason: 'Dieser Browser unterstützt keine Push-Benachrichtigungen (auf iPhone zuerst "Zum Home-Bildschirm" hinzufügen).' };
    }
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') {
      return { granted: false, reason: 'Berechtigung wurde vom Browser abgelehnt.' };
    }
    const vapidKey = import.meta.env.VITE_FIREBASE_VAPID_KEY;
    if (vapidKey && firebaseUser) {
      const messaging = await getMessagingInstance();
      if (messaging) {
        try {
          const swReg = await navigator.serviceWorker?.register('/firebase-messaging-sw.js');
          const token = await getToken(messaging, {
            vapidKey,
            serviceWorkerRegistration: swReg,
          });
          if (token) {
            await updateDoc(doc(db, 'homesteadMembers', firebaseUser.uid), {
              fcmToken: token,
              updatedAt: serverTimestamp(),
            });
          }
          return { granted: true };
        } catch (err) {
          return {
            granted: true,
            reason: `Browser-Benachrichtigung aktiv; FCM-Token-Registrierung Hinweis: ${err instanceof Error ? err.message : 'VAPID prüfen'}`,
          };
        }
      }
    }
    return {
      granted: true,
      reason: vapidKey ? undefined : 'Lokale Browser-Benachrichtigungen aktiv (für Hintergrund-FCM bitte VITE_FIREBASE_VAPID_KEY hinterlegen).',
    };
  };

  // 1-Click Ping
  const sendPing = async () => {
    if (!firebaseUser || !activeIdentity || !otherIdentity) return;
    if (pingCooldownSec > 0) {
      pushToast('warning', `Bitte noch ${pingCooldownSec} Sekunden warten (Spamschutz).`);
      return;
    }
    const pingId = makeDocId('ping');
    const message = `${activeIdentity} pingt dich! Schau kurz in Hof & Garten vorbei.`;
    try {
      await setDoc(doc(db, 'pings', pingId), {
        homesteadId: 'mellenbach-hof',
        fromUid: firebaseUser.uid,
        fromName: activeIdentity,
        toName: otherIdentity,
        message,
        acknowledged: false,
        archived: false,
        createdBy: firebaseUser.uid,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      setPingCooldownSec(30);
      await writeAuditLog('ping', 'pings', pingId, `${activeIdentity} hat ${otherIdentity} angepingt`);
      pushToast('success', `Ping an ${otherIdentity} gesendet.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `pings/${pingId}`);
    }
  };

  const acknowledgePing = async (pingId: string) => {
    try {
      await updateDoc(doc(db, 'pings', pingId), {
        acknowledged: true,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `pings/${pingId}`);
    }
  };

  const markAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  // Shared CRUD Operations
  const createRecord = useCallback(
    async <T extends object>(
      collectionName: string,
      title: string,
      payload: T,
      customId?: string
    ): Promise<string> => {
      if (!firebaseUser) throw new Error('Nicht angemeldet');
      const docId = customId || makeDocId(collectionName.slice(0, 6));
      const cleanTitle = title.trim().slice(0, 200) || 'Eintrag';

      if (!navigator.onLine) {
        const nextQueue = [
          ...offlineQueue,
          {
            id: makeDocId('oq'),
            collectionName,
            docId,
            operation: 'create' as const,
            title: cleanTitle,
            payload,
            queuedAtMs: Date.now(),
          },
        ];
        setOfflineQueue(nextQueue);
        saveOfflineQueue(nextQueue);
        pushToast('info', `"${cleanTitle}" offline vorgemerkt — wird bei Verbindung synchronisiert.`);
        return docId;
      }

      try {
        await setDoc(doc(db, collectionName, docId), {
          homesteadId: 'mellenbach-hof',
          module: collectionName,
          title: cleanTitle,
          archived: false,
          payload,
          createdBy: firebaseUser.uid,
          updatedBy: firebaseUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        await writeAuditLog('create', collectionName, docId, `Erstellt: ${cleanTitle}`);
        return docId;
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `${collectionName}/${docId}`);
      }
    },
    [firebaseUser, offlineQueue, pushToast, writeAuditLog]
  );

  const updateRecord = useCallback(
    async <T extends object>(
      collectionName: string,
      docId: string,
      title: string,
      payload: T,
      baseUpdatedAtMs?: number
    ) => {
      if (!firebaseUser) throw new Error('Nicht angemeldet');
      const cleanTitle = title.trim().slice(0, 200) || 'Eintrag';

      if (!navigator.onLine) {
        const nextQueue = [
          ...offlineQueue,
          {
            id: makeDocId('oq'),
            collectionName,
            docId,
            operation: 'update' as const,
            title: cleanTitle,
            payload,
            baseUpdatedAtMs,
            queuedAtMs: Date.now(),
          },
        ];
        setOfflineQueue(nextQueue);
        saveOfflineQueue(nextQueue);
        pushToast('info', `Änderung an "${cleanTitle}" offline gespeichert.`);
        return;
      }

      try {
        await updateDoc(doc(db, collectionName, docId), {
          title: cleanTitle,
          payload,
          updatedBy: firebaseUser.uid,
          updatedAt: serverTimestamp(),
        });
        await writeAuditLog('update', collectionName, docId, `Aktualisiert: ${cleanTitle}`);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `${collectionName}/${docId}`);
      }
    },
    [firebaseUser, offlineQueue, pushToast, writeAuditLog]
  );

  const archiveRecord = useCallback(
    async (collectionName: string, docId: string, title: string) => {
      if (!firebaseUser) return;
      if (!navigator.onLine) {
        const nextQueue = [
          ...offlineQueue,
          {
            id: makeDocId('oq'),
            collectionName,
            docId,
            operation: 'archive' as const,
            title,
            payload: {},
            queuedAtMs: Date.now(),
          },
        ];
        setOfflineQueue(nextQueue);
        saveOfflineQueue(nextQueue);
        pushToast('info', `"${title}" offline in den Papierkorb verschoben.`);
        return;
      }
      try {
        await updateDoc(doc(db, collectionName, docId), {
          archived: true,
          updatedBy: firebaseUser.uid,
          updatedAt: serverTimestamp(),
        });
        await writeAuditLog('archive', collectionName, docId, `In Papierkorb verschoben: ${title}`);
        pushToast('info', `"${title}" in den Papierkorb verschoben (wiederherstellbar).`);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `${collectionName}/${docId}`);
      }
    },
    [firebaseUser, offlineQueue, pushToast, writeAuditLog]
  );

  const restoreRecord = useCallback(
    async (collectionName: string, docId: string, title: string) => {
      if (!firebaseUser) return;
      try {
        await updateDoc(doc(db, collectionName, docId), {
          archived: false,
          updatedBy: firebaseUser.uid,
          updatedAt: serverTimestamp(),
        });
        await writeAuditLog('restore', collectionName, docId, `Wiederhergestellt: ${title}`);
        pushToast('success', `"${title}" wiederhergestellt.`);
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `${collectionName}/${docId}`);
      }
    },
    [firebaseUser, pushToast, writeAuditLog]
  );

  const deleteRecordPermanently = useCallback(
    async (collectionName: string, docId: string, title: string) => {
      if (!firebaseUser) return;
      try {
        await deleteDoc(doc(db, collectionName, docId));
        await writeAuditLog('archive', collectionName, docId, `Endgültig gelöscht: ${title}`);
        pushToast('info', `"${title}" dauerhaft entfernt.`);
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${docId}`);
      }
    },
    [firebaseUser, pushToast, writeAuditLog]
  );

  const resolveSyncConflict = async (conflictId: string, choice: 'keep_local' | 'keep_remote') => {
    const conflict = syncConflicts.find((c) => c.id === conflictId);
    if (!conflict || !firebaseUser) return;
    if (choice === 'keep_local') {
      await updateRecord(conflict.collectionName, conflict.docId, conflict.title, conflict.localPayload);
    }
    setSyncConflicts((prev) => prev.filter((c) => c.id !== conflictId));
    pushToast('success', choice === 'keep_local' ? 'Lokale Version übernommen.' : 'Cloud-Version beibehalten.');
  };

  const commitChunkedWrites = async (
    entries: Array<{ colName: string; title: string; payload: unknown }>
  ) => {
    if (!firebaseUser) return;
    const CHUNK_SIZE = 350;
    for (let i = 0; i < entries.length; i += CHUNK_SIZE) {
      const slice = entries.slice(i, i + CHUNK_SIZE);
      const batch = writeBatch(db);
      slice.forEach((item, idx) => {
        const id = makeDocId(item.colName.slice(0, 5), i + idx);
        batch.set(doc(db, item.colName, id), {
          homesteadId: 'mellenbach-hof',
          module: item.colName,
          title: item.title.trim().slice(0, 200) || 'Eintrag',
          archived: false,
          payload: item.payload,
          createdBy: firebaseUser.uid,
          updatedBy: firebaseUser.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      await batch.commit();
    }
  };

  const initializeStarterData = async () => {
    if (!firebaseUser || !activeIdentity) return;
    if (!navigator.onLine) {
      pushToast('warning', 'Für die Ersteinrichtung bitte mit dem Internet verbinden.');
      return;
    }
    const bundle = buildStarterDataBundle(firebaseUser.uid);
    const writes: Array<{ colName: string; title: string; payload: unknown }> = [];
    const pushList = (colName: string, items: Array<{ title: string; payload: unknown }>) => {
      for (const item of items) {
        writes.push({ colName, title: item.title, payload: item.payload });
      }
    };
    pushList('areas', bundle.areas);
    pushList('plants', bundle.plants);
    pushList('recipes', bundle.recipes);
    pushList('animalGroups', bundle.animalGroups);
    pushList('feedStocks', bundle.feedStocks);
    pushList('plantings', bundle.plantings);
    pushList('seeds', bundle.seeds);
    pushList('resources', bundle.resources);
    pushList('knowledgeEntries', bundle.knowledge);
    pushList('calendarEvents', bundle.calendarEvents);
    pushList('emergencyConfig', [bundle.emergencyConfig]);

    try {
      await commitChunkedWrites(writes);
      await writeAuditLog('seed', 'homestead', 'starter', 'Hof-Grundstruktur & Fachwissen für Mellenbach-Glasbach eingerichtet');
      pushToast('success', 'Hof-Grundstruktur & Fachwissen wurden in Firebase angelegt.');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'starter-bundle');
    }
  };

  const seedReferenceDatabases = async (): Promise<{ added: number; skipped: number }> => {
    if (!firebaseUser || !activeIdentity) return { added: 0, skipped: 0 };
    if (!navigator.onLine) {
      pushToast('warning', 'Bitte online verbinden, um die Fachwissen-Datenbank in Firebase zu speichern.');
      return { added: 0, skipped: 0 };
    }

    const existingKnowledgeTitles = new Set(knowledgeEntries.map((k) => k.title.trim().toLowerCase()));
    const existingPlantTitles = new Set(plants.map((p) => p.title.trim().toLowerCase()));
    const existingRecipeTitles = new Set(recipes.map((r) => r.title.trim().toLowerCase()));

    const writes: Array<{ colName: string; title: string; payload: unknown }> = [];
    let skipped = 0;

    for (const item of buildStarterKnowledge()) {
      if (existingKnowledgeTitles.has(item.title.trim().toLowerCase())) {
        skipped += 1;
      } else {
        writes.push({ colName: 'knowledgeEntries', title: item.title, payload: item.payload });
      }
    }
    for (const item of buildStarterPlants()) {
      if (existingPlantTitles.has(item.title.trim().toLowerCase())) {
        skipped += 1;
      } else {
        writes.push({ colName: 'plants', title: item.title, payload: item.payload });
      }
    }
    for (const item of buildStarterRecipes()) {
      if (existingRecipeTitles.has(item.title.trim().toLowerCase())) {
        skipped += 1;
      } else {
        writes.push({ colName: 'recipes', title: item.title, payload: item.payload });
      }
    }

    if (writes.length === 0) {
      pushToast('info', 'Alle Fachwissen-, Sorten- und Rezept-Datenbanken sind bereits vollständig geladen.');
      return { added: 0, skipped };
    }

    try {
      await commitChunkedWrites(writes);
      await writeAuditLog(
        'seed',
        'knowledgeEntries',
        'reference-db',
        `${writes.length} Referenz-Einträge (Fachwissen, Sorten & Rezepte) ergänzt`
      );
      pushToast(
        'success',
        `${writes.length} neue Fachwissen-, Sorten- & Rezepteinträge in Firebase gespeichert.`
      );
      return { added: writes.length, skipped };
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'reference-databases');
      return { added: 0, skipped };
    }
  };

  return (
    <HomesteadContext.Provider
      value={{
        firebaseUser,
        authReady,
        userProfile,
        profileLoading,
        members,
        activeIdentity,
        otherIdentity,
        isOnline,
        dbConnected,
        activeModule,
        setActiveModule,
        resolvedTheme,
        setThemePreference,
        loginWithEmail,
        sendResetPassword,
        resendVerificationEmail,
        refreshAuthUser,
        setupIdentityProfile,
        logoutUser,
        deleteOwnAccount,
        updatePersonalNotes,
        updateNotificationSettings,
        updateDashboardLayout,
        requestPushPermission,
        pings,
        pingCooldownSec,
        sendPing,
        acknowledgePing,
        notifications,
        markAllNotificationsRead,
        toasts,
        pushToast,
        weather,
        weatherLoading,
        weatherError,
        refreshWeather,
        areas,
        plants,
        plantings,
        seeds,
        animalGroups,
        animalLogs,
        feedStocks,
        harvests,
        recipes,
        batches,
        inventoryItems,
        resources,
        projects,
        calendarEvents,
        knowledgeEntries,
        equipment,
        financeEntries,
        shoppingItems,
        documents,
        emergencyConfig,
        auditLogs,
        createRecord,
        updateRecord,
        archiveRecord,
        restoreRecord,
        deleteRecordPermanently,
        initializeStarterData,
        seedReferenceDatabases,
        offlineQueue,
        syncConflicts,
        resolveSyncConflict,
        deepLinkBatch,
        setDeepLinkBatch,
      }}
    >
      {children}
    </HomesteadContext.Provider>
  );
};

export function useHomestead(): HomesteadContextValue {
  const ctx = useContext(HomesteadContext);
  if (!ctx) throw new Error('useHomestead must be used inside HomesteadProvider');
  return ctx;
}
