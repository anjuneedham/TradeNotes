import type { ReactNode } from "react";
import { LEGAL, legalComplete, missingLegalFields } from "@/lib/legal";

export function LegalShell({ title, children }: { title: string; children: ReactNode }) {
  const missing = missingLegalFields();
  return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-sm leading-relaxed">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-1 text-xs text-muted">Effective {LEGAL.effectiveDate}</p>
      {!legalComplete() && (
        <p role="alert" className="mt-4 rounded border border-loss/50 bg-loss/10 p-3">
          Some details on this page are not filled in yet ({missing.join(", ")}). Do not publish this page until they are.
        </p>
      )}
      <p className="mt-4 rounded-md border border-border bg-raised p-3 text-sm" data-testid="responsibility">
        {LEGAL.responsibilityStatement}{LEGAL.counselReviewed ? "" : " Not reviewed by a lawyer."}
      </p>
      <div className="mt-6 space-y-3 [&_h2]:mt-8 [&_h2]:text-lg [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:space-y-1 [&_ul]:pl-5">{children}</div>
    </div>
  );
}
