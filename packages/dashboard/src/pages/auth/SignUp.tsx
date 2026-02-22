import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext.js";

export default function SignUp() {
  const { signup } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signup({ email, password, name, orgName });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
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

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--yc-space-6)",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 400,
          background: "var(--yc-color-bg-container)",
          borderRadius: "var(--yc-radius-xl)",
          boxShadow: "var(--yc-shadow-lg)",
          padding: "var(--yc-space-10)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "var(--yc-space-8)" }}>
          <h1
            style={{
              fontSize: "var(--yc-font-size-2xl)",
              fontWeight: "var(--yc-font-weight-bold)",
              background:
                "linear-gradient(135deg, var(--yc-color-brand-600), var(--yc-color-secondary-600))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              marginBottom: "var(--yc-space-2)",
            }}
          >
            YoXperience
          </h1>
          <p
            style={{
              fontSize: "var(--yc-font-size-base)",
              color: "var(--yc-color-text-secondary)",
            }}
          >
            Create your account
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div
              style={{
                background: "#fef2f2",
                border: "1px solid #fecaca",
                color: "var(--yc-color-error)",
                borderRadius: "var(--yc-radius-md)",
                padding: "var(--yc-space-3) var(--yc-space-4)",
                fontSize: "var(--yc-font-size-sm)",
                marginBottom: "var(--yc-space-4)",
              }}
            >
              {error}
            </div>
          )}

          <div style={{ marginBottom: "var(--yc-space-4)" }}>
            <label style={labelStyle}>Full name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: "var(--yc-space-4)" }}>
            <label style={labelStyle}>Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: "var(--yc-space-4)" }}>
            <label style={labelStyle}>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              style={inputStyle}
            />
            <span
              style={{
                fontSize: "var(--yc-font-size-xs)",
                color: "var(--yc-color-text-tertiary)",
              }}
            >
              Minimum 8 characters
            </span>
          </div>

          <div style={{ marginBottom: "var(--yc-space-6)" }}>
            <label style={labelStyle}>Organization name</label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
              placeholder="Your company or team"
              style={inputStyle}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "var(--yc-space-3)",
              background: loading
                ? "var(--yc-color-neutral-400)"
                : "var(--yc-color-primary)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--yc-radius-md)",
              fontSize: "var(--yc-font-size-base)",
              fontWeight: "var(--yc-font-weight-semibold)",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Creating account..." : "Create account"}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            marginTop: "var(--yc-space-6)",
            fontSize: "var(--yc-font-size-sm)",
            color: "var(--yc-color-text-secondary)",
          }}
        >
          Already have an account? <Link to="/signin">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
