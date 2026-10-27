# HireLoop 🔄

> **The zero-stale job marketplace for small businesses.** Every listing runs for 7 days, then the employer renews it or closes it, so postings stay genuinely active.

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%7C%20Auth%20%7C%20RLS-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)
[![AWS S3](https://img.shields.io/badge/AWS-S3%20Presigned-orange?style=flat&logo=amazon-s3)](https://aws.amazon.com/s3/)
[![Vercel](https://img.shields.io/badge/Vercel-Cron%20%26%20Hosting-black?style=flat&logo=vercel)](https://vercel.com/)

[Live Demo](https://realjobs-khaki.vercel.app) · [Report a Bug](https://github.com/Vivan2025wd/real_jobs/issues) · [Request a Feature](https://github.com/Vivan2025wd/real_jobs/issues)

---

## Why HireLoop is Different

Job boards suffer from one systemic flaw: **stale, ghost listings**. Employers fill roles and abandon their posts, leaving job seekers shouting into the void and recruiters inundated with irrelevant resumes.

HireLoop addresses this with a **7-day listing lifecycle**:

1. A paid listing (LKR 2,500) stays live for **7 days**.
2. Two days before it ends, the employer gets a message by email or WhatsApp: *"Found your person? Close it, or renew for another week."*
3. One click closes the listing as filled or starts a renewal. If they do nothing, the listing expires automatically on day 7.

The result is a board where every public listing is at most a week old, unless the employer actively renewed it.

---

## Table of Contents

- [Screenshots](#screenshots)
- [Core Features](#core-features)
- [The Listing Lifecycle](#the-listing-lifecycle)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Database Schema & RLS](#database-schema--rls)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development](#local-development)
  - [Environment Variables](#environment-variables)
  - [AWS S3 Setup](#aws-s3-setup)
- [Deployment](#deployment)
- [Project Structure](#project-structure)
- [Design Decisions](#design-decisions)
- [Engineering Audit & Resolution](#engineering-audit--resolution)
- [Roadmap](#roadmap)
- [License](#license)

---

## Screenshots

The app is live at **[realjobs-khaki.vercel.app](https://realjobs-khaki.vercel.app)**. Static screenshots will be added as the project grows. The key screens are:

- **Public Job Board**: fast, filtered search by work type, salary, and category.
- **Job Detail**: clean listing with Google Jobs JSON-LD schema and direct application.
- **Employer Dashboard**: manage listings, payment status, and applications.
- **Single-Click Verification**: tokenized confirmation page, no login required.

---

## Core Features

### For Employers
- **Company Profile Management**: company identity, logo, and verified badge.
- **Structured Job Authoring**: role descriptions, compensation ranges in LKR, work type (Remote, Hybrid, Onsite), and standardized categories.
- **Integrated Payments**: LKR 2,500 per 7-day listing via PayHere popup checkout.
- **Applicant Tracking**: review applications per listing with applied dates, statuses, and resume downloads.
- **One-Click Renew or Close**: a reminder by email or WhatsApp before the listing ends, with single-click links to close it or renew it.

### For Job Seekers
- **Fresh Postings**: only listings inside their active 7-day window appear publicly.
- **One-Click Application**: upload a resume once and apply to any open position without re-uploading.
- **Privacy & Performance**: resumes upload directly from the browser to a private AWS S3 bucket.
- **Application Dashboard**: track status (Pending, Reviewed, Shortlisted, Rejected).

### Platform & Automation
- **Vercel Cron Orchestration**: daily crons send expiry reminders and expire ended listings.
- **Incremental Static Regeneration (ISR)**: public job detail pages are cached and revalidated every 5 minutes.
- **Role-Based Routing**: middleware-enforced isolation between seeker and employer areas.

---

## The Listing Lifecycle

The core of HireLoop is a short paid window followed by a renew-or-close check-in, driven by two daily cron jobs:

```mermaid
sequenceDiagram
    autonumber
    participant Emp as Employer
    participant App as HireLoop App
    participant DB as Supabase PostgreSQL
    participant Cron as Vercel Cron (daily)
    participant Msg as Resend / WhatsApp

    Emp->>App: Pays LKR 2,500 (PayHere)
    App->>DB: status = ACTIVE, expires_at = now() + 7 days

    Note over Cron,DB: Daily, 09:00 UTC
    Cron->>DB: Find ACTIVE jobs expiring within 48h with no reminder sent
    loop Each job
        Cron->>DB: Generate token, set reminder_sent_at
        Cron->>Msg: Send "Found your person?" message (email or WhatsApp)
        Msg->>Emp: Deliver message with Close / Renew links
    end

    alt Employer found someone
        Emp->>App: Opens link, confirms "Close this listing"
        App->>DB: status = FILLED, clear token
    else Employer wants more applicants
        Emp->>App: Opens link, chooses "Renew" and pays via PayHere
        App->>DB: Payment webhook extends expires_at by 7 days
    else No response
        Cron->>DB: ACTIVE jobs where expires_at has passed
        Cron->>DB: status = EXPIRED, clear token
    end
```

> **Note:** public queries also filter on `expires_at > now()`, so a listing disappears from search exactly at day 7 even though the expiry sweep only runs once a day.

---

## Tech Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | Next.js 14 (App Router) | Server Components for fast initial paint, Server Actions for mutations, and Edge Middleware for auth routing. |
| **Language** | TypeScript 5.6 (Strict) | End-to-end type safety across database schemas, API contracts, and form inputs. |
| **Database** | Supabase (PostgreSQL 15) | Relational integrity, cascading foreign keys, and Row-Level Security (RLS). |
| **Auth** | Supabase Auth | Cookie-based sessions with PKCE exchange, magic link OTP, and role metadata. |
| **Object Storage** | AWS S3 | Private bucket for resumes; public bucket for company logos. |
| **Payments** | PayHere | Sri Lankan payment gateway with server-hashed checkout and `md5sig` webhook verification. |
| **Messaging** | Resend (email), WhatsApp Cloud API (planned) | Transactional email now; WhatsApp as a second channel for owners who rarely check email. |
| **Styling** | Tailwind CSS | Utility-first CSS with minimal production bundles. |
| **Hosting & Crons** | Vercel | Edge network with integrated Vercel Cron for scheduled tasks. |

---

## Architecture

```text
                 ┌────────────────────────────────────────┐
                 │             Client Browser             │
                 └───────┬────────────────────────▲───────┘
                         │ HTTPS                  │ Direct PUT
                         ▼                        │ (presigned URL)
                 ┌───────────────────────┐        │
                 │  Next.js 14 on Vercel │        │
                 │  (App Router / ISR)   │        │
                 └───┬───────────────┬───┘        │
        Cookies / RLS│               │Service role│
                     ▼               ▼ (cron/webhook)
          ┌──────────────────┐  ┌──────────────┐  │
          │ Supabase Auth &  │  │  Admin DB    │  │
          │ PostgreSQL       │  │  access      │  │
          └──────────────────┘  └──────┬───────┘  │
                                       │          │
   ┌──────────────────────┐            ▼          ▼
   │ PayHere Gateway      │──────▶ (webhook)   ┌────────────────┐
   └──────────────────────┘                    │ AWS S3 Buckets │
                                               │ resumes / logos│
          ┌──────────────────┐                 └────────────────┘
          │  Resend (email)  │──▶ Employer inbox
          └──────────────────┘
```

### Key Architectural Tenets

1. **Three-Client Supabase Pattern**
   - `client.ts`: browser-only client using `createBrowserClient` with the public anon key and RLS.
   - `server.ts`: Server Component / Server Action client using cookie storage with RLS.
   - `admin.ts`: service-role client guarded with `server-only`, reserved for webhooks and cron tasks.
2. **Zero-Byte File Relay**: resumes never pass through the Next.js server. The client requests a 5-minute presigned PUT URL and uploads directly to S3.
3. **Cookie-Free ISR for Public Pages**: `/jobs/[jobId]` statically pre-renders with `revalidate = 300` using a cookie-free anonymous Supabase client.

---

## Database Schema & RLS

HireLoop uses five relational tables in PostgreSQL:

- `public.users`: mirrors `auth.users` with `role` (`EMPLOYER` or `JOB_SEEKER`) and `resume_url`.
- `public.companies`: employer company profiles (`employer_id` references `users.id`).
- `public.jobs`: listings with work type, salary range, status, `expires_at`, reminder timestamp, and tokens.
- `public.applications`: links `job_id` and `seeker_id`, with a unique constraint preventing duplicate submissions.
- `public.payments`: payment audit ledger tracking PayHere `order_id`, amount, and gateway references.

### Row-Level Security Highlights

- **Companies**: readable by everyone; writes restricted to the owner (`auth.uid() = employer_id`).
- **Jobs**: active jobs are public; drafts and archived jobs are visible only to the owning company.
- **Applications**: seekers can insert and read only their own applications; employers can read only applications for jobs their company owns.
- **Payments**: users can read only their own payments. Webhooks use the service role.

---

## Getting Started

### Prerequisites

- Node.js 18.18+ or 20.x
- AWS account with S3 buckets and IAM user credentials
- Supabase project (cloud or local Supabase CLI)
- PayHere merchant account (or sandbox credentials)
- Resend account and a verified sending domain

### Local Development

1. **Clone the repository**
   ```bash
   git clone https://github.com/Vivan2025wd/real_jobs.git
   cd real_jobs
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   ```bash
   cp .env.local.example .env.local
   # Fill in your Supabase, AWS, PayHere, and Resend credentials
   ```

4. **Initialize Supabase**
   ```bash
   # Link to your Supabase project
   npx supabase link --project-ref <your-project-ref>

   # Push schema migrations
   npx supabase db push

   # Generate TypeScript types from the live schema
   npx supabase gen types typescript --project-id <your-project-ref> > src/types/database.types.ts
   ```
   > On Windows PowerShell, use `| Out-File src/types/database.types.ts -Encoding utf8` instead of `>`.

5. **Run the development server**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000).

### Environment Variables

```bash
# ==============================================================================
# Supabase
# ==============================================================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
# Service role key must NEVER be prefixed with NEXT_PUBLIC_
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...

# ==============================================================================
# Application URL
# ==============================================================================
# Local: http://localhost:3000
# Production: https://your-app.vercel.app  (must include https://)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ==============================================================================
# AWS S3 (private resumes & public logos)
# ==============================================================================
# AWS_REGION must exactly match the region your buckets live in.
# Common values: ap-southeast-2 (Sydney), ap-south-1 (Mumbai), us-east-1 (N. Virginia)
AWS_REGION=ap-southeast-2

# Use the FULL bucket names from the AWS Console (including any suffix).
S3_PRIVATE_BUCKET=your-resumes-bucket-name
S3_PUBLIC_BUCKET=your-assets-bucket-name

# Optional. Leave EMPTY to serve logos directly from S3.
# Only set if you have a CloudFront distribution, e.g. https://d111111abcdef8.cloudfront.net
# Placeholder values such as "https://cdn.yourdomain.com" are detected and ignored.
CLOUDFRONT_PUBLIC_DOMAIN=

AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=...

# ==============================================================================
# PayHere (Sri Lanka)
# ==============================================================================
PAYHERE_MERCHANT_ID=1210000
PAYHERE_MERCHANT_SECRET=your_payhere_merchant_secret
# 'sandbox' for staging, 'production' for live payments
PAYHERE_MODE=sandbox

# ==============================================================================
# Resend
# ==============================================================================
RESEND_API_KEY=re_...
# For testing, "onboarding@resend.dev" only delivers to your own verified email.
# For production, verify a domain and use e.g. "notifications@yourdomain.com".
EMAIL_FROM=HireLoop <onboarding@resend.dev>

# ==============================================================================
# WhatsApp Business Cloud API (optional, planned)
# ==============================================================================
# Business-initiated messages need an approved message template.
WHATSAPP_TOKEN=
WHATSAPP_PHONE_NUMBER_ID=
WHATSAPP_TEMPLATE_NAME=listing_expiring

# ==============================================================================
# Cron security
# ==============================================================================
# Generate with: openssl rand -base64 32
# Or PowerShell: [Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Max 256 }))
# Must also be set in Vercel env vars, otherwise crons return 401.
CRON_SECRET=
```

### AWS S3 Setup

#### Resumes bucket (private)

Create a bucket with **Block Public Access enabled** (the default), then add this CORS configuration so browsers can upload with `PUT`:

```json
[
  {
    "AllowedHeaders": ["*"],
    "AllowedMethods": ["PUT", "GET", "HEAD"],
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://your-app.vercel.app"
    ],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

#### Logos bucket (public)

Create a **second** bucket for company logos with:

1. **Block Public Access disabled** (uncheck all four boxes).
2. A **bucket policy** allowing public reads:

   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Sid": "PublicReadLogos",
         "Effect": "Allow",
         "Principal": "*",
         "Action": "s3:GetObject",
         "Resource": "arn:aws:s3:::your-assets-bucket-name/*"
       }
     ]
   }
   ```

3. The **same CORS configuration** as above.

#### IAM permissions

The IAM user needs object access on both buckets, plus `ListBucket`:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"],
      "Resource": [
        "arn:aws:s3:::your-resumes-bucket-name/*",
        "arn:aws:s3:::your-assets-bucket-name/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": ["s3:ListBucket"],
      "Resource": [
        "arn:aws:s3:::your-resumes-bucket-name",
        "arn:aws:s3:::your-assets-bucket-name"
      ]
    }
  ]
}
```

---

## Deployment

### Vercel

1. Connect your repository to Vercel.
2. Under Project Settings → Environment Variables, add every variable from `.env.local.example`.
3. Vercel reads `vercel.json` and configures the two cron schedules:
   - `/api/cron/verify-jobs`: daily (09:00 UTC), sends expiry reminders for listings ending within 48 hours
   - `/api/cron/expire-jobs`: daily (09:00 UTC), expires listings past `expires_at`

### Post-Deploy Checklist

- [ ] `CRON_SECRET` is set in Vercel and matches what the cron routes expect (Vercel sends it as a `Bearer` token in the `Authorization` header).
- [ ] PayHere merchant portal has the return URL, cancel URL, and notify URL domain whitelisted.
- [ ] Your domain is verified in Resend so emails pass SPF/DKIM.
- [ ] S3 CORS allows your production Vercel domain on **both** buckets.
- [ ] The assets bucket is publicly readable (open a logo URL in a private browser window).
- [ ] Both crons run successfully from Vercel dashboard → Cron Jobs → Run, returning `{ ok: true }`.

---

## Project Structure

```text
├── public/                  # Static assets (logos, favicon)
├── scripts/
│   └── generate-db-types.ts # Supabase TypeScript schema generator
├── src/
│   ├── app/
│   │   ├── (auth)/          # Login, register, auth callback
│   │   ├── api/             # Route handlers (cron, payments, S3 presigned)
│   │   ├── dashboard/       # Protected employer and seeker dashboards
│   │   ├── jobs/            # Public job browse, search, and detail (ISR)
│   │   ├── verify-job/      # Tokenized single-click verification page
│   │   ├── layout.tsx       # Root layout
│   │   └── page.tsx         # Landing page
│   ├── components/
│   │   ├── applications/    # Application cards and apply button
│   │   ├── auth/            # Split-screen AuthShell
│   │   ├── employer/        # Job form, verification toggle, logo uploader
│   │   ├── jobs/            # Job cards, search filters, detail view
│   │   ├── payment/         # PayHere checkout button wrapper
│   │   ├── seeker/          # Resume uploader
│   │   └── ui/              # Design system primitives (Button, Card, Badge)
│   ├── hooks/               # Custom hooks (useJobs, useUser)
│   ├── lib/
│   │   ├── cron/            # Job lifecycle automation
│   │   ├── email/           # Resend client
│   │   ├── payhere/         # Hash generation & md5sig verification
│   │   ├── s3/              # S3 client and presigned URL builder
│   │   ├── supabase/        # client.ts, server.ts, admin.ts
│   │   ├── utils/           # Formatting, constants
│   │   └── validators/      # Zod schemas
│   ├── types/               # Domain and database types
│   └── middleware.ts        # Session refresh and role-based routing
├── supabase/
│   ├── migrations/          # PostgreSQL migrations
│   ├── config.toml          # Local Supabase CLI config
│   └── seed.sql             # Local test data
├── vercel.json              # Deployment config & cron schedule
├── package.json
└── tsconfig.json
```

---

## Design Decisions

### 1. Short Paid Windows + Renew-or-Close
Most job boards use arbitrary 30- or 60-day expirations, which leaves zombie posts long after a role is filled. Small businesses usually hire fast, so HireLoop sells a 7-day window. Before it ends, the employer is asked one question: found your person, or need more applicants? Closing is free and instant, and renewing is one payment. The freshness guarantee therefore doubles as the renewal prompt, and a filled role never lingers.

### 2. Three-Client Supabase Architecture
Supabase auth in the Next.js App Router needs strict client boundaries:
- `client.ts` uses `@supabase/ssr`'s `createBrowserClient` with the anon key for interactive components.
- `server.ts` uses `createServerClient` with `next/headers` cookies, propagating refreshed tokens while respecting RLS.
- `admin.ts` uses `@supabase/supabase-js` with the service-role key and `import "server-only"` so it can never be bundled into client code. It is used only by webhooks and cron routes.

### 3. Direct Browser-to-S3 Presigned Uploads
Streaming resumes through serverless functions consumes compute, can hit Vercel's 4.5 MB payload limit, and exposes the server to uninspected byte streams. Instead, the server validates the MIME type and size, authenticates the user, and signs an S3 `PutObjectCommand`. The browser uploads directly to AWS, and only the sanitized object key is stored in PostgreSQL.

### 4. ISR with Cookie-Free Anonymous Clients
Accessing `cookies()` during rendering silently turns a static page into a dynamic one. In `/jobs/[jobId]/page.tsx`, a standalone cookie-free anonymous Supabase client plus `revalidate = 300` keeps the page statically cacheable, crawlable, and able to emit Google Jobs JSON-LD.

### 5. Server-Generated Payment Hashing & Webhook Verification
Client-side payment parameters can be tampered with. The checkout hash (`MD5(merchant_id + order_id + amount + currency + uppercase(MD5(secret)))`) is computed only on the server in `/api/payment/start`. The `/api/payment/notify` webhook verifies the incoming `md5sig` with `timingSafeEqual` before updating payment state or activating draft jobs.

### 6. Defense-in-Depth Route Protection
1. `src/middleware.ts` checks sessions at the edge, refreshes expired tokens, and enforces role boundaries (`/dashboard/employer` vs `/dashboard/seeker`).
2. `src/app/dashboard/layout.tsx` independently calls `supabase.auth.getUser()` on the server so direct requests can't bypass middleware.
3. PostgreSQL RLS policies restrict all data access to `auth.uid()`.

---

## Engineering Audit & Resolution

Before the initial deploy, the project went through a structured engineering audit. 18 issues were identified across four severity bands and resolved, with `tsc --noEmit` and `next build` passing.

| Wave | Severity | Issues | Status |
| :--- | :--- | :---: | :--- |
| 1 | 🔴 Critical | 3 | ✅ Resolved |
| 2 | 🟠 High | 6 | ✅ Resolved |
| 3 | 🟡 Medium | 6 | ✅ Resolved |
| 4 | 🟢 Low | 3 | ✅ Resolved |

### Highlights

**Critical**
- Fixed the PostgREST two-level join in the verification cron (`jobs → companies → users`), which collapsed to `never` and broke the send loop.
- Removed redundant client-side upserts now handled by the `handle_new_user()` trigger (they failed under RLS because `users` has no client INSERT policy).
- Populated `.env.local.example` to prevent silent misconfiguration.

**High**
- Added `timingSafeEqual` cron secret verification with header-only auth (removed the query-string secret).
- Implemented `GET /logout` so Navbar and Sidebar sign-out links no longer return 405.
- Preserved `category` through job create/edit Server Actions.
- Fixed the employer dashboard applications counter (`job_id!inner` → `jobs!inner`).
- Restored ISR caching on category pages via cookie-free clients.
- Implemented employer resume downloads via presigned `GetObjectCommand` URLs.

**Medium**
- Reordered the PayHere webhook to activate the job before marking the payment `COMPLETED`, preventing stuck `DRAFT` jobs on retry.
- Consolidated duplicate type definitions and constants across `types/` and `lib/`.
- Removed leftover `console.log` calls from the payment flow.
- Added RLS-supporting indexes on `applications.seeker_id`, `companies.employer_id`, `jobs.company_id`, and `payments.user_id`.
- Updated stale UI copy ("payment coming soon" → "pay LKR 2,500 to publish").
- Adopted the `JobList` component in `/jobs` to remove dead code.

**Low**
- Added a company logo uploader wired to the presigned URL endpoint.
- Enforced a role check on resume uploads (employers cannot upload resumes).
- Corrected `searchParams` typing in auth pages (Next.js 14 convention).

### Current status

No known outstanding bugs at the time of writing. `tsc --noEmit` and `next build` pass, the two crons have been triggered manually from the Vercel dashboard, and the payment flow, resume upload, logo upload, sign-out, and verification loop have been exercised end to end.

---

## Roadmap

- [x] Remediate pre-launch audit items (18 issues)
- [x] Presigned S3 download links for employer resume viewing
- [x] Employer company logo upload via public S3 bucket
- [x] Correct sign-out flow across Navbar and Sidebar
- [x] Initial 14-day verification loop end to end (being replaced by the 7-day lifecycle)
- [ ] Applicant cover notes and portfolio links
- [ ] 7-day listing cap with renew-or-close reminders by email
- [ ] WhatsApp reminders as a second channel
- [ ] "Found your person?" prompt after 10 applicants
- [ ] Tips for listings with no applicants
- [ ] Free repost guarantee when a listing gets zero applicants
- [ ] Slack/Discord webhook for candidate application alerts
- [ ] Public REST API for job aggregators
- [ ] Native mobile app (React Native)

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

[Back to top ↑](#hireloop-)
