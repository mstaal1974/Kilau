import { useCallback, useEffect, useState } from "react";
import {
  type SupplierQueue,
  type SupplierStatus,
  cancelOrder,
  dispatchQueue,
  downloadQueueCsv,
  loadQueue,
  markPlaced,
} from "../lib/dropship";
import { btnGhost, btnGold, label } from "./adminStyles";

const FILTERS: { id: SupplierStatus | "all"; name: string }[] = [
  { id: "pending", name: "Pending" },
  { id: "failed", name: "Failed" },
  { id: "sent", name: "Sent" },
  { id: "manual", name: "Placed by hand" },
  { id: "all", name: "All" },
];

const STATUS_TONE: Record<SupplierStatus, string> = {
  pending: "#7a5a12",
  sent: "#2f6b3e",
  failed: "#a32e24",
  manual: "#2f6b3e",
  cancelled: "rgba(20,18,14,0.68)",
};

const fmt = (iso: string) => new Date(iso).toLocaleString(undefined, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

/**
 * The dropship queue.
 *
 * Every paid order with a dropshipped line lands here. If an endpoint is
 * configured the queue posts itself and this is a monitor; if it is not — which
 * is where AliDrop leaves you until you have credentials, since it ships as a
 * Shopify/Woo/Wix app rather than a documented API — this is the working
 * screen: export the CSV, place the orders, mark them off.
 */
export default function AdminDropship() {
  const [filter, setFilter] = useState<SupplierStatus | "all">("pending");
  const [queue, setQueue] = useState<SupplierQueue | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "absent" | "error">("loading");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Bumped to ask the effect for a fresh read after an action.
  const [nonce, setNonce] = useState(0);

  // The fetch writes state only after its await, so the effect itself never
  // sets state synchronously; "loading" is set by whatever asked for the
  // reload — a filter button, or an action that just changed the queue.
  const reload = useCallback(async (f: SupplierStatus | "all") => {
    const result = await loadQueue(f === "all" ? undefined : f);
    if (result === null) return { state: "absent" as const };
    if ("error" in result) return { state: "error" as const, error: result.error };
    return { state: "ready" as const, queue: result };
  }, []);

  useEffect(() => {
    let active = true;
    void reload(filter).then((r) => {
      if (!active) return;
      if (r.state === "ready") setQueue(r.queue);
      if (r.state === "error") setMessage(r.error);
      setState(r.state);
    });
    return () => {
      active = false;
    };
  }, [filter, reload, nonce]);

  const act = async (fn: () => Promise<{ ok: boolean; error?: string; data?: Record<string, unknown> }>, done: string) => {
    setBusy(true);
    setMessage(null);
    const r = await fn();
    setBusy(false);
    setMessage(r.ok ? done : (r.error ?? "That didn't work"));
    if (r.ok) {
      setState("loading");
      setNonce((n) => n + 1);
    }
  };

  if (state === "absent") {
    return (
      <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "rgba(20,18,14,0.74)", maxWidth: 620 }}>
        The dropship route isn't deployed here. It lives at <code>/api/supplier/orders</code> and needs
        Supabase configured — in the offline demo there are no paid orders to queue.
      </p>
    );
  }

  const orders = queue?.orders ?? [];

  return (
    <div style={{ display: "grid", gap: 18 }}>
      {/* What the hand-off is doing right now */}
      {queue && (
        <div style={{ border: "1px solid #e4ddd0", background: "#f7f4ee", padding: "14px 16px", display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ ...label, color: "#14120e" }}>{queue.supplier}</span>
          <span style={{ fontSize: 13, color: "rgba(20,18,14,0.82)", lineHeight: 1.6 }}>
            {queue.canDispatch ? (
              <>Orders post automatically as they are paid. Anything that failed can be retried below.</>
            ) : queue.dryRun ? (
              <>
                <strong>Dry run.</strong> Orders are queued and exportable but never posted — unset <code>SUPPLIER_DRY_RUN</code> to send.
              </>
            ) : (
              <>
                Queued for manual placement. Export the CSV, place the orders in {queue.supplier}, then mark them off.
                {queue.missing.length > 0 && (
                  <>
                    {" "}To post them automatically, set{" "}
                    {queue.missing.map((v, i) => (
                      <span key={v}>
                        {i > 0 && ", "}
                        <code>{v}</code>
                      </span>
                    ))}
                    .
                  </>
                )}
              </>
            )}
          </span>
          <span style={{ marginLeft: "auto", display: "flex", gap: 14, ...label }}>
            {(["pending", "failed", "sent", "manual"] as SupplierStatus[]).map((k) =>
              queue.counts[k] ? (
                <span key={k} style={{ color: STATUS_TONE[k] }}>
                  {queue.counts[k]} {k}
                </span>
              ) : null,
            )}
          </span>
        </div>
      )}

      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
        {FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => {
              setState("loading");
              setFilter(f.id);
            }}
            style={{
              ...btnGhost,
              height: 32,
              padding: "0 12px",
              fontSize: 9.5,
              borderColor: filter === f.id ? "#8a6215" : "#e4ddd0",
              color: filter === f.id ? "#8a6215" : "rgba(20,18,14,0.82)",
            }}
          >
            {f.name}
          </button>
        ))}
        <span style={{ marginLeft: "auto", display: "flex", gap: 10 }}>
          <button
            style={{ ...btnGhost, height: 36 }}
            disabled={busy}
            onClick={() => void downloadQueueCsv(filter === "all" ? "pending" : filter).then((e) => e && setMessage(e))}
          >
            Export CSV
          </button>
          {queue?.canDispatch && (
            <button style={{ ...btnGold, height: 36 }} disabled={busy} onClick={() => void act(dispatchQueue, "Dispatched.")}>
              {busy ? "Sending…" : "Send pending"}
            </button>
          )}
        </span>
      </div>

      {message && (
        <p role="status" style={{ margin: 0, fontSize: 12.5, color: "#7a5a12" }}>
          {message}
        </p>
      )}

      {state === "loading" ? (
        <p style={{ fontSize: 13, color: "rgba(20,18,14,0.74)" }}>Loading the queue…</p>
      ) : orders.length === 0 ? (
        <p style={{ fontSize: 13.5, lineHeight: 1.7, color: "rgba(20,18,14,0.74)" }}>
          Nothing {filter === "all" ? "in the queue" : `marked ${filter}`}. Dropshipped lines appear here the moment an order is paid.
        </p>
      ) : (
        <div style={{ display: "grid", gap: 10 }}>
          {orders.map((o) => (
            <div key={o.order_ref} style={{ border: "1px solid #e4ddd0", background: "#ffffff", padding: "14px 16px", display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 14, alignItems: "baseline", flexWrap: "wrap" }}>
                <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 20, color: "#14120e" }}>{o.payload.address.name || o.payload.email}</span>
                <span style={{ ...label, color: STATUS_TONE[o.status] }}>● {o.status}</span>
                <span style={{ ...label }}>{fmt(o.created_at)}</span>
                {o.supplier_order_id && <span style={{ ...label }}>#{o.supplier_order_id}</span>}
                {o.attempts > 0 && <span style={{ ...label }}>{o.attempts} attempt{o.attempts === 1 ? "" : "s"}</span>}
              </div>

              <div style={{ display: "grid", gap: 4 }}>
                {o.payload.lines.map((l) => (
                  <div key={`${l.productId}:${l.variant}`} style={{ fontSize: 13, color: "rgba(20,18,14,0.82)", display: "flex", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ fontFamily: "'Space Mono',monospace", color: "#14120e" }}>{l.qty} ×</span>
                    <span>{l.name}</span>
                    <span style={{ color: "rgba(20,18,14,0.68)" }}>{l.variant}</span>
                    {l.sku && <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: "#7a5a12" }}>{l.sku}</span>}
                    {l.engraving && <span style={{ color: "rgba(20,18,14,0.68)" }}>“{l.engraving}”</span>}
                  </div>
                ))}
              </div>

              <div style={{ fontSize: 12.5, color: "rgba(20,18,14,0.74)", lineHeight: 1.6 }}>
                {[o.payload.address.line1, o.payload.address.city, o.payload.address.region, o.payload.address.postcode, o.payload.address.country]
                  .filter(Boolean)
                  .join(", ") || o.payload.address.notes || "Delivery arranged directly"}
                {o.payload.address.phone ? ` · ${o.payload.address.phone}` : ""}
              </div>

              {o.last_error && (
                <div role="alert" style={{ fontSize: 12, color: "#a32e24", lineHeight: 1.5 }}>
                  Last attempt: {o.last_error}
                </div>
              )}

              {(o.status === "pending" || o.status === "failed") && (
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                  <button style={{ ...btnGhost, height: 32, fontSize: 9.5 }} disabled={busy} onClick={() => void act(() => markPlaced(o.order_ref), "Marked as placed.")}>
                    I placed this
                  </button>
                  <button style={{ ...btnGhost, height: 32, fontSize: 9.5, color: "#a32e24" }} disabled={busy} onClick={() => void act(() => cancelOrder(o.order_ref), "Cancelled.")}>
                    Cancel
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
