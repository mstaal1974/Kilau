import { CATEGORY_BY_ID, type Product, anyInStock, fromPrice } from "../../lib/goods";
import { GOLD, CREAM, money } from "../../lib/data";
import { navigate, paths } from "../../lib/route";
import GoodsImage from "./GoodsArt";
import { Arrow } from "../ui";
import { MONO, SERIF, btnLink, micro } from "../styles";

/**
 * Collection tile for a piece of goods. Same frame as the fragrance card so a
 * mixed grid reads as one shop, but the second line is the category rather than
 * the reference fragrance, and the price is a "from" only where the variants
 * disagree about it.
 */
export default function GoodsCard({ product, vip }: { product: Product; vip: boolean }) {
  const open = () => navigate(paths.goods(product.slug));
  const locked = !!product.vipOnly && !vip;
  const category = CATEGORY_BY_ID[product.category];
  const low = fromPrice(product);
  const spread = product.variants.some((v) => (v.price ?? product.price) !== low);
  const soldOut = !anyInStock(product);
  const swatches = product.variants.filter((v) => v.swatch).slice(0, 6);

  return (
    <article className="kb-card" style={{ border: "1px solid #e4ddd0", background: "#f7f4ee", display: "flex", flexDirection: "column" }}>
      <button onClick={open} aria-label={`Open ${product.name}`} style={{ padding: 0, border: 0, background: "none", cursor: "pointer", position: "relative", display: "block" }}>
        <GoodsImage product={product} height={300} />
        {product.vipOnly && (
          <span style={{ position: "absolute", top: 12, left: 12, ...micro, color: GOLD, border: "1px solid rgba(184,135,60,0.38)", background: "#ffffff", padding: "4px 8px" }}>VIP</span>
        )}
        {soldOut && (
          <span style={{ position: "absolute", top: 12, right: 12, ...micro, color: "#14120e", border: "1px solid #9c9078", background: "#ffffff", padding: "4px 8px" }}>Sold out</span>
        )}
      </button>

      <div style={{ padding: "16px 18px 18px", display: "flex", flexDirection: "column", gap: 9, flex: 1 }}>
        <button onClick={open} style={{ background: "none", border: 0, padding: 0, cursor: "pointer", textAlign: "left", fontFamily: SERIF, fontSize: 22, letterSpacing: "0.04em", color: CREAM, lineHeight: 1.1 }}>
          {product.name}
        </button>
        <div style={{ ...micro, color: "rgba(20,18,14,0.82)", fontSize: 8.5 }}>{category?.name}</div>
        <div style={{ fontSize: 12.5, color: "rgba(20,18,14,0.68)", lineHeight: 1.5 }}>{product.tagline}</div>

        {swatches.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }} aria-hidden>
            {swatches.map((v) => (
              // The ring, not the fill, carries the contrast: a shade swatch has
              // to show the actual shade, and the palest skin tint is lighter
              // than 3:1 on paper by definition.
              <span key={v.code} title={v.label} style={{ width: 15, height: 15, borderRadius: "50%", background: v.swatch, border: "1px solid #9c9078" }} />
            ))}
            {product.variants.filter((v) => v.swatch).length > swatches.length && (
              <span style={{ ...micro, fontSize: 8, color: "rgba(20,18,14,0.74)" }}>+{product.variants.filter((v) => v.swatch).length - swatches.length}</span>
            )}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 2 }}>
          <span style={{ fontFamily: MONO, fontSize: 12, color: CREAM }}>
            {spread ? `From ${money(low)}` : money(low)}
          </span>
          {product.compareAt && (
            <span style={{ fontFamily: MONO, fontSize: 11, color: "rgba(20,18,14,0.68)", textDecoration: "line-through" }}>{money(product.compareAt)}</span>
          )}
        </div>

        <div style={{ marginTop: "auto", paddingTop: 8 }}>
          <button style={{ ...btnLink, color: locked ? "rgba(20,18,14,0.74)" : GOLD, fontSize: 9, whiteSpace: "nowrap" }} onClick={() => (locked ? navigate(paths.about) : open())}>
            {locked ? "VIP members only" : soldOut ? <>View piece <Arrow size={10} /></> : <>Choose options <Arrow size={10} /></>}
          </button>
        </div>
      </div>
    </article>
  );
}
