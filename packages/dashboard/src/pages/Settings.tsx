import { useState, useEffect } from "react";
import { api } from "../lib/api-client.js";
import { useAuth } from "../contexts/AuthContext.js";

interface OrgDetail {
  id: string;
  name: string;
  slug: string;
  plan: string;
  createdAt: string;
  updatedAt: string;
}

const cardStyle: React.CSSProperties = {
  background: "var(--yc-color-bg-container)",
  borderRadius: "var(--yc-radius-xl)",
  border: "1px solid var(--yc-color-border-secondary)",
  padding: "var(--yc-space-6)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "var(--yc-space-2) var(--yc-space-3)",
  border: "1px solid var(--yc-color-border)",
  borderRadius: "var(--yc-radius-md)",
  fontSize: "var(--yc-font-size-base)",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "var(--yc-font-size-sm)",
  fontWeight: "var(--yc-font-weight-medium)",
  marginBottom: "var(--yc-space-1)",
  color: "var(--yc-color-text)",
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
  fontSize: "var(--yc-font-size-base)",
  fontWeight: "var(--yc-font-weight-medium)",
  cursor: "pointer",
};

const badgeBase: React.CSSProperties = {
  display: "inline-block",
  padding: "2px var(--yc-space-2)",
  borderRadius: "var(--yc-radius-full)",
  fontSize: "var(--yc-font-size-xs)",
  fontWeight: "var(--yc-font-weight-medium)",
};

const planColors: Record<string, React.CSSProperties> = {
  hobby: { background: "var(--yc-color-fill)", color: "var(--yc-color-text-secondary)" },
  pro: { background: "#dbeafe", color: "var(--yc-color-info)" },
  enterprise: { background: "#f3e8ff", color: "var(--yc-color-secondary-700)" },
};

export default function OrgSettings() {
  const { org, role, refreshUser } = useAuth();
  const [orgDetail, setOrgDetail] = useState<OrgDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [orgName, setOrgName] = useState("");
  const [orgSlug, setOrgSlug] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState("");

  const canEdit = role === "admin" || role === "owner";

  useEffect(() => {
    if (!org) return;
    (async () => {
      try {
        const res = await api<OrgDetail>(`/api/organizations/${org.id}`);
        setOrgDetail(res);
        setOrgName(res.name);
        setOrgSlug(res.slug);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, [org?.id]);

  const hasChanges = orgDetail && (orgName !== orgDetail.name || orgSlug !== orgDetail.slug);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSaveError("");
    setSaved(false);
    try {
      const res = await api<OrgDetail>(`/api/organizations/${org!.id}`, {
        method: "PATCH",
        body: JSON.stringify({ name: orgName, slug: orgSlug }),
      });
      setOrgDetail(res);
      setSaved(true);
      await refreshUser();
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: "var(--yc-space-16)", color: "var(--yc-color-text-secondary)" }}>
        Loading...
      </div>
    );
  }

  if (error || !orgDetail) {
    return (
      <div style={{ color: "var(--yc-color-error)", paddingTop: "var(--yc-space-8)" }}>{error || "Organization not found"}</div>
    );
  }

  return (
    <div>
      <h1 style={{ fontSize: "var(--yc-font-size-2xl)", fontWeight: "var(--yc-font-weight-bold)", margin: "0 0 var(--yc-space-8)" }}>
        Settings
      </h1>

      {/* Organization details */}
      <div style={{ ...cardStyle, marginBottom: "var(--yc-space-6)" }}>
        <h2 style={{ fontSize: "var(--yc-font-size-lg)", fontWeight: "var(--yc-font-weight-semibold)", margin: "0 0 var(--yc-space-6)" }}>
          Organization
        </h2>
        <form onSubmit={handleSave}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--yc-space-4)", marginBottom: "var(--yc-space-4)" }}>
            <div>
              <label style={labelStyle}>Name</label>
              {canEdit ? (
                <input style={inputStyle} value={orgName} onChange={(e) => setOrgName(e.target.value)} />
              ) : (
                <div style={{ fontSize: "var(--yc-font-size-base)", padding: "var(--yc-space-2) 0" }}>{orgName}</div>
              )}
            </div>
            <div>
              <label style={labelStyle}>Slug</label>
              {canEdit ? (
                <>
                  <input style={inputStyle} value={orgSlug} onChange={(e) => setOrgSlug(e.target.value)} />
                  <div style={{ fontSize: "var(--yc-font-size-xs)", color: "var(--yc-color-text-tertiary)", marginTop: "var(--yc-space-1)" }}>
                    Lowercase letters, numbers, and hyphens
                  </div>
                </>
              ) : (
                <div style={{ fontFamily: "var(--yc-font-mono)", fontSize: "var(--yc-font-size-base)", padding: "var(--yc-space-2) 0" }}>{orgSlug}</div>
              )}
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--yc-space-4)", marginBottom: "var(--yc-space-6)" }}>
            <div>
              <label style={labelStyle}>Plan</label>
              <span style={{ ...badgeBase, ...(planColors[orgDetail.plan] || planColors.hobby) }}>
                {orgDetail.plan.charAt(0).toUpperCase() + orgDetail.plan.slice(1)}
              </span>
            </div>
            <div>
              <label style={labelStyle}>Created</label>
              <div style={{ fontSize: "var(--yc-font-size-base)", padding: "var(--yc-space-2) 0", color: "var(--yc-color-text-secondary)" }}>
                {new Date(orgDetail.createdAt).toLocaleDateString()}
              </div>
            </div>
          </div>

          {saveError && (
            <div style={{ color: "var(--yc-color-error)", fontSize: "var(--yc-font-size-sm)", marginBottom: "var(--yc-space-4)" }}>{saveError}</div>
          )}

          {saved && (
            <div style={{ color: "var(--yc-color-success)", fontSize: "var(--yc-font-size-sm)", marginBottom: "var(--yc-space-4)" }}>Changes saved</div>
          )}

          {canEdit && hasChanges && (
            <button type="submit" style={btnPrimary} disabled={saving}>
              {saving ? "Saving..." : "Save changes"}
            </button>
          )}
        </form>
      </div>

      {/* Plan section */}
      <div style={{ ...cardStyle, marginBottom: "var(--yc-space-6)" }}>
        <h2 style={{ fontSize: "var(--yc-font-size-lg)", fontWeight: "var(--yc-font-weight-semibold)", margin: "0 0 var(--yc-space-4)" }}>
          Plan & Billing
        </h2>
        <p style={{ color: "var(--yc-color-text-secondary)", fontSize: "var(--yc-font-size-sm)", margin: "0 0 var(--yc-space-4)" }}>
          You are on the <strong>{orgDetail.plan}</strong> plan.
        </p>
        <button style={{ ...btnPrimary, opacity: 0.5, cursor: "not-allowed" }} disabled title="Coming soon">
          Upgrade plan
        </button>
      </div>

      {/* Danger zone */}
      <div style={{
        border: "1px solid var(--yc-color-error)",
        borderRadius: "var(--yc-radius-xl)",
        padding: "var(--yc-space-6)",
      }}>
        <h3 style={{ color: "var(--yc-color-error)", margin: "0 0 var(--yc-space-2)", fontSize: "var(--yc-font-size-md)" }}>
          Danger zone
        </h3>
        <p style={{ color: "var(--yc-color-text-secondary)", fontSize: "var(--yc-font-size-sm)", margin: "0 0 var(--yc-space-4)" }}>
          Contact support to delete your organization.
        </p>
        <button style={{ ...btnPrimary, background: "var(--yc-color-error)", opacity: 0.5, cursor: "not-allowed" }} disabled>
          Delete organization
        </button>
      </div>
    </div>
  );
}
