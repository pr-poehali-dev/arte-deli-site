import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { auth } from "@/lib/api";

interface User {
  id: number;
  phone: string;
  name: string | null;
  email: string | null;
  birth_date: string | null;
  role: string;
  addresses: { id: number; address: string; apartment: string | null; is_default: boolean }[];
}

interface AuthCtx {
  user: User | null;
  loading: boolean;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>({
  user: null, loading: true, token: null,
  login: () => {}, logout: () => {}, refreshUser: async () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    const t = localStorage.getItem("ad_token");
    if (!t) { setLoading(false); return; }
    try {
      const res = await auth.me();
      if ("user" in res) {
        setUser(res.user as User);
        setToken(t);
      } else {
        localStorage.removeItem("ad_token");
        setUser(null);
        setToken(null);
      }
    } catch {
      localStorage.removeItem("ad_token");
      setUser(null);
      setToken(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refreshUser(); }, [refreshUser]);

  const login = useCallback((t: string, u: User) => {
    localStorage.setItem("ad_token", t);
    setToken(t);
    setUser(u);
  }, []);

  const logout = useCallback(async () => {
    await auth.logout();
    localStorage.removeItem("ad_token");
    setUser(null);
    setToken(null);
  }, []);

  return <Ctx.Provider value={{ user, loading, token, login, logout, refreshUser }}>{children}</Ctx.Provider>;
}

export function useAuth() { return useContext(Ctx); }
