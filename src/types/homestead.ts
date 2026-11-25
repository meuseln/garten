export type UserIdentity = 'Nico' | 'Chris';
export type AssigneeScope = 'Nico' | 'Chris' | 'Gemeinsam';
export type ThemePreference = 'light' | 'dark' | 'system';

export type MainModuleId =
  | 'dashboard'
  | 'property'
  | 'cultivation'
  | 'animals'
  | 'pantry'
  | 'calendar'
  | 'resources'
  | 'projects'
  | 'knowledge'
  | 'nature'
  | 'management'
  | 'weather';

export interface NotificationCategoryPrefs {
  general: boolean;
  calendar: boolean;
  weather: boolean;
  garden: boolean;
  animals: boolean;
  pantry: boolean;
  projects: boolean;
}

export interface UserNotificationSettings {
  instantPush: boolean;
  dailySummary: boolean;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  priorityMinimum: 'all' | 'important' | 'emergency';
  soundEnabled: boolean;
  categories: NotificationCategoryPrefs;
}

export interface DashboardCardConfig {
  id: string;
  label: string;
  visible: boolean;
  priority: number;
}

export interface UserPrivateProfile {
  uid: string;
  email: string;
  displayName: UserIdentity;
  accentColor: '#BBE774' | '#F28090';
  role: 'member';
  personalNotes: string;
  themePreference: ThemePreference;
  notificationSettings: UserNotificationSettings;
  dashboardLayout: DashboardCardConfig[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface HomesteadMember {
  uid: string;
  homesteadId: 'mellenbach-hof';
  displayName: UserIdentity;
  accentColor: '#BBE774' | '#F28090';
  role: 'member';
  fcmToken?: string;
  lastSeenAtMs?: number;
  lastSeenAt?: unknown;
  updatedAt?: unknown;
}

export interface PingRecord {
  id: string;
  homesteadId: 'mellenbach-hof';
  fromUid: string;
  fromName: UserIdentity;
  toName: UserIdentity;
  message: string;
  acknowledged: boolean;
  archived: boolean;
  createdBy: string;
  createdAtMs: number;
}

export interface HomesteadRecord<T = object> {
  id: string;
  homesteadId: 'mellenbach-hof';
  module: string;
  title: string;
  archived: boolean;
  payload: T;
  createdBy: string;
  updatedBy: string;
  createdAtMs: number;
  updatedAtMs: number;
}

// --- Domain Payloads ---

export interface AreaPayload {
  areaType: string;
  sizeSqm: number;
  description: string;
  currentUse: string;
  soilType: string;
  sunExposure: 'Vollsonnig' | 'Halbschatten' | 'Schatten' | 'Geschützt (Unter Glas)';
  irrigation: string;
  linkedItems: string[];
  historyNotes: string;
  imageUrl?: string;
}

export interface PlantPayload {
  species: string;
  variety: string;
  group: 'Fruchtgemüse' | 'Wurzel- & Knollengemüse' | 'Kohlgemüse' | 'Blattgemüse' | 'Hülsenfrüchte' | 'Zwiebelgewächse' | 'Weitere Kulturen' | 'Obst & Beeren' | 'Nüsse' | 'Pilze' | 'Kräuter' | 'Gehölze';
  description: string;
  origin: string;
  daysToMaturity: string;
  preCultureWindow: string;
  sowingWindow: string;
  plantingWindow: string;
  harvestWindow: string;
  plantSpacingCm: string;
  rowSpacingCm: string;
  lightNeed: string;
  waterNeed: string;
  nutrientNeed: 'Starkzehrer' | 'Mittelzehrer' | 'Schwachzehrer' | 'Dauerkultur';
  soilRequirement: string;
  hardiness: string;
  diseaseSusceptibility: string;
  yieldPotential: string;
  storageLife: string;
  taste: string;
  usage: string;
  processingSuitability: string;
  seedSource: string;
  sourceRef: string;
  goodNeighbors?: string;
  badNeighbors?: string;
  careTip?: string;
  // Tree / Woody fields optional
  isTree?: boolean;
  rootstock?: string;
  plantedDate?: string;
  growthForm?: string;
  crownDiameterM?: string;
  pollinator?: string;
  bloomWindow?: string;
  pruningNotes?: string;
  winterProtection?: string;
  // Personal experience
  experienceRating?: number;
  experienceYieldNote?: string;
  experienceTasteNote?: string;
  experienceCareNote?: string;
  experienceWeatherNote?: string;
  experienceProcessingNote?: string;
}

export interface PlantingPayload {
  areaId: string;
  areaName: string;
  plantId: string;
  plantName: string;
  variety: string;
  year: number;
  seasonPhase: 'Vorzucht' | 'Aussaat' | 'Direktsaat' | 'Pflanzung' | 'Pflege' | 'Düngung' | 'Schnitt' | 'Ernte' | 'Lagerung' | 'Wintervorbereitung';
  preCultureMonth: string;
  sowingMonth: string;
  plantingMonth: string;
  harvestMonth: string;
  preCrop: string;
  nextCrop: string;
  companionPlants: string;
  nutrientNeed: string;
  successionPlan: string;
  status: 'Geplant' | 'Vorgezogen' | 'Ausgesät' | 'Gepflanzt' | 'In Pflege' | 'Erntereif' | 'Abgeerntet' | 'Regeneration';
  notes: string;
}

export interface SeedPayload {
  variety: string;
  species: string;
  manufacturer: string;
  source: string;
  purchaseDate: string;
  quantity: number;
  unit: 'Korn' | 'g' | 'Tütchen';
  storageLocation: string;
  bestBefore: string;
  germinationRate: number;
  lastGermTest: string;
  selfHarvested: boolean;
  harvestYear: number;
  motherPlantNotes: string;
  dryingNotes: string;
  reorderNeeded: boolean;
}

export interface AnimalGroupPayload {
  species: 'Hühner' | 'Kaninchen' | 'Ziegen' | 'Schafe' | 'Enten' | 'Gänse' | 'Wachteln' | 'Sonstige';
  breed: string;
  count: number;
  femaleCount: number;
  maleCount: number;
  ageGroup: string;
  breedingGroup: string;
  housingSystem: string;
  areaId: string;
  areaName: string;
  feedingPlan: string;
  waterSchedule: string;
  beddingNotes: string;
  cleaningIntervalDays: number;
  lastCleanedDate: string;
  notes: string;
  imageUrl?: string;
  lastNdVaccineDate?: string;
  ndIntervalDays?: number;
  lastRhdVaccineDate?: string;
  rhdIntervalDays?: number;
}

export interface AnimalLogPayload {
  groupId: string;
  groupName: string;
  logType: 'Eier' | 'Milch' | 'Fütterung' | 'Reinigung' | 'Gesundheit' | 'Tierarzt' | 'Impfung' | 'Zugang/Abgang' | 'Nachwuchs' | 'Gewicht';
  date: string;
  quantity: number;
  unit: string;
  details: string;
  symptoms?: string;
  treatment?: string;
  vetName?: string;
  costEur?: number;
}

export interface FeedStockPayload {
  feedName: string;
  species: string;
  manufacturer: string;
  source: string;
  quantityKg: number;
  minStockKg: number;
  dailyConsumptionKg: number;
  costPerPurchaseEur: number;
  lastPurchased: string;
}

export type HarvestAllocationType =
  | 'Frischverbrauch'
  | 'Einkochen'
  | 'Einfrieren'
  | 'Fermentieren'
  | 'Trocknen'
  | 'Entsaften'
  | 'Marmeladen & Gelees'
  | 'Lagerung'
  | 'Tierfutter'
  | 'Verschenken';

export interface HarvestPayload {
  plantId: string;
  plantName: string;
  variety: string;
  areaId: string;
  areaName: string;
  date: string;
  amount: number;
  unit: 'kg' | 'g' | 'Stück' | 'Bund' | 'Liter';
  quality: 'Sehr gut' | 'Gut' | 'B-Ware / Verarbeitung';
  allocations: Partial<Record<HarvestAllocationType, number>>;
  notes: string;
}

export interface RecipeIngredient {
  name: string;
  amount: number;
  unit: string;
}

export interface RecipePayload {
  category: 'Einkochen' | 'Einfrieren' | 'Fermentieren' | 'Trocknen' | 'Lagerung' | 'Entsaften' | 'Marmeladen & Gelees' | 'Sonstiges';
  baseRawAmountKg: number;
  baseYieldAmount: number;
  baseYieldUnit: string;
  linkedPlant: string;
  ingredients: RecipeIngredient[];
  equipment: string;
  method: string;
  instructions: string;
  storageNotes: string;
  acidityAndSafetyNote: string;
  verifiedSource: string;
}

export interface BatchPayload {
  batchNumber: string;
  product: string;
  category: RecipePayload['category'];
  recipeId?: string;
  recipeTitle?: string;
  date: string;
  rawMaterial: string;
  rawAmountKg: number;
  ingredientsSummary: string;
  method: string;
  unitCount: number;
  packageSize: string;
  storageLocation: string;
  costEur: number;
  qualityControl: 'Bestanden' | 'Prüfung ausstehend' | 'Auffällig';
  hygieneChecked: boolean;
  safetyTemperatureNote: string;
  notes: string;
}

export interface InventoryItemPayload {
  category: RecipePayload['category'] | 'Frischvorrat';
  quantity: number;
  unit: string;
  producedDate: string;
  storedDate: string;
  location: 'Vorratsraum' | 'Keller' | 'Gefrierschrank' | 'Kühlschrank' | 'Regal' | 'Schrank' | 'Speisekammer' | 'Sonstiger Ort';
  origin: string;
  batchNumber?: string;
  qualityStatus: 'Einwandfrei' | 'Bald verbrauchen' | 'Prüfen';
  minQuantity: number;
  consumedTotal: number;
  notes: string;
}

export interface ResourcePayload {
  resourceType: 'Boden' | 'Kompost' | 'Wasser' | 'Dünger & Mulch';
  areaId?: string;
  areaName?: string;
  date: string;
  status: string;
  // Boden
  soilType?: string;
  phValue?: number;
  nutrientsNote?: string;
  humusPercent?: number;
  moistureNote?: string;
  // Kompost
  compostInputs?: string;
  fillDate?: string;
  lastTurnedDate?: string;
  temperatureC?: number;
  maturityStage?: 'Frisch' | 'Heißrotte' | 'Reifend' | 'Fertig';
  // Wasser
  capacityLiters?: number;
  currentLevelLiters?: number;
  roofAreaSqm?: number;
  dailyUsageLiters?: number;
  // Dünger & Mulch
  fertilizerOrigin?: string;
  amountKgOrL?: number;
  mulchMaterial?: string;
  linkedCircularSource?: string;
  notes: string;
}

export interface ProjectStep {
  id: string;
  label: string;
  done: boolean;
}

export interface ProjectPayload {
  category: string;
  description: string;
  status: 'Idee' | 'Geplant' | 'Vorbereitet' | 'In Arbeit' | 'Pausiert' | 'Abgeschlossen' | 'Zurückgestellt';
  priority: 'Niedrig' | 'Mittel' | 'Hoch';
  startDate: string;
  targetDate: string;
  assignee: AssigneeScope;
  budgetPlannedEur: number;
  budgetSpentEur: number;
  materials: string[];
  tools: string[];
  steps: ProjectStep[];
  finalReport: string;
}

export type CalendarCategory =
  | 'Allgemein'
  | 'Garten'
  | 'Aussaat'
  | 'Pflanzung'
  | 'Pflege'
  | 'Ernte'
  | 'Tierpflege'
  | 'Fütterung'
  | 'Reinigung'
  | 'Tierarzt'
  | 'Verarbeitung'
  | 'Vorratskontrolle'
  | 'Projekte'
  | 'Wartung'
  | 'Saison';

export interface CalendarEventPayload {
  eventType: 'event' | 'task';
  description: string;
  date: string; // YYYY-MM-DD
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  category: CalendarCategory;
  assignee: AssigneeScope;
  recurrence: 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  reminderMinutes: number;
  areaId?: string;
  areaName?: string;
  completed: boolean;
  notes: string;
}

export interface KnowledgePayload {
  domainType: 'Fachwissen' | 'Erfahrungswissen' | 'Natur & Biodiversität' | 'Pilze & Wildkräuter' | 'Vogelsichtung' | 'Pilzfund';
  category: string;
  content: string;
  source: string;
  isVerifiedSource: boolean;
  safetyWarning?: string;
  date: string;
  locationNote?: string;
  tags: string[];
  // Optional structured fields for Birdwatching, Wildkamera & Mushroom logs
  speciesId?: string;
  speciesName?: string;
  sightingTime?: string;
  observationSource?: 'Direktsichtung' | 'Futterhaus' | 'Wildkamera' | 'Ruf gehört' | 'Pilzfund';
  count?: number;
  observer?: AssigneeScope;
  habitatZone?: string;
  mushroomVerified?: boolean;
}

export interface EquipmentPayload {
  category: string;
  manufacturer: string;
  purchaseDate: string;
  purchasePriceEur: number;
  location: string;
  maintenanceIntervalDays: number;
  lastMaintenanceDate: string;
  repairsLog: string;
  spareParts: string;
  manualNotes: string;
}

export interface FinancePayload {
  entryType: 'Ausgabe' | 'Einnahme';
  category: string;
  linkedModule: string;
  amountEur: number;
  quantity?: number;
  unit?: string;
  selfSupplyNeedEur?: number;
  date: string;
  notes: string;
}

export interface ShoppingPayload {
  category: 'Saatgut' | 'Futter' | 'Baumaterial' | 'Verbrauchsmaterial' | 'Vorrat' | 'Werkzeug';
  quantity: number;
  unit: string;
  source: string;
  estimatedPriceEur: number;
  purchased: boolean;
  linkedProject?: string;
}

export interface GardenMapItem {
  id: string;
  kind: 'rect' | 'polygon' | 'label';
  label: string;
  color: string;
  linkedAreaId?: string;
  notes?: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  points?: Array<{ x: number; y: number }>;
}

export interface MealPlanDayEntry {
  meal: string;
  usesInventory?: string;
  notes?: string;
}

export interface DocumentPayload {
  docType: 'Rechnung' | 'Bauplan' | 'Bedienungsanleitung' | 'Tierunterlage' | 'Rezept' | 'Bodenanalyse' | 'Pflanzplan' | 'Grundstück' | 'Sonstiges';
  linkedModule: string;
  date: string;
  fileName: string;
  externalUrl: string;
  notes: string;
  mapItems?: GardenMapItem[];
  sharedDashboardLayout?: DashboardCardConfig[];
  mealPlan?: Record<string, MealPlanDayEntry>;
}

export interface EmergencyConfigPayload {
  vacationActive: boolean;
  substituteName: string;
  substitutePhone: string;
  startDate: string;
  endDate: string;
  feedingInstructions: string;
  waterInstructions: string;
  coopInstructions: string;
  gardenInstructions: string;
  vetName: string;
  vetPhone: string;
  vetEmergencyPhone: string;
  otherContacts: string;
  protocolPowerOutage: string;
  protocolWaterOutage: string;
  protocolStorm: string;
  protocolAnimalEmergency: string;
}

export interface AuditLogRecord {
  id: string;
  homesteadId: 'mellenbach-hof';
  actorUid: string;
  actorName: UserIdentity;
  action: 'create' | 'update' | 'archive' | 'restore' | 'ping' | 'seed';
  module: string;
  recordId: string;
  summary: string;
  createdAtMs: number;
}

export interface WeatherForecastDay {
  date: string;
  tempMax: number;
  tempMin: number;
  weatherCode: number;
  precipProbMax: number;
  precipSum: number;
  snowfallSum: number;
  windSpeedMax: number;
  uvIndexMax: number;
  sunrise: string;
  sunset: string;
}

export interface WeatherHourlyPoint {
  time: string;
  temp: number;
  precipProb: number;
  precip: number;
  snowfall: number;
  windSpeed: number;
  weatherCode: number;
}

export interface GardenWeatherAlert {
  id: string;
  level: 'warning' | 'caution' | 'info';
  title: string;
  recommendation: string;
  targetArea: string;
}

export interface WeatherData {
  locationName: string;
  latitude: number;
  longitude: number;
  fetchedAtMs: number;
  isStale: boolean;
  current: {
    temp: number;
    apparentTemp: number;
    humidity: number;
    precip: number;
    rain: number;
    snowfall: number;
    weatherCode: number;
    windSpeed: number;
    windDirection: number;
    windGusts: number;
    isDay: boolean;
  };
  today: {
    tempMax: number;
    tempMin: number;
    precipProbMax: number;
    snowProbMax: number;
    uvIndexMax: number;
    sunrise: string;
    sunset: string;
  };
  hourly: WeatherHourlyPoint[];
  daily: WeatherForecastDay[];
  gardenAlerts: GardenWeatherAlert[];
}
