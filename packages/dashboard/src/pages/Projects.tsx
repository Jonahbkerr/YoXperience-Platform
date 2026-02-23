import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Layers, Key, X } from "lucide-react";
import { api } from "../lib/api-client.js";

interface Project {
  id: string;
  name: string;
  slug: string;
  coreApiUrl: string | null;
  createdAt: string;
  updatedAt: string;
  keyCount: number;
}

const cardStyle: React.CSSProperties = {
  background: "var(--yc-color-bg-container)",
  borderRadius: "var(--yc-radius-xl)",
  border: "1px solid var(--yc-color-border-secondary)",
  padding: "var(--yc-space-6)",
  cursor: "pointer",
  transition: "border-color 0.15s",
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

export default function Projects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [coreApiUrl, setCoreApiUrl] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  async function fetchProjects() {
    try {
      const res = await api<{ projects: Project[] }>("/api/projects");
      setProjects(res.projects);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProjects();
  }, []);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError("");
    try {
      await api("/api/projects", {
        method: "POST",
        body: JSON.stringify({ name, coreApiUrl: coreApiUrl || undefined }),
      });
      setName("");
      setCoreApiUrl("");
      setShowCreate(false);
      await fetchProjects();
    } catch (err: any) {
      setCreateError(err.message);
    } finally {
      setCreating(false);
    }
  }

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", paddingTop: "var(--yc-space-16)", color: "var(--yc-color-text-secondary)" }}>
        Loading...
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--yc-space-8)" }}>
        <h1 style={{ fontSize: "var(--yc-font-size-2xl)", fontWeight: "var(--yc-font-weight-bold)", margin: 0 }}>
          Projects
        </h1>
        <button style={btnPrimary} onClick={() => setShowCreate(true)}>
          <Plus size={16} /> New project
        </button>
      </div>

      {error && (
        <div style={{ color: "var(--yc-color-error)", marginBottom: "var(--yc-space-4)" }}>{error}</div>
      )}

      {/* Project grid */}
      {projects.length === 0 ? (
        <div style={{ ...cardStyle, cursor: "default", textAlign: "center", padding: "var(--yc-space-16)" }}>
          <Layers size={40} style={{ color: "var(--yc-color-text-tertiary)", marginBottom: "var(--yc-space-4)" }} />
          <p style={{ fontSize: "var(--yc-font-size-md)", color: "var(--yc-color-text-secondary)", margin: 0 }}>
            No projects yet. Create your first project to get started.
          </p>
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "var(--yc-space-4)" }}>
          {projects.map((p) => (
            <div
              key={p.id}
              style={cardStyle}
              onClick={() => navigate(`/projects/${p.id}`)}
              onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--yc-color-primary)")}
              onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--yc-color-border-secondary)")}
            >
              <div style={{ fontWeight: "var(--yc-font-weight-semibold)", fontSize: "var(--yc-font-size-md)", marginBottom: "var(--yc-space-1)" }}>
                {p.name}
              </div>
              <div style={{ fontFamily: "var(--yc-font-mono)", fontSize: "var(--yc-font-size-sm)", color: "var(--yc-color-text-tertiary)", marginBottom: "var(--yc-space-4)" }}>
                {p.slug}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "var(--yc-font-size-sm)", color: "var(--yc-color-text-secondary)" }}>
                <span style={{ display: "inline-flex", alignItems: "center", gap: "var(--yc-space-1)" }}>
                  <Key size={12} /> {p.keyCount} API key{p.keyCount !== 1 ? "s" : ""}
                </span>
                <span>{new Date(p.createdAt).toLocaleDateString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 50,
          }}
          onClick={() => setShowCreate(false)}
        >
          <div
            style={{
              background: "var(--yc-color-bg-container)",
              borderRadius: "var(--yc-radius-xl)",
              padding: "var(--yc-space-8)",
              width: 440,
              maxWidth: "90vw",
              boxShadow: "var(--yc-shadow-lg)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--yc-space-6)" }}>
              <h2 style={{ margin: 0, fontSize: "var(--yc-font-size-xl)", fontWeight: "var(--yc-font-weight-semibold)" }}>
                New project
              </h2>
              <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--yc-color-text-tertiary)" }}>
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: "var(--yc-space-4)" }}>
                <label style={labelStyle}>Project name</label>
                <input style={inputStyle} value={name} onChange={(e) => setName(e.target.value)} placeholder="My App" required />
              </div>
              <div style={{ marginBottom: "var(--yc-space-6)" }}>
                <label style={labelStyle}>Core API URL <span style={{ color: "var(--yc-color-text-tertiary)", fontWeight: "normal" }}>(optional)</span></label>
                <input style={inputStyle} value={coreApiUrl} onChange={(e) => setCoreApiUrl(e.target.value)} placeholder="https://api.example.com" />
              </div>
              {createError && (
                <div style={{ color: "var(--yc-color-error)", fontSize: "var(--yc-font-size-sm)", marginBottom: "var(--yc-space-4)" }}>{createError}</div>
              )}
              <div style={{ display: "flex", gap: "var(--yc-space-3)", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  style={{ ...btnPrimary, background: "transparent", color: "var(--yc-color-text-secondary)", border: "1px solid var(--yc-color-border)" }}
                >
                  Cancel
                </button>
                <button type="submit" style={btnPrimary} disabled={creating}>
                  {creating ? "Creating..." : "Create project"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
