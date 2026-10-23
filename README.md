# HireLoop 🔄

> **The zero-stale job marketplace.** Automated 14-day verification loops that keep postings genuinely active.

[![Next.js](https://img.shields.io/badge/Next.js-14.2-black?style=flat&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue?style=flat&logo=typescript)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL%20%7C%20Auth%20%7C%20RLS-3ECF8E?style=flat&logo=supabase)](https://supabase.com/)
[![AWS S3](https://img.shields.io/badge/AWS-S3%20Presigned-orange?style=flat&logo=amazon-s3)](https://aws.amazon.com/s3/)
[![Vercel](https://img.shields.io/badge/Vercel-Cron%20%26%20Hosting-black?style=flat&logo=vercel)](https://vercel.com/)

[Live Demo](https://hireloop.vercel.app) · [Report a Bug](https://github.com/hireloop/hireloop/issues) · [Request a Feature](https://github.com/hireloop/hireloop/issues)

---

## Why HireLoop is Different

Job boards suffer from one systemic flaw: **stale, ghost listings**. Employers fill roles and abandon their posts, leaving job seekers shouting into the void and recruiters inundated with irrelevant resumes.

HireLoop eliminates this through an **automated verification loop**:
1. Every 14 days, employers receive an automated email asking: *"Still hiring for this role?"*
2. With a single click (no password or login required), the employer confirms the post is open or marks it filled.
3. If they don't respond within **48 hours**, the listing is automatically expired and removed from public search.

The result is a board where every single listing is guaranteed to have been confirmed by an actual human within the last fortnight.

---

## Table of Contents

- [Screenshots](#screenshots)
- [Core Features](#core-features)
- [The Verification Loop](#the-verification-loop)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Database Schema & RLS](#database-schema--rls)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Local Development](#local-development)
  - [Environment Variables](#environment-variables)
  - [AWS S3 Setup](#aws-s3-setup)
- [Deployment](#deployment)
  - [Vercel Deployment](#vercel-deployment)
  - [Post-Deploy Checklist](#post-deploy-checklist)
- [Project Structure](#project-structure)
- [Design Decisions](#design-decisions)
- [Known Limitations & Audit Findings](#known-limitations--audit-findings)
- [Roadmap](#roadmap)
- [License](#license)

---

## Screenshots

| Public Job Board | Job Detail & JSON-LD |
| :---: | :---: |
| ![Public Job Board](/public/images/screenshots/browse-jobs.png) | ![Job Detail](/public/images/screenshots/job-detail.png) |
| *Fast, filtered search with work type, salary, & categories* | *Clean listing with Google Jobs schema & direct application* |

| Employer Dashboard | Single-Click Verification |
| :---: | :---: |
| ![Employer Dashboard](/public/images/screenshots/employer-dashboard.png) | ![Verify Page](/public/images/screenshots/verify-page.png) |
| *Manage listings, payment status, and applications* | *Tokenized single-click verification without logging in* |

---

## Core Features

### For Employers
- **Company Profile Management**: Configure company identity and verified badges.
- **Structured Job Authoring**: Role descriptions, compensation ranges in LKR, work type (Remote, Hybrid, Onsite), and standardized categories.
- **Integrated Payments**: Frictionless LKR 2,500 listing fee powered by PayHere popup checkout.
- **Applicant Tracking**: Review incoming seeker applications per listing with applied dates and statuses.
- **Zero-Friction Re-verification**: One-click confirmation links sent directly to inbox on a 14-day schedule.

### For Job Seekers
- **Curated, Fresh Postings**: Guaranteed active listings verified within 14 days; no dead or ghost jobs.
- **One-Click Application**: Upload resume once; apply instantly to open positions without re-uploading.
- **Privacy & Performance**: Resumes are uploaded directly from the browser to an encrypted private AWS S3 bucket.
- **Application Dashboard**: Track status (Pending, Reviewed, Shortlisted, Rejected) in real time.

### Platform & Automation
- **Vercel Cron Orchestration**: Weekly dispatching of verification emails and daily expiration sweeps.
- **Incremental Static Regeneration (ISR)**: Public job detail pages cached globally and revalidated every 5 minutes.
- **Role-Based Routing**: Strict middleware-enforced role isolation preventing seekers and employers from accessing each other's spaces.

---

## The Verification Loop

The heart of HireLoop is an automated state machine triggered by background crons:

```mermaid
sequenceDiagram
    autonumber
    participant Cron as Vercel Cron
    participant DB as Supabase PostgreSQL
    participant Resend as Resend Email
    participant Emp as Employer Inbox
    participant App as HireLoop App (/verify-job)

    Note over Cron,DB: Triggered Weekly (Monday 09:00 UTC)
    Cron->>DB: Query ACTIVE jobs where last_verified_at > 14 days
    DB-->>Cron: Returns eligible jobs
    loop For each eligible job
        Cron->>DB: Generate UUID token & set verification_sent_at
        Cron->>Resend: Dispatch "Still hiring?" email with tokenized link
        Resend->>Emp: Deliver email to employer
    end

    alt Employer responds within 48h
        Emp->>App: Clicks "Yes, still hiring" (GET /verify-job/[token])
        App->>DB: Set last_verified_at = now(), clear token
        DB-->>App: Success
        App-->>Emp: Displays "Listing confirmed active"
    else Employer confirms role is filled
        Emp->>App: Clicks "No, position filled"
        App->>DB: Set status = 'FILLED', clear token
        DB-->>App: Success
        App-->>Emp: Displays "Listing archived"
    else 48h elapses with no response
        Note over Cron,DB: Triggered Daily (09:00 UTC)
        Cron->>DB: Query ACTIVE jobs where verification_sent_at > 48h
        Cron->>DB: Set status = 'EXPIRED', clear token
    end
```

---

## Tech Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Framework** | Next.js 14 (App Router) | Server Components for instant initial paint, Server Actions for mutations, and Edge Middleware for auth routing. |
| **Language** | TypeScript 5.6 (Strict) | End-to-end type safety across database schemas, API contracts, and form inputs. |
| **Database** | Supabase (PostgreSQL 15) | Relational integrity with strict constraints, cascading foreign keys, and Row-Level Security (RLS). |
| **Auth** | Supabase Auth | Cookie-based session handling with PKCE exchange, magic link OTP, and custom metadata roles. |
| **Object Storage** | AWS S3 | Encrypted, highly scalable storage. Private bucket for resumes; public bucket/CloudFront for logos. |
| **Payments** | PayHere Payment Gateway | Localized Sri Lankan payment gateway supporting LKR 2,500 fees via server-hashed checkout and HMAC signature verification. |
| **Email** | Resend | Modern transactional email delivery with high inbox deliverability. |
| **Styling** | Tailwind CSS | Utility-first CSS compiling to minimal production bundles without runtime overhead. |
| **Hosting & Crons**| Vercel | Global edge network with integrated Vercel Cron jobs for serverless scheduled tasks. |

---

## Architecture

```
                          ┌──────────────────────────────────────────────┐
                          │                Client Browser                │
                          └───────┬──────────────────────────────▲───────┘
                                  │                              │
                    HTTPS Requests│                              │Direct S3 PUT
                                  ▼                              │(Presigned URL)
                          ┌───────────────────────────────┐      │
                          │     Next.js 14 Edge/Node      │      │
                          │   (Vercel App Router / ISR)   │      │
                          └───────┬───────────────┬───────┘      │
                                  │               │              │
                   Cookies / RLS  │               │              │
                                  ▼               │Service Role  │
                          ┌───────────────┐       │(Cron/Webhook)│
                          │ Supabase Auth │       ▼              │
                          │ & PostgreSQL  │ ┌───────────┐        │
                          └───────────────┘ │ Admin DB  │        │
                                            └───────────┘        │
                                                  │              │
                   PayHere Webhook                ▼              │
             ┌─────────────────────────┐    ┌───────────┐        │
             │   PayHere Gateway API   │    │  Resend   │        │
             └─────────────────────────┘    │ Transaction│       │
                                            └─────┬─────┘        │
                                                  │              │
                                                  ▼              ▼
                                            ┌───────────┐ ┌──────────────┐
                                            │ Employer  │ │ AWS S3 Bucket│
                                            │   Inbox   │ │  (Resumes)   │
                                            └───────────┘ └──────────────┘
```

### Key Architectural Tenets
1. **The Three-Client Supabase Pattern**:
   - `client.ts`: Browser-only client using `createBrowserClient` with public anon key and RLS.
   - `server.ts`: Server Component and Server Action client using cookie storage with RLS.
   - `admin.ts`: Service-role client guarded with `server-only` strictly reserved for webhooks and cron tasks.
2. **Zero-Byte File Relay**: User resumes never touch or buffer through the Next.js server. The client requests a 5-minute pre-signed PUT URL and uploads directly to AWS S3.
3. **Cookie-Free ISR for Public Pages**: `/jobs/[jobId]` statically pre-renders with `revalidate = 300` using a cookie-free anonymous Supabase client so public visitors enjoy instant response times.

---

## Database Schema & RLS

HireLoop uses 5 relational tables in PostgreSQL:

- `public.users`: Mirrors `auth.users` with `role` (`EMPLOYER` or `JOB_SEEKER`) and `resume_url`.
- `public.companies`: Employer company profiles (`employer_id` references `users.id`).
- `public.jobs`: Job listings with work type, salary ranges, verification status, and tokens.
- `public.applications`: Job applications linking `job_id` and `seeker_id` with a unique constraint preventing duplicate submissions.
- `public.payments`: Payment audit ledger tracking PayHere `order_id`, amount, and gateway references.

### Row-Level Security (RLS) Policy Highlights
- **Companies**: Readable by everyone; write/update restricted to the company owner (`auth.uid() = employer_id`).
- **Jobs**: Active jobs are readable by the public; drafts and archived jobs are only visible to the owner company.
- **Applications**: Seekers can only insert and read their own applications (`auth.uid() = seeker_id`). Employers can only read applications submitted to jobs owned by their company.
- **Payments**: Users can only inspect their own payments (`auth.uid() = user_id`). Webhooks use the service role.

---

## Getting Started

### Prerequisites
- Node.js 18.18+ or 20.x
- AWS Account with an S3 Bucket and IAM user credentials
- Supabase Project (cloud or local Supabase CLI)
- PayHere Merchant Account (or Sandbox credentials)
- Resend Account & verified sending domain

### Local Development

1. **Clone the repository**:
   ```bash
   git clone https://github.com/hireloop/hireloop.git
   cd hireloop
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure environment variables**:
   ```bash
   cp .env.local.example .env.local
   # Fill in your Supabase, AWS, PayHere, and Resend credentials
   ```

4. **Initialize Supabase**:
   ```bash
   # Push schema migrations to Supabase
   npm run db:push
   ```

5. **Run the development server**:
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## Environment Variables

All environment variables used by HireLoop, documented with their requirements:

```bash
# ==============================================================================
# Supabase Configuration
# ==============================================================================
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
# Service role key must NEVER be prefixed with NEXT_PUBLIC_
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6...
SUPABASE_PROJECT_ID=your-project-id

# ==============================================================================
# Application URL
# ==============================================================================
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ==============================================================================
# AWS S3 Storage (Private Resumes & Public Logos)
# ==============================================================================
AWS_REGION=ap-south-1
AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
S3_PRIVATE_BUCKET=hireloop-resumes-private
S3_PUBLIC_BUCKET=hireloop-assets-public
CLOUDFRONT_PUBLIC_DOMAIN=https://cdn.hireloop.lk

# ==============================================================================
# PayHere Payment Gateway (Sri Lanka)
# ==============================================================================
PAYHERE_MERCHANT_ID=1210000
PAYHERE_MERCHANT_SECRET=your_payhere_merchant_secret
# Use 'sandbox' for staging or 'production' for live payments
PAYHERE_MODE=sandbox

# ==============================================================================
# Resend Email Delivery
# ==============================================================================
RESEND_API_KEY=re_1234567890abcdef
EMAIL_FROM=HireLoop <notifications@hireloop.lk>

# ==============================================================================
# Vercel Cron Security Secret
# ==============================================================================
CRON_SECRET=your_random_32_byte_secret_key_here
```

---

## AWS S3 Setup

Create a private S3 bucket for resumes (`hireloop-resumes-private`) with Block Public Access enabled. Configure CORS on the bucket to allow browser `PUT` uploads:

```json
[
  {
    "AllowedHeaders": [
      "content-type",
      "content-length"
    ],
    "AllowedMethods": [
      "PUT"
    ],
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://hireloop.vercel.app"
    ],
    "ExposeHeaders": [
      "ETag"
    ],
    "MaxAgeSeconds": 3000
  }
]
```

---

## Deployment

### Vercel Deployment
1. Connect your repository to Vercel.
2. In Project Settings > Environment Variables, populate all variables listed in `.env.local.example`.
3. Vercel automatically detects `vercel.json` and configures the two cron schedules:
   - `/api/cron/verify-jobs`: Weekly (Mondays 09:00 UTC)
   - `/api/cron/expire-jobs`: Daily (09:00 UTC)

### Post-Deploy Checklist
- [ ] Ensure `CRON_SECRET` in Vercel environment matches the Authorization header Vercel Cron sends.
- [ ] Configure PayHere Merchant Portal return URL, cancel URL, and notify URL domain whitelisting.
- [ ] Verify your domain in Resend to ensure verification emails pass SPF/DKIM checks.
- [ ] Confirm S3 CORS allows your production Vercel domain.

---

## Project Structure

```
├── public/                 # Static public assets (logos, favicon)
├── scripts/
│   └── generate-db-types.ts# Supabase TypeScript schema generator
├── src/
│   ├── app/
│   │   ├── (auth)/         # Login, register, auth callback
│   │   ├── api/            # Route handlers (cron, payments, S3 presigned)
│   │   ├── dashboard/      # Protected employer and seeker dashboards
│   │   ├── jobs/           # Public job browse, search, and detail (ISR)
│   │   ├── verify-job/     # Tokenized single-click verification landing
│   │   ├── layout.tsx      # Root HTML layout with Inter font
│   │   └── page.tsx        # Landing hero and marketing page
│   ├── components/
│   │   ├── applications/   # Application cards and apply action button
│   │   ├── employer/       # Job authoring form and verification toggle
│   │   ├── jobs/           # Job cards, search filters, detail view
│   │   ├── payment/        # Client PayHere checkout button SDK wrapper
│   │   ├── seeker/         # Resume direct uploader component
│   │   └── ui/             # Core design system primitives (Button, Card, Badge)
│   ├── hooks/              # Custom React hooks (useJobs, useUser)
│   ├── lib/
│   │   ├── cron/           # Job lifecycle automation logic
│   │   ├── email/          # Resend transactional email client
│   │   ├── payhere/        # Payment hash generation & md5sig verification
│   │   ├── s3/             # S3 client and pre-signed URL builder
│   │   ├── supabase/       # 3-client architecture (client, server, admin)
│   │   ├── utils/          # Formatting, CN helper, constants
│   │   └── validators/     # Zod validation schemas
│   ├── types/              # Domain and database TypeScript definitions
│   └── middleware.ts       # Edge auth refresh and role-based routing
├── supabase/
│   ├── migrations/         # Idempotent PostgreSQL DDL migrations
│   ├── config.toml         # Local Supabase CLI configuration
│   └── seed.sql            # Local test data
├── vercel.json             # Vercel deployment configuration & cron schedule
├── package.json
└── tsconfig.json
```

---

## Design Decisions

### 1. The Verification Loop vs. Fixed Expiration Dates
Most job boards set arbitrary 30-day or 60-day listing expirations. This is ineffective: hot engineering roles often fill within 7 days, leaving a 3-week zombie post, while niche leadership roles may legitimately remain open for 90 days. HireLoop decouples expiration from total listing age by anchoring to a 14-day *recency of human confirmation*. If an employer is responsive, a role can remain live for months; if they fill the role or ghost their inbox, it disappears in 48 hours.

### 2. The Three-Client Supabase Architecture
Supabase authentication in Next.js App Router requires strict client boundary separation. We enforce three separate client initializers:
- `client.ts` uses `@supabase/ssr`'s `createBrowserClient` with public anon keys for interactive client components.
- `server.ts` uses `createServerClient` reading from `next/headers` cookies, automatically propagating refreshed JWT tokens while respecting RLS.
- `admin.ts` uses `@supabase/supabase-js` with the service-role key. We mark this module with `import "server-only"` to prevent bundlers from ever leaking it into client bundles, restricting its use exclusively to webhooks and automated cron routines.

### 3. Direct Browser-to-S3 Presigned Uploads
Allowing applicant PDF resumes to stream through Next.js serverless functions is an anti-pattern: it consumes expensive Vercel compute execution memory, risks hitting the 4.5 MB serverless payload ceiling, and exposes the app server to uninspected byte streams. Instead, the server inspects the MIME type and file size, authenticates the applicant, and signs an S3 `PutObjectCommand`. The browser uploads bytes directly to AWS over HTTPS, storing only the sanitized object key in PostgreSQL.

### 4. ISR with Cookie-Free Anonymous Clients for Public Jobs
Public job seekers demand sub-100ms response times and search engines require crawlable static HTML. Next.js App Router will silently de-opt static generation into dynamic rendering if `cookies()` is accessed during rendering. In `/jobs/[jobId]/page.tsx`, we deliberately instantiate a standalone cookie-free Supabase anonymous client with `revalidate = 300`. This enables full Incremental Static Regeneration (ISR) and Google Jobs JSON-LD schema generation without losing Edge caching benefits.

### 5. Server-Generated Payment Hashing & Webhook Signature Verification
Client-side payment parameters can be tampered with in transit. In our PayHere integration, the checkout hash (`MD5(merchant_id + order_id + amount + currency + uppercase(MD5(secret)))`) is calculated strictly on the server in `/api/payment/start`. Upon completion, the `/api/payment/notify` webhook validates the incoming `md5sig` signature using `timingSafeEqual` against the merchant secret before updating payment state or activating draft jobs.

### 6. Defense-in-Depth Authentication Routing
Route protection cannot rely solely on client redirects. In HireLoop, protection is layered:
1. `src/middleware.ts` inspects sessions at the edge, refreshes expired tokens, mirrors cookies onto redirects, and enforces role boundaries (`/dashboard/employer` vs `/dashboard/seeker`).
2. `src/app/dashboard/layout.tsx` independently queries `supabase.auth.getUser()` on the server, guaranteeing that direct page requests cannot bypass middleware.
3. PostgreSQL Row-Level Security policies strictly restrict all database operations to `auth.uid()`.

---

## Known Limitations & Audit Findings

During the pre-launch engineering audit, the following items were identified and documented for remediation:
- **Verification Cron Query**: `dispatchVerificationEmails()` in `job-lifecycle.ts` attempts to join `users` directly from `jobs`, which fails due to the missing direct foreign key (must traverse through `companies`).
- **User Signup Upsert**: Client-side upsert during registration fails under RLS because `public.users` lacks a client INSERT policy (creation is intended to be handled by the database trigger).
- **Employer Resume Access**: The employer job detail page does not currently generate pre-signed S3 download URLs for applicant resumes.
- **Category Persistence**: The job creation and edit Server Actions omit `category` in schema parsing, preventing category updates from saving.
- **Sign-Out Route**: The sidebar and navbar point to `/logout`, which requires a dedicated route handler.

---

## Roadmap

- [ ] Complete remediation of pre-launch audit items.
- [ ] Add presigned S3 download links for employer resume viewing.
- [ ] Support applicant cover notes and portfolio links.
- [ ] Employer company logo uploading via public S3 bucket.
- [ ] WhatsApp notification option for employer 14-day re-verification.
- [ ] Webhook integration for Slack/Discord candidate application alerts.

---

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) for details.

---

[Back to top ↑](#hireloop-)
