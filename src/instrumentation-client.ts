import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "./lib/monitor";

// No session replay and no default PII: trade notes and account details must never leave the app.
Sentry.init({ ...sentryOptions(process.env.NEXT_PUBLIC_SENTRY_DSN), tracesSampleRate: 0 });
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
