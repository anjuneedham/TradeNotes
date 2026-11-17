"use client";
import { useActionState, useMemo, useState } from "react";
import Link from "next/link";
import { importTrades, type ImportState } from "@/app/app/import/actions";
import { guessMapping, previewImport, IMPORT_FIELDS, REQUIRED_FIELDS, MAX_IMPORT_BYTES, type ColumnMapping, type ImportField } from "@/lib/csv-import";
import { detectPreset, parseWithPreset, parseManual, reconcile, PRESET_LIST, looksLikeHtml, type AssetClass, type ParseResult } from "@/lib/broker-import";
import { COMMON_TIMEZONES } from "@/lib/timezone";
import { ASSET_CLASSES } from "@/lib/trade-schema";
import { Card, Field, Notice, inputCls, btnCls, btnGhostCls } from "./ui";

const LABEL: Record<ImportField, string> = {
  symbol: "Instrument", side: "Direction (buy/sell)", quantity: "Size", entryPrice: "Entry price", exitPrice: "Exit price",
  openedAt: "Open time", closedAt: "Close time", fees: "Fees / commission",
};
const ASSET_LABEL: Record<string, string> = { forex: "Forex (size in lots)", future: "Futures (contracts)", stock: "Stocks (shares)", option: "Options", crypto: "Crypto", other: "Other" };
const fmt = (n: number) => n.toLocaleString("en-US", { maximumFractionDigits: 2 });

/**
 * Upload → we recognise the broker (or map columns by hand) → validation report → import.
 * The preview runs in the browser with the same parser the server uses; the server re-parses the file before saving.
 */
export function ImportForm({ accounts, defaultAsset, room, defaultAccount, timezone }: { accounts: { id: string; name: string; currency: string }[]; defaultAsset: string; room: number | null; defaultAccount?: string; timezone: string }) {
  const [state, action, pending] = useActionState<ImportState, FormData>(importTrades, {});
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileError, setFileError] = useState("");
  const [detected, setDetected] = useState<string | null>(null);
  const [preset, setPreset] = useState("manual");
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [tz, setTz] = useState(timezone);
  const [dateOrder, setDateOrder] = useState<"mdy" | "dmy">("mdy");
  const [asset, setAsset] = useState(defaultAsset);
  const zones = useMemo(() => Array.from(new Set([timezone, ...COMMON_TIMEZONES])), [timezone]);

  async function onFile(f: File | undefined) {
    setFileError(""); setText(""); setHeaders([]); setMapping({}); setDetected(null);
    if (!f) return;
    if (f.size > MAX_IMPORT_BYTES) { setFileError("That file is larger than 5 MB. Split it into smaller files."); return; }
    const t = await f.text();
    const p = detectPreset(t);
    const hs = looksLikeHtml(t) ? [] : previewImport(t, {}).headers;
    if (!p && !hs.length) { setFileError("We couldn't find a table in that file. Export it as CSV (or MetaTrader HTML) and try again."); return; }
    setText(t); setFileName(f.name); setDetected(p?.id ?? null); setPreset(p?.id ?? "manual"); setHeaders(hs); setMapping(guessMapping(hs));
  }

  const result: ParseResult | null = useMemo(() => {
    if (!text) return null;
    if (preset === "manual") return parseManual(text, mapping, asset as AssetClass, { tz, dateOrder });
    return parseWithPreset(text, preset, { tz, dateOrder }).result;
  }, [text, preset, mapping, asset, tz, dateOrder]);
  const rec = result ? reconcile(result.trades) : null;
  const presetInfo = PRESET_LIST.find((p) => p.id === preset);
  const overRoom = result && room !== null && result.trades.length > room;
  const detectedName = PRESET_LIST.find((p) => p.id === detected)?.name;

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
        <p className="text-sm text-muted">A broker export (CSV, or MetaTrader HTML report) or any spreadsheet with one row per closed trade. Up to 5 MB. We recognise {PRESET_LIST.map((p) => p.name).join(", ")}.</p>
        <input type="file" accept=".csv,.txt,.htm,.html,text/csv,text/html" aria-label="Trade history file" onChange={(e) => onFile(e.target.files?.[0])}
          className="block w-full text-sm file:mr-3 file:min-h-10 file:rounded-md file:border file:border-border file:bg-raised file:px-4 file:text-sm file:text-fg" />
        {fileError && <Notice kind="error">{fileError}</Notice>}
      </Card>

      {text && (
        <Card className="space-y-4">
          <h2 className="font-medium">2. Format and settings</h2>
          {detectedName ? <Notice kind="ok">We recognised a <strong>{detectedName}</strong> export.</Notice> : <Notice>We didn&apos;t recognise this format, so match the columns below.</Notice>}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Format" hint={presetInfo ? presetInfo.formats : "One row per closed trade; you choose which column is which."}>
              <select name="preset" value={preset} onChange={(e) => setPreset(e.target.value)} className={inputCls}>
                {PRESET_LIST.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                <option value="manual">Other — match columns myself</option>
              </select>
            </Field>
            <Field label="Times in this file are in" hint="Used only when the file's times have no time zone. Everything is stored in UTC.">
              <select name="timezone" value={tz} onChange={(e) => setTz(e.target.value)} className={inputCls}>{zones.map((z) => <option key={z} value={z}>{z}</option>)}</select>
            </Field>
            <Field label="Dates like 03/04/2025 mean" hint="Only matters for dates written with slashes.">
              <select name="date_order" value={dateOrder} onChange={(e) => setDateOrder(e.target.value as "mdy" | "dmy")} className={inputCls}><option value="mdy">Month/Day (US)</option><option value="dmy">Day/Month</option></select>
            </Field>
            <Field label="Market" hint={preset === "manual" ? "Applies to every trade in this file." : "Used only where the file doesn't say."}>
              <select name="asset_class" value={asset} onChange={(e) => setAsset(e.target.value)} className={inputCls}>{ASSET_CLASSES.map((a) => <option key={a} value={a}>{ASSET_LABEL[a] ?? a}</option>)}</select>
            </Field>
            {accounts.length > 1
              ? <Field label="Import into account"><select name="account_id" defaultValue={defaultAccount} className={inputCls}>{accounts.map((a) => <option key={a.id} value={a.id}>{a.name} ({a.currency})</option>)}</select></Field>
              : <input type="hidden" name="account_id" value={accounts[0]?.id} />}
          </div>
          {presetInfo && <p className="text-xs text-muted">How to export: {presetInfo.help}</p>}
          {preset === "manual" && headers.length > 0 && (
            <div className="grid gap-4 border-t border-border pt-4 sm:grid-cols-2">
              {IMPORT_FIELDS.map((f) => (
                <Field key={f} label={`${LABEL[f]}${REQUIRED_FIELDS.includes(f) ? " *" : ""}`}>
                  <select value={mapping[f] ?? ""} onChange={(e) => setMapping((m) => ({ ...m, [f]: e.target.value || undefined }))} className={inputCls}>
                    <option value="">— not in file —</option>
                    {headers.map((h) => <option key={h} value={h}>{h}</option>)}
                  </select>
                </Field>
              ))}
            </div>
          )}
        </Card>
      )}

      {result && rec && (
        <Card className="space-y-3">
          <h2 className="font-medium">3. Check and import</h2>
          <dl aria-live="polite" className="grid grid-cols-2 gap-3 rounded-md bg-raised px-3.5 py-3 text-sm sm:grid-cols-4">
            <div><dt className="text-xs text-muted">Trades ready</dt><dd className="fig mt-0.5 text-win">{result.trades.length.toLocaleString("en-US")}</dd></div>
            <div><dt className="text-xs text-muted">Rows with problems</dt><dd className={`fig mt-0.5 ${result.errors.length ? "text-warn" : ""}`}>{result.errors.length}</dd></div>
            <div><dt className="text-xs text-muted">Still-open positions</dt><dd className="fig mt-0.5">{result.openPositions}</dd></div>
            <div><dt className="text-xs text-muted">Net P&amp;L in file</dt><dd className={`fig mt-0.5 ${rec.netOurs < 0 ? "text-loss" : "text-win"}`}>{fmt(rec.netOurs)}</dd></div>
          </dl>
          {rec.withBroker > 0 && (
            <Notice kind={rec.mismatches ? "warn" : "ok"}>
              {rec.mismatches
                ? `${rec.mismatches} of ${rec.withBroker} trades differ from the broker's own profit by more than 1 cent. Check them after importing.`
                : `Matches the broker's own figures: ${rec.withBroker} trade${rec.withBroker === 1 ? "" : "s"}, net ${fmt(rec.netBroker ?? 0)} on both.`}
            </Notice>
          )}
          {result.openPositions > 0 && <p className="text-sm text-muted">{result.openPositions} position{result.openPositions === 1 ? " is" : "s are"} still open at the end of the file and won&apos;t be imported. Import again once {result.openPositions === 1 ? "it closes" : "they close"}.</p>}
          {result.ignoredRows > 0 && <p className="text-sm text-muted">{result.ignoredRows} row{result.ignoredRows === 1 ? "" : "s"} that aren&apos;t trades (deposits, cancelled orders, summaries) were ignored.</p>}
          {result.warnings.map((w) => <p key={w} className="text-sm text-warn">{w}</p>)}
          {result.errors.length > 0 && (
            <details className="text-sm" open={result.trades.length === 0}>
              <summary className="cursor-pointer text-muted">Show problems ({result.errors.length}) — these rows will be skipped</summary>
              <ul className="mt-2 max-h-48 space-y-1 overflow-auto text-xs">{result.errors.slice(0, 100).map((e, i) => <li key={i}>{e.row ? `Row ${e.row}: ` : ""}{e.message}</li>)}</ul>
            </details>
          )}
          {result.trades.length > 0 && (
            <div className="overflow-x-auto"><table className="w-full text-left text-xs">
              <thead className="text-muted"><tr><th className="py-1 pr-3">Instrument</th><th className="pr-3">Side</th><th className="pr-3">Size</th><th className="pr-3">Entry</th><th className="pr-3">Exits</th><th className="pr-3">Opened (UTC)</th></tr></thead>
              <tbody className="fig">{result.trades.slice(0, 5).map((t) => <tr key={t.fingerprint} className="border-t border-border"><td className="py-1 pr-3">{t.symbol}</td><td className="pr-3">{t.side}</td><td className="pr-3">{t.quantity}</td><td className="pr-3">{t.entryPrice}</td><td className="pr-3">{t.exits.map((e) => e.price).join(", ")}</td><td className="pr-3">{t.openedAt.slice(0, 16).replace("T", " ")}</td></tr>)}</tbody>
            </table>{result.trades.length > 5 && <p className="mt-1 text-xs text-muted">…and {result.trades.length - 5} more.</p>}</div>
          )}
          {overRoom && <Notice kind="warn">This file has {result.trades.length.toLocaleString("en-US")} trades but your plan has room for {room!.toLocaleString("en-US")} more. <Link href="/app/billing" className="underline">See plans</Link></Notice>}
          <p className="text-xs text-muted">Trades already in this account are skipped automatically. You can roll back the whole import afterwards.</p>
          <input type="hidden" name="csv" value={text} />
          <input type="hidden" name="file_name" value={fileName} />
          <input type="hidden" name="mapping" value={JSON.stringify(mapping)} />
          <button disabled={pending || result.trades.length === 0} className={btnCls}>{pending ? "Importing…" : `Import ${result.trades.length.toLocaleString("en-US")} trade${result.trades.length === 1 ? "" : "s"}`}</button>
        </Card>
      )}
    </form>
  );
}
