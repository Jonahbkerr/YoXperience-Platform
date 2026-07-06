import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "../lib/api-client.js";

type RecStatus = "recommend" | "keep" | "gathering";
type Confidence = "high" | "medium" | "low" | "none";

interface VariantBreakdown {
  variant: string;
  impressions: number;
  engagements: number;
  dismisses: number;
  rate: number;
  isWinner: boolean;
  isCurrentDefault: boolean;
  eligible: boolean;
}

interface Recommendation {
  slotKey: string;
  slotId: string | null;
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
  liftPct: number | null;
  confidence: Confidence;
  variants: VariantBreakdown[];
  reason: string;
  aiRationale: string | null;
}

interface RecommendationsResponse {
  summary: { actionable: number; keep: number; gathering: number };
  recommendations: Recommendation[];
}

interface LayoutContext {
  selectedProject: { id: string; name: string } | null;
}

const cardStyle: React.CSSProperties = {
  background: "var(--yc-color-bg-container)",
  borderRadius: "var(--yc-radius-xl)",
  border: "1px solid var(--yc-color-border-secondary)",
  padding: "18px 20px",
};

const btnPrimary: React.CSSProperties = {
  padding: "8px 14px",
  background: "var(--yc-color-primary)",
  color: "#fff",
  border: "none",
  borderRadius: "var(--yc-radius-md)",
  fontSize: "var(--yc-font-size-sm)",
  fontWeight: "var(--yc-font-weight-medium)",
  cursor: "pointer",
};

const btnOutline: React.CSSProperties = {
  ...btnPrimary,
  background: "transparent",
  color: "var(--yc-color-text-secondary)",
  border: "1px solid var(--yc-color-border)",
};

const statusMeta: Record<RecStatus, { label: string; color: string; bg: string }> = {
  recommend: { label: "Action suggested", color: "#22c55e", bg: "rgba(34,197,94,0.12)" },
  keep: { label: "No change needed", color: "#22d3ee", bg: "rgba(34,211,238,0.12)" },
  gathering: { label: "Gathering data", color: "#f59e0b", bg: "rgba(245,158,11,0.12)" },
};

const confidenceLabel: Record<Confidence, string> = {
  high: "High confidence",
  medium: "Medium confidence",
  low: "Low confidence",
  none: "",
};

function pct(n: number): string {
  return `${(n * 100).toFixed(1)}%`;
}

export default function Recommendations() {
  const { selectedProject } = useOutletContext<LayoutContext>();
  const [data, setData] = useState<RecommendationsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const load = () => {
    if (!selectedProject) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api<RecommendationsResponse>(`/api/projects/${selectedProject.id}/analytics/recommendations`)
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  };

  useEffect(load, [selectedProject?.id]);

  const applyDefault = async (rec: Recommendation) => {
    if (!selectedProject || !rec.slotId || !rec.winner) return;
    setBusy(rec.slotKey);
    try {
      await api(`/api/projects/${selectedProject.id}/slots/${rec.slotId}`, {
        method: "PATCH",
        body: JSON.stringify({ defaultVariant: rec.winner }),
      });
      setToast(`"${rec.winner}" is now the default for ${rec.slotKey}.`);
      load();
    } catch (err: any) {
      setToast(err.message || "Failed to apply.");
    } finally {
      setBusy(null);
    }
  };

  const forceEveryone = async (rec: Recommendation) => {
    if (!selectedProject || !rec.slotId || !rec.winner) return;
    setBusy(rec.slotKey);
    try {
      await api(`/api/projects/${selectedProject.id}/slots/${rec.slotId}`, {
        method: "PATCH",
        body: JSON.stringify({ mode: "forced", forcedVariant: rec.winner }),
      });
      setToast(`Every visitor now sees "${rec.winner}" for ${rec.slotKey}.`);
      load();
    } catch (err: any) {
      setToast(err.message || "Failed to force.");
    } finally {
      setBusy(null);
    }
  };

  if (!selectedProject) {
    return (
      <div>
        <h1 style={{ fontSize: "var(--yc-font-size-2xl)", fontWeight: "var(--yc-font-weight-bold)", marginBottom: "var(--yc-space-4)" }}>
          Recommendations
        </h1>
        <div style={{ ...cardStyle, textAlign: "center", padding: "var(--yc-space-12)", border: "2px dashed var(--yc-color-border-secondary)" }}>
          <p style={{ color: "var(--yc-color-text-secondary)" }}>Select a project from the sidebar to see recommendations.</p>
        </div>
      </div>
    );
  }

  const recs = (data?.recommendations ?? []).filter((r) => !dismissed.has(r.slotKey));
  // Actionable first, then gathering, then keep.
  const order: Record<RecStatus, number> = { recommend: 0, gathering: 1, keep: 2 };
  recs.sort((a, b) => order[a.status] - order[b.status]);

  return (
    <div>
      <div style={{ marginBottom: "var(--yc-space-6)" }}>
        <h1 style={{ fontSize: "var(--yc-font-size-2xl)", fontWeight: "var(--yc-font-weight-bold)" }}>Recommendations</h1>
        <p style={{ fontSize: "var(--yc-font-size-sm)", color: "var(--yc-color-text-secondary)", marginTop: 2 }}>
          {selectedProject.name} &middot; Site-level suggestions from all visitor engagement. You decide what to apply.
        </p>
      </div>

      {toast && (
        <div
          style={{
            ...cardStyle,
            padding: "10px 16px",
            marginBottom: "var(--yc-space-4)",
            background: "var(--yc-color-fill)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span style={{ fontSize: "var(--yc-font-size-sm)" }}>{toast}</span>
          <button onClick={() => setToast(null)} style={{ ...btnOutline, padding: "4px 10px" }}>Dismiss</button>
        </div>
      )}

      {loading ? (
        <p style={{ color: "var(--yc-color-text-secondary)", paddingTop: "var(--yc-space-4)" }}>Loading...</p>
      ) : recs.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: "var(--yc-space-12)" }}>
          <p style={{ color: "var(--yc-color-text-tertiary)", fontSize: "var(--yc-font-size-sm)" }}>
            No slots to evaluate yet. Define slots and collect visitor telemetry to see recommendations here.
          </p>
        </div>
      ) : (
        <>
          {data && (
            <div style={{ display: "flex", gap: "var(--yc-space-3)", marginBottom: "var(--yc-space-5)", flexWrap: "wrap" }}>
              {(["recommend", "gathering", "keep"] as RecStatus[]).map((s) => {
                const count = s === "recommend" ? data.summary.actionable : s === "keep" ? data.summary.keep : data.summary.gathering;
                const m = statusMeta[s];
                return (
                  <div key={s} style={{ ...cardStyle, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: m.color }} />
                    <span style={{ fontSize: "var(--yc-font-size-sm)", fontWeight: "var(--yc-font-weight-semibold)" }}>{count}</span>
                    <span style={{ fontSize: "var(--yc-font-size-sm)", color: "var(--yc-color-text-secondary)" }}>{m.label.toLowerCase()}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {recs.map((rec) => {
              const m = statusMeta[rec.status];
              const maxImp = Math.max(1, ...rec.variants.map((v) => v.impressions));
              return (
                <div key={rec.slotKey} style={cardStyle}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 }}>
                    <div>
                      <div style={{ fontFamily: "var(--yc-font-mono)", fontSize: "var(--yc-font-size-base)", fontWeight: "var(--yc-font-weight-semibold)", color: "var(--yc-color-primary)" }}>
                        {rec.slotKey}
                      </div>
                      <div style={{ fontSize: "var(--yc-font-size-xs)", color: "var(--yc-color-text-tertiary)", marginTop: 2 }}>
                        {rec.totalImpressions.toLocaleString()} impressions · {rec.totalEngagements.toLocaleString()} engagements
                        {rec.mode === "forced" && rec.forcedVariant ? ` · forced: ${rec.forcedVariant}` : ""}
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, flexShrink: 0 }}>
                      {rec.confidence !== "none" && (
                        <span style={{ fontSize: "var(--yc-font-size-xs)", color: "var(--yc-color-text-tertiary)" }}>{confidenceLabel[rec.confidence]}</span>
                      )}
                      <span style={{ padding: "2px 10px", borderRadius: "var(--yc-radius-full)", fontSize: "var(--yc-font-size-xs)", fontWeight: "var(--yc-font-weight-medium)", color: m.color, background: m.bg }}>
                        {m.label}
                      </span>
                    </div>
                  </div>

                  <p style={{ fontSize: "var(--yc-font-size-sm)", lineHeight: 1.5, marginBottom: 12 }}>{rec.reason}</p>

                  {/* Per-variant engagement bars */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: rec.status === "recommend" ? 14 : 0 }}>
                    {rec.variants.map((v) => (
                      <div key={v.variant} style={{ display: "flex", alignItems: "center", gap: 10, fontSize: "var(--yc-font-size-xs)" }}>
                        <span style={{ minWidth: 130, fontFamily: "var(--yc-font-mono)", color: v.isWinner ? "var(--yc-color-success)" : "var(--yc-color-text-secondary)", fontWeight: v.isWinner ? 700 : 400 }}>
                          {v.variant}
                          {v.isCurrentDefault ? " ●" : ""}
                          {v.isWinner ? " ★" : ""}
                        </span>
                        <div style={{ flex: 1, height: 6, background: "var(--yc-color-fill)", borderRadius: 3, overflow: "hidden" }}>
                          <div style={{ width: `${(v.impressions / maxImp) * 100}%`, height: "100%", background: v.isWinner ? "var(--yc-color-success)" : "var(--yc-color-primary)", opacity: v.eligible ? 1 : 0.4 }} />
                        </div>
                        <span style={{ minWidth: 96, textAlign: "right", color: "var(--yc-color-text-tertiary)" }}>
                          {v.impressions} imp · {v.impressions > 0 ? pct(v.rate) : "—"}
                        </span>
                      </div>
                    ))}
                  </div>

                  {rec.aiRationale && (
                    <div style={{ fontSize: "var(--yc-font-size-xs)", color: "var(--yc-color-text-tertiary)", fontStyle: "italic", marginTop: 8, borderLeft: "2px solid var(--yc-color-border-secondary)", paddingLeft: 8 }}>
                      AI on this variant: “{rec.aiRationale}”
                    </div>
                  )}

                  {rec.status === "recommend" && rec.slotId && (
                    <div style={{ display: "flex", gap: 8, marginTop: 14, flexWrap: "wrap" }}>
                      <button style={{ ...btnPrimary, opacity: busy === rec.slotKey ? 0.6 : 1 }} disabled={busy === rec.slotKey} onClick={() => applyDefault(rec)} title="Make this the fallback default. The AI keeps personalizing per-user in auto mode.">
                        {busy === rec.slotKey ? "Applying…" : `Make "${rec.winner}" the default`}
                      </button>
                      <button style={{ ...btnOutline, opacity: busy === rec.slotKey ? 0.6 : 1 }} disabled={busy === rec.slotKey} onClick={() => forceEveryone(rec)} title="Show this variant to EVERY visitor, overriding the AI.">
                        Force for everyone
                      </button>
                      <button style={{ ...btnOutline, borderColor: "transparent" }} onClick={() => setDismissed((d) => new Set(d).add(rec.slotKey))}>
                        Dismiss
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p style={{ fontSize: "var(--yc-font-size-xs)", color: "var(--yc-color-text-tertiary)", marginTop: "var(--yc-space-5)", lineHeight: 1.5 }}>
            ● = current default &nbsp; ★ = top performer. "Make the default" sets the fallback variant while the AI keeps
            personalizing per visitor. "Force for everyone" overrides the AI entirely. Both are reversible on the Slots page.
          </p>
        </>
      )}
    </div>
  );
}
