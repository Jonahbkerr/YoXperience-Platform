import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Copy, Check, Trash2, X } from "lucide-react";
import { api } from "../lib/api-client.js";

interface Project {
  id: string;
  name: string;
  slug: string;
  coreApiUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ApiKey {
  id: string;
  name: string;
  keyPrefix: string;
  lastFour: string;
  type: string;
  isActive: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

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

const btnOutline: React.CSSProperties = {
  ...btnPrimary,
  background: "transparent",
  color: "var(--yc-color-text-secondary)",
  border: "1px solid var(--yc-color-border)",
};

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

const badgeBase: React.CSSProperties = {
  display: "inline-block",
  padding: "2px var(--yc-space-2)",
  borderRadius: "var(--yc-radius-full)",
  fontSize: "var(--yc-font-size-xs)",
  fontWeight: "var(--yc-font-weight-medium)",
};

export default function ProjectDetail() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();

  const [project, setProject] = useState<Project | null>(null);
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Generate key modal
  const [showGenerate, setShowGenerate] = useState(false);
  const [keyName, setKeyName] = useState("");
  const [keyType, setKeyType] = useState<"publishable" | "secret">("publishable");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState("");
  const [newRawKey, setNewRawKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Edit modal
  const [showEdit, setShowEdit] = useState(false);
  const [editName, setEditName] = useState("");
  const [editSlug, setEditSlug] = useState("");
  const [editApiUrl, setEditApiUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState("");

  // Delete confirm
  const [showDelete, setShowDelete] = useState(false);

  async function fetchProject() {
    try {
      const res = await api<{ project: Project; keys: ApiKey[] }>(`/api/projects/${projectId}`);
      setProject(res.project);
      setKeys(res.keys);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  async function handleGenerateKey(e: React.FormEvent) {
    e.preventDefault();
    setGenerating(true);
    setGenError("");
    try {
      const res = await api<{ key: ApiKey; rawKey: string }>(`/api/projects/${projectId}/keys`, {
        method: "POST",
        body: JSON.stringify({ name: keyName, type: keyType }),
      });
      setNewRawKey(res.rawKey);
      setKeys((prev) => [res.key, ...prev]);
      setKeyName("");
      setKeyType("publishable");
      setShowGenerate(false);
    } catch (err: any) {
      setGenError(err.message);
    } finally {
      setGenerating(false);
    }
  }

  async function handleRevokeKey(keyId: string) {
    if (!confirm("Revoke this API key? This cannot be undone.")) return;
    try {
      await api(`/api/projects/${projectId}/keys/${keyId}`, { method: "DELETE" });
      setKeys((prev) => prev.map((k) => (k.id === keyId ? { ...k, isActive: false } : k)));
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleEdit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setEditError("");
    try {
      const res = await api<Project>(`/api/projects/${projectId}`, {
        method: "PATCH",
        body: JSON.stringify({ name: editName, slug: editSlug, coreApiUrl: editApiUrl }),
      });
      setProject(res);
      setShowEdit(false);
    } catch (err: any) {
      setEditError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    try {
      await api(`/api/projects/${projectId}`, { method: "DELETE" });
      navigate("/projects");
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function copyKey(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: "var(--yc-space-16)", color: "var(--yc-color-text-secondary)" }}>
        Loading...
      </div>
    );
  }

  if (error || !project) {
    return (
      <div style={{ color: "var(--yc-color-error)", paddingTop: "var(--yc-space-8)" }}>
        {error || "Project not found"}
      </div>
    );
  }

  return (
    <div>
      {/* Back link */}
      <button
        onClick={() => navigate("/projects")}
        style={{ ...btnOutline, border: "none", padding: 0, marginBottom: "var(--yc-space-4)", color: "var(--yc-color-text-secondary)" }}
      >
        <ArrowLeft size={16} /> Projects
      </button>

      {/* Project header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "var(--yc-space-6)" }}>
        <div>
          <h1 style={{ fontSize: "var(--yc-font-size-2xl)", fontWeight: "var(--yc-font-weight-bold)", margin: 0 }}>
            {project.name}
          </h1>
          <div style={{ fontFamily: "var(--yc-font-mono)", fontSize: "var(--yc-font-size-sm)", color: "var(--yc-color-text-tertiary)", marginTop: "var(--yc-space-1)" }}>
            {project.slug}
          </div>
        </div>
        <button
          style={btnOutline}
          onClick={() => {
            setEditName(project.name);
            setEditSlug(project.slug);
            setEditApiUrl(project.coreApiUrl || "");
            setEditError("");
            setShowEdit(true);
          }}
        >
          Edit
        </button>
      </div>

      {/* Project info */}
      <div style={{ ...cardStyle, marginBottom: "var(--yc-space-8)" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "var(--yc-space-4)", fontSize: "var(--yc-font-size-sm)" }}>
          <div>
            <div style={{ color: "var(--yc-color-text-tertiary)", marginBottom: "var(--yc-space-1)" }}>Core API URL</div>
            <div style={{ fontFamily: "var(--yc-font-mono)" }}>{project.coreApiUrl || "Not configured"}</div>
          </div>
          <div>
            <div style={{ color: "var(--yc-color-text-tertiary)", marginBottom: "var(--yc-space-1)" }}>Created</div>
            <div>{new Date(project.createdAt).toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      {/* New key banner */}
      {newRawKey && (
        <div style={{
          background: "#ecfdf5",
          border: "1px solid var(--yc-color-success)",
          borderRadius: "var(--yc-radius-lg)",
          padding: "var(--yc-space-4) var(--yc-space-6)",
          marginBottom: "var(--yc-space-6)",
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--yc-space-2)" }}>
            <strong style={{ color: "var(--yc-color-success)" }}>API key created</strong>
            <button onClick={() => setNewRawKey(null)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--yc-color-text-tertiary)" }}>
              <X size={16} />
            </button>
          </div>
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--yc-space-3)",
            background: "#fff",
            border: "1px solid var(--yc-color-border)",
            borderRadius: "var(--yc-radius-md)",
            padding: "var(--yc-space-2) var(--yc-space-3)",
            fontFamily: "var(--yc-font-mono)",
            fontSize: "var(--yc-font-size-sm)",
            wordBreak: "break-all",
          }}>
            <span style={{ flex: 1 }}>{newRawKey}</span>
            <button onClick={() => copyKey(newRawKey)} style={{ background: "none", border: "none", cursor: "pointer", flexShrink: 0 }}>
              {copied ? <Check size={16} style={{ color: "var(--yc-color-success)" }} /> : <Copy size={16} />}
            </button>
          </div>
          <div style={{ fontSize: "var(--yc-font-size-xs)", color: "var(--yc-color-warning)", marginTop: "var(--yc-space-2)" }}>
            Copy this key now. It will not be shown again.
          </div>
        </div>
      )}

      {/* API Keys section */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--yc-space-4)" }}>
        <h2 style={{ fontSize: "var(--yc-font-size-xl)", fontWeight: "var(--yc-font-weight-semibold)", margin: 0 }}>
          API Keys
        </h2>
        <button style={btnPrimary} onClick={() => { setGenError(""); setShowGenerate(true); }}>
          <Plus size={16} /> Generate key
        </button>
      </div>

      {keys.length === 0 ? (
        <div style={{ ...cardStyle, textAlign: "center", padding: "var(--yc-space-10)", color: "var(--yc-color-text-secondary)" }}>
          No API keys yet. Generate one to get started.
        </div>
      ) : (
        <div style={{ ...cardStyle, padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "var(--yc-font-size-sm)" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--yc-color-border-secondary)" }}>
                <th style={{ textAlign: "left", padding: "var(--yc-space-3) var(--yc-space-4)", color: "var(--yc-color-text-tertiary)", fontWeight: "var(--yc-font-weight-medium)" }}>Name</th>
                <th style={{ textAlign: "left", padding: "var(--yc-space-3) var(--yc-space-4)", color: "var(--yc-color-text-tertiary)", fontWeight: "var(--yc-font-weight-medium)" }}>Key</th>
                <th style={{ textAlign: "left", padding: "var(--yc-space-3) var(--yc-space-4)", color: "var(--yc-color-text-tertiary)", fontWeight: "var(--yc-font-weight-medium)" }}>Type</th>
                <th style={{ textAlign: "left", padding: "var(--yc-space-3) var(--yc-space-4)", color: "var(--yc-color-text-tertiary)", fontWeight: "var(--yc-font-weight-medium)" }}>Created</th>
                <th style={{ textAlign: "right", padding: "var(--yc-space-3) var(--yc-space-4)" }}></th>
              </tr>
            </thead>
            <tbody>
              {keys.map((k) => (
                <tr key={k.id} style={{ borderBottom: "1px solid var(--yc-color-border-secondary)" }}>
                  <td style={{ padding: "var(--yc-space-3) var(--yc-space-4)", fontWeight: "var(--yc-font-weight-medium)" }}>
                    {k.name}
                    {!k.isActive && (
                      <span style={{ ...badgeBase, background: "#fef2f2", color: "var(--yc-color-error)", marginLeft: "var(--yc-space-2)" }}>
                        Revoked
                      </span>
                    )}
                  </td>
                  <td style={{ padding: "var(--yc-space-3) var(--yc-space-4)", fontFamily: "var(--yc-font-mono)", color: "var(--yc-color-text-tertiary)" }}>
                    {k.keyPrefix}...{k.lastFour}
                  </td>
                  <td style={{ padding: "var(--yc-space-3) var(--yc-space-4)" }}>
                    <span style={{
                      ...badgeBase,
                      background: k.type === "publishable" ? "#ecfdf5" : "#fff7ed",
                      color: k.type === "publishable" ? "var(--yc-color-success)" : "var(--yc-color-warning)",
                    }}>
                      {k.type === "publishable" ? "Publishable" : "Secret"}
                    </span>
                  </td>
                  <td style={{ padding: "var(--yc-space-3) var(--yc-space-4)", color: "var(--yc-color-text-secondary)" }}>
                    {new Date(k.createdAt).toLocaleDateString()}
                  </td>
                  <td style={{ padding: "var(--yc-space-3) var(--yc-space-4)", textAlign: "right" }}>
                    {k.isActive && (
                      <button
                        onClick={() => handleRevokeKey(k.id)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--yc-color-text-tertiary)" }}
                        title="Revoke key"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Danger zone */}
      <div style={{
        marginTop: "var(--yc-space-10)",
        border: "1px solid var(--yc-color-error)",
        borderRadius: "var(--yc-radius-xl)",
        padding: "var(--yc-space-6)",
      }}>
        <h3 style={{ color: "var(--yc-color-error)", margin: "0 0 var(--yc-space-2)", fontSize: "var(--yc-font-size-md)" }}>
          Danger zone
        </h3>
        <p style={{ color: "var(--yc-color-text-secondary)", fontSize: "var(--yc-font-size-sm)", margin: "0 0 var(--yc-space-4)" }}>
          Deleting this project will permanently remove all its API keys. This action cannot be undone.
        </p>
        <button
          onClick={() => setShowDelete(true)}
          style={{ ...btnPrimary, background: "var(--yc-color-error)" }}
        >
          Delete project
        </button>
      </div>

      {/* Generate key modal */}
      {showGenerate && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={() => setShowGenerate(false)}>
          <div style={{ background: "var(--yc-color-bg-container)", borderRadius: "var(--yc-radius-xl)", padding: "var(--yc-space-8)", width: 440, maxWidth: "90vw", boxShadow: "var(--yc-shadow-lg)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--yc-space-6)" }}>
              <h2 style={{ margin: 0, fontSize: "var(--yc-font-size-xl)", fontWeight: "var(--yc-font-weight-semibold)" }}>Generate API key</h2>
              <button onClick={() => setShowGenerate(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--yc-color-text-tertiary)" }}><X size={20} /></button>
            </div>
            <form onSubmit={handleGenerateKey}>
              <div style={{ marginBottom: "var(--yc-space-4)" }}>
                <label style={labelStyle}>Key name</label>
                <input style={inputStyle} value={keyName} onChange={(e) => setKeyName(e.target.value)} placeholder="Production key" required />
              </div>
              <div style={{ marginBottom: "var(--yc-space-6)" }}>
                <label style={labelStyle}>Type</label>
                <select
                  value={keyType}
                  onChange={(e) => setKeyType(e.target.value as "publishable" | "secret")}
                  style={{ ...inputStyle, cursor: "pointer" }}
                >
                  <option value="publishable">Publishable — safe for client-side</option>
                  <option value="secret">Secret — server-side only</option>
                </select>
              </div>
              {genError && <div style={{ color: "var(--yc-color-error)", fontSize: "var(--yc-font-size-sm)", marginBottom: "var(--yc-space-4)" }}>{genError}</div>}
              <div style={{ display: "flex", gap: "var(--yc-space-3)", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowGenerate(false)} style={btnOutline}>Cancel</button>
                <button type="submit" style={btnPrimary} disabled={generating}>{generating ? "Generating..." : "Generate key"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {showEdit && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={() => setShowEdit(false)}>
          <div style={{ background: "var(--yc-color-bg-container)", borderRadius: "var(--yc-radius-xl)", padding: "var(--yc-space-8)", width: 440, maxWidth: "90vw", boxShadow: "var(--yc-shadow-lg)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--yc-space-6)" }}>
              <h2 style={{ margin: 0, fontSize: "var(--yc-font-size-xl)", fontWeight: "var(--yc-font-weight-semibold)" }}>Edit project</h2>
              <button onClick={() => setShowEdit(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--yc-color-text-tertiary)" }}><X size={20} /></button>
            </div>
            <form onSubmit={handleEdit}>
              <div style={{ marginBottom: "var(--yc-space-4)" }}>
                <label style={labelStyle}>Name</label>
                <input style={inputStyle} value={editName} onChange={(e) => setEditName(e.target.value)} required />
              </div>
              <div style={{ marginBottom: "var(--yc-space-4)" }}>
                <label style={labelStyle}>Slug</label>
                <input style={inputStyle} value={editSlug} onChange={(e) => setEditSlug(e.target.value)} required />
              </div>
              <div style={{ marginBottom: "var(--yc-space-6)" }}>
                <label style={labelStyle}>Core API URL</label>
                <input style={inputStyle} value={editApiUrl} onChange={(e) => setEditApiUrl(e.target.value)} placeholder="https://api.example.com" />
              </div>
              {editError && <div style={{ color: "var(--yc-color-error)", fontSize: "var(--yc-font-size-sm)", marginBottom: "var(--yc-space-4)" }}>{editError}</div>}
              <div style={{ display: "flex", gap: "var(--yc-space-3)", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowEdit(false)} style={btnOutline}>Cancel</button>
                <button type="submit" style={btnPrimary} disabled={saving}>{saving ? "Saving..." : "Save"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirm modal */}
      {showDelete && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={() => setShowDelete(false)}>
          <div style={{ background: "var(--yc-color-bg-container)", borderRadius: "var(--yc-radius-xl)", padding: "var(--yc-space-8)", width: 400, maxWidth: "90vw", boxShadow: "var(--yc-shadow-lg)" }} onClick={(e) => e.stopPropagation()}>
            <h2 style={{ margin: "0 0 var(--yc-space-4)", fontSize: "var(--yc-font-size-xl)", fontWeight: "var(--yc-font-weight-semibold)" }}>Delete project?</h2>
            <p style={{ color: "var(--yc-color-text-secondary)", fontSize: "var(--yc-font-size-sm)", margin: "0 0 var(--yc-space-6)" }}>
              This will permanently delete <strong>{project.name}</strong> and all its API keys. This cannot be undone.
            </p>
            <div style={{ display: "flex", gap: "var(--yc-space-3)", justifyContent: "flex-end" }}>
              <button onClick={() => setShowDelete(false)} style={btnOutline}>Cancel</button>
              <button onClick={handleDelete} style={{ ...btnPrimary, background: "var(--yc-color-error)" }}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
