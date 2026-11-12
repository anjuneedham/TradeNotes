"use client";
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

/** Last-resort error screen (replaces the root layout). Reports to Sentry when enabled; shows nothing technical. */
export default function GlobalError({ error }: { error: Error & { digest?: string } }) {
  useEffect(() => { Sentry.captureException(error); }, [error]);
  return (
    <html lang="en"><body style={{ fontFamily: "system-ui, sans-serif", padding: "4rem 1rem", textAlign: "center" }}>
      <h1>Something went wrong</h1>
      <p>Your data is safe. Please reload the page, and try again in a few minutes if it keeps happening.</p>
    </body></html>
  );
}
