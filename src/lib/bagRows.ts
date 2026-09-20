// Resolving a bag line against the two catalogues.
//
// The bag holds two kinds of thing — a fragrance in a format, a piece of goods
// in a variant — and the drawer, the checkout summary and the order confirmation
// all want the same five facts about each: what it is called, which version of
// it, what one costs, where it links, and what to draw. Working that out in
// each of those three components is how they drift apart, so it happens once,
// here, and they render rows.

import type { BagLine } from "./bag";
import { type Fragrance, money } from "./data";
import { type Product, lineName, variantLabel, variantOf, variantPrice } from "./goods";
import { sku } from "./formats";
import { paths } from "./route";

export interface BagRow {
  line: BagLine;
  /** The product's own name — "Smoky Obsidian", "Sanur Slip Dress". */
  name: string;
  /** Which version of it — "Eau de Parfum 50ml", "Size M", "Tan leather". */
  detail: string;
  /** Cents, for one. */
  unit: number;
  qty: number;
  engraving: string | null;
  href: string;
  /** What to draw, and which catalogue row it came from. */
  art: { kind: "fragrance"; frag: Fragrance } | { kind: "goods"; product: Product };
}

export function rowsFor(lines: BagLine[], fragrances: Fragrance[], products: Product[]): BagRow[] {
  const fragById = new Map(fragrances.map((f) => [f.id, f]));
  const prodById = new Map(products.map((p) => [p.id, p]));
  const rows: BagRow[] = [];
  for (const line of lines) {
    if (line.kind === "goods") {
      const product = prodById.get(line.productId);
      // A line whose product has left the catalogue is dropped rather than
      // rendered half-resolved; the server would refuse it at checkout anyway.
      if (!product) continue;
      const variant = variantOf(product, line.variant);
      rows.push({
        line,
        name: product.name,
        // "M" alone is ambiguous in a bag of mixed things; "Size M" is not.
        // A shade or a strap already names itself, so it is left as it is.
        detail: !variant || product.variantKind === "one"
          ? product.tagline
          : product.variantKind === "size"
            ? `${variantLabel(product.variantKind)} ${variant.label}`
            : variant.label,
        unit: line.unitPrice ?? variantPrice(product, line.variant),
        qty: line.qty,
        engraving: line.engraving,
        href: paths.goods(product.slug),
        art: { kind: "goods", product },
      });
      continue;
    }
    const frag = fragById.get(line.fragranceId);
    if (!frag) continue;
    const s = sku(frag, line.format);
    rows.push({
      line,
      name: frag.name,
      detail: line.label ? `${s.def.name} · ${line.label}` : s.def.name,
      unit: line.unitPrice ?? s.price,
      qty: line.qty,
      engraving: line.engraving,
      href: paths.product(frag.slug),
      art: { kind: "fragrance", frag },
    });
  }
  return rows;
}

export function subtotalOf(rows: BagRow[]): number {
  return rows.reduce((n, r) => n + r.unit * r.qty, 0);
}

/** "$329 × 2" for a line that has more than one of something. */
export function unitLabel(row: BagRow): string {
  return row.qty > 1 ? `${money(row.unit)} × ${row.qty}` : money(row.unit);
}

/** The name an order row, receipt or packing sheet carries. */
export function orderLineName(row: BagRow): string {
  return row.art.kind === "goods" ? lineName(row.art.product, (row.line as { variant: string }).variant) : `${row.name} — ${row.detail}`;
}
