export default function Loading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* ─── Sticky header placeholder ─── */}
      <header className="sticky top-0 z-40 border-b border-gray-200/60 glass">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
          {/* Brand */}
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 animate-pulse rounded-lg bg-indigo-100" />
            <div className="h-4 w-20 animate-pulse rounded bg-gray-200" />
          </div>

          {/* Nav links */}
          <div className="flex items-center gap-2">
            <div className="hidden h-8 w-24 animate-pulse rounded-lg bg-gray-100 sm:block" />
            <div className="h-8 w-20 animate-pulse rounded-lg bg-gray-100" />
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        {/* ─── Page header ─── */}
        <div className="mb-6 space-y-2">
          <div className="h-9 w-44 animate-pulse rounded-lg bg-gray-200" />
          <div className="h-4 w-64 animate-pulse rounded bg-gray-100" />
        </div>

        {/* ─── Two-column layout: filters + results ─── */}
        <div className="grid gap-8 lg:grid-cols-[240px_1fr]">
          {/* ─── Filter sidebar skeleton ─── */}
          <aside className="space-y-5">
            {/* Header row: "Filters" + Reset */}
            <div className="flex items-center justify-between">
              <div className="h-4 w-16 animate-pulse rounded bg-gray-200" />
              <div className="h-3 w-10 animate-pulse rounded bg-gray-100" />
            </div>

            {/* Filter groups */}
            {[...Array(6)].map((_, i) => (
              <div key={i} className="space-y-1.5">
                {/* Label */}
                <div className="h-3 w-20 animate-pulse rounded bg-gray-200" />
                {/* Input / select box */}
                <div className="h-10 w-full animate-pulse rounded-lg border border-gray-100 bg-gray-50" />
              </div>
            ))}
          </aside>

          {/* ─── Job cards skeleton ─── */}
          <div className="space-y-3">
            {/* Count line ("N active jobs") */}
            <div className="mb-1 h-3 w-32 animate-pulse rounded bg-gray-100" />

            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-5 shadow-card"
              >
                {/* Top row: avatar + title/company + work-type pill */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4">
                    {/* Avatar square */}
                    <div className="h-12 w-12 shrink-0 animate-pulse rounded-xl bg-indigo-100" />

                    {/* Title + company */}
                    <div className="space-y-2">
                      <div className="h-4 w-48 animate-pulse rounded bg-gray-200" />
                      <div className="h-3 w-32 animate-pulse rounded bg-gray-100" />
                    </div>
                  </div>

                  {/* Work-type pill */}
                  <div className="h-6 w-16 shrink-0 animate-pulse rounded-full bg-indigo-50" />
                </div>

                {/* Meta row: location + salary + time */}
                <div className="mt-4 flex flex-wrap items-center gap-4">
                  <div className="h-3.5 w-24 animate-pulse rounded bg-gray-100" />
                  <div className="h-3.5 w-32 animate-pulse rounded bg-gray-100" />
                  <div className="h-3.5 w-20 animate-pulse rounded bg-gray-100" />
                </div>

                {/* Category pill */}
                <div className="mt-3 h-6 w-20 animate-pulse rounded-md bg-gray-50" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}