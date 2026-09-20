// Pricing rules for goods on the server — the same job api/_lib/catalogue.ts
// does for fragrance, and for the same reason: the api folder runs on Vercel as
// plain ES modules without a bundler, so it cannot import src/lib/goods.ts.
// Keep the two in step; the checkout security test compares them.
//
// The seed below is a floor, not the catalogue. A deployment that has run the
// goods migration prices from the `products` table, and these rows only keep
// the offline demo and a not-yet-migrated deployment honest. Either way the
// browser never supplies a price.

export type GoodsStatus = "live" | "coming_soon" | "hidden";

export interface GoodsVariant {
  code: string;
  label: string;
  /** Cents. Absent means the product's own price. */
  price?: number;
  stock: number;
}

/** The slice of a product the pricing rules read. */
export interface GoodsItem {
  id: string;
  slug: string;
  name: string;
  /** Cents. */
  price: number;
  variantKind: string;
  variants: GoodsVariant[];
  /** Packed weight of one unit, grams. */
  grams: number;
  status: GoodsStatus;
  vipOnly?: boolean;
}

export function variantOf(p: GoodsItem, code: string): GoodsVariant | null {
  return p.variants.find((v) => v.code === code) ?? null;
}

export function goodsPrice(p: GoodsItem, code: string): number {
  return variantOf(p, code)?.price ?? p.price;
}

/**
 * Buyable now. A garment is not poured to order the way a fragrance is, so an
 * empty size is simply not for sale — there is no made-to-order fallback here.
 */
export function goodsBuyable(p: GoodsItem, code: string): boolean {
  const v = variantOf(p, code);
  return !!v && p.status === "live" && v.stock > 0;
}

/** The line's name on the Stripe receipt and the packing sheet. */
export function goodsLineName(p: GoodsItem, code: string): string {
  const v = variantOf(p, code);
  return v && p.variantKind !== "one" ? `${p.name} — ${v.label}` : p.name;
}

const sizes = (codes: string[], stock: number[]): GoodsVariant[] =>
  codes.map((c, i) => ({ code: c, label: c, stock: stock[i] ?? 0 }));

const W = ["XS", "S", "M", "L", "XL"];
const M = ["S", "M", "L", "XL", "XXL"];

export const GOODS_SEED: GoodsItem[] = [
  { id: "g1", slug: "sanur-slip-dress", name: "Sanur Slip Dress", price: 32900, variantKind: "size", variants: sizes(W, [4, 11, 14, 9, 3]), grams: 240, status: "live" },
  { id: "g2", slug: "ubud-shirt-dress", name: "Ubud Shirt Dress", price: 24900, variantKind: "size", variants: sizes(W, [6, 12, 15, 10, 5]), grams: 320, status: "live" },
  { id: "g3", slug: "batu-camisole", name: "Batu Camisole", price: 14900, variantKind: "size", variants: sizes(W, [8, 16, 18, 12, 6]), grams: 110, status: "live" },
  { id: "g4", slug: "canggu-open-shirt", name: "Canggu Open Shirt", price: 17900, variantKind: "size", variants: sizes(W, [5, 14, 16, 11, 4]), grams: 150, status: "live" },
  { id: "g5", slug: "seminyak-wide-trouser", name: "Seminyak Wide Trouser", price: 21900, variantKind: "size", variants: sizes(W, [7, 13, 17, 10, 6]), grams: 300, status: "live" },
  { id: "g6", slug: "tanah-wrap-skirt", name: "Tanah Wrap Skirt", price: 16900, variantKind: "size", variants: sizes(W, [6, 11, 13, 9, 4]), grams: 210, status: "live" },
  { id: "g7", slug: "kuta-one-piece", name: "Kuta One-Piece", price: 18900, variantKind: "size", variants: sizes(W, [5, 12, 14, 9, 5]), grams: 140, status: "live" },
  { id: "g8", slug: "jimbaran-kaftan", name: "Jimbaran Kaftan", price: 19900, variantKind: "one", variants: [{ code: "OS", label: "One size", stock: 22 }], grams: 260, status: "live" },
  { id: "g9", slug: "amed-linen-coat", name: "Amed Linen Coat", price: 36900, variantKind: "size", variants: sizes(W, [3, 8, 10, 7, 3]), grams: 520, status: "live" },
  { id: "g10", slug: "legian-camp-shirt", name: "Legian Camp Shirt", price: 19900, variantKind: "size", variants: sizes(M, [7, 15, 19, 13, 6]), grams: 260, status: "live" },
  { id: "g11", slug: "padang-gauze-shirt", name: "Padang Gauze Shirt", price: 21900, variantKind: "size", variants: sizes(M, [5, 13, 16, 11, 5]), grams: 220, status: "live" },
  { id: "g12", slug: "bukit-heavy-tee", name: "Bukit Heavy Tee", price: 9900, variantKind: "size", variants: sizes(M, [12, 24, 28, 19, 9]), grams: 230, status: "live" },
  { id: "g13", slug: "sidemen-knit-polo", name: "Sidemen Knit Polo", price: 16900, variantKind: "size", variants: sizes(M, [6, 14, 17, 12, 5]), grams: 280, status: "live" },
  { id: "g14", slug: "uluwatu-drawstring-trouser", name: "Uluwatu Drawstring Trouser", price: 21900, variantKind: "size", variants: sizes(M, [6, 14, 18, 12, 6]), grams: 310, status: "live" },
  { id: "g15", slug: "bingin-tailored-short", name: "Bingin Tailored Short", price: 14900, variantKind: "size", variants: sizes(M, [8, 16, 20, 14, 7]), grams: 240, status: "live" },
  { id: "g16", slug: "medewi-overshirt", name: "Medewi Overshirt", price: 27900, variantKind: "size", variants: sizes(M, [4, 9, 12, 8, 4]), grams: 480, status: "live" },
  {
    id: "g17", slug: "celuk-signet-ring", name: "Celuk Signet Ring", price: 24900, variantKind: "size", grams: 60, status: "live",
    variants: [
      { code: "52", label: "52 · L", stock: 5 }, { code: "54", label: "54 · N", stock: 8 },
      { code: "56", label: "56 · P", stock: 9 }, { code: "58", label: "58 · R", stock: 6 },
      { code: "60", label: "60 · T", stock: 4 },
    ],
  },
  {
    id: "g18", slug: "tirta-stacking-band", name: "Tirta Stacking Band", price: 11900, variantKind: "size", grams: 35, status: "live",
    variants: [
      { code: "52", label: "52 · L", stock: 9 }, { code: "54", label: "54 · N", stock: 14 },
      { code: "56", label: "56 · P", stock: 16 }, { code: "58", label: "58 · R", stock: 11 },
      { code: "60", label: "60 · T", stock: 7 },
    ],
  },
  {
    id: "g19", slug: "bulan-pendant", name: "Bulan Moon Pendant", price: 18900, variantKind: "length", grams: 45, status: "live",
    variants: [
      { code: "42", label: "42 cm · Choker", stock: 7 },
      { code: "50", label: "50 cm · Collar", stock: 12 },
      { code: "60", label: "60 cm · Long", stock: 8 },
    ],
  },
  {
    id: "g20", slug: "riak-chain", name: "Riak Chain", price: 22900, variantKind: "length", grams: 70, status: "live",
    variants: [{ code: "45", label: "45 cm", stock: 6 }, { code: "55", label: "55 cm", stock: 10 }],
  },
  { id: "g21", slug: "ombak-hoop", name: "Ombak Hoop", price: 14900, variantKind: "one", variants: [{ code: "PAIR", label: "Pair", stock: 18 }], grams: 30, status: "live" },
  { id: "g22", slug: "pasir-drop-earring", name: "Pasir Drop Earring", price: 16900, variantKind: "one", variants: [{ code: "PAIR", label: "Pair", stock: 11 }], grams: 25, status: "live" },
  {
    id: "g23", slug: "karang-cuff", name: "Karang Cuff", price: 19900, variantKind: "size", grams: 65, status: "live",
    variants: [{ code: "S", label: "S · 15 cm", stock: 6 }, { code: "M", label: "M · 17 cm", stock: 10 }, { code: "L", label: "L · 19 cm", stock: 5 }],
  },
  {
    id: "g24", slug: "kilau-lip-balm", name: "Kilau Tinted Lip Balm", price: 3900, variantKind: "shade", grams: 40, status: "live",
    variants: [
      { code: "BARE", label: "Bare", stock: 26 }, { code: "GUAVA", label: "Guava", stock: 21 },
      { code: "CLAY", label: "Clay", stock: 18 }, { code: "PLUM", label: "Plum", stock: 14 },
    ],
  },
  {
    id: "g25", slug: "kilau-satin-lipstick", name: "Kilau Satin Lipstick", price: 5900, variantKind: "shade", grams: 55, status: "live",
    variants: [
      { code: "TERRA", label: "Terra", stock: 16 }, { code: "ROSEWOOD", label: "Rosewood", stock: 19 },
      { code: "REDSALT", label: "Red Salt", stock: 13 }, { code: "COCOA", label: "Cocoa", stock: 11 },
    ],
  },
  {
    id: "g26", slug: "kilau-skin-tint", name: "Kilau Skin Tint", price: 6900, variantKind: "shade", grams: 110, status: "live",
    variants: [
      { code: "01", label: "01 · Porcelain", stock: 12 }, { code: "02", label: "02 · Sand", stock: 17 },
      { code: "03", label: "03 · Amber", stock: 16 }, { code: "04", label: "04 · Sienna", stock: 13 },
      { code: "05", label: "05 · Cocoa", stock: 10 }, { code: "06", label: "06 · Ebony", stock: 8 },
    ],
  },
  {
    id: "g27", slug: "kilau-cream-blush", name: "Kilau Cream Blush", price: 4900, variantKind: "shade", grams: 45, status: "live",
    variants: [{ code: "CORAL", label: "Coral Hour", stock: 20 }, { code: "FIG", label: "Fig", stock: 17 }, { code: "DUSK", label: "Dusk", stock: 14 }],
  },
  {
    id: "g28", slug: "kilau-kohl", name: "Kilau Kohl Pencil", price: 3400, variantKind: "shade", grams: 25, status: "live",
    variants: [{ code: "INK", label: "Ink", stock: 24 }, { code: "EARTH", label: "Earth", stock: 18 }, { code: "PALM", label: "Palm", stock: 12 }],
  },
  { id: "g29", slug: "kilau-eye-palette", name: "Kilau Four-Shade Palette", price: 7900, variantKind: "one", variants: [{ code: "WARM", label: "Warm neutrals", stock: 15 }], grams: 95, status: "live" },
  { id: "g30", slug: "kilau-facial-oil", name: "Kilau Facial Oil", price: 8900, variantKind: "one", variants: [{ code: "30ML", label: "30 ml", stock: 19 }], grams: 130, status: "live" },
  { id: "g31", slug: "kilau-body-oil", name: "Kilau Body Oil", price: 6900, variantKind: "one", variants: [{ code: "100ML", label: "100 ml", stock: 22 }], grams: 260, status: "live" },
  { id: "g32", slug: "kilau-mineral-spf", name: "Kilau Mineral SPF 50", price: 5400, variantKind: "one", variants: [{ code: "75ML", label: "75 ml", stock: 28 }], grams: 105, status: "live" },
  {
    id: "g33", slug: "kilau-surya-automatic", name: "Surya Automatic", price: 89900, variantKind: "band", grams: 420, status: "live",
    variants: [
      { code: "STEEL", label: "Steel bracelet", stock: 5 },
      { code: "TAN", label: "Tan leather", price: 84900, stock: 7 },
      { code: "BLACK", label: "Black leather", price: 84900, stock: 6 },
    ],
  },
  {
    id: "g34", slug: "kilau-bulan-automatic", name: "Bulan Automatic", price: 129900, variantKind: "band", grams: 460, status: "live", vipOnly: true,
    variants: [{ code: "STEEL", label: "Steel bracelet", stock: 3 }, { code: "NAVY", label: "Navy leather", price: 124900, stock: 4 }],
  },
  {
    id: "g35", slug: "kilau-pasir-quartz", name: "Pasir Quartz", price: 39900, variantKind: "band", grams: 260, status: "live",
    variants: [
      { code: "GOLD", label: "Gold-tone mesh", stock: 9 },
      { code: "CREAM", label: "Cream leather", price: 36900, stock: 11 },
      { code: "TAN", label: "Tan leather", price: 36900, stock: 8 },
    ],
  },
  {
    id: "g36", slug: "kilau-ombak-quartz", name: "Ombak Quartz", price: 44900, variantKind: "band", grams: 300, status: "live",
    variants: [{ code: "STEEL", label: "Steel bracelet", stock: 6 }, { code: "BLACK", label: "Black leather", price: 41900, stock: 9 }],
  },
  {
    id: "g37", slug: "kilau-quick-release-strap", name: "Quick-Release Strap", price: 8900, variantKind: "band", grams: 60, status: "live",
    variants: [
      { code: "TAN18", label: "Tan leather · 18 mm", stock: 14 },
      { code: "TAN20", label: "Tan leather · 20 mm", stock: 16 },
      { code: "BLACK20", label: "Black leather · 20 mm", stock: 12 },
      { code: "CANVAS20", label: "Olive canvas · 20 mm", stock: 15 },
      { code: "RUBBER20", label: "Black rubber · 20 mm", stock: 18 },
    ],
  },
];

export const GOODS_BY_ID: Map<string, GoodsItem> = new Map(GOODS_SEED.map((g) => [g.id, g]));
