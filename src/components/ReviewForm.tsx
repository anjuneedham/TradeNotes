"use client";
import Link from "next/link";
import { useActionState } from "react";
import { saveReview, type ReviewState } from "@/app/app/reviews/actions";
import { TEMPLATE, REVIEW_MAX_CHARS, type Period } from "@/lib/reviews";
import { Field, Notice, inputCls, btnCls, btnGhostCls } from "./ui";

export function ReviewForm({ period, start, values }: { period: Period; start: string; values: Partial<Record<(typeof TEMPLATE)[number]["key"], string | null>> }) {
  const [state, action, pending] = useActionState<ReviewState, FormData>(saveReview, {});
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="period" value={period} /><input type="hidden" name="start" value={start} />
      {state.message && <Notice kind={state.code ? "warn" : "error"}>{state.message}{state.code && <> <Link href="/app/billing" className={`${btnGhostCls} mt-3`}>See plans</Link></>}</Notice>}
      {TEMPLATE.map((t) => (
        <Field key={t.key} label={t.label} hint={t.prompt} error={state.errors?.[t.key]}>
          <textarea name={t.key} rows={4} maxLength={REVIEW_MAX_CHARS} defaultValue={values[t.key] ?? ""} aria-invalid={state.errors?.[t.key] ? true : undefined} className={`${inputCls} min-h-28 resize-y`} />
        </Field>
      ))}
      <div className="flex flex-wrap items-center gap-3">
        <button disabled={pending} className={btnCls}>{pending ? "Saving…" : "Save review"}</button>
        <p className="text-xs text-muted">Saving also stores the figures shown above as they are right now.</p>
      </div>
    </form>
  );
}
