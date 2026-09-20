// ─── What is wired up ────────────────────────────────────────────────────────
//
// Half of this storefront's behaviour is decided by environment variables that
// live in Vercel, and until now nothing in the app said which of them were set.
// A shop can look entirely finished and quietly be unable to take a payment.
//
// This module gathers the answer from two places: /api/admin/setup for the
// server-side secrets (presence only — no value ever leaves the server), and
// `import.meta.env` for the VITE_ settings the browser already holds. Each
// check knows what it switches on and what happens without it, because a
// status light nobody can act on is just decoration.

import { supabase } from "./supabase";

export type CheckState = "ready" | "missing" | "warn" | "optional";

export interface Check {
  id: string;
  name: string;
  state: CheckState;
  /** What this turns on, or what is broken without it. One line. */
  detail: string;
  /** The variables to set, named exactly as the deployment expects them. */
  vars?: string[];
  /** Where to set them. */
  where?: string;
}

export interface SetupGroup {
  id: string;
  name: string;
  /** Why this group matters, in a sentence. */
  blurb: string;
  checks: Check[];
}

/** Shape of /api/admin/setup. Booleans, never secrets. */
export interface SetupReport {
  checkedAt: string;
  database: {
    url: boolean;
    anonKey: boolean;
    serviceKey: boolean;
    tables: { products: boolean; supplierOrders: boolean; scentProfiles: boolean; fulfilment: boolean };
  };
  payments: { secretKey: boolean; testMode: boolean; webhookSecret: boolean; currency: string; siteUrl: boolean };
  postage: { ready: boolean; pacKey: boolean; fromPostcode: string | null };
  dropship: { name: string; canDispatch: boolean; missing: string[]; dryRun: boolean; base: boolean; orderPath: boolean; apiKey: boolean };
  ai: { key: boolean };
}

const VERCEL = "Vercel → Project → Settings → Environment Variables";

async function headers(): Promise<Record<string, string>> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) h.Authorization = `Bearer ${data.session.access_token}`;
  }
  return h;
}

/** Null when the route isn't deployed, so the panel can say so. */
export async function loadSetup(): Promise<SetupReport | { error: string } | null> {
  try {
    const res = await fetch("/api/admin/setup", { headers: await headers() });
    const type = res.headers.get("content-type") ?? "";
    if (res.status === 404 || !type.includes("application/json")) return null;
    const body = (await res.json()) as SetupReport & { error?: string; detail?: string };
    if (!res.ok) return { error: [body.error, body.detail].filter(Boolean).join(" — ") || `Request failed (${res.status})` };
    return body;
  } catch {
    return null;
  }
}

const env = (k: string): string => String((import.meta.env as Record<string, unknown>)[k] ?? "").trim();

/**
 * The checks the browser can make on its own. These are the VITE_ variables —
 * public by definition, since they are compiled into the bundle — so they are
 * read directly rather than asked for.
 */
export function storefrontChecks(): Check[] {
  const support = env("VITE_SUPPORT_EMAIL");
  const privacy = env("VITE_PRIVACY_POLICY_URL");
  const returns = env("VITE_RETURNS_POLICY_URL");
  const address = env("VITE_RETURN_ADDRESS");
  return [
    {
      id: "support-email",
      name: "Support address",
      state: support ? "ready" : "missing",
      detail: support ? `Shown to customers as ${support}.` : "Shoppers have no way to reach you from the help page.",
      vars: ["VITE_SUPPORT_EMAIL"],
      where: VERCEL,
    },
    {
      id: "policies",
      name: "Privacy & returns policies",
      state: privacy && returns ? "ready" : "missing",
      detail:
        privacy && returns
          ? "Both linked in the footer and at checkout."
          : "Required before taking payments in Australia, and linked from checkout.",
      vars: [!privacy && "VITE_PRIVACY_POLICY_URL", !returns && "VITE_RETURNS_POLICY_URL"].filter(Boolean) as string[],
      where: VERCEL,
    },
    {
      id: "return-address",
      name: "Return address",
      state: address ? "ready" : "warn",
      detail: address ? "Printed on staff shipping labels." : "Shipping labels will print without a sender block.",
      vars: ["VITE_RETURN_ADDRESS"],
      where: VERCEL,
    },
  ];
}

/** Everything the server knows, turned into the same shape. */
export function serverGroups(r: SetupReport): SetupGroup[] {
  const db = r.database;
  const missingTables = Object.entries({
    "0032 — goods": db.tables.products,
    "0034 — dropship": db.tables.supplierOrders,
    "0019 — scent DNA": db.tables.scentProfiles,
    "0025 — staff desk": db.tables.fulfilment,
  })
    .filter(([, present]) => !present)
    .map(([name]) => name);

  return [
    {
      id: "database",
      name: "Database",
      blurb: "Supabase holds the catalogue, orders, accounts and the Scentprints.",
      checks: [
        {
          id: "db-keys",
          name: "Connection",
          state: db.url && db.anonKey ? "ready" : "missing",
          detail: db.url && db.anonKey ? "The storefront reads live data." : "Running on the seed catalogue; nothing is saved.",
          vars: [!db.url && "VITE_SUPABASE_URL", !db.anonKey && "VITE_SUPABASE_ANON_KEY"].filter(Boolean) as string[],
          where: VERCEL,
        },
        {
          id: "db-service",
          name: "Service role key",
          state: db.serviceKey ? "ready" : "missing",
          detail: db.serviceKey
            ? "Paid orders, the dropship queue and admin writes can be recorded."
            : "A paid order cannot be recorded — the webhook has no way to write it.",
          vars: ["SUPABASE_SERVICE_ROLE_KEY"],
          where: VERCEL,
        },
        {
          id: "db-migrations",
          name: "Migrations",
          state: missingTables.length === 0 ? "ready" : "missing",
          detail:
            missingTables.length === 0
              ? "Every table this build expects is present."
              : `Not applied yet: ${missingTables.join(", ")}. Run the SQL in supabase/migrations in order.`,
        },
      ],
    },
    {
      id: "payments",
      name: "Payments",
      blurb: "Stripe Checkout takes the money; the webhook is what records the order afterwards.",
      checks: [
        {
          id: "stripe-key",
          name: "Stripe key",
          state: r.payments.secretKey ? (r.payments.testMode ? "warn" : "ready") : "missing",
          detail: !r.payments.secretKey
            ? "Checkout cannot start. Nothing can be sold."
            : r.payments.testMode
              ? "A test key is in use — cards are not charged. Swap it for the live key before launch."
              : `Live, charging in ${r.payments.currency}.`,
          vars: ["STRIPE_SECRET_KEY"],
          where: VERCEL,
        },
        {
          id: "stripe-webhook",
          name: "Webhook signing secret",
          state: r.payments.webhookSecret ? "ready" : "missing",
          detail: r.payments.webhookSecret
            ? "Paid orders are recorded as Stripe confirms them."
            : "Payments would succeed and the orders would never be recorded.",
          vars: ["STRIPE_WEBHOOK_SECRET"],
          where: "Stripe → Developers → Webhooks → your endpoint → Signing secret",
        },
        {
          id: "site-url",
          name: "Return URL",
          state: r.payments.siteUrl ? "ready" : "optional",
          detail: r.payments.siteUrl
            ? "Pinned — make sure it is the live site, or paying customers come back to the wrong place."
            : "Unset, so customers return to whichever host they paid from. That is usually what you want.",
          vars: ["SITE_URL"],
          where: VERCEL,
        },
      ],
    },
    {
      id: "postage",
      name: "Postage",
      blurb: "Australia Post prices every parcel at checkout, and again before the charge.",
      checks: [
        {
          id: "auspost",
          name: "Australia Post",
          state: r.postage.ready ? "ready" : "missing",
          detail: r.postage.ready
            ? `Quoting live rates from ${r.postage.fromPostcode}.`
            : "Postal checkout is blocked: no rate can be quoted, so an order cannot be placed.",
          vars: [!r.postage.pacKey && "AUSPOST_PAC_KEY", !r.postage.fromPostcode && "AUSPOST_FROM_POSTCODE"].filter(Boolean) as string[],
          where: "developers.auspost.com.au → Postage Assessment Calculator",
        },
      ],
    },
    {
      id: "dropship",
      name: "Dropshipping",
      blurb: `Paid orders with a dropshipped line are queued for ${r.dropship.name}. The queue works with no credentials at all.`,
      checks: [
        {
          id: "supplier-transport",
          name: "Order hand-off",
          state: r.dropship.canDispatch ? "ready" : r.dropship.dryRun ? "warn" : "optional",
          detail: r.dropship.canDispatch
            ? "Orders post automatically as they are paid."
            : r.dropship.dryRun
              ? "Dry run: orders are queued and exportable, but never posted."
              : `Queued for manual placement — export the CSV from the Dropship tab. ${r.dropship.name} publishes no developer API, so this is the working path until you have an endpoint.`,
          vars: r.dropship.dryRun ? ["SUPPLIER_DRY_RUN"] : r.dropship.missing,
          where: VERCEL,
        },
      ],
    },
    {
      id: "ai",
      name: "AI features",
      blurb: "The concierge, the Scent DNA copy, fragrance conception and marketing drafts.",
      checks: [
        {
          id: "anthropic",
          name: "Anthropic key",
          state: r.ai.key ? "ready" : "optional",
          detail: r.ai.key ? "All AI features are live." : "Each AI feature falls back to its written house version. Nothing breaks.",
          vars: ["ANTHROPIC_API_KEY"],
          where: VERCEL,
        },
      ],
    },
    {
      id: "email",
      name: "Email",
      blurb: "Sign-in, password reset and receipts.",
      checks: [
        {
          id: "smtp",
          name: "Supabase SMTP",
          state: "optional",
          detail:
            "Auth mail is configured in the Supabase dashboard, not here — without it, Supabase's own low-rate sender is used and sign-up mail may be throttled. See docs/SUPABASE_SETUP.md.",
          where: "Supabase → Project Settings → Authentication → SMTP",
        },
      ],
    },
  ];
}

/** How many checks still need attention, for the headline. */
export function outstanding(groups: SetupGroup[]): { blocking: number; warnings: number } {
  const all = groups.flatMap((g) => g.checks);
  return {
    blocking: all.filter((c) => c.state === "missing").length,
    warnings: all.filter((c) => c.state === "warn").length,
  };
}
