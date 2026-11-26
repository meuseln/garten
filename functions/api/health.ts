export function onRequestGet(env?: {
  GEMINI_API_KEY?: string;
  FIREBASE_SERVICE_ACCOUNT_JSON?: string;
}): Response {
  return Response.json({
    ok: true,
    service: 'hof-und-garten',
    runtime: 'cloudflare-workers',
    geminiConfigured: Boolean(env?.GEMINI_API_KEY),
    pushConfigured: Boolean(env?.FIREBASE_SERVICE_ACCOUNT_JSON),
  });
}
