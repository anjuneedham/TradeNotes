import * as Sentry from "@sentry/nextjs";
import type { ErrorEvent } from "@sentry/nextjs";

/** Fields that can hold personal or trade data are removed before anything leaves the app. */
export function scrub(event: ErrorEvent): ErrorEvent {
  if (event.request) { delete event.request.data; delete event.request.cookies; delete event.request.headers; delete event.request.query_string; }
  delete event.user;
  return event;
}

export const sentryOptions = (dsn: string | undefined) => ({
  dsn,
  enabled: Boolean(dsn),                       // inert until a DSN is configured
  environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
  sendDefaultPii: false,
  tracesSampleRate: 0.05,
  beforeSend: scrub,
});

/** Report a handled failure we want an alert for (payments, email, checkout). Safe to call when Sentry is off. */
export function report(error: unknown, area: string, extra?: Record<string, string | number>) {
  Sentry.captureException(error instanceof Error ? error : new Error(String(error)), { tags: { area }, extra });
}
