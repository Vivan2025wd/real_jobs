#!/usr/bin/env tsx
// scripts/generate-db-types.ts
//
// Regenerates src/types/database.types.ts from the linked Supabase project.
//
// Run:
//   npx tsx scripts/generate-db-types.ts
//
// Or add to package.json:
//   "db:types": "tsx scripts/generate-db-types.ts"
//   "db:push":  "supabase db push && tsx scripts/generate-db-types.ts"
//
// Resolution order for the project ref:
//   1. SUPABASE_PROJECT_ID  (from .env.local or shell)
//   2. SUPABASE_PROJECT_REF (from .env.local or shell)
//   3. First CLI arg        (`npx tsx scripts/generate-db-types.ts qujv…`)
//
// On success: overwrites src/types/database.types.ts atomically and logs a
// summary of the tables it found. On failure: prints the CLI's stderr and
// exits with the same code so `&&` chains stop correctly.

import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, "..");
const OUTPUT_FILE = path.join(PROJECT_ROOT, "src", "types", "database.types.ts");
const ENV_FILE = path.join(PROJECT_ROOT, ".env.local");

// ---------------------------------------------------------------------------
// Minimal .env.local reader — avoids a dotenv dependency just for this script
// ---------------------------------------------------------------------------
async function loadEnvLocal(): Promise<void> {
  let raw: string;
  try {
    raw = await fs.readFile(ENV_FILE, "utf8");
  } catch {
    return; // .env.local is optional
  }

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;

    const key = trimmed.slice(0, eq).trim();
    let value = trimmed.slice(eq + 1).trim();

    // Strip surrounding quotes
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    // Don't overwrite values already set in the shell
    if (!process.env[key]) process.env[key] = value;
  }
}

// ---------------------------------------------------------------------------
// Project-ref resolution
// ---------------------------------------------------------------------------
function resolveProjectRef(): string {
  const fromEnv =
    process.env.SUPABASE_PROJECT_ID ?? process.env.SUPABASE_PROJECT_REF;
  const fromArg = process.argv[2];
  const ref = (fromEnv ?? fromArg ?? "").trim();

  if (!ref) {
    console.error(
      "\n❌ No Supabase project ref found.\n\n" +
        "   Provide one of:\n" +
        "     • SUPABASE_PROJECT_ID  in .env.local\n" +
        "     • SUPABASE_PROJECT_REF in .env.local\n" +
        "     • First CLI argument:  npx tsx scripts/generate-db-types.ts <project-ref>\n\n" +
        "   Your project ref is the subdomain in:\n" +
        "     https://supabase.com/dashboard/project/<project-ref>\n"
    );
    process.exit(1);
  }

  return ref;
}

// ---------------------------------------------------------------------------
// CLI invocation
// ---------------------------------------------------------------------------
function runSupabaseGenTypes(projectRef: string): Promise<string> {
  return new Promise((resolve, reject) => {
    // On Windows the CLI is `npx.cmd`; spawning `npx` directly fails.
    const isWin = process.platform === "win32";
    const command = isWin ? "npx.cmd" : "npx";

    const args = [
      "supabase",
      "gen",
      "types",
      "typescript",
      "--project-id",
      projectRef,
    ];

    const child = spawn(command, args, {
      cwd: PROJECT_ROOT,
      shell: true, // needed on Windows for `npx.cmd`
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString("utf8");
    });

    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString("utf8");
    });

    child.on("error", (err) => {
      reject(
        new Error(
          `Failed to spawn \`npx supabase\`: ${err.message}\n` +
            "Is the Supabase CLI installed?  →  npm install -g supabase\n"
        )
      );
    });

    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `supabase gen types exited with code ${code}\n\n${stderr.trim()}`
          )
        );
        return;
      }
      resolve(stdout);
    });
  });
}

// ---------------------------------------------------------------------------
// Output inspection — sanity-check before writing
// ---------------------------------------------------------------------------
function extractTableNames(typesFile: string): string[] {
  // The generated Supabase file declares every table (and view) as:
  //
  //     applications: {
  //       Row: {
  //         ...
  //
  // This pattern matches `<name>: { … Row: {` regardless of indentation,
  // newline style (LF / CRLF), or extra whitespace between tokens.
  // It won't pick up `Functions` entries — those use `Args:`, not `Row:`.
  const names = new Set<string>();
  const pattern = /(\w+):\s*\{\s*Row:\s*\{/g;
  for (const match of typesFile.matchAll(pattern)) {
    names.add(match[1]);
  }
  return Array.from(names).sort();
}
// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  await loadEnvLocal();
  const projectRef = resolveProjectRef();

  console.log(`\n🔄 Generating types for Supabase project \`${projectRef}\`…`);

  let output: string;
  try {
    output = await runSupabaseGenTypes(projectRef);
  } catch (err) {
    console.error(`\n❌ ${(err as Error).message}\n`);
    process.exit(1);
  }

  if (!output.trim()) {
    console.error(
      "\n❌ Supabase CLI returned an empty string.\n" +
        "   Is the project linked?  →  npx supabase link --project-ref <ref>\n"
    );
    process.exit(1);
  }

  if (!output.includes("export type Database")) {
    console.error(
      "\n❌ Output doesn't look like a Supabase types file — refusing to overwrite.\n" +
        `   First 200 chars: ${output.slice(0, 200)}\n`
    );
    process.exit(1);
  }

  // Atomic write: temp file + rename, so a crash mid-write can't corrupt the
  // existing types file.
  const tmpFile = `${OUTPUT_FILE}.tmp`;
  await fs.mkdir(path.dirname(OUTPUT_FILE), { recursive: true });
  await fs.writeFile(tmpFile, output, "utf8");
  await fs.rename(tmpFile, OUTPUT_FILE);

  const tables = extractTableNames(output);
  const bytes = Buffer.byteLength(output, "utf8");

  console.log(
    `\n✅ Wrote ${path.relative(PROJECT_ROOT, OUTPUT_FILE)} ` +
      `(${bytes.toLocaleString()} bytes)`
  );
  if (tables.length) {
    console.log(`   Tables: ${tables.join(", ")}`);
  } else {
    console.log("   ⚠️  No tables detected — the schema may be empty.");
  }
  console.log("");
}

main().catch((err) => {
  console.error("\n❌ Unexpected failure:", err);
  process.exit(1);
});