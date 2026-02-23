import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { api, setAccessToken, getAccessToken } from "../lib/api-client.js";

interface User {
  id: string;
  email: string;
  name: string;
}

interface Org {
  id: string;
  name: string;
  slug: string;
  plan?: string;
}

interface AuthState {
  user: User | null;
  org: Org | null;
  role: string | null;
  loading: boolean;
}

interface AuthContextValue extends AuthState {
  signup: (data: {
    email: string;
    password: string;
    name: string;
    orgName: string;
  }) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    org: null,
    role: null,
    loading: true,
  });

  // Silent refresh on mount
  useEffect(() => {
    let cancelled = false;

    async function tryRefresh() {
      try {
        const currentToken = getAccessToken();
        const res = await api<{ accessToken: string }>("/auth/refresh", {
          method: "POST",
          body: JSON.stringify({ accessToken: currentToken ?? "" }),
        });

        if (cancelled) return;
        setAccessToken(res.accessToken);

        const me = await api<{
          user: User;
          org: Org | null;
          role: string | null;
        }>("/auth/me");

        if (cancelled) return;
        setState({
          user: me.user,
          org: me.org,
          role: me.role,
          loading: false,
        });
      } catch {
        if (!cancelled) {
          setAccessToken(null);
          setState({ user: null, org: null, role: null, loading: false });
        }
      }
    }

    tryRefresh();
    return () => {
      cancelled = true;
    };
  }, []);

  // Auto-refresh access token every 13 minutes
  useEffect(() => {
    if (!state.user) return;

    const interval = setInterval(async () => {
      try {
        const currentToken = getAccessToken();
        const res = await api<{ accessToken: string }>("/auth/refresh", {
          method: "POST",
          body: JSON.stringify({ accessToken: currentToken ?? "" }),
        });
        setAccessToken(res.accessToken);
      } catch {
        setAccessToken(null);
        setState({ user: null, org: null, role: null, loading: false });
      }
    }, 13 * 60 * 1000);

    return () => clearInterval(interval);
  }, [state.user]);

  const signup = useCallback(
    async (data: {
      email: string;
      password: string;
      name: string;
      orgName: string;
    }) => {
      const res = await api<{
        accessToken: string;
        user: User;
        org: Org;
      }>("/auth/signup", {
        method: "POST",
        body: JSON.stringify(data),
      });

      setAccessToken(res.accessToken);
      setState({
        user: res.user,
        org: res.org,
        role: "owner",
        loading: false,
      });
    },
    []
  );

  const login = useCallback(async (email: string, password: string) => {
    const res = await api<{
      accessToken: string;
      user: User;
      org: Org;
    }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    setAccessToken(res.accessToken);
    setState({
      user: res.user,
      org: res.org,
      role: "owner",
      loading: false,
    });
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const me = await api<{
        user: User;
        org: Org | null;
        role: string | null;
      }>("/auth/me");
      setState({ user: me.user, org: me.org, role: me.role, loading: false });
    } catch {
      // leave state as-is if refresh fails
    }
  }, []);

  const logoutFn = useCallback(async () => {
    try {
      await api("/auth/logout", { method: "POST" });
    } finally {
      setAccessToken(null);
      setState({ user: null, org: null, role: null, loading: false });
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{ ...state, signup, login, logout: logoutFn, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}
