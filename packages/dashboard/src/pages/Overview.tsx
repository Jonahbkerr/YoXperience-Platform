import { useState, useEffect } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { Check, Copy, X } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.js";
import { api } from "../lib/api-client.js";

interface LayoutContext {
  selectedProject: { id: string; name: string; slug: string } | null;
}

interface AnalyticsData {
  totalEvents24h: number;
  uniqueUsers24h: number;
  activeSlots: number;
}

const cardStyle: React.CSSProperties = {
  background: "var(--yc-color-bg-container)",
  borderRadius: "var(--yc-radius-xl)",
  border: "1px solid var(--yc-color-border-secondary)",
};

const btnPrimary: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: "var(--yc-space-2)",
  padding: "var(--yc-space-2) var(--yc-space-4)",
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

export default function Overview() {
  const { user, org } = useAuth();
  const navigate = useNavigate();
  const { selectedProject } = useOutletContext<LayoutContext>();
  const [showWizard, setShowWizard] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [copiedInstall, setCopiedInstall] = useState(false);
  const [hasKeys, setHasKeys] = useState(false);
  const [hasSlots, setHasSlots] = useState(false);

  useEffect(() => {
    if (!selectedProject) return;

    // Fetch analytics
    api<AnalyticsData>(`/api/projects/${selectedProject.id}/analytics`)
      .then(setAnalytics)
      .catch(() => {});

    // Check if project has keys
    api<{ keys: { id: string }[] }>(`/api/projects/${selectedProject.id}/keys`)
      .then((res) => setHasKeys(res.keys.length > 0))
      .catch(() => {});

    // Check if project has slots
    api<{ slots: { id: string }[] }>(`/api/projects/${selectedProject.id}/slots`)
      .then((res) => setHasSlots(res.slots.length > 0))
      .catch(() => {});
  }, [selectedProject?.id]);

  const hasProject = !!selectedProject;
  const hasEvents = (analytics?.totalEvents24h ?? 0) > 0;

  // Determine wizard step
  let currentStep = 1;
  if (hasProject) currentStep = 2;
  if (hasProject && hasKeys) currentStep = 3;
  if (hasProject && hasKeys && hasSlots) currentStep = 4;
  if (hasProject && hasKeys && hasSlots && hasEvents) currentStep = 5;

  const wizardSteps = [
    { label: "Create project", done: hasProject },
    { label: "API key", done: hasKeys },
    { label: "Install SDK", done: currentStep > 3 },
    { label: "First slot", done: hasSlots },
    { label: "Verify", done: hasEvents },
  ];

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedInstall(true);
    setTimeout(() => setCopiedInstall(false), 2000);
  };

  return (
    <div>
      <div style={{ marginBottom: "var(--yc-space-6)" }}>
        <h1
          style={{
            fontSize: "var(--yc-font-size-2xl)",
            fontWeight: "var(--yc-font-weight-bold)",
          }}
        >
          Overview
        </h1>
        <p
          style={{
            fontSize: "var(--yc-font-size-sm)",
            color: "var(--yc-color-text-secondary)",
            marginTop: 2,
          }}
        >
          {selectedProject
            ? `${selectedProject.name} \u00b7 ${selectedProject.slug}`
            : `${org?.name} \u00b7 ${org?.plan ? org.plan.charAt(0).toUpperCase() + org.plan.slice(1) : "Hobby"} plan`}
        </p>
      </div>

      {/* Onboarding wizard */}
      {showWizard && currentStep <= 5 && (
        <div
          style={{
            ...cardStyle,
            overflow: "hidden",
            marginBottom: "var(--yc-space-6)",
          }}
        >
          <div
            style={{
              padding: "20px 24px 0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <span
              style={{
                fontSize: "var(--yc-font-size-md)",
                fontWeight: "var(--yc-font-weight-semibold)",
              }}
            >
              Get started with YoXperience
            </span>
            {hasEvents && (
              <button
                onClick={() => setShowWizard(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "var(--yc-font-size-xs)",
                  color: "var(--yc-color-text-tertiary)",
                }}
              >
                Dismiss <X size={12} style={{ verticalAlign: "middle" }} />
              </button>
            )}
          </div>

          {/* Progress steps */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              padding: "16px 24px",
              gap: 0,
            }}
          >
            {wizardSteps.map((step, i) => (
              <div key={i} style={{ display: "contents" }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    flex: 1,
                  }}
                >
                  <div
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: "var(--yc-radius-full)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 11,
                      fontWeight: 600,
                      flexShrink: 0,
                      background: step.done
                        ? "var(--yc-color-success)"
                        : i + 1 === currentStep
                          ? "var(--yc-color-primary)"
                          : "var(--yc-color-fill)",
                      color: step.done || i + 1 === currentStep
                        ? "#fff"
                        : "var(--yc-color-text-tertiary)",
                      border:
                        !step.done && i + 1 !== currentStep
                          ? "1px solid var(--yc-color-border-secondary)"
                          : "none",
                    }}
                  >
                    {step.done ? "✓" : i + 1}
                  </div>
                  <span
                    style={{
                      fontSize: "var(--yc-font-size-xs)",
                      fontWeight: "var(--yc-font-weight-medium)",
                      whiteSpace: "nowrap",
                      color: step.done
                        ? "var(--yc-color-text-tertiary)"
                        : i + 1 === currentStep
                          ? "var(--yc-color-text)"
                          : "var(--yc-color-text-tertiary)",
                    }}
                  >
                    {step.label}
                  </span>
                </div>
                {i < wizardSteps.length - 1 && (
                  <div
                    style={{
                      width: 32,
                      height: 2,
                      background: step.done
                        ? "var(--yc-color-success)"
                        : "var(--yc-color-border-secondary)",
                      flexShrink: 0,
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Current step content */}
          <div style={{ padding: "0 24px 24px" }}>
            <div
              style={{
                background: "var(--yc-color-bg-layout)",
                border: "1px solid var(--yc-color-border-secondary)",
                borderRadius: "var(--yc-radius-xl)",
                padding: "20px",
              }}
            >
              {currentStep <= 1 && (
                <>
                  <div
                    style={{
                      fontSize: "var(--yc-font-size-base)",
                      fontWeight: "var(--yc-font-weight-semibold)",
                      marginBottom: 6,
                    }}
                  >
                    Create your first project
                  </div>
                  <p
                    style={{
                      fontSize: "var(--yc-font-size-sm)",
                      color: "var(--yc-color-text-secondary)",
                      lineHeight: 1.5,
                      marginBottom: 14,
                    }}
                  >
                    A project represents your app. Each project gets its own
                    slots, API keys, and analytics.
                  </p>
                  <button style={btnPrimary} onClick={() => navigate("/projects")}>
                    Create project &rarr;
                  </button>
                </>
              )}

              {currentStep === 2 && (
                <>
                  <div
                    style={{
                      fontSize: "var(--yc-font-size-base)",
                      fontWeight: "var(--yc-font-weight-semibold)",
                      marginBottom: 6,
                    }}
                  >
                    Generate an API key
                  </div>
                  <p
                    style={{
                      fontSize: "var(--yc-font-size-sm)",
                      color: "var(--yc-color-text-secondary)",
                      lineHeight: 1.5,
                      marginBottom: 14,
                    }}
                  >
                    Your SDK needs a publishable key to connect to YoXperience.
                  </p>
                  <button
                    style={btnPrimary}
                    onClick={() =>
                      navigate(`/projects/${selectedProject?.id}`)
                    }
                  >
                    Generate key &rarr;
                  </button>
                </>
              )}

              {currentStep === 3 && (
                <>
                  <div
                    style={{
                      fontSize: "var(--yc-font-size-base)",
                      fontWeight: "var(--yc-font-weight-semibold)",
                      marginBottom: 6,
                    }}
                  >
                    Install the SDK
                  </div>
                  <p
                    style={{
                      fontSize: "var(--yc-font-size-sm)",
                      color: "var(--yc-color-text-secondary)",
                      lineHeight: 1.5,
                      marginBottom: 14,
                    }}
                  >
                    Add the YoXperience SDK to your React app and wrap it with
                    the provider.
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      background: "var(--yc-color-fill)",
                      padding: "10px 14px",
                      borderRadius: "var(--yc-radius-md)",
                      fontFamily: "var(--yc-font-mono)",
                      fontSize: "var(--yc-font-size-sm)",
                      marginBottom: 8,
                    }}
                  >
                    <code>npm install @yoxperience/sdk</code>
                    <button
                      onClick={() =>
                        copyToClipboard("npm install @yoxperience/sdk")
                      }
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "var(--yc-color-primary)",
                        fontSize: "var(--yc-font-size-xs)",
                        fontWeight: "var(--yc-font-weight-medium)",
                        fontFamily: "var(--yc-font-sans)",
                      }}
                    >
                      {copiedInstall ? "Copied!" : "Copy"}
                    </button>
                  </div>
                  <div
                    style={{
                      background: "#1e1e2e",
                      borderRadius: "var(--yc-radius-lg)",
                      padding: "14px 18px",
                      fontFamily: "var(--yc-font-mono)",
                      fontSize: 12,
                      lineHeight: 1.7,
                      color: "#cdd6f4",
                      marginBottom: 12,
                    }}
                  >
                    <span style={{ color: "#cba6f7" }}>import</span>
                    {" { "}
                    <span style={{ color: "#89b4fa" }}>YoXperienceProvider</span>
                    {", "}
                    <span style={{ color: "#89b4fa" }}>Slot</span>
                    {" } "}
                    <span style={{ color: "#cba6f7" }}>from</span>{" "}
                    <span style={{ color: "#a6e3a1" }}>
                      '@yoxperience/sdk'
                    </span>
                    ;
                    <br />
                    <br />
                    {"<"}
                    <span style={{ color: "#89b4fa" }}>
                      YoXperienceProvider
                    </span>
                    <br />
                    {"  "}
                    <span style={{ color: "#f9e2af" }}>apiBaseUrl</span>=
                    <span style={{ color: "#a6e3a1" }}>
                      "https://app.yoxperience.com"
                    </span>
                    <br />
                    {"  "}
                    <span style={{ color: "#f9e2af" }}>publishableKey</span>=
                    <span style={{ color: "#a6e3a1" }}>"yxp_pk_..."</span>
                    <br />
                    {"  "}
                    <span style={{ color: "#f9e2af" }}>userId</span>
                    {"={currentUser.id}"}
                    <br />
                    {">"}
                    <br />
                    {"  <"}
                    <span style={{ color: "#89b4fa" }}>Slot</span>{" "}
                    <span style={{ color: "#f9e2af" }}>name</span>=
                    <span style={{ color: "#a6e3a1" }}>"hero"</span>{" "}
                    <span style={{ color: "#f9e2af" }}>variants</span>
                    {"={{ ... }} />"}
                    <br />
                    {"</"}
                    <span style={{ color: "#89b4fa" }}>
                      YoXperienceProvider
                    </span>
                    {">"}
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      style={btnPrimary}
                      onClick={() => navigate("/slots")}
                    >
                      Define your first slot &rarr;
                    </button>
                    <button style={btnOutline}>View docs</button>
                  </div>
                </>
              )}

              {currentStep === 4 && (
                <>
                  <div
                    style={{
                      fontSize: "var(--yc-font-size-base)",
                      fontWeight: "var(--yc-font-weight-semibold)",
                      marginBottom: 6,
                    }}
                  >
                    Define your first adaptive slot
                  </div>
                  <p
                    style={{
                      fontSize: "var(--yc-font-size-sm)",
                      color: "var(--yc-color-text-secondary)",
                      lineHeight: 1.5,
                      marginBottom: 14,
                    }}
                  >
                    A slot is a region in your UI that shows different variants
                    to different users. YoXperience learns which works best.
                  </p>
                  <button
                    style={btnPrimary}
                    onClick={() => navigate("/slots")}
                  >
                    Go to Slots &rarr;
                  </button>
                </>
              )}

              {currentStep >= 5 && (
                <>
                  <div
                    style={{
                      fontSize: "var(--yc-font-size-base)",
                      fontWeight: "var(--yc-font-weight-semibold)",
                      marginBottom: 6,
                      color: "var(--yc-color-success)",
                    }}
                  >
                    ✓ Setup complete!
                  </div>
                  <p
                    style={{
                      fontSize: "var(--yc-font-size-sm)",
                      color: "var(--yc-color-text-secondary)",
                      lineHeight: 1.5,
                    }}
                  >
                    Your SDK is connected and sending events. Check the
                    Analytics page to monitor performance.
                  </p>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Integration status bar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "10px 14px",
          borderRadius: "var(--yc-radius-lg)",
          fontSize: "var(--yc-font-size-sm)",
          marginBottom: "var(--yc-space-5)",
          background: hasEvents ? "#dcfce7" : "#fef3c7",
          border: `1px solid ${hasEvents ? "#86efac" : "#fde68a"}`,
        }}
      >
        <div
          style={{
            width: 8,
            height: 8,
            borderRadius: "var(--yc-radius-full)",
            background: hasEvents
              ? "var(--yc-color-success)"
              : "var(--yc-color-warning)",
          }}
        />
        {hasEvents ? (
          <>
            <strong>SDK connected</strong> — Receiving events from{" "}
            {selectedProject?.name || "your project"}.
          </>
        ) : (
          <>
            <strong>Waiting for first event</strong> — Install the SDK and send
            telemetry to see data here.
          </>
        )}
      </div>

      {/* Stats */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: "var(--yc-space-3)",
          marginBottom: "var(--yc-space-6)",
        }}
      >
        {[
          {
            label: "Events (24h)",
            value: analytics?.totalEvents24h,
          },
          {
            label: "Active Slots",
            value: analytics?.activeSlots,
          },
          {
            label: "End Users",
            value: analytics?.uniqueUsers24h,
          },
          {
            label: "API Keys",
            value: hasKeys ? "Active" : "None",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              ...cardStyle,
              padding: "var(--yc-space-4)",
            }}
          >
            <div
              style={{
                fontSize: "var(--yc-font-size-xs)",
                color: "var(--yc-color-text-tertiary)",
                textTransform: "uppercase",
                letterSpacing: "0.03em",
                fontWeight: "var(--yc-font-weight-medium)",
              }}
            >
              {stat.label}
            </div>
            <div
              style={{
                fontSize: "24px",
                fontWeight: "var(--yc-font-weight-bold)",
                marginTop: 2,
                color:
                  stat.value === undefined || stat.value === 0 || stat.value === "None"
                    ? "var(--yc-color-border)"
                    : "var(--yc-color-text)",
              }}
            >
              {stat.value === undefined
                ? "—"
                : typeof stat.value === "number"
                  ? stat.value.toLocaleString()
                  : stat.value}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
