"use server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getContext } from "@/lib/app-context";
import { IMPORT_FIELDS, MAX_IMPORT_BYTES, type ColumnMapping } from "@/lib/csv-import";
import { parseWithPreset, parseManual, presetById, type AssetClass, type ParseResult } from "@/lib/broker-import";
import { isValidTimeZone } from "@/lib/timezone";
import { ASSET_CLASSES } from "@/lib/trade-schema";
import { PLANS } from "@/lib/plans";
import { getStore } from "@/lib/storage";
import { removeObjects } from "@/lib/storage/cleanup";

export interface ImportState { message?: string; code?: "plan" | "limit" }
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Import trades from a broker export (preset, auto-detected or chosen) or a generic CSV (manual column mapping).
 * The file is RE-PARSED here with the same pure code as the browser preview; nothing from the preview is trusted.
 * Gates (server-side): plan must include import; imported trades count toward the plan's trade limit.
 * One transaction: import record, trades (duplicates within the account skipped via the (account_id, fingerprint) key),
 * their exits, final counts. Row-level security + ownership triggers apply throughout.
 */
export async function importTrades(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const { db, user, accounts, plan, tz: profileTz } = await getContext();
  if (!PLANS[plan].csvImport) return { message: `Importing is included in ${PLANS.starter.name} and ${PLANS.pro.name}.`, code: "plan" };
  const text = String(formData.get("csv") ?? "");
  const fileName = String(formData.get("file_name") ?? "").slice(0, 200) || null;
  if (!text.trim()) return { message: "Choose a file first." };
  if (Buffer.byteLength(text, "utf8") > MAX_IMPORT_BYTES) return { message: "That file is larger than 5 MB. Split it into smaller files." };
  const accountId = String(formData.get("account_id") ?? "");
  if (!UUID.test(accountId) || !accounts.some((a) => a.id === accountId)) return { message: "Account not found." };
  const tzRaw = String(formData.get("timezone") ?? "");
  const tz = isValidTimeZone(tzRaw) ? tzRaw : profileTz;
  const dateOrder = formData.get("date_order") === "dmy" ? "dmy" : "mdy";
  const presetId = String(formData.get("preset") ?? "manual");
  const asset = String(formData.get("asset_class") ?? "");
  if (!(ASSET_CLASSES as readonly string[]).includes(asset)) return { message: "Choose the market these trades are in." };

  let result: ParseResult, presetUsed: string;
  if (presetId === "manual") {
    let mapping: ColumnMapping = {};
    try {
      const raw = JSON.parse(String(formData.get("mapping") ?? "{}")) as Record<string, unknown>;
      for (const f of IMPORT_FIELDS) if (typeof raw[f] === "string" && raw[f]) mapping[f] = raw[f] as string;
    } catch { mapping = {}; }
    result = parseManual(text, mapping, asset as AssetClass, { tz, dateOrder });
    presetUsed = "manual";
  } else {
    if (presetId !== "auto" && !presetById(presetId)) return { message: "Unknown broker format." };
    const out = parseWithPreset(text, presetId, { tz, dateOrder });
    if (!out.preset) return { message: out.result.errors[0]?.message ?? "We didn't recognise this file." };
    result = out.result; presetUsed = out.preset.id;
  }
  if (result.trades.length === 0) return { message: result.errors[0]?.message ?? "No complete trades found in the file." };
  const limit = PLANS[plan].tradeLimit;

  let importId = "";
  try {
    const out = await db(async (q) => {
      const [{ n }] = await q<{ n: number }>("select count(*)::int as n from tradenotes.trades");
      if (limit !== null && n + result.trades.length > limit) return { limit: true as const, room: Math.max(0, limit - n) };
      const [imp] = await q<{ id: string }>(
        "insert into tradenotes.imports (user_id, account_id, file_name, rows_total, rows_failed, preset) values ($1, $2, $3, $4, $5, $6) returning id",
        [user.id, accountId, fileName, result.trades.length + result.errors.length, result.errors.length, presetUsed]);
      let imported = 0, skipped = 0;
      for (const t of result.trades) {
        const rows = await q<{ id: string }>(
          `insert into tradenotes.trades (user_id, account_id, import_id, symbol, asset_class, side, quantity, entry_price, multiplier, fees, opened_at, closed_at, fingerprint)
           values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) on conflict (account_id, fingerprint) do nothing returning id`,
          [user.id, accountId, imp.id, t.symbol.replace(/[\s/]/g, "").slice(0, 24), t.assetClass ?? asset, t.side, t.quantity, t.entryPrice, t.multiplier ?? 1, Math.round(t.fees * 100) / 100, t.openedAt, t.closedAt, t.fingerprint]);
        if (!rows.length) { skipped++; continue; }
        for (const e of t.exits) await q("insert into tradenotes.trade_exits (trade_id, user_id, quantity, price, exited_at) values ($1, $2, $3, $4, $5)", [rows[0].id, user.id, e.quantity, e.price, e.at]);
        imported++;
      }
      await q("update tradenotes.imports set rows_imported = $2, rows_skipped_duplicate = $3 where id = $1", [imp.id, imported, skipped]);
      return { limit: false as const, id: imp.id };
    });
    if (out.limit) return { message: `This file has ${result.trades.length.toLocaleString("en-US")} trades but your ${PLANS[plan].name} plan has room for ${out.room.toLocaleString("en-US")} more. Nothing was imported.`, code: "limit" };
    importId = out.id;
  } catch (e) {
    console.error("import failed", e instanceof Error ? e.message : e);
    return { message: "The import failed and nothing was saved. Please try again." };
  }
  revalidatePath("/app", "layout");
  redirect(`/app/import?done=${importId}`);
}

/**
 * Roll back an import: deleting the import record cascades to its trades (and their exits and screenshot rows).
 * Screenshot files attached to those trades are then removed from storage so nothing is left orphaned. RLS limits it to own imports.
 */
export async function rollbackImport(formData: FormData) {
  const { db } = await getContext();
  const id = String(formData.get("id") ?? "");
  let paths: string[] = [];
  if (UUID.test(id)) paths = await db(async (q) => {
    const p = getStore() ? (await q<{ storage_path: string }>("select s.storage_path from tradenotes.trade_screenshots s join tradenotes.trades t on t.id = s.trade_id where t.import_id = $1", [id])).map((r) => r.storage_path) : [];
    await q("delete from tradenotes.imports where id = $1", [id]);
    return p;
  });
  await removeObjects(paths);
  revalidatePath("/app", "layout");
  redirect("/app/import?rolledback=1");
}
