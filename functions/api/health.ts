export function onRequestGet(): Response {
  return Response.json({ ok: true, service: 'hof-und-garten', runtime: 'cloudflare-pages' });
}
