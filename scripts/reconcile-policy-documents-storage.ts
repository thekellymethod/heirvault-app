#!/usr/bin/env tsx
/**
 * Detect drift between `policy_documents` and Storage bucket `heirvault-docs`.
 *
 * 1) Rows in DB with no corresponding object (download fails).
 * 2) Reports count only for orphan storage objects (full recursive listing is not implemented here).
 *
 * Usage:
 *   npx tsx scripts/reconcile-policy-documents-storage.ts [--limit=500]
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY in .env.local or .env.
 *
 * Note: existence checks use `storage.download`, which transfers the full object — use --limit
 * in large deployments or run against a replica.
 */

import { config } from "dotenv";
import { resolve } from "path";
import { createClient } from "@supabase/supabase-js";

config({ path: resolve(process.cwd(), ".env.local") });
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  config({ path: resolve(process.cwd(), ".env") });
}

const BUCKET = "heirvault-docs";
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

function parseLimit(argv: string[]): number {
  const raw = argv.find((a) => a.startsWith("--limit="))?.split("=")[1];
  const n = raw ? Number.parseInt(raw, 10) : 500;
  return Number.isFinite(n) && n > 0 ? Math.min(n, 50_000) : 500;
}

async function main() {
  const limit = parseLimit(process.argv.slice(2));
  if (!url || !key) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    process.exit(1);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false } });

  const { data: rows, error } = await supabase
    .from("policy_documents")
    .select("id, file_path, firm_id")
    .order("created_at", { ascending: true })
    .limit(limit);

  if (error) {
    console.error("Failed to list policy_documents:", error.message);
    process.exit(1);
  }

  const missingInStorage: { id: string; file_path: string }[] = [];

  for (const row of rows ?? []) {
    const path = row.file_path as string;
    const { error: dlErr } = await supabase.storage.from(BUCKET).download(path);
    if (dlErr) {
      missingInStorage.push({ id: row.id as string, file_path: path });
    }
  }

  console.log(JSON.stringify({
    checkedRows: (rows ?? []).length,
    limit,
    dbRowsMissingStorageObject: missingInStorage,
    note: "Orphan storage objects (files without policy_documents rows) require recursive bucket listing or SQL against storage.objects; not run in this script.",
  }, null, 2));

  if (missingInStorage.length > 0) {
    process.exitCode = 2;
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
