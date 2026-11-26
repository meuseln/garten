import { onRequestPost as handleAssistant } from './functions/api/assistant';
import { onRequestGet as handleHealth } from './functions/api/health';
import { handlePingPush } from './functions/api/ping-push';

interface WorkerEnv {
  GEMINI_API_KEY?: string;
  FIREBASE_SERVICE_ACCOUNT_JSON?: string;
  ASSETS: {
    fetch(request: Request): Promise<Response>;
  };
  [key: string]: unknown;
}

export default {
  async fetch(request: Request, env: WorkerEnv): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health' && request.method === 'GET') {
      return handleHealth();
    }

    if (url.pathname === '/api/assistant' && request.method === 'POST') {
      return handleAssistant({ request, env });
    }

    if (url.pathname === '/api/ping-push' && request.method === 'POST') {
      return handlePingPush({ request, env });
    }

    return env.ASSETS.fetch(request);
  },
};
