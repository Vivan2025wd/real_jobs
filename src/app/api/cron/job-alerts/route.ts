import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { buildJobsSearchQuery, hasSearchCriteria, parseJobSearchFilters } from "@/lib/jobs/search";
import {
  buildJobAlertEmail,
  type AlertJob,
  type JobAlertSection,
} from "@/lib/email/job-alerts";
import { sendEmail } from "@/lib/email/send";
import { createAdminClient } from "@/lib/supabase/admin";

export const maxDuration = 60;

const FETCH_BATCH_SIZE = 100;
const USER_BATCH_SIZE = 10;
const TIME_BUDGET_MS = 45_000;

type SavedSearch = {
  id: string;
  user_id: string;
  filters: unknown;
  alert_frequency: string;
  last_alerted_at: string;
  unsubscribe_token: string;
};

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  const authorization = request.headers.get("authorization") ?? "";
  if (!secret) return false;

  const actual = Buffer.from(authorization);
  const expected = Buffer.from(`Bearer ${secret}`);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const startedAt = Date.now();
  const deadline = startedAt + TIME_BUDGET_MS;

  try {
    const admin = createAdminClient();
    const weeklyCutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
    const candidates: SavedSearch[] = [];

    for (let offset = 0; ; offset += FETCH_BATCH_SIZE) {
      if (Date.now() >= deadline) {
        return NextResponse.json(
          { ok: false, deferred: true, reason: "Time budget reached while loading searches." },
          { status: 503 }
        );
      }
      const { data, error } = await admin
        .from("saved_searches")
        .select(
          "id, user_id, filters, alert_frequency, last_alerted_at, unsubscribe_token"
        )
        .or(
          `alert_frequency.eq.DAILY,and(alert_frequency.eq.WEEKLY,last_alerted_at.lt.${weeklyCutoff})`
        )
        .order("user_id", { ascending: true })
        .order("id", { ascending: true })
        .range(offset, offset + FETCH_BATCH_SIZE - 1)
        .returns<SavedSearch[]>();
      if (error) throw new Error(`Failed to load saved searches: ${error.message}`);

      candidates.push(...(data ?? []));
      if (!data || data.length < FETCH_BATCH_SIZE) break;
    }

    const byUser = new Map<string, SavedSearch[]>();
    for (const candidate of candidates) {
      const userSearches = byUser.get(candidate.user_id) ?? [];
      userSearches.push(candidate);
      byUser.set(candidate.user_id, userSearches);
    }

    const userIds = [...byUser.keys()];
    if (userIds.length === 0) {
      return NextResponse.json({ ok: true, candidates: 0, emailsSent: 0 });
    }

    const emailByUser = new Map<string, string>();
    for (let offset = 0; offset < userIds.length; offset += FETCH_BATCH_SIZE) {
      if (Date.now() >= deadline) {
        return NextResponse.json(
          { ok: false, deferred: true, reason: "Time budget reached while loading recipients." },
          { status: 503 }
        );
      }
      const { data: profiles, error: profilesError } = await admin
        .from("users")
        .select("id, email")
        .in("id", userIds.slice(offset, offset + FETCH_BATCH_SIZE));
      if (profilesError) {
        throw new Error(
          `Failed to load alert recipients: ${profilesError.message}`
        );
      }
      for (const profile of profiles ?? []) {
        emailByUser.set(profile.id, profile.email);
      }
    }

    let emailsSent = 0;
    let usersWithoutMatches = 0;
    let failedUsers = 0;
    let deferredUsers = 0;
    let timeBudgetReached = false;

    for (let batchStart = 0; batchStart < userIds.length; batchStart += USER_BATCH_SIZE) {
      const userBatch = userIds.slice(batchStart, batchStart + USER_BATCH_SIZE);
      for (let userOffset = 0; userOffset < userBatch.length; userOffset += 1) {
        const userId = userBatch[userOffset];
        if (Date.now() >= deadline) {
          deferredUsers += userIds.length - batchStart - userOffset;
          timeBudgetReached = true;
          break;
        }

        try {
          const recipient = emailByUser.get(userId);
          if (!recipient) {
            throw new Error("No email address is available for this account.");
          }

          const sections: JobAlertSection[] = [];
          const deliveredSearchIds: string[] = [];
          let deferCurrentUser = false;
          for (const savedSearch of byUser.get(userId) ?? []) {
            if (Date.now() >= deadline) {
              deferredUsers += 1;
              timeBudgetReached = true;
              deferCurrentUser = true;
              break;
            }
            const filters = parseJobSearchFilters(savedSearch.filters);
            if (!hasSearchCriteria(filters)) continue;

            const { data, error } = await buildJobsSearchQuery(admin, filters, {
              publishedAfter: savedSearch.last_alerted_at,
            })
              .limit(10)
              .returns<AlertJob[]>();
            if (error) {
              throw new Error(`Search ${savedSearch.id} failed: ${error.message}`);
            }
            if (!data?.length) continue;

            sections.push({
              filters,
              unsubscribeToken: savedSearch.unsubscribe_token,
              jobs: data,
            });
            deliveredSearchIds.push(savedSearch.id);
          }

          if (deferCurrentUser) {
            deferredUsers += userIds.length - batchStart - userOffset - 1;
            break;
          }
          if (sections.length === 0) {
            usersWithoutMatches += 1;
            continue;
          }
          if (Date.now() >= deadline) {
            deferredUsers += 1;
            deferredUsers += userIds.length - batchStart - userOffset - 1;
            timeBudgetReached = true;
            break;
          }

          const email = buildJobAlertEmail(sections);
          await sendEmail({
            to: recipient,
            subject: email.subject,
            html: email.html,
            headers: email.headers,
          });

          const { error: updateError } = await admin
            .from("saved_searches")
            .update({ last_alerted_at: new Date().toISOString() })
            .in("id", deliveredSearchIds);
          if (updateError) {
            throw new Error(
              `Email sent but alert timestamps could not be updated: ${updateError.message}`
            );
          }
          emailsSent += 1;
        } catch (error) {
          failedUsers += 1;
          console.error(`[cron:job-alerts] User ${userId} failed:`, error);
        }
      }
      if (timeBudgetReached) break;
    }

    const ok = failedUsers === 0 && !timeBudgetReached;
    return NextResponse.json(
      {
        ok,
        candidates: candidates.length,
        users: userIds.length,
        emailsSent,
        usersWithoutMatches,
        failedUsers,
        deferredUsers,
        elapsedMs: Date.now() - startedAt,
      },
      { status: ok ? 200 : 500 }
    );
  } catch (error) {
    console.error("[cron:job-alerts]", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
