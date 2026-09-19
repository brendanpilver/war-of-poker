/**
 * Server-side environment access.
 *
 * Every integration in the funnel is optional so the site keeps building and
 * running before Supabase, Stripe, and Resend are provisioned. A missing
 * variable disables one capability and is reported by `missingEnv()`; it never
 * breaks a page render. Documented in `.env.example`.
 *
 * Nothing here may be imported into a client component. Next.js only inlines
 * `NEXT_PUBLIC_`-prefixed variables into the browser bundle, so a stray import
 * would read `null` rather than leak `SUPABASE_SERVICE_ROLE_KEY` or
 * `STRIPE_SECRET_KEY` -- but keep these reads on the server regardless.
 */

function read(name: string): string | null {
  const value = process.env[name];
  return value && value.length > 0 ? value : null;
}

export const env = {
  supabaseUrl: read("SUPABASE_URL"),
  supabaseServiceRoleKey: read("SUPABASE_SERVICE_ROLE_KEY"),
  stripeSecretKey: read("STRIPE_SECRET_KEY"),
  stripeWebhookSecret: read("STRIPE_WEBHOOK_SECRET"),
  resendApiKey: read("RESEND_API_KEY"),
  emailFrom: read("EMAIL_FROM"),
  /** Signs the download tokens that gate paid files. */
  deliverySecret: read("DELIVERY_SECRET"),
  /** Bearer token for the /growth dashboard. */
  growthDashboardToken: read("GROWTH_DASHBOARD_TOKEN"),
};

export const hasSupabase = Boolean(env.supabaseUrl && env.supabaseServiceRoleKey);
export const hasStripe = Boolean(env.stripeSecretKey);
export const hasResend = Boolean(env.resendApiKey && env.emailFrom);

/** Names of the variables needed for a fully operational funnel that are unset. */
export function missingEnv(): string[] {
  const required: Array<[string, string | null]> = [
    ["SUPABASE_URL", env.supabaseUrl],
    ["SUPABASE_SERVICE_ROLE_KEY", env.supabaseServiceRoleKey],
    ["STRIPE_SECRET_KEY", env.stripeSecretKey],
    ["STRIPE_WEBHOOK_SECRET", env.stripeWebhookSecret],
    ["RESEND_API_KEY", env.resendApiKey],
    ["EMAIL_FROM", env.emailFrom],
    ["DELIVERY_SECRET", env.deliverySecret],
    ["GROWTH_DASHBOARD_TOKEN", env.growthDashboardToken],
  ];
  return required.filter(([, value]) => !value).map(([name]) => name);
}
