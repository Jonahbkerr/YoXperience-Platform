import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { api } from "../lib/api-client.js";

interface AnalyticsData {
  totalEvents24h: number;
  uniqueUsers24h: number;
  activeSlots: number;
  eventsBySlot: Array<{ slotKey: string; count: number }>;
  eventsByType: Array<{ eventType: string; count: number }>;
  slotWinners: Record<string, { variant: string; confidence: number }>;
}

interface LayoutContext {
  selectedProject: { id: string; name: string } | null;
}

const cardStyle: React.CSSProperties = {
  background: "var(--yc-color-bg-container)",
  borderRadius: "var(--yc-radius-xl)",
  border: "1px solid var(--yc-color-border-secondary)",
  padding: "var(--yc-space-5)",
};

export default function Analytics() {
  const { selectedProject } = useOutletContext<LayoutContext>();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!selectedProject) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api<AnalyticsData>(`/api/projects/${selectedProject.id}/analytics`)
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedProject?.id]);

  if (!selectedProject) {
    return (
      <div>
        <h1
          style={{
            fontSize: "var(--yc-font-size-2xl)",
            fontWeight: "var(--yc-font-weight-bold)",
            marginBottom: "var(--yc-space-4)",
          }}
        >
          Analytics
        </h1>
        <div
          style={{
            ...cardStyle,
            textAlign: "center",
            padding: "var(--yc-space-12)",
            border: "2px dashed var(--yc-color-border-secondary)",
          }}
        >
          <p style={{ color: "var(--yc-color-text-secondary)" }}>
            Select a project from the sidebar to view analytics.
          </p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div style={{ color: "var(--yc-color-text-secondary)", paddingTop: "var(--yc-space-8)" }}>
        Loading...
      </div>
    );
  }

  const isEmpty = !data || data.totalEvents24h === 0;

  return (
    <div>
      <div style={{ marginBottom: "var(--yc-space-6)" }}>
        <h1
          style={{
            fontSize: "var(--yc-font-size-2xl)",
            fontWeight: "var(--yc-font-weight-bold)",
          }}
        >
          Analytics
        </h1>
        <p
          style={{
            fontSize: "var(--yc-font-size-sm)",
            color: "var(--yc-color-text-secondary)",
            marginTop: 2,
          }}
        >
          {selectedProject.name} &middot; Last 24 hours
        </p>
      </div>

      {/* Stats grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: "var(--yc-space-4)",
          marginBottom: "var(--yc-space-6)",
        }}
      >
        <div style={cardStyle}>
          <div
            style={{
              fontSize: "var(--yc-font-size-xs)",
              color: "var(--yc-color-text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              fontWeight: "var(--yc-font-weight-medium)",
            }}
          >
            Events (24h)
          </div>
          <div
            style={{
              fontSize: "28px",
              fontWeight: "var(--yc-font-weight-bold)",
              marginTop: 2,
              color: isEmpty ? "var(--yc-color-border)" : "var(--yc-color-text)",
            }}
          >
            {isEmpty ? "—" : data!.totalEvents24h.toLocaleString()}
          </div>
        </div>
        <div style={cardStyle}>
          <div
            style={{
              fontSize: "var(--yc-font-size-xs)",
              color: "var(--yc-color-text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              fontWeight: "var(--yc-font-weight-medium)",
            }}
          >
            End Users
          </div>
          <div
            style={{
              fontSize: "28px",
              fontWeight: "var(--yc-font-weight-bold)",
              marginTop: 2,
              color: isEmpty ? "var(--yc-color-border)" : "var(--yc-color-text)",
            }}
          >
            {isEmpty ? "—" : data!.uniqueUsers24h.toLocaleString()}
          </div>
        </div>
        <div style={cardStyle}>
          <div
            style={{
              fontSize: "var(--yc-font-size-xs)",
              color: "var(--yc-color-text-tertiary)",
              textTransform: "uppercase",
              letterSpacing: "0.03em",
              fontWeight: "var(--yc-font-weight-medium)",
            }}
          >
            Active Slots
          </div>
          <div
            style={{
              fontSize: "28px",
              fontWeight: "var(--yc-font-weight-bold)",
              marginTop: 2,
              color: isEmpty ? "var(--yc-color-border)" : "var(--yc-color-text)",
            }}
          >
            {data?.activeSlots ?? 0}
          </div>
        </div>
      </div>

      {isEmpty ? (
        <div
          style={{
            ...cardStyle,
            textAlign: "center",
            padding: "var(--yc-space-12)",
          }}
        >
          <p
            style={{
              color: "var(--yc-color-text-tertiary)",
              fontSize: "var(--yc-font-size-sm)",
            }}
          >
            No events received yet. Install the SDK and start collecting data to
            see analytics here.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "var(--yc-space-4)",
          }}
        >
          {/* Events by slot */}
          <div style={cardStyle}>
            <h3
              style={{
                fontSize: "var(--yc-font-size-md)",
                fontWeight: "var(--yc-font-weight-semibold)",
                marginBottom: "var(--yc-space-4)",
              }}
            >
              Events by Slot
            </h3>
            {data!.eventsBySlot.map((s) => {
              const maxCount = data!.eventsBySlot[0]?.count || 1;
              const pct = (s.count / maxCount) * 100;
              return (
                <div key={s.slotKey} style={{ marginBottom: "var(--yc-space-3)" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "var(--yc-font-size-sm)",
                      marginBottom: 4,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "var(--yc-font-mono)",
                        color: "var(--yc-color-primary)",
                      }}
                    >
                      {s.slotKey}
                    </span>
                    <span style={{ color: "var(--yc-color-text-secondary)" }}>
                      {s.count.toLocaleString()}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      background: "var(--yc-color-fill)",
                      borderRadius: "var(--yc-radius-full)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: "var(--yc-color-primary)",
                        borderRadius: "var(--yc-radius-full)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Events by type */}
          <div style={cardStyle}>
            <h3
              style={{
                fontSize: "var(--yc-font-size-md)",
                fontWeight: "var(--yc-font-weight-semibold)",
                marginBottom: "var(--yc-space-4)",
              }}
            >
              Events by Type
            </h3>
            {data!.eventsByType.map((t) => {
              const maxCount = data!.eventsByType[0]?.count || 1;
              const pct = (t.count / maxCount) * 100;
              return (
                <div key={t.eventType} style={{ marginBottom: "var(--yc-space-3)" }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: "var(--yc-font-size-sm)",
                      marginBottom: 4,
                    }}
                  >
                    <span>{t.eventType}</span>
                    <span style={{ color: "var(--yc-color-text-secondary)" }}>
                      {t.count.toLocaleString()}
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      background: "var(--yc-color-fill)",
                      borderRadius: "var(--yc-radius-full)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${pct}%`,
                        background: "var(--yc-color-secondary-500)",
                        borderRadius: "var(--yc-radius-full)",
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Slot winners */}
          {Object.keys(data!.slotWinners).length > 0 && (
            <div style={{ ...cardStyle, gridColumn: "1 / -1" }}>
              <h3
                style={{
                  fontSize: "var(--yc-font-size-md)",
                  fontWeight: "var(--yc-font-weight-semibold)",
                  marginBottom: "var(--yc-space-4)",
                }}
              >
                Winning Variants
              </h3>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                  gap: "var(--yc-space-3)",
                }}
              >
                {Object.entries(data!.slotWinners).map(([slotKey, w]) => (
                  <div
                    key={slotKey}
                    style={{
                      padding: "var(--yc-space-3)",
                      background: "var(--yc-color-fill)",
                      borderRadius: "var(--yc-radius-lg)",
                    }}
                  >
                    <div
                      style={{
                        fontFamily: "var(--yc-font-mono)",
                        fontSize: "var(--yc-font-size-sm)",
                        color: "var(--yc-color-primary)",
                        marginBottom: 4,
                      }}
                    >
                      {slotKey}
                    </div>
                    <div
                      style={{
                        fontSize: "var(--yc-font-size-sm)",
                        fontWeight: "var(--yc-font-weight-semibold)",
                        color: "var(--yc-color-success)",
                      }}
                    >
                      {w.variant} ({w.confidence}%)
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
