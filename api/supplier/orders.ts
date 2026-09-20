// ─── /api/supplier/orders — the dropship queue ───────────────────────────────
//
// Admin-only, because the queue holds customer addresses.
//
//   GET  ?status=pending            the queue, newest first
//   GET  ?format=csv                the same rows as a CSV to upload to AliDrop
//   POST { action: "dispatch" }     try to post every pending order
//   POST { action: "mark", orderRef, status }   record one placed by hand
//
// The CSV is the path that works with no credentials at all: AliDrop is an app
// for Shopify, WooCommerce and Wix rather than a documented API, so until you
// have an endpoint the honest hand-off is a file somebody uploads. Configure
// SUPPLIER_API_BASE and SUPPLIER_ORDER_PATH and the same queue posts itself.

import { createClient } from "@supabase/supabase-js";
import { json, readBody, route, serviceClient } from "../_lib/stripe.js";
import {
  type SupplierPayload,
  canDispatch,
  dispatchSupplierOrder,
  missingSupplierConfig,
  settleSupplierOrder,
  supplierConfig,
} from "../_lib/supplier.js";

export const config = { runtime: "nodejs" };

const STATUSES = ["pending", "sent", "failed", "cancelled", "manual"] as const;
type Status = (typeof STATUSES)[number];

interface QueueRow {
  order_ref: string;
  supplier: string;
  payload: SupplierPayload;
  status: Status;
  supplier_order_id: string | null;
  tracking_number: string | null;
  attempts: number;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
}

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

/** RFC 4180 escaping, so an address with a comma survives the round trip. */
const cell = (v: unknown): string => {
  const s = v == null ? "" : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

function toCsv(rows: QueueRow[]): string {
  const header = [
    "order_ref", "placed_at", "status", "sku", "product_id", "variant", "qty", "product",
    "engraving", "name", "phone", "address", "city", "region", "postcode", "country", "notes", "email",
  ];
  const lines = [header.join(",")];
  for (const r of rows) {
    const a = r.payload.address ?? { name: "", country: "" };
    for (const l of r.payload.lines ?? []) {
      lines.push(
        [
          r.order_ref, r.payload.placedAt, r.status, l.sku ?? "", l.productId, l.variant, l.qty, l.name,
          l.engraving ?? "", a.name, a.phone ?? "", a.line1 ?? "", a.city ?? "", a.region ?? "",
          a.postcode ?? "", a.country, a.notes ?? "", r.payload.email,
        ].map(cell).join(","),
      );
    }
  }
  return `${lines.join("\n")}\n`;
}

export default route("supplier/orders", async function handler(req: any, res: any) {
  const gate = await adminGate(req);
  if (gate === 501) return json(res, 501, { error: "Supabase isn't configured", detail: "Missing SUPABASE_URL / SUPABASE_ANON_KEY" });
  if (gate !== null) return json(res, gate, { error: gate === 401 ? "Sign in as an admin" : "Admins only" });

  const db = serviceClient();
  if (!db) return json(res, 501, { error: "Supabase isn't configured", detail: "Missing SUPABASE_SERVICE_ROLE_KEY" });

  const cfg = supplierConfig();

  if (req.method === "GET") {
    const params = new URL(req.url, "http://localhost").searchParams;
    const status = params.get("status");
    const limit = Math.min(500, Math.max(1, Number(params.get("limit") ?? 200)));
    let query = db.from("supplier_orders").select("*").order("created_at", { ascending: false }).limit(limit);
    if (status && (STATUSES as readonly string[]).includes(status)) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) return json(res, 500, { error: error.message });
    const rows = (data ?? []) as QueueRow[];

    if (params.get("format") === "csv") {
      res.setHeader("Content-Type", "text/csv; charset=utf-8");
      res.setHeader("Content-Disposition", `attachment; filename="${cfg.name}-orders-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.status(200).send(toCsv(rows));
      return;
    }
    return json(res, 200, {
      supplier: cfg.name,
      canDispatch: canDispatch(),
      missing: missingSupplierConfig(),
      dryRun: cfg.dryRun,
      counts: rows.reduce<Record<string, number>>((acc, r) => ({ ...acc, [r.status]: (acc[r.status] ?? 0) + 1 }), {}),
      orders: rows,
    });
  }

  if (req.method === "POST") {
    const body = readBody(req);
    const action = String(body.action ?? "");

    // Somebody placed it in AliDrop by hand: take it out of the queue.
    if (action === "mark") {
      const orderRef = String(body.orderRef ?? "");
      const status = String(body.status ?? "manual") as Status;
      if (!orderRef) return json(res, 400, { error: "Which order?" });
      if (!(STATUSES as readonly string[]).includes(status)) return json(res, 400, { error: "Unknown status" });
      await settleSupplierOrder(db, orderRef, status as "sent" | "failed" | "manual" | "cancelled", String(body.supplierOrderId ?? "") || null, null);
      return json(res, 200, { ok: true, orderRef, status });
    }

    if (action === "dispatch") {
      if (!canDispatch()) {
        return json(res, 501, {
          error: "No supplier endpoint configured",
          detail: cfg.dryRun ? "SUPPLIER_DRY_RUN=1 — unset it to send" : `Missing in Vercel: ${missingSupplierConfig().join(", ")}`,
        });
      }
      // Failures are retried, but not forever: a payload the supplier keeps
      // rejecting is a problem to look at, not one to keep hammering.
      const { data, error } = await db
        .from("supplier_orders")
        .select("*")
        .in("status", ["pending", "failed"])
        .lt("attempts", 5)
        .order("created_at", { ascending: true })
        .limit(50);
      if (error) return json(res, 500, { error: error.message });

      const results: { orderRef: string; ok: boolean; error?: string }[] = [];
      for (const row of (data ?? []) as QueueRow[]) {
        const result = await dispatchSupplierOrder(row.payload);
        await settleSupplierOrder(
          db,
          row.order_ref,
          result.ok ? "sent" : "failed",
          result.ok ? result.supplierOrderId : null,
          result.ok ? null : result.error,
        );
        results.push(result.ok ? { orderRef: row.order_ref, ok: true } : { orderRef: row.order_ref, ok: false, error: result.error });
      }
      return json(res, 200, { attempted: results.length, sent: results.filter((r) => r.ok).length, results });
    }

    return json(res, 400, { error: "Unknown action" });
  }

  return json(res, 405, { error: "Method not allowed" });
});
