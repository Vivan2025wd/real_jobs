// src/hooks/useUser.ts
"use client";

import { useCallback, useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";
import type { UserRole } from "@/types/user";

export type UseUserResult = {
  /** The Supabase auth user, or `null` if signed out. */
  user: User | null;
  /** The user's role, or `null` if signed out. */
  role: UserRole | null;
  /** True during the initial session fetch. */
  loading: boolean;
  /** True once we've received a definitive answer (user or no user). */
  isSignedIn: boolean;
  /** True if role === "EMPLOYER". */
  isEmployer: boolean;
  /** True if role === "JOB_SEEKER". */
  isSeeker: boolean;
  /** Manually re-fetch the current user. Useful after profile updates. */
  refresh: () => Promise<void>;
};

/**
 * Client-side hook for the current auth user.
 *
 * Subscribes to `onAuthStateChange` so the value stays fresh across sign-in,
 * sign-out, and token refreshes. Initial render fetches the current session,
 * so the value is never stale on mount.
 *
 * Do NOT use this for route protection — that belongs in `middleware.ts` and
 * server layouts. This hook is for UI that adapts to auth state (e.g. showing
 * "Sign in" vs "Dashboard" in the Navbar).
 */
export function useUser(): UseUserResult {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const supabase = createClient();
    const {
      data: { user: freshUser },
    } = await supabase.auth.getUser();
    setUser(freshUser);
    setLoading(false);
  }, []);

  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    // 1. Initial fetch — resolves the session cookie asynchronously.
    supabase.auth.getUser().then(({ data }) => {
      if (cancelled) return;
      setUser(data.user);
      setLoading(false);
    });

    // 2. Subscribe to subsequent auth events.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (cancelled) return;
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
    };
  }, []);

  const role: UserRole | null = user
    ? (user.user_metadata?.role as string | undefined)?.toUpperCase() ===
      "EMPLOYER"
      ? "EMPLOYER"
      : "JOB_SEEKER"
    : null;

  return {
    user,
    role,
    loading,
    isSignedIn: !!user,
    isEmployer: role === "EMPLOYER",
    isSeeker: role === "JOB_SEEKER",
    refresh,
  };
}