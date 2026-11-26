# Hof & Garten — Einrichtung & Automatisches Deployment (Firebase + Netlify)

## 1. Firebase-Projekt (bereits angebunden)
- **Projekt-ID:** `hof-und-garten`
- **Firestore-Datenbank:** `ai-studio-7c45743f-0fa5-4fa9-940e-cd80b8aa94f4`
- **Security Rules:** `firestore.rules` (bereits bereitgestellt, Standard-Deny, E-Mail-Verifizierung, strikte Schema-Prüfung, PII-Trennung)

### Einmalige Einrichtung der beiden Konten (Nico & Chris)
Da laut Vorgabe **kein Google-Login** und **keine öffentliche Registrierung** erlaubt sind, aktiviere in der Firebase Console einmalig die E-Mail/Passwort-Anmeldung:
1. Öffne die [Firebase Console](https://console.firebase.google.com/project/hof-und-garten/authentication/providers).
2. Wähle **Authentication -> Sign-in method -> E-Mail/Passwort** und aktiviere den Anbieter (ohne E-Mail-Link-Option nötig).
3. Lege unter **Authentication -> Users -> Add user** die beiden Konten für **Nico** und **Chris** mit ihren jeweiligen E-Mail-Adressen und Passwörtern an.
4. Beim ersten Login in **Hof & Garten** erhalten Nico und Chris einmalig eine Verifizierungs-E-Mail (damit `email_verified` in Firebase aktiv ist) und wählen danach ihr Profil (`Nico` `#BBE774` oder `Chris` `#F28090`).

### Firebase Cloud Messaging (Optional für Hintergrund-Push auf iPhone / Desktop)
1. Öffne in der Firebase Console **Project Settings -> Cloud Messaging -> Web Push certificates** und erzeuge ein Key Pair (VAPID Key).
2. Hinterlege den Public VAPID Key als `VITE_FIREBASE_VAPID_KEY` in Netlify bzw. `.env`.
3. Auf dem iPhone: App über Safari -> Teilen -> **Zum Home-Bildschirm** installieren (ab iOS 16.4 unterstützt Safari dann Web-Push).

---

## 2. Empfohlen: Kostenloses Deployment auf Cloudflare Pages (Ohne Kreditkarte)
Cloudflare Pages bietet im kostenlosen Free-Tarif **unbegrenzte Bandbreite**, 500 Builds/Monat und Unterstützung für `/api/assistant` über *Pages Functions* (`functions/api/assistant.ts`) — komplett ohne Kreditkarte.

1. Lade dieses Projekt in ein privates oder öffentliches **GitHub-Repository** hoch.
2. Melde dich kostenlos bei [Cloudflare Dash](https://dash.cloudflare.com/) an -> **Workers & Pages -> Create -> Pages -> Connect to Git** (wähle das Repository).
3. Build-Einstellungen eintragen:
   - **Framework preset:** `Vite` (oder `None`)
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Optional für den KI-Reiter „Hof-Assistent“ unter **Settings -> Environment variables** (Production & Preview) hinterlegen:
   - `GEMINI_API_KEY` = Dein kostenloser Gemini API Key aus Google AI Studio (ohne Abrechnungskonto nutzbar)
   - Optional für Web-Push: `VITE_FIREBASE_VAPID_KEY`
5. Nach dem ersten Deploy die neue Cloudflare-Domain (z. B. `https://hof-und-garten.pages.dev`) in der Firebase Console unter **Authentication -> Settings -> Authorized domains** hinzufügen.
6. *Hinweis:* Bei Verbindung über **Git** werden sowohl die App (`dist`) als auch die Server-Funktion (`functions/api/assistant.ts`) bei jedem Push automatisch mitgebaut. (Beim reinen Drag-&-Drop-Upload von `dist` funktionieren alle Hauptmodule der App ebenfalls sofort — nur der KI-Tab bräuchte Git-Deploy oder `npx wrangler pages deploy dist`).

---

## 3. Alternative: Kostenloses Deployment auf Firebase Hosting (Spark Plan)
Die Konfigurationsdateien `firebase.json` und `.firebaserc` sind bereits fertig auf `hof-und-garten` und das Build-Verzeichnis `dist` (inkl. PWA-Headers) eingerichtet. Da in der Sandbox kein persönlicher Firebase-Login vorliegt, führst du das Deployment lokal in 3 Befehlen aus:

1. **Firebase CLI installieren & anmelden (einmalig):**
   ```bash
   npm install -g firebase-tools
   firebase login
   ```
2. **App bauen & auf Firebase Hosting hochladen:**
   ```bash
   npm install
   npm run build
   firebase deploy --only hosting
   ```
3. **Hinweis zum KI-Reiter „Hof-Assistent“:**
   - Alle Hauptfunktionen (Gartenkarte, Beete, Tiere, Rezepte, Vorratskammer, Wochenplan, Einkaufsliste, Wetter & Firebase-Sync) laufen auf **Firebase Hosting (kostenloser Spark Plan)** sofort ohne Server- und ohne Token-Kosten.
   - Die Domains `hof-und-garten.web.app` und `hof-und-garten.firebaseapp.com` sind in Firebase Auth automatisch autorisiert.
   - *Wichtig:* Cloud Functions für `/api/assistant` benötigen bei Firebase den Blaze-Tarif (mit Kreditkarte); ohne Kreditkarte daher **Cloudflare Pages** bevorzugen.

---

## 3. Automatisches Deployment auf Netlify (Alternative)
1. Lade dieses Projekt in dein GitHub-Repository hoch (oder verbinde es direkt).
2. Melde dich bei [Netlify](https://app.netlify.com/) an -> **Add new site -> Import an existing project**.
3. Wähle dein Git-Repository (Build-Einstellungen werden automatisch aus `netlify.toml` gelesen):
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
   - **Functions directory:** `netlify/functions`
4. Trage in Netlify unter **Site configuration -> Environment variables** folgende Variable ein:
   - `GEMINI_API_KEY` = Dein Gemini API Key (wird ausschließlich serverseitig in `netlify/functions/assistant.ts` verwendet)
   - Optional für Web-Push: `VITE_FIREBASE_VAPID_KEY` = Dein Firebase Web Push VAPID Key
5. Trage deine Netlify-Domain (z.B. `https://hof-und-garten.netlify.app`) in der Firebase Console unter **Authentication -> Settings -> Authorized domains** ein.
6. Ab sofort löst jeder `git push` auf den Hauptbranch automatisch einen Build und ein HTTPS-Deployment inklusive Deployment-Vorschau für Pull Requests aus.

