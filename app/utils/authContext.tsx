import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import { getAuth, saveAuth, clearAuth, type SavedAuth } from "./authStorage";

type AuthState = {
  user: SavedAuth | null;
  bootstrapped: boolean;
  setUser: (u: SavedAuth | null) => void;
  login: (u: SavedAuth) => Promise<void>;
  logout: () => Promise<void>;
};

const Ctx = createContext<AuthState | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SavedAuth | null>(null);
  const [bootstrapped, setBootstrapped] = useState(false);

  useEffect(() => {
    (async () => {
      const stored = await getAuth();
      setUser(stored);
      setBootstrapped(true);
    })();
  }, []);

  const login = async (u: SavedAuth) => {
    await saveAuth(u);
    setUser(u);
  };

  const logout = async () => {
    await clearAuth();
    setUser(null);
  };

  const value = useMemo(() => ({ user, bootstrapped, setUser, login, logout }), [user, bootstrapped]);

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useAuth() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
