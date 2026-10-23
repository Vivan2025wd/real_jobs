import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/ui/Badge";
import { timeAgo } from "@/lib/utils/format";
import type { ApplicationWithJob } from "@/types/job";

// ---------------------------------------------------------------------------
// `ApplicationWithJob` (from @/types/job) matches the select string below
// column-for-column: id, status, applied_at, jobs(title, companies(company_name)).
// The `as unknown as` cast is still required because PostgREST's two-level
// embed collapses the row type to `never` before `.returns<T>()` applies.
// ---------------------------------------------------------------------------

export default async function SeekerOverview() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const [{ count: totalApps }, { count: activeApps }] = await Promise.all([
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("seeker_id", user!.id),
    supabase
      .from("applications")
      .select("id", { count: "exact", head: true })
      .eq("seeker_id", user!.id)
      .eq("status", "PENDING"),
  ]);

  const { data: recentData } = await supabase
    .from("applications")
    .select(
      "id, status, applied_at, jobs!inner(title, companies!inner(company_name))"
    )
    .eq("seeker_id", user!.id)
    .order("applied_at", { ascending: false })
    .limit(5);

  const recent = recentData as unknown as ApplicationWithJob[] | null;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Welcome back 👋</h1>
        <p className="text-gray-500">
          Track your applications and find your next role.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Applications", value: totalApps ?? 0 },
          { label: "Awaiting response", value: activeApps ?? 0 },
          { label: "Roles available", value: "Browse" },
        ].map((s) => (
          <Card key={s.label}>
            <CardBody>
              <p className="text-sm text-gray-500">{s.label}</p>
              <p className="mt-1 text-2xl font-bold text-gray-900">{s.value}</p>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title="Recent applications"
          action={
            <Link href="/dashboard/seeker/applications">
              <Button variant="secondary" size="sm">
                View all
              </Button>
            </Link>
          }
        />
        <CardBody>
          {!recent?.length ? (
            <div className="py-6 text-center text-sm text-gray-500">
              No applications yet.{" "}
              <Link href="/jobs" className="text-blue-600 hover:underline">
                Browse jobs
              </Link>
            </div>
          ) : (
            <ul className="divide-y divide-gray-100">
              {recent.map((a) => (
                <li
                  key={a.id}
                  className="flex items-center justify-between py-3"
                >
                  <div>
                    <p className="font-medium text-gray-900">
                      {a.jobs.title}
                    </p>
                    <p className="text-sm text-gray-500">
                      {a.jobs.companies.company_name} · {timeAgo(a.applied_at)}
                    </p>
                  </div>
                  <StatusBadge status={a.status} />
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}