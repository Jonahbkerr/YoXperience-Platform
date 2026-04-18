# YoXperience Agentic Interface MVP — Design Spec

**Date:** 2026-04-18
**Author:** Jonah Kerr
**Status:** Draft — pending review

## Context

YoXperience is pivoting from a B2B "adaptive UI engine for SaaS applications" to a **user-facing agentic interface**. The new vision: a unified webapp where a local AI model (via LM Studio) adapts the UI to each user based on their workflow patterns and available integrations. The user stays in control and makes decisions; the AI handles what the interface shows.

Privacy is a core value — all inference happens locally via LM Studio. No data leaves the user's machine during MVP testing.

## Goals

1. Build an MVP webapp that connects to a few key APIs (Gmail, Google Calendar, Slack)
2. Dynamic UI rendered based on local LM decisions about workflow context
3. Track workflow patterns throughout the day
4. Collect interaction data for analysis and iteration

## Non-Goals (MVP)

- Multi-user/multi-tenant SaaS (this is a single-user local app for MVP)
- Cloud sync, remote storage, or external AI APIs
- Support for arbitrary "any software" integrations — MVP ships 3 integrations
- Production-grade auth, billing, team features
- Mobile app

## Architecture

Three-layer system, all running locally:

### Frontend — React + TypeScript + Vite
- Unified dashboard with agentic-rendered content
- Left sidebar: integrations list (enable/disable)
- Center: dynamic panels (AI-recommended actions, tools, context)
- Right: activity timeline + optional chat
- Header: time, status, settings

### Backend — Node.js + Express + TypeScript
- API gateway orchestrating integration calls
- Workflow tracker (logs user events, builds context)
- Local LM bridge (communicates with LM Studio)
- Data collector (telemetry stored in SQLite)
- SQLite for telemetry + integration tokens

### Local LM — LM Studio
- Runs at `http://localhost:1234/v1/chat/completions` (OpenAI-compatible API)
- Receives workflow context → returns structured JSON UI decisions
- Prompt defines LM's role: recommend UI panels from available tools based on context

## Data Flow

1. User interacts with dashboard → frontend sends event to backend
2. Backend logs event to workflow tracker
3. Every 5-10s (or on significant action), backend builds context (recent events, time, active integrations)
4. Backend POSTs context to LM Studio → receives JSON render plan
5. Frontend receives render plan via WebSocket/polling → updates panels
6. All events logged to local SQLite for analysis

## Components

### Frontend Components
- `Dashboard` — main layout shell
- `IntegrationSidebar` — list of connected tools
- `DynamicPanelGrid` — renders panels per LM recommendation
- `ActivityTimeline` — visual log of user actions
- `ChatSidebar` — optional conversation with LM
- `OAuthConnector` — handles connecting new integrations

### Backend Modules
- `gateway/` — Express server + route handlers
- `integrations/` — Gmail, Calendar, Slack adapters (unified tool interface)
- `workflow-tracker/` — event log + context builder
- `lm-bridge/` — LM Studio client + prompt templates
- `telemetry/` — SQLite logging + export

### Integrations (MVP)
- **Gmail** — list unread, draft reply, search threads
- **Google Calendar** — list events, create event, suggest time
- **Slack** — list channels, send message, read recent

Each integration implements:
```typescript
interface Integration {
  name: string;
  listActions(): Action[];
  execute(action: string, params: object): Promise<Result>;
}
```

## Local LM Integration

**Prompt structure:**
```
System: You are the YoXperience UI agent. Based on the user's current
workflow context and available tools, recommend which UI panels to show.
Return strict JSON: { "panels": [{ "type", "priority", "data", "rationale" }] }

User: Current context: { time, recent_actions[], active_integrations[], ... }
Available tools: [...]
```

**Response handling:**
- Parse JSON → validate schema → render panels
- Fallback to default layout if LM unreachable or returns invalid JSON
- Log all LM calls + responses for debugging

## Data Collection Schema (SQLite)

- `events` — id, timestamp, user_id, event_type, data (JSON)
- `lm_decisions` — id, timestamp, context (JSON), response (JSON), latency_ms
- `integrations` — id, service, oauth_token (encrypted), connected_at
- `panels_rendered` — id, timestamp, panel_type, priority, dismissed (bool)

Export: simple CSV for each table.

## Error Handling

- **LM Studio offline:** Show default layout + banner "Local AI not running"
- **Integration API errors:** Surface in UI panel with retry; log to telemetry
- **Invalid LM response:** Fallback to default layout; log for prompt tuning
- **OAuth failures:** Re-prompt user, log error

## Testing Approach

- Unit tests on integration adapters (mocked API responses)
- Integration tests on LM bridge (mocked LM Studio)
- Manual E2E: user connects Gmail, performs workflow, verifies UI adapts
- Data collection sanity check: export telemetry, verify schema

## Success Criteria

- User can connect Gmail, Calendar, Slack via OAuth
- UI dynamically renders based on LM decisions (not static layout)
- Workflow events captured to SQLite, exportable as CSV
- System runs entirely locally (LM Studio + local backend + browser)
- Baseline for measuring: does the UI adapt meaningfully? Do users find it useful?

## Open Questions

- Exact LM model to ship recommendations for (likely Llama 3 8B or Mistral 7B based on LM Studio defaults)
- How often to re-query LM (5s? 10s? on-event?)
- Whether to include a "manual override" so user can pin panels

## Milestones

1. Scaffold monorepo (backend + frontend + shared types)
2. Build LM bridge + test with LM Studio
3. Implement Gmail integration + OAuth
4. Build dynamic panel rendering on frontend
5. Add workflow tracker + SQLite telemetry
6. Add Calendar + Slack integrations
7. E2E test + data export
