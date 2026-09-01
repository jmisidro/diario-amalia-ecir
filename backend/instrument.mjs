import * as Sentry from "@sentry/node";
import { nodeProfilingIntegration } from "@sentry/profiling-node";

import dotenv from 'dotenv';

dotenv.config();

Sentry.init({
  // Use environment variable for DSN
  dsn: process.env.SENTRY_DSN,

  integrations: [
    Sentry.expressIntegration(),
    Sentry.mongoIntegration(),
    // Captures CPU profiles so you can see "hot paths" in your code
    nodeProfilingIntegration(),
  ],

  // Performance Monitoring
  // 1.0 captures every single request. In high-traffic prod, lower this to 0.1
  tracesSampleRate: 1.0,

  // Profiling relative to tracesSampleRate
  profilesSampleRate: 1.0,

  // Send structured logs to Sentry for easier debugging
  enableLogs: true,

  // Includes IP addresses and cookie data (useful for debugging, check your GDPR needs)
  sendDefaultPii: true,

  // Environment tag (helps distinguish between your laptop and the server)
  environment: process.env.NODE_ENV || "development",
});

console.log("✅ Sentry Initialized: Monitoring Express, Mongo, and Scraper");
