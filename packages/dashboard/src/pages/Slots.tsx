import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { Plus, Trash2, X } from "lucide-react";
import { api } from "../lib/api-client.js";

interface SlotDefinition {
  id: string;
  slotKey: string;
  description: string | null;
  variants: string; // JSON array
  defaultVariant: string;
  createdAt: string;
}

interface LayoutContext {
  selectedProject: { id: string; name: string } | null;
}

const cardStyle: React.CSSProperties = {
  background: "var(--yc-color-bg-container)",
  borderRadius: "var(--yc-radius-xl)",
  border: "1px solid var(--yc-color-border-secondary)",
  padding: "16px 20px",
  display: "flex",
  alignItems: "flex-start",
  gap: "14px",
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

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "var(--yc-space-2) var(--yc-space-3)",
  border: "1px solid var(--yc-color-border)",
  borderRadius: "var(--yc-radius-md)",
  fontSize: "var(--yc-font-size-base)",
  outline: "none",
  boxSizing: "border-box",
};

export default function Slots() {
  const { selectedProject } = useOutletContext<LayoutContext>();
  const [slots, setSlots] = useState<SlotDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [slotKey, setSlotKey] = useState("");
  const [description, setDescription] = useState("");
  const [variantInput, setVariantInput] = useState("");
  const [variants, setVariants] = useState<string[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!selectedProject) {
      setLoading(false);
      return;
    }
    setLoading(true);
    api<{ slots: SlotDefinition[] }>(
      `/api/projects/${selectedProject.id}/slots`
    )
      .then((res) => setSlots(res.slots))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [selectedProject?.id]);

  const addVariant = () => {
    const v = variantInput.trim();
    if (v && !variants.includes(v)) {
      setVariants([...variants, v]);
      setVariantInput("");
    }
  };

  const removeVariant = (v: string) => {
    setVariants(variants.filter((x) => x !== v));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProject || variants.length === 0) return;
    setCreating(true);
    setError("");
    try {
      const res = await api<{ slot: SlotDefinition }>(
        `/api/projects/${selectedProject.id}/slots`,
        {
          method: "POST",
          body: JSON.stringify({
            slotKey,
            description: description || undefined,
            variants,
            defaultVariant: variants[0],
          }),
        }
      );
      setSlots((prev) => [...prev, res.slot]);
      setSlotKey("");
      setDescription("");
      setVariants([]);
      setShowCreate(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (slotId: string) => {
    if (!selectedProject) return;
    if (!confirm("Delete this slot definition?")) return;
    try {
      await api(`/api/projects/${selectedProject.id}/slots/${slotId}`, {
        method: "DELETE",
      });
      setSlots((prev) => prev.filter((s) => s.id !== slotId));
    } catch (err: any) {
      alert(err.message);
    }
  };

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
          Slots
        </h1>
        <div
          style={{
            ...cardStyle,
            flexDirection: "column",
            alignItems: "center",
            padding: "var(--yc-space-12)",
            textAlign: "center",
            border: "2px dashed var(--yc-color-border-secondary)",
          }}
        >
          <p style={{ color: "var(--yc-color-text-secondary)" }}>
            Select a project from the sidebar to manage slots.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "var(--yc-space-6)",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "var(--yc-font-size-2xl)",
              fontWeight: "var(--yc-font-weight-bold)",
            }}
          >
            Slots
          </h1>
          <p
            style={{
              fontSize: "var(--yc-font-size-sm)",
              color: "var(--yc-color-text-secondary)",
              marginTop: 2,
            }}
          >
            {selectedProject.name} &middot; Adaptive UI regions
          </p>
        </div>
        <button style={btnPrimary} onClick={() => setShowCreate(true)}>
          <Plus size={16} /> Add slot
        </button>
      </div>

      {loading ? (
        <p style={{ color: "var(--yc-color-text-secondary)" }}>Loading...</p>
      ) : slots.length === 0 ? (
        <div
          style={{
            background: "var(--yc-color-bg-container)",
            border: "2px dashed var(--yc-color-border-secondary)",
            borderRadius: "var(--yc-radius-xl)",
            padding: "var(--yc-space-12)",
            textAlign: "center",
          }}
        >
          <div
            style={{
              fontSize: 32,
              marginBottom: "var(--yc-space-3)",
              opacity: 0.3,
            }}
          >
            ▦
          </div>
          <p
            style={{
              color: "var(--yc-color-text-tertiary)",
              marginBottom: "var(--yc-space-4)",
            }}
          >
            No slots defined yet.
            <br />
            Slots are the adaptive UI regions in your app.
          </p>
          <button style={btnPrimary} onClick={() => setShowCreate(true)}>
            Define your first slot
          </button>
        </div>
      ) : (
        <div
          style={{ display: "flex", flexDirection: "column", gap: "10px" }}
        >
          {slots.map((slot) => {
            const parsedVariants: string[] = JSON.parse(slot.variants);
            return (
              <div key={slot.id} style={cardStyle}>
                <div
                  style={{
                    width: 36,
                    height: 36,
                    background: "var(--yc-color-brand-50)",
                    borderRadius: "var(--yc-radius-lg)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 16,
                    flexShrink: 0,
                  }}
                >
                  ▦
                </div>
                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontFamily: "var(--yc-font-mono)",
                      fontSize: "var(--yc-font-size-base)",
                      fontWeight: "var(--yc-font-weight-semibold)",
                      color: "var(--yc-color-primary)",
                      marginBottom: 3,
                    }}
                  >
                    {slot.slotKey}
                  </div>
                  {slot.description && (
                    <div
                      style={{
                        fontSize: "var(--yc-font-size-xs)",
                        color: "var(--yc-color-text-secondary)",
                        marginBottom: 8,
                      }}
                    >
                      {slot.description}
                    </div>
                  )}
                  <div
                    style={{ display: "flex", gap: 4, flexWrap: "wrap" }}
                  >
                    {parsedVariants.map((v, i) => (
                      <span
                        key={v}
                        style={{
                          display: "inline-block",
                          padding: "2px 8px",
                          borderRadius: "var(--yc-radius-full)",
                          fontSize: "var(--yc-font-size-xs)",
                          fontWeight: "var(--yc-font-weight-medium)",
                          background:
                            i === 0
                              ? "var(--yc-color-primary)"
                              : "var(--yc-color-fill)",
                          color: i === 0 ? "#fff" : "var(--yc-color-text-secondary)",
                        }}
                      >
                        {v}
                        {i === 0 ? " (default)" : ""}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(slot.id)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--yc-color-text-tertiary)",
                    flexShrink: 0,
                    padding: 4,
                  }}
                  title="Delete slot"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Create slot modal */}
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
              width: 480,
              maxWidth: "90vw",
              boxShadow: "var(--yc-shadow-lg)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "var(--yc-space-6)",
              }}
            >
              <h2
                style={{
                  margin: 0,
                  fontSize: "var(--yc-font-size-xl)",
                  fontWeight: "var(--yc-font-weight-semibold)",
                }}
              >
                Define a slot
              </h2>
              <button
                onClick={() => setShowCreate(false)}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  color: "var(--yc-color-text-tertiary)",
                }}
              >
                <X size={20} />
              </button>
            </div>
            <form onSubmit={handleCreate}>
              <div style={{ marginBottom: "var(--yc-space-4)" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "var(--yc-font-size-sm)",
                    fontWeight: "var(--yc-font-weight-medium)",
                    marginBottom: 4,
                  }}
                >
                  Slot key
                </label>
                <input
                  style={inputStyle}
                  value={slotKey}
                  onChange={(e) => setSlotKey(e.target.value)}
                  placeholder="hero-banner"
                  required
                />
                <div
                  style={{
                    fontSize: "var(--yc-font-size-xs)",
                    color: "var(--yc-color-text-tertiary)",
                    marginTop: 4,
                  }}
                >
                  Used in your code: &lt;Slot name="{slotKey || "..."}" /&gt;
                </div>
              </div>
              <div style={{ marginBottom: "var(--yc-space-4)" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "var(--yc-font-size-sm)",
                    fontWeight: "var(--yc-font-weight-medium)",
                    marginBottom: 4,
                  }}
                >
                  Description (optional)
                </label>
                <input
                  style={inputStyle}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Main hero section on landing page"
                />
              </div>
              <div style={{ marginBottom: "var(--yc-space-4)" }}>
                <label
                  style={{
                    display: "block",
                    fontSize: "var(--yc-font-size-sm)",
                    fontWeight: "var(--yc-font-weight-medium)",
                    marginBottom: 4,
                  }}
                >
                  Variants
                </label>
                <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                  <input
                    style={{ ...inputStyle, flex: 1 }}
                    value={variantInput}
                    onChange={(e) => setVariantInput(e.target.value)}
                    placeholder="minimal"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addVariant();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={addVariant}
                    style={{ ...btnOutline, padding: "8px 12px" }}
                  >
                    +
                  </button>
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {variants.map((v, i) => (
                    <span
                      key={v}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 4,
                        padding: "4px 10px",
                        borderRadius: "var(--yc-radius-full)",
                        fontSize: "var(--yc-font-size-xs)",
                        background:
                          i === 0
                            ? "var(--yc-color-primary)"
                            : "var(--yc-color-fill)",
                        color: i === 0 ? "#fff" : "var(--yc-color-text-secondary)",
                      }}
                    >
                      {v}
                      {i === 0 ? " (default)" : ""}
                      <button
                        type="button"
                        onClick={() => removeVariant(v)}
                        style={{
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          color: "inherit",
                          padding: 0,
                          fontSize: 14,
                          lineHeight: 1,
                        }}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
                {variants.length === 0 && (
                  <div
                    style={{
                      fontSize: "var(--yc-font-size-xs)",
                      color: "var(--yc-color-text-tertiary)",
                      marginTop: 4,
                    }}
                  >
                    Add at least one variant. The first one is the default.
                  </div>
                )}
              </div>

              {/* Code preview */}
              {slotKey && variants.length > 0 && (
                <div
                  style={{
                    background: "#1e1e2e",
                    borderRadius: "var(--yc-radius-lg)",
                    padding: "14px 18px",
                    fontFamily: "var(--yc-font-mono)",
                    fontSize: "var(--yc-font-size-xs)",
                    lineHeight: 1.7,
                    color: "#cdd6f4",
                    marginBottom: "var(--yc-space-4)",
                  }}
                >
                  <span style={{ color: "#6c7086" }}>
                    {"// In your React component"}
                  </span>
                  <br />
                  {"<"}
                  <span style={{ color: "#89b4fa" }}>Slot</span>
                  <br />
                  {"  "}
                  <span style={{ color: "#f9e2af" }}>name</span>=
                  <span style={{ color: "#a6e3a1" }}>"{slotKey}"</span>
                  <br />
                  {"  "}
                  <span style={{ color: "#f9e2af" }}>variants</span>
                  {"={{"}
                  <br />
                  {variants.map((v) => (
                    <span key={v}>
                      {"    "}
                      <span style={{ color: "#f9e2af" }}>{v}</span>:{" "}
                      <span style={{ color: "#89b4fa" }}>
                        {v.charAt(0).toUpperCase() + v.slice(1).replace(/-./g, (m) => m[1].toUpperCase())}
                        Component
                      </span>
                      ,
                      <br />
                    </span>
                  ))}
                  {"  }}"}
                  <br />
                  {"/>"}
                </div>
              )}

              {error && (
                <div
                  style={{
                    color: "var(--yc-color-error)",
                    fontSize: "var(--yc-font-size-sm)",
                    marginBottom: "var(--yc-space-4)",
                  }}
                >
                  {error}
                </div>
              )}
              <div
                style={{
                  display: "flex",
                  gap: "var(--yc-space-3)",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  style={btnOutline}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={btnPrimary}
                  disabled={creating || variants.length === 0}
                >
                  {creating ? "Creating..." : "Create slot"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
