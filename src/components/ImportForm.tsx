"use client";
import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { importTrades, type ImportState } from "@/app/app/import/actions";
import { guessMapping, previewImport, IMPORT_FIELDS, REQUIRED_FIELDS, MAX_IMPORT_BYTES, type ColumnMapping, type ImportField } from "@/lib/csv-import";
import { ASSET_CLASSES } from "@/lib/trade-schema";
import { Card, Field, Notice, inputCls, btnCls, btnGhostCls } from "./ui";

const LABEL: Record<ImportField, string> = {
  symbol: "Instrument", side: "Direction (buy/sell)", quantity: "Size", entryPrice: "Entry price", exitPrice: "Exit price",
  openedAt: "Open time", closedAt: "Close time", fees: "Fees / commission",
};
const ASSET_LABEL: Record<string, string> = { forex: "Forex (size in lots)", future: "Futures (contracts)", stock: "Stocks (shares)", option: "Options", crypto: "Crypto", other: "Other" };

/** Upload → map columns → preview → import. The preview runs in the browser for speed; the server re-parses the file before saving. */
export function ImportForm({ accounts, defaultAsset, room }: { accounts: { id: string; name: string; currency: string }[]; defaultAsset: string; room: number | null }) {
  const [state, action, pending] = useActionState<ImportState, FormData>(importTrades, {});
  const [csv, setCsv] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});

  async function onFile(f: File | undefined) {
    setFileError(""); setCsv(""); setHeaders([]); setMapping({});
    if (!f) return;
    if (f.size > MAX_IMPORT_BYTES) { setFileError("That file is larger than 5 MB. Split it into smaller files."); return; }
    const text = await f.text();
    const hs = previewImport(text, {}).headers;
    if (!hs.length) { setFileError("We couldn't find a header row in that file."); return; }
    setCsv(text); setFileName(f.name); setHeaders(hs); setMapping(guessMapping(hs));
  }
  const preview = useMemo(() => (csv ? previewImport(csv, mapping) : null), [csv, mapping]);
  const overRoom = preview && room !== null && preview.valid.length > room;

  return (
    <form action={action} className="space-y-4">
      {state.message && (
        <Notice kind={state.code ? "warn" : "error"}>
          <p>{state.message}</p>
          {state.code && <Link href="/app/billing" className={`${btnGhostCls} mt-3`}>See plans</Link>}
        </Notice>
      )}

      <Card className="space-y-4">
        <h2 className="font-medium">1. Choose your file</h2>
        <p className="text-sm text-muted">A CSV export from your broker or spreadsheet. One row per closed trade (entry and exit on the same row). Up to 5 MB.</p>
        <input type="file" accept=".csv,text/csv" aria-label="CSV file" onChange={(e) => onFile(e.target.files?.[0])}
          className="block w-full text-sm file:mr-3 file:min-h-10 file:rounded-md file:border file:border-border file:bg-raised file:px-4 file:text-sm file:text-fg" />
        {fileError && <Notice kind="error">{fileError}</Notice>}
      </Card>

      {headers.length > 0 && (
        <Card className="space-y-4">
          <h2 className="font-medium">2. Match your columns</h2>
          <p className="text-sm text-muted">We guessed from the column names. Fields marked * are required.</p>
          <div className="grid gap-4 sm:grid-cols-2">
            {IMPORT_FIELDS.map((f) => (
              <Field key={f} label={`${LABEL[f]}${REQUIRED_FIELDS.includes(f) ? " *" : ""}`}>
                <select value={mapping[f] ?? ""} onChange={(e) => setMapping((m) => ({ ...m, [f]: e.target.value || undefined }))} className={inputCls}>
                  <option value="">— not in file —</option>
                  {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                </select>
              </Field>
            ))}
            <Field label="Market" hint="Applies to every trade in this file.">
              <select name="asset_class" defaultValue={defaultAsset} className={inputCls}>{ASSET_CLASSES.map((a) => <option key={a} value={a}>{ASSET_LABEL[a] ?? a}</option>)}</select>
            </Field>
            {accounts.length > 1
              ? <Field label="Account"><select name="account_id" className={inputCls}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}</select></Field>
              : <input type="hidden" name="account_id" value={accounts[0]?.id} />}
          </div>
          <p className="text-xs text-muted">Times without a time zone are read as UTC. Trades with no close time use the open time.</p>
        </Card>
      )}

      {preview && (
        <Card className="space-y-3">
          <h2 className="font-medium">3. Check and import</h2>
          <dl aria-live="polite" className="grid grid-cols-3 gap-3 rounded-md bg-raised px-3.5 py-3 text-sm">
            <div><dt className="text-xs text-muted">Ready to import</dt><dd className="fig mt-0.5 text-win">{preview.valid.length.toLocaleString("en-US")}</dd></div>
            <div><dt className="text-xs text-muted">Rows with problems</dt><dd className={`fig mt-0.5 ${preview.errors.length ? "text-warn" : ""}`}>{preview.errors.length}</dd></div>
            <div><dt className="text-xs text-muted">Duplicates in file</dt><dd className="fig mt-0.5">{preview.duplicatesInFile}</dd></div>
          </dl>
          {preview.errors.length > 0 && (
            <details className="text-sm" open={preview.valid.length === 0}>
              <summary className="cursor-pointer text-muted">Show problems ({preview.errors.length}) — these rows will be skipped</summary>
              <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-xs">{preview.errors.slice(0, 100).map((e) => <li key={e.row}>{e.row ? `Row ${e.row}: ` : ""}{e.message}</li>)}</ul>
            </details>
          )}
          {preview.valid.length > 0 && (
            <div className="overflow-x-auto"><table className="w-full text-left text-xs">
              <thead className="text-muted"><tr><th className="py-1 pr-3">Instrument</th><th className="pr-3">Side</th><th className="pr-3">Size</th><th className="pr-3">Entry</th><th className="pr-3">Exit</th><th>Opened</th></tr></thead>
              <tbody className="fig">{preview.valid.slice(0, 5).map((t) => <tr key={t.fingerprint} className="border-t border-border"><td className="py-1 pr-3">{t.symbol}</td><td className="pr-3">{t.side}</td><td className="pr-3">{t.quantity}</td><td className="pr-3">{t.entryPrice}</td><td className="pr-3">{t.exitPrice}</td><td>{t.openedAt.slice(0, 16).replace("T", " ")}</td></tr>)}</tbody>
            </table>{preview.valid.length > 5 && <p className="mt-1 text-xs text-muted">…and {preview.valid.length - 5} more.</p>}</div>
          )}
          {overRoom && <Notice kind="warn">This file has {preview.valid.length.toLocaleString("en-US")} trades but your plan has room for {room!.toLocaleString("en-US")} more. <Link href="/app/billing" className="underline">See plans</Link></Notice>}
          <p className="text-xs text-muted">Trades already in this account (same instrument, side, size, prices and times) are skipped automatically. You can roll back the whole import afterwards.</p>
          <input type="hidden" name="csv" value={csv} />
          <input type="hidden" name="file_name" value={fileName} />
          <input type="hidden" name="mapping" value={JSON.stringify(mapping)} />
          <button disabled={pending || preview.valid.length === 0} className={btnCls}>{pending ? "Importing…" : `Import ${preview.valid.length.toLocaleString("en-US")} trade${preview.valid.length === 1 ? "" : "s"}`}</button>
        </Card>
      )}
    </form>
  );
}
