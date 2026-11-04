import { readFile } from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const tsPath = path.join(root, "src", "lib", "utils", "constants.ts");
const sqlPaths = [
  path.join(root, "supabase", "migrations", "99999999999999_master_schema.sql"),
  path.join(root, "supabase", "migrations", "100000000000000_schema_hardening.sql"),
];

function assertPriceMapsMatch(
  expected: Map<number, number>,
  actual: Map<number, number>,
  source: string
) {
  const expectedEntries = [...expected].sort(([a], [b]) => a - b);
  const actualEntries = [...actual].sort(([a], [b]) => a - b);
  if (JSON.stringify(expectedEntries) !== JSON.stringify(actualEntries)) {
    throw new Error(
      `${source} prices disagree with JOB_POSTING_PRICES: ${JSON.stringify(actualEntries)}`
    );
  }
}

async function main() {
  const ts = await readFile(tsPath, "utf8");
  const constantsBlock = ts.match(
    /JOB_POSTING_PRICES[\s\S]*?=\s*\{([\s\S]*?)\};/
  )?.[1];
  if (!constantsBlock) {
    throw new Error("Could not locate JOB_POSTING_PRICES in constants.ts.");
  }

  const tsPrices = new Map<number, number>();
  for (const [, duration, price] of constantsBlock.matchAll(
    /(\d+)\s*:\s*(\d+)/g
  )) {
    tsPrices.set(Number(duration), Number(price));
  }
  if (tsPrices.size !== 3) {
    throw new Error(`Expected three TS duration prices, found ${tsPrices.size}.`);
  }

  for (const sqlPath of sqlPaths) {
    const sql = await readFile(sqlPath, "utf8");
    const functionSql = sql.match(
      /CREATE OR REPLACE FUNCTION public\.job_price_lkr\s*\([\s\S]*?\$\$([\s\S]*?)\$\$;/
    )?.[1];
    if (!functionSql) {
      throw new Error(`Could not locate job_price_lkr in ${sqlPath}.`);
    }

    const sqlPrices = new Map<number, number>();
    for (const [, duration, price] of functionSql.matchAll(
      /WHEN\s+(\d+)\s+THEN\s+(\d+)/gi
    )) {
      sqlPrices.set(Number(duration), Number(price));
    }
    if (sqlPrices.size !== 3) {
      throw new Error(
        `Expected three SQL duration prices in ${sqlPath}, found ${sqlPrices.size}.`
      );
    }
    assertPriceMapsMatch(tsPrices, sqlPrices, path.relative(root, sqlPath));
  }

  console.log("TS job prices match job_price_lkr in the master schema and migration.");
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
