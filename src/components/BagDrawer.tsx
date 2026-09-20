import { useEffect, useMemo } from "react";
import { type Fragrance, GOLD, CREAM, money } from "../lib/data";
import { type BagLine, type Order, setQty, removeLine } from "../lib/bag";
import { rowsFor, subtotalOf } from "../lib/bagRows";
import type { Product } from "../lib/goods";
import { sku as skuOf, FORMAT_BY_KEY } from "../lib/formats";
import { navigate, paths } from "../lib/route";
import BottleImage from "./BottleImage";
import { GoodsArt } from "./goods/GoodsArt";
import { Arrow, Icon } from "./ui";
import { MONO, SERIF, btnGold, btnGhost, btnLink, micro } from "./styles";

interface BagDrawerProps {
  lines: BagLine[];
  fragrances: Fragrance[];
  products: Product[];
  placed: Order[] | null; // just-placed orders → confirmation view
  onClose: () => void;
  /** Continue to the checkout page (contact, delivery, payment). */
  onCheckout: () => void;
  onAddCar: (f: Fragrance) => void;
}

/**
 * Your bag. Lines are format SKUs of a fragrance; "Checkout" carries the bag
 * to the checkout page, where contact and delivery are filled in before Stripe
 * takes the payment. The Drive cross-sell lives here because "take it with
 * you" is the obvious add at the end.
 */
export default function BagDrawer({ lines, fragrances, products, placed, onClose, onCheckout, onAddCar }: BagDrawerProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const byId = useMemo(() => new Map(fragrances.map((f) => [f.id, f])), [fragrances]);
  const rows = useMemo(() => rowsFor(lines, fragrances, products), [lines, fragrances, products]);
  const subtotal = subtotalOf(rows);
  // The Drive cross-sell only makes sense against a fragrance you are already
  // buying, so it reads the fragrance lines and ignores the rest of the bag.
  const crossSell = rows.find(
    (r) =>
      r.line.kind === "fragrance" &&
      FORMAT_BY_KEY[r.line.format].group === "wear" &&
      r.art.kind === "fragrance" &&
      !lines.some((l) => l.kind === "fragrance" && l.fragranceId === (r.art as { frag: Fragrance }).frag.id && l.format === "car") &&
      skuOf((r.art as { frag: Fragrance }).frag, "car").buyable,
  )?.art as { kind: "fragrance"; frag: Fragrance } | undefined;
  const crossSellFrag = crossSell?.frag;

  return (
    <div role="dialog" aria-modal="true" aria-label="Your bag" style={{ position: "fixed", inset: 0, zIndex: 95, display: "flex", justifyContent: "flex-end" }}>
      <div onClick={onClose} style={{ position: "absolute", inset: 0, background: "rgba(20,18,14,0.1)", backdropFilter: "blur(3px)" }} />
      <aside className="kb-drawer kb-scroll" style={{ position: "relative", width: 470, maxWidth: "100%", height: "100%", overflowY: "auto", background: "#ffffff", borderLeft: "1px solid #e4ddd0", padding: "28px 28px 96px", display: "flex", flexDirection: "column", gap: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, fontFamily: SERIF, fontSize: 26, color: CREAM }}>
            <Icon name="bag" size={18} /> {placed ? "Thank you" : "Your bag"}
          </div>
          <button onClick={onClose} aria-label="Close" style={{ background: "none", border: "1px solid #e4ddd0", color: CREAM, width: 34, height: 34, cursor: "pointer" }}>×</button>
        </div>

        {placed ? (
          <div style={{ display: "grid", gap: 16 }}>
            <p style={{ margin: 0, fontFamily: SERIF, fontSize: 20, lineHeight: 1.35, color: "rgba(20,18,14,0.9)" }}>
              Your order is <span style={{ color: GOLD }}>confirmed</span>. Each bottle is filled to order and ships within 5–7 business days.
            </p>
            {placed.map((o) => {
              const f = byId.get(o.fragranceId);
              return f ? (
                <div key={o.id} style={{ display: "flex", justifyContent: "space-between", gap: 12, borderTop: "1px solid #e4ddd0", paddingTop: 12 }}>
                  <span style={{ fontFamily: SERIF, fontSize: 16, color: CREAM }}>{f.name} <span style={{ color: "rgba(20,18,14,0.68)" }}>· {FORMAT_BY_KEY[o.format].name}{o.qty > 1 ? ` × ${o.qty}` : ""}</span></span>
                  <span style={{ fontFamily: MONO, fontSize: 12, color: CREAM }}>{money(o.chargeCents * o.qty)}</span>
                </div>
              ) : null;
            })}
            <button className="kb-cta" style={{ ...btnGold, justifyContent: "center", marginTop: 8 }} onClick={() => { onClose(); navigate(paths.account); }}>
              My orders <Arrow />
            </button>
            <button style={{ ...btnLink, justifyContent: "center" }} onClick={() => { onClose(); navigate(paths.fragrances); }}>Keep exploring</button>
          </div>
        ) : rows.length === 0 ? (
          <div style={{ display: "grid", gap: 16, marginTop: 20 }}>
            <p style={{ margin: 0, fontFamily: SERIF, fontSize: 22, color: "rgba(20,18,14,0.82)", lineHeight: 1.3 }}>Your bag is empty. One scent, every part of your day — start with the one you'd wear.</p>
            <button className="kb-cta" style={{ ...btnGold, justifyContent: "center" }} onClick={() => { onClose(); navigate(paths.fragrances); }}>Shop fragrances <Arrow /></button>
            <button style={{ ...btnLink, justifyContent: "center" }} onClick={() => { onClose(); navigate(paths.find()); }}>Find your scent</button>
          </div>
        ) : (
          <>
            <div style={{ display: "grid", gap: 12 }}>
              {rows.map((row) => {
                const { line } = row;
                return (
                  <div key={line.id} style={{ display: "grid", gridTemplateColumns: "64px 1fr auto", gap: 14, alignItems: "center", borderBottom: "1px solid #e4ddd0", paddingBottom: 12 }}>
                    {row.art.kind === "fragrance" ? (
                      <BottleImage imageUrl={row.art.frag.imageUrl} fallbackSrc="/assets/bottle-square.jpg" alt="" accent={row.art.frag.accent} liquid={row.art.frag.liquid} height={76} />
                    ) : (
                      <span style={{ border: "1px solid #e4ddd0", overflow: "hidden", display: "block" }}>
                        <GoodsArt product={row.art.product} height={76} />
                      </span>
                    )}
                    <div>
                      <div style={{ fontFamily: SERIF, fontSize: 18, color: CREAM, lineHeight: 1.05 }}>{row.name}</div>
                      <div style={{ ...micro, marginTop: 4 }}>{row.detail}{row.engraving ? ` · “${row.engraving}”` : ""}</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
                        <button aria-label="Decrease" onClick={() => setQty(line.id, line.qty - 1)} style={{ width: 26, height: 26, border: "1px solid #e4ddd0", background: "none", color: CREAM, cursor: "pointer" }}>−</button>
                        <span style={{ fontFamily: MONO, fontSize: 12, color: CREAM, minWidth: 14, textAlign: "center" }}>{line.qty}</span>
                        <button aria-label="Increase" onClick={() => setQty(line.id, line.qty + 1)} style={{ width: 26, height: 26, border: "1px solid #e4ddd0", background: "none", color: CREAM, cursor: "pointer" }}>+</button>
                        <button onClick={() => removeLine(line.id)} style={{ ...btnLink, color: "rgba(20,18,14,0.68)", marginLeft: 8, fontSize: 8.5 }}>Remove</button>
                      </div>
                    </div>
                    <span style={{ fontFamily: MONO, fontSize: 13, color: CREAM }}>{money(row.unit * row.qty)}</span>
                  </div>
                );
              })}
            </div>

            {crossSellFrag && (
              <div style={{ border: "1px solid rgba(184,135,60,0.3)", padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
                <div>
                  <div style={{ fontFamily: SERIF, fontSize: 17, color: CREAM }}>Love {crossSellFrag.name}? Take it with you.</div>
                  <div style={{ ...micro, marginTop: 4 }}>Car diffuser · {money(skuOf(crossSellFrag, "car").price)}</div>
                </div>
                <button className="kb-ghost" style={{ ...btnGhost, height: 36, fontSize: 9 }} onClick={() => onAddCar(crossSellFrag)}>Add car diffuser</button>
              </div>
            )}

            <div style={{ marginTop: "auto", borderTop: "1px solid #e4ddd0", paddingTop: 14, display: "grid", gap: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 12, color: CREAM }}>
                <span style={micro}>Subtotal</span>
                <span>{money(subtotal)}</span>
              </div>
              <div style={{ ...micro, fontSize: 8 }}>Delivery and postage are chosen at checkout</div>

              <div style={{ ...micro, fontSize: 8, display: "flex", gap: 14 }}>
                <span><Icon name="truck" size={12} color="rgba(20,18,14,0.74)" /> Free shipping over $100</span>
                <span><Icon name="refresh" size={12} color="rgba(20,18,14,0.74)" /> 30-day returns</span>
              </div>
              <button className="kb-cta" style={{ ...btnGold, justifyContent: "center" }} onClick={onCheckout}>
                Checkout <Arrow />
              </button>
              <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.55, color: "rgba(20,18,14,0.68)" }}>
                Secure card checkout by Stripe. Free shipping over $100 and 30-day returns.
              </p>
            </div>
          </>
        )}
      </aside>
    </div>
  );
}
