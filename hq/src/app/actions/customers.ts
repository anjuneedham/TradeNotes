"use server";
import { guarded, int, opt, str, uuid } from "@/lib/flash";
import { q, tx } from "@/lib/db";
import { extendedEnd, PLAN_IDS, SUB_PERIOD_DAYS, validatePlanChange, type PlanId } from "@/lib/plans";
import { findCustomerByEmail, foundingSeatsUsed, getCustomer } from "@/lib/customers";
import { syncProspectStages } from "@/lib/outreach-data";
import { redirect } from "next/navigation";
import { requireOwner } from "@/lib/auth";

/** Payer email from Handypay → jump to that customer with the plan form ready. */
export async function findPayer(fd: FormData) {
  await requireOwner();
  const email = str(fd, "email").toLowerCase();
  const c = email ? await findCustomerByEmail(email) : null;
  if (!c) redirect(`/customers?err=${encodeURIComponent(`No TradeNotes account uses ${email || "that email"}. Payments are matched by email — ask the payer which email they signed up with.`)}`);
  const plan = ["starter", "pro"].includes(str(fd, "plan")) ? str(fd, "plan") : "starter";
  redirect(`/customers/${c.id}?plan=${plan}#plan`);
}

async function writePlan(userId: string, to: PlanId, founding: boolean, days: number, ref: string | null, action: string) {
  const cur = await getCustomer(userId); if (!cur) throw new Error("Customer not found.");
  const end = to === "free" ? null : extendedEnd(cur.plan === to ? cur.current_period_end : null, new Date(), days);
  await tx(async (t) => {
    await t(`insert into tradenotes.subscriptions (user_id, plan, status, current_period_end, is_founding_member, updated_at) values ($1,$2,'active',$3,$4,now())
             on conflict (user_id) do update set plan = excluded.plan, status = 'active', current_period_end = excluded.current_period_end, is_founding_member = excluded.is_founding_member, updated_at = now()`, [userId, to, end, to === "free" ? false : founding]);
    await t(`insert into tradenotes.audit_log (user_id, action, detail) values ($1,$2,$3::jsonb)`, [userId, action, JSON.stringify({ from: cur.plan, to, founding: to === "free" ? false : founding, period_end: end, ref, by: "hq" })]);
  });
  await syncProspectStages();
}

export async function setPlan(fd: FormData) {
  const id = uuid(str(fd, "id"));
  return guarded(`/customers/${id}`, async () => {
    const to = str(fd, "plan") as PlanId; const founding = to !== "free" && str(fd, "founding") === "on";   // moving to Free always clears the founding flag
    const c = await getCustomer(id); if (!c) throw new Error("Customer not found.");
    const err = validatePlanChange({ to, founding, foundingUsed: await foundingSeatsUsed(), wasFounding: c.is_founding_member, trades: c.trades, confirmNoTrades: str(fd, "confirm") === "on" });
    if (err) throw new Error(err);
    if (!(PLAN_IDS as readonly string[]).includes(to)) throw new Error("Unknown plan.");
    const days = Math.min(400, Math.max(1, int(fd, "days", SUB_PERIOD_DAYS)));
    await writePlan(id, to, founding, days, opt(fd, "ref"), "hq.plan_change");
    return to === "free" ? "Moved to Free." : `${to} active until ${(await getCustomer(id))?.current_period_end?.slice(0, 10)}.`;
  });
}
/** One click after you see the monthly payment arrive. */
export async function extend(fd: FormData) {
  const id = uuid(str(fd, "id")); const back = str(fd, "back") === "list" ? "/customers" : `/customers/${id}`;
  return guarded(back, async () => {
    const c = await getCustomer(id); if (!c || c.plan === "free") throw new Error("Only paid plans can be extended.");
    await writePlan(id, c.plan as PlanId, c.is_founding_member, SUB_PERIOD_DAYS, opt(fd, "ref"), "hq.extend");
    return `Extended ${c.email} by ${SUB_PERIOD_DAYS} days.`;
  });
}
export async function saveMeta(fd: FormData) {
  const id = uuid(str(fd, "id"));
  return guarded(`/customers/${id}`, async () => {
    const t = str(fd, "testimonial"); if (!["none", "asked", "written_permission"].includes(t)) throw new Error("Bad testimonial value.");
    const call = opt(fd, "founding_call_at");
    await q(`insert into hq.customer_meta (user_id, notes, email_ok, email_opt_out, testimonial, founding_call_at, updated_at) values ($1,$2,$3,$4,$5,$6,now())
             on conflict (user_id) do update set notes=excluded.notes, email_ok=excluded.email_ok, email_opt_out=excluded.email_opt_out, testimonial=excluded.testimonial, founding_call_at=excluded.founding_call_at, updated_at=now()`,
      [id, opt(fd, "notes"), str(fd, "email_ok") === "on", str(fd, "email_opt_out") === "on", t, call]);
  });
}
