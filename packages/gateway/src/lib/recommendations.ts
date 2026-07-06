/**
 * Aggregate site-level recommendations from telemetry.
 *
 * The per-user LLM loop (worker/scheduler) personalizes each visitor. This
 * module answers a different, human-facing question: "across ALL visitors,
 * which variant of each slot is actually performing best, and is there
 * enough data to promote it to the site default?"
 *
 * It is deliberately conservative. Engagement on a fresh experiment is
 * sparse, and recommending a default flip on two clicks would be worse than
 * useless. So a slot only produces an actionable recommendation once it
 * clears real sample-size gates; otherwise it honestly reports "gathering".
 */

export interface VariantStat {
  variant: string;
  impressions: number;
  /** Positive engagement events: click, hover, scroll, install_click, etc. */
  engagements: number;
  dismisses: number;
}

export interface SlotInput {
  slotKey: string;
  variants: string[];
  defaultVariant: string;
  mode: "auto" | "forced" | "split";
  forcedVariant: string | null;
}

export type RecStatus = "recommend" | "keep" | "gathering";
export type Confidence = "high" | "medium" | "low" | "none";

export interface VariantBreakdown {
  variant: string;
  impressions: number;
  engagements: number;
  dismisses: number;
  /** engagements / impressions, 0 when no impressions */
  rate: number;
  isWinner: boolean;
  isCurrentDefault: boolean;
  eligible: boolean;
}

export interface SlotRecommendation {
  slotKey: string;
  status: RecStatus;
  currentDefault: string;
  mode: string;
  forcedVariant: string | null;
  totalImpressions: number;
  totalEngagements: number;
  totalDismisses: number;
  winner: string | null;
  winnerRate: number | null;
  currentRate: number | null;
  /** Relative lift of winner over current default, e.g. 35 = +35%. */
  liftPct: number | null;
  confidence: Confidence;
  variants: VariantBreakdown[];
  reason: string;
}

// Sample-size gates. A slot must clear ALL of these before it can produce an
// actionable "recommend" or a confident "keep".
export const MIN_TOTAL_IMPRESSIONS = 100;
export const MIN_VARIANT_IMPRESSIONS = 30;
export const MIN_TOTAL_ENGAGEMENTS = 10;

function rate(v: VariantStat): number {
  return v.impressions > 0 ? v.engagements / v.impressions : 0;
}

export function computeSlotRecommendation(
  slot: SlotInput,
  stats: VariantStat[],
): SlotRecommendation {
  // Ensure every defined variant is represented, even with zero data.
  const byVariant = new Map(stats.map((s) => [s.variant, s]));
  const rows: VariantStat[] = slot.variants.map(
    (v) =>
      byVariant.get(v) ?? { variant: v, impressions: 0, engagements: 0, dismisses: 0 },
  );

  const totalImpressions = rows.reduce((a, r) => a + r.impressions, 0);
  const totalEngagements = rows.reduce((a, r) => a + r.engagements, 0);
  const totalDismisses = rows.reduce((a, r) => a + r.dismisses, 0);

  const eligible = rows.filter((r) => r.impressions >= MIN_VARIANT_IMPRESSIONS);

  // Winner among eligible variants, by engagement rate (tie-break: impressions).
  let winner: VariantStat | null = null;
  for (const r of eligible) {
    if (
      !winner ||
      rate(r) > rate(winner) ||
      (rate(r) === rate(winner) && r.impressions > winner.impressions)
    ) {
      winner = r;
    }
  }

  const currentStat = rows.find((r) => r.variant === slot.defaultVariant) ?? null;
  const currentRate = currentStat ? rate(currentStat) : null;

  const ready =
    totalImpressions >= MIN_TOTAL_IMPRESSIONS &&
    totalEngagements >= MIN_TOTAL_ENGAGEMENTS &&
    eligible.length >= 2 &&
    winner !== null;

  // Confidence from sample size + margin over runner-up.
  let confidence: Confidence = "none";
  if (ready && winner) {
    const runnerUp = eligible
      .filter((r) => r.variant !== winner!.variant)
      .reduce<VariantStat | null>(
        (best, r) => (!best || rate(r) > rate(best) ? r : best),
        null,
      );
    const margin =
      runnerUp && rate(runnerUp) > 0
        ? (rate(winner) - rate(runnerUp)) / rate(runnerUp)
        : rate(winner) > 0
          ? 1
          : 0;
    if (totalEngagements >= 50 && margin >= 0.2) confidence = "high";
    else if (totalEngagements >= 20) confidence = "medium";
    else confidence = "low";
  }

  const variants: VariantBreakdown[] = rows.map((r) => ({
    variant: r.variant,
    impressions: r.impressions,
    engagements: r.engagements,
    dismisses: r.dismisses,
    rate: rate(r),
    isWinner: !!winner && r.variant === winner.variant,
    isCurrentDefault: r.variant === slot.defaultVariant,
    eligible: r.impressions >= MIN_VARIANT_IMPRESSIONS,
  }));

  const pct = (n: number) => `${(n * 100).toFixed(1)}%`;

  // Not enough data → honest "gathering" with what's missing.
  if (!ready || !winner) {
    // Special case: plenty of impressions but ZERO positive signal. This slot
    // isn't on track to graduate — it likely emits no engagement/conversion
    // event (e.g. a passive score display or layout). Say so plainly rather
    // than implying it just needs a few more.
    const noSignal =
      totalEngagements === 0 && totalImpressions >= MIN_TOTAL_IMPRESSIONS;

    const missing: string[] = [];
    if (totalImpressions < MIN_TOTAL_IMPRESSIONS)
      missing.push(`${MIN_TOTAL_IMPRESSIONS - totalImpressions} more impressions`);
    if (totalEngagements < MIN_TOTAL_ENGAGEMENTS)
      missing.push(
        `${MIN_TOTAL_ENGAGEMENTS - totalEngagements} more engagement events (clicks or conversions)`,
      );
    if (eligible.length < 2)
      missing.push(
        `at least 2 variants with ${MIN_VARIANT_IMPRESSIONS}+ impressions`,
      );
    return {
      slotKey: slot.slotKey,
      status: "gathering",
      currentDefault: slot.defaultVariant,
      mode: slot.mode,
      forcedVariant: slot.forcedVariant,
      totalImpressions,
      totalEngagements,
      totalDismisses,
      winner: null,
      winnerRate: null,
      currentRate,
      liftPct: null,
      confidence: "none",
      variants,
      reason: noSignal
        ? `${totalImpressions.toLocaleString()} people have seen this slot, but none have produced an engagement or conversion signal. If this slot isn't clickable (e.g. a score or layout), wire a conversion event so it can be measured — otherwise it will stay here indefinitely.`
        : missing.length > 0
          ? `Gathering data — need ${missing.join(", ")} before a reliable call.`
          : "Gathering data.",
    };
  }

  const winnerRate = rate(winner);
  const liftPct =
    currentRate && currentRate > 0
      ? ((winnerRate - currentRate) / currentRate) * 100
      : null;

  if (winner.variant === slot.defaultVariant) {
    return {
      slotKey: slot.slotKey,
      status: "keep",
      currentDefault: slot.defaultVariant,
      mode: slot.mode,
      forcedVariant: slot.forcedVariant,
      totalImpressions,
      totalEngagements,
      totalDismisses,
      winner: winner.variant,
      winnerRate,
      currentRate,
      liftPct: null,
      confidence,
      variants,
      reason: `Your current default "${slot.defaultVariant}" is the top performer at ${pct(winnerRate)} engagement. No change needed.`,
    };
  }

  return {
    slotKey: slot.slotKey,
    status: "recommend",
    currentDefault: slot.defaultVariant,
    mode: slot.mode,
    forcedVariant: slot.forcedVariant,
    totalImpressions,
    totalEngagements,
    totalDismisses,
    winner: winner.variant,
    winnerRate,
    currentRate,
    liftPct,
    confidence,
    variants,
    reason:
      liftPct !== null
        ? `"${winner.variant}" is engaging at ${pct(winnerRate)} vs "${slot.defaultVariant}" at ${pct(currentRate ?? 0)} — a ${liftPct >= 0 ? "+" : ""}${liftPct.toFixed(0)}% lift. Consider making it the default.`
        : `"${winner.variant}" is the top performer at ${pct(winnerRate)} engagement. Consider making it the default.`,
  };
}
