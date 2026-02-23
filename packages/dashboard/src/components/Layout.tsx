import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { LayoutDashboard, Layers, Users, Settings, LogOut } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.js";

const sidebarWidth = 240;

const navItemBase: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "var(--yc-space-3)",
  padding: "var(--yc-space-2) var(--yc-space-4)",
  borderRadius: "var(--yc-radius-md)",
  fontSize: "var(--yc-font-size-base)",
  color: "var(--yc-color-text-secondary)",
  textDecoration: "none",
  transition: "background 0.15s, color 0.15s",
};

const navItemActive: React.CSSProperties = {
  ...navItemBase,
  background: "var(--yc-color-fill)",
  color: "var(--yc-color-primary)",
  fontWeight: "var(--yc-font-weight-semibold)" as string,
};

export function Layout() {
  const { user, org, logout } = useAuth();
  const navigate = useNavigate();

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
          padding: "var(--yc-space-6) 0",
          flexShrink: 0,
        }}
      >
        {/* Logo */}
        <div
          style={{
            padding: "0 var(--yc-space-6)",
            marginBottom: "var(--yc-space-8)",
          }}
        >
          <span
            style={{
              fontSize: "var(--yc-font-size-xl)",
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

        {/* Nav */}
        <nav
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            gap: "var(--yc-space-1)",
            padding: "0 var(--yc-space-3)",
          }}
        >
          <NavLink
            to="/"
            end
            style={({ isActive }) => (isActive ? navItemActive : navItemBase)}
          >
            <LayoutDashboard size={18} />
            Overview
          </NavLink>
          <NavLink
            to="/projects"
            style={({ isActive }) => (isActive ? navItemActive : navItemBase)}
          >
            <Layers size={18} />
            Projects
          </NavLink>
          <NavLink
            to="/team"
            style={({ isActive }) => (isActive ? navItemActive : navItemBase)}
          >
            <Users size={18} />
            Team
          </NavLink>
          <NavLink
            to="/settings"
            style={({ isActive }) => (isActive ? navItemActive : navItemBase)}
          >
            <Settings size={18} />
            Settings
          </NavLink>
        </nav>

        {/* User section */}
        <div
          style={{
            padding: "var(--yc-space-4) var(--yc-space-6)",
            borderTop: "1px solid var(--yc-color-border-secondary)",
          }}
        >
          <div
            style={{
              fontSize: "var(--yc-font-size-sm)",
              fontWeight: "var(--yc-font-weight-medium)",
              color: "var(--yc-color-text)",
              marginBottom: "var(--yc-space-1)",
            }}
          >
            {user?.name}
          </div>
          <div
            style={{
              fontSize: "var(--yc-font-size-xs)",
              color: "var(--yc-color-text-tertiary)",
              marginBottom: "var(--yc-space-3)",
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
              fontSize: "var(--yc-font-size-sm)",
              color: "var(--yc-color-text-tertiary)",
              padding: 0,
            }}
          >
            <LogOut size={14} />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main
        style={{
          flex: 1,
          padding: "var(--yc-space-8)",
          overflow: "auto",
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
