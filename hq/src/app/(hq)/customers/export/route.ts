import { NextResponse } from "next/server";
import { isOwner } from "@/lib/auth";
import { listCustomers, effPlan } from "@/lib/customers";

const cell = (v: unknown) => { let s = String(v ?? ""); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; };   // neutralise spreadsheet formulas
export async function GET() {
  if (!(await isOwner())) return new NextResponse("Unauthorized", { status: 401 });
  const rows = await listCustomers(false);
  const head = ["email", "name", "signed_up", "source", "plan", "founding", "period_end", "trades", "last_trade", "verified", "opted_out"];
  const body = rows.map((c) => [c.email, c.name, c.created_at.slice(0, 10), c.signup_source, effPlan(c), c.is_founding_member, c.current_period_end?.slice(0, 10), c.trades, c.last_trade?.slice(0, 10), c.verified, c.email_opt_out].map(cell).join(","));
  return new NextResponse([head.join(","), ...body].join("\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": "attachment; filename=tradenotes-customers.csv" } });
}
