"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { ApiError } from "@/lib/api";
import * as authApi from "@/lib/auth";
import type { AuthUser } from "@/lib/types";
import type { TwoFaChallenge } from "@/lib/auth";

type SessionStatus = "loading" | "authenticated" | "unauthenticated";

interface AuthContextValue {
  user: AuthUser | null;
  status: SessionStatus;
  /** Devuelve el usuario si el login completa, o el desafío 2FA. */
  login: (email: string, password: string) => Promise<AuthUser | TwoFaChallenge>;
  /** Completa el segundo paso 2FA y abre la sesión. */
  verify2faLogin: (
    pendingToken: string,
    code: string,
  ) => Promise<AuthUser>;
  logout: () => Promise<void>;
  setUser: (user: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function IsAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<SessionStatus>("loading");

  useEffect(() => {
    let cancelled = false;
    authApi
      .fetchMe()
      .then((me) => {
        if (!cancelled) {
          setUser(me);
          setStatus("authenticated");
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        const authRequired =
          error instanceof ApiError &&
          (error.code === "AUTH_REQUIRED" ||
            error.code === "SESSION_EXPIRED" ||
            error.code === "SESSION_REVOKED");
        if (!authRequired) {
          console.error("Error al verificar la sesión:", error);
        }
        setUser(null);
        setStatus("unauthenticated");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await authApi.login(email, password);
    if ("step" in result && result.step === "verify-2fa") {
      return result;
    }
    const me = await authApi.fetchMe();
    setUser(me);
    setStatus("authenticated");
    return me;
  }, []);

  const verify2faLogin = useCallback(
    async (pendingToken: string, code: string) => {
      await authApi.verify2fa(pendingToken, code);
      const me = await authApi.fetchMe();
      setUser(me);
      setStatus("authenticated");
      return me;
    },
    [],
  );

  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } finally {
      setUser(null);
      setStatus("unauthenticated");
    }
  }, []);

  const value = useMemo(
    () => ({ user, status, login, verify2faLogin, logout, setUser }),
    [user, status, login, verify2faLogin, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe usarse dentro de <IsAuthProvider>");
  }
  return context;
}
