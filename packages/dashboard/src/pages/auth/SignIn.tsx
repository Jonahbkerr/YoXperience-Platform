import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext.js";

export default function SignIn() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
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
            Sign in to your dashboard
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
            <label
              style={{
                display: "block",
                fontSize: "var(--yc-font-size-sm)",
                fontWeight: "var(--yc-font-weight-medium)",
                marginBottom: "var(--yc-space-1)",
                color: "var(--yc-color-text)",
              }}
            >
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "var(--yc-space-2) var(--yc-space-3)",
                border: "1px solid var(--yc-color-border)",
                borderRadius: "var(--yc-radius-md)",
                fontSize: "var(--yc-font-size-base)",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div style={{ marginBottom: "var(--yc-space-6)" }}>
            <label
              style={{
                display: "block",
                fontSize: "var(--yc-font-size-sm)",
                fontWeight: "var(--yc-font-weight-medium)",
                marginBottom: "var(--yc-space-1)",
                color: "var(--yc-color-text)",
              }}
            >
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: "100%",
                padding: "var(--yc-space-2) var(--yc-space-3)",
                border: "1px solid var(--yc-color-border)",
                borderRadius: "var(--yc-radius-md)",
                fontSize: "var(--yc-font-size-base)",
                outline: "none",
                boxSizing: "border-box",
              }}
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
            {loading ? "Signing in..." : "Sign in"}
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
          Don't have an account? <Link to="/signup">Sign up</Link>
        </p>
      </div>
    </div>
  );
}
