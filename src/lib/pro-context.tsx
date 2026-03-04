"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { createClient } from "@supabase/supabase-js";
import type { User, Session } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const browserClient = createClient(supabaseUrl, supabaseAnonKey);

export const FREE_INSIGHT_KEY = "bei_insight_tries";
export const FREE_CHAT_KEY = "bei_chat_tries";
export const MAX_FREE_TRIES = 1;

export interface ProContextValue {
  user: User | null;
  session: Session | null;
  isPro: boolean;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  supabase: typeof browserClient;
  refreshProStatus: () => Promise<void>;
  insightTries: number;
  chatTries: number;
  consumeInsightTry: () => boolean;
  consumeChatTry: () => boolean;
}

const ProContext = createContext<ProContextValue>({
  user: null,
  session: null,
  isPro: false,
  loading: true,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => ({ error: null }),
  signUpWithEmail: async () => ({ error: null }),
  signOut: async () => {},
  supabase: browserClient,
  refreshProStatus: async () => {},
  insightTries: 0,
  chatTries: 0,
  consumeInsightTry: () => false,
  consumeChatTry: () => false,
});

export function useProContext() {
  return useContext(ProContext);
}

function getTries(key: string): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(key) || "0", 10);
}

function setTries(key: string, val: number) {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, String(val));
}

export function ProProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);
  const [insightTries, setInsightTries] = useState(0);
  const [chatTries, setChatTries] = useState(0);

  const checkProStatus = useCallback(async (uid: string) => {
    const { data } = await browserClient
      .from("pro_subscribers")
      .select("status, expires_at")
      .eq("user_id", uid)
      .eq("status", "active")
      .maybeSingle();

    if (data) {
      const notExpired = !data.expires_at || new Date(data.expires_at) > new Date();
      setIsPro(notExpired);
    } else {
      setIsPro(false);
    }
  }, []);

  const refreshProStatus = useCallback(async () => {
    if (user) await checkProStatus(user.id);
  }, [user, checkProStatus]);

  useEffect(() => {
    setInsightTries(getTries(FREE_INSIGHT_KEY));
    setChatTries(getTries(FREE_CHAT_KEY));

    browserClient.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) checkProStatus(session.user.id).finally(() => setLoading(false));
      else setLoading(false);
    });

    const { data: listener } = browserClient.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) checkProStatus(session.user.id);
      else setIsPro(false);
    });

    return () => listener.subscription.unsubscribe();
  }, [checkProStatus]);

  const signInWithGoogle = useCallback(async () => {
    await browserClient.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await browserClient.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await browserClient.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await browserClient.auth.signOut();
    setIsPro(false);
  }, []);

  const consumeInsightTry = useCallback(() => {
    const current = getTries(FREE_INSIGHT_KEY);
    if (current >= MAX_FREE_TRIES) return false;
    const next = current + 1;
    setTries(FREE_INSIGHT_KEY, next);
    setInsightTries(next);
    return true;
  }, []);

  const consumeChatTry = useCallback(() => {
    const current = getTries(FREE_CHAT_KEY);
    if (current >= MAX_FREE_TRIES) return false;
    const next = current + 1;
    setTries(FREE_CHAT_KEY, next);
    setChatTries(next);
    return true;
  }, []);

  return (
    <ProContext.Provider
      value={{
        user,
        session,
        isPro,
        loading,
        signInWithGoogle,
        signInWithEmail,
        signUpWithEmail,
        signOut,
        supabase: browserClient,
        refreshProStatus,
        insightTries,
        chatTries,
        consumeInsightTry,
        consumeChatTry,
      }}
    >
      {children}
    </ProContext.Provider>
  );
}
