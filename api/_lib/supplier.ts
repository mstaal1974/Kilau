// ─── Handing a paid order to the supplier ────────────────────────────────────
//
// AliDrop publishes no developer API: it is an app for Shopify, WooCommerce and
// Wix that syncs into those platforms. So this module does not pretend to know
// an endpoint. It does two things instead:
//
//   1. Queues every paid order that contains a dropshipped line, as a row in
//      `supplier_orders` holding exactly what would be sent. That queue is
//      useful on its own — /api/supplier/export turns it into a CSV to upload
//      or paste into AliDrop, which is the path that works today.
//
//   2. Posts that payload, if and only if SUPPLIER_API_BASE and
//      SUPPLIER_ORDER_PATH are set. Every part of the request — base, path,
//      method, auth header and scheme, and the field names in the body — comes
//      from the environment, so when you do have credentials and a spec you
//      configure it rather than waiting on a code change.
//
// The queue is written first and the post is attempted after, never the other
// way round: the money has already been taken by then, and a supplier being
// down must never turn a paid order into a lost one.

import type { SupabaseClient } from "@supabase/supabase-js";

export interface SupplierAddress {
  name: string;
  phone?: string;
  line1?: string;
  city?: string;
  region?: string;
  postcode?: string;
  country: string;
  notes?: string;
}

export interface SupplierLine {
  productId: string;
  variant: string;
  /** The supplier's own SKU for that variant, when the catalogue knows it. */
  sku?: string;
  qty: number;
  name: string;
  engraving: string | null;
}

export interface SupplierPayload {
  orderRef: string;
  placedAt: string;
  currency: string;
  email: string;
  address: SupplierAddress;
  lines: SupplierLine[];
}

/** Named so a 501 can say exactly what is missing, like the Stripe routes do. */
export function supplierConfig() {
  const base = (process.env.SUPPLIER_API_BASE ?? "").replace(/\/$/, "");
  const orderPath = process.env.SUPPLIER_ORDER_PATH ?? "";
  return {
    name: process.env.SUPPLIER_NAME || "alidrop",
    base,
    orderPath,
    trackingPath: process.env.SUPPLIER_TRACKING_PATH ?? "",
    key: process.env.SUPPLIER_API_KEY ?? "",
    authHeader: process.env.SUPPLIER_AUTH_HEADER || "Authorization",
    authScheme: process.env.SUPPLIER_AUTH_SCHEME ?? "Bearer",
    method: (process.env.SUPPLIER_ORDER_METHOD || "POST").toUpperCase(),
    /** Dotted path to the supplier's order id in the response, e.g. "data.id". */
    idField: process.env.SUPPLIER_ORDER_ID_FIELD || "id",
    /** Set to 1 to queue and export but never post, while you are testing. */
    dryRun: process.env.SUPPLIER_DRY_RUN === "1",
  };
}

/** Whether an order can actually be posted, as opposed to only queued. */
export function canDispatch(): boolean {
  const c = supplierConfig();
  return !!c.base && !!c.orderPath && !c.dryRun;
}

export function missingSupplierConfig(): string[] {
  const c = supplierConfig();
  const missing: string[] = [];
  if (!c.base) missing.push("SUPPLIER_API_BASE");
  if (!c.orderPath) missing.push("SUPPLIER_ORDER_PATH");
  if (!c.key) missing.push("SUPPLIER_API_KEY");
  return missing;
}

/** One ordered line, as the order recorder already has it. */
export interface OrderedGoods {
  productId: string;
  variant: string;
  qty: number;
  engraving: string | null;
}

/**
 * The catalogue's own view of each ordered product: its name and the supplier's
 * SKU for the chosen variant. Read from the database rather than from anything
 * the browser sent, for the same reason prices are.
 */
async function catalogueFor(
  db: SupabaseClient,
  productIds: string[],
): Promise<Map<string, { name: string; skus: Map<string, string> }>> {
  const out = new Map<string, { name: string; skus: Map<string, string> }>();
  if (!productIds.length) return out;
  const { data } = await db.from("products").select("id, name, variants").in("id", productIds);
  for (const row of (data ?? []) as { id: string; name: string; variants: { code: string; supplierSku?: string }[] | null }[]) {
    const skus = new Map<string, string>();
    for (const v of row.variants ?? []) if (v.supplierSku) skus.set(v.code, v.supplierSku);
    out.set(row.id, { name: row.name, skus });
  }
  return out;
}

/**
 * Builds what the supplier would be sent for one paid order — the dropshipped
 * lines only, since the house pours its own fragrance. Returns null when there
 * is nothing to dropship, which is the common case and not an error.
 */
export async function buildSupplierPayload(
  db: SupabaseClient,
  args: {
    orderRef: string;
    lines: OrderedGoods[];
    currency: string;
    email: string;
    address: SupplierAddress;
  },
): Promise<SupplierPayload | null> {
  const goods = args.lines.filter((l) => l.productId && l.variant && l.qty > 0);
  if (!goods.length) return null;

  const catalogue = await catalogueFor(db, [...new Set(goods.map((l) => l.productId))]);
  return {
    orderRef: args.orderRef,
    placedAt: new Date().toISOString(),
    currency: args.currency,
    email: args.email,
    address: args.address,
    lines: goods.map((l) => {
      const entry = catalogue.get(l.productId);
      return {
        productId: l.productId,
        variant: l.variant,
        sku: entry?.skus.get(l.variant),
        qty: l.qty,
        name: entry?.name ?? l.productId,
        engraving: l.engraving,
      };
    }),
  };
}

/**
 * Writes the queue row. `on conflict do nothing` lives in the RPC, so the
 * webhook and /api/stripe/confirm racing each other cannot place an order
 * twice — whichever arrives second is a no-op.
 */
export async function queueSupplierOrder(db: SupabaseClient, payload: SupplierPayload): Promise<boolean> {
  const { data, error } = await db.rpc("queue_supplier_order", {
    p_order_ref: payload.orderRef,
    p_supplier: supplierConfig().name,
    p_payload: payload as unknown as Record<string, unknown>,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

function readPath(body: unknown, dotted: string): string | null {
  let cur: unknown = body;
  for (const key of dotted.split(".")) {
    if (!cur || typeof cur !== "object") return null;
    cur = (cur as Record<string, unknown>)[key];
  }
  return typeof cur === "string" || typeof cur === "number" ? String(cur) : null;
}

/**
 * Posts one queued order. Returns what happened rather than throwing, because
 * every caller wants to record the outcome and carry on: a failure here is a
 * row to retry, not an error to surface to a customer who has already paid.
 */
export async function dispatchSupplierOrder(payload: SupplierPayload): Promise<
  { ok: true; supplierOrderId: string | null } | { ok: false; error: string }
> {
  const c = supplierConfig();
  if (!c.base || !c.orderPath) return { ok: false, error: "No supplier endpoint configured" };
  const headers: Record<string, string> = { "Content-Type": "application/json", Accept: "application/json" };
  if (c.key) headers[c.authHeader] = c.authScheme ? `${c.authScheme} ${c.key}` : c.key;

  try {
    const res = await fetch(`${c.base}${c.orderPath.startsWith("/") ? "" : "/"}${c.orderPath}`, {
      method: c.method,
      headers,
      body: JSON.stringify(payload),
      // A supplier that hangs must not hold a serverless function open.
      signal: AbortSignal.timeout(15000),
    });
    const text = await res.text();
    if (!res.ok) return { ok: false, error: `${res.status} ${text.slice(0, 300)}` };
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      /* a supplier that answers 200 with a non-JSON body still succeeded */
    }
    return { ok: true, supplierOrderId: parsed ? readPath(parsed, c.idField) : null };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Supplier request failed" };
  }
}

export async function settleSupplierOrder(
  db: SupabaseClient,
  orderRef: string,
  status: "sent" | "failed" | "manual" | "cancelled",
  supplierOrderId: string | null,
  error: string | null,
): Promise<void> {
  await db.rpc("settle_supplier_order", {
    p_order_ref: orderRef,
    p_status: status,
    p_supplier_order_id: supplierOrderId,
    p_error: error,
  });
}

/**
 * Queue, then try to send. Called straight after the order is recorded, and
 * deliberately swallowing everything: the payment is already taken, so the
 * worst outcome here is a queue row somebody dispatches later.
 */
export async function handOffToSupplier(
  db: SupabaseClient,
  args: Parameters<typeof buildSupplierPayload>[1],
): Promise<void> {
  try {
    const payload = await buildSupplierPayload(db, args);
    if (!payload) return;
    const queued = await queueSupplierOrder(db, payload);
    if (!queued) return; // already queued by whichever call got here first
    if (!canDispatch()) return; // export path: somebody places it in AliDrop
    const result = await dispatchSupplierOrder(payload);
    await settleSupplierOrder(
      db,
      payload.orderRef,
      result.ok ? "sent" : "failed",
      result.ok ? result.supplierOrderId : null,
      result.ok ? null : result.error,
    );
  } catch (e) {
    console.error(`handOffToSupplier: ${e instanceof Error ? e.message : String(e)}`);
  }
}
