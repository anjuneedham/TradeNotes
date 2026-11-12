import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./lib/monitor";

export async function register() {
  // Server (Node) only: the edge middleware here just checks a cookie and has nothing worth reporting.
  if (process.env.NEXT_RUNTIME === "nodejs") Sentry.init(sentryOptions(process.env.SENTRY_DSN));
}
export const onRequestError = Sentry.captureRequestError;
