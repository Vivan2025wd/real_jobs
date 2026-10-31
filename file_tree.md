real_jobs/
├── .env.local                              # (gitignored — do not commit)
├── .env.local.example
├── .eslintrc.json
├── .gitignore
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json
├── README.md
│
├── docs/                                   # ⬅️ NEW — screenshots for README
│   └── screenshots/
│       ├── landing-page.png
│       ├── employer-dashboard.png
│       ├── seeker-dashboard.png
│       └── job-board.png

│
├── public/
│   ├── favicon.ico
│   ├── logo.svg
│   └── images/
│       └── placeholder-logo.png
│
├── supabase/
│   ├── config.toml
│   ├── migrations/
│   │   ├── 20250101000000_init.sql                     # original schema + RLS
│   │   ├── 20250102000000_add_job_category.sql         # category column
│   │   ├── 20250103000000_auth_trigger.sql             # handle_new_user trigger
│   │   ├── 20250104000000_verification_and_payment.sql # verification_token + payments insert
│   │   ├── 20250105000000_user_resume.sql              # resume_url on users
│   │   ├── 20261023165321_add_rls_indexes.sql          # RLS-supporting indexes
│   │   ├── 20261028000000_job_lifecycle.sql            # duration_days, expires_at, notified_*
│   │   ├── 20261028100000_job_pricing.sql              # price_lkr
│   │   ├── 20261028170000_companies_employer_id_unique.sql    # unique (employer_id)
│   │   └── 20261028173000_users_employer_read_applicants.sql  # employer sees applicants
│   └── seed.sql
│
├── scripts/
│   └── generate-db-types.ts
│
└── src/
    ├── app/
    │   ├── layout.tsx                      # root layout + viewport + safe-area
    │   ├── page.tsx                        # landing (uses <Navbar initialUser={user} />)
    │   ├── globals.css                     # mobile hardening + design tokens
    │   ├── not-found.tsx                   # ⬅️ NEW — branded 404
    │   │
    │   ├── (auth)/
    │   │   ├── login/page.tsx
    │   │   ├── confirm/route.ts
    │   │   ├── register/page.tsx
    │   │   └── callback/route.ts           # Supabase auth callback
    │   │
    │   ├── logout/
    │   │   └── route.ts                    # ⬅️ NEW — POST-only logout
    │   │
    │   ├── (dashboard)/
    │   │   ├── layout.tsx
    │   │   ├── employer/
    │   │   │   ├── page.tsx
    │   │   │   ├── jobs/
    │   │   │   │   ├── page.tsx
    │   │   │   │   ├── new/page.tsx
    │   │   │   │   └── [jobId]/
    │   │   │   │       ├── page.tsx
    │   │   │   │       └── edit/page.tsx
    │   │   │   └── company/page.tsx
    │   │   └── seeker/
    │   │       ├── page.tsx
    │   │       ├── applications/page.tsx
    │   │       └── profile/page.tsx
    │   │
    │   ├── jobs/
    │   │   ├── page.tsx                    # public board with mobile filter drawer
    │   │   ├── loading.tsx                 # skeleton matches new shape
    │   │   ├── [jobId]/page.tsx            # ISR detail
    │   │   └── category/[categorySlug]/page.tsx   # SSG category pages
    │   │
    │   ├── verify-job/
    │   │   └── [token]/page.tsx            # tokenized verification response
    │   │
    │   └── api/
    │       ├── s3/
    │       │   ├── presigned-url/route.ts  # PUT for uploads
    │       │   └── download-url/route.ts   # ⬅️ NEW — GET for resume downloads
    │       ├── payment/
    │       │   ├── start/route.ts          # PayHere checkout initiation
    │       │   └── notify/route.ts         # PayHere webhook
    │       └── cron/
    │           ├── daily/route.ts          # ⬅️ NEW — combined cron (Hobby plan)
    │           ├── verify-jobs/route.ts    # ⬅️ manual trigger endpoint (still exists)
    │           ├── expire-jobs/route.ts    # ⬅️ manual trigger endpoint (still exists)
    │           ├── notify-hot-jobs/route.ts    # ⬅️ NEW — 10+ applicants email
    │           └── notify-stale-jobs/route.ts  # ⬅️ NEW — 3-day 0-applicant email
    │
    ├── components/
    │   ├── ui/
    │   │   ├── Button.tsx
    │   │   ├── Input.tsx
    │   │   ├── Select.tsx
    │   │   ├── Badge.tsx
    │   │   ├── Card.tsx
    │   │   ├── SubmitButton.tsx            # ⬅️ NEW
    │   │   └── Logo.tsx                    # ⬅️ NEW — extracted brand mark
    │   ├── layout/
    │   │   ├── Navbar.tsx
    │   │   ├── Footer.tsx
    │   │   └── Sidebar.tsx
    │   ├── auth/
    │   │   └── AuthShell.tsx               # ⬅️ NEW — split-screen auth layout
    │   ├── jobs/
    │   │   ├── JobCard.tsx
    │   │   ├── JobFilters.tsx              # mobile drawer
    │   │   ├── JobList.tsx
    │   │   └── JobDetail.tsx
    │   ├── applications/
    │   │   ├── ApplicationCard.tsx
    │   │   └── ApplyButton.tsx
    │   ├── employer/
    │   │   ├── JobForm.tsx
    │   │   ├── VerificationToggle.tsx
    │   │   ├── CompanyLogoUploader.tsx      # ⬅️ NEW
    │   │   ├── ViewResumeButton.tsx         # ⬅️ NEW
    │   │   └── ApplicationStatusSelect.tsx  # ⬅️ NEW (just now)
    │   ├── seeker/
    │   │   └── ResumeUpload.tsx
    │   └── payment/
    │       └── PayHereButton.tsx
    │
    ├── lib/
    │   ├── supabase/
    │   │   ├── client.ts
    │   │   ├── server.ts
    │   │   ├── admin.ts
    │   │   └── middleware.ts
    │   ├── s3/
    │   │   ├── client.ts
    │   │   └── presigned.ts                # resolvePublicUrl() helper
    │   ├── payhere/
    │   │   ├── hash.ts
    │   │   └── verify.ts
    │   ├── email/
    │   │   └── send.ts
    │   ├── cron/
    │   │   └── job-lifecycle.ts            # dispatchVerificationEmails, expireStaleJobs, notifyHotJobs, notifyStaleJobs
    │   ├── utils/
    │   │   ├── format.ts
    │   │   └── constants.ts                # JOB_POSTING_PRICES, priceForDuration
    │   └── validators/
    │       └── job.ts
    │
    ├── types/
    │   ├── database.types.ts               # auto-generated
    │   ├── job.ts                          # JobRow, ApplicationWithJob, ApplicationWithSeeker
    │   ├── user.ts                         # UserRole, SeekerProfile, CompanyRow
    │   ├── assets.d.ts                     # CSS/image declarations
    │   └── payment.ts                      # PaymentStatus, PayHereCheckoutParams
    │
    ├── hooks/
    │   ├── useUser.ts
    │   └── useJobs.ts
    │
    └── middleware.ts