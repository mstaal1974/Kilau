import type { ReactNode } from "react";
import { money, GOLD_LEAF } from "../lib/data";

export interface Order {
  /**
   * What was bought, already resolved against whichever catalogue it came
   * from: the account page shows fragrance and goods in one list, so it is
   * handed a name and a link rather than a fragrance row.
   */
  item: { id: string; name: string; href: string };
  sizeMl?: number;
  formatLabel?: string; // e.g. "Car Diffuser 10ml"
  qty?: number;
  chargeCents?: number;
  engraving: string | null;
  status: "captured" | "authorized" | "released" | "void";
  placedAt?: string;
  shipmentStatus?: "pending" | "label_created" | "shipped" | "delivered" | "cancelled";
  carrier?: string;
  tracking?: string;
  trackingUrl?: string;
}

const SHIP_LABEL: Record<NonNullable<Order["shipmentStatus"]>, string> = {
  pending: "Preparing",
  label_created: "Label created",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

/** Payment state, in shop language. */
const STATUS: Record<Order["status"], { label: string; color: string; bg: string }> = {
  captured: { label: "Paid", color: "#2f6b3e", bg: "rgba(139,185,138,0.12)" },
  authorized: { label: "Processing", color: "#8a6215", bg: "rgba(138,98,21,1)" },
  released: { label: "Refunded", color: "rgba(20,18,14,0.68)", bg: "rgba(20,18,14,0.06)" },
  void: { label: "Cancelled", color: "rgba(20,18,14,0.68)", bg: "rgba(20,18,14,0.06)" },
};

interface MyOrdersProps {
  orders: Order[];
  loading: boolean;
  onOpen: (href: string) => void;
  onBackToVault: () => void;
  /** The Monthly Pour panel, rendered above the orders. */
  subscriptionSlot?: ReactNode;
  /** Privacy & preferences, rendered below the orders. */
  preferencesSlot?: ReactNode;
  /** Back from Stripe Checkout: what just happened. */
  notice?: ReactNode;
}

const fmtDate = (d?: string) => (d ? new Date(d).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" }) : "");

/** Account: everything the customer has bought, plus their subscription and preferences. */
export default function MyOrders({ orders, loading, onOpen, onBackToVault, subscriptionSlot, preferencesSlot, notice }: MyOrdersProps) {
  return (
    <main data-screen-label="Account" style={{ maxWidth: 1340, margin: "0 auto", padding: "48px 32px 90px" }}>
      <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 10, letterSpacing: "0.28em", textTransform: "uppercase", color: "rgba(138,98,21,1)" }}>
        Your Account
      </div>
      <h1 style={{ margin: "14px 0 0", fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, fontSize: 54, lineHeight: 1.02, color: "#14120e" }}>
        My <span style={{ fontStyle: "italic", color: "#8a6215" }}>Orders.</span>
      </h1>
      <p style={{ margin: "16px 0 0", maxWidth: 520, fontSize: 14, lineHeight: 1.7, color: "rgba(20,18,14,0.68)" }}>
        Everything you've bought from the house, with tracking once each parcel is on its way.
      </p>

      {notice}

      {subscriptionSlot}

      <div style={{ marginTop: 40 }}>
        <h2 style={{ margin: "0 0 18px", fontFamily: "'Cormorant Garamond',serif", fontWeight: 300, fontSize: 34, color: "#14120e" }}>
          Order <span style={{ fontStyle: "italic", color: "#8a6215" }}>history.</span>
        </h2>
        {loading ? (
          <p style={{ fontSize: 13, color: "rgba(20,18,14,0.68)" }}>Loading your orders…</p>
        ) : orders.length === 0 ? (
          <div style={{ border: "1px solid #e4ddd0", padding: "60px 0", textAlign: "center" }}>
            <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, color: "rgba(20,18,14,0.74)" }}>No orders yet.</div>
            <p style={{ margin: "12px 0 0", fontSize: 12.5, color: "rgba(20,18,14,0.68)" }}>Your first bottle will appear here.</p>
            <button
              className="kb-cta"
              onClick={onBackToVault}
              style={{ marginTop: 24, background: GOLD_LEAF, color: "#14120e", border: 0, cursor: "pointer", height: 44, padding: "0 24px", fontSize: 10.5, letterSpacing: "0.24em", textTransform: "uppercase", fontWeight: 600 }}
            >
              Shop the collection
            </button>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 16 }}>
            {orders.map((o, i) => {
              const s = STATUS[o.status];
              return (
                <div
                  key={`${o.item.id}-${i}`}
                  className="kb-card"
                  style={{ border: "1px solid #e4ddd0", background: "#f7f4ee", padding: 24, cursor: "pointer" }}
                  onClick={() => onOpen(o.item.href)}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 28, color: "#14120e", lineHeight: 1 }}>{o.item.name}</div>
                      <div style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", fontFamily: "'Space Mono',monospace", fontSize: 11, color: "rgba(20,18,14,0.74)" }}>
                        <span>
                          {o.formatLabel ?? (o.sizeMl ? `${o.sizeMl} ml` : "")}
                          {o.qty && o.qty > 1 ? ` × ${o.qty}` : ""}
                        </span>
                        {o.chargeCents != null && (
                          <>
                            <span style={{ opacity: 0.4 }}>/</span>
                            <span style={{ color: "#8a6215" }}>{money(o.chargeCents)}</span>
                          </>
                        )}
                        {o.placedAt && (
                          <>
                            <span style={{ opacity: 0.4 }}>/</span>
                            <span>{fmtDate(o.placedAt)}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <span
                      style={{ flexShrink: 0, fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: "0.16em", textTransform: "uppercase", color: s.color, background: s.bg, border: `1px solid ${s.color}`, padding: "5px 10px" }}
                    >
                      {s.label}
                    </span>
                  </div>

                  {o.engraving && (
                    <div style={{ marginTop: 16 }}>
                      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 9, letterSpacing: "0.2em", textTransform: "uppercase", color: "rgba(20,18,14,0.68)" }}>Engraving</span>
                      <span style={{ marginLeft: 12, fontFamily: "'Cormorant Garamond',serif", fontStyle: "italic", fontSize: 18, color: "#8a6215" }}>“{o.engraving}”</span>
                    </div>
                  )}

                  {o.shipmentStatus && (
                    <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid #e4ddd0", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: "#2f6b3e" }}>
                        ● {SHIP_LABEL[o.shipmentStatus]}
                        {o.carrier ? ` · ${o.carrier}` : ""}
                      </span>
                      {o.tracking &&
                        (o.trackingUrl ? (
                          <a
                            href={o.trackingUrl}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="kb-link"
                            style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: "#8a6215", textDecoration: "none" }}
                          >
                            Track · {o.tracking}
                          </a>
                        ) : (
                          <span style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: "rgba(20,18,14,0.68)" }}>{o.tracking}</span>
                        ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {preferencesSlot}
    </main>
  );
}
