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
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset,uv_index_max,precipitation_sum,snowfall_sum,precipitation_probability_max,wind_speed_10m_max` +
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
