import express from 'express';
import cors from 'cors';
import { openDb, runMigrations } from './db';
import { EventTracker } from './workflow/tracker';
import { LMClient } from './lm-bridge/client';
import { IntegrationRegistry } from './integrations/registry';
import { TokenStore } from './integrations/token-store';
import { GmailIntegration } from './integrations/gmail';
import { CalendarIntegration } from './integrations/calendar';
import { SlackIntegration } from './integrations/slack';
import { eventsRouter } from './routes/events';
import { renderRouter } from './routes/render';
import { integrationsRouter } from './routes/integrations';
import { telemetryRouter } from './routes/telemetry';
import { mkdirSync } from 'fs';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

export function buildMvpApp() {
  const dbPath = process.env.SQLITE_PATH || './data/yoxp-mvp.db';
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = openDb(dbPath);
  runMigrations(db);

  const tracker = new EventTracker(db);
  const tokenStore = new TokenStore(db);
  const registry = new IntegrationRegistry();
  registry.register(new GmailIntegration(tokenStore));
  registry.register(new CalendarIntegration(tokenStore));
  registry.register(new SlackIntegration(tokenStore));

  for (const name of tokenStore.list()) registry.enable(name);

  const lm = new LMClient({
    url: process.env.LM_STUDIO_URL || 'http://localhost:1234/v1',
    model: process.env.LM_MODEL || 'local-model',
  });

  const app = express();
  app.use(cors({ origin: ['http://localhost:5173', 'http://localhost:5174'], credentials: true }));
  app.use(express.json());

  app.get('/health', (_req, res) => res.json({ ok: true }));
  app.use('/api', eventsRouter(tracker));
  app.use('/api', renderRouter({ db, tracker, registry, lm }));
  app.use('/api', integrationsRouter(tokenStore, registry));
  app.use('/api', telemetryRouter(db));

  return app;
}

if (import.meta.url === `file://${process.argv[1]}` || fileURLToPath(import.meta.url) === process.argv[1]) {
  const port = Number(process.env.MVP_PORT || 3457);
  buildMvpApp().listen(port, () => console.log(`MVP server on ${port}`));
}
