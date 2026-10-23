"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/Button";

type Props = { jobId: string };

// State machine — each render branch below corresponds to one variant.
type State =
  | { kind: "loading" }
  | { kind: "unauth" }
  | { kind: "employer" }
  | { kind: "no-resume" }
  | { kind: "already-applied" }
  | { kind: "ready" };

export function ApplyButton({ jobId }: Props) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Resolve auth + resume + application status entirely client-side.
  // On a static page, the server can't know the user — this runs after
  // hydration and drives the button to its final state.
  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setState({ kind: "unauth" });
        return;
      }

      const role =
        (user.user_metadata?.role as string)?.toUpperCase() === "EMPLOYER"
          ? "EMPLOYER"
          : "JOB_SEEKER";

      if (role === "EMPLOYER") {
        setState({ kind: "employer" });
        return;
      }

      const [profile, existing] = await Promise.all([
        supabase
          .from("users")
          .select("resume_url")
          .eq("id", user.id)
          .maybeSingle(),
        supabase
          .from("applications")
          .select("id")
          .eq("job_id", jobId)
          .eq("seeker_id", user.id)
          .maybeSingle(),
      ]);

      const hasResume = !!(profile.data as { resume_url: string | null } | null)
        ?.resume_url;
      const applied = !!existing.data;

      if (applied) setState({ kind: "already-applied" });
      else if (!hasResume) setState({ kind: "no-resume" });
      else setState({ kind: "ready" });
    })();
  }, [jobId]);

  async function handleApply() {
    setPending(true);
    setError(null);

    try {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Session expired — please sign in again");

      const { data: profile } = await supabase
        .from("users")
        .select("resume_url")
        .eq("id", user.id)
        .maybeSingle();

      const resumeUrl = (profile as { resume_url: string | null } | null)
        ?.resume_url;
      if (!resumeUrl) throw new Error("No resume on file");

      const { error: insertErr } = await supabase
        .from("applications")
        .insert({
          job_id: jobId,
          seeker_id: user.id,
          resume_url: resumeUrl,
          status: "PENDING",
        } as never);

      if (insertErr) {
        // Unique constraint violation → user already applied.
        if (insertErr.code === "23505") {
          setState({ kind: "already-applied" });
          return;
        }
        throw new Error(insertErr.message);
      }

      setState({ kind: "already-applied" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not submit application");
    } finally {
      setPending(false);
    }
  }

  // --- Rendering branches ---

  if (state.kind === "loading") {
    return (
      <Button disabled className="w-full sm:w-auto">
        Checking…
      </Button>
    );
  }

  if (state.kind === "unauth") {
    return (
      <Link href={`/login?next=/jobs/${jobId}`}>
        <Button className="w-full sm:w-auto">Sign in to apply</Button>
      </Link>
    );
  }

  if (state.kind === "employer") {
    return (
      <Button disabled className="w-full sm:w-auto">
        Employers cannot apply
      </Button>
    );
  }

  if (state.kind === "already-applied") {
    return (
      <Button disabled className="w-full sm:w-auto">
        Application submitted ✓
      </Button>
    );
  }

  if (state.kind === "no-resume") {
    return (
      <div className="space-y-3">
        <p className="text-xs text-gray-600">
          You need a resume on file before applying.
        </p>
        <Link href="/dashboard/seeker/profile">
          <Button className="w-full sm:w-auto">Upload resume</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleApply}
        disabled={pending}
        className="w-full sm:w-auto"
      >
        {pending ? "Submitting…" : "Apply now"}
      </Button>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}