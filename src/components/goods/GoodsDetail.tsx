import { useMemo, useState } from "react";
import {
  type Product,
  CATEGORY_BY_ID,
  DEPARTMENT_BY_ID,
  availability,
  buyable,
  defaultVariant,
  engravable,
  variantLabel,
  variantOf,
  variantPrice,
} from "../../lib/goods";
import { GOLD, CREAM, money } from "../../lib/data";
import { navigate, paths } from "../../lib/route";
import { GoodsGallery, GoodsThumb } from "./GoodsArt";
import GoodsCard from "./GoodsCard";
import { Arrow, Container, Icon } from "../ui";
import { MONO, SERIF, btnGold, btnLink, micro } from "../styles";

const ENGRAVE_MAX = 28;

interface Props {
  product: Product;
  products: Product[];
  vip: boolean;
  onAdd: (product: Product, variant: string, qty: number, engraving: string | null) => void;
}

/**
 * Product page for a piece of goods. The shape of the decision is different
 * from a fragrance — there the question is which format, here it is which size
 * or shade — so the picker leads, and it is a real picker: sold-out variants
 * stay visible and struck through rather than disappearing, because a shopper
 * needs to know their size existed and went, not wonder whether it is made.
 */
export default function GoodsDetail({ product, products, vip, onAdd }: Props) {
  const [code, setCode] = useState(() => defaultVariant(product));
  const [qty, setQty] = useState(1);
  const [engraveOn, setEngraveOn] = useState(false);
  const [engraving, setEngraving] = useState("");

  const department = DEPARTMENT_BY_ID[product.department];
  const category = CATEGORY_BY_ID[product.category];
  const chosen = variantOf(product, code);
  const price = variantPrice(product, code);
  const locked = !!product.vipOnly && !vip;
  const canBuy = buyable(product, code) && !locked;
  const canEngrave = engravable(product);
  const finalEngraving = canEngrave && engraveOn && engraving.trim() ? engraving.trim().slice(0, ENGRAVE_MAX) : null;
  const inStock = (chosen?.stock ?? 0) > 0;

  const alsoIn = useMemo(
    () => products.filter((p) => p.category === product.category && p.id !== product.id && p.status !== "hidden").slice(0, 4),
    [products, product],
  );

  return (
    <main data-screen-label={product.name}>
      <Container style={{ padding: "34px 32px 0" }}>
        <div className="kb-pdp-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0, 520px) minmax(0, 1fr)", gap: 46, alignItems: "start" }}>
          {/* The piece */}
          <div>
            <GoodsGallery product={product} selected={code} height={560} />
          </div>

          {/* The decision */}
          <div style={{ minWidth: 0 }}>
            <nav aria-label="Breadcrumb" style={{ ...micro, fontSize: 8.5, display: "flex", gap: 6, flexWrap: "wrap" }}>
              <button style={{ ...btnLink, color: "rgba(20,18,14,0.68)", fontSize: 8.5 }} onClick={() => navigate(paths.home)}>Home</button> /
              <button style={{ ...btnLink, color: "rgba(20,18,14,0.68)", fontSize: 8.5 }} onClick={() => navigate(paths.department(department.slug))}>{department.short}</button> /
              <button style={{ ...btnLink, color: "rgba(20,18,14,0.68)", fontSize: 8.5 }} onClick={() => navigate(paths.category(category.slug))}>{category.name}</button> /
              <span style={{ color: "rgba(20,18,14,0.82)" }}>{product.name}</span>
            </nav>

            <h1 style={{ margin: "10px 0 0", fontFamily: SERIF, fontWeight: 400, fontSize: 50, lineHeight: 1.02, color: CREAM }}>{product.name}</h1>
            <div style={{ ...micro, color: "#7a5a12", marginTop: 10, letterSpacing: "0.3em" }}>{product.tagline}</div>
            <p style={{ margin: "14px 0 0", fontFamily: SERIF, fontSize: 17.5, lineHeight: 1.45, color: "rgba(20,18,14,0.82)", maxWidth: 620 }}>{product.story}</p>

            {/* Picker */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginTop: 26, gap: 16, flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontFamily: SERIF, fontWeight: 400, fontSize: 24, color: CREAM }}>
                {variantLabel(product.variantKind)}
                {chosen && product.variantKind !== "one" && (
                  <span style={{ fontFamily: MONO, fontSize: 12, color: "rgba(20,18,14,0.74)", marginLeft: 12, letterSpacing: "0.1em" }}>{chosen.label}</span>
                )}
              </h2>
              {product.variantKind === "size" && product.department !== "jewellery" && (
                <button style={btnLink} onClick={() => navigate(paths.help)}>Size &amp; fit <Arrow size={10} /></button>
              )}
            </div>

            <div style={{ marginTop: 12, display: "flex", gap: 8, flexWrap: "wrap" }}>
              {product.variants.map((v) => {
                const active = v.code === code;
                const out = v.stock <= 0;
                return (
                  <button
                    key={v.code}
                    onClick={() => setCode(v.code)}
                    aria-pressed={active}
                    title={out ? `${v.label} — sold out` : v.label}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      minWidth: product.variantKind === "size" ? 54 : undefined,
                      justifyContent: "center",
                      cursor: "pointer",
                      background: active ? "rgba(200,160,99,0.16)" : "#ffffff",
                      border: `1px solid ${active ? "#8a6215" : "#9c9078"}`,
                      color: out ? "rgba(20,18,14,0.62)" : "#14120e",
                      textDecoration: out ? "line-through" : "none",
                      padding: "0 12px",
                      height: 42,
                      fontFamily: MONO,
                      fontSize: 11,
                      letterSpacing: "0.1em",
                    }}
                  >
                    {v.swatch && <span aria-hidden style={{ width: 16, height: 16, borderRadius: "50%", background: v.swatch, border: "1px solid #9c9078" }} />}
                    {v.label}
                    {v.price != null && v.price !== product.price && (
                      <span style={{ color: "#7a5a12", fontSize: 10 }}>{money(v.price)}</span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Summary + add */}
            <div style={{ marginTop: 20, borderTop: "1px solid #e4ddd0", paddingTop: 16, display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 220 }}>
                <span style={{ width: 62, height: 78, flexShrink: 0, border: "1px solid #e4ddd0", overflow: "hidden" }}>
                  <GoodsThumb product={product} variant={code} height={76} />
                </span>
                <div>
                  <div style={{ fontFamily: SERIF, fontSize: 22, color: CREAM, lineHeight: 1 }}>{product.name}</div>
                  <div style={{ fontSize: 12.5, color: "rgba(20,18,14,0.74)", marginTop: 4, letterSpacing: "0.04em" }}>
                    {chosen && product.variantKind !== "one" ? `${variantLabel(product.variantKind)} ${chosen.label}` : product.tagline}
                  </div>
                  <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 4 }}>
                    <span style={{ fontFamily: MONO, fontSize: 14, color: CREAM }}>{money(price)}</span>
                    {product.compareAt && <span style={{ fontFamily: MONO, fontSize: 12, color: "rgba(20,18,14,0.68)", textDecoration: "line-through" }}>{money(product.compareAt)}</span>}
                  </div>
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", border: "1px solid #9c9078", height: 52, marginLeft: "auto" }}>
                <button aria-label="Decrease quantity" onClick={() => setQty((q) => Math.max(1, q - 1))} style={{ width: 44, height: "100%", background: "none", border: 0, color: CREAM, cursor: "pointer", fontSize: 18 }}>−</button>
                <span style={{ fontFamily: MONO, fontSize: 14, color: CREAM, minWidth: 28, textAlign: "center" }}>{qty}</span>
                <button aria-label="Increase quantity" onClick={() => setQty((q) => Math.min(9, q + 1))} style={{ width: 44, height: "100%", background: "none", border: 0, color: CREAM, cursor: "pointer", fontSize: 18 }}>+</button>
              </div>

              <button
                className="kb-cta"
                style={{ ...btnGold, height: 52, padding: "0 52px", fontSize: 12.5, letterSpacing: "0.28em", opacity: canBuy ? 1 : 0.5 }}
                disabled={!canBuy}
                onClick={() => onAdd(product, code, qty, finalEngraving)}
              >
                <Icon name="bag" size={14} color="#14120e" /> {locked ? "VIP members only" : inStock ? "Add to bag" : "Sold out"}
              </button>
            </div>

            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginTop: 10, flexWrap: "wrap", ...micro, fontSize: 8.5 }}>
              <span style={{ color: inStock ? "#2f6b3e" : "#a8431b" }}>● {availability(product, code)}</span>
              <span style={{ display: "flex", gap: 18 }}>
                <span><Icon name="truck" size={12} color="rgba(20,18,14,0.74)" /> Free shipping over $100</span>
                <span><Icon name="refresh" size={12} color="rgba(20,18,14,0.74)" /> 30-day returns</span>
              </span>
            </div>

            {canEngrave && (
              <div style={{ marginTop: 14, display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer", ...micro, color: CREAM }}>
                  <input type="checkbox" checked={engraveOn} onChange={(e) => setEngraveOn(e.target.checked)} /> Hand engraving
                </label>
                {engraveOn && (
                  <>
                    <input
                      className="kb-engrave-input"
                      value={engraving}
                      maxLength={ENGRAVE_MAX}
                      onChange={(e) => setEngraving(e.target.value)}
                      placeholder="e.g. 14 · II · 26"
                      aria-label="Engraving text"
                      style={{ flex: 1, minWidth: 220, background: "none", border: 0, borderBottom: "1px solid #b8873c", outline: "none", color: CREAM, fontFamily: SERIF, fontSize: 18, padding: "4px 0" }}
                    />
                    <span style={{ ...micro, fontSize: 8 }}>{engraving.length} / {ENGRAVE_MAX}</span>
                  </>
                )}
              </div>
            )}

            {/* Detail */}
            <div className="kb-notes-grid" style={{ marginTop: 30, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 26, borderTop: "1px solid #e4ddd0", paddingTop: 20 }}>
              <div>
                <div style={{ ...micro, color: GOLD }}>The piece</div>
                <ul style={{ margin: "10px 0 0", padding: 0, listStyle: "none", display: "grid", gap: 7 }}>
                  {product.details.map((d) => (
                    <li key={d} style={{ fontSize: 13, lineHeight: 1.6, color: "rgba(20,18,14,0.82)", paddingLeft: 14, position: "relative" }}>
                      <span aria-hidden style={{ position: "absolute", left: 0, color: "#7a5a12" }}>·</span>
                      {d}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <div style={{ ...micro, color: GOLD }}>Care &amp; delivery</div>
                <p style={{ margin: "10px 0 0", fontSize: 13, lineHeight: 1.6, color: "rgba(20,18,14,0.82)" }}>{product.care ?? "Keep it dry and out of direct sun."}</p>
                <p style={{ margin: "8px 0 0", fontSize: 13, lineHeight: 1.6, color: "rgba(20,18,14,0.74)" }}>
                  Posted from Denpasar by Australia Post, with the rate quoted at checkout. Thirty days to change your mind on anything unworn.
                </p>
              </div>
            </div>
          </div>
        </div>
      </Container>

      {alsoIn.length > 0 && (
        <Container style={{ padding: "44px 32px 60px" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, borderBottom: "1px solid #e4ddd0", paddingBottom: 12 }}>
            <h2 style={{ margin: 0, fontFamily: SERIF, fontWeight: 400, fontSize: 30, color: CREAM }}>Also in {category.name.toLowerCase()}</h2>
            <button style={btnLink} onClick={() => navigate(paths.category(category.slug))}>See all <Arrow size={10} /></button>
          </div>
          <div className="kb-also-grid" style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {alsoIn.map((p) => (
              <GoodsCard key={p.id} product={p} vip={vip} />
            ))}
          </div>
        </Container>
      )}
    </main>
  );
}
