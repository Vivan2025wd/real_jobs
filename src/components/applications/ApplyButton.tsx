"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { submitApplication } from "@/app/actions/applications";
import { Button } from "@/components/ui/Button";

type Props = {
  jobId: string;
  externalUnclaimed: boolean;
  durationDays: number;
};

type State =
  | { kind: "loading" }
  | { kind: "unauth" }
  | { kind: "employer" }
  | { kind: "no-resume" }
  | { kind: "already-applied" }
  | { kind: "error"; message: string }
  | { kind: "ready" };

export function ApplyButton({ jobId, externalUnclaimed, durationDays }: Props) {
  const [state, setState] = useState<State>({ kind: "loading" });
  const [modalOpen, setModalOpen] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [consent, setConsent] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function checkApplicationState() {
      try {
        const supabase = createClient();
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();
        if (userError) throw userError;

        if (!active) return;
        if (!user) {
          setState({ kind: "unauth" });
          return;
        }

        const [profileResult, applicationResult] = await Promise.all([
          supabase
            .from("users")
            .select("role, resume_url")
            .eq("id", user.id)
            .maybeSingle(),
          supabase
            .from("applications")
            .select("id")
            .eq("job_id", jobId)
            .eq("seeker_id", user.id)
            .maybeSingle(),
        ]);
        if (profileResult.error) throw profileResult.error;
        if (applicationResult.error) throw applicationResult.error;
        const typedProfile = profileResult.data as unknown as {
          role: string;
          resume_url: string | null;
        } | null;

        if (!active) return;
        if (typedProfile?.role === "EMPLOYER") setState({ kind: "employer" });
        else if (applicationResult.data) setState({ kind: "already-applied" });
        else if (!typedProfile?.resume_url) setState({ kind: "no-resume" });
        else setState({ kind: "ready" });
      } catch (checkError) {
        console.error("[ApplyButton] application state check failed:", checkError);
        if (active) {
          setState({
            kind: "error",
            message: "Could not check your application status. Please refresh and try again.",
          });
        }
      }
    }

    void checkApplicationState();
    return () => {
      active = false;
    };
  }, [jobId]);

  async function handleApply() {
    setPending(true);
    setError(null);
    try {
      const result = await submitApplication(jobId, coverLetter, consent);
      if (result.ok) {
        setModalOpen(false);
        setState({ kind: "already-applied" });
        // ✅ Success toast
        toast.success("Application submitted successfully!");
      } else {
        setError(result.error);
        // ❌ Error toast
        toast.error(result.error);
      }
    } catch (submitError) {
      console.error("[ApplyButton] application submit failed:", submitError);
      const msg = "Could not submit your application. Please try again.";
      setError(msg);
      toast.error(msg);
    } finally {
      setPending(false);
    }
  }

  if (state.kind === "loading") {
    return (
      <Button disabled className="w-full justify-center sm:w-auto">
        Checking…
      </Button>
    );
  }

  if (state.kind === "error") {
    return <p role="alert" className="text-sm text-red-600">{state.message}</p>;
  }

  if (state.kind === "unauth") {
    return (
      <Link
        href={`/login?next=${encodeURIComponent(`/jobs/${jobId}`)}`}
        className="block w-full sm:w-auto"
      >
        <Button className="w-full justify-center sm:w-auto">Sign in to apply</Button>
      </Link>
    );
  }

  if (state.kind === "employer") {
    return (
      <Button disabled className="w-full justify-center sm:w-auto">
        Employers cannot apply
      </Button>
    );
  }

  if (state.kind === "already-applied") {
    return (
      <Button disabled className="w-full justify-center sm:w-auto">
        Application submitted ✓
      </Button>
    );
  }

  if (state.kind === "no-resume") {
    return (
      <div className="w-full space-y-2 sm:w-auto sm:space-y-3">
        <p className="text-[11px] leading-relaxed text-gray-600 sm:text-xs">
          You need a resume on file before applying.
        </p>
        <Link href="/dashboard/seeker/profile" className="block w-full sm:w-auto">
          <Button className="w-full justify-center sm:w-auto">Upload resume</Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="w-full space-y-1.5 sm:w-auto sm:space-y-2">
        <Button
          onClick={() => {
            setError(null);
            setModalOpen(true);
          }}
          className="w-full justify-center sm:w-auto"
        >
          Apply now
        </Button>
        {error && <p className="text-[11px] text-red-600 sm:text-xs">{error}</p>}
      </div>

      {modalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-gray-950/50 p-0 sm:items-center sm:p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !pending) setModalOpen(false);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="apply-dialog-title"
            className="w-full max-w-lg space-y-4 rounded-t-2xl bg-white p-4 shadow-xl sm:rounded-2xl sm:p-6"
          >
            <div>
              <h2 id="apply-dialog-title" className="text-lg font-semibold text-gray-900">
                Apply for this job
              </h2>
              {externalUnclaimed && (
                <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm leading-relaxed text-amber-900">
                  This employer has not joined RealJobs yet. Your application is saved here and the employer will be invited to join and view it. Your CV and details are not sent by email.
                </p>
              )}
              <p className="mt-2 text-xs leading-relaxed text-gray-500">
                Your CV and cover letter will remain available to the employer for up to{" "}
                <strong>
                  {externalUnclaimed ? 30 : durationDays} days
                </strong>{" "}
                after this listing closes, then they will be anonymized.
              </p>
            </div>

            <div>
              <label htmlFor="cover-letter" className="block text-sm font-medium text-gray-700">
                Cover Letter <span className="font-normal text-gray-500">(Optional)</span>
              </label>
              <textarea
                id="cover-letter"
                value={coverLetter}
                maxLength={3000}
                rows={5}
                placeholder="Add a short note about your interest in this role…"
                onChange={(event) => setCoverLetter(event.target.value)}
                className="mt-1.5 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <p className="mt-1 text-right text-xs text-gray-500">
                {coverLetter.length}/3000
              </p>
            </div>

            <label className="flex items-start gap-2.5 text-sm leading-relaxed text-gray-700">
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) => setConsent(event.target.checked)}
                required
                className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>
                {externalUnclaimed
                  ? "I consent to RealJobs storing my application and sharing it with this employer if they claim the listing."
                  : "I consent to RealJobs storing my application and sharing it with the employer for recruitment purposes."}
              </span>
            </label>

            {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <Button
                variant="secondary"
                onClick={() => setModalOpen(false)}
                disabled={pending}
                className="justify-center"
              >
                Cancel
              </Button>
              <Button
                onClick={() => void handleApply()}
                disabled={pending || !consent || coverLetter.length > 3000}
                className="justify-center"
              >
                {pending ? "Submitting…" : "Submit application"}
              </Button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
