export default function Loading() {
  return (
    <div className="min-h-screen w-full overflow-x-hidden bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* ─── Sticky header placeholder ─── */}
      <header className="sticky top-0 z-40 border-b border-gray-200/60 bg-white/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-3 sm:h-16 sm:px-4">
          {/* Brand */}
          <div className="flex items-center gap-2 sm:gap-2.5">
            <div className="h-7 w-7 animate-pulse rounded-lg bg-indigo-100 sm:h-8 sm:w-8" />
            <div className="h-3.5 w-16 animate-pulse rounded bg-gray-200 sm:h-4 sm:w-20" />
          </div>

          {/* Nav links */}
          <div className="flex items-center gap-2">
            <div className="hidden h-8 w-24 animate-pulse rounded-lg bg-gray-100 sm:block" />
            <div className="h-7 w-16 animate-pulse rounded-lg bg-gray-100 sm:h-8 sm:w-20" />
          </div>
        </div>
      </header>

      <div className="mx-auto w-full max-w-6xl px-3 py-6 sm:px-4 sm:py-8">
        {/* ─── Page header ─── */}
        <div className="mb-4 space-y-1.5 sm:mb-6 sm:space-y-2">
          <div className="h-7 w-32 animate-pulse rounded-lg bg-gray-200 sm:h-9 sm:w-44" />
          <div className="h-3 w-48 animate-pulse rounded bg-gray-100 sm:h-4 sm:w-64" />
        </div>

        {/* ─── Two-column layout: filters + results ─── */}
        <div className="grid gap-5 sm:gap-8 lg:grid-cols-[260px_1fr]">
          {/* ─── Filter sidebar skeleton (desktop only) ─── */}
          <aside className="hidden space-y-5 lg:block">
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
          <div className="space-y-2.5 sm:space-y-3">
            {/* Mobile filter trigger skeleton — mirrors the drawer trigger */}
            <div className="flex min-h-[48px] w-full items-center justify-between rounded-xl border border-gray-200 bg-white px-3 shadow-sm sm:min-h-[50px] sm:px-4 lg:hidden">
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-pulse rounded bg-gray-200" />
                <div className="h-3.5 w-10 animate-pulse rounded bg-gray-200 sm:h-4 sm:w-12" />
              </div>
              <div className="h-3 w-12 animate-pulse rounded bg-gray-100 sm:w-16" />
            </div>

            {/* Count line ("N active jobs") */}
            <div className="mb-1 h-2.5 w-24 animate-pulse rounded bg-gray-100 sm:h-3 sm:w-32" />

            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="relative overflow-hidden rounded-xl border border-gray-200 bg-white p-3.5 shadow-card sm:p-5"
              >
                {/* Top row: avatar + title/company + work-type pill */}
                <div className="flex items-start justify-between gap-3 sm:gap-4">
                  <div className="flex items-start gap-2.5 sm:gap-4">
                    {/* Avatar square */}
                    <div className="h-9 w-9 shrink-0 animate-pulse rounded-lg bg-indigo-100 sm:h-12 sm:w-12 sm:rounded-xl" />

                    {/* Title + company */}
                    <div className="space-y-1.5 sm:space-y-2">
                      <div className="h-3.5 w-32 animate-pulse rounded bg-gray-200 sm:h-4 sm:w-48" />
                      <div className="h-2.5 w-24 animate-pulse rounded bg-gray-100 sm:h-3 sm:w-32" />
                    </div>
                  </div>

                  {/* Work-type pill */}
                  <div className="h-5 w-12 shrink-0 animate-pulse rounded-full bg-indigo-50 sm:h-6 sm:w-16" />
                </div>

                {/* Meta row: location + salary + time */}
                <div className="mt-2.5 flex flex-wrap items-center gap-2.5 sm:mt-4 sm:gap-4">
                  <div className="h-3 w-16 animate-pulse rounded bg-gray-100 sm:h-3.5 sm:w-24" />
                  <div className="h-3 w-20 animate-pulse rounded bg-gray-100 sm:h-3.5 sm:w-32" />
                  <div className="h-3 w-12 animate-pulse rounded bg-gray-100 sm:h-3.5 sm:w-20" />
                </div>

                {/* Category pill */}
                <div className="mt-2 h-5 w-16 animate-pulse rounded-md bg-gray-50 sm:mt-3 sm:h-6 sm:w-20" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}