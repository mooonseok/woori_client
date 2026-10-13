"use client";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  AuthStatus,
  AuthUser,
  LoginInput,
  SignupInput,
} from "@/dto/auth.dto";
import {
  advanceSessionRevision,
  ApiError,
  apiRequest,
  post,
  SESSION_EXPIRED,
} from "@/services/api-client";
import { DEMO_MODE } from "@/constants/app-mode";
function useAuthState() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [status, setStatus] = useState<AuthStatus>(
    DEMO_MODE ? "anonymous" : "loading",
  );
  const [error, setError] = useState("");
  const [verificationDelivery, setVerificationDelivery] = useState<
    "sent" | "unavailable" | null
  >(null);
  const generation = useRef(0);
  const clear = useCallback(() => {
    generation.current++;
    advanceSessionRevision();
    setUser(null);
    setStatus("anonymous");
    setError("");
  }, []);
  const refresh = useCallback(async (quiet = false) => {
    if (DEMO_MODE) return;
    const request = ++generation.current;
    if (!quiet) {
      setStatus("loading");
      setError("");
    }
    try {
      const result = await apiRequest<{ user: AuthUser }>("/v1/auth/me");
      if (request === generation.current) {
        setUser(result.user);
        setStatus("authenticated");
      }
    } catch (error) {
      if (request !== generation.current) return;
      if (quiet && !(error instanceof ApiError && error.status === 401)) return;
      setUser(null);
      if (error instanceof ApiError && error.status === 401)
        setStatus("anonymous");
      else {
        setStatus("error");
        setError(
          error instanceof Error ? error.message : "계정을 확인하지 못했어요.",
        );
      }
    }
  }, []);
  useEffect(() => {
    const expired = () => clear();
    window.addEventListener(SESSION_EXPIRED, expired);
    let active = true;
    const counter = generation;
    queueMicrotask(() => {
      if (active) void refresh();
    });
    return () => {
      active = false;
      counter.current++;
      window.removeEventListener(SESSION_EXPIRED, expired);
    };
  }, [refresh, clear]);
  useEffect(() => {
    if (!user || user.emailVerified) return;
    const focus = () => {
      void refresh(true);
    };
    window.addEventListener("focus", focus);
    return () => window.removeEventListener("focus", focus);
  }, [user, refresh]);
  async function authenticate(
    path: "login" | "signup",
    input: LoginInput | SignupInput,
  ) {
    const request = ++generation.current;
    advanceSessionRevision();
    const result = await post<{
      user: AuthUser;
      verificationDelivery?: "sent" | "unavailable";
    }>(`/v1/auth/${path}`, input);
    setVerificationDelivery(result.verificationDelivery || null);
    if (request === generation.current) {
      setUser(result.user);
      setStatus("authenticated");
      setError("");
    }
    return result.user;
  }
  async function logout() {
    const request = ++generation.current;
    advanceSessionRevision();
    await post<void>("/v1/auth/logout");
    if (request === generation.current) clear();
  }
  async function confirm(token: string) {
    const request = ++generation.current;
    advanceSessionRevision();
    const result = await post<{ user: AuthUser }>(
      "/v1/auth/email-verification/confirm",
      { token },
    );
    if (request === generation.current) {
      setUser(result.user);
      setStatus("authenticated");
    }
    return result.user;
  }
  return {
    user,
    status,
    error,
    verificationDelivery,
    refresh,
    logout,
    confirm,
    login: (input: LoginInput) => authenticate("login", input),
    signup: (input: SignupInput) => authenticate("signup", input),
    resend: () => post("/v1/auth/email-verification/request"),
  };
}
const AuthContext = createContext<ReturnType<typeof useAuthState> | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useAuthState();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("AuthProvider required");
  return value;
}
