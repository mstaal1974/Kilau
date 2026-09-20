// The dropship queue, from the admin console's side.
//
// Every paid order containing a dropshipped line lands in `supplier_orders`.
// This module reads that queue and acts on it; /api/supplier/orders does the
// work, because the queue holds customer addresses and only the service role
// may read it.

import { supabase } from "./supabase";

export type SupplierStatus = "pending" | "sent" | "failed" | "cancelled" | "manual";

export interface SupplierQueueLine {
  productId: string;
  variant: string;
  sku?: string;
  qty: number;
  name: string;
  engraving: string | null;
}

export interface SupplierQueueOrder {
  order_ref: string;
  supplier: string;
  status: SupplierStatus;
  supplier_order_id: string | null;
  tracking_number: string | null;
  attempts: number;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
  payload: {
    orderRef: string;
    placedAt: string;
    currency: string;
    email: string;
    address: { name: string; phone?: string; line1?: string; city?: string; region?: string; postcode?: string; country: string; notes?: string };
    lines: SupplierQueueLine[];
  };
}

export interface SupplierQueue {
  supplier: string;
  /** False until an endpoint is configured — then the queue posts itself. */
  canDispatch: boolean;
  /** Which environment variables are still missing, for the empty state. */
  missing: string[];
  dryRun: boolean;
  counts: Partial<Record<SupplierStatus, number>>;
  orders: SupplierQueueOrder[];
}

async function headers(): Promise<Record<string, string>> {
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (supabase) {
    const { data } = await supabase.auth.getSession();
    if (data.session?.access_token) h.Authorization = `Bearer ${data.session.access_token}`;
  }
  return h;
}

/** Null when the route isn't deployed, so the panel can say so rather than spin. */
export async function loadQueue(status?: SupplierStatus): Promise<SupplierQueue | { error: string } | null> {
  try {
    const qs = status ? `?status=${status}` : "";
    const res = await fetch(`/api/supplier/orders${qs}`, { headers: await headers() });
    const type = res.headers.get("content-type") ?? "";
    if (res.status === 404 || !type.includes("application/json")) return null;
    const body = (await res.json()) as SupplierQueue & { error?: string; detail?: string };
    if (!res.ok) return { error: [body.error, body.detail].filter(Boolean).join(" — ") || `Request failed (${res.status})` };
    return body;
  } catch {
    return null;
  }
}

async function post(body: Record<string, unknown>): Promise<{ ok: true; data: Record<string, unknown> } | { ok: false; error: string }> {
  try {
    const res = await fetch("/api/supplier/orders", { method: "POST", headers: await headers(), body: JSON.stringify(body) });
    const type = res.headers.get("content-type") ?? "";
    if (!type.includes("application/json")) return { ok: false, error: `Request failed (${res.status})` };
    const data = (await res.json()) as Record<string, unknown> & { error?: string; detail?: string };
    if (!res.ok) return { ok: false, error: [data.error, data.detail].filter(Boolean).join(" — ") || `Request failed (${res.status})` };
    return { ok: true, data };
  } catch {
    return { ok: false, error: "Could not reach the server" };
  }
}

/** Posts every pending and retryable order to the supplier. */
export function dispatchQueue() {
  return post({ action: "dispatch" });
}

/** Takes one order out of the queue after placing it in AliDrop by hand. */
export function markPlaced(orderRef: string, supplierOrderId?: string) {
  return post({ action: "mark", orderRef, status: "manual", supplierOrderId });
}

export function cancelOrder(orderRef: string) {
  return post({ action: "mark", orderRef, status: "cancelled" });
}

/**
 * Downloads the queue as CSV. The browser carries the admin session on the
 * fetch, so the file is pulled and saved rather than linked — a plain <a> to
 * the route would arrive unauthenticated.
 */
export async function downloadQueueCsv(status: SupplierStatus = "pending"): Promise<string | null> {
  try {
    const res = await fetch(`/api/supplier/orders?format=csv&status=${status}`, { headers: await headers() });
    if (!res.ok) return "Could not export the queue";
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `supplier-orders-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    return null;
  } catch {
    return "Could not export the queue";
  }
}
