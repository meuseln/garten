interface WorkerContext {
  request: Request;
  env: {
    FIREBASE_SERVICE_ACCOUNT_JSON?: string;
    [key: string]: unknown;
  };
  ctx?: {
    waitUntil: (promise: Promise<unknown>) => void;
  };
}

interface ServiceAccountJson {
  client_email: string;
  private_key: string;
  project_id?: string;
}

interface JwkKey extends JsonWebKey {
  kid?: string;
  alg?: string;
  use?: string;
}

const FIREBASE_PROJECT_ID = 'hof-und-garten';
const FIRESTORE_DATABASE_ID = 'ai-studio-7c45743f-0fa5-4fa9-940e-cd80b8aa94f4';
const JWK_ENDPOINT =
  'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com';

let cachedJwks: { keys: JwkKey[]; expiresAtMs: number } | null = null;

function base64UrlDecodeToBytes(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (input.length % 4)) % 4);
  const bin = atob(padded);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

function base64UrlEncodeBytes(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i++) {
    bin += String.fromCharCode(bytes[i]);
  }
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function base64UrlEncodeJson(obj: unknown): string {
  return base64UrlEncodeBytes(new TextEncoder().encode(JSON.stringify(obj)));
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const normalized = pem.replace(/\\n/g, '\n');
  const b64 = normalized
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\s+/g, '');
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes.buffer;
}

async function getGoogleJwks(): Promise<JwkKey[]> {
  if (cachedJwks && Date.now() < cachedJwks.expiresAtMs) {
    return cachedJwks.keys;
  }
  const res = await fetch(JWK_ENDPOINT);
  if (!res.ok) {
    throw new Error('Google JWK keys could not be loaded.');
  }
  const data = (await res.json()) as { keys?: JwkKey[] };
  const keys = data.keys || [];
  cachedJwks = { keys, expiresAtMs: Date.now() + 55 * 60 * 1000 };
  return keys;
}

async function verifyFirebaseIdToken(idToken: string): Promise<{ uid: string; emailVerified: boolean }> {
  const parts = idToken.split('.');
  if (parts.length !== 3) {
    throw new Error('Ungültiges Auth-Token.');
  }
  const [headerB64, payloadB64, sigB64] = parts;
  const header = JSON.parse(new TextDecoder().decode(base64UrlDecodeToBytes(headerB64))) as {
    alg?: string;
    kid?: string;
  };
  const payload = JSON.parse(new TextDecoder().decode(base64UrlDecodeToBytes(payloadB64))) as {
    aud?: string;
    iss?: string;
    sub?: string;
    exp?: number;
    iat?: number;
    email_verified?: boolean;
  };

  if (header.alg !== 'RS256' || !header.kid) {
    throw new Error('Ungültiger Token-Algorithmus.');
  }
  const nowSec = Math.floor(Date.now() / 1000);
  if (
    payload.aud !== FIREBASE_PROJECT_ID ||
    payload.iss !== `https://securetoken.google.com/${FIREBASE_PROJECT_ID}` ||
    !payload.sub ||
    typeof payload.exp !== 'number' ||
    payload.exp <= nowSec
  ) {
    throw new Error('Auth-Token abgelaufen oder ungültig.');
  }
  if (!payload.email_verified) {
    throw new Error('E-Mail-Adresse nicht bestätigt.');
  }

  const jwks = await getGoogleJwks();
  const jwk = jwks.find((k) => k.kid === header.kid);
  if (!jwk) {
    throw new Error('Signaturschlüssel nicht gefunden.');
  }

  const cryptoKey = await crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['verify']
  );

  const signingInput = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
  const signatureBytes = base64UrlDecodeToBytes(sigB64);
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    signatureBytes.buffer as ArrayBuffer,
    signingInput
  );
  if (!valid) {
    throw new Error('Token-Signatur ungültig.');
  }

  return { uid: payload.sub, emailVerified: true };
}

async function getFcmAccessToken(sa: ServiceAccountJson): Promise<string> {
  const nowSec = Math.floor(Date.now() / 1000);
  const headerB64 = base64UrlEncodeJson({ alg: 'RS256', typ: 'JWT' });
  const claimB64 = base64UrlEncodeJson({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
    aud: 'https://oauth2.googleapis.com/token',
    iat: nowSec,
    exp: nowSec + 3600,
  });

  const signingInput = `${headerB64}.${claimB64}`;
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigBuf = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(signingInput)
  );
  const jwt = `${signingInput}.${base64UrlEncodeBytes(new Uint8Array(sigBuf))}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });
  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`Google OAuth Token fehlgeschlagen: ${errText}`);
  }
  const tokenJson = (await tokenRes.json()) as { access_token?: string };
  if (!tokenJson.access_token) {
    throw new Error('Kein Google Access Token erhalten.');
  }
  return tokenJson.access_token;
}

interface FirestoreField {
  stringValue?: string;
}

interface FirestoreDoc {
  fields?: Record<string, FirestoreField>;
}

async function fetchHomesteadMembers(idToken: string): Promise<Array<{ uid: string; displayName: string; fcmToken?: string }>> {
  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/${FIRESTORE_DATABASE_ID}/documents:runQuery`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${idToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId: 'homesteadMembers' }],
        where: {
          fieldFilter: {
            field: { fieldPath: 'homesteadId' },
            op: 'EQUAL',
            value: { stringValue: 'mellenbach-hof' },
          },
        },
        limit: 20,
      },
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Mitgliederabfrage fehlgeschlagen (${res.status}): ${txt}`);
  }
  const rows = (await res.json()) as Array<{ document?: FirestoreDoc }>;
  return rows
    .filter((row) => Boolean(row.document?.fields))
    .map((row) => ({
      uid: row.document!.fields?.uid?.stringValue || '',
      displayName: row.document!.fields?.displayName?.stringValue || '',
      fcmToken: row.document!.fields?.fcmToken?.stringValue || undefined,
    }));
}

export async function handlePingPush(context: WorkerContext): Promise<Response> {
  const rawSa = context.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!rawSa) {
    return Response.json(
      {
        sent: false,
        configured: false,
        message: 'FIREBASE_SERVICE_ACCOUNT_JSON ist noch nicht als Secret hinterlegt.',
      },
      { status: 200 }
    );
  }

  const authHeader = context.request.headers.get('Authorization') || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : '';
  if (!idToken) {
    return Response.json({ error: 'Nicht autorisiert.' }, { status: 401 });
  }

  try {
    const caller = await verifyFirebaseIdToken(idToken);
    const members = await fetchHomesteadMembers(idToken);
    const callerMember = members.find((m) => m.uid === caller.uid);
    if (!callerMember || (callerMember.displayName !== 'Nico' && callerMember.displayName !== 'Chris')) {
      return Response.json({ error: 'Kein verifiziertes Hofmitglied.' }, { status: 403 });
    }

    const body = (await context.request.json().catch(() => ({}))) as {
      message?: string;
      selfTest?: boolean;
      delaySec?: number;
    };
    const isSelfTest = body.selfTest === true;
    const delaySec = isSelfTest ? Math.min(8, Math.max(0, Number(body.delaySec) || 0)) : 0;

    const recipientName = isSelfTest
      ? callerMember.displayName
      : callerMember.displayName === 'Nico'
      ? 'Chris'
      : 'Nico';
    const recipient = isSelfTest
      ? callerMember
      : members.find((m) => m.displayName === recipientName);

    if (!recipient?.fcmToken) {
      return Response.json(
        {
          sent: false,
          configured: true,
          reason: 'no_recipient_token',
          message: isSelfTest
            ? 'Für dein Gerät ist noch kein Geräte-Token gespeichert. Bitte zuerst „Push-Berechtigung aktivieren“ drücken (VAPID-Key nötig).'
            : `${recipientName} hat noch keine Push-Berechtigung aktiviert.`,
        },
        { status: 200 }
      );
    }

    const sa = JSON.parse(rawSa) as ServiceAccountJson;
    if (!sa.client_email || !sa.private_key) {
      return Response.json(
        { error: 'FIREBASE_SERVICE_ACCOUNT_JSON ist unvollständig (client_email / private_key fehlt).' },
        { status: 500 }
      );
    }

    const cleanBody =
      typeof body.message === 'string' && body.message.trim()
        ? body.message.trim().slice(0, 240)
        : `${callerMember.displayName} pingt dich! Schau kurz in Hof & Garten vorbei.`;
    const title = isSelfTest
      ? 'Ping-Test · Hof & Garten'
      : `Ping von ${callerMember.displayName} · Hof & Garten`;

    const recipientToken = recipient.fcmToken;
    const sendFcmPush = async () => {
      const accessToken = await getFcmAccessToken(sa);
      const projectId = sa.project_id || FIREBASE_PROJECT_ID;
      const fcmRes = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: {
            token: recipientToken,
            notification: {
              title,
              body: cleanBody,
            },
            data: {
              title,
              body: cleanBody,
              url: '/',
              fromName: callerMember.displayName,
              toName: recipientName,
            },
            webpush: {
              headers: {
                Urgency: 'high',
                TTL: '3600',
              },
              notification: {
                title,
                body: cleanBody,
                icon: '/pwa-192x192.png',
                badge: '/pwa-192x192.png',
                tag: isSelfTest ? 'homestead-ping-test' : 'homestead-ping',
              },
              fcm_options: {
                link: '/',
              },
            },
          },
        }),
      });
      return fcmRes;
    };

    if (isSelfTest && delaySec > 0) {
      const delayedTask = (async () => {
        await new Promise((resolve) => setTimeout(resolve, delaySec * 1000));
        const res = await sendFcmPush();
        if (!res.ok) {
          console.error('Delayed self-test FCM error:', res.status, await res.text());
        }
      })().catch((err) => {
        console.error('Delayed self-test error:', err);
      });

      if (context.ctx?.waitUntil) {
        context.ctx.waitUntil(delayedTask);
      }

      return Response.json(
        { sent: true, scheduled: true, delaySec, configured: true, toName: recipientName },
        { status: 200 }
      );
    }

    const fcmRes = await sendFcmPush();
    if (!fcmRes.ok) {
      const errText = await fcmRes.text();
      return Response.json(
        { sent: false, configured: true, error: `FCM Fehler (${fcmRes.status}): ${errText}` },
        { status: 502 }
      );
    }

    return Response.json({ sent: true, configured: true, toName: recipientName }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Push-Versand fehlgeschlagen.';
    return Response.json({ error: message }, { status: 500 });
  }
}
