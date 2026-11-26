import type {
  GardenWeatherAlert,
  WeatherData,
  WeatherForecastDay,
  WeatherHourlyPoint,
} from '../types/homestead';

// Karl-Marx-Str. 113, 98744 Schwarzatal (OT Mellenbach-Glasbach, Thüringer Schiefergebirge)
export const HOMESTEAD_LOCATION = {
  name: 'Mellenbach-Glasbach · 98744 Schwarzatal',
  address: 'Karl-Marx-Str. 113, 98744 Schwarzatal',
  latitude: 50.5986,
  longitude: 11.1167,
};

export const REGIONAL_SOIL_WATER_REFERENCE = {
  address: 'Karl-Marx-Str. 113, 98744 Schwarzatal (OT Mellenbach-Glasbach)',
  geology: 'Thüringer Schiefergebirge (Tonschiefer, Phyllite, Quarzite mit lokalen Diabas-Einschlüssen)',
  soilSummary: 'Skelettreicher, lehmig-steiniger Verwitterungsboden; regional tendenziell schwach sauer (Richtwert ca. pH 5,8–6,5) und kalkarm. Humusaufbau über Kompost und bedarfsgerechte Kalkung nach Beet-Test empfohlen.',
  waterSupplier: 'Zweckverband RENNSTEIGWASSER',
  waterHardness: 'Härtebereich weich (< 1,5 mmol/l CaCO₃ bzw. < 8,4 °dH) · sehr kalkarm',
  waterSummary: 'Weiches, kalkarmes Mittelgebirgswasser (ideal für Beeren, Kräuter & Gießwasser). Konkrete Beet- und Wasserwerte können pro Entnahmestelle mit eigenen Messungen überschrieben werden.',
};

const WEATHER_CACHE_KEY = 'hof_garten_weather_cache_v1';
const STALE_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 Stunden

export function describeWeatherCode(code: number): { label: string; kind: 'sun' | 'cloud' | 'rain' | 'snow' | 'storm' | 'fog' } {
  if (code === 0) return { label: 'Klarer Himmel', kind: 'sun' };
  if (code === 1) return { label: 'Überwiegend klar', kind: 'sun' };
  if (code === 2) return { label: 'Leicht bewölkt', kind: 'cloud' };
  if (code === 3) return { label: 'Bedeckt', kind: 'cloud' };
  if (code === 45 || code === 48) return { label: 'Nebel / Reifnebel', kind: 'fog' };
  if (code >= 51 && code <= 57) return { label: 'Nieselregen', kind: 'rain' };
  if (code >= 61 && code <= 67) return { label: 'Regen', kind: 'rain' };
  if (code >= 71 && code <= 77) return { label: 'Schneefall', kind: 'snow' };
  if (code >= 80 && code <= 82) return { label: 'Regenschauer', kind: 'rain' };
  if (code === 85 || code === 86) return { label: 'Schneeschauer', kind: 'snow' };
  if (code >= 95) return { label: 'Gewitter', kind: 'storm' };
  return { label: 'Wechselhaft', kind: 'cloud' };
}

export function windDirectionLabel(degrees: number): string {
  const dirs = ['N', 'NO', 'O', 'SO', 'S', 'SW', 'W', 'NW'];
  const idx = Math.round(((degrees % 360) / 45)) % 8;
  return dirs[idx];
}

export function buildGardenAlerts(data: Omit<WeatherData, 'gardenAlerts' | 'isStale'>): GardenWeatherAlert[] {
  const alerts: GardenWeatherAlert[] = [];
  const minNext2Days = Math.min(...data.daily.slice(0, 2).map((d) => d.tempMin));
  const maxNext2Days = Math.max(...data.daily.slice(0, 2).map((d) => d.tempMax));
  const rainNext24h = data.hourly.slice(0, 24).reduce((s, h) => s + h.precip, 0);
  const rainNext3Days = data.daily.slice(0, 3).reduce((s, d) => s + d.precipSum, 0);
  const maxGusts = Math.max(data.current.windGusts, ...data.daily.slice(0, 2).map((d) => d.windSpeedMax));
  const snowNext2Days = data.daily.slice(0, 2).reduce((s, d) => s + d.snowfallSum, 0);

  if (minNext2Days <= 2) {
    alerts.push({
      id: 'frost',
      level: minNext2Days <= 0 ? 'warning' : 'caution',
      title: minNext2Days <= 0 ? `Frostwarnung (${minNext2Days.toFixed(1)} °C)` : `Bodenfrost-Risiko (${minNext2Days.toFixed(1)} °C)`,
      recommendation: 'Empfindliche Kulturen (Tomaten, Paprika, Zucchini, Jungpflanzen) mit Vlies schützen, Gewächshaus schließen und frostgefährdete Wasserleitungen prüfen.',
      targetArea: 'Gemüsebeete & Gewächshaus',
    });
  }

  if (rainNext24h >= 20) {
    alerts.push({
      id: 'heavy_rain',
      level: 'warning',
      title: `Starkregen erwartet (${rainNext24h.toFixed(1)} mm / 24h)`,
      recommendation: 'Beete auf Staunässe prüfen, Regenrinnen & Zisternenüberläufe kontrollieren, Schneckenkontrolle einplanen.',
      targetArea: 'Beete & Regenwassersammlung',
    });
  } else if (rainNext3Days < 2 && maxNext2Days >= 20) {
    alerts.push({
      id: 'dry',
      level: 'caution',
      title: 'Trockenphase — wenig Niederschlag',
      recommendation: 'Bodenfeuchtigkeit in Hochbeeten und frisch gesäten Reihen prüfen; abends gezielt gießen und Mulchschicht ergänzen.',
      targetArea: 'Hochbeete & Neuaussaaten',
    });
  }

  if (maxNext2Days >= 28) {
    alerts.push({
      id: 'heat',
      level: 'warning',
      title: `Hitzebelastung (${maxNext2Days.toFixed(1)} °C)`,
      recommendation: 'Tiertränken bei Hühnern & Kaninchen mehrmals mit frischem Wasser auffüllen, Schattenplätze prüfen und Gewächshaus voll lüften.',
      targetArea: 'Tierbereiche & Gewächshaus',
    });
  }

  if (maxGusts >= 50) {
    alerts.push({
      id: 'storm',
      level: 'warning',
      title: `Sturmböen bis ${Math.round(maxGusts)} km/h`,
      recommendation: 'Gewächshausfenster und -tür sichern, Hühnerzaun, Folientunnel und Rankgerüste kontrollieren.',
      targetArea: 'Ställe, Zäune & Gewächshaus',
    });
  }

  if (snowNext2Days >= 1) {
    alerts.push({
      id: 'snow',
      level: 'caution',
      title: `Schneefall erwartet (${snowNext2Days.toFixed(1)} cm)`,
      recommendation: 'Zugänge zu Ställen räumen, Gewächshausdach und Volierennetz auf Schneelast kontrollieren, Tränken frostfrei halten.',
      targetArea: 'Dächer, Wege & Tiergehege',
    });
  }

  if (alerts.length === 0) {
    alerts.push({
      id: 'nominal',
      level: 'info',
      title: 'Ruhiges Gartenwetter',
      recommendation: 'Günstige Bedingungen für reguläre Beetpflege, Aussaat, Kompostumsetzen und Tierversorgung.',
      targetArea: 'Gesamter Hof',
    });
  }

  return alerts;
}

export interface MonthlyClimateNormal {
  monthIndex: number; // 0-11
  month: string;
  monthShort: string;
  tempMinC: number;
  tempMaxC: number;
  tempMeanC: number;
  sunshineHoursMonth: number;
  sunshineHoursDay: number;
  precipMm: number;
  rainDays: number;
  frostDays: number;
  windMeanKmh: number;
  prevailingWind: string;
  soilTempEstimateC: number;
  plantingPhase:
    | 'Winterruhe'
    | 'Vorzucht drinnen'
    | 'Frühe Direktsaat'
    | 'Hauptsaison (nach Eisheiligen)'
    | 'Nachkultur & Ernte'
    | 'Herbstpflanzung';
  gardenSummary: string;
}

/**
 * Langjährige DWD-Referenzrichtwerte für das Thüringer Schiefergebirge / Schwarzatal
 * (Höhenlage ca. 480–520 m ü. NN, Orientierung Stationen Neuhaus/Katzhütte/Rudolstadt-Höhenstufen).
 */
export const MELLENBACH_CLIMATE_NORMALS: MonthlyClimateNormal[] = [
  {
    monthIndex: 0,
    month: 'Januar',
    monthShort: 'Jan',
    tempMinC: -4.2,
    tempMaxC: 1.2,
    tempMeanC: -1.5,
    sunshineHoursMonth: 46,
    sunshineHoursDay: 1.5,
    precipMm: 78,
    rainDays: 14,
    frostDays: 24,
    windMeanKmh: 16,
    prevailingWind: 'SW / W',
    soilTempEstimateC: 1,
    plantingPhase: 'Winterruhe',
    gardenSummary: 'Dauerfrost & Schneelage typisch. Saatgut prüfen, Obstbäume nur bei > -5 °C schneiden, Winterlauch & Grünkohl ernten.',
  },
  {
    monthIndex: 1,
    month: 'Februar',
    monthShort: 'Feb',
    tempMinC: -3.8,
    tempMaxC: 2.6,
    tempMeanC: -0.6,
    sunshineHoursMonth: 68,
    sunshineHoursDay: 2.4,
    precipMm: 64,
    rainDays: 12,
    frostDays: 21,
    windMeanKmh: 16,
    prevailingWind: 'SW / W',
    soilTempEstimateC: 2,
    plantingPhase: 'Vorzucht drinnen',
    gardenSummary: 'Erste hellere Tage. Chili, Paprika und Porree auf der warmen Fensterbank vorziehen; Gehölzschnitt vor Saftfluss abschließen.',
  },
  {
    monthIndex: 2,
    month: 'März',
    monthShort: 'Mär',
    tempMinC: -0.8,
    tempMaxC: 7.2,
    tempMeanC: 3.2,
    sunshineHoursMonth: 112,
    sunshineHoursDay: 3.6,
    precipMm: 72,
    rainDays: 13,
    frostDays: 15,
    windMeanKmh: 15,
    prevailingWind: 'W / SW',
    soilTempEstimateC: 5,
    plantingPhase: 'Frühe Direktsaat',
    gardenSummary: 'Ab Mitte März im Gewächshaus & an der geschützten Südwand: Spinat, Radieschen, Erbsen, Steckzwiebeln & Beerensträucher pflanzen.',
  },
  {
    monthIndex: 3,
    month: 'April',
    monthShort: 'Apr',
    tempMinC: 2.5,
    tempMaxC: 12.6,
    tempMeanC: 7.5,
    sunshineHoursMonth: 156,
    sunshineHoursDay: 5.2,
    precipMm: 62,
    rainDays: 11,
    frostDays: 8,
    windMeanKmh: 14,
    prevailingWind: 'W / SW',
    soilTempEstimateC: 9,
    plantingPhase: 'Frühe Direktsaat',
    gardenSummary: 'Boden erwärmt sich (~8–10 °C): Möhren, Pastinaken, Mangold, frühe Kartoffeln & Salate säen; Vlies gegen Nachtfrost griffbereit halten.',
  },
  {
    monthIndex: 4,
    month: 'Mai',
    monthShort: 'Mai',
    tempMinC: 6.8,
    tempMaxC: 17.6,
    tempMeanC: 12.2,
    sunshineHoursMonth: 196,
    sunshineHoursDay: 6.3,
    precipMm: 76,
    rainDays: 12,
    frostDays: 2,
    windMeanKmh: 12,
    prevailingWind: 'SW / NW',
    soilTempEstimateC: 13,
    plantingPhase: 'Hauptsaison (nach Eisheiligen)',
    gardenSummary: 'Eisheilige (~18.–20. Mai) abwarten! Danach Tomaten, Zucchini, Kürbis, Gurken & Bohnen an die Sonnenseite und in den Süd-Garten setzen.',
  },
  {
    monthIndex: 5,
    month: 'Juni',
    monthShort: 'Jun',
    tempMinC: 10.1,
    tempMaxC: 20.8,
    tempMeanC: 15.4,
    sunshineHoursMonth: 204,
    sunshineHoursDay: 6.8,
    precipMm: 86,
    rainDays: 13,
    frostDays: 0,
    windMeanKmh: 11,
    prevailingWind: 'W / SW',
    soilTempEstimateC: 17,
    plantingPhase: 'Hauptsaison (nach Eisheiligen)',
    gardenSummary: 'Maximale Tageslänge & Sonnenstunden (~204 h). Hauptwachstum, Erdbeeren & frühe Johannisbeeren, konsequent mulchen & gießen.',
  },
  {
    monthIndex: 6,
    month: 'Juli',
    monthShort: 'Jul',
    tempMinC: 11.9,
    tempMaxC: 22.8,
    tempMeanC: 17.3,
    sunshineHoursMonth: 212,
    sunshineHoursDay: 6.8,
    precipMm: 94,
    rainDays: 13,
    frostDays: 0,
    windMeanKmh: 11,
    prevailingWind: 'W / SW',
    soilTempEstimateC: 19,
    plantingPhase: 'Nachkultur & Ernte',
    gardenSummary: 'Wärmster & sonnenreichster Monat, aber oft Gewitterregen. Beeren, Bohnen & Frühgemüse ernten; Zweitsaaten (Buschbohne, Chinakohl) starten.',
  },
  {
    monthIndex: 7,
    month: 'August',
    monthShort: 'Aug',
    tempMinC: 11.4,
    tempMaxC: 22.3,
    tempMeanC: 16.8,
    sunshineHoursMonth: 198,
    sunshineHoursDay: 6.4,
    precipMm: 84,
    rainDays: 12,
    frostDays: 0,
    windMeanKmh: 11,
    prevailingWind: 'SW / W',
    soilTempEstimateC: 18,
    plantingPhase: 'Nachkultur & Ernte',
    gardenSummary: 'Haupternte & Einkochen! Zwiebeln trocken einholen, Walnuss-Sommerschnitt (nur im August!), Feldsalat, Winterspinat & Gründüngung säen.',
  },
  {
    monthIndex: 8,
    month: 'September',
    monthShort: 'Sep',
    tempMinC: 8.1,
    tempMaxC: 17.6,
    tempMeanC: 12.8,
    sunshineHoursMonth: 146,
    sunshineHoursDay: 4.9,
    precipMm: 74,
    rainDays: 11,
    frostDays: 0,
    windMeanKmh: 12,
    prevailingWind: 'SW / W',
    soilTempEstimateC: 14,
    plantingPhase: 'Nachkultur & Ernte',
    gardenSummary: 'Erste kühle Nächte im Tal. Äpfel, Birnen, Holunder, Aronia, Kürbisse & Nüsse ernten; Feldsalat für Winterernte aussäen.',
  },
  {
    monthIndex: 9,
    month: 'Oktober',
    monthShort: 'Okt',
    tempMinC: 4.2,
    tempMaxC: 12.1,
    tempMeanC: 8.1,
    sunshineHoursMonth: 102,
    sunshineHoursDay: 3.3,
    precipMm: 72,
    rainDays: 12,
    frostDays: 5,
    windMeanKmh: 14,
    prevailingWind: 'SW / W',
    soilTempEstimateC: 9,
    plantingPhase: 'Herbstpflanzung',
    gardenSummary: 'Goldene Pflanzzeit für wurzelnackte Obstbäume, Beerensträucher & Knoblauch! Lagergemüse (Möhren, Rote Bete) vor Frost einmieten.',
  },
  {
    monthIndex: 10,
    month: 'November',
    monthShort: 'Nov',
    tempMinC: 0.4,
    tempMaxC: 5.8,
    tempMeanC: 3.1,
    sunshineHoursMonth: 48,
    sunshineHoursDay: 1.6,
    precipMm: 78,
    rainDays: 14,
    frostDays: 14,
    windMeanKmh: 15,
    prevailingWind: 'SW / W',
    soilTempEstimateC: 4,
    plantingPhase: 'Herbstpflanzung',
    gardenSummary: 'Gehölze bis Bodenfrost noch pflanzbar. Beete mit Laub/Kompost abdecken, Leitungen abstellen, Grünkohl & Pastinaken frostsüß genießen.',
  },
  {
    monthIndex: 11,
    month: 'Dezember',
    monthShort: 'Dez',
    tempMinC: -2.8,
    tempMaxC: 2.0,
    tempMeanC: -0.4,
    sunshineHoursMonth: 36,
    sunshineHoursDay: 1.2,
    precipMm: 86,
    rainDays: 15,
    frostDays: 22,
    windMeanKmh: 16,
    prevailingWind: 'SW / W',
    soilTempEstimateC: 2,
    plantingPhase: 'Winterruhe',
    gardenSummary: 'Wenig Licht (~1,2 h Sonne/Tag). Lagerkeller & Vorräte prüfen, Wintergemüse bei offenem Boden bedarfsweise vom Beet holen.',
  },
];

export interface GardenMicroclimateZone {
  id: 'suedwand' | 'suedgarten' | 'oberer_hang' | 'nordseite';
  name: string;
  aspect: string;
  sunProfile: string;
  summerSunHours: string;
  springSunHours: string;
  windExposure: string;
  frostBehavior: string;
  idealFor: string[];
  avoidHere: string[];
  tip: string;
}

export const GARDEN_MICROCLIMATE_ZONES: GardenMicroclimateZone[] = [
  {
    id: 'suedwand',
    name: 'Sonnenseite am Wohnhaus & Terrasse',
    aspect: 'Süd / Südwest direkt vor der Hauswand',
    sunProfile: 'Sehr sonnig & wärmespeichernd (Mauerwerk strahlt nachts Wärme ab)',
    summerSunHours: '9–11 Std./Tag',
    springSunHours: '6–7,5 Std./Tag',
    windExposure: 'Stark windgeschützt gegen Ost- & Nordwind',
    frostBehavior: '1–2 Wochen früher frostfrei als der freie Hang — beste Wärmenische am Hof!',
    idealFor: [
      'Tomaten (Freiland unter Dachüberstand), Paprika, Chili',
      'Mediterrane Kräuter (Rosmarin, Thymian, Salbei, Oregano)',
      'Weintrauben, Spalierobst, Frühsalat & vorgezogene Hochbeete',
    ],
    avoidHere: ['Schattenliebende Pilzstämme, Bärlauch oder reine Moorbeet-Waldpflanzen'],
    tip: 'Ideal, um Tomaten & Paprika 1 Woche früher ins Freie zu wagen oder empfindliche Kübelkräuter geschützt zu überwintern.',
  },
  {
    id: 'suedgarten',
    name: 'Unterer Garten (Süd-Wiese an der Straße)',
    aspect: 'Süd / Südost — direkt südlich vom Wohnhaus',
    sunProfile: 'Vollsonnig von Vormittag bis Spätnachmittag, kaum Gebäudeschatten',
    summerSunHours: '10–12 Std./Tag',
    springSunHours: '6–8 Std./Tag',
    windExposure: 'Mäßig windgeschützt durch Haus im Norden & Hanglage',
    frostBehavior: 'Erwärmt sich im Frühjahr schnell; bei klaren Nächten im Tal leichter Bodenfrost möglich.',
    idealFor: [
      'Sonnenhungrige Fruchtgemüse (Kürbis, Zucchini, Bohnen, Gurken)',
      'Fruchtsträucher in voller Sonne (Aronia, Felsenbirne, Stachelbeeren)',
      'Erdbeeren, Knoblauch, Zwiebeln & sonniger Hühnerauslauf mit Schattenbaum',
    ],
    avoidHere: ['Unbeschattete Kaninchengehege im Hochsommer (> 28 °C Hitzestau vermeiden!)'],
    tip: 'Top-Fläche für Hochbeete & Wärme-Kulturen. Für Tiere im Sommer zwingend Sträucher oder Sonnensegel als Schattenspender einplanen.',
  },
  {
    id: 'oberer_hang',
    name: 'Oberer Garten (langer West-/Nordwest-Bereich)',
    aspect: 'West / Nordwest — oberhalb von Hof & Terrasse',
    sunProfile: 'Morgens etwas später besonnt, dafür lange intensive Nachmittags- & Abendsonne',
    summerSunHours: '8–10 Std./Tag',
    springSunHours: '5–6,5 Std./Tag',
    windExposure: 'Offener gegenüber West-/Südwestwind (Hauptwindrichtung im Schwarzatal!)',
    frostBehavior: 'Kaltluft fließt bergab ab (weniger Staunässe-Frost als ganz unten im Talgrund), aber windkühler im April/Mai.',
    idealFor: [
      'Robuste Obstbäume (Apfel, Birne, Zwetschge) & Haselnuss-/Beerenhecke am Rand als Windschutz',
      'Kartoffeln, Kohl (Grünkohl, Kohlrabi, Weißkohl), Möhren, Pastinaken, Rote Bete',
      'Erbsen, Dicke Bohnen, Gründüngung & Streuobstwiese',
    ],
    avoidHere: ['Sehr wärmebedürftige Paprika/Auberginen ohne Gewächshaus oder Windschutz'],
    tip: 'Eine lockere Beeren- oder Haselnusshecke an der West-/Südwestkante bremst kalte Talwinde deutlich ab und schafft dahinter ruhiges Beet-Klima!',
  },
  {
    id: 'nordseite',
    name: 'Schattenseite & Halbschatten (Nordseite Wohnhaus / Gehölzsaum)',
    aspect: 'Nord / Nordost hinter dem Wohnhaus & unter Kronentraufen',
    sunProfile: 'Morgens/abends Streiflicht oder heller Schatten, mittags kühl durch Hauswand',
    summerSunHours: '2–4 Std./Tag',
    springSunHours: '1–2 Std./Tag',
    windExposure: 'Kühler bei Nordostlagen',
    frostBehavior: 'Boden taut im Frühjahr später auf; dafür im Sommer kaum Trockenstress.',
    idealFor: [
      'Speisepilze (Austernseitling, Shiitake auf Laubholz, Braunkappen-Beet)',
      'Schattenverträgliche Beeren & Pflanzen (Rote/Schwarze Johannisbeere, Holunder, Rhabarber, Bärlauch)',
      'Sommersalat & Spinat im Juli/August (schießen dort weniger schnell!) + Kompostplatz',
    ],
    avoidHere: ['Tomaten, Kürbis, Zwiebeln oder Weintrauben (Pilzdruck & zu wenig Zuckerbildung)'],
    tip: 'Kein verlorener Platz: Im Hochsommer wächst hier der knackigste Pflücksalat und Pilzkulturen bleiben zuverlässig feucht.',
  },
];

export interface PlantingForecastGuide {
  id: string;
  title: string;
  category: 'Frühjahrsgemüse' | 'Wärmegemüse' | 'Beeren & Sträucher' | 'Obst & Nüsse' | 'Herbst & Winter';
  months: number[]; // 0-11 optimal planting/sowing window
  minSoilTempC: number;
  frostSensitive: boolean;
  preferredZoneIds: GardenMicroclimateZone['id'][];
  sunDemand: string;
  whyThisTiming: string;
  placementAdvice: string;
  crops: string[];
}

export const PLANTING_FORECAST_GUIDES: PlantingForecastGuide[] = [
  {
    id: 'early_spring_roots',
    title: 'Kältefeste Frühjahrs-Direktsaat',
    category: 'Frühjahrsgemüse',
    months: [2, 3, 4], // März - Mai
    minSoilTempC: 4,
    frostSensitive: false,
    preferredZoneIds: ['suedgarten', 'oberer_hang', 'suedwand'],
    sunDemand: 'Sonnig bis halbschattig (ab ~4 h Sonne/Tag)',
    whyThisTiming: 'Keimt bereits bei 4–8 °C Bodentemperatur und nutzt die gute Winterfeuchte der Schwarzatal-Böden optimal aus.',
    placementAdvice: 'Bereits ab Mitte März in Hochbeeten am Haus (wärmer!) und ab April im Unteren/Oberen Garten direkt säen.',
    crops: ['Spinat', 'Radieschen', 'Erbsen', 'Dicke Bohnen', 'Steckzwiebeln', 'Möhren', 'Pastinaken', 'Mangold'],
  },
  {
    id: 'spring_berries_shrubs',
    title: 'Beeren- & Nutzsträucher pflanzen',
    category: 'Beeren & Sträucher',
    months: [2, 3, 9, 10], // März-April & Okt-Nov
    minSoilTempC: 4,
    frostSensitive: false,
    preferredZoneIds: ['oberer_hang', 'suedgarten', 'nordseite'],
    sunDemand: 'Sonnig (Felsenbirne, Aronia, Stachelbeere) bis Halbschatten (Johannisbeere, Holunder)',
    whyThisTiming: 'Im März/April vor dem Blattaustrieb (oder im Oktober vor Frost) bilden die Wurzeln im feuchten Schieferboden schnell Feinwurzeln ohne Sommerhitze.',
    placementAdvice: 'Felsenbirne & Aronia sonnig in den Süd- oder Oberen Garten (Windschutz-Hecke!); Holunder & Rote Johannisbeere gedeihen auch super im Halbschatten nahe Haus/Nordrand.',
    crops: ['Schwarzer Holunder', 'Kupfer-Felsenbirne', 'Aronia Nero', 'Rote Johannisbeere', 'Jostabeere', 'Himbeeren', 'Rhabarber'],
  },
  {
    id: 'warm_fruiting_crops',
    title: 'Wärmeliebendes Fruchtgemüse (nach Eisheiligen)',
    category: 'Wärmegemüse',
    months: [4, 5], // Mai - Juni (drinnen Vorzucht Feb-Apr)
    minSoilTempC: 12,
    frostSensitive: true,
    preferredZoneIds: ['suedwand', 'suedgarten'],
    sunDemand: 'Vollsonnig (> 6–8 h direkte Sonne/Tag)',
    whyThisTiming: 'In Mellenbach (~500 m NN) drohen bis ca. 18.–20. Mai Spätfröste. Vorher im Haus/Gewächshaus vorziehen, danach nutzt jede Sonnenstunde von Mai–August.',
    placementAdvice: 'Tomaten, Paprika & Buschbohnen direkt an die wärmespeichernde Sonnenseite am Wohnhaus oder in den geschützten Unteren Süd-Garten.',
    crops: ['Tomaten (Harzfeuer)', 'Zucchini', 'Hokkaido-Kürbis', 'Gurken', 'Buschbohnen', 'Paprika'],
  },
  {
    id: 'brassicas_and_potatoes',
    title: 'Robuste Hauptkulturen & Kartoffeln',
    category: 'Frühjahrsgemüse',
    months: [3, 4, 5], // April - Juni
    minSoilTempC: 7,
    frostSensitive: false,
    preferredZoneIds: ['oberer_hang', 'suedgarten'],
    sunDemand: 'Sonnig bis licht-halbschattig',
    whyThisTiming: 'Kartoffeln legen ab ca. 7–8 °C Bodentemperatur (Mitte/Ende April); Kohl schätzt das kühler-feuchte Mittelgebirgsklima und wächst im Oberen Garten ohne Hitzestress.',
    placementAdvice: 'Große Flächen im Oberen Garten nutzen; dort hält der lehmige Verwitterungsboden Feuchte gut, und Westwind trocknet Laub nach Regen schnell ab.',
    crops: ['Kartoffeln', 'Kohlrabi Superschmelz', 'Weißkohl', 'Grünkohl', 'Brokkoli', 'Porree', 'Rote Bete'],
  },
  {
    id: 'fruit_and_nut_trees',
    title: 'Obstbäume & Nüsse pflanzen',
    category: 'Obst & Nüsse',
    months: [2, 3, 9, 10], // März-April & Okt-Nov
    minSoilTempC: 5,
    frostSensitive: false,
    preferredZoneIds: ['oberer_hang', 'suedgarten'],
    sunDemand: 'Vollsonnig mit Luftbewegung (trocknet Pilzsporen ab)',
    whyThisTiming: 'Herbstpflanzung (Oktober) oder zeitiges Frühjahr (März–April) sichert gute Bodenverbindung. Für Maronen/Walnuss (Broadview) ist Frühjahrspflanzung in rauen Lagen oft sicherer.',
    placementAdvice: 'Apfel, Birne, Zwetschge & Haselnuss auf den freien Oberen Hang (gute Kaltluft-Ableitung nach unten!). Walnuss/Marone an geschützte sonnige Stellen.',
    crops: ['Äpfel (Topaz, Boskoop)', 'Zwetschge', 'Walnuss Broadview', 'Haselnuss', 'Esskastanie Marigoule'],
  },
  {
    id: 'summer_autumn_succession',
    title: 'Nachkultur, Herbstsalate & Knoblauch',
    category: 'Herbst & Winter',
    months: [6, 7, 8, 9], // Juli - Oktober
    minSoilTempC: 8,
    frostSensitive: false,
    preferredZoneIds: ['suedgarten', 'nordseite', 'suedwand'],
    sunDemand: 'Halbschatten im Juli/August, volle Herbstsonne ab September',
    whyThisTiming: 'Nach der Ernte von Frühkartoffeln, Zwiebeln oder Erbsen bleiben Beete nicht brach: Winterharte Kulturen nutzen den milden Spätsommer und versorgen euch bis März.',
    placementAdvice: 'Sommersalat im Juli auf die kühle Nordseite/Halbschatten säen; Feldsalat, Winterspinat und Knoblauch (Oktober) auf die sonnigen Beete für schnelle Frühjahrserwärmung.',
    crops: ['Feldsalat', 'Winterspinat', 'Knoblauch', 'Gründüngung (Phacelia)', 'Chinakohl'],
  },
];

export interface LivePlantingForecast {
  currentMonth: MonthlyClimateNormal;
  next7DaysAvgMin: number;
  next7DaysAvgMax: number;
  next7DaysRainMm: number;
  next7DaysSunHours: number;
  next7DaysMaxWind: number;
  frostRiskNext7Days: boolean;
  headline: string;
  summary: string;
  actionableTips: string[];
}

export function buildLivePlantingForecast(weather: WeatherData | null, monthIndex: number = new Date().getMonth()): LivePlantingForecast {
  const currentMonth = MELLENBACH_CLIMATE_NORMALS[monthIndex] || MELLENBACH_CLIMATE_NORMALS[0];
  const daily = weather?.daily || [];

  const next7DaysAvgMin = daily.length
    ? daily.reduce((s, d) => s + d.tempMin, 0) / daily.length
    : currentMonth.tempMinC;
  const next7DaysAvgMax = daily.length
    ? daily.reduce((s, d) => s + d.tempMax, 0) / daily.length
    : currentMonth.tempMaxC;
  const next7DaysRainMm = daily.length
    ? daily.reduce((s, d) => s + d.precipSum, 0)
    : Math.round(currentMonth.precipMm / 4);
  const next7DaysSunHours = daily.length
    ? daily.reduce((s, d) => s + (d.sunshineHours ?? currentMonth.sunshineHoursDay), 0)
    : Math.round(currentMonth.sunshineHoursDay * 7);
  const next7DaysMaxWind = daily.length
    ? Math.max(...daily.map((d) => d.windSpeedMax))
    : currentMonth.windMeanKmh * 2;
  const frostRiskNext7Days = daily.some((d) => d.tempMin <= 1.5) || currentMonth.frostDays >= 6;

  const tips: string[] = [];
  let headline = `${currentMonth.month}: ${currentMonth.plantingPhase}`;

  if (frostRiskNext7Days && next7DaysAvgMax < 10) {
    headline = 'Kühle Witterung / Frostgefahr — robuste Starts & Vorzucht drinnen';
    tips.push('Empfindliche Kulturen (Tomaten, Paprika, Zucchini, Bohnen) noch drinnen bzw. im geschützten Gewächshaus halten.');
  } else if (frostRiskNext7Days && next7DaysAvgMax >= 11) {
    headline = 'Tagsüber mild, nachts noch kühl — Südwand & Vlies nutzen';
    tips.push('Robuste Arten (Erbsen, Spinat, Radieschen, Möhren, Beerensträucher) können raus; über frische Aussaaten abends Vlies legen.');
  } else if (!frostRiskNext7Days && next7DaysAvgMin >= 7) {
    headline = 'Frostfreies Wachswetter — optimale Bedingungen auf den Sonnenflächen';
    tips.push('Wärmeliebende Kulturen fühlen sich an der Südwand & im Unteren Garten wohl.');
  } else {
    tips.push(currentMonth.gardenSummary);
  }

  if (next7DaysRainMm < 5 && next7DaysAvgMax >= 16) {
    tips.push(`Wenig Regen in den nächsten 7 Tagen (${next7DaysRainMm.toFixed(1)} mm) — Neupflanzungen & Sträucher gut einschlämmen und mulchen.`);
  } else if (next7DaysRainMm >= 25) {
    tips.push(`Kräftiger Niederschlag erwartet (${next7DaysRainMm.toFixed(1)} mm / 7 Tage) — schwere Lehmbeete nicht bei Nässe betreten, Pflanzlöcher mit Drainage/Kompost lockern.`);
  } else {
    tips.push(`Ausgeglichene Regen-Aussicht (~${next7DaysRainMm.toFixed(1)} mm in 7 Tagen) — ideal zum Anwachsen neuer Sträucher & Beete.`);
  }

  if (next7DaysMaxWind >= 40) {
    tips.push(`Kräftige Böen bis ${Math.round(next7DaysMaxWind)} km/h (oft SW/W): Junge Obstbäume/Sträucher sicher anpfählen und Vlies gut beschweren.`);
  } else {
    tips.push(`Vorherrschender Talwind (${currentMonth.prevailingWind}, ~${currentMonth.windMeanKmh} km/h): Windgeschützte Südwand am Haus ideal für empfindliches Grün.`);
  }

  return {
    currentMonth,
    next7DaysAvgMin,
    next7DaysAvgMax,
    next7DaysRainMm,
    next7DaysSunHours,
    next7DaysMaxWind,
    frostRiskNext7Days,
    headline,
    summary: `Typischer Boden in Mellenbach (~500 m): ca. ${currentMonth.soilTempEstimateC} °C Bodentemp · Ø ${currentMonth.sunshineHoursDay} h Sonne/Tag · Ø ${currentMonth.precipMm} mm/Monat.`,
    actionableTips: tips,
  };
}

export function getCachedWeather(): WeatherData | null {
  try {
    const raw = localStorage.getItem(WEATHER_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as WeatherData;
    const isStale = Date.now() - parsed.fetchedAtMs > STALE_THRESHOLD_MS;
    return { ...parsed, isStale };
  } catch {
    return null;
  }
}

export async function fetchMellenbachWeather(): Promise<WeatherData> {
  const url =
    `https://api.open-meteo.com/v1/forecast` +
    `?latitude=${HOMESTEAD_LOCATION.latitude}` +
    `&longitude=${HOMESTEAD_LOCATION.longitude}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,snowfall,weather_code,wind_speed_10m,wind_direction_10m,wind_gusts_10m` +
    `&hourly=temperature_2m,precipitation_probability,precipitation,snowfall,weather_code,wind_speed_10m` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,sunshine_duration,uv_index_max,precipitation_sum,snowfall_sum,precipitation_probability_max,wind_speed_10m_max` +
    `&timezone=Europe%2FBerlin&forecast_days=7`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Wetterdienst nicht erreichbar (${response.status})`);
  }
  const raw = await response.json();

  const hourly: WeatherHourlyPoint[] = (raw.hourly?.time || []).slice(0, 24).map((t: string, i: number) => ({
    time: t,
    temp: Number(raw.hourly.temperature_2m[i] ?? 0),
    precipProb: Number(raw.hourly.precipitation_probability[i] ?? 0),
    precip: Number(raw.hourly.precipitation[i] ?? 0),
    snowfall: Number(raw.hourly.snowfall[i] ?? 0),
    windSpeed: Number(raw.hourly.wind_speed_10m[i] ?? 0),
    weatherCode: Number(raw.hourly.weather_code[i] ?? 0),
  }));

  const daily: WeatherForecastDay[] = (raw.daily?.time || []).map((d: string, i: number) => ({
    date: d,
    tempMax: Number(raw.daily.temperature_2m_max[i] ?? 0),
    tempMin: Number(raw.daily.temperature_2m_min[i] ?? 0),
    weatherCode: Number(raw.daily.weather_code[i] ?? 0),
    precipProbMax: Number(raw.daily.precipitation_probability_max[i] ?? 0),
    precipSum: Number(raw.daily.precipitation_sum[i] ?? 0),
    snowfallSum: Number(raw.daily.snowfall_sum[i] ?? 0),
    windSpeedMax: Number(raw.daily.wind_speed_10m_max[i] ?? 0),
    uvIndexMax: Number(raw.daily.uv_index_max[i] ?? 0),
    sunshineHours: Math.round((Number(raw.daily.sunshine_duration?.[i] ?? 0) / 3600) * 10) / 10,
    sunrise: String(raw.daily.sunrise[i] ?? ''),
    sunset: String(raw.daily.sunset[i] ?? ''),
  }));

  const firstDay = daily[0];
  const snowHours = hourly.filter((h) => h.snowfall > 0);
  const snowProbMax = snowHours.length > 0 ? Math.max(...snowHours.map((h) => h.precipProb)) : 0;

  const baseData: Omit<WeatherData, 'gardenAlerts' | 'isStale'> = {
    locationName: HOMESTEAD_LOCATION.name,
    latitude: HOMESTEAD_LOCATION.latitude,
    longitude: HOMESTEAD_LOCATION.longitude,
    fetchedAtMs: Date.now(),
    current: {
      temp: Number(raw.current?.temperature_2m ?? 0),
      apparentTemp: Number(raw.current?.apparent_temperature ?? 0),
      humidity: Number(raw.current?.relative_humidity_2m ?? 0),
      precip: Number(raw.current?.precipitation ?? 0),
      rain: Number(raw.current?.rain ?? 0),
      snowfall: Number(raw.current?.snowfall ?? 0),
      weatherCode: Number(raw.current?.weather_code ?? 0),
      windSpeed: Number(raw.current?.wind_speed_10m ?? 0),
      windDirection: Number(raw.current?.wind_direction_10m ?? 0),
      windGusts: Number(raw.current?.wind_gusts_10m ?? 0),
      isDay: Boolean(raw.current?.is_day ?? 1),
    },
    today: {
      tempMax: firstDay?.tempMax ?? 0,
      tempMin: firstDay?.tempMin ?? 0,
      precipProbMax: firstDay?.precipProbMax ?? 0,
      snowProbMax,
      uvIndexMax: firstDay?.uvIndexMax ?? 0,
      sunshineHours: firstDay?.sunshineHours ?? 0,
      sunrise: firstDay?.sunrise ?? '',
      sunset: firstDay?.sunset ?? '',
    },
    hourly,
    daily,
  };

  const fullData: WeatherData = {
    ...baseData,
    isStale: false,
    gardenAlerts: buildGardenAlerts(baseData),
  };

  try {
    localStorage.setItem(WEATHER_CACHE_KEY, JSON.stringify(fullData));
  } catch {
    // Ignore storage quota errors
  }

  return fullData;
}
