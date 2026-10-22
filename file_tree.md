next-gen-job-marketplace/
├── .env.local.example                 # Environment variables template
├── .eslintrc.json
├── .gitignore
├── next.config.js
├── package.json
├── postcss.config.js
├── tailwind.config.ts
├── tsconfig.json
├── vercel.json                        # Vercel Cron Jobs configuration
├── README.md
│
├── public/                            # Static assets
│   ├── favicon.ico
│   ├── logo.svg
│   └── images/
│       └── placeholder-logo.png
│
├── supabase/                          # Supabase local development & migrations
│   ├── config.toml
│   ├── migrations/                    # SQL migration files (schema, RLS policies)
│   │   └── 20250101000000_init.sql
│   └── seed.sql
│
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── layout.tsx                 # Root layout
│   │   ├── page.tsx                   # Landing page
│   │   ├── globals.css
│   │   │
│   │   ├── (auth)/                    # Auth route group
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   ├── register/
│   │   │   │   └── page.tsx
│   │   │   └── callback/
│   │   │       └── route.ts           # Supabase auth callback
│   │   │
│   │   ├── (dashboard)/               # Protected dashboard routes
│   │   │   ├── layout.tsx             # Dashboard layout with sidebar
│   │   │   ├── employer/
│   │   │   │   ├── page.tsx           # Employer overview
│   │   │   │   ├── jobs/
│   │   │   │   │   ├── page.tsx       # List employer's jobs
│   │   │   │   │   ├── new/
│   │   │   │   │   │   └── page.tsx   # Create job form (Draft → Payment)
│   │   │   │   │   └── [jobId]/
│   │   │   │   │       ├── page.tsx   # Edit job / view applications
│   │   │   │   │       └── edit/
│   │   │   │   │           └── page.tsx
│   │   │   │   └── company/
│   │   │   │       └── page.tsx       # Company profile settings
│   │   │   └── seeker/
│   │   │       ├── page.tsx           # Seeker overview
│   │   │       ├── applications/
│   │   │       │   └── page.tsx       # List submitted applications
│   │   │       └── profile/
│   │   │           └── page.tsx       # Seeker profile & resume upload
│   │   │
│   │   ├── jobs/                      # Public job listings
│   │   │   ├── page.tsx               # Search results (SSR with URL params)
│   │   │   ├── loading.tsx
│   │   │   ├── [jobId]/
│   │   │   │   └── page.tsx           # Job detail page (SSG/ISR)
│   │   │   └── category/
│   │   │       └── [categorySlug]/
│   │   │           └── page.tsx       # Pre-rendered category landing (SSG)
│   │   │
│   │   ├── api/
│   │   │   ├── auth/
│   │   │   │   └── [...supabase]/
│   │   │   │       └── route.ts       # Supabase auth helpers (optional)
│   │   │   ├── s3/
│   │   │   │   └── presigned-url/
│   │   │   │       └── route.ts       # Generate pre-signed URL for uploads
│   │   │   ├── payment/
│   │   │   │   ├── start/
│   │   │   │   │   └── route.ts       # Initiate PayHere payment (hash generation)
│   │   │   │   └── notify/
│   │   │   │       └── route.ts       # PayHere webhook (verify signature)
│   │   │   └── cron/
│   │   │       ├── verify-jobs/
│   │   │       │   └── route.ts       # Weekly verification email trigger
│   │   │       └── expire-jobs/
│   │   │           └── route.ts       # Expire jobs without response after 48h
│   │   │
│   │   └── verify-job/                # Tokenized links from verification email
│   │       └── [token]/
│   │           └── page.tsx           # Handle "Yes, Still Hiring" / "No, Filled"
│   │
│   ├── components/                    # Reusable UI components
│   │   ├── ui/                        # Primitive components (buttons, inputs, etc.)
│   │   │   ├── Button.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Select.tsx
│   │   │   ├── Badge.tsx
│   │   │   └── Card.tsx
│   │   ├── layout/
│   │   │   ├── Navbar.tsx
│   │   │   ├── Footer.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── jobs/
│   │   │   ├── JobCard.tsx
│   │   │   ├── JobFilters.tsx
│   │   │   ├── JobList.tsx
│   │   │   └── JobDetail.tsx
│   │   ├── applications/
│   │   │   ├── ApplicationCard.tsx
│   │   │   └── ApplyButton.tsx
│   │   ├── employer/
│   │   │   ├── JobForm.tsx
│   │   │   └── VerificationToggle.tsx
│   │   ├── seeker/
│   │   │   └── ResumeUpload.tsx
│   │   └── payment/
│   │       └── PayHereButton.tsx      # Client component initiating PayHere SDK
│   │
│   ├── lib/                           # Server-side libraries & utilities
│   │   ├── supabase/
│   │   │   ├── client.ts              # Browser Supabase client
│   │   │   ├── server.ts              # Server Supabase client (cookies)
│   │   │   ├── admin.ts               # Service-role client (for webhooks/cron)
│   │   │   └── middleware.ts          # Middleware for auth session refresh
│   │   ├── s3/
│   │   │   ├── client.ts              # AWS SDK S3 client
│   │   │   └── presigned.ts           # Pre-signed URL generation logic
│   │   ├── payhere/
│   │   │   ├── hash.ts                # MD5 hash generation helper
│   │   │   └── verify.ts              # Webhook signature verification
│   │   ├── email/
│   │   │   └── send.ts                # Email sending (Resend/SendGrid)
│   │   ├── cron/
│   │   │   └── job-lifecycle.ts       # Core logic for verification & expiry
│   │   ├── utils/
│   │   │   ├── format.ts              # Date/currency formatting
│   │   │   └── constants.ts
│   │   └── validators/
│   │       └── job.ts                 # Zod schemas for job form validation
│   │
│   ├── types/                         # TypeScript type definitions
│   │   ├── database.types.ts          # Supabase generated types
│   │   ├── job.ts
│   │   ├── user.ts
│   │   └── payment.ts
│   │
│   ├── hooks/                         # Custom React hooks
│   │   ├── useUser.ts
│   │   └── useJobs.ts
│   │
│   └── middleware.ts                  # Next.js middleware (route protection)
│
└── scripts/                           # Optional utility scripts
    └── generate-db-types.ts           # Script to generate Supabase types