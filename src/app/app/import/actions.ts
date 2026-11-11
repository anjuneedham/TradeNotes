"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContext } from "@/lib/app-context";
import { previewImport, IMPORT_FIELDS, MAX_IMPORT_BYTES, type ColumnMapping } from "@/lib/csv-import";
import { ASSET_CLASSES, defaultMultiplier } from "@/lib/trade-schema";
import { PLANS } from "@/lib/plans";

export interface ImportState { message?: string; code?: "plan" | "limit" }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Import a CSV of closed round-trip trades. The file is RE-PARSED here; nothing from the browser preview is trusted.
 * Gates (server-side): plan must include CSV import; imported trades count toward the plan's trade limit.
 * One transaction: import record, trades (duplicates within the same account skipped via the (account_id, fingerprint)
 * unique key), one exit per trade, final counts. Row-level security + ownership triggers apply throughout.
 */
export async function importTrades(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const { db, user, accounts, plan } = await getContext();
  if (!PLANS[plan].csvImport) return { message: `CSV import is included in ${PLANS.starter.name} and ${PLANS.pro.name}.`, code: "plan" };
  const csv = String(formData.get("csv") ?? "");
  const fileName = String(formData.get("file_name") ?? "").slice(0, 200) || null;
  if (!csv.trim()) return { message: "Choose a CSV file first." };
  if (Buffer.byteLength(csv, "utf8") > MAX_IMPORT_BYTES) return { message: "That file is larger than 5 MB. Split it into smaller files." };
  const accountId = String(formData.get("account_id") ?? "");
  if (!UUID.test(accountId) || !accounts.some((a) => a.id === accountId)) return { message: "Account not found." };
  const asset = String(formData.get("asset_class") ?? "");
  if (!(ASSET_CLASSES as readonly string[]).includes(asset)) return { message: "Choose the market these trades are in." };
  let mapping: ColumnMapping = {};
  try {
    const raw = JSON.parse(String(formData.get("mapping") ?? "{}")) as Record<string, unknown>;
    for (const f of IMPORT_FIELDS) if (typeof raw[f] === "string" && raw[f]) mapping[f] = raw[f] as string;
  } catch { mapping = {}; }

  const preview = previewImport(csv, mapping);
  if (preview.valid.length === 0) return { message: preview.errors[0]?.message ?? "No valid trades found in the file." };
  const multiplier = defaultMultiplier(asset);
  const limit = PLANS[plan].tradeLimit;

  let importId = "";
  try {
    const out = await db(async (q) => {
      const [{ n }] = await q<{ n: number }>("select count(*)::int as n from tradenotes.trades");
      if (limit !== null && n + preview.valid.length > limit) return { limit: true as const, room: Math.max(0, limit - n) };
      const [imp] = await q<{ id: string }>(
        "insert into tradenotes.imports (user_id, account_id, file_name, rows_total, rows_failed) values ($1, $2, $3, $4, $5) returning id",
        [user.id, accountId, fileName, preview.valid.length + preview.errors.length + preview.duplicatesInFile, preview.errors.length]);
      let imported = 0, skipped = preview.duplicatesInFile;
      for (const t of preview.valid) {
        const closedAt = t.closedAt ?? t.openedAt;
        const rows = await q<{ id: string }>(
          `insert into tradenotes.trades (user_id, account_id, import_id, symbol, asset_class, side, quantity, entry_price, multiplier, fees, opened_at, closed_at, fingerprint)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) on conflict (account_id, fingerprint) do nothing returning id`,
          [user.id, accountId, imp.id, t.symbol.replace(/[\s/]/g, "").slice(0, 24), asset, t.side, t.quantity, t.entryPrice, multiplier, t.fees, t.openedAt, closedAt, t.fingerprint]);
        if (!rows.length) { skipped++; continue; }
        await q("insert into tradenotes.trade_exits (trade_id, user_id, quantity, price, exited_at) values ($1, $2, $3, $4, $5)", [rows[0].id, user.id, t.quantity, t.exitPrice, closedAt]);
        imported++;
      }
      await q("update tradenotes.imports set rows_imported = $2, rows_skipped_duplicate = $3 where id = $1", [imp.id, imported, skipped]);
      return { limit: false as const, id: imp.id };
    });
    if (out.limit) return { message: `This file has ${preview.valid.length.toLocaleString("en-US")} trades but your ${PLANS[plan].name} plan has room for ${out.room.toLocaleString("en-US")} more. Nothing was imported.`, code: "limit" };
    importId = out.id;
  } catch (e) {
    console.error("import failed", e instanceof Error ? e.message : e);
    return { message: "The import failed and nothing was saved. Please try again." };
  }
  revalidatePath("/app", "layout");
  redirect(`/app/import?done=${importId}`);
}

/** Roll back an import: deleting the import record cascades to its trades (and their exits). RLS limits it to your own imports. */
export async function rollbackImport(formData: FormData) {
  const { db } = await getContext();
  const id = String(formData.get("id") ?? "");
  if (UUID.test(id)) await db((q) => q("delete from tradenotes.imports where id = $1", [id]));
  revalidatePath("/app", "layout");
  redirect("/app/import?rolledback=1");
}
