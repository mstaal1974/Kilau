// ─── /api/admin/setup — what is wired up, and what is not ────────────────────
//
// Half of this storefront's behaviour is decided by environment variables that
// live in Vercel, and nothing in the app could previously tell you which of
// them were set. The result was a shop that looked finished and quietly could
// not take a payment, quote postage, or reach a supplier.
//
// This route answers that, for an admin only. It reports **presence, never
// values**: a boolean for every secret, and only the handful of settings that
// are not secret in the first place (a currency, a postcode, a supplier name).
// No key, token or URL that could be replayed leaves here.
//
// It also asks the database which migrations have landed, since a missing
// table is the other half of "why doesn't this work" and cannot be read off an
// environment variable.

import { createClient } from "@supabase/supabase-js";
import { json, route, serviceClient } from "../_lib/stripe.js";
import { canDispatch, missingSupplierConfig, supplierConfig } from "../_lib/supplier.js";
import { auspostConfigured } from "../_lib/auspost.js";

export const config = { runtime: "nodejs" };

const set = (v: string | undefined): boolean => !!v && v.trim() !== "";

/** The caller must be an admin. Mirrors api/marketing.ts. */
async function adminGate(req: any): Promise<number | null> {
  const url = process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
  const anon = process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !anon) return 501;
  const auth = String(req.headers["authorization"] ?? "");
  const token = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!token) return 401;
  try {
    const sb = createClient(url, anon, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await sb.rpc("is_admin");
    if (error) return 401;
    return data === true ? null : 403;
  } catch {
    return 401;
  }
}

/**
 * Whether a table is there. PostgREST answers a missing relation with 42P01,
 * which is the signal that a migration has not been applied — distinct from a
 * table that exists and happens to be empty.
 */
async function tableExists(db: ReturnType<typeof serviceClient>, table: string): Promise<boolean> {
  if (!db) return false;
  const { error } = await db.from(table).select("*", { count: "exact", head: true }).limit(1);
  return !error;
}

export default route(
  "admin/setup",
  async function handler(req: any, res: any) {
    if (req.method !== "GET") return json(res, 405, { error: "Method not allowed" });

    const gate = await adminGate(req);
    if (gate === 501) return json(res, 501, { error: "Supabase isn't configured", detail: "Missing SUPABASE_URL / SUPABASE_ANON_KEY" });
    if (gate !== null) return json(res, gate, { error: gate === 401 ? "Sign in as an admin" : "Admins only" });

    const db = serviceClient();
    const supplier = supplierConfig();

    // A table per migration that introduced one, so the answer is "0032 has
    // not been applied" rather than an unexplained empty department page.
    const [products, supplierOrders, scentProfiles, fulfilment] = db
      ? await Promise.all([
          tableExists(db, "products"),
          tableExists(db, "supplier_orders"),
          tableExists(db, "scent_profiles"),
          tableExists(db, "order_fulfilment"),
        ])
      : [false, false, false, false];

    return json(res, 200, {
      checkedAt: new Date().toISOString(),
      database: {
        url: set(process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL),
        anonKey: set(process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY),
        serviceKey: set(process.env.SUPABASE_SERVICE_ROLE_KEY),
        tables: { products, supplierOrders, scentProfiles, fulfilment },
      },
      payments: {
        secretKey: set(process.env.STRIPE_SECRET_KEY),
        // A key that starts sk_test_ takes no real money; worth saying out
        // loud on a console that otherwise looks live.
        testMode: (process.env.STRIPE_SECRET_KEY ?? "").startsWith("sk_test_"),
        webhookSecret: set(process.env.STRIPE_WEBHOOK_SECRET),
        currency: (process.env.STRIPE_CURRENCY || "aud").toUpperCase(),
        siteUrl: set(process.env.SITE_URL),
      },
      postage: {
        ready: auspostConfigured(),
        pacKey: set(process.env.AUSPOST_PAC_KEY),
        // Not a secret: it is printed on every parcel that leaves.
        fromPostcode: process.env.AUSPOST_FROM_POSTCODE || null,
      },
      dropship: {
        name: supplier.name,
        canDispatch: canDispatch(),
        missing: missingSupplierConfig(),
        dryRun: supplier.dryRun,
        base: set(supplier.base),
        orderPath: set(supplier.orderPath),
        apiKey: set(supplier.key),
      },
      ai: {
        key: set(process.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_KEY),
      },
    });
  },
  "The setup report is unavailable",
);
