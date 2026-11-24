export type BirdGroup = 'Singvögel' | 'Spechte & Waldvögel' | 'Greif- & Nachtvögel';

export type BirdCallPattern =
  | 'rotkehlchen'
  | 'amsel'
  | 'kohlmeise'
  | 'blaumeise'
  | 'buntspecht'
  | 'gruenspecht'
  | 'eichelhaeher'
  | 'kleiber'
  | 'buchfink'
  | 'gimpel'
  | 'stieglitz'
  | 'zaunkoenig'
  | 'rauchschwalbe'
  | 'star'
  | 'maeusebussard'
  | 'waldkauz';

export interface BirdSpecies {
  id: string;
  name: string;
  latinName: string;
  group: BirdGroup;
  sizeCm: string;
  diet: string[];
  feederTip: string;
  callText: string;
  callNotes: string;
  callPattern: BirdCallPattern;
  activeMonths: number[]; // 1..12
  seasonSummary: string;
  habitat: string;
  wildcamLikelihood: 'Sehr häufig' | 'Häufig' | 'Gelegentlich' | 'Nachts / Dämmerung';
  wildcamTips: string;
  keyFeatures: string[];
}

export interface WildcamMammalHint {
  id: string;
  name: string;
  latinName: string;
  sizeCm: string;
  activity: string;
  irClues: string;
  diet: string;
  note: string;
}

export interface MushroomFalseFriend {
  name: string;
  latinName: string;
  danger: 'Tödlich giftig' | 'Stark giftig' | 'Giftig' | 'Ungenießbar';
  keyDifference: string;
}

export type MushroomEdibility =
  | 'Sehr guter Speisepilz'
  | 'Guter Speisepilz (Roh giftig)'
  | 'Ungenießbar'
  | 'Giftig'
  | 'Tödlich giftig';

export interface MushroomSpecies {
  id: string;
  name: string;
  latinName: string;
  category: 'Röhrling' | 'Leistling' | 'Lamellenpilz';
  edibility: MushroomEdibility;
  isToxic: boolean;
  seasonMonths: number[];
  seasonLabel: string;
  whereToFind: string;
  capFeatures: string;
  undersideType: string;
  stemAndFlesh: string;
  smell: string;
  falseFriends: MushroomFalseFriend[];
  safetyHint: string;
}

export const MONTH_SHORT_DE = [
  'Jan',
  'Feb',
  'Mär',
  'Apr',
  'Mai',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Okt',
  'Nov',
  'Dez',
];

export const BIRD_SPECIES: BirdSpecies[] = [
  {
    id: 'rotkehlchen',
    name: 'Rotkehlchen',
    latinName: 'Erithacus rubecula',
    group: 'Singvögel',
    sizeCm: '14 cm',
    diet: ['Kleine Insekten & Käfer', 'Spinnen & Regenwürmer', 'Holunder- & Weißdornbeeren', 'Haferflocken & Mehlwürmer'],
    feederTip: 'Frisst bevorzugt am Boden unter dem Futterhaus oder an bodennahen Schalen.',
    callText: '„Tick-tick-tick“ (Warnruf), perlend-melancholischer Gesang',
    callNotes: 'Beginnt oft als erster vor Sonnenaufgang und singt bis in die späte Dämmerung — auch im Winter.',
    callPattern: 'rotkehlchen',
    activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    seasonSummary: 'Ganzjährig in Mellenbach (im Winter oft Zuzug aus Nordosteuropa)',
    habitat: 'Hecken, Kompostplatz, Gebüsche am Waldrand und Obstgarten',
    wildcamLikelihood: 'Sehr häufig',
    wildcamTips: 'Typisch rundliche, plusterige Silhouette beim Hüpfen am Boden; dunkle Knopfaugen und leuchtende Stirn-/Brustpartie bei Tagesaufnahmen.',
    keyFeatures: [
      'Orangerote Kehle und Brust bis zur Stirn',
      'Olivbraune Oberseite, weißlicher Bauch',
      'Große dunkle Augen, neugierig und wenig scheu',
    ],
  },
  {
    id: 'kohlmeise',
    name: 'Kohlmeise',
    latinName: 'Parus major',
    group: 'Singvögel',
    sizeCm: '14 cm',
    diet: ['Raupen & Blattläuse', 'Spinnen', 'Sonnenblumenkerne', 'Hasel- & Walnüsse, Fettfutter'],
    feederTip: 'Klassischer Besucher an Meisenknödeln und Futtersäulen.',
    callText: '„Zi-däh, zi-däh“ oder helles „Pink-pink!“',
    callNotes: 'Sehr klarer, zweisilbiger Schaukelgesang ab Februar, gut über weite Strecken hörbar.',
    callPattern: 'kohlmeise',
    activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    seasonSummary: 'Ganzjähriger Standvogel',
    habitat: 'Streuobstwiese, Nistkästen, Mischwaldrand',
    wildcamLikelihood: 'Sehr häufig',
    wildcamTips: 'Größte heimische Meise; auf IR-Nachtbildern selten (schläft in Höhlen), tagsüber gut am breiten schwarzen Brustband („Krawatte“) erkennbar.',
    keyFeatures: [
      'Glänzend schwarzer Kopf mit reinweißen Wangen',
      'Zitronengelber Bauch mit schwarzem Längsstreifen',
      'Grünlicher Rücken mit weißer Flügelbinde',
    ],
  },
  {
    id: 'blaumeise',
    name: 'Blaumeise',
    latinName: 'Cyanistes caeruleus',
    group: 'Singvögel',
    sizeCm: '11,5 cm',
    diet: ['Blattläuse & Raupen', 'Spinnen', 'Geschälte Sonnenblumenkerne', 'Knospenschädlinge an Obstbäumen'],
    feederTip: 'Liebt geschälte Kerne, Erdnussbruch und hängende Fettblöcke.',
    callText: 'Zartes „Zizizi-dürrr“, schneller Triller',
    callNotes: 'Hoher, feiner Glockentriller am Ende der kurzen Strophe.',
    callPattern: 'blaumeise',
    activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    seasonSummary: 'Ganzjähriger Standvogel',
    habitat: 'Obstbäume, Birken, Laub- und Mischwald',
    wildcamLikelihood: 'Häufig',
    wildcamTips: 'Deutlich zierlicher als die Kohlmeise, turnt oft kopfüber an feinen Zweigen oder am Futterspender.',
    keyFeatures: [
      'Kobaltblaue Scheitelkappe mit weißem Rand',
      'Schwarzer Augenstreif auf weißer Wange',
      'Gelber Bauch ohne breites schwarzes Brustband',
    ],
  },
  {
    id: 'amsel',
    name: 'Amsel',
    latinName: 'Turdus merula',
    group: 'Singvögel',
    sizeCm: '25 cm',
    diet: ['Regenwürmer & Engerlinge', 'Schnecken & Käfer', 'Fallobst (Äpfel) & Beeren', 'Rosinen & Haferflocken'],
    feederTip: 'Sucht unter Hecken, im Mulch und im Winter gern an halbierten Äpfeln.',
    callText: 'Flötender Wohlklang-Gesang; Warnruf lautes „Tix-tix-tix!“',
    callNotes: 'Warnt lautstark bei Katzen, Greifvögeln oder Marder in Hofnähe — guter Indikator für Wildkamera-Aktivität!',
    callPattern: 'amsel',
    activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    seasonSummary: 'Ganzjährig auf dem Hof',
    habitat: 'Rasen, Kompost, Beerensträucher, Waldrand',
    wildcamLikelihood: 'Sehr häufig',
    wildcamTips: 'Einer der häufigsten Vögel auf bodennahen Wildkameras. Scharrt mit kurzen Hüpfern und typischem Schwanzwippen im Laub.',
    keyFeatures: [
      'Männchen tiefschwarz mit leuchtend orange-gelbem Schnabel',
      'Weibchen dunkelbraun mit leicht gefleckter Kehle',
      'Hebt nach der Landung charakteristisch den Schwanz an',
    ],
  },
  {
    id: 'buntspecht',
    name: 'Buntspecht',
    latinName: 'Dendrocopos major',
    group: 'Spechte & Waldvögel',
    sizeCm: '23 cm',
    diet: ['Holzbewohnende Käferlarven', 'Fichten- & Kiefernsamen („Spechtschmiede“)', 'Haselnüsse & Walnüsse', 'Rindentalg & Erdnüsse im Winter'],
    feederTip: 'Kommt im Winter regelmäßig an ungesalzenes Fettfutter und Nussspender.',
    callText: 'Kurzes, scharfes „Kix!“; im Frühjahr kurzes Trommeln (ca. 0,6 Sek.)',
    callNotes: 'Trommelt schnell und abgehackt auf trockenen Resonanzästen von Februar bis Mai.',
    callPattern: 'buntspecht',
    activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    seasonSummary: 'Ganzjähriger Standvogel',
    habitat: 'Fichten-/Buchenwald Schwarzatal, alte Obstbäume, Totholzstämme',
    wildcamLikelihood: 'Häufig',
    wildcamTips: 'Wellenförmiger Flug („Bogenflug“) und senkrechtes Klettern am Stamm; markantes schwarz-weißes Muster mit rotem Unterschwanz bleibt selbst im IR-Graustufenbild kontrastreich sichtbar.',
    keyFeatures: [
      'Schwarz-weiß gemusterter Rücken mit großen weißen Schulterfeldern',
      'Leuchtend roter Unterschwanz; Männchen mit rotem Nackenfleck',
      'Kräftiger Meißelschnabel, stützt sich auf starre Schwanzfedern',
    ],
  },
  {
    id: 'gruenspecht',
    name: 'Grünspecht',
    latinName: 'Picus viridis',
    group: 'Spechte & Waldvögel',
    sizeCm: '32 cm',
    diet: ['Wiesenameisen & deren Puppen (Hauptnahrung!)', 'Im Winter seltener Beeren oder Sämereien'],
    feederTip: 'Kommt kaum ans Futterhaus — hält stattdessen den Rasen ameisenfrei.',
    callText: 'Lautes, lachendes „Klü-klü-klü-klü-klü“ (abfallend)',
    callNotes: 'Unverwechselbares Lachen vom Waldrand oder aus hohen Obstbäumen.',
    callPattern: 'gruenspecht',
    activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    seasonSummary: 'Ganzjähriger Standvogel',
    habitat: 'Streuobstwiesen, kurzrasige Wiesen mit Ameisenhügeln, lichte Waldränder',
    wildcamLikelihood: 'Sehr häufig',
    wildcamTips: 'Echter Wildkamera-Klassiker! Verbringt viel mehr Zeit auf dem Boden als andere Spechte und stochert mit langer klebriger Zunge in Ameisengängen.',
    keyFeatures: [
      'Moosgrüner Rücken und hellgrüne Unterseite',
      'Leuchtend rote Kopfplatte und schwarze Gesichtsmaske',
      'Deutlicher gelber Bürzel im Abflug',
    ],
  },
  {
    id: 'eichelhaeher',
    name: 'Eichelhäher',
    latinName: 'Garrulus glandarius',
    group: 'Spechte & Waldvögel',
    sizeCm: '34 cm',
    diet: ['Eicheln & Bucheckern (legt Wintervorräte an!)', 'Haselnüsse & Beeren', 'Große Insekten & Larven', 'Gelegentlich Eier oder Jungvögel'],
    feederTip: 'Sammelt im Herbst Eicheln und vergessene Vorräte — wichtiger „Waldgärtner“.',
    callText: 'Durchdringendes, heiseres „Räätsch!“ („Polizist des Waldes“)',
    callNotes: 'Warnt laut bei Füchsen, Greifen oder Menschen am Waldrand; kann auch Bussardrufe nachahmen.',
    callPattern: 'eichelhaeher',
    activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    seasonSummary: 'Ganzjährig im Thüringer Schiefergebirge',
    habitat: 'Mischwald, Eichenränder, Obstgarten in Waldnähe',
    wildcamLikelihood: 'Sehr häufig',
    wildcamTips: 'Erscheint häufig auf bodennahen Wildkameras im Wald und unter Nussbäumen. Im Schwarzweiß-IR-Bild an den weißen Flügelfeldern, dem weißen Bürzel und der dunklen Bartstreif-Silhouette erkennbar.',
    keyFeatures: [
      'Rosa-braunes Körpergefieder mit auffälligem blau-schwarz gebändertem Flügelfleck',
      'Weißer Bürzel kontrastiert im Flug stark zum schwarzen Schwanz',
      'Aufstellbare Scheitelfedern und schwarzer Bartstreif',
    ],
  },
  {
    id: 'kleiber',
    name: 'Kleiber',
    latinName: 'Sitta europaea',
    group: 'Singvögel',
    sizeCm: '14 cm',
    diet: ['Rindeninsekten & Spinnen', 'Haselnüsse & Bucheckern', 'Sonnenblumenkerne'],
    feederTip: 'Klemmt Nüsse in Rindenritzen und hämmert sie auf — häufig am Walnussbaum und Futterbrett.',
    callText: 'Klares, lautes „Twitt-twitt-twitt“ und pfeifendes „Tüüüt“',
    callNotes: 'Ab Vorfrühling sehr stimmgewaltig an alten Laub- und Obstbäumen.',
    callPattern: 'kleiber',
    activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    seasonSummary: 'Ganzjähriger Standvogel',
    habitat: 'Alte Obst- und Laubbäume, Mischwaldrand',
    wildcamLikelihood: 'Gelegentlich',
    wildcamTips: 'Einziger heimischer Vogel, der kopfüber den Baumstamm hinunterklettern kann!',
    keyFeatures: [
      'Blaugraue Oberseite, ockerfarbene Unterseite',
      'Markanter schwarzer Augenstreif („Zorro-Maske“)',
      'Kompakte Gestalt, kurzer Schwanz, spitzer Schnabel',
    ],
  },
  {
    id: 'buchfink',
    name: 'Buchfink',
    latinName: 'Fringilla coelebs',
    group: 'Singvögel',
    sizeCm: '15 cm',
    diet: ['Unkrautsamen & Bucheckern', 'Sonnenblumenkerne & Hanfsamen', 'Insekten & Raupen während der Brutzeit'],
    feederTip: 'Frisst fast ausschließlich am Boden unter dem Futterhaus aufgelesene Körner.',
    callText: 'Schmetternder „Finkenschlag“ mit Endschleife; Ruf „Pink!“',
    callNotes: 'Im Regen oder bei schwülem Wetter oft ein kurzes „Rüüüt“ („Regenruf“).',
    callPattern: 'buchfink',
    activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    seasonSummary: 'Ganzjährig (März–Okt zahlreicher; im Winter meist kleine Trupps)',
    habitat: 'Gartenwege, unter Hecken, Obstbäume, Waldrand',
    wildcamLikelihood: 'Häufig',
    wildcamTips: 'Auf Bodenkameras durch zwei breite weiße Flügelbinden leicht von Sperlingen zu unterscheiden.',
    keyFeatures: [
      'Zwei auffällige weiße Binden auf dunklem Flügel',
      'Männchen mit blaugrauem Scheitel und rotbrauner Brust',
      'Weibchen schlichter graubraun, Flügelbinden ebenfalls deutlich',
    ],
  },
  {
    id: 'gimpel',
    name: 'Gimpel (Dompfaff)',
    latinName: 'Pyrrhula pyrrhula',
    group: 'Singvögel',
    sizeCm: '16 cm',
    diet: ['Knospen & Samen von Esche, Ahorn, Birke', 'Ebereschen- & Schneeballbeeren', 'Sonnenblumenkerne im Winter'],
    feederTip: 'Besucht im Schwarzatal besonders von November bis März ruhig gelegene Futterstellen.',
    callText: 'Melancholisches, weiches „Djüüü“ (wie eine kleine Flöte)',
    callNotes: 'Leises, pfeifendes Rufen verrät meist ein Pärchen im Gebüsch.',
    callPattern: 'gimpel',
    activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    seasonSummary: 'Ganzjährig im Thüringer Wald; im Winter häufiger am Haus',
    habitat: 'Fichtenreiche Waldränder, Ebereschen, ruhige Gartenhecken',
    wildcamLikelihood: 'Gelegentlich',
    wildcamTips: 'Kräftiger, fast kugeliger Körperbau mit sehr kurzem dickem Finkenschnabel; tritt fast immer paarweise auf.',
    keyFeatures: [
      'Männchen mit leuchtend korallenroter Brust und schwarzer Kappe',
      'Weibchen mit dezent graubrauner Brust, ebenfalls schwarze Kappe',
      'Weißer Bürzel und helle Flügelbinde',
    ],
  },
  {
    id: 'stieglitz',
    name: 'Stieglitz (Distelfink)',
    latinName: 'Carduelis carduelis',
    group: 'Singvögel',
    sizeCm: '13 cm',
    diet: ['Distel-, Kletten- & Sonnenblumensamen', 'Karden- & Löwenzahnsamen', 'Blattläuse zur Jungenaufzucht'],
    feederTip: 'Stehenlassen von verblühten Wildblumen, Disteln und Karden im Herbst lockt ganze Trupps an.',
    callText: 'Hell klingendes „Stieglitt-stieglitt!“ und perlender Zwitschergesang',
    callNotes: 'Sein Ruf „Stieglitt“ gab dem Vogel seinen deutschen Namen.',
    callPattern: 'stieglitz',
    activeMonths: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    seasonSummary: 'Vor allem Feb – Nov (milde Winter auch vereinzelt am Futter)',
    habitat: 'Wildblumenwiese, Streuobstwiese, Brachen mit Karden & Disteln',
    wildcamLikelihood: 'Gelegentlich',
    wildcamTips: 'Oft in kleinen Gruppen an hochstehenden Samenständen; im Flug blitzt das breite gelbe Flügelband auf.',
    keyFeatures: [
      'Karminrotes Gesicht mit weiß-schwarzem Kopfband',
      'Breite leuchtend gelbe Flügelbinde auf schwarzem Flügel',
      'Spitzer kegelförmiger Samenfresserschnabel',
    ],
  },
  {
    id: 'zaunkoenig',
    name: 'Zaunkönig',
    latinName: 'Troglodytes troglodytes',
    group: 'Singvögel',
    sizeCm: '9,5 cm',
    diet: ['Winzige Spinnen & Weberknechte', 'Blattläuse, Mücken & Larven', 'Kleine Sämereien im strengen Winter'],
    feederTip: 'Braucht Totholz- und Reisighaufen sowie dichte Hecken als Frostschutz und Insektenspeisekammer.',
    callText: 'Erstaunlich lautes, schmetterndes „Zerrr-zerrr“ & langer Triller',
    callNotes: 'Einer der kleinsten Vögel Europas — mit einer der lautesten Stimmen!',
    callPattern: 'zaunkoenig',
    activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    seasonSummary: 'Ganzjähriger Standvogel',
    habitat: 'Reisighaufen, Holzstapel, Bachufer, schattige Sträucher',
    wildcamLikelihood: 'Häufig',
    wildcamTips: 'Schlüpft mausähnlich durch Totholz und Steinritzen; sofort am steil nach oben gestellten Stummelschwanz erkennbar.',
    keyFeatures: [
      'Winzige, runde Kugelgestalt in warmem Rostbraun',
      'Fast immer steil aufgerichteter Stummelschwanz',
      'Heller Überaugenstreif und fein gebänderte Flanken',
    ],
  },
  {
    id: 'rauchschwalbe',
    name: 'Rauchschwalbe',
    latinName: 'Hirundo rustica',
    group: 'Singvögel',
    sizeCm: '19 cm',
    diet: ['Ausschließlich Fluginsekten (Fliegen, Mücken, Blattläuse, Bremsen)'],
    feederTip: 'Offene Stall- oder Schuppenfenster und feuchte Lehmpfützen für den Nestbau im Frühjahr.',
    callText: 'Schnell plauderndes „Witt-witt-widit“ mit kleinem Schnarrton',
    callNotes: 'Unermüdlicher Luftakrobat über Tierställen und Wiesen — fängt hunderte Stallfliegen täglich.',
    callPattern: 'rauchschwalbe',
    activeMonths: [4, 5, 6, 7, 8, 9],
    seasonSummary: 'Sommergast / Langstreckenzieher (April – September)',
    habitat: 'Tierstall, Scheune, Wiesen über dem Schwarzatal',
    wildcamLikelihood: 'Gelegentlich',
    wildcamTips: 'Manchmal vor Kameras in Stallnähe beim Lehmsammeln an Pfützen oder Anflug an Dachbalken.',
    keyFeatures: [
      'Tief gegabelter Schwanz mit langen Spießen',
      'Stahlblaue Oberseite, kastanienbraune Kehle & Stirn',
      'Cremefarbener Bauch',
    ],
  },
  {
    id: 'star',
    name: 'Star',
    latinName: 'Sturnus vulgaris',
    group: 'Singvögel',
    sizeCm: '21 cm',
    diet: ['Wiesenschnaken-Larven (Tipula) & Käfer', 'Kirschen, Holunder & Fallobst', 'Insekten im Hühnerauslauf'],
    feederTip: 'Sucht im Trupp Rasen und Weiden mit offenem Schnabel („Zirkeln“) nach Larven ab.',
    callText: 'Vielfältiges Pfeifen, Schnalzen & Imitationen (z. B. Bussard, Handy, Amsel)',
    callNotes: 'Meister-Imitator mit schillerndem Gefieder im Frühlingslicht.',
    callPattern: 'star',
    activeMonths: [2, 3, 4, 5, 6, 7, 8, 9, 10, 11],
    seasonSummary: 'Meist Feb – Nov (einzelne überwintern)',
    habitat: 'Streuobstwiese, Weideflächen, Nistkästen',
    wildcamLikelihood: 'Häufig',
    wildcamTips: 'Auf Rasenkameras durch schnelles, zielstrebiges Laufen (nicht Hüpfen wie die Amsel!) und spitzen gelben Schnabel im Frühjahr erkennbar.',
    keyFeatures: [
      'Schwarz mit metallisch grün-violettem Glanz, im Herbst weiß gepunktet',
      'Kurzer Schwanz, dreieckige Flügel im Flug',
      'Schreitet am Boden (Amseln hüpfen meist)',
    ],
  },
  {
    id: 'maeusebussard',
    name: 'Mäusebussard',
    latinName: 'Buteo buteo',
    group: 'Greif- & Nachtvögel',
    sizeCm: '52 cm (Spannweite ca. 120 cm)',
    diet: ['Feldmäuse & Wühlmäuse', 'Maulwürfe, Regenwürmer & Großinsekten', 'Im Winter auch Aas'],
    feederTip: 'Freie Ansitzwarten (Zaunpfähle, Einzelbäume) unterstützen natürliche Mäusejagd auf Wiesen.',
    callText: 'Langes, abfallendes katzenartiges „Hiäääh!“ im Segelflug',
    callNotes: 'Kreist bei Thermik hoch über den Hängen von Mellenbach-Glasbach.',
    callPattern: 'maeusebussard',
    activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    seasonSummary: 'Ganzjähriger Standvogel & Wintergast',
    habitat: 'Offene Hangwiesen, Weidezäune, Waldrand-Bäume',
    wildcamLikelihood: 'Gelegentlich',
    wildcamTips: 'Landet im Winter bei Schneelage manchmal am Boden oder auf Zaunpfählen vor der Kamera; extrem variable Färbung von fast weiß bis tiefbraun, aber stets kompakter Kopf und breite gerundete Flügel.',
    keyFeatures: [
      'Kräftiger Greifvogel mit breiten Flügeln und gefächertem Schwanz',
      'Gefieder extrem variabel (hell bis dunkelbraun), meist helleres Brustband',
      'Sitzt geduldig auf Pfählen oder kreist mit leicht V-förmigen Flügeln',
    ],
  },
  {
    id: 'waldkauz',
    name: 'Waldkauz',
    latinName: 'Strix aluco',
    group: 'Greif- & Nachtvögel',
    sizeCm: '38 cm',
    diet: ['Wald- & Wühlmäuse', 'Große Nachtinsekten & Käfer', 'Frösche & Kleinvögel'],
    feederTip: 'Nachtaktiver Mäusejäger — alte Baumhöhlen oder Nistkästen am Waldrand sichern seinen Platz.',
    callText: 'Klassisches „Huuu ... hu-hu-huuuu“ & scharfes „Kuwitt!“',
    callNotes: 'Besonders im Spätherbst und Spätwinter (Oktober–März) nachts im Schwarzatal zu hören.',
    callPattern: 'waldkauz',
    activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
    seasonSummary: 'Ganzjähriger Standvogel (nachtaktiv)',
    habitat: 'Alte Laub-/Mischwälder, Waldrand zum Grundstück',
    wildcamLikelihood: 'Nachts / Dämmerung',
    wildcamTips: 'Sensationeller Wildkamera-Treffer bei Nacht! Auf IR-Bildern wirkt der runde Kopf ohne Federohren (im Gegensatz zur Waldohreule) mit großen dunklen Augen sehr markant.',
    keyFeatures: [
      'Runder Kopf ohne Federohren, großer Gesichtsschleier',
      'Pechschwarze große Augen (bei fast allen anderen Eulen gelb/orange)',
      'Rindenbraune oder graue Morphe, lautloser Flug',
    ],
  },
];

export const WILDCAM_MAMMALS: WildcamMammalHint[] = [
  {
    id: 'rotfuchs',
    name: 'Rotfuchs',
    latinName: 'Vulpes vulpes',
    sizeCm: '60–75 cm + 40 cm Rute',
    activity: 'Dämmerung & Nacht (ganzjährig)',
    irClues: 'Im Schwarzweiß-IR deutlich sichtbar an der buschigen Rute mit heller Spitze und spitzen Dreiecksohren; reflektierende Augen.',
    diet: 'Mäuse, Regenwürmer, Fallobst, Beeren — Hühnerstall abends zuverlässig schließen!',
    note: 'Häufiger nächtlicher Streifer an Grundstücksrändern am Thüringer Wald.',
  },
  {
    id: 'reh',
    name: 'Reh',
    latinName: 'Capreolus capreolus',
    sizeCm: '95–135 cm Länge',
    activity: 'Dämmerung, Nacht & früher Morgen',
    irClues: 'Schlanker Körper, großer weißer „Spiegel“ (Hinterteil) leuchtet auf IR-Fotos auffällig hell; Böcke tragen von Frühjahr bis Herbst kleines Gehörn.',
    diet: 'Knospen, Kräuter, junge Triebe, Brombeerblätter, Falläpfel.',
    note: 'Achtung bei jungen Obstbäumen — Verbiss- und Fegeschutz im Garten prüfen.',
  },
  {
    id: 'waschbaer',
    name: 'Waschbär',
    latinName: 'Procyon lotor',
    sizeCm: '45–65 cm + Ringelschwanz',
    activity: 'Strikt nachtaktiv',
    irClues: 'Unverwechselbare dunkle Gesichtsmaske und geringelter Schwanz selbst auf groben IR-Nachtaufnahmen; gewölbter Rücken beim Laufen.',
    diet: 'Allesfresser — Obst, Nüsse, Insekten, leider auch ungesichertes Tierfutter oder Hühnerställe.',
    note: 'Futtertonnen und Stalltüren im Schwarzatal immer sicher verriegeln.',
  },
  {
    id: 'dachs',
    name: 'Europäischer Dachs',
    latinName: 'Meles meles',
    sizeCm: '65–85 cm',
    activity: 'Späte Dämmerung & Nacht (Winterruhe bei Starkfrost)',
    irClues: 'Tiefer, gedrungener „Keil“-Körper, watschelnder Gang und leuchtend weiße Längsstreifen über den dunklen Kopf.',
    diet: 'Regenwürmer, Engerlinge, Schnecken, Fallobst, Mais, Wurzeln.',
    note: 'Gräbt mit kräftigen Krallen kleine Löcher auf der Wiese nach Engerlingen.',
  },
];

export const MUSHROOM_SPECIES: MushroomSpecies[] = [
  {
    id: 'steinpilz',
    name: 'Gemeiner Steinpilz',
    latinName: 'Boletus edulis',
    category: 'Röhrling',
    edibility: 'Sehr guter Speisepilz',
    isToxic: false,
    seasonMonths: [7, 8, 9, 10, 11],
    seasonLabel: 'Jul – Nov (Hochsaison Sep–Okt)',
    whereToFind: 'Saurer bis schwach saurer Boden (typisch Thüringer Schiefergebirge!) unter Fichten, Kiefern und Buchen, oft an moosigen Wegrändern.',
    capFeatures: 'Haselnuss- bis dunkelbrauner, jung halbkugeliger Hut mit weißlichem Rand („Zuwachsstreifen“). Oberfläche trocken leicht samtig, feucht etwas schmierig.',
    undersideType: 'Röhren (Schwamm): Jung reinweiß, später gelblich, im Alter olivgrün. Verfärbt sich auf Druck NICHT blau.',
    stemAndFlesh: 'Bauchiger, fester Stiel mit feinem weißen Stielnetz im oberen Drittel. Fleisch schneeweiß, bleibt im Schnitt weiß.',
    smell: 'Angenehm nussig-pilzig.',
    falseFriends: [
      {
        name: 'Gallenröhrling (Tylopilus felleus)',
        latinName: 'Tylopilus felleus',
        danger: 'Ungenießbar',
        keyDifference: 'Röhren werden alt rosa (nicht olivgrün!) und der Stiel trägt ein GROBES, dunkles Netz. Ein winziges Probierstückchen schmeckt extrem bitter!',
      },
      {
        name: 'Satansröhrling (Rubroboletus satanas)',
        latinName: 'Rubroboletus satanas',
        danger: 'Giftig',
        keyDifference: 'Kalkliebend (selten direkt auf Schiefer), kalkweißer Hut, knallrote Röhrenmündungen und rötlicher Stiel; blaut im Schnitt.',
      },
    ],
    safetyHint: 'Röhrling ohne rote Röhrenmündungen und ohne Blaufärbung, bei weiß-oliven Röhren — auf Rosaschimmer & Stielnetz prüfen (Gallenröhrling!).',
  },
  {
    id: 'marone',
    name: 'Maronen-Röhrling',
    latinName: 'Imleria badia',
    category: 'Röhrling',
    edibility: 'Sehr guter Speisepilz',
    isToxic: false,
    seasonMonths: [7, 8, 9, 10, 11],
    seasonLabel: 'Jul – Nov',
    whereToFind: 'Der Klassiker im Schwarzatal! Sehr häufig in moosigen Fichten- und Kiefernwäldern auf saurem Schieferverwitterungsboden, auch an bemoosten Baumstümpfen.',
    capFeatures: 'Kastanien- bis dunkelbrauner, polsterförmiger Hut („wie eine Marone“), bei Nässe klebrig.',
    undersideType: 'Röhren gelblich bis olivgelb — verfärben sich bei Fingerdruck typisch blaugrün.',
    stemAndFlesh: 'Schlanker, braun längsfaseriger Stiel OHNE Netzzeichnung. Weißes Fleisch blaut im Schnitt über den Röhren leicht.',
    smell: 'Mild, angenehm fruchtig-pilzig.',
    falseFriends: [
      {
        name: 'Gallenröhrling',
        latinName: 'Tylopilus felleus',
        danger: 'Ungenießbar',
        keyDifference: 'Gallenröhrling hat ein dunkles Stielnetz, verfärbt auf Druck nicht blau und bekommt rosa Schwamm-Poren.',
      },
    ],
    safetyHint: 'Wird oft stark von Maden befallen und speichert in manchen Regionen Radiocäsium etwas stärker als Steinpilze — junge, feste Exemplare wählen.',
  },
  {
    id: 'pfifferling',
    name: 'Echter Pfifferling',
    latinName: 'Cantharellus cibarius',
    category: 'Leistling',
    edibility: 'Sehr guter Speisepilz',
    isToxic: false,
    seasonMonths: [6, 7, 8, 9, 10],
    seasonLabel: 'Jun – Okt (nach warmem Sommerregen)',
    whereToFind: 'Gesellig („Hexenringe“ oder Nester) in moosigen Buchen- und Fichtenwäldern auf saurem Schieferboden.',
    capFeatures: 'Dottergelber, unregelmäßig gewellter Hut, zunächst gewölbt, später trichterförmig vertieft.',
    undersideType: 'LEISTEN statt Lamellen! Dicke, stumpfe, gegabelte Adern, die weit am Stiel herablaufen (lassen sich nicht wie Blätter abstreifen).',
    stemAndFlesh: 'Zum Boden hin verjüngter, fester Stiel. Fleisch im Inneren fast weiß bis blassgelb, faserig fest.',
    smell: 'Fruchtig nach Aprikosen / Mirabellen.',
    falseFriends: [
      {
        name: 'Falscher Pfifferling (Hygrophoropsis aurantiaca)',
        latinName: 'Hygrophoropsis aurantiaca',
        danger: 'Giftig',
        keyDifference: 'Hat echte, dünne, weich-biegsame orange Lamellen (keine festen Leisten!), dünneres weiches Fleisch und riecht nicht nach Aprikose.',
      },
      {
        name: 'Leuchtender Ölbaumpilz (Omphalotus olearius)',
        latinName: 'Omphalotus olearius',
        danger: 'Stark giftig',
        keyDifference: 'Wächst büschelig an Laubholz/Stümpfen (Echter Pfifferling wächst am Boden!), hat scharfschneidige Lamellen und oranges Fleisch.',
      },
    ],
    safetyHint: 'Merksatz: Echter Pfifferling = feste dicke Leisten + weißliches Fleisch + Aprikosenduft.',
  },
  {
    id: 'wiesenchampignon',
    name: 'Wiesenchampignon',
    latinName: 'Agaricus campestris',
    category: 'Lamellenpilz',
    edibility: 'Sehr guter Speisepilz',
    isToxic: false,
    seasonMonths: [6, 7, 8, 9, 10],
    seasonLabel: 'Jun – Okt',
    whereToFind: 'Ungedüngte Viehweiden, Obstwiesen und kurzrasige Hangwiesen (nicht direkt im dunklen Wald!).',
    capFeatures: 'Weißer bis leicht bräunlich-seidiger Hut, jung kugelig geschlossen.',
    undersideType: 'NIEMALS reinweiß! Jung leuchtend ROSA Lamellen, später schokobraun bis schwarzbraun.',
    stemAndFlesh: 'Zarter vergänglicher Ring, KEINE Knolle und KEINE Scheide an der Stielbasis! Fleisch rötet im Schnitt schwach.',
    smell: 'Angenehm pilzig (Wiesenchampignon) bzw. zart nach Marzipan/Anis (Schaf-Champignon).',
    falseFriends: [
      {
        name: 'Grüner / Weißer Knollenblätterpilz',
        latinName: 'Amanita phalloides / virosa',
        danger: 'Tödlich giftig',
        keyDifference: 'LEBENSGEFAHR! Knollenblätterpilze haben immer REINWEISSE Lamellen (auch alt!) UND eine häutige Scheide/Knolle am Stielfuß!',
      },
      {
        name: 'Karbol-Champignon (Agaricus xanthodermus)',
        latinName: 'Agaricus xanthodermus',
        danger: 'Giftig',
        keyDifference: 'Stielbasis läuft beim Ankratzen sofort intensiv CHROMGELB an und riecht unangenehm nach Tinte / Desinfektionsmittel / Krankenhaus.',
      },
    ],
    safetyHint: 'Goldene Regel: Weiße Lamellen oder Knolle mit Scheide → SOFORT stehen lassen! Basis immer auf Chromgelb-Verfärbung anschneiden.',
  },
  {
    id: 'parasol',
    name: 'Parasol (Riesenschirmling)',
    latinName: 'Macrolepiota procera',
    category: 'Lamellenpilz',
    edibility: 'Guter Speisepilz (Roh giftig)',
    isToxic: false,
    seasonMonths: [7, 8, 9, 10, 11],
    seasonLabel: 'Jul – Nov',
    whereToFind: 'Lichte Waldränder, Waldlichtungen, grasige Wegränder und Streuobstwiesen.',
    capFeatures: 'Sehr großer (15–30 cm!), jung „Paukenschlägel“-förmig, aufgeschirmt mit braunen Schuppen und dunklem Buckel in der Mitte.',
    undersideType: 'Freie, cremefarben-weiße, sehr weiche Lamellen (reichen nicht bis direkt an den Stiel).',
    stemAndFlesh: 'Langer, schlanker, zäher Stiel mit deutlicher BRAUNER NATTERUNG (Schlangenmuster) und dickem, VERSCHIEBBAREM Doppelring!',
    smell: 'Nussig-angenehm.',
    falseFriends: [
      {
        name: 'Gift-Riesenschirmling / Garten-Schirmling',
        latinName: 'Chlorophyllum brunneum / venenatum',
        danger: 'Giftig',
        keyDifference: 'Glatter (NICHT genatterter) Stiel, meist gedrungener, Fleisch läuft im Schnitt rötlich-bräunlich an; wächst oft auf Kompost/Gartenerde!',
      },
      {
        name: 'Pantherpilz / Kleine Schirmlinge',
        latinName: 'Amanita pantherina / Lepiota spec.',
        danger: 'Tödlich giftig',
        keyDifference: 'Kleine Schirmlinge (<10 cm Hut) können tödliches Amanitin enthalten! Nur große Parasole mit eindeutig genattertem Stiel + verschiebbarem Doppelring beachten.',
      },
    ],
    safetyHint: 'Nur roh giftig — immer gut durchbraten! Alle 3 Pflichtmerkmale prüfen: >12 cm Hut, braun genatterter Stiel, frei verschiebbarer Doppelring.',
  },
  {
    id: 'trompetenpfifferling',
    name: 'Trompetenpfifferling',
    latinName: 'Craterellus tubaeformis',
    category: 'Leistling',
    edibility: 'Sehr guter Speisepilz',
    isToxic: false,
    seasonMonths: [9, 10, 11, 12],
    seasonLabel: 'Sep – Dez (bis zum ersten Starkfrost!)',
    whereToFind: 'Spätherbst-Champion im Thüringer Schiefergebirge! Wächst teppichartig in feuchten, moosigen Fichten- und Tannenwäldern.',
    capFeatures: 'Kleiner, genabelter brauner Hut (2–6 cm), dünnfleischig und oft leicht gewellt.',
    undersideType: 'Graugelbe bis weißlich bereifte, gegabelte LEISTEN am Hutrand/Stielübergang.',
    stemAndFlesh: 'Hohler, elastischer, leuchtend dotter- bis goldgelber Stiel.',
    smell: 'Mild, erdig-pilzig; hervorragend zum Trocknen!',
    falseFriends: [
      {
        name: 'Grüngelbes Gallertkäppchen (Leotia lubrica)',
        latinName: 'Leotia lubrica',
        danger: 'Giftig',
        keyDifference: 'Schleimig-gallertartige Konsistenz, glatte Unterseite OHNE jede Leiste und völlig anderer Habitus.',
      },
    ],
    safetyHint: 'Wächst oft direkt neben hochgiftigen Haarschleierlingen (Cortinarius) — jeden einzelnen Pilz beim Putzen einzeln auf Leisten & hohlen gelben Stiel prüfen!',
  },
  {
    id: 'hexenroehrling',
    name: 'Flockenstieliger Hexen-Röhrling',
    latinName: 'Neoboletus erythropus',
    category: 'Röhrling',
    edibility: 'Guter Speisepilz (Roh giftig)',
    isToxic: false,
    seasonMonths: [5, 6, 7, 8, 9, 10],
    seasonLabel: 'Mai – Okt (oft schon sehr früh im Jahr)',
    whereToFind: 'Sehr häufig auf sauren Böden im Thüringer Schiefergebirge — Fichten-, Tannen- und Buchenwälder, oft an Böschungen.',
    capFeatures: 'Dunkel samtbrauner Hut („wildlederartig“).',
    undersideType: 'ORANGEROTE bis blutrote Röhrenmündungen — verfärbt sich bei Berührung augenblicklich tief tintenblau.',
    stemAndFlesh: 'Stiel auf gelbem Grund dicht mit feinen ROTEN FLOCKEN übersät (KEIN Netz!). Gelbes Fleisch wird im Schnitt innerhalb einer Sekunde tiefblau; beim Kochen wieder hellgelb.',
    smell: 'Unauffällig, mild.',
    falseFriends: [
      {
        name: 'Satansröhrling (Rubroboletus satanas)',
        latinName: 'Rubroboletus satanas',
        danger: 'Giftig',
        keyDifference: 'Satansröhrling hat einen hell weißlich-grauen Hut, ein rotes STIELNETZ statt Flocken, blaut langsamer/schwächer und riecht alt aasartig.',
      },
      {
        name: 'Netzstieliger Hexen-Röhrling',
        latinName: 'Suillellus luridus',
        danger: 'Ungenießbar',
        keyDifference: 'Trägt ein deutliches Stielnetz statt feiner Flocken und bevorzugt Kalk; roh sowie mit Alkohol schlecht verträglich.',
      },
    ],
    safetyHint: 'Roh giftig! Muss mindestens 15–20 Minuten gut durchgegart werden. Erst dann verschwinden Hitzegifte vollständig.',
  },
  {
    id: 'austernseitling',
    name: 'Austernseitling',
    latinName: 'Pleurotus ostreatus',
    category: 'Lamellenpilz',
    edibility: 'Sehr guter Speisepilz',
    isToxic: false,
    seasonMonths: [10, 11, 12, 1, 2, 3],
    seasonLabel: 'Okt – Mär (echter Winterpilz!)',
    whereToFind: 'Dachziegelartig in Büscheln an stehendem oder liegendem Laubholz (besonders Rotbuche, Weide, Pappel) — braucht Kältereize zum Fruchten.',
    capFeatures: 'Muschel- bis zungenförmiger, glatter Hut in Schiefergrau, Graublau bis Bräunlich (5–15 cm).',
    undersideType: 'Weißliche, dicht stehende Lamellen, die tief am seitlichen Stiel herablaufen.',
    stemAndFlesh: 'Kurzer, seitlicher, am Grund oft weißfilziger Stiel; festes weißes Fleisch.',
    smell: 'Angenehm mild-pilzig bis leicht anisartig.',
    falseFriends: [
      {
        name: 'Ohrförmiger Seitling (Pleurocybella porrigens)',
        latinName: 'Pleurocybella porrigens',
        danger: 'Giftig',
        keyDifference: 'Reinweiß, sehr dünnfleischig ohne richtigen Stiel und wächst ausschließlich an NADELHOLZ (Fichte/Tanne)!',
      },
      {
        name: 'Gelbstieliger Muschelseitling',
        latinName: 'Sarcomyxa serotina',
        danger: 'Ungenießbar',
        keyDifference: 'Olivgelblich-grüner Hut und scharf abgegrenzter gelber, schuppiger Stiel (Lamellen laufen NICHT am Stiel herab).',
      },
    ],
    safetyHint: 'Perfekter Fund für späte November- bis Winterspaziergänge! Nur an Laubholz sammeln und zähe Stielansätze abschneiden.',
  },
  {
    id: 'knollenblaetterpilz',
    name: 'Grüner Knollenblätterpilz',
    latinName: 'Amanita phalloides',
    category: 'Lamellenpilz',
    edibility: 'Tödlich giftig',
    isToxic: true,
    seasonMonths: [7, 8, 9, 10],
    seasonLabel: 'Jul – Okt',
    whereToFind: 'Vor allem unter Eichen, Rotbuchen und Haselsträuchern an Waldrändern und in Parkanlagen.',
    capFeatures: 'Olivgrüner, gelbgrüner bis fast weißlicher Hut mit fein eingewachsenen dunkleren Fasern (Radialfasern).',
    undersideType: 'IMMER REINWEISSE, freie Lamellen — auch im Alter nicht rosa oder braun!',
    stemAndFlesh: 'Weißlicher, oft leicht grünlich genatterter Stiel mit häutigem, herabhängendem Ring UND einer großen sackartigen SCHEIDE (Volva) an der Knolle im Boden!',
    smell: 'Jung unauffällig bis süßlich nach Kunsthonig, alt unangenehm.',
    falseFriends: [
      {
        name: 'Verwechselt mit Champignons & Grüntäublingen',
        latinName: 'Agaricus / Russula spec.',
        danger: 'Tödlich giftig',
        keyDifference: 'Schon 1 einziger Fruchtkörper (ca. 30–50 g) enthält tödliche Amatoxine (Leberversagen). Pilze daher NIEMALS einfach abschneiden — zur Kontrolle immer mit Stielbasis ausdrehen!',
      },
    ],
    safetyHint: 'VERANTWORTLICH FÜR ÜBER 90% ALLER TÖDLICHEN PILZVERGIFTUNGEN! Reinweiße Lamellen + Ring + Scheide in der Erde = absolute Lebensgefahr.',
  },
  {
    id: 'gallenroehrling',
    name: 'Gallenröhrling (Bitterpilz)',
    latinName: 'Tylopilus felleus',
    category: 'Röhrling',
    edibility: 'Ungenießbar',
    isToxic: true,
    seasonMonths: [7, 8, 9, 10],
    seasonLabel: 'Jul – Okt',
    whereToFind: 'Genau in denselben moosigen Fichten- und Kiefernwäldern wie Steinpilze & Maronen im Schiefergebirge!',
    capFeatures: 'Hell- bis mittelbrauner polsteriger Hut, jung dem Steinpilz täuschend ähnlich.',
    undersideType: 'Röhren jung weiß, werden bei Reife schmutzig ROSA (beim Steinpilz gelb-oliv).',
    stemAndFlesh: 'Kräftiger Stiel mit sehr GROBEM, DUNKELBRAUNEM NETZMUSTER (Steinpilz: feines weißes Netz!). Weißes Fleisch verfärbt sich im Schnitt ganz leicht rosa.',
    smell: 'Unauffällig — doch der Geschmack ist extrem bitter!',
    falseFriends: [
      {
        name: 'Verwechselt mit Steinpilz & Marone',
        latinName: 'Boletus edulis / Imleria badia',
        danger: 'Ungenießbar',
        keyDifference: 'Nicht giftig, aber ein einziges Stück im Topf macht das gesamte Pilzgericht ungenießbar bitter. Beim Zweifel kurz mit Zunge am Fleisch testen und sofort ausspucken.',
      },
    ],
    safetyHint: 'Achte immer auf rosa Schimmer im Schwamm und grobes braunes Stielnetz.',
  },
  {
    id: 'falscher_pfifferling',
    name: 'Falscher Pfifferling',
    latinName: 'Hygrophoropsis aurantiaca',
    category: 'Lamellenpilz',
    edibility: 'Giftig',
    isToxic: true,
    seasonMonths: [8, 9, 10, 11],
    seasonLabel: 'Aug – Nov',
    whereToFind: 'Auf morschem Nadelholz, Nadelstreu und Baumstümpfen im Fichten- und Kiefernwald.',
    capFeatures: 'Oft leuchtender orangerot in der Hutmitte mit hellerem, feinfilzigem, dünnerem Rand.',
    undersideType: 'Dicht gedrängte, dünne, WEICHE UND BIEGSAME LAMELLEN (gabelig, aber klar blattartig dünn!).',
    stemAndFlesh: 'Schlanker, eher biegsam-dünner Stiel, oft dunkler/bräunlich an der Basis. Fleisch orange-wässrig.',
    smell: 'Dumpf-erdig (kein Aprikosenduft!).',
    falseFriends: [
      {
        name: 'Verwechselt mit Echtem Pfifferling',
        latinName: 'Cantharellus cibarius',
        danger: 'Giftig',
        keyDifference: 'Kann in größeren Mengen Magen-Darm-Beschwerden auslösen. Erkennbar an echten biegsamen Lamellen statt dicker stumpfer Leisten und fehlendem Aprikosengeruch.',
      },
    ],
    safetyHint: 'Mit dem Fingernagel sanft über die Unterseite streichen: Echte Lamellen legen sich um; Leisten bleiben fest.',
  },
  {
    id: 'karbolchampignon',
    name: 'Karbol-Champignon',
    latinName: 'Agaricus xanthodermus',
    category: 'Lamellenpilz',
    edibility: 'Giftig',
    isToxic: true,
    seasonMonths: [6, 7, 8, 9, 10],
    seasonLabel: 'Jun – Okt',
    whereToFind: 'Heckenränder, Gärten, Kompostplätze, Parkrasen und Wegränder — leider oft direkt am Haus!',
    capFeatures: 'Reinweißer, oft leicht trapezförmig abgeflachter Hut, gilbt beim Reiben am Hutrand.',
    undersideType: 'Jung blassgrau-rosa, später schokobraun (wie essbare Champignons!).',
    stemAndFlesh: 'Knollige Basis ohne Scheide, aber: beim Anschneiden der unteren Stielknolle läuft diese augenblicklich LEUCHTEND CHROMGELB an!',
    smell: 'Unangenehm chemisch nach Tinte, Karbol, Lysol oder Krankenhaus (besonders beim Kochen verstärkt!).',
    falseFriends: [
      {
        name: 'Verwechselt mit Wiesen- & Schaf-Champignon',
        latinName: 'Agaricus campestris / arvensis',
        danger: 'Giftig',
        keyDifference: 'Verursacht teils heftiges Erbrechen & Durchfall. Pflicht-Check bei jedem Champignon: Stielknolle schneiden → leuchtend chromgelb + Tintengeruch = Gift!',
      },
    ],
    safetyHint: 'Nie Champignons ohne Schnittprobe an der Stielknolle und Geruchsprobe mitnehmen.',
  },
];
