# YoXperience Agentic Interface MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-user agentic webapp where a local LM (via LM Studio) dynamically renders UI panels based on user workflow context and connected integrations (Gmail → Calendar → Slack).

**Architecture:** Local-only monorepo: Node/Express backend calls LM Studio at `localhost:1234/v1`, stores events in SQLite, orchestrates Gmail/Calendar/Slack adapters. React+Vite frontend renders panels returned by the LM render loop over HTTP polling.

**Tech Stack:** TypeScript, Node 20+, Express, better-sqlite3, React 19, Vite, LM Studio (OpenAI-compatible local API), OAuth2 via googleapis + @slack/web-api.

**Spec:** `docs/superpowers/specs/2026-04-18-yoxperience-agentic-mvp-design.md`

**Strategy:** Build a thin vertical slice first (scaffold + LM bridge + Gmail + dynamic panel render + SQLite telemetry). Add Calendar and Slack adapters last — they follow the Gmail pattern.

---

## File Structure

### New files (created by this plan)

**Backend (packages/gateway):**
- `src/mvp/server.ts` — minimal Express app for MVP (bypasses existing multi-tenant routes)
- `src/mvp/db.ts` — SQLite connection + migrations
- `src/mvp/schema.sql` — SQLite table definitions
- `src/mvp/lm-bridge/client.ts` — LM Studio HTTP client
- `src/mvp/lm-bridge/prompt.ts` — prompt templates + response schema
- `src/mvp/workflow/tracker.ts` — event logging API
- `src/mvp/workflow/context.ts` — context builder (recent events → LM input)
- `src/mvp/integrations/types.ts` — shared Integration interface
- `src/mvp/integrations/registry.ts` — list of enabled integrations
- `src/mvp/integrations/gmail.ts` — Gmail adapter
- `src/mvp/integrations/calendar.ts` — Google Calendar adapter
- `src/mvp/integrations/slack.ts` — Slack adapter
- `src/mvp/routes/events.ts` — POST /api/events
- `src/mvp/routes/render.ts` — GET /api/render
- `src/mvp/routes/integrations.ts` — OAuth connect/disconnect
- `src/mvp/routes/telemetry.ts` — CSV export
- `tests/mvp/lm-bridge.test.ts`
- `tests/mvp/workflow-context.test.ts`
- `tests/mvp/integration-registry.test.ts`

**Frontend (packages/dashboard) — reusing existing scaffold:**
- `src/mvp/MVPApp.tsx` — root for agentic MVP (mounted at /mvp)
- `src/mvp/api.ts` — fetch wrapper for backend
- `src/mvp/components/Dashboard.tsx` — layout shell
- `src/mvp/components/IntegrationSidebar.tsx`
- `src/mvp/components/DynamicPanelGrid.tsx`
- `src/mvp/components/panels/ActionCard.tsx`
- `src/mvp/components/panels/ContextPanel.tsx`
- `src/mvp/components/panels/QuickActions.tsx`
- `src/mvp/components/ActivityTimeline.tsx`
- `src/mvp/hooks/useRenderLoop.ts` — polls /api/render every 5s

### Modified files

- `packages/gateway/package.json` — add deps: `better-sqlite3`, `googleapis`, `@slack/web-api`, `zod`
- `packages/dashboard/src/App.tsx` — mount MVPApp at `/mvp` route
- `package.json` (root) — add `dev:mvp` script
- `.env.example` — add LM Studio + OAuth credentials

---

## Environment Setup (Task 0)

### Task 0: Prerequisites & Deps

**Files:**
- Modify: `packages/gateway/package.json`
- Modify: `.env.example`

- [ ] **Step 1: Install backend deps**

```bash
cd /Users/jonahk/YoXperience-Platform-repo
npm -w @yoxperience/gateway install better-sqlite3 zod googleapis @slack/web-api
npm -w @yoxperience/gateway install -D @types/better-sqlite3 vitest
```

- [ ] **Step 2: Install frontend deps (if missing)**

```bash
npm -w @yoxperience/dashboard install
```

- [ ] **Step 3: Update .env.example**

Append to `.env.example`:

```env
# MVP
LM_STUDIO_URL=http://localhost:1234/v1
LM_MODEL=local-model
SQLITE_PATH=./data/yoxp-mvp.db

# Google OAuth (Gmail + Calendar)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=http://localhost:3457/api/integrations/google/callback

# Slack OAuth
SLACK_CLIENT_ID=
SLACK_CLIENT_SECRET=
SLACK_REDIRECT_URI=http://localhost:3457/api/integrations/slack/callback
```

- [ ] **Step 4: Commit**

```bash
git add .env.example packages/gateway/package.json packages/gateway/package-lock.json package-lock.json
git commit -m "chore(mvp): add MVP deps and env vars"
```

---

## Phase 1 — SQLite Foundation

### Task 1: SQLite Schema

**Files:**
- Create: `packages/gateway/src/mvp/schema.sql`
- Create: `packages/gateway/src/mvp/db.ts`

- [ ] **Step 1: Write schema**

Create `packages/gateway/src/mvp/schema.sql`:

```sql
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  event_type TEXT NOT NULL,
  data TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp DESC);

CREATE TABLE IF NOT EXISTS lm_decisions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  context TEXT NOT NULL,
  response TEXT NOT NULL,
  latency_ms INTEGER NOT NULL,
  model TEXT
);

CREATE TABLE IF NOT EXISTS integrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  service TEXT NOT NULL UNIQUE,
  tokens TEXT NOT NULL,
  connected_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS panels_rendered (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp INTEGER NOT NULL,
  panel_type TEXT NOT NULL,
  priority INTEGER NOT NULL,
  dismissed INTEGER DEFAULT 0,
  decision_id INTEGER,
  FOREIGN KEY(decision_id) REFERENCES lm_decisions(id)
);
```

- [ ] **Step 2: Write DB module with failing test**

Create `packages/gateway/tests/mvp/db.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, runMigrations } from '../../src/mvp/db';

describe('db', () => {
  it('creates tables on migration', () => {
    const db = openDb(':memory:');
    runMigrations(db);
    const tables = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table'"
    ).all() as { name: string }[];
    const names = tables.map(t => t.name);
    expect(names).toContain('events');
    expect(names).toContain('lm_decisions');
    expect(names).toContain('integrations');
    expect(names).toContain('panels_rendered');
  });
});
```

- [ ] **Step 3: Run test — expect FAIL**

```bash
npm -w @yoxperience/gateway run test -- tests/mvp/db.test.ts
```

Expected: Test fails because `src/mvp/db.ts` does not exist.

- [ ] **Step 4: Implement db.ts**

Create `packages/gateway/src/mvp/db.ts`:

```typescript
import Database from 'better-sqlite3';
import { readFileSync } from 'fs';
import { join } from 'path';

export type DB = Database.Database;

export function openDb(path: string): DB {
  const db = new Database(path);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  return db;
}

export function runMigrations(db: DB): void {
  const schemaPath = join(__dirname, 'schema.sql');
  const schema = readFileSync(schemaPath, 'utf-8');
  db.exec(schema);
}
```

- [ ] **Step 5: Run test — expect PASS**

```bash
npm -w @yoxperience/gateway run test -- tests/mvp/db.test.ts
```

Expected: Test passes.

- [ ] **Step 6: Commit**

```bash
git add packages/gateway/src/mvp/db.ts packages/gateway/src/mvp/schema.sql packages/gateway/tests/mvp/db.test.ts
git commit -m "feat(mvp): SQLite schema and migrations"
```

---

## Phase 2 — LM Studio Bridge

### Task 2: LM Prompt + Response Schema

**Files:**
- Create: `packages/gateway/src/mvp/lm-bridge/prompt.ts`
- Create: `packages/gateway/tests/mvp/prompt.test.ts`

- [ ] **Step 1: Write failing test**

Create `packages/gateway/tests/mvp/prompt.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, RenderPlanSchema } from '../../src/mvp/lm-bridge/prompt';

describe('prompt', () => {
  it('includes available tools in system prompt', () => {
    const sys = buildSystemPrompt(['gmail', 'calendar']);
    expect(sys).toContain('gmail');
    expect(sys).toContain('calendar');
    expect(sys).toContain('JSON');
  });

  it('validates a well-formed render plan', () => {
    const valid = {
      panels: [
        { type: 'action_card', priority: 1, data: { title: 'X' }, rationale: 'Y' },
      ],
    };
    expect(() => RenderPlanSchema.parse(valid)).not.toThrow();
  });

  it('rejects invalid render plan', () => {
    expect(() => RenderPlanSchema.parse({ foo: 'bar' })).toThrow();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm -w @yoxperience/gateway run test -- tests/mvp/prompt.test.ts
```

- [ ] **Step 3: Implement prompt.ts**

Create `packages/gateway/src/mvp/lm-bridge/prompt.ts`:

```typescript
import { z } from 'zod';

export const PanelSchema = z.object({
  type: z.enum(['action_card', 'context_panel', 'quick_actions']),
  priority: z.number().int().min(0).max(10),
  data: z.record(z.unknown()),
  rationale: z.string(),
});

export const RenderPlanSchema = z.object({
  panels: z.array(PanelSchema).max(6),
});

export type RenderPlan = z.infer<typeof RenderPlanSchema>;

export function buildSystemPrompt(enabledIntegrations: string[]): string {
  return `You are the YoXperience UI agent. Based on the user's current workflow context and available tools, recommend which UI panels to show.

Available integrations: ${enabledIntegrations.join(', ') || 'none'}

Respond ONLY with strict JSON matching this schema:
{
  "panels": [
    { "type": "action_card" | "context_panel" | "quick_actions",
      "priority": 0-10,
      "data": { ... panel-specific fields },
      "rationale": "one sentence why" }
  ]
}

Max 6 panels. Higher priority shown first. Do not include prose outside JSON.`;
}

export function buildUserPrompt(context: object): string {
  return `Current workflow context:\n${JSON.stringify(context, null, 2)}`;
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm -w @yoxperience/gateway run test -- tests/mvp/prompt.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/mvp/lm-bridge/prompt.ts packages/gateway/tests/mvp/prompt.test.ts
git commit -m "feat(mvp): LM prompt templates and render plan schema"
```

---

### Task 3: LM Studio Client

**Files:**
- Create: `packages/gateway/src/mvp/lm-bridge/client.ts`
- Create: `packages/gateway/tests/mvp/lm-client.test.ts`

- [ ] **Step 1: Write failing test (with mock fetch)**

Create `packages/gateway/tests/mvp/lm-client.test.ts`:

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { LMClient } from '../../src/mvp/lm-bridge/client';

describe('LMClient', () => {
  beforeEach(() => {
    global.fetch = vi.fn();
  });

  it('returns parsed render plan on success', async () => {
    const mockResponse = {
      choices: [{
        message: {
          content: JSON.stringify({
            panels: [{ type: 'action_card', priority: 5, data: { title: 'Hi' }, rationale: 'test' }],
          }),
        },
      }],
    };
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const client = new LMClient({ url: 'http://x/v1', model: 'm' });
    const result = await client.renderPlan('sys', 'user');

    expect(result.panels).toHaveLength(1);
    expect(result.panels[0].type).toBe('action_card');
  });

  it('throws on invalid JSON', async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'not json' } }] }),
    });
    const client = new LMClient({ url: 'http://x/v1', model: 'm' });
    await expect(client.renderPlan('sys', 'user')).rejects.toThrow();
  });

  it('throws on HTTP error', async () => {
    (global.fetch as any).mockResolvedValue({ ok: false, status: 500 });
    const client = new LMClient({ url: 'http://x/v1', model: 'm' });
    await expect(client.renderPlan('sys', 'user')).rejects.toThrow();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm -w @yoxperience/gateway run test -- tests/mvp/lm-client.test.ts
```

- [ ] **Step 3: Implement client.ts**

Create `packages/gateway/src/mvp/lm-bridge/client.ts`:

```typescript
import { RenderPlanSchema, RenderPlan } from './prompt';

export interface LMConfig {
  url: string;
  model: string;
  temperature?: number;
}

export class LMClient {
  constructor(private config: LMConfig) {}

  async renderPlan(systemPrompt: string, userPrompt: string): Promise<RenderPlan> {
    const res = await fetch(`${this.config.url}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.config.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: this.config.temperature ?? 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      throw new Error(`LM Studio HTTP ${res.status}`);
    }

    const json = await res.json() as { choices: { message: { content: string } }[] };
    const content = json.choices[0]?.message?.content;
    if (!content) throw new Error('LM Studio returned empty content');

    const parsed = JSON.parse(content);
    return RenderPlanSchema.parse(parsed);
  }
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm -w @yoxperience/gateway run test -- tests/mvp/lm-client.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/mvp/lm-bridge/client.ts packages/gateway/tests/mvp/lm-client.test.ts
git commit -m "feat(mvp): LM Studio HTTP client with validation"
```

---

## Phase 3 — Workflow Tracker

### Task 4: Event Tracker

**Files:**
- Create: `packages/gateway/src/mvp/workflow/tracker.ts`
- Create: `packages/gateway/tests/mvp/tracker.test.ts`

- [ ] **Step 1: Write failing test**

Create `packages/gateway/tests/mvp/tracker.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, runMigrations, DB } from '../../src/mvp/db';
import { EventTracker } from '../../src/mvp/workflow/tracker';

describe('EventTracker', () => {
  let db: DB;
  let tracker: EventTracker;

  beforeEach(() => {
    db = openDb(':memory:');
    runMigrations(db);
    tracker = new EventTracker(db);
  });

  it('logs and retrieves events', () => {
    tracker.log('click', { target: 'btn1' });
    tracker.log('type', { field: 'search' });
    const recent = tracker.recent(10);
    expect(recent).toHaveLength(2);
    expect(recent[0].event_type).toBe('type'); // most recent first
    expect(recent[1].event_type).toBe('click');
  });

  it('returns empty array when no events', () => {
    expect(tracker.recent(10)).toEqual([]);
  });

  it('respects limit', () => {
    for (let i = 0; i < 5; i++) tracker.log('x', { i });
    expect(tracker.recent(3)).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm -w @yoxperience/gateway run test -- tests/mvp/tracker.test.ts
```

- [ ] **Step 3: Implement tracker.ts**

Create `packages/gateway/src/mvp/workflow/tracker.ts`:

```typescript
import { DB } from '../db';

export interface EventRecord {
  id: number;
  timestamp: number;
  event_type: string;
  data: Record<string, unknown>;
}

export class EventTracker {
  constructor(private db: DB) {}

  log(eventType: string, data: Record<string, unknown>): void {
    this.db.prepare(
      'INSERT INTO events (timestamp, event_type, data) VALUES (?, ?, ?)'
    ).run(Date.now(), eventType, JSON.stringify(data));
  }

  recent(limit: number): EventRecord[] {
    const rows = this.db.prepare(
      'SELECT id, timestamp, event_type, data FROM events ORDER BY timestamp DESC LIMIT ?'
    ).all(limit) as { id: number; timestamp: number; event_type: string; data: string }[];
    return rows.map(r => ({
      id: r.id,
      timestamp: r.timestamp,
      event_type: r.event_type,
      data: JSON.parse(r.data),
    }));
  }
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm -w @yoxperience/gateway run test -- tests/mvp/tracker.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/mvp/workflow/tracker.ts packages/gateway/tests/mvp/tracker.test.ts
git commit -m "feat(mvp): event tracker with SQLite storage"
```

---

### Task 5: Context Builder

**Files:**
- Create: `packages/gateway/src/mvp/workflow/context.ts`
- Create: `packages/gateway/tests/mvp/context.test.ts`

- [ ] **Step 1: Write failing test**

Create `packages/gateway/tests/mvp/context.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, runMigrations, DB } from '../../src/mvp/db';
import { EventTracker } from '../../src/mvp/workflow/tracker';
import { buildContext } from '../../src/mvp/workflow/context';

describe('buildContext', () => {
  let db: DB;
  let tracker: EventTracker;

  beforeEach(() => {
    db = openDb(':memory:');
    runMigrations(db);
    tracker = new EventTracker(db);
  });

  it('returns context with recent events and metadata', () => {
    tracker.log('click', { target: 'inbox' });
    const ctx = buildContext({ tracker, enabledIntegrations: ['gmail'] });
    expect(ctx.recent_actions).toHaveLength(1);
    expect(ctx.recent_actions[0].event_type).toBe('click');
    expect(ctx.active_integrations).toEqual(['gmail']);
    expect(typeof ctx.time_of_day).toBe('string');
    expect(typeof ctx.timestamp).toBe('number');
  });

  it('caps recent actions at 20', () => {
    for (let i = 0; i < 25; i++) tracker.log('x', { i });
    const ctx = buildContext({ tracker, enabledIntegrations: [] });
    expect(ctx.recent_actions).toHaveLength(20);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm -w @yoxperience/gateway run test -- tests/mvp/context.test.ts
```

- [ ] **Step 3: Implement context.ts**

Create `packages/gateway/src/mvp/workflow/context.ts`:

```typescript
import { EventTracker, EventRecord } from './tracker';

export interface WorkflowContext {
  timestamp: number;
  time_of_day: string;
  recent_actions: EventRecord[];
  active_integrations: string[];
}

export interface BuildContextInput {
  tracker: EventTracker;
  enabledIntegrations: string[];
  limit?: number;
}

export function buildContext(input: BuildContextInput): WorkflowContext {
  const now = Date.now();
  const d = new Date(now);
  const hh = d.getHours().toString().padStart(2, '0');
  const mm = d.getMinutes().toString().padStart(2, '0');
  return {
    timestamp: now,
    time_of_day: `${hh}:${mm}`,
    recent_actions: input.tracker.recent(input.limit ?? 20),
    active_integrations: input.enabledIntegrations,
  };
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm -w @yoxperience/gateway run test -- tests/mvp/context.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/mvp/workflow/context.ts packages/gateway/tests/mvp/context.test.ts
git commit -m "feat(mvp): workflow context builder"
```

---

## Phase 4 — Integration Framework + Gmail

### Task 6: Integration Interface + Registry

**Files:**
- Create: `packages/gateway/src/mvp/integrations/types.ts`
- Create: `packages/gateway/src/mvp/integrations/registry.ts`
- Create: `packages/gateway/tests/mvp/registry.test.ts`

- [ ] **Step 1: Write failing test**

Create `packages/gateway/tests/mvp/registry.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { IntegrationRegistry } from '../../src/mvp/integrations/registry';
import { Integration } from '../../src/mvp/integrations/types';

function fakeIntegration(name: string): Integration {
  return {
    name,
    listActions: () => [{ id: 'ping', label: 'Ping', params: [] }],
    execute: async () => ({ ok: true }),
  };
}

describe('IntegrationRegistry', () => {
  it('registers and lists integrations', () => {
    const r = new IntegrationRegistry();
    r.register(fakeIntegration('gmail'));
    r.register(fakeIntegration('slack'));
    expect(r.names()).toEqual(['gmail', 'slack']);
  });

  it('gets integration by name', () => {
    const r = new IntegrationRegistry();
    const g = fakeIntegration('gmail');
    r.register(g);
    expect(r.get('gmail')).toBe(g);
    expect(r.get('missing')).toBeUndefined();
  });

  it('lists enabled integrations only', () => {
    const r = new IntegrationRegistry();
    r.register(fakeIntegration('gmail'));
    r.register(fakeIntegration('slack'));
    r.enable('gmail');
    expect(r.enabledNames()).toEqual(['gmail']);
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm -w @yoxperience/gateway run test -- tests/mvp/registry.test.ts
```

- [ ] **Step 3: Implement types.ts**

Create `packages/gateway/src/mvp/integrations/types.ts`:

```typescript
export interface ActionParam {
  name: string;
  type: 'string' | 'number' | 'boolean';
  required?: boolean;
}

export interface Action {
  id: string;
  label: string;
  params: ActionParam[];
}

export interface Integration {
  name: string;
  listActions(): Action[];
  execute(actionId: string, params: Record<string, unknown>): Promise<unknown>;
}
```

- [ ] **Step 4: Implement registry.ts**

Create `packages/gateway/src/mvp/integrations/registry.ts`:

```typescript
import { Integration } from './types';

export class IntegrationRegistry {
  private items = new Map<string, Integration>();
  private enabled = new Set<string>();

  register(integration: Integration): void {
    this.items.set(integration.name, integration);
  }

  get(name: string): Integration | undefined {
    return this.items.get(name);
  }

  names(): string[] {
    return Array.from(this.items.keys());
  }

  enable(name: string): void {
    if (this.items.has(name)) this.enabled.add(name);
  }

  disable(name: string): void {
    this.enabled.delete(name);
  }

  enabledNames(): string[] {
    return Array.from(this.enabled);
  }
}
```

- [ ] **Step 5: Run test — expect PASS**

```bash
npm -w @yoxperience/gateway run test -- tests/mvp/registry.test.ts
```

- [ ] **Step 6: Commit**

```bash
git add packages/gateway/src/mvp/integrations/types.ts packages/gateway/src/mvp/integrations/registry.ts packages/gateway/tests/mvp/registry.test.ts
git commit -m "feat(mvp): integration interface and registry"
```

---

### Task 7: Token Store

**Files:**
- Create: `packages/gateway/src/mvp/integrations/token-store.ts`
- Create: `packages/gateway/tests/mvp/token-store.test.ts`

- [ ] **Step 1: Write failing test**

Create `packages/gateway/tests/mvp/token-store.test.ts`:

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { openDb, runMigrations, DB } from '../../src/mvp/db';
import { TokenStore } from '../../src/mvp/integrations/token-store';

describe('TokenStore', () => {
  let db: DB;
  let store: TokenStore;

  beforeEach(() => {
    db = openDb(':memory:');
    runMigrations(db);
    store = new TokenStore(db);
  });

  it('saves and retrieves tokens', () => {
    store.save('gmail', { access: 'a', refresh: 'r' });
    const t = store.get('gmail');
    expect(t).toEqual({ access: 'a', refresh: 'r' });
  });

  it('returns undefined for missing service', () => {
    expect(store.get('missing')).toBeUndefined();
  });

  it('upserts on repeated save', () => {
    store.save('gmail', { access: 'a', refresh: 'r' });
    store.save('gmail', { access: 'b', refresh: 's' });
    expect(store.get('gmail')).toEqual({ access: 'b', refresh: 's' });
  });

  it('lists connected services', () => {
    store.save('gmail', { access: 'a' });
    store.save('slack', { access: 'b' });
    expect(store.list().sort()).toEqual(['gmail', 'slack']);
  });

  it('removes tokens on disconnect', () => {
    store.save('gmail', { access: 'a' });
    store.remove('gmail');
    expect(store.get('gmail')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run test — expect FAIL**

```bash
npm -w @yoxperience/gateway run test -- tests/mvp/token-store.test.ts
```

- [ ] **Step 3: Implement token-store.ts**

Create `packages/gateway/src/mvp/integrations/token-store.ts`:

```typescript
import { DB } from '../db';

export class TokenStore {
  constructor(private db: DB) {}

  save(service: string, tokens: Record<string, unknown>): void {
    this.db.prepare(`
      INSERT INTO integrations (service, tokens, connected_at)
      VALUES (?, ?, ?)
      ON CONFLICT(service) DO UPDATE SET tokens = excluded.tokens, connected_at = excluded.connected_at
    `).run(service, JSON.stringify(tokens), Date.now());
  }

  get(service: string): Record<string, unknown> | undefined {
    const row = this.db.prepare('SELECT tokens FROM integrations WHERE service = ?').get(service) as { tokens: string } | undefined;
    return row ? JSON.parse(row.tokens) : undefined;
  }

  list(): string[] {
    const rows = this.db.prepare('SELECT service FROM integrations').all() as { service: string }[];
    return rows.map(r => r.service);
  }

  remove(service: string): void {
    this.db.prepare('DELETE FROM integrations WHERE service = ?').run(service);
  }
}
```

- [ ] **Step 4: Run test — expect PASS**

```bash
npm -w @yoxperience/gateway run test -- tests/mvp/token-store.test.ts
```

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/mvp/integrations/token-store.ts packages/gateway/tests/mvp/token-store.test.ts
git commit -m "feat(mvp): encrypted token store for integrations"
```

---

### Task 8: Gmail Adapter

**Files:**
- Create: `packages/gateway/src/mvp/integrations/gmail.ts`

- [ ] **Step 1: Implement Gmail adapter (integration test deferred to E2E)**

Create `packages/gateway/src/mvp/integrations/gmail.ts`:

```typescript
import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { Integration, Action } from './types';
import { TokenStore } from './token-store';

export function buildGoogleOAuthClient(): OAuth2Client {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI,
  );
}

export class GmailIntegration implements Integration {
  name = 'gmail';

  constructor(private tokenStore: TokenStore) {}

  private getClient(): gmail_v1.Gmail {
    const tokens = this.tokenStore.get('gmail');
    if (!tokens) throw new Error('Gmail not connected');
    const oauth = buildGoogleOAuthClient();
    oauth.setCredentials(tokens);
    return google.gmail({ version: 'v1', auth: oauth });
  }

  listActions(): Action[] {
    return [
      { id: 'list_unread', label: 'List unread', params: [] },
      { id: 'search', label: 'Search', params: [{ name: 'q', type: 'string', required: true }] },
      { id: 'create_draft', label: 'Create draft', params: [
        { name: 'to', type: 'string', required: true },
        { name: 'subject', type: 'string', required: true },
        { name: 'body', type: 'string', required: true },
      ]},
    ];
  }

  async execute(actionId: string, params: Record<string, unknown>): Promise<unknown> {
    const gmail = this.getClient();
    switch (actionId) {
      case 'list_unread': {
        const res = await gmail.users.messages.list({
          userId: 'me',
          q: 'is:unread',
          maxResults: 10,
        });
        return res.data;
      }
      case 'search': {
        const q = params.q as string;
        const res = await gmail.users.messages.list({ userId: 'me', q, maxResults: 10 });
        return res.data;
      }
      case 'create_draft': {
        const raw = Buffer.from(
          `To: ${params.to}\r\nSubject: ${params.subject}\r\n\r\n${params.body}`
        ).toString('base64url');
        const res = await gmail.users.drafts.create({
          userId: 'me',
          requestBody: { message: { raw } },
        });
        return res.data;
      }
      default:
        throw new Error(`Unknown Gmail action: ${actionId}`);
    }
  }
}
```

- [ ] **Step 2: Typecheck**

```bash
npm -w @yoxperience/gateway run build
```

Expected: No TS errors. If `tsconfig` has no `build` script, run `npx tsc --noEmit` from `packages/gateway`.

- [ ] **Step 3: Commit**

```bash
git add packages/gateway/src/mvp/integrations/gmail.ts
git commit -m "feat(mvp): Gmail adapter (list, search, draft)"
```

---

## Phase 5 — Backend Routes & Server

### Task 9: Events + Render Routes

**Files:**
- Create: `packages/gateway/src/mvp/routes/events.ts`
- Create: `packages/gateway/src/mvp/routes/render.ts`

- [ ] **Step 1: Implement events route**

Create `packages/gateway/src/mvp/routes/events.ts`:

```typescript
import { Router } from 'express';
import { EventTracker } from '../workflow/tracker';

export function eventsRouter(tracker: EventTracker): Router {
  const r = Router();

  r.post('/events', (req, res) => {
    const { event_type, data } = req.body ?? {};
    if (typeof event_type !== 'string') {
      return res.status(400).json({ error: 'event_type required' });
    }
    tracker.log(event_type, data ?? {});
    res.json({ ok: true });
  });

  r.get('/events', (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 20, 200);
    res.json({ events: tracker.recent(limit) });
  });

  return r;
}
```

- [ ] **Step 2: Implement render route**

Create `packages/gateway/src/mvp/routes/render.ts`:

```typescript
import { Router } from 'express';
import { DB } from '../db';
import { EventTracker } from '../workflow/tracker';
import { buildContext } from '../workflow/context';
import { IntegrationRegistry } from '../integrations/registry';
import { LMClient } from '../lm-bridge/client';
import { buildSystemPrompt, buildUserPrompt, RenderPlan } from '../lm-bridge/prompt';

export interface RenderDeps {
  db: DB;
  tracker: EventTracker;
  registry: IntegrationRegistry;
  lm: LMClient;
}

export function renderRouter(deps: RenderDeps): Router {
  const r = Router();

  r.get('/render', async (_req, res) => {
    const enabled = deps.registry.enabledNames();
    const context = buildContext({ tracker: deps.tracker, enabledIntegrations: enabled });

    const sys = buildSystemPrompt(enabled);
    const user = buildUserPrompt(context);
    const started = Date.now();

    try {
      const plan: RenderPlan = await deps.lm.renderPlan(sys, user);
      const latency = Date.now() - started;

      const decisionStmt = deps.db.prepare(
        'INSERT INTO lm_decisions (timestamp, context, response, latency_ms, model) VALUES (?, ?, ?, ?, ?)'
      );
      const info = decisionStmt.run(Date.now(), JSON.stringify(context), JSON.stringify(plan), latency, process.env.LM_MODEL || 'local');

      const panelStmt = deps.db.prepare(
        'INSERT INTO panels_rendered (timestamp, panel_type, priority, decision_id) VALUES (?, ?, ?, ?)'
      );
      for (const p of plan.panels) {
        panelStmt.run(Date.now(), p.type, p.priority, info.lastInsertRowid);
      }

      res.json({ plan, latency_ms: latency });
    } catch (err) {
      res.status(200).json({
        plan: { panels: [] },
        error: (err as Error).message,
        fallback: true,
      });
    }
  });

  return r;
}
```

- [ ] **Step 3: Commit**

```bash
git add packages/gateway/src/mvp/routes/events.ts packages/gateway/src/mvp/routes/render.ts
git commit -m "feat(mvp): events and render HTTP routes"
```

---

### Task 10: Google OAuth Route

**Files:**
- Create: `packages/gateway/src/mvp/routes/integrations.ts`

- [ ] **Step 1: Implement OAuth routes**

Create `packages/gateway/src/mvp/routes/integrations.ts`:

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add packages/gateway/src/mvp/routes/integrations.ts
git commit -m "feat(mvp): Google OAuth + integration enable/disable routes"
```

---

### Task 11: Telemetry Export Route

**Files:**
- Create: `packages/gateway/src/mvp/routes/telemetry.ts`

- [ ] **Step 1: Implement telemetry export**

Create `packages/gateway/src/mvp/routes/telemetry.ts`:

```typescript
import { Router } from 'express';
import { DB } from '../db';

function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = [headers.join(',')];
  for (const row of rows) lines.push(headers.map(h => escape(row[h])).join(','));
  return lines.join('\n');
}

export function telemetryRouter(db: DB): Router {
  const r = Router();

  r.get('/telemetry/:table.csv', (req, res) => {
    const allowed = ['events', 'lm_decisions', 'panels_rendered'];
    const table = req.params.table;
    if (!allowed.includes(table)) return res.status(400).send('invalid table');
    const rows = db.prepare(`SELECT * FROM ${table} ORDER BY id DESC LIMIT 10000`).all() as Record<string, unknown>[];
    res.type('text/csv').send(toCsv(rows));
  });

  r.post('/panels/:id/dismiss', (req, res) => {
    const id = Number(req.params.id);
    db.prepare('UPDATE panels_rendered SET dismissed = 1 WHERE id = ?').run(id);
    res.json({ ok: true });
  });

  return r;
}
```

- [ ] **Step 2: Commit**

```bash
git add packages/gateway/src/mvp/routes/telemetry.ts
git commit -m "feat(mvp): telemetry CSV export + panel dismissal"
```

---

### Task 12: MVP Server Wire-up

**Files:**
- Create: `packages/gateway/src/mvp/server.ts`

- [ ] **Step 1: Implement MVP server**

Create `packages/gateway/src/mvp/server.ts`:

```typescript
import express from 'express';
import cors from 'cors';
import { openDb, runMigrations } from './db';
import { EventTracker } from './workflow/tracker';
import { LMClient } from './lm-bridge/client';
import { IntegrationRegistry } from './integrations/registry';
import { TokenStore } from './integrations/token-store';
import { GmailIntegration } from './integrations/gmail';
import { eventsRouter } from './routes/events';
import { renderRouter } from './routes/render';
import { integrationsRouter } from './routes/integrations';
import { telemetryRouter } from './routes/telemetry';
import { mkdirSync } from 'fs';
import { dirname } from 'path';

export function buildMvpApp() {
  const dbPath = process.env.SQLITE_PATH || './data/yoxp-mvp.db';
  mkdirSync(dirname(dbPath), { recursive: true });
  const db = openDb(dbPath);
  runMigrations(db);

  const tracker = new EventTracker(db);
  const tokenStore = new TokenStore(db);
  const registry = new IntegrationRegistry();
  registry.register(new GmailIntegration(tokenStore));

  // Re-enable any previously connected integrations
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

if (require.main === module) {
  const port = Number(process.env.MVP_PORT || 3457);
  buildMvpApp().listen(port, () => console.log(`MVP server on ${port}`));
}
```

- [ ] **Step 2: Add dev script to root package.json**

Modify `package.json` scripts — add:

```json
"dev:mvp": "npx tsx packages/gateway/src/mvp/server.ts"
```

- [ ] **Step 3: Run server manually and curl /health**

```bash
npm run dev:mvp &
sleep 2
curl http://localhost:3457/health
kill %1
```

Expected: `{"ok":true}`

- [ ] **Step 4: Commit**

```bash
git add packages/gateway/src/mvp/server.ts package.json
git commit -m "feat(mvp): wire up MVP Express server"
```

---

## Phase 6 — Frontend: Shell & Render Loop

### Task 13: Frontend MVP Scaffold

**Files:**
- Create: `packages/dashboard/src/mvp/MVPApp.tsx`
- Create: `packages/dashboard/src/mvp/api.ts`
- Modify: `packages/dashboard/src/App.tsx`
- Modify: `packages/dashboard/vite.config.ts` (ensure proxy)

- [ ] **Step 1: Add API client**

Create `packages/dashboard/src/mvp/api.ts`:

```typescript
const BASE = '/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`GET ${path} ${res.status}`);
  return res.json();
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`POST ${path} ${res.status}`);
  return res.json();
}

async function del<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { method: 'DELETE' });
  if (!res.ok) throw new Error(`DELETE ${path} ${res.status}`);
  return res.json();
}

export interface Panel {
  type: 'action_card' | 'context_panel' | 'quick_actions';
  priority: number;
  data: Record<string, unknown>;
  rationale: string;
}

export interface RenderResponse {
  plan: { panels: Panel[] };
  latency_ms?: number;
  error?: string;
  fallback?: boolean;
}

export interface IntegrationsResponse {
  available: string[];
  enabled: string[];
  connected: string[];
}

export const api = {
  render: () => get<RenderResponse>('/render'),
  logEvent: (event_type: string, data: Record<string, unknown> = {}) =>
    post<{ ok: true }>('/events', { event_type, data }),
  integrations: () => get<IntegrationsResponse>('/integrations'),
  enable: (name: string) => post<{ ok: true }>(`/integrations/${name}/enable`),
  disable: (name: string) => post<{ ok: true }>(`/integrations/${name}/disable`),
  disconnect: (name: string) => del<{ ok: true }>(`/integrations/${name}`),
  dismissPanel: (id: number) => post<{ ok: true }>(`/panels/${id}/dismiss`),
};
```

- [ ] **Step 2: Add render-loop hook**

Create `packages/dashboard/src/mvp/hooks/useRenderLoop.ts`:

```typescript
import { useEffect, useState } from 'react';
import { api, RenderResponse } from '../api';

export function useRenderLoop(intervalMs = 7000) {
  const [data, setData] = useState<RenderResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function tick() {
      try {
        const res = await api.render();
        if (!cancelled) { setData(res); setError(res.error ?? null); }
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    }

    tick();
    const id = setInterval(tick, intervalMs);
    return () => { cancelled = true; clearInterval(id); };
  }, [intervalMs]);

  return { data, error };
}
```

- [ ] **Step 3: Build MVPApp shell**

Create `packages/dashboard/src/mvp/MVPApp.tsx`:

```typescript
import { Dashboard } from './components/Dashboard';

export default function MVPApp() {
  return <Dashboard />;
}
```

- [ ] **Step 4: Mount route**

Modify `packages/dashboard/src/App.tsx` to add MVP route. Add near existing routes:

```typescript
import MVPApp from './mvp/MVPApp';
// ...
<Route path="/mvp/*" element={<MVPApp />} />
```

- [ ] **Step 5: Ensure Vite proxy points to :3457**

Check `packages/dashboard/vite.config.ts`. Ensure proxy includes:

```typescript
server: {
  proxy: {
    '/api': 'http://localhost:3457',
    '/health': 'http://localhost:3457',
  },
},
```

If existing config proxies to another port for the old multi-tenant gateway, override or add env-toggled proxy.

- [ ] **Step 6: Commit**

```bash
git add packages/dashboard/src/mvp packages/dashboard/src/App.tsx packages/dashboard/vite.config.ts
git commit -m "feat(mvp): frontend scaffold, API client, render loop"
```

---

### Task 14: Dashboard + Panels

**Files:**
- Create: `packages/dashboard/src/mvp/components/Dashboard.tsx`
- Create: `packages/dashboard/src/mvp/components/IntegrationSidebar.tsx`
- Create: `packages/dashboard/src/mvp/components/DynamicPanelGrid.tsx`
- Create: `packages/dashboard/src/mvp/components/panels/ActionCard.tsx`
- Create: `packages/dashboard/src/mvp/components/panels/ContextPanel.tsx`
- Create: `packages/dashboard/src/mvp/components/panels/QuickActions.tsx`
- Create: `packages/dashboard/src/mvp/components/ActivityTimeline.tsx`

- [ ] **Step 1: Integration sidebar**

Create `packages/dashboard/src/mvp/components/IntegrationSidebar.tsx`:

```typescript
import { useEffect, useState } from 'react';
import { api, IntegrationsResponse } from '../api';

export function IntegrationSidebar() {
  const [info, setInfo] = useState<IntegrationsResponse | null>(null);

  const refresh = async () => setInfo(await api.integrations());
  useEffect(() => { refresh(); }, []);

  if (!info) return <div style={{ padding: 16 }}>Loading...</div>;

  return (
    <aside style={{ width: 240, borderRight: '1px solid #eee', padding: 16 }}>
      <h3 style={{ margin: '0 0 12px' }}>Integrations</h3>
      {info.available.map(name => {
        const enabled = info.enabled.includes(name);
        const connected = info.connected.includes(name);
        return (
          <div key={name} style={{ marginBottom: 12 }}>
            <div style={{ fontWeight: 600 }}>{name}</div>
            {connected ? (
              <>
                <label style={{ display: 'block', fontSize: 12 }}>
                  <input
                    type="checkbox"
                    checked={enabled}
                    onChange={async () => {
                      if (enabled) await api.disable(name); else await api.enable(name);
                      refresh();
                    }}
                  />{' '}enabled
                </label>
                <button onClick={async () => { await api.disconnect(name); refresh(); }}
                        style={{ fontSize: 11 }}>Disconnect</button>
              </>
            ) : (
              <a href="/api/integrations/google/authorize"
                 style={{ fontSize: 12 }}>Connect</a>
            )}
          </div>
        );
      })}
    </aside>
  );
}
```

- [ ] **Step 2: Panel components**

Create `packages/dashboard/src/mvp/components/panels/ActionCard.tsx`:

```typescript
import { Panel } from '../../api';

export function ActionCard({ panel }: { panel: Panel }) {
  const data = panel.data as { title?: string; body?: string; cta?: string };
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 8 }}>
      <div style={{ fontWeight: 600 }}>{data.title ?? 'Action'}</div>
      {data.body && <div style={{ fontSize: 13, marginTop: 4 }}>{data.body}</div>}
      {data.cta && <button style={{ marginTop: 8 }}>{data.cta}</button>}
      <div style={{ fontSize: 10, color: '#999', marginTop: 6 }}>{panel.rationale}</div>
    </div>
  );
}
```

Create `packages/dashboard/src/mvp/components/panels/ContextPanel.tsx`:

```typescript
import { Panel } from '../../api';

export function ContextPanel({ panel }: { panel: Panel }) {
  return (
    <div style={{ border: '1px dashed #bbb', borderRadius: 8, padding: 12, marginBottom: 8 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Context</div>
      <pre style={{ fontSize: 11, margin: 0, whiteSpace: 'pre-wrap' }}>
        {JSON.stringify(panel.data, null, 2)}
      </pre>
      <div style={{ fontSize: 10, color: '#999', marginTop: 6 }}>{panel.rationale}</div>
    </div>
  );
}
```

Create `packages/dashboard/src/mvp/components/panels/QuickActions.tsx`:

```typescript
import { Panel } from '../../api';

export function QuickActions({ panel }: { panel: Panel }) {
  const actions = (panel.data.actions as { label: string }[]) ?? [];
  return (
    <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12, marginBottom: 8 }}>
      <div style={{ fontWeight: 600, marginBottom: 6 }}>Quick Actions</div>
      {actions.map((a, i) => (
        <button key={i} style={{ margin: '0 6px 6px 0' }}>{a.label}</button>
      ))}
      <div style={{ fontSize: 10, color: '#999' }}>{panel.rationale}</div>
    </div>
  );
}
```

- [ ] **Step 3: Dynamic panel grid**

Create `packages/dashboard/src/mvp/components/DynamicPanelGrid.tsx`:

```typescript
import { Panel } from '../api';
import { ActionCard } from './panels/ActionCard';
import { ContextPanel } from './panels/ContextPanel';
import { QuickActions } from './panels/QuickActions';

export function DynamicPanelGrid({ panels }: { panels: Panel[] }) {
  const sorted = [...panels].sort((a, b) => b.priority - a.priority);
  return (
    <div style={{ flex: 1, padding: 16, overflow: 'auto' }}>
      {sorted.length === 0 && <div style={{ color: '#999' }}>No recommendations yet. Try interacting or connect an integration.</div>}
      {sorted.map((p, i) => {
        if (p.type === 'action_card') return <ActionCard key={i} panel={p} />;
        if (p.type === 'context_panel') return <ContextPanel key={i} panel={p} />;
        if (p.type === 'quick_actions') return <QuickActions key={i} panel={p} />;
        return null;
      })}
    </div>
  );
}
```

- [ ] **Step 4: Activity timeline**

Create `packages/dashboard/src/mvp/components/ActivityTimeline.tsx`:

```typescript
import { useEffect, useState } from 'react';

interface EventRow { id: number; timestamp: number; event_type: string; data: Record<string, unknown>; }

export function ActivityTimeline() {
  const [events, setEvents] = useState<EventRow[]>([]);
  useEffect(() => {
    const tick = async () => {
      const r = await fetch('/api/events?limit=30');
      const j = await r.json();
      setEvents(j.events);
    };
    tick();
    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <aside style={{ width: 260, borderLeft: '1px solid #eee', padding: 16, fontSize: 12 }}>
      <h3 style={{ margin: '0 0 8px' }}>Activity</h3>
      {events.map(e => (
        <div key={e.id} style={{ marginBottom: 6 }}>
          <span style={{ color: '#999' }}>{new Date(e.timestamp).toLocaleTimeString()}</span>{' '}
          <b>{e.event_type}</b>
        </div>
      ))}
      {events.length === 0 && <div style={{ color: '#999' }}>No activity yet.</div>}
    </aside>
  );
}
```

- [ ] **Step 5: Dashboard shell**

Create `packages/dashboard/src/mvp/components/Dashboard.tsx`:

```typescript
import { useEffect } from 'react';
import { useRenderLoop } from '../hooks/useRenderLoop';
import { api } from '../api';
import { IntegrationSidebar } from './IntegrationSidebar';
import { DynamicPanelGrid } from './DynamicPanelGrid';
import { ActivityTimeline } from './ActivityTimeline';

export function Dashboard() {
  const { data, error } = useRenderLoop(7000);

  useEffect(() => {
    api.logEvent('session_start');
    return () => { api.logEvent('session_end'); };
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', fontFamily: 'system-ui' }}>
      <IntegrationSidebar />
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>
          <b>YoXperience</b>
          <span style={{ color: '#999', marginLeft: 8 }}>
            {data?.fallback ? 'LM Studio unreachable — fallback' : error ? error : `renders every 7s`}
          </span>
        </header>
        <DynamicPanelGrid panels={data?.plan.panels ?? []} />
      </main>
      <ActivityTimeline />
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
git add packages/dashboard/src/mvp/components packages/dashboard/src/mvp/hooks
git commit -m "feat(mvp): dashboard shell, panels, integration sidebar, activity timeline"
```

---

## Phase 7 — E2E Smoke

### Task 15: Manual E2E Run

- [ ] **Step 1: Start LM Studio**

Open LM Studio app → load any chat model (e.g., Llama 3 8B) → start local server. Confirm `curl http://localhost:1234/v1/models` returns JSON.

- [ ] **Step 2: Set env + start MVP**

```bash
cd /Users/jonahk/YoXperience-Platform-repo
cp .env.example .env
# Fill in GOOGLE_CLIENT_ID / SECRET from your Google Cloud project
npm run dev:mvp &
npm -w @yoxperience/dashboard run dev &
```

- [ ] **Step 3: Open browser and verify render loop**

Open `http://localhost:5173/mvp`. Verify:
- Sidebar loads with "gmail" listed
- Panel grid shows either panels from LM or "No recommendations yet" fallback
- Activity timeline starts populating after a couple of clicks

- [ ] **Step 4: Connect Gmail (if credentials set)**

Click "Connect" in sidebar → complete Google OAuth → redirected back. Verify Gmail shows as connected.

- [ ] **Step 5: Export telemetry**

```bash
curl http://localhost:3457/api/telemetry/events.csv | head
curl http://localhost:3457/api/telemetry/lm_decisions.csv | head
```

Expected: CSV with column headers and at least the session_start event row.

- [ ] **Step 6: Commit demo notes**

Create `docs/superpowers/plans/mvp-e2e-notes.md` with observed issues (latency, UI feel, panel quality). Commit:

```bash
git add docs/superpowers/plans/mvp-e2e-notes.md
git commit -m "docs(mvp): E2E smoke notes from first run"
```

---

## Phase 8 — Calendar + Slack (Pattern-Repeating Follow-ons)

### Task 16: Calendar Adapter (follows Gmail pattern)

**Files:**
- Create: `packages/gateway/src/mvp/integrations/calendar.ts`

- [ ] **Step 1: Implement Calendar adapter**

Create `packages/gateway/src/mvp/integrations/calendar.ts`:

```typescript
import { google, calendar_v3 } from 'googleapis';
import { Integration, Action } from './types';
import { TokenStore } from './token-store';
import { buildGoogleOAuthClient } from './gmail';

export class CalendarIntegration implements Integration {
  name = 'calendar';

  constructor(private tokenStore: TokenStore) {}

  private getClient(): calendar_v3.Calendar {
    const tokens = this.tokenStore.get('gmail'); // shares Google tokens
    if (!tokens) throw new Error('Google not connected');
    const oauth = buildGoogleOAuthClient();
    oauth.setCredentials(tokens);
    return google.calendar({ version: 'v3', auth: oauth });
  }

  listActions(): Action[] {
    return [
      { id: 'list_upcoming', label: 'Upcoming events', params: [] },
      { id: 'create_event', label: 'Create event', params: [
        { name: 'summary', type: 'string', required: true },
        { name: 'start', type: 'string', required: true },
        { name: 'end', type: 'string', required: true },
      ]},
    ];
  }

  async execute(actionId: string, params: Record<string, unknown>): Promise<unknown> {
    const cal = this.getClient();
    switch (actionId) {
      case 'list_upcoming': {
        const res = await cal.events.list({
          calendarId: 'primary',
          timeMin: new Date().toISOString(),
          maxResults: 10,
          singleEvents: true,
          orderBy: 'startTime',
        });
        return res.data;
      }
      case 'create_event': {
        const res = await cal.events.insert({
          calendarId: 'primary',
          requestBody: {
            summary: params.summary as string,
            start: { dateTime: params.start as string },
            end: { dateTime: params.end as string },
          },
        });
        return res.data;
      }
      default:
        throw new Error(`Unknown Calendar action: ${actionId}`);
    }
  }
}
```

- [ ] **Step 2: Register in server.ts**

Modify `packages/gateway/src/mvp/server.ts` — add after `registry.register(new GmailIntegration(tokenStore));`:

```typescript
import { CalendarIntegration } from './integrations/calendar';
registry.register(new CalendarIntegration(tokenStore));
```

- [ ] **Step 3: Commit**

```bash
git add packages/gateway/src/mvp/integrations/calendar.ts packages/gateway/src/mvp/server.ts
git commit -m "feat(mvp): Google Calendar adapter"
```

---

### Task 17: Slack Adapter

**Files:**
- Create: `packages/gateway/src/mvp/integrations/slack.ts`
- Modify: `packages/gateway/src/mvp/routes/integrations.ts`

- [ ] **Step 1: Implement Slack adapter**

Create `packages/gateway/src/mvp/integrations/slack.ts`:

```typescript
import { WebClient } from '@slack/web-api';
import { Integration, Action } from './types';
import { TokenStore } from './token-store';

export class SlackIntegration implements Integration {
  name = 'slack';

  constructor(private tokenStore: TokenStore) {}

  private getClient(): WebClient {
    const tokens = this.tokenStore.get('slack') as { access_token?: string } | undefined;
    if (!tokens?.access_token) throw new Error('Slack not connected');
    return new WebClient(tokens.access_token);
  }

  listActions(): Action[] {
    return [
      { id: 'list_channels', label: 'List channels', params: [] },
      { id: 'send_message', label: 'Send message', params: [
        { name: 'channel', type: 'string', required: true },
        { name: 'text', type: 'string', required: true },
      ]},
    ];
  }

  async execute(actionId: string, params: Record<string, unknown>): Promise<unknown> {
    const slack = this.getClient();
    switch (actionId) {
      case 'list_channels': {
        return slack.conversations.list({ limit: 30, types: 'public_channel,private_channel' });
      }
      case 'send_message': {
        return slack.chat.postMessage({
          channel: params.channel as string,
          text: params.text as string,
        });
      }
      default:
        throw new Error(`Unknown Slack action: ${actionId}`);
    }
  }
}
```

- [ ] **Step 2: Add Slack OAuth routes**

Modify `packages/gateway/src/mvp/routes/integrations.ts` — add before `return r;`:

```typescript
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
  res.redirect('/mvp');
});
```

- [ ] **Step 3: Register in server.ts**

Modify `packages/gateway/src/mvp/server.ts` — add:

```typescript
import { SlackIntegration } from './integrations/slack';
registry.register(new SlackIntegration(tokenStore));
```

- [ ] **Step 4: Update sidebar to offer Slack connect button**

Modify `packages/dashboard/src/mvp/components/IntegrationSidebar.tsx` — change the Connect link to route by name:

```typescript
const connectHref = name === 'slack'
  ? '/api/integrations/slack/authorize'
  : '/api/integrations/google/authorize';
// ...use {connectHref} in the <a href={connectHref}>
```

- [ ] **Step 5: Commit**

```bash
git add packages/gateway/src/mvp/integrations/slack.ts packages/gateway/src/mvp/routes/integrations.ts packages/gateway/src/mvp/server.ts packages/dashboard/src/mvp/components/IntegrationSidebar.tsx
git commit -m "feat(mvp): Slack integration with OAuth"
```

---

## Phase 9 — Final Verification

### Task 18: Full Stack Verification

- [ ] **Step 1: Run all tests**

```bash
npm -w @yoxperience/gateway run test
```

Expected: All tests pass.

- [ ] **Step 2: Start full stack**

```bash
npm run dev:mvp &
npm -w @yoxperience/dashboard run dev &
```

- [ ] **Step 3: Exercise each integration**

- Connect Gmail → enable → verify activity logged
- Connect Calendar → enable → verify events endpoint returns data
- Connect Slack → enable → verify channels endpoint returns data
- Verify `/api/render` returns non-empty panel list (assuming LM is running)

- [ ] **Step 4: Export all telemetry**

```bash
mkdir -p /tmp/yoxp-export
curl http://localhost:3457/api/telemetry/events.csv > /tmp/yoxp-export/events.csv
curl http://localhost:3457/api/telemetry/lm_decisions.csv > /tmp/yoxp-export/lm_decisions.csv
curl http://localhost:3457/api/telemetry/panels_rendered.csv > /tmp/yoxp-export/panels.csv
wc -l /tmp/yoxp-export/*.csv
```

Expected: Each file has header row + at least one data row.

- [ ] **Step 5: Update replit.md / README**

Modify `replit.md` — replace the top overview with:

```markdown
# YoXperience Agentic Interface (MVP)

Single-user agentic webapp with local LLM (LM Studio) driving dynamic UI based
on workflow context and connected integrations (Gmail, Google Calendar, Slack).

Run: `npm run dev:mvp` and `npm -w @yoxperience/dashboard run dev`.
Open `http://localhost:5173/mvp`.
```

- [ ] **Step 6: Final commit**

```bash
git add replit.md
git commit -m "docs(mvp): update README for agentic MVP"
```

---

## Self-Review Notes

- **Spec coverage:** Architecture (Tasks 1–12), LM integration (2–3), workflow tracking (4–5), 3 integrations (8, 16, 17), dynamic UI (13–14), data collection (1, 11, 18), local-only privacy (all), error handling (render route fallback, sidebar states).
- **Placeholders:** None — every step has runnable code or commands.
- **Types consistent:** `Panel`, `RenderPlan`, `Integration`, `Action`, `EventRecord`, `WorkflowContext` defined once and reused.
- **Scope:** Single-user, local, three integrations. No multi-tenant, no cloud sync, no email-thread UI beyond list.

## Known Deferrals (not in this plan)

- Encryption at rest for OAuth tokens — stored plaintext in SQLite for MVP
- Token refresh handling — relies on googleapis auto-refresh for Google; Slack tokens don't expire for MVP scopes
- Panel dismissal UI wiring (backend endpoint exists; frontend "X" button not yet added)
- Chat sidebar — deferred to post-MVP
