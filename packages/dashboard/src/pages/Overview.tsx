import { useNavigate } from "react-router-dom";
import { Layers, Key, Users, ArrowRight } from "lucide-react";
import { useAuth } from "../contexts/AuthContext.js";

const cardStyle: React.CSSProperties = {
  background: "var(--yc-color-bg-container)",
  borderRadius: "var(--yc-radius-xl)",
  border: "1px solid var(--yc-color-border-secondary)",
  padding: "var(--yc-space-6)",
};

export default function Overview() {
  const { user, org } = useAuth();
  const navigate = useNavigate();

  return (
    <div>
      <div style={{ marginBottom: "var(--yc-space-8)" }}>
        <h1
          style={{
            fontSize: "var(--yc-font-size-2xl)",
            fontWeight: "var(--yc-font-weight-bold)",
            marginBottom: "var(--yc-space-2)",
          }}
        >
          Welcome back, {user?.name?.split(" ")[0]}
        </h1>
        <p style={{ color: "var(--yc-color-text-secondary)" }}>
          {org?.name} &middot; {org?.plan ? org.plan.charAt(0).toUpperCase() + org.plan.slice(1) : "Hobby"} plan
        </p>
      </div>

      {/* Quick-start guide */}
      <div
        style={{
          ...cardStyle,
          marginBottom: "var(--yc-space-8)",
          background:
            "linear-gradient(135deg, var(--yc-color-brand-50), var(--yc-color-secondary-50))",
          border: "1px solid var(--yc-color-brand-200)",
        }}
      >
        <h2
          style={{
            fontSize: "var(--yc-font-size-lg)",
            fontWeight: "var(--yc-font-weight-semibold)",
            marginBottom: "var(--yc-space-4)",
          }}
        >
          Quick start
        </h2>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--yc-space-3)",
          }}
        >
          {[
            { num: 1, text: "Create a project for your app" },
            { num: 2, text: "Generate an API key" },
            {
              num: 3,
              text: "Install the SDK and wrap your app in <MorphProvider>",
            },
            { num: 4, text: "Define adaptive slots and start collecting data" },
          ].map((step) => (
            <div
              key={step.num}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--yc-space-3)",
              }}
            >
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "var(--yc-radius-full)",
                  background: "var(--yc-color-primary)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "var(--yc-font-size-xs)",
                  fontWeight: "var(--yc-font-weight-bold)",
                  flexShrink: 0,
                }}
              >
                {step.num}
              </span>
              <span
                style={{
                  fontSize: "var(--yc-font-size-base)",
                  color: "var(--yc-color-text)",
                }}
              >
                {step.text}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Placeholder cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "var(--yc-space-6)",
        }}
      >
        {[
          {
            icon: <Layers size={20} />,
            title: "Projects",
            desc: "Manage your apps and configurations",
            path: "/projects",
          },
          {
            icon: <Key size={20} />,
            title: "API Keys",
            desc: "Generate and manage access keys",
            path: "/projects",
          },
          {
            icon: <Users size={20} />,
            title: "Team",
            desc: "Invite members to your organization",
            path: "/team",
          },
        ].map((card) => (
          <div
            key={card.title}
            style={{ ...cardStyle, cursor: "pointer", transition: "border-color 0.15s" }}
            onClick={() => navigate(card.path)}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--yc-color-primary)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--yc-color-border-secondary)")}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--yc-space-3)",
                marginBottom: "var(--yc-space-3)",
                color: "var(--yc-color-primary)",
              }}
            >
              {card.icon}
              <h3
                style={{
                  fontSize: "var(--yc-font-size-md)",
                  fontWeight: "var(--yc-font-weight-semibold)",
                  color: "var(--yc-color-text)",
                }}
              >
                {card.title}
              </h3>
            </div>
            <p
              style={{
                fontSize: "var(--yc-font-size-sm)",
                color: "var(--yc-color-text-secondary)",
                marginBottom: "var(--yc-space-4)",
              }}
            >
              {card.desc}
            </p>
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "var(--yc-space-1)",
                fontSize: "var(--yc-font-size-sm)",
                color: "var(--yc-color-primary)",
                fontWeight: "var(--yc-font-weight-medium)",
              }}
            >
              Get started <ArrowRight size={14} />
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
