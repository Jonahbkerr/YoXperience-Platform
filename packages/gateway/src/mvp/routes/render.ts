import { Router } from 'express';
import { DB } from '../db';
import { EventTracker } from '../workflow/tracker';
import { buildContext } from '../workflow/context';
import { computeUserPatterns } from '../workflow/patterns';
import { IntegrationRegistry } from '../integrations/registry';
import { LMClient } from '../lm-bridge/client';
import { buildSystemPrompt, buildUserPrompt, RenderPlan, AvailableAction } from '../lm-bridge/prompt';

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
    const context = buildContext({ tracker: deps.tracker, enabledIntegrations: enabled, limit: 5 });

    const available: AvailableAction[] = [];
    for (const name of enabled) {
      const tool = deps.registry.get(name);
      if (!tool) continue;
      for (const a of tool.listActions()) {
        available.push({ integration: name, action: a.id, label: a.label, params: a.params });
      }
    }

    const patterns = computeUserPatterns(deps.db);
    const enrichedContext = { ...context, user_patterns: patterns };

    const sys = buildSystemPrompt(available);
    const user = buildUserPrompt(enrichedContext);
    const started = Date.now();

    try {
      const plan: RenderPlan = await deps.lm.renderPlan(sys, user);
      const latency = Date.now() - started;

      const decisionStmt = deps.db.prepare(
        'INSERT INTO lm_decisions (timestamp, context, response, latency_ms, model) VALUES (?, ?, ?, ?, ?)'
      );
      const info = decisionStmt.run(Date.now(), JSON.stringify(enrichedContext), JSON.stringify(plan), latency, process.env.LM_MODEL || 'local');

      const panelStmt = deps.db.prepare(
        'INSERT INTO panels_rendered (timestamp, panel_type, priority, decision_id) VALUES (?, ?, ?, ?)'
      );
      for (const p of plan.panels) {
        panelStmt.run(Date.now(), p.type, p.priority, info.lastInsertRowid);
      }

      if (plan.assistant_message && plan.assistant_message.trim()) {
        deps.tracker.log('chat_message', { role: 'assistant', text: plan.assistant_message.trim() });
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
