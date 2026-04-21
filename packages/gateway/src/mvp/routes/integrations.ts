import { Router } from 'express';
import { buildGoogleOAuthClient } from '../integrations/gmail';
import { TokenStore } from '../integrations/token-store';
import { IntegrationRegistry } from '../integrations/registry';

const GOOGLE_SCOPES = [
  'https://www.googleapis.com/auth/gmail.modify',
  'https://www.googleapis.com/auth/calendar',
];

export function integrationsRouter(tokenStore: TokenStore, registry: IntegrationRegistry): Router {
  const r = Router();

  r.get('/integrations', (_req, res) => {
    const rawConnected = tokenStore.list();
    const demoMode = process.env.DEMO_MODE === 'true';
    const googleConnected = rawConnected.includes('gmail');
    const connected: string[] = [];
    for (const name of registry.names()) {
      if (demoMode && (name === 'gmail' || name === 'calendar')) {
        connected.push(name);
      } else if (name === 'gmail' || name === 'calendar') {
        if (googleConnected) connected.push(name);
      } else if (rawConnected.includes(name)) {
        connected.push(name);
      }
    }
    res.json({
      available: registry.names(),
      enabled: registry.enabledNames(),
      connected,
    });
  });

  r.post('/integrations/:name/enable', (req, res) => {
    registry.enable(req.params.name);
    res.json({ ok: true });
  });

  r.post('/integrations/:name/disable', (req, res) => {
    registry.disable(req.params.name);
    res.json({ ok: true });
  });

  r.get('/integrations/google/authorize', (_req, res) => {
    const client = buildGoogleOAuthClient();
    const url = client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: GOOGLE_SCOPES,
    });
    res.redirect(url);
  });

  r.get('/integrations/google/callback', async (req, res) => {
    const code = req.query.code as string;
    if (!code) return res.status(400).send('missing code');
    const client = buildGoogleOAuthClient();
    const { tokens } = await client.getToken(code);
    tokenStore.save('gmail', tokens as Record<string, unknown>);
    registry.enable('gmail');
    registry.enable('calendar');
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:5174/dashboard/mvp');
  });

  r.delete('/integrations/:name', (req, res) => {
    tokenStore.remove(req.params.name);
    registry.disable(req.params.name);
    res.json({ ok: true });
  });

  r.get('/integrations/slack/authorize', (_req, res) => {
    const params = new URLSearchParams({
      client_id: process.env.SLACK_CLIENT_ID ?? '',
      scope: 'channels:read,channels:history,chat:write,groups:read',
      redirect_uri: process.env.SLACK_REDIRECT_URI ?? '',
    });
    res.redirect(`https://slack.com/oauth/v2/authorize?${params}`);
  });

  r.get('/integrations/slack/callback', async (req, res) => {
    const code = req.query.code as string;
    if (!code) return res.status(400).send('missing code');
    const body = new URLSearchParams({
      code,
      client_id: process.env.SLACK_CLIENT_ID ?? '',
      client_secret: process.env.SLACK_CLIENT_SECRET ?? '',
      redirect_uri: process.env.SLACK_REDIRECT_URI ?? '',
    });
    const resp = await fetch('https://slack.com/api/oauth.v2.access', { method: 'POST', body });
    const json = await resp.json() as { ok: boolean; access_token?: string };
    if (!json.ok) return res.status(400).json(json);
    tokenStore.save('slack', json as unknown as Record<string, unknown>);
    registry.enable('slack');
    res.redirect(process.env.FRONTEND_URL || 'http://localhost:5174/dashboard/mvp');
  });

  return r;
}
