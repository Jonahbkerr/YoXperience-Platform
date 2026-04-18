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
    res.json({
      available: registry.names(),
      enabled: registry.enabledNames(),
      connected: tokenStore.list(),
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
    res.redirect('/mvp');
  });

  r.delete('/integrations/:name', (req, res) => {
    tokenStore.remove(req.params.name);
    registry.disable(req.params.name);
    res.json({ ok: true });
  });

  return r;
}
