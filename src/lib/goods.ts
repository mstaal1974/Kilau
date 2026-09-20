// ─── Goods: everything the house sells that isn't poured ─────────────────────
//
// Fragrance is a master product with formats (see formats.ts): one scent, seven
// ways to buy it. The rest of the house doesn't work that way — a dress has
// sizes, a lipstick has shades, a watch has a band — so goods are their own
// family: a product with a list of variants, each its own SKU with its own
// stock and, where it matters, its own price.
//
// Departments are the top of the tree, categories sit under them, and a product
// belongs to exactly one category. That is the whole taxonomy; there is no
// third level, because a shopper who has to click three times before seeing a
// product has already left.

export type Department = "womens" | "mens" | "jewellery" | "beauty" | "watches";

/** What a variant is measuring, which is what the picker is labelled with. */
export type VariantKind = "size" | "shade" | "band" | "length" | "case" | "one";

export interface DepartmentDef {
  id: Department;
  /** URL segment and nav label. */
  slug: string;
  name: string;
  /** Nav label — shorter than the name where the name is a mouthful. */
  short: string;
  tagline: string;
  intro: string;
}

export const DEPARTMENTS: DepartmentDef[] = [
  {
    id: "womens",
    slug: "women",
    name: "Women's Clothing",
    short: "Women",
    tagline: "Resort tailoring, cut for heat",
    intro:
      "Linen, silk and cotton voile made in small runs on the island. Pieces that hold a line in thirty-two degrees and pack down to nothing.",
  },
  {
    id: "mens",
    slug: "men",
    name: "Men's Clothing",
    short: "Men",
    tagline: "Easy tailoring, island weight",
    intro:
      "Open-weave shirting, drawstring trousers and unlined jackets. Everything breathes, nothing needs pressing, and the palette stays out of the way.",
  },
  {
    id: "jewellery",
    slug: "jewellery",
    name: "Jewellery",
    short: "Jewellery",
    tagline: "Gold-tone, hand-finished",
    intro:
      "Cast in small batches by silversmiths in Celuk and finished by hand. Solid pieces meant to be worn daily, in water and out of it.",
  },
  {
    id: "beauty",
    slug: "beauty",
    name: "Makeup & Cosmetics",
    short: "Beauty",
    tagline: "Colour and care, in daylight",
    intro:
      "A short colour range built for warm skin in bright light, alongside the oils and balms the climate actually asks for.",
  },
  {
    id: "watches",
    slug: "watches",
    name: "Watches",
    short: "Watches",
    tagline: "Automatic and quartz, sized for a wrist",
    intro:
      "Sapphire crystal, 100 m water resistance, and interchangeable straps. Quiet dials that read at a glance on a beach or under a cuff.",
  },
];

export const DEPARTMENT_BY_ID: Record<Department, DepartmentDef> = Object.fromEntries(
  DEPARTMENTS.map((d) => [d.id, d]),
) as Record<Department, DepartmentDef>;

export function departmentBySlug(slug: string): DepartmentDef | null {
  const s = slug.toLowerCase();
  return DEPARTMENTS.find((d) => d.slug === s || d.id === s) ?? null;
}

export interface CategoryDef {
  id: string;
  department: Department;
  slug: string;
  name: string;
  blurb: string;
}

export const CATEGORIES: CategoryDef[] = [
  // Women's
  { id: "w-dresses", department: "womens", slug: "dresses", name: "Dresses", blurb: "Slip, shirt and midi cuts in silk and linen." },
  { id: "w-tops", department: "womens", slug: "womens-tops", name: "Tops & Shirts", blurb: "Camisoles, open shirts and cropped knits." },
  { id: "w-bottoms", department: "womens", slug: "womens-bottoms", name: "Trousers & Skirts", blurb: "Wide legs, wrap skirts, drawstring waists." },
  { id: "w-swim", department: "womens", slug: "swim", name: "Swim & Cover-ups", blurb: "One-pieces, sarongs and kaftans." },
  { id: "w-outer", department: "womens", slug: "womens-outerwear", name: "Outerwear", blurb: "Unlined jackets and long linen coats." },
  // Men's
  { id: "m-shirts", department: "mens", slug: "mens-shirts", name: "Shirts", blurb: "Camp collars, open weave, short and long sleeve." },
  { id: "m-tees", department: "mens", slug: "mens-tees", name: "T-Shirts & Polos", blurb: "Heavy cotton, knitted polos, nothing printed." },
  { id: "m-bottoms", department: "mens", slug: "mens-bottoms", name: "Trousers & Shorts", blurb: "Drawstring linen, tailored shorts, swim." },
  { id: "m-outer", department: "mens", slug: "mens-outerwear", name: "Jackets", blurb: "Unlined overshirts and travel blazers." },
  // Jewellery
  { id: "j-rings", department: "jewellery", slug: "rings", name: "Rings", blurb: "Signets, stacking bands and stone settings." },
  { id: "j-necklaces", department: "jewellery", slug: "necklaces", name: "Necklaces", blurb: "Chains, pendants and layering lengths." },
  { id: "j-earrings", department: "jewellery", slug: "earrings", name: "Earrings", blurb: "Hoops, studs and drops." },
  { id: "j-bracelets", department: "jewellery", slug: "bracelets", name: "Bracelets & Cuffs", blurb: "Hammered cuffs and fine chain." },
  // Beauty
  { id: "b-lips", department: "beauty", slug: "lips", name: "Lips", blurb: "Balms, satins and a single true red." },
  { id: "b-face", department: "beauty", slug: "face", name: "Face", blurb: "Tinted fluids, cream blush, bronzing balm." },
  { id: "b-eyes", department: "beauty", slug: "eyes", name: "Eyes", blurb: "Kohl, brow and a four-shade palette." },
  { id: "b-skin", department: "beauty", slug: "skincare", name: "Skin & Body", blurb: "Facial oil, body oil, mineral sunscreen." },
  // Watches
  { id: "t-automatic", department: "watches", slug: "automatic", name: "Automatic", blurb: "Self-winding, exhibition backs, 38–40 mm." },
  { id: "t-quartz", department: "watches", slug: "quartz", name: "Quartz", blurb: "Slim cases, three hands, five-year cells." },
  { id: "t-straps", department: "watches", slug: "straps", name: "Straps", blurb: "Quick-release leather, canvas and rubber." },
];

export const CATEGORY_BY_ID: Record<string, CategoryDef> = Object.fromEntries(CATEGORIES.map((c) => [c.id, c]));

export function categoriesIn(department: Department): CategoryDef[] {
  return CATEGORIES.filter((c) => c.department === department);
}

export function categoryBySlug(slug: string): CategoryDef | null {
  const s = slug.toLowerCase();
  return CATEGORIES.find((c) => c.slug === s || c.id === s) ?? null;
}

export interface Variant {
  /** SKU suffix and the value stored on the order row — "M", "38MM", "CORAL". */
  code: string;
  /** What the picker shows — "M", "38 mm", "Coral Hour". */
  label: string;
  /** Cents. Omitted when the variant is priced at the product's own price. */
  price?: number;
  stock: number;
  /** A shade's colour, for the swatch. Deep enough to read on paper. */
  swatch?: string;
}

export type GoodsStatus = "live" | "coming_soon" | "hidden";

export interface Product {
  id: string;
  slug: string;
  name: string;
  department: Department;
  /** CategoryDef id. */
  category: string;
  tagline: string;
  story: string;
  /** Cents. The variant price wins where a variant sets one. */
  price: number;
  /** Cents. Set only where the piece is marked down; shown struck through. */
  compareAt?: number;
  variantKind: VariantKind;
  variants: Variant[];
  /** Composition and provenance, one line each. */
  details: string[];
  care?: string;
  /** Packed weight of one unit, grams — what the postage quote is built from. */
  grams: number;
  /**
   * Product art. Two tones the generated illustration is drawn from until
   * photography exists: `hue` carries the piece, `shade` is its shadow side.
   */
  hue: string;
  shade: string;
  /** Uploaded photography, once there is any. */
  imageUrl?: string;
  status?: GoodsStatus;
  vipOnly?: boolean;
}

// ─── The seed ────────────────────────────────────────────────────────────────
//
// Prices are in cents, AUD, GST inclusive — the same convention as the
// fragrance catalogue. Stock figures are demo stock: a deployment with a
// populated `products` table uses the rows stored there instead.

const SIZES_W = ["XS", "S", "M", "L", "XL"];
const SIZES_M = ["S", "M", "L", "XL", "XXL"];

/** Apparel sizes at one price, with a stock curve that peaks in the middle. */
function sizeRun(sizes: string[], stock: number[]): Variant[] {
  return sizes.map((s, i) => ({ code: s, label: s, stock: stock[i] ?? 0 }));
}

const SEED: Product[] = [
  // ── Women's clothing ──────────────────────────────────────────────────────
  {
    id: "g1", slug: "sanur-slip-dress", name: "Sanur Slip Dress", department: "womens", category: "w-dresses",
    tagline: "Bias-cut sand-washed silk", price: 32900, variantKind: "size",
    variants: sizeRun(SIZES_W, [4, 11, 14, 9, 3]),
    story: "Cut on the bias so it moves with you rather than over you, in a sand-washed silk that reads matte in daylight and catches the light after dark. Falls to mid-calf; the strap adjusts by a full inch.",
    details: ["100% sand-washed mulberry silk", "Bias cut, adjustable strap", "Made in Denpasar, in runs of forty"],
    care: "Hand wash cold, dry flat in shade.", grams: 240, hue: "#B4886A", shade: "#8A6244",
  },
  {
    id: "g2", slug: "ubud-shirt-dress", name: "Ubud Shirt Dress", department: "womens", category: "w-dresses",
    tagline: "Washed linen, belted", price: 24900, variantKind: "size",
    variants: sizeRun(SIZES_W, [6, 12, 15, 10, 5]),
    story: "A long shirt with the collar left soft and the waist left to you — the belt ties, knots or comes off entirely. Washed twice before it is cut, so it arrives already broken in.",
    details: ["100% Belgian linen, garment washed", "Self belt, side seam pockets", "Mother-of-pearl buttons"],
    care: "Machine wash cold, tumble low.", grams: 320, hue: "#C9BBA4", shade: "#9A8B72",
  },
  {
    id: "g3", slug: "batu-camisole", name: "Batu Camisole", department: "womens", category: "w-tops",
    tagline: "Silk, cut straight", price: 14900, variantKind: "size",
    variants: sizeRun(SIZES_W, [8, 16, 18, 12, 6]),
    story: "The piece the rest of the wardrobe hangs off. Straight through the body, finished with a French seam, and long enough to stay tucked.",
    details: ["100% mulberry silk, 19 momme", "French seams throughout", "Cut long to stay tucked"],
    care: "Hand wash cold, dry flat in shade.", grams: 110, hue: "#D9C9B4", shade: "#A8977F",
  },
  {
    id: "g4", slug: "canggu-open-shirt", name: "Canggu Open Shirt", department: "womens", category: "w-tops",
    tagline: "Cotton voile, sheer weave", price: 17900, variantKind: "size",
    variants: sizeRun(SIZES_W, [5, 14, 16, 11, 4]),
    story: "An open-weave voile shirt to throw over everything else. Drops off the shoulder, rolls to the elbow and dries in the time it takes to cross the sand.",
    details: ["100% cotton voile", "Dropped shoulder, curved hem", "Semi-sheer — layers over swim"],
    care: "Machine wash cold, line dry.", grams: 150, hue: "#E0D7C6", shade: "#AA9F8C",
  },
  {
    id: "g5", slug: "seminyak-wide-trouser", name: "Seminyak Wide Trouser", department: "womens", category: "w-bottoms",
    tagline: "Linen, elastic back", price: 21900, variantKind: "size",
    variants: sizeRun(SIZES_W, [7, 13, 17, 10, 6]),
    story: "Wide from the hip with a flat front and an elastic back, so it holds a line without holding you. Hemmed to break on the top of the foot.",
    details: ["100% Belgian linen", "Flat front, elastic back waist", "Deep side pockets"],
    care: "Machine wash cold, tumble low.", grams: 300, hue: "#B8A98F", shade: "#8B7D66",
  },
  {
    id: "g6", slug: "tanah-wrap-skirt", name: "Tanah Wrap Skirt", department: "womens", category: "w-bottoms",
    tagline: "Hand-blocked cotton", price: 16900, variantKind: "size",
    variants: sizeRun(SIZES_W, [6, 11, 13, 9, 4]),
    story: "One length of hand-blocked cotton, one tie, no zip. Wraps to a midi on most and a maxi on some, which is the point.",
    details: ["Hand block-printed cotton", "Single tie, no closures", "Each print sits differently"],
    care: "Hand wash cold, separately for the first wash.", grams: 210, hue: "#A87E6A", shade: "#7E5B4B",
  },
  {
    id: "g7", slug: "kuta-one-piece", name: "Kuta One-Piece", department: "womens", category: "w-swim",
    tagline: "Scoop back, full lining", price: 18900, variantKind: "size",
    variants: sizeRun(SIZES_W, [5, 12, 14, 9, 5]),
    story: "A square neck in front, a scoop to the waist behind, and a full lining so it holds its shape wet. Built from a recycled yarn that survives chlorine and sunscreen.",
    details: ["78% recycled polyamide, 22% elastane", "Fully lined, removable cups", "UPF 50+"],
    care: "Rinse in fresh water, dry in shade.", grams: 140, hue: "#4F6E70", shade: "#35504F",
  },
  {
    id: "g8", slug: "jimbaran-kaftan", name: "Jimbaran Kaftan", department: "womens", category: "w-swim",
    tagline: "One size, floor length", price: 19900, variantKind: "one",
    variants: [{ code: "OS", label: "One size", stock: 22 }],
    story: "Floor length, split to the thigh, and cut wide enough to belong to whoever picks it up. The cover-up that goes to dinner.",
    details: ["100% cotton gauze", "One size, floor length", "Side splits to the thigh"],
    care: "Machine wash cold, line dry.", grams: 260, hue: "#D4C4AD", shade: "#A08F79",
  },
  {
    id: "g9", slug: "amed-linen-coat", name: "Amed Linen Coat", department: "womens", category: "w-outer",
    tagline: "Unlined, wrist length", price: 36900, variantKind: "size",
    variants: sizeRun(SIZES_W, [3, 8, 10, 7, 3]),
    story: "A long unlined coat for the twenty minutes a day the island is cold and the eight hours it is air-conditioned. Falls below the knee, ties at the waist.",
    details: ["Heavyweight Belgian linen, unlined", "Self tie, patch pockets", "Falls below the knee"],
    care: "Dry clean, or hand wash cold.", grams: 520, hue: "#9E9482", shade: "#736B5C",
  },

  // ── Men's clothing ────────────────────────────────────────────────────────
  {
    id: "g10", slug: "legian-camp-shirt", name: "Legian Camp Shirt", department: "mens", category: "m-shirts",
    tagline: "Open collar, linen", price: 19900, variantKind: "size",
    variants: sizeRun(SIZES_M, [7, 15, 19, 13, 6]),
    story: "The camp collar sits flat whether it is buttoned or not, which is the whole argument for one. Cut straight, hemmed to be worn out.",
    details: ["100% Belgian linen", "Camp collar, single chest pocket", "Straight hem, worn out"],
    care: "Machine wash cold, tumble low.", grams: 260, hue: "#8E9A9B", shade: "#66716F",
  },
  {
    id: "g11", slug: "padang-gauze-shirt", name: "Padang Gauze Shirt", department: "mens", category: "m-shirts",
    tagline: "Long sleeve, open weave", price: 21900, variantKind: "size",
    variants: sizeRun(SIZES_M, [5, 13, 16, 11, 5]),
    story: "An open-weave cotton gauze that moves air through it. Long in the sleeve, light enough to wear buttoned at noon.",
    details: ["100% cotton gauze, double weave", "Spread collar, no pocket", "Semi-sheer"],
    care: "Machine wash cold, line dry.", grams: 220, hue: "#C7BCA8", shade: "#958B79",
  },
  {
    id: "g12", slug: "bukit-heavy-tee", name: "Bukit Heavy Tee", department: "mens", category: "m-tees",
    tagline: "240 gsm, boxed shoulder", price: 9900, variantKind: "size",
    variants: sizeRun(SIZES_M, [12, 24, 28, 19, 9]),
    story: "Two hundred and forty grams of combed cotton, a boxed shoulder and a ribbed collar that survives the wash. Plain, and staying that way.",
    details: ["240 gsm combed cotton", "Boxed shoulder, ribbed collar", "Pre-shrunk"],
    care: "Machine wash cold, tumble low.", grams: 230, hue: "#7A7468", shade: "#57524A",
  },
  {
    id: "g13", slug: "sidemen-knit-polo", name: "Sidemen Knit Polo", department: "mens", category: "m-tees",
    tagline: "Open-knit cotton", price: 16900, variantKind: "size",
    variants: sizeRun(SIZES_M, [6, 14, 17, 12, 5]),
    story: "Knitted rather than cut and sewn, so the collar rolls instead of standing. Three buttons, open weave, dinner-appropriate on the island.",
    details: ["Open-knit Pima cotton", "Three-button placket, rolled collar", "Knitted panels, not cut"],
    care: "Hand wash cold, dry flat.", grams: 280, hue: "#6E7A6B", shade: "#4E584B",
  },
  {
    id: "g14", slug: "uluwatu-drawstring-trouser", name: "Uluwatu Drawstring Trouser", department: "mens", category: "m-bottoms",
    tagline: "Linen, tapered", price: 21900, variantKind: "size",
    variants: sizeRun(SIZES_M, [6, 14, 18, 12, 6]),
    story: "A drawstring waist that does not read as pyjamas: tapered through the leg, creased, and hemmed short of the shoe.",
    details: ["100% Belgian linen", "Drawstring waist, tapered leg", "Cropped at the ankle"],
    care: "Machine wash cold, tumble low.", grams: 310, hue: "#A79C89", shade: "#7B7263",
  },
  {
    id: "g15", slug: "bingin-tailored-short", name: "Bingin Tailored Short", department: "mens", category: "m-bottoms",
    tagline: "Cotton twill, 7 inch", price: 14900, variantKind: "size",
    variants: sizeRun(SIZES_M, [8, 16, 20, 14, 7]),
    story: "Seven inches, flat front, and a waistband that takes a belt. Short enough for the heat and cut well enough for lunch.",
    details: ["Cotton twill, garment dyed", "7 inch inseam, flat front", "Belt loops, slant pockets"],
    care: "Machine wash cold, tumble low.", grams: 240, hue: "#9A8E78", shade: "#6F6656",
  },
  {
    id: "g16", slug: "medewi-overshirt", name: "Medewi Overshirt", department: "mens", category: "m-outer",
    tagline: "Unlined, patch pockets", price: 27900, variantKind: "size",
    variants: sizeRun(SIZES_M, [4, 9, 12, 8, 4]),
    story: "A shirt heavy enough to be a jacket and light enough to stay on indoors. Four patch pockets, no lining, no structure.",
    details: ["Heavyweight linen-cotton, unlined", "Four patch pockets", "Corozo buttons"],
    care: "Machine wash cold, line dry.", grams: 480, hue: "#6B6E63", shade: "#4B4E45",
  },

  // ── Jewellery ─────────────────────────────────────────────────────────────
  {
    id: "g17", slug: "celuk-signet-ring", name: "Celuk Signet Ring", department: "jewellery", category: "j-rings",
    tagline: "Gold vermeil, hand-finished", price: 24900, variantKind: "size",
    variants: [
      { code: "52", label: "52 · L", stock: 5 }, { code: "54", label: "54 · N", stock: 8 },
      { code: "56", label: "56 · P", stock: 9 }, { code: "58", label: "58 · R", stock: 6 },
      { code: "60", label: "60 · T", stock: 4 },
    ],
    story: "A flat oval face on a tapered band, cast in Celuk and filed by hand so no two faces catch the light identically. Takes an engraving.",
    details: ["18k gold vermeil over recycled sterling", "Hand-filed face, 12 × 10 mm", "Engravable — add it in the bag"],
    care: "Remove before swimming; polish with a dry cloth.", grams: 60, hue: "#C8A063", shade: "#8A6215",
  },
  {
    id: "g18", slug: "tirta-stacking-band", name: "Tirta Stacking Band", department: "jewellery", category: "j-rings",
    tagline: "Hammered, 2 mm", price: 11900, variantKind: "size",
    variants: [
      { code: "52", label: "52 · L", stock: 9 }, { code: "54", label: "54 · N", stock: 14 },
      { code: "56", label: "56 · P", stock: 16 }, { code: "58", label: "58 · R", stock: 11 },
      { code: "60", label: "60 · T", stock: 7 },
    ],
    story: "Two millimetres of hammered gold vermeil, meant to be bought in threes and worn until the finish wears to something of your own.",
    details: ["18k gold vermeil over recycled sterling", "2 mm hammered band", "Sold singly"],
    care: "Safe in fresh water; remove in the sea.", grams: 35, hue: "#D9B98A", shade: "#8A6215",
  },
  {
    id: "g19", slug: "bulan-pendant", name: "Bulan Moon Pendant", department: "jewellery", category: "j-necklaces",
    tagline: "Cast disc on fine chain", price: 18900, variantKind: "length",
    variants: [
      { code: "42", label: "42 cm · Choker", stock: 7 },
      { code: "50", label: "50 cm · Collar", stock: 12 },
      { code: "60", label: "60 cm · Long", stock: 8 },
    ],
    story: "A small cast disc with the surface left as it came from the mould, hung on a chain fine enough to disappear. Layers with the Riak chain below it.",
    details: ["18k gold vermeil, 16 mm disc", "Fine cable chain, lobster clasp", "Three lengths"],
    care: "Remove before swimming.", grams: 45, hue: "#C8A063", shade: "#7A5A12",
  },
  {
    id: "g20", slug: "riak-chain", name: "Riak Chain", department: "jewellery", category: "j-necklaces",
    tagline: "Flat curb, 4 mm", price: 22900, variantKind: "length",
    variants: [
      { code: "45", label: "45 cm", stock: 6 },
      { code: "55", label: "55 cm", stock: 10 },
    ],
    story: "A flat curb chain with enough weight to sit rather than float. Solid, not hollow, which is the difference you feel and not the one you see.",
    details: ["18k gold vermeil over recycled sterling", "Solid flat curb, 4 mm", "Lobster clasp"],
    care: "Remove before swimming.", grams: 70, hue: "#C8A063", shade: "#8A6215",
  },
  {
    id: "g21", slug: "ombak-hoop", name: "Ombak Hoop", department: "jewellery", category: "j-earrings",
    tagline: "Chunky, 25 mm", price: 14900, variantKind: "one",
    variants: [{ code: "PAIR", label: "Pair", stock: 18 }],
    story: "Twenty-five millimetres across and thick enough to read from the other side of a room, on a hinged post that actually closes.",
    details: ["18k gold vermeil, 25 mm", "Hinged post, sterling silver", "Sold as a pair"],
    care: "Remove before swimming.", grams: 30, hue: "#D9B98A", shade: "#8A6215",
  },
  {
    id: "g22", slug: "pasir-drop-earring", name: "Pasir Drop Earring", department: "jewellery", category: "j-earrings",
    tagline: "Freshwater pearl", price: 16900, variantKind: "one",
    variants: [{ code: "PAIR", label: "Pair", stock: 11 }],
    story: "One baroque freshwater pearl on a hand-shaped gold drop. Each pearl is its own shape, so each pair is a near match rather than a match.",
    details: ["Baroque freshwater pearl, 9–11 mm", "18k gold vermeil drop", "Sold as a pair"],
    care: "Last on, first off; keep away from perfume.", grams: 25, hue: "#E6DCCB", shade: "#A89880",
  },
  {
    id: "g23", slug: "karang-cuff", name: "Karang Cuff", department: "jewellery", category: "j-bracelets",
    tagline: "Hammered, open back", price: 19900, variantKind: "size",
    variants: [
      { code: "S", label: "S · 15 cm", stock: 6 },
      { code: "M", label: "M · 17 cm", stock: 10 },
      { code: "L", label: "L · 19 cm", stock: 5 },
    ],
    story: "Hammered flat, opened at the back so it slides on rather than clasps. Adjusts a few millimetres with a squeeze and stays where you put it.",
    details: ["18k gold vermeil, 9 mm wide", "Open back, adjustable", "Hammered by hand"],
    care: "Remove before swimming.", grams: 65, hue: "#C8A063", shade: "#7A5A12",
  },

  // ── Beauty ────────────────────────────────────────────────────────────────
  {
    id: "g24", slug: "kilau-lip-balm", name: "Kilau Tinted Lip Balm", department: "beauty", category: "b-lips",
    tagline: "Sheer, cocoa butter", price: 3900, variantKind: "shade",
    variants: [
      { code: "BARE", label: "Bare", stock: 26, swatch: "#B4796A" },
      { code: "GUAVA", label: "Guava", stock: 21, swatch: "#B4557F" },
      { code: "CLAY", label: "Clay", stock: 18, swatch: "#A0553E" },
      { code: "PLUM", label: "Plum", stock: 14, swatch: "#7E3B58" },
    ],
    story: "Cocoa butter, candelilla and a little pigment. Sheer enough to apply without a mirror, which is the only balm worth carrying.",
    details: ["Cocoa butter, candelilla wax, jojoba", "Sheer wash of colour", "4.5 g, refillable case"],
    care: "Store below 25 °C.", grams: 40, hue: "#B4557F", shade: "#7E3B58",
  },
  {
    id: "g25", slug: "kilau-satin-lipstick", name: "Kilau Satin Lipstick", department: "beauty", category: "b-lips",
    tagline: "Full colour, satin finish", price: 5900, variantKind: "shade",
    variants: [
      { code: "TERRA", label: "Terra", stock: 16, swatch: "#A0553E" },
      { code: "ROSEWOOD", label: "Rosewood", stock: 19, swatch: "#8E4A55" },
      { code: "REDSALT", label: "Red Salt", stock: 13, swatch: "#A32E24" },
      { code: "COCOA", label: "Cocoa", stock: 11, swatch: "#6B4A2B" },
    ],
    story: "Four shades, no more, each one built to sit against warm skin in bright light rather than under a studio lamp. Satin, not matte — the climate decides that.",
    details: ["Satin finish, buildable", "Castor and shea base", "3.8 g, weighted brass case"],
    care: "Store below 25 °C.", grams: 55, hue: "#A32E24", shade: "#6E1F18",
  },
  {
    id: "g26", slug: "kilau-skin-tint", name: "Kilau Skin Tint", department: "beauty", category: "b-face",
    tagline: "Sheer fluid, SPF 15", price: 6900, variantKind: "shade",
    variants: [
      { code: "01", label: "01 · Porcelain", stock: 12, swatch: "#B79176" },
      { code: "02", label: "02 · Sand", stock: 17, swatch: "#A87E5E" },
      { code: "03", label: "03 · Amber", stock: 16, swatch: "#8F6647" },
      { code: "04", label: "04 · Sienna", stock: 13, swatch: "#75503A" },
      { code: "05", label: "05 · Cocoa", stock: 10, swatch: "#5A3C2B" },
      { code: "06", label: "06 · Ebony", stock: 8, swatch: "#432C20" },
    ],
    story: "A fluid, not a foundation: it evens without covering, and it does not slide by eleven. Six shades across the range we actually see in the shop.",
    details: ["Sheer to medium, buildable", "Mineral SPF 15", "30 ml glass bottle, pump"],
    care: "Shake before use.", grams: 110, hue: "#A87E5E", shade: "#75503A",
  },
  {
    id: "g27", slug: "kilau-cream-blush", name: "Kilau Cream Blush", department: "beauty", category: "b-face",
    tagline: "Cheek and lip", price: 4900, variantKind: "shade",
    variants: [
      { code: "CORAL", label: "Coral Hour", stock: 20, swatch: "#B4553E" },
      { code: "FIG", label: "Fig", stock: 17, swatch: "#8E4A55" },
      { code: "DUSK", label: "Dusk", stock: 14, swatch: "#7E3B58" },
    ],
    story: "A cream that works on the cheek with a finger and on the lip with the same finger, which is the entire brief for a beach bag.",
    details: ["Cream-to-powder finish", "Cheek and lip", "6 g, refillable tin"],
    care: "Store below 25 °C.", grams: 45, hue: "#B4553E", shade: "#82392A",
  },
  {
    id: "g28", slug: "kilau-kohl", name: "Kilau Kohl Pencil", department: "beauty", category: "b-eyes",
    tagline: "Waterproof, smudgeable", price: 3400, variantKind: "shade",
    variants: [
      { code: "INK", label: "Ink", stock: 24, swatch: "#24222A" },
      { code: "EARTH", label: "Earth", stock: 18, swatch: "#4A382C" },
      { code: "PALM", label: "Palm", stock: 12, swatch: "#2E4A38" },
    ],
    story: "Soft for ninety seconds, then it stays. Waterproof enough for the sea and soft enough to smudge before it sets.",
    details: ["Waterproof, 90-second set", "Retractable, no sharpener", "0.3 g"],
    care: "Cap firmly after use.", grams: 25, hue: "#4A382C", shade: "#2A1F17",
  },
  {
    id: "g29", slug: "kilau-eye-palette", name: "Kilau Four-Shade Palette", department: "beauty", category: "b-eyes",
    tagline: "Matte and satin, warm", price: 7900, variantKind: "one",
    variants: [{ code: "WARM", label: "Warm neutrals", stock: 15 }],
    story: "Two mattes, two satins, all warm, chosen so any pair of them works. A palette you finish rather than one you keep.",
    details: ["Four pans, 1.4 g each", "Two matte, two satin", "Mirrored brass compact"],
    care: "Store below 25 °C.", grams: 95, hue: "#A87E5E", shade: "#6E4F38",
  },
  {
    id: "g30", slug: "kilau-facial-oil", name: "Kilau Facial Oil", department: "beauty", category: "b-skin",
    tagline: "Kemiri and squalane", price: 8900, variantKind: "one",
    variants: [{ code: "30ML", label: "30 ml", stock: 19 }],
    story: "Cold-pressed kemiri — candlenut, grown an hour north of the shop — cut with squalane so it sinks instead of sitting. Four drops at night.",
    details: ["Cold-pressed kemiri, squalane, rosehip", "Unfragranced", "30 ml amber glass, dropper"],
    care: "Keep out of direct sun.", grams: 130, hue: "#B2762A", shade: "#7A5214",
  },
  {
    id: "g31", slug: "kilau-body-oil", name: "Kilau Body Oil", department: "beauty", category: "b-skin",
    tagline: "Dry-touch, lightly scented", price: 6900, variantKind: "one",
    variants: [{ code: "100ML", label: "100 ml", stock: 22 }],
    story: "A dry-touch oil you can dress over in two minutes, scented at a tenth of the strength of the house eau de parfum so the two can be worn together.",
    details: ["Coconut, jojoba, kemiri", "Dry-touch finish", "100 ml glass, 1/10 fragrance load"],
    care: "Keep out of direct sun.", grams: 260, hue: "#C8A063", shade: "#8A6215",
  },
  {
    id: "g32", slug: "kilau-mineral-spf", name: "Kilau Mineral SPF 50", department: "beauty", category: "b-skin",
    tagline: "Zinc, reef-safe", price: 5400, variantKind: "one",
    variants: [{ code: "75ML", label: "75 ml", stock: 28 }],
    story: "Non-nano zinc, no chemical filters, no white cast worth complaining about. The one piece of the range nobody here goes outside without.",
    details: ["Non-nano zinc oxide, SPF 50", "Reef-safe, no oxybenzone", "75 ml tube"],
    care: "Reapply every two hours.", grams: 105, hue: "#8E9A9B", shade: "#5F6C6D",
  },

  // ── Watches ───────────────────────────────────────────────────────────────
  {
    id: "g33", slug: "kilau-surya-automatic", name: "Surya Automatic", department: "watches", category: "t-automatic",
    tagline: "38 mm, exhibition back", price: 89900, variantKind: "band",
    variants: [
      { code: "STEEL", label: "Steel bracelet", stock: 5 },
      { code: "TAN", label: "Tan leather", price: 84900, stock: 7 },
      { code: "BLACK", label: "Black leather", price: 84900, stock: 6 },
    ],
    story: "A 38 mm steel case around a Miyota automatic, with a sunburst dial that goes from cream to bronze as the light moves. Exhibition back, sapphire front, 100 m.",
    details: ["Miyota 9039 automatic, 42 h reserve", "38 mm steel, 10.5 mm thick", "Sapphire crystal, 100 m, exhibition back"],
    care: "Rinse after sea water; service every five years.", grams: 420, hue: "#C8A063", shade: "#6E5A3A",
  },
  {
    id: "g34", slug: "kilau-bulan-automatic", name: "Bulan Automatic", department: "watches", category: "t-automatic",
    tagline: "40 mm, moonphase", price: 129900, variantKind: "band",
    variants: [
      { code: "STEEL", label: "Steel bracelet", stock: 3 },
      { code: "NAVY", label: "Navy leather", price: 124900, stock: 4 },
    ],
    story: "The one with a complication: a moonphase at six, on a lacquered dial deep enough to read as black indoors and blue outside. Forty millimetres, and no bigger.",
    details: ["Miyota 9132 automatic, moonphase", "40 mm steel, 11.8 mm thick", "Sapphire crystal, 100 m"],
    care: "Rinse after sea water; service every five years.", grams: 460, hue: "#3F5A78", shade: "#26374A",
    vipOnly: true,
  },
  {
    id: "g35", slug: "kilau-pasir-quartz", name: "Pasir Quartz", department: "watches", category: "t-quartz",
    tagline: "34 mm, slim case", price: 39900, variantKind: "band",
    variants: [
      { code: "GOLD", label: "Gold-tone mesh", stock: 9 },
      { code: "CREAM", label: "Cream leather", price: 36900, stock: 11 },
      { code: "TAN", label: "Tan leather", price: 36900, stock: 8 },
    ],
    story: "Thirty-four millimetres and seven thick, which is thin enough to go under a cuff and forget. Three hands, no date, a five-year cell.",
    details: ["Ronda 762 quartz, five-year cell", "34 mm case, 7 mm thick", "Sapphire crystal, 50 m"],
    care: "Rinse after sea water.", grams: 260, hue: "#D9B98A", shade: "#8A6215",
  },
  {
    id: "g36", slug: "kilau-ombak-quartz", name: "Ombak Quartz", department: "watches", category: "t-quartz",
    tagline: "36 mm, sector dial", price: 44900, variantKind: "band",
    variants: [
      { code: "STEEL", label: "Steel bracelet", stock: 6 },
      { code: "BLACK", label: "Black leather", price: 41900, stock: 9 },
    ],
    story: "A sector dial — the layout that tells the time fastest — in thirty-six millimetres of brushed steel. The watch to own if you are only owning one.",
    details: ["Ronda 763 quartz", "36 mm brushed steel, 8 mm thick", "Sapphire crystal, 100 m"],
    care: "Rinse after sea water.", grams: 300, hue: "#8E9A9B", shade: "#5A6566",
  },
  {
    id: "g37", slug: "kilau-quick-release-strap", name: "Quick-Release Strap", department: "watches", category: "t-straps",
    tagline: "18 and 20 mm", price: 8900, variantKind: "band",
    variants: [
      { code: "TAN18", label: "Tan leather · 18 mm", stock: 14 },
      { code: "TAN20", label: "Tan leather · 20 mm", stock: 16 },
      { code: "BLACK20", label: "Black leather · 20 mm", stock: 12 },
      { code: "CANVAS20", label: "Olive canvas · 20 mm", stock: 15 },
      { code: "RUBBER20", label: "Black rubber · 20 mm", stock: 18 },
    ],
    story: "Quick-release pins, so changing a strap is a thumbnail and ten seconds rather than a tool and a scratched lug.",
    details: ["Quick-release spring bars", "18 or 20 mm lug width", "Gold-tone buckle"],
    care: "Keep leather out of sea water.", grams: 60, hue: "#A8794A", shade: "#6E4A28",
  },
];

export const PRODUCTS: Product[] = SEED;

// ─── Reading the catalogue ───────────────────────────────────────────────────

export function productsIn(products: Product[], department: Department): Product[] {
  return products.filter((p) => p.department === department && p.status !== "hidden");
}

export function productsInCategory(products: Product[], categoryId: string): Product[] {
  return products.filter((p) => p.category === categoryId && p.status !== "hidden");
}

export function productBySlug(products: Product[], slug: string): Product | null {
  return products.find((p) => p.slug === slug) ?? null;
}

export function variantOf(p: Product, code: string): Variant | null {
  return p.variants.find((v) => v.code === code) ?? null;
}

/** Cents for one unit of a variant — the variant's own price, else the product's. */
export function variantPrice(p: Product, code: string): number {
  return variantOf(p, code)?.price ?? p.price;
}

/** The lowest price across the variants, for the "from" on a card. */
export function fromPrice(p: Product): number {
  return Math.min(...p.variants.map((v) => v.price ?? p.price));
}

export function inStock(p: Product, code: string): boolean {
  return (variantOf(p, code)?.stock ?? 0) > 0;
}

/**
 * Buyable now. Unlike a fragrance — poured to order, so orderable at zero
 * stock — a dress in a size nobody has is simply not for sale.
 */
export function buyable(p: Product, code: string): boolean {
  return (p.status ?? "live") === "live" && inStock(p, code);
}

export function anyInStock(p: Product): boolean {
  return (p.status ?? "live") === "live" && p.variants.some((v) => v.stock > 0);
}

/**
 * The variant a product page opens on: the deepest-stocked one, which on a
 * size run is the middle of the curve. Opening on XS because it happens to be
 * listed first is how a shopper ends up adding the wrong size.
 */
export function defaultVariant(p: Product): string {
  const best = p.variants.reduce((a, b) => (b.stock > a.stock ? b : a), p.variants[0]);
  return (best.stock > 0 ? best : p.variants[0]).code;
}

export function availability(p: Product, code: string): string {
  if ((p.status ?? "live") === "coming_soon") return "Coming soon";
  if ((p.status ?? "live") === "hidden") return "Unavailable";
  const stock = variantOf(p, code)?.stock ?? 0;
  if (stock <= 0) return "Sold out in this size";
  if (stock <= 4) return `Only ${stock} left · Ships within 1–2 business days`;
  return "In stock · Ships within 1–2 business days";
}

/** The picker's heading — "Size", "Shade", "Strap". */
export function variantLabel(kind: VariantKind): string {
  switch (kind) {
    case "size": return "Size";
    case "shade": return "Shade";
    case "band": return "Strap";
    case "length": return "Length";
    case "case": return "Case";
    case "one": return "Option";
  }
}

/** Engraving is offered where the piece can actually take it. */
export function engravable(p: Product): boolean {
  return p.details.some((d) => d.toLowerCase().includes("engrav"));
}

/** A line's display name on an order, receipt or packing sheet. */
export function lineName(p: Product, code: string): string {
  const v = variantOf(p, code);
  return v && p.variantKind !== "one" ? `${p.name} — ${v.label}` : p.name;
}
