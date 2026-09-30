"use client";

import * as Sentry from "@sentry/nextjs";

if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    replaysSessionSampleRate: process.env.NODE_ENV === "production" ? 0.01 : 0.1,
    integrations: [new Sentry.Replay()],
  });
}

export function captureException(error: Error, context?: Record<string, any>) {
  Sentry.captureException(error, { contexts: { app: context } });
}

export function captureMessage(message: string, level: Sentry.SeverityLevel = "info") {
  Sentry.captureMessage(message, level);
}
