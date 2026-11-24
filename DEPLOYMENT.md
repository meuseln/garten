# Hof & Garten — Einrichtung & Automatisches Deployment (Firebase + Netlify)

## 1. Firebase-Projekt (bereits angebunden)
- **Projekt-ID:** `gen-lang-client-0184315958`
- **Firestore-Datenbank:** `ai-studio-7c45743f-0fa5-4fa9-940e-cd80b8aa94f4`
- **Security Rules:** `firestore.rules` (bereits bereitgestellt, Standard-Deny, E-Mail-Verifizierung, strikte Schema-Prüfung, PII-Trennung)

### Einmalige Einrichtung der beiden Konten (Nico & Chris)
Da laut Vorgabe **kein Google-Login** und **keine öffentliche Registrierung** erlaubt sind, aktiviere in der Firebase Console einmalig die E-Mail/Passwort-Anmeldung:
1. Öffne die [Firebase Console](https://console.firebase.google.com/project/gen-lang-client-0184315958/authentication/providers).
2. Wähle **Authentication -> Sign-in method -> E-Mail/Passwort** und aktiviere den Anbieter (ohne E-Mail-Link-Option nötig).
3. Lege unter **Authentication -> Users -> Add user** die beiden Konten für **Nico** und **Chris** mit ihren jeweiligen E-Mail-Adressen und Passwörtern an.
4. Beim ersten Login in **Hof & Garten** erhalten Nico und Chris einmalig eine Verifizierungs-E-Mail (damit `email_verified` in Firebase aktiv ist) und wählen danach ihr Profil (`Nico` `#BBE774` oder `Chris` `#F28090`).

### Firebase Cloud Messaging (Optional für Hintergrund-Push auf iPhone / Desktop)
1. Öffne in der Firebase Console **Project Settings -> Cloud Messaging -> Web Push certificates** und erzeuge ein Key Pair (VAPID Key).
2. Hinterlege den Public VAPID Key als `VITE_FIREBASE_VAPID_KEY` in Netlify bzw. `.env`.
3. Auf dem iPhone: App über Safari -> Teilen -> **Zum Home-Bildschirm** installieren (ab iOS 16.4 unterstützt Safari dann Web-Push).

---

## 2. Automatisches Deployment auf Netlify
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
