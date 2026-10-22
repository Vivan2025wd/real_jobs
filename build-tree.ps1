# build-tree.ps1 — fixed
$ErrorActionPreference = "Stop"
$Project = "next-gen-job-marketplace"   # change to "real_jobs" if you prefer

if (Test-Path $Project) {
    Write-Error "'$Project' already exists. Aborting."; exit 1
}

# ---------- 1. Directories ----------
$dirs = @(
    "public/images", "supabase/migrations",
    "src/app/(auth)/login", "src/app/(auth)/register", "src/app/(auth)/callback",
    "src/app/(dashboard)/employer/jobs/new",
    "src/app/(dashboard)/employer/jobs/[jobId]/edit",
    "src/app/(dashboard)/employer/company",
    "src/app/(dashboard)/seeker/applications",
    "src/app/(dashboard)/seeker/profile",
    "src/app/jobs/[jobId]", "src/app/jobs/category/[categorySlug]",
    "src/app/api/auth/[...supabase]",
    "src/app/api/s3/presigned-url",
    "src/app/api/payment/start", "src/app/api/payment/notify",
    "src/app/api/cron/verify-jobs", "src/app/api/cron/expire-jobs",
    "src/app/verify-job/[token]",
    "src/components/ui", "src/components/layout", "src/components/jobs",
    "src/components/applications", "src/components/employer",
    "src/components/seeker", "src/components/payment",
    "src/lib/supabase", "src/lib/s3", "src/lib/payhere",
    "src/lib/email", "src/lib/cron", "src/lib/utils", "src/lib/validators",
    "src/types", "src/hooks", "scripts"
)

# ---------- 2. Files that MAY be empty ----------
$emptyFiles = @(
    "src/app/(auth)/login/page.tsx",
    "src/app/(auth)/register/page.tsx",
    "src/app/(auth)/callback/route.ts",
    "src/app/(dashboard)/layout.tsx",
    "src/app/(dashboard)/employer/page.tsx",
    "src/app/(dashboard)/employer/jobs/page.tsx",
    "src/app/(dashboard)/employer/jobs/new/page.tsx",
    "src/app/(dashboard)/employer/jobs/[jobId]/page.tsx",
    "src/app/(dashboard)/employer/jobs/[jobId]/edit/page.tsx",
    "src/app/(dashboard)/employer/company/page.tsx",
    "src/app/(dashboard)/seeker/page.tsx",
    "src/app/(dashboard)/seeker/applications/page.tsx",
    "src/app/(dashboard)/seeker/profile/page.tsx",
    "src/app/jobs/page.tsx", "src/app/jobs/loading.tsx",
    "src/app/jobs/[jobId]/page.tsx",
    "src/app/jobs/category/[categorySlug]/page.tsx",
    "src/app/api/auth/[...supabase]/route.ts",
    "src/app/api/s3/presigned-url/route.ts",
    "src/app/api/payment/start/route.ts",
    "src/app/api/payment/notify/route.ts",
    "src/app/api/cron/verify-jobs/route.ts",
    "src/app/api/cron/expire-jobs/route.ts",
    "src/app/verify-job/[token]/page.tsx",
    "src/components/ui/Button.tsx", "src/components/ui/Input.tsx",
    "src/components/ui/Select.tsx", "src/components/ui/Badge.tsx",
    "src/components/ui/Card.tsx",
    "src/components/layout/Navbar.tsx", "src/components/layout/Footer.tsx",
    "src/components/layout/Sidebar.tsx",
    "src/components/jobs/JobCard.tsx", "src/components/jobs/JobFilters.tsx",
    "src/components/jobs/JobList.tsx", "src/components/jobs/JobDetail.tsx",
    "src/components/applications/ApplicationCard.tsx",
    "src/components/applications/ApplyButton.tsx",
    "src/components/employer/JobForm.tsx",
    "src/components/employer/VerificationToggle.tsx",
    "src/components/seeker/ResumeUpload.tsx",
    "src/components/payment/PayHereButton.tsx",
    "src/lib/supabase/client.ts", "src/lib/supabase/server.ts",
    "src/lib/supabase/admin.ts", "src/lib/supabase/middleware.ts",
    "src/lib/s3/client.ts", "src/lib/s3/presigned.ts",
    "src/lib/payhere/hash.ts", "src/lib/payhere/verify.ts",
    "src/lib/email/send.ts", "src/lib/cron/job-lifecycle.ts",
    "src/lib/utils/format.ts", "src/lib/utils/constants.ts",
    "src/lib/validators/job.ts",
    "src/types/database.types.ts", "src/types/job.ts",
    "src/types/user.ts", "src/types/payment.ts",
    "src/hooks/useUser.ts", "src/hooks/useJobs.ts",
    "src/middleware.ts", "scripts/generate-db-types.ts",
    "supabase/config.toml", "supabase/seed.sql",
    "public/logo.svg", "public/images/placeholder-logo.png"
)

# ---------- 3. Files that MUST have content ----------
function Lines { param([string[]]$L) return ($L -join "`n") }

$stubbedFiles = @{

".gitignore" = Lines @(
    'node_modules/'
    '.next/'
    'out/'
    '.env'
    '.env.local'
    '.DS_Store'
    '*.log'
    '.vercel'
)

"package.json" = Lines @(
    '{'
    '  "name": "next-gen-job-marketplace",'
    '  "version": "0.1.0",'
    '  "private": true,'
    '  "scripts": {'
    '    "dev": "next dev",'
    '    "build": "next build",'
    '    "start": "next start",'
    '    "lint": "next lint"'
    '  },'
    '  "dependencies": {'
    '    "@supabase/ssr": "^0.5.2",'
    '    "@supabase/supabase-js": "^2.45.4",'
    '    "next": "14.2.15",'
    '    "react": "^18.3.1",'
    '    "react-dom": "^18.3.1"'
    '  },'
    '  "devDependencies": {'
    '    "@types/node": "^20.16.10",'
    '    "@types/react": "^18.3.11",'
    '    "@types/react-dom": "^18.3.0",'
    '    "autoprefixer": "^10.4.20",'
    '    "eslint": "^8.57.1",'
    '    "eslint-config-next": "14.2.15",'
    '    "postcss": "^8.4.47",'
    '    "tailwindcss": "^3.4.13",'
    '    "typescript": "^5.6.2"'
    '  }'
    '}'
)

"tsconfig.json" = Lines @(
    '{'
    '  "compilerOptions": {'
    '    "target": "ES2022",'
    '    "lib": ["dom", "dom.iterable", "esnext"],'
    '    "allowJs": true,'
    '    "skipLibCheck": true,'
    '    "strict": true,'
    '    "noEmit": true,'
    '    "esModuleInterop": true,'
    '    "module": "esnext",'
    '    "moduleResolution": "bundler",'
    '    "resolveJsonModule": true,'
    '    "isolatedModules": true,'
    '    "jsx": "preserve",'
    '    "incremental": true,'
    '    "plugins": [{ "name": "next" }],'
    '    "paths": { "@/*": ["./src/*"] }'
    '  },'
    '  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],'
    '  "exclude": ["node_modules"]'
    '}'
)

".eslintrc.json" = Lines @(
    '{'
    '  "extends": "next/core-web-vitals"'
    '}'
)

"next.config.js" = Lines @(
    '/** @type {import("next").NextConfig} */'
    'const nextConfig = {'
    '  images: {'
    '    remotePatterns: ['
    '      { protocol: "https", hostname: "*.supabase.co" },'
    '      { protocol: "https", hostname: "*.cloudfront.net" }'
    '    ]'
    '  }'
    '};'
    'module.exports = nextConfig;'
)

"postcss.config.js" = Lines @(
    'module.exports = {'
    '  plugins: {'
    '    tailwindcss: {},'
    '    autoprefixer: {}'
    '  }'
    '};'
)

"tailwind.config.ts" = Lines @(
    'import type { Config } from "tailwindcss";'
    ''
    'const config: Config = {'
    '  content: ['
    '    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",'
    '    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",'
    '    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}"'
    '  ],'
    '  theme: { extend: {} },'
    '  plugins: []'
    '};'
    'export default config;'
)

"src/app/globals.css" = Lines @(
    '@tailwind base;'
    '@tailwind components;'
    '@tailwind utilities;'
)

"src/app/layout.tsx" = Lines @(
    'import type { Metadata } from "next";'
    'import "./globals.css";'
    ''
    'export const metadata: Metadata = {'
    '  title: "Next-Gen Job Marketplace",'
    '  description: "Automated job marketplace platform",'
    '};'
    ''
    'export default function RootLayout({ children }: { children: React.ReactNode }) {'
    '  return ('
    '    <html lang="en">'
    '      <body>{children}</body>'
    '    </html>'
    '  );'
    '}'
)

"src/app/page.tsx" = Lines @(
    'export default function HomePage() {'
    '  return ('
    '    <main className="flex min-h-screen flex-col items-center justify-center p-8">'
    '      <h1 className="text-4xl font-bold">Next-Gen Job Marketplace</h1>'
    '      <p className="mt-2 text-gray-600">Scaffolding ready.</p>'
    '    </main>'
    '  );'
    '}'
)

"vercel.json" = Lines @(
    '{'
    '  "crons": ['
    '    { "path": "/api/cron/verify-jobs", "schedule": "0 9 * * 1" },'
    '    { "path": "/api/cron/expire-jobs", "schedule": "0 */6 * * *" }'
    '  ]'
    '}'
)

".env.local.example" = Lines @(
    '# ---- Supabase ----'
    'NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co'
    'NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key'
    'SUPABASE_SERVICE_ROLE_KEY=your-service-role-key'
    ''
    '# ---- AWS S3 ----'
    'AWS_REGION=ap-south-1'
    'AWS_ACCESS_KEY_ID=your-key'
    'AWS_SECRET_ACCESS_KEY=your-secret'
    'S3_PRIVATE_BUCKET=job-marketplace-resumes'
    'S3_PUBLIC_BUCKET=job-marketplace-assets'
    'CLOUDFRONT_PUBLIC_DOMAIN=https://cdn.yourdomain.com'
    ''
    '# ---- PayHere ----'
    'PAYHERE_MERCHANT_ID=1210000'
    'PAYHERE_MERCHANT_SECRET=your-merchant-secret'
    'PAYHERE_MODE=sandbox'
    ''
    '# ---- Email ----'
    'RESEND_API_KEY=your-resend-key'
    'EMAIL_FROM=noreply@yourdomain.com'
    ''
    '# ---- App ----'
    'NEXT_PUBLIC_APP_URL=http://localhost:3000'
    'CRON_SECRET=generate-a-long-random-string'
)

"supabase/migrations/20250101000000_init.sql" = Lines @(
    '-- See the "Supabase migration" block in the earlier chat for the full schema + RLS.'
    '-- Minimal placeholder so Supabase tooling does not choke:'
    'create extension if not exists "uuid-ossp";'
)

"README.md" = Lines @(
    '# Next-Gen Job Marketplace'
    ''
    'Automated dual-sided job marketplace — Next.js + Supabase + AWS S3 + PayHere.'
    ''
    '## Setup'
    ''
    '1. `npm install`'
    '2. `copy .env.local.example .env.local` and fill in keys'
    '3. `npm run dev`'
)

}

# ---------- 4. Materialize ----------
foreach ($d in $dirs) {
    [System.IO.Directory]::CreateDirectory((Join-Path $Project $d)) | Out-Null
}
foreach ($f in $emptyFiles) {
    $full = Join-Path $Project $f
    [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($full)) | Out-Null
    if (-not [System.IO.File]::Exists($full)) { [System.IO.File]::WriteAllText($full, "") }
}
foreach ($k in $stubbedFiles.Keys) {
    $full = Join-Path $Project $k
    [System.IO.Directory]::CreateDirectory([System.IO.Path]::GetDirectoryName($full)) | Out-Null
    [System.IO.File]::WriteAllText($full, $stubbedFiles[$k])
}
foreach ($d in $dirs) {
    $full = Join-Path $Project $d
    if ((Get-ChildItem -LiteralPath $full -Force).Count -eq 0) {
        [System.IO.File]::WriteAllText((Join-Path $full ".gitkeep"), "")
    }
}

Write-Host "✅ Tree created at ./$Project" -ForegroundColor Green
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  cd $Project"
Write-Host "  npm install"
Write-Host "  npm run dev"
Write-Host ""
Write-Host "⚠  Do NOT put this project inside OneDrive/Documents — move it to C:\dev\ first." -ForegroundColor DarkYellow