"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  hasSearchCriteria,
  normalizeJobSearchFilters,
  parseJobSearchFilters,
  type JobSearchFilters,
} from "@/lib/jobs/search";

export type AlertFrequency = "DAILY" | "WEEKLY" | "NONE";

const ALERT_FREQUENCIES: AlertFrequency[] = ["DAILY", "WEEKLY", "NONE"];

type SavedSearchRpc = {
  rpc(
    functionName: "save_saved_search",
    args: { p_filters: JobSearchFilters; p_alert_frequency: AlertFrequency }
  ): PromiseLike<{ data: string | null; error: { message: string } | null }>;
  rpc(
    functionName: "set_saved_search_alert",
    args: { p_id: string; p_alert_frequency: AlertFrequency }
  ): PromiseLike<{ data: boolean | null; error: { message: string } | null }>;
};

export async function saveSearch(
  searchParams:
    | Record<string, string | number | undefined>
    | JobSearchFilters,
  frequency: AlertFrequency = "DAILY"
): Promise<{ success?: true; error?: string }> {
  const filters = normalizeJobSearchFilters(parseJobSearchFilters(searchParams));
  if (!hasSearchCriteria(filters)) {
    return { error: "Add at least one filter before saving this search." };
  }
  if (!ALERT_FREQUENCIES.includes(frequency)) {
    return { error: "Choose a valid alert frequency." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Sign in to save a search." };

  const savedSearchRpc = supabase as unknown as SavedSearchRpc;
  const { error } = await savedSearchRpc.rpc("save_saved_search", {
    p_filters: filters,
    p_alert_frequency: frequency,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/seeker");
  return { success: true };
}

export async function toggleAlert(
  id: string,
  frequency: AlertFrequency
): Promise<{ success?: true; error?: string }> {
  if (!ALERT_FREQUENCIES.includes(frequency)) {
    return { error: "Choose a valid alert frequency." };
  }

  const supabase = await createClient();
  const savedSearchRpc = supabase as unknown as SavedSearchRpc;
  const { data, error } = await savedSearchRpc.rpc("set_saved_search_alert", {
    p_id: id,
    p_alert_frequency: frequency,
  });
  if (error) return { error: error.message };
  if (!data) return { error: "Saved search not found." };

  revalidatePath("/dashboard/seeker");
  return { success: true };
}

export async function deleteSearch(
  id: string
): Promise<{ success?: true; error?: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("saved_searches")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error) return { error: error.message };
  if (!data) return { error: "Saved search not found." };

  revalidatePath("/dashboard/seeker");
  return { success: true };
}
