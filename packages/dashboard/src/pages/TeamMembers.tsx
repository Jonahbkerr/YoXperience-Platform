import { useState, useEffect } from "react";
import { UserPlus, X } from "lucide-react";
import { api } from "../lib/api-client.js";
import { useAuth } from "../contexts/AuthContext.js";

interface Member {
  id: string;
  userId: string;
  email: string;
  name: string;
  role: string;
  createdAt: string;
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

const badgeBase: React.CSSProperties = {
  display: "inline-block",
  padding: "2px var(--yc-space-2)",
  borderRadius: "var(--yc-radius-full)",
  fontSize: "var(--yc-font-size-xs)",
  fontWeight: "var(--yc-font-weight-medium)",
};

const roleBadgeColors: Record<string, React.CSSProperties> = {
  owner: { background: "#f3e8ff", color: "var(--yc-color-secondary-700)" },
  admin: { background: "#dbeafe", color: "var(--yc-color-info)" },
  member: { background: "var(--yc-color-fill)", color: "var(--yc-color-text-secondary)" },
};

export default function TeamMembers() {
  const { user, org, role: myRole } = useAuth();
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"member" | "admin">("member");
  const [inviting, setInviting] = useState(false);
  const [inviteError, setInviteError] = useState("");

  const canManage = myRole === "owner" || myRole === "admin";

  async function fetchMembers() {
    if (!org) return;
    try {
      const res = await api<{ members: Member[] }>(`/api/organizations/${org.id}/members`);
      setMembers(res.members);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchMembers();
  }, [org?.id]);

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault();
    setInviting(true);
    setInviteError("");
    try {
      await api(`/api/organizations/${org!.id}/members/invite`, {
        method: "POST",
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });
      setInviteEmail("");
      setInviteRole("member");
      setShowInvite(false);
      await fetchMembers();
    } catch (err: any) {
      setInviteError(err.message);
    } finally {
      setInviting(false);
    }
  }

  async function handleChangeRole(memberId: string, newRole: string) {
    try {
      await api(`/api/organizations/${org!.id}/members/${memberId}`, {
        method: "PATCH",
        body: JSON.stringify({ role: newRole }),
      });
      await fetchMembers();
    } catch (err: any) {
      alert(err.message);
    }
  }

  async function handleRemove(memberId: string, memberName: string) {
    if (!confirm(`Remove ${memberName} from the team?`)) return;
    try {
      await api(`/api/organizations/${org!.id}/members/${memberId}`, { method: "DELETE" });
      await fetchMembers();
    } catch (err: any) {
      alert(err.message);
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
          Team
        </h1>
        {canManage && (
          <button style={btnPrimary} onClick={() => { setInviteError(""); setShowInvite(true); }}>
            <UserPlus size={16} /> Invite member
          </button>
        )}
      </div>

      {error && (
        <div style={{ color: "var(--yc-color-error)", marginBottom: "var(--yc-space-4)" }}>{error}</div>
      )}

      {/* Members list */}
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--yc-space-3)" }}>
        {members.map((m) => (
          <div key={m.id} style={{ ...cardStyle, display: "flex", alignItems: "center", gap: "var(--yc-space-4)", padding: "var(--yc-space-4) var(--yc-space-6)" }}>
            {/* Avatar */}
            <div style={{
              width: 36,
              height: 36,
              borderRadius: "var(--yc-radius-full)",
              background: "var(--yc-color-secondary-100)",
              color: "var(--yc-color-secondary-700)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: "var(--yc-font-weight-semibold)",
              fontSize: "var(--yc-font-size-sm)",
              flexShrink: 0,
            }}>
              {m.name.charAt(0).toUpperCase()}
            </div>

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: "var(--yc-font-weight-medium)", fontSize: "var(--yc-font-size-base)" }}>
                {m.name}
                {m.userId === user?.id && (
                  <span style={{ color: "var(--yc-color-text-tertiary)", fontWeight: "normal", marginLeft: "var(--yc-space-1)" }}>(you)</span>
                )}
              </div>
              <div style={{ fontSize: "var(--yc-font-size-sm)", color: "var(--yc-color-text-secondary)" }}>{m.email}</div>
            </div>

            {/* Role badge */}
            <span style={{ ...badgeBase, ...(roleBadgeColors[m.role] || roleBadgeColors.member) }}>
              {m.role.charAt(0).toUpperCase() + m.role.slice(1)}
            </span>

            {/* Actions */}
            {canManage && m.role !== "owner" && m.userId !== user?.id && (
              <div style={{ display: "flex", gap: "var(--yc-space-2)" }}>
                {myRole === "owner" && (
                  <select
                    value={m.role}
                    onChange={(e) => handleChangeRole(m.id, e.target.value)}
                    style={{ ...inputStyle, width: "auto", padding: "var(--yc-space-1) var(--yc-space-2)", fontSize: "var(--yc-font-size-xs)" }}
                  >
                    <option value="member">Member</option>
                    <option value="admin">Admin</option>
                  </select>
                )}
                <button
                  onClick={() => handleRemove(m.id, m.name)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "var(--yc-color-error)", fontSize: "var(--yc-font-size-xs)" }}
                >
                  Remove
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Invite modal */}
      {showInvite && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }} onClick={() => setShowInvite(false)}>
          <div style={{ background: "var(--yc-color-bg-container)", borderRadius: "var(--yc-radius-xl)", padding: "var(--yc-space-8)", width: 440, maxWidth: "90vw", boxShadow: "var(--yc-shadow-lg)" }} onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "var(--yc-space-6)" }}>
              <h2 style={{ margin: 0, fontSize: "var(--yc-font-size-xl)", fontWeight: "var(--yc-font-weight-semibold)" }}>Invite team member</h2>
              <button onClick={() => setShowInvite(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--yc-color-text-tertiary)" }}><X size={20} /></button>
            </div>
            <form onSubmit={handleInvite}>
              <div style={{ marginBottom: "var(--yc-space-4)" }}>
                <label style={{ display: "block", fontSize: "var(--yc-font-size-sm)", fontWeight: "var(--yc-font-weight-medium)", marginBottom: "var(--yc-space-1)" }}>Email</label>
                <input
                  type="email"
                  style={inputStyle}
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  required
                />
              </div>
              <div style={{ marginBottom: "var(--yc-space-6)" }}>
                <label style={{ display: "block", fontSize: "var(--yc-font-size-sm)", fontWeight: "var(--yc-font-weight-medium)", marginBottom: "var(--yc-space-1)" }}>Role</label>
                <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value as "member" | "admin")} style={{ ...inputStyle, cursor: "pointer" }}>
                  <option value="member">Member — can view projects and keys</option>
                  <option value="admin">Admin — can create and manage projects</option>
                </select>
              </div>
              {inviteError && <div style={{ color: "var(--yc-color-error)", fontSize: "var(--yc-font-size-sm)", marginBottom: "var(--yc-space-4)" }}>{inviteError}</div>}
              <div style={{ display: "flex", gap: "var(--yc-space-3)", justifyContent: "flex-end" }}>
                <button type="button" onClick={() => setShowInvite(false)} style={btnOutline}>Cancel</button>
                <button type="submit" style={btnPrimary} disabled={inviting}>{inviting ? "Inviting..." : "Send invite"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
