import Link from "next/link";
import type { ReactNode } from "react";
import { PLANS } from "@/lib/plans";
import { Notice, btnCls } from "./ui";

/** Shown instead of a plan-gated page. The gate itself is enforced on the server (the page does not load the data); this is only the explanation. */
export function UpgradeNotice({ feature, children, tier = "standard" }: { feature: string; children?: ReactNode; tier?: "standard" | "premium" }) {
  return (
    <Notice kind="warn">
      <p className="font-medium">{feature} {tier === "premium" ? `is part of ${PLANS.pro.name}` : `is part of ${PLANS.starter.name} and ${PLANS.pro.name}`}</p>
      {children && <p className="mt-1">{children}</p>}
      <Link href={`/app/billing?plan=${tier === "premium" ? "pro" : "starter"}`} className={`${btnCls} mt-3`}>See plans</Link>
    </Notice>
  );
}
