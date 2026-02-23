import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard,
  Layers,
  Key,
  BarChart3,
  Users,
  Settings,
  LogOut,
  ChevronDown,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext.js";
import { useState, useEffect } from "react";
import { api } from "../lib/api-client.js";

const sidebarWidth = 220;

interface ProjectSummary {
  id: string;
  name: string;
  slug: string;
}

const navItemBase: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "8px 12px",
  borderRadius: "var(--yc-radius-md)",
  fontSize: "var(--yc-font-size-base)",
  color: "var(--yc-color-text-secondary)",
  textDecoration: "none",
  transition: "background 0.15s, color 0.15s",
};

const navItemActive: React.CSSProperties = {
  ...navItemBase,
  background: "var(--yc-color-fill)",
  color: "var(--yc-color-text)",
  fontWeight: "var(--yc-font-weight-medium)" as string,
};

export function Layout() {
  const { user, org, logout } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [selectedProject, setSelectedProject] = useState<ProjectSummary | null>(
    null
  );
  const [showProjectDropdown, setShowProjectDropdown] = useState(false);

  useEffect(() => {
    api<{ projects: ProjectSummary[] }>("/api/projects")
      .then((res) => {
        setProjects(res.projects);
        if (res.projects.length > 0 && !selectedProject) {
          setSelectedProject(res.projects[0]);
        }
      })
      .catch(() => {});
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate("/signin");
  };

  return (
    <div style={{ display: "flex", minHeight: "100vh" }}>
      {/* Sidebar */}
      <aside
        style={{
          width: sidebarWidth,
          background: "var(--yc-color-bg-container)",
          borderRight: "1px solid var(--yc-color-border-secondary)",
          display: "flex",
          flexDirection: "column",
          padding: "20px 12px",
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div style={{ padding: "0 12px", marginBottom: "var(--yc-space-6)" }}>
          <span
            style={{
              fontSize: "var(--yc-font-size-md)",
              fontWeight: "var(--yc-font-weight-bold)",
              background:
                "linear-gradient(135deg, var(--yc-color-brand-600), var(--yc-color-secondary-600))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            YoXperience
          </span>
        </div>

        {/* Project selector */}
        <div
          style={{ position: "relative", marginBottom: "var(--yc-space-4)" }}
        >
          <button
            onClick={() => setShowProjectDropdown(!showProjectDropdown)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
              background: "var(--yc-color-fill)",
              borderRadius: "var(--yc-radius-lg)",
              border: "none",
              cursor: "pointer",
              fontSize: "var(--yc-font-size-sm)",
              fontWeight: "var(--yc-font-weight-medium)",
              color: "var(--yc-color-text)",
            }}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {selectedProject?.name || "Select project"}
            </span>
            <ChevronDown
              size={14}
              style={{ color: "var(--yc-color-text-tertiary)", flexShrink: 0 }}
            />
          </button>

          {showProjectDropdown && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                left: 0,
                right: 0,
                marginTop: 4,
                background: "var(--yc-color-bg-container)",
                border: "1px solid var(--yc-color-border-secondary)",
                borderRadius: "var(--yc-radius-lg)",
                boxShadow: "var(--yc-shadow-md)",
                zIndex: 20,
                overflow: "hidden",
              }}
            >
              {projects.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setSelectedProject(p);
                    setShowProjectDropdown(false);
                  }}
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background:
                      selectedProject?.id === p.id
                        ? "var(--yc-color-fill)"
                        : "transparent",
                    border: "none",
                    cursor: "pointer",
                    fontSize: "var(--yc-font-size-sm)",
                    textAlign: "left",
                    color: "var(--yc-color-text)",
                  }}
                >
                  {p.name}
                </button>
              ))}
              <button
                onClick={() => {
                  setShowProjectDropdown(false);
                  navigate("/projects");
                }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "transparent",
                  border: "none",
                  borderTop: "1px solid var(--yc-color-border-secondary)",
                  cursor: "pointer",
                  fontSize: "var(--yc-font-size-sm)",
                  textAlign: "left",
                  color: "var(--yc-color-primary)",
                }}
              >
                + New project
              </button>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <NavLink
            to="/"
            end
            style={({ isActive }) => (isActive ? navItemActive : navItemBase)}
          >
            <LayoutDashboard size={16} />
            Overview
          </NavLink>
          <NavLink
            to="/slots"
            style={({ isActive }) => (isActive ? navItemActive : navItemBase)}
          >
            <Layers size={16} />
            Slots
          </NavLink>
          <NavLink
            to="/projects"
            style={({ isActive }) => (isActive ? navItemActive : navItemBase)}
          >
            <Key size={16} />
            API Keys
          </NavLink>
          <NavLink
            to="/analytics"
            style={({ isActive }) => (isActive ? navItemActive : navItemBase)}
          >
            <BarChart3 size={16} />
            Analytics
          </NavLink>

          <div
            style={{
              height: 1,
              background: "var(--yc-color-border-secondary)",
              margin: "var(--yc-space-3) 0",
            }}
          />

          <NavLink
            to="/team"
            style={({ isActive }) => (isActive ? navItemActive : navItemBase)}
          >
            <Users size={16} />
            Team
          </NavLink>
          <NavLink
            to="/settings"
            style={({ isActive }) => (isActive ? navItemActive : navItemBase)}
          >
            <Settings size={16} />
            Settings
          </NavLink>
        </nav>

        {/* User section */}
        <div
          style={{
            padding: "12px",
            borderTop: "1px solid var(--yc-color-border-secondary)",
          }}
        >
          <div
            style={{
              fontSize: "var(--yc-font-size-sm)",
              fontWeight: "var(--yc-font-weight-medium)",
              color: "var(--yc-color-text)",
              marginBottom: 2,
            }}
          >
            {user?.name}
          </div>
          <div
            style={{
              fontSize: "var(--yc-font-size-xs)",
              color: "var(--yc-color-text-tertiary)",
              marginBottom: "var(--yc-space-2)",
            }}
          >
            {org?.name}
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--yc-space-2)",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "var(--yc-font-size-xs)",
              color: "var(--yc-color-text-tertiary)",
              padding: 0,
            }}
          >
            <LogOut size={12} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          padding: "var(--yc-space-8) var(--yc-space-12)",
          overflow: "auto",
          maxWidth: 1000,
        }}
      >
        <Outlet context={{ selectedProject, projects }} />
      </main>
    </div>
  );
}
