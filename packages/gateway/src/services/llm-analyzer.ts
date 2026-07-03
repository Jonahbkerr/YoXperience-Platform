import { db } from "../db/client.js";
import { telemetryEvents, endUserPreferences, slotDefinitions } from "../db/schema.js";
import { eq, and, gte, sql } from "drizzle-orm";

export interface TelemetrySummary {
  projectId: string;
  userId: string;
  slotKey: string;
  variants: string[];
  periodHours: number;
  totalEvents: number;
  variantBreakdown: Array<{
    variant: string;
    impressions: number;
    clicks: number;
    hovers: number;
    scrolls: number;
    dismissals: number;
  }>;
  topActions: Array<{ eventType: string; count: number }>;
}

export interface LLMRecommendation {
  slotKey: string;
  recommendedVariant: string;
  confidence: number;
  rationale: string;
  alternativeVariants: Array<{ variant: string; whenToUse: string }>;
}

interface LMConfig {
  url: string;
  model: string;
  temperature?: number;
  cfAccess?: { clientId: string; clientSecret: string };
}

function getLMConfig(): LMConfig | null {
  const url = process.env.LM_STUDIO_URL;
  const model = process.env.LM_MODEL;
  if (!url || !model) return null;
  const cfId = process.env.CF_ACCESS_CLIENT_ID;
  const cfSecret = process.env.CF_ACCESS_CLIENT_SECRET;
  return {
    url,
    model,
    temperature: 0.2,
    ...(cfId && cfSecret ? { cfAccess: { clientId: cfId, clientSecret: cfSecret } } : {}),
  };
}
export async function summarizeTelemetry(
  projectId: string,
  userId: string,
  slotKey: string,
  periodHours: number = 24
): Promise<TelemetrySummary | null> {
  const now = new Date();
  const since = new Date(now.getTime() - periodHours * 60 * 60 * 1000);

  const [slot] = await db
    .select()
    .from(slotDefinitions)
    .where(
      and(
        eq(slotDefinitions.projectId, projectId),
        eq(slotDefinitions.slotKey, slotKey)
      )
    )
    .limit(1);

  if (!slot) return null;

  const variants: string[] = JSON.parse(slot.variants);

  const events = await db
    .select({
      variant: telemetryEvents.variant,
      eventType: telemetryEvents.eventType,
      count: sql<number>`count(*)::int`,
    })
    .from(telemetryEvents)
    .where(
      and(
        eq(telemetryEvents.projectId, projectId),
        eq(telemetryEvents.endUserId, userId),
        eq(telemetryEvents.slotKey, slotKey),
        gte(telemetryEvents.createdAt, since)
      )
    )
    .groupBy(telemetryEvents.variant, telemetryEvents.eventType);

  const topActions = await db
    .select({
      eventType: telemetryEvents.eventType,
      count: sql<number>`count(*)::int`,
    })
    .from(telemetryEvents)
    .where(
      and(
        eq(telemetryEvents.projectId, projectId),
        eq(telemetryEvents.endUserId, userId),
        gte(telemetryEvents.createdAt, since)
      )
    )
    .groupBy(telemetryEvents.eventType)
    .orderBy(sql`count(*) desc`)
    .limit(10);

  const variantBreakdown = variants.map((variant) => {
    const ve = events.filter((e) => e.variant === variant);
    return {
      variant,
      impressions: ve.find((e) => e.eventType === "impression")?.count ?? 0,
      clicks: ve.find((e) => e.eventType === "click")?.count ?? 0,
      hovers: ve.find((e) => e.eventType === "hover")?.count ?? 0,
      scrolls: ve.find((e) => e.eventType === "scroll")?.count ?? 0,
      dismissals: ve.find((e) => e.eventType === "dismiss")?.count ?? 0,
    };
  });

  const totalEvents = variantBreakdown.reduce((sum, v) => sum + v.impressions + v.clicks + v.hovers + v.scrolls + v.dismissals, 0);

  return {
    projectId,
    userId,
    slotKey,
    variants,
    periodHours,
    totalEvents,
    variantBreakdown,
    topActions: topActions.map((a) => ({ eventType: a.eventType, count: a.count })),
  };
}

function buildAnalyticsPrompt(summaries: TelemetrySummary[]): string {
  const summaryText = summaries
    .map((s) => {
      const breakdown = s.variantBreakdown
        .map(
          (v) =>
            `  - ${v.variant}: ${v.impressions} impressions, ${v.clicks} clicks, ${v.hovers} hovers, ${v.scrolls} scrolls, ${v.dismissals} dismissals`
        )
        .join("\n");

      const actions = s.topActions
        .map((a) => `  - ${a.eventType}: ${a.count} times`)
        .join("\n");

      return `SLOT: ${s.slotKey}
Variants available: ${s.variants.join(", ")}
Total events (${s.periodHours}h): ${s.totalEvents}
Variant breakdown:
${breakdown}
Top user actions across all slots:
${actions}`;
    })
    .join("\n\n---\n\n");

  return `You are YoXperience, an AI that optimizes UI layouts to maximize user engagement.

Below is telemetry data from real users interacting with a SaaS application. 
Each user sees different variants of UI components (slots). Your job is to analyze 
the data and recommend which variant each user should see.

${summaryText}

For each slot, output a recommendation in this JSON format:
{
  "recommendations": [
    {
      "slotKey": "hero-banner",
      "recommendedVariant": "bold",
      "confidence": 85,
      "rationale": "This user clicks bold variants 3x more than default. They prefer high-contrast layouts.",
      "alternativeVariants": [
        { "variant": "default", "whenToUse": "If user engagement drops below 0.3" },
        { "variant": "minimal", "whenToUse": "For users with >50 scroll events who prefer compact layouts" }
      ]
    }
  ]
}

Rules:
- Use camelCase for keys: slotKey, recommendedVariant, alternativeVariants (NOT slot_key or slot-key)
- confidence is 0-100 representing how strongly you recommend this variant
- Base recommendations on actual data, not defaults
- If a variant has 0 interactions, confidence should be low (<30)  
- If a user frequently clicks one variant and ignores others, recommend that variant with high confidence
- If all variants have similar engagement, recommend the one with the MOST impressions (it's seen most often)
- Provide a brief, specific rationale for each recommendation
- Include at least one alternative variant with when to use it

Respond ONLY with the JSON object. No markdown. No prose.`;
}

/**
 * Pull the JSON object out of a chatty model response.
 *
 * Gemma-style models wrap output in channel tags, and the JSON usually
 * lives AFTER the thought block ("<|channel>thought ... <|channel>final
 * {json}"). Truncating at the first tag (the old strategy) deleted the
 * JSON along with the thought. Instead: split on channel tags and scan
 * segments last-to-first, falling back to the whole response.
 */
export function extractJsonObject(raw: string): string | null {
  const cleaned = raw
    .replace(/```json\s*/g, "")
    .replace(/```\s*/g, "")
    .trim();

  const channelTag = /<\/?\*?\|*channel[^>]*>/g;
  const segments = cleaned
    .split(channelTag)
    .map((s) => s.trim())
    .filter(Boolean);

  const candidates =
    segments.length > 1 ? [...segments.reverse(), cleaned] : [cleaned];

  for (const candidate of candidates) {
    const match = candidate.match(/\{[\s\S]*\}/);
    if (match) return match[0];
  }
  return null;
}

export async function analyzeWithLLM(
  summaries: TelemetrySummary[],
  config: LMConfig
): Promise<LLMRecommendation[]> {
  const systemPrompt = buildAnalyticsPrompt(summaries);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "User-Agent": "yoxperience-gateway/1.0",
  };
  if (config.cfAccess) {
    headers["CF-Access-Client-Id"] = config.cfAccess.clientId;
    headers["CF-Access-Client-Secret"] = config.cfAccess.clientSecret;
  }

  const res = await fetch(`${config.url}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "user", content: systemPrompt },
      ],
      temperature: config.temperature ?? 0.2,
      max_tokens: 4000,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`LM HTTP ${res.status}: ${body.slice(0, 300)}`);
  }

  const json = await res.json() as { choices: { message: { content: string } }[] };
  let content = json.choices[0]?.message?.content;
  if (!content) throw new Error("LM returned empty content");

  const jsonStr = extractJsonObject(content);
  if (!jsonStr) throw new Error("LM returned no JSON object");
  let parsed: any;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    // Try extracting just the first complete object
    let depth = 0, end = 0;
    for (let i = 0; i < jsonStr.length; i++) {
      if (jsonStr[i] === '{') depth++;
      if (jsonStr[i] === '}') { depth--; if (depth === 0) { end = i + 1; break; } }
    }
    if (end > 0) {
      parsed = JSON.parse(jsonStr.substring(0, end));
    } else {
      throw new Error("Failed to parse LM response: " + content.substring(0, 200));
    }
  }

  if (!parsed) {
    throw new Error("LM returned unparseable JSON");
  }

  // Normalize: the model might return a single recommendation object, or use different wrapper keys
  let recommendations = parsed.recommendations;
  if (!recommendations || !Array.isArray(recommendations)) {
    // Try wrapping a single recommendation object
    if (parsed.slotKey && parsed.recommendedVariant) {
      recommendations = [parsed];
    }
    // Try snake_case wrapper
    else if (parsed["slot_key"] && parsed["recommended_variant"]) {
      recommendations = [parsed];
    }
    // Model might have spat out raw array at top level
    else if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].slotKey) {
      recommendations = parsed;
    }
  }

  if (!recommendations || !Array.isArray(recommendations) || recommendations.length === 0) {
    console.warn("[llm-analyzer] Raw LLM response:", content.substring(0, 500));
    throw new Error("LM response missing recommendations array");
  }
  return recommendations as LLMRecommendation[];
}

export async function analyzeAndStoreRecommendations(
  projectId: string,
  userId: string,
  config: LMConfig
): Promise<LLMRecommendation[]> {
  const slots = await db
    .select()
    .from(slotDefinitions)
    .where(eq(slotDefinitions.projectId, projectId));

  if (slots.length === 0) return [];

  const summaries: TelemetrySummary[] = [];
  for (const slot of slots) {
    const summary = await summarizeTelemetry(projectId, userId, slot.slotKey);
    if (summary && summary.totalEvents > 0) {
      summaries.push(summary);
    }
  }

  if (summaries.length === 0) return [];

  const recommendations = await analyzeWithLLM(summaries, config);

  for (const rec of recommendations) {
    // Normalize common LLM field name variations and typos
    if (!rec.slotKey) {
      // Common patterns: slot-key, slot_key, slotka (typo), SlotKey, slotKey, etc.
      if ((rec as any)["slot-key"]) rec.slotKey = (rec as any)["slot-key"];
      else if ((rec as any)["slot_key"]) rec.slotKey = (rec as any)["slot_key"];
      else {
        // Fuzzy: find any key that looks like "slot" + something + "key"
        const keys = Object.keys(rec as any);
        const match = keys.find(k => 
          /slot.*key/i.test(k) || 
          k.toLowerCase().replace(/[^a-z]/g, '') === 'slotkey'
        );
        if (match) rec.slotKey = (rec as any)[match];
      }
    }
    if (!rec.slotKey || !rec.recommendedVariant) {
      console.warn("[llm-analyzer] Skipping invalid recommendation:", JSON.stringify(rec));
      continue;
    }

    const variantWeights: Record<string, number> = {};
    variantWeights[rec.recommendedVariant] = rec.confidence / 100;
    for (const alt of rec.alternativeVariants) {
      variantWeights[alt.variant] = (100 - rec.confidence) / 100 / Math.max(1, rec.alternativeVariants.length);
    }

    const [existing] = await db
      .select()
      .from(endUserPreferences)
      .where(
        and(
          eq(endUserPreferences.projectId, projectId),
          eq(endUserPreferences.endUserId, userId),
          eq(endUserPreferences.slotKey, rec.slotKey)
        )
      )
      .limit(1);

    if (existing) {
      await db
        .update(endUserPreferences)
        .set({
          variantWeights: JSON.stringify(variantWeights),
          resolvedVariant: rec.recommendedVariant,
          rationale: rec.rationale || null,
          updatedAt: new Date(),
        })
        .where(eq(endUserPreferences.id, existing.id));
    } else {
      await db.insert(endUserPreferences).values({
        projectId,
        endUserId: userId,
        slotKey: rec.slotKey,
        variantWeights: JSON.stringify(variantWeights),
        resolvedVariant: rec.recommendedVariant,
      });
    }
  }

  return recommendations;
}
