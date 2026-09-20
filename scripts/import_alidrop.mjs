#!/usr/bin/env node
// ─── Importing a dropship catalogue ──────────────────────────────────────────
//
// AliDrop is an app for Shopify, WooCommerce and Wix: it syncs products *into*
// a store on one of those platforms rather than publishing a documented API a
// custom storefront can call. So the way a catalogue gets in here is the way it
// gets between any two shops — the product CSV Shopify defines, which is what
// AliDrop (and AliExpress, and every other tool in that chain) exports.
//
// That format is published and stable, which is why it is the one this script
// reads rather than an endpoint guessed at from marketing copy. A JSON array of
// products is accepted too, for a supplier that hands you one.
//
// Usage:
//   node scripts/import_alidrop.mjs export.csv --department womens --category w-dresses
//   node scripts/import_alidrop.mjs export.csv --department beauty --margin 2.4 --push
//   node scripts/import_alidrop.mjs export.json --dry-run
//
//   --department  Required. womens | mens | jewellery | beauty | watches
//   --category    Category id (w-dresses, j-rings, …). Guessed per product from
//                 its type/tags when omitted; anything unguessable is reported
//                 and skipped rather than filed in the wrong place.
//   --margin      Retail multiplier on the supplier cost. Default 2.5.
//   --round       Round retail up to the nearest N cents. Default 500 ($5).
//   --supplier    Source name recorded on each row. Default "alidrop".
//   --status      live | coming_soon | hidden for the imported rows. Default live.
//   --out         Where to write the SQL. Default supabase/migrations/<ts>_import.sql
//   --push        Write straight to Supabase instead, using SUPABASE_URL and
//                 SUPABASE_SERVICE_ROLE_KEY from the environment.
//   --dry-run     Parse, map and report. Write nothing.
//
// Re-importing is an update, not a duplicate: rows are matched on
// (supplier, supplier_product_id), which is the unique index added in 0034.

import fs from "node:fs/promises";
import path from "node:path";

// ─── Arguments ───────────────────────────────────────────────────────────────

const argv = process.argv.slice(2);
const file = argv.find((a) => !a.startsWith("-"));
const flag = (name, fallback = null) => {
  const i = argv.indexOf(`--${name}`);
  return i === -1 ? fallback : (argv[i + 1] ?? true);
};
const has = (name) => argv.includes(`--${name}`);

if (!file || has("help")) {
  console.log(await fs.readFile(new URL(import.meta.url), "utf8").then((s) => s.split("\n").slice(2, 33).join("\n")));
  process.exit(file ? 0 : 1);
}

const DEPARTMENTS = ["womens", "mens", "jewellery", "beauty", "watches"];
const department = flag("department");
if (!DEPARTMENTS.includes(department)) {
  console.error(`--department must be one of: ${DEPARTMENTS.join(", ")}`);
  process.exit(1);
}
const forcedCategory = flag("category");
const margin = Number(flag("margin", 2.5));
const roundTo = Number(flag("round", 500));
const supplier = String(flag("supplier", "alidrop"));
const status = String(flag("status", "live"));
const dryRun = has("dry-run");
const push = has("push");

// ─── The category guess ──────────────────────────────────────────────────────
//
// Keyed off the product's Shopify "Type" and tags. Deliberately conservative:
// a product it cannot place is reported at the end and left out, because a
// dress filed under Rings is worse than a dress nobody imported.

const CATEGORY_WORDS = {
  "w-dresses": ["dress", "gown", "maxi", "midi"],
  "w-tops": ["top", "blouse", "camisole", "cami", "shirt", "tank", "knit"],
  "w-bottoms": ["trouser", "pant", "skirt", "short"],
  "w-swim": ["swim", "bikini", "kaftan", "caftan", "cover-up", "sarong", "one-piece"],
  "w-outer": ["coat", "jacket", "blazer", "cardigan"],
  "m-shirts": ["shirt", "camp collar", "linen shirt"],
  "m-tees": ["t-shirt", "tee", "polo"],
  "m-bottoms": ["trouser", "pant", "short", "chino"],
  "m-outer": ["jacket", "overshirt", "blazer", "coat"],
  "j-rings": ["ring", "signet", "band"],
  "j-necklaces": ["necklace", "chain", "pendant", "choker"],
  "j-earrings": ["earring", "hoop", "stud"],
  "j-bracelets": ["bracelet", "cuff", "bangle"],
  "b-lips": ["lip", "lipstick", "gloss", "balm"],
  "b-face": ["foundation", "tint", "blush", "bronzer", "concealer", "powder"],
  "b-eyes": ["eye", "mascara", "liner", "kohl", "brow", "shadow", "palette"],
  "b-skin": ["serum", "oil", "moisturis", "moisturiz", "cream", "sunscreen", "spf", "cleanser"],
  "t-automatic": ["automatic", "mechanical", "self-winding"],
  "t-quartz": ["quartz", "watch"],
  "t-straps": ["strap", "band", "bracelet"],
};
const CATEGORIES_IN = {
  womens: ["w-dresses", "w-tops", "w-bottoms", "w-swim", "w-outer"],
  mens: ["m-shirts", "m-tees", "m-bottoms", "m-outer"],
  jewellery: ["j-rings", "j-necklaces", "j-earrings", "j-bracelets"],
  beauty: ["b-lips", "b-face", "b-eyes", "b-skin"],
  watches: ["t-automatic", "t-quartz", "t-straps"],
};

function guessCategory(text) {
  const hay = text.toLowerCase();
  let best = null;
  let bestScore = 0;
  for (const id of CATEGORIES_IN[department]) {
    const score = CATEGORY_WORDS[id].reduce((n, w) => n + (hay.includes(w) ? w.length : 0), 0);
    if (score > bestScore) {
      best = id;
      bestScore = score;
    }
  }
  return best;
}

/** What the picker is measuring, from the supplier's own option name. */
function variantKindFor(optionName) {
  const n = (optionName ?? "").toLowerCase();
  if (/size|us |eu |uk /.test(n)) return "size";
  if (/colou?r|shade|tone/.test(n)) return "shade";
  if (/strap|band|bracelet/.test(n)) return "band";
  if (/length|cm|inch/.test(n)) return "length";
  if (/case|dial/.test(n)) return "case";
  return "one";
}

// ─── CSV ─────────────────────────────────────────────────────────────────────
// RFC 4180: quoted fields, doubled quotes inside them, newlines inside quotes.
// Shopify's export uses all three (Body (HTML) is full of commas and quotes),
// so a split(",") parser silently mangles roughly every description.

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i += 1; } else quoted = false;
      } else field += c;
      continue;
    }
    if (c === '"') { quoted = true; continue; }
    if (c === ",") { row.push(field); field = ""; continue; }
    if (c === "\r") continue;
    if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; continue; }
    field += c;
  }
  if (field !== "" || row.length) { row.push(field); rows.push(row); }
  if (!rows.length) return [];
  const header = rows[0].map((h) => h.trim());
  return rows.slice(1).filter((r) => r.some((c) => c.trim() !== "")).map((r) => Object.fromEntries(header.map((h, i) => [h, (r[i] ?? "").trim()])));
}

const stripHtml = (s) =>
  (s ?? "")
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/p>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();

const sentence = (s, max) => {
  const clean = stripHtml(s);
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const stop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("! "), cut.lastIndexOf("? "));
  return stop > max * 0.4 ? cut.slice(0, stop + 1) : `${cut.trimEnd()}…`;
};

const slugify = (s) =>
  stripHtml(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

const cents = (s) => {
  const n = Number(String(s ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
};

/** Retail from supplier cost: margin, then rounded up to a clean figure. */
const retailFrom = (cost) => {
  const raw = Math.round(cost * margin);
  return roundTo > 0 ? Math.ceil(raw / roundTo) * roundTo : raw;
};

/** A stable code from an option value: "Light Blue / M" → "LIGHTBLUE-M". */
const variantCode = (...values) =>
  values.filter(Boolean).map((v) => stripHtml(v).toUpperCase().replace(/[^A-Z0-9]+/g, "").slice(0, 12)).join("-").slice(0, 32) || "OS";

// ─── Shopify CSV → products ──────────────────────────────────────────────────
//
// One product spans many rows: the first carries the title and description,
// the rest carry only a Handle plus their own variant and image columns. So
// rows are grouped by Handle and folded together.

function fromShopifyCsv(rows) {
  const byHandle = new Map();
  for (const r of rows) {
    const handle = r.Handle || slugify(r.Title);
    if (!handle) continue;
    if (!byHandle.has(handle)) byHandle.set(handle, []);
    byHandle.get(handle).push(r);
  }

  const products = [];
  const skipped = [];
  for (const [handle, group] of byHandle) {
    const head = group.find((r) => r.Title) ?? group[0];
    const name = stripHtml(head.Title) || handle.replace(/-/g, " ");
    const optionName = head["Option1 Name"] || "";
    const kind = forcedCategory ? variantKindFor(optionName) : variantKindFor(optionName);

    const haystack = [head.Title, head.Type, head.Tags, head["Product Category"]].filter(Boolean).join(" ");
    const category = forcedCategory ?? guessCategory(haystack);
    if (!category) {
      skipped.push({ handle, name, why: "could not place it in a category — pass --category" });
      continue;
    }

    // Images: product-level, in Shopify's own position order, de-duplicated.
    const images = [...new Set(
      group
        .filter((r) => r["Image Src"])
        .sort((a, b) => Number(a["Image Position"] || 0) - Number(b["Image Position"] || 0))
        .map((r) => r["Image Src"]),
    )];

    const variantRows = group.filter((r) => r["Variant Price"] || r["Variant SKU"] || r["Option1 Value"]);
    const variants = [];
    for (const r of variantRows) {
      const label = [r["Option1 Value"], r["Option2 Value"], r["Option3 Value"]].filter(Boolean).join(" / ") || "One size";
      const code = variantCode(r["Option1 Value"], r["Option2 Value"], r["Option3 Value"]);
      if (variants.some((v) => v.code === code)) continue;
      // "Variant Price" is what the supplier charges; retail is derived.
      const cost = cents(r["Variant Cost"] || r["Cost per item"] || r["Variant Price"]);
      const stock = Number(r["Variant Inventory Qty"] || r["Variant Inventory Quantity"] || 0);
      variants.push({
        code,
        label,
        cost,
        price: retailFrom(cost),
        stock: Number.isFinite(stock) ? Math.max(0, stock) : 0,
        image: r["Variant Image"] || undefined,
        supplierSku: r["Variant SKU"] || undefined,
      });
    }
    if (!variants.length) {
      skipped.push({ handle, name, why: "no variant rows" });
      continue;
    }

    const cost = Math.min(...variants.map((v) => v.cost).filter((c) => c > 0)) || 0;
    const price = retailFrom(cost);
    const grams = Math.round(Number(head["Variant Grams"] || variantRows[0]?.["Variant Grams"] || 0)) || 250;

    products.push({
      slug: slugify(name) || handle,
      name,
      department,
      category,
      tagline: sentence(head.Type || head.Tags || head["Body (HTML)"], 60),
      story: sentence(head["Body (HTML)"], 420),
      price,
      variantKind: variants.length === 1 && variants[0].code === "OS" ? "one" : kind === "one" ? "size" : kind,
      // The per-variant price is only recorded where it differs from the
      // product's, which is the same rule the house catalogue follows.
      variants: variants.map((v) => ({
        code: v.code,
        label: v.label,
        ...(v.price !== price ? { price: v.price } : {}),
        stock: v.stock,
        ...(v.image ? { image: v.image } : {}),
        ...(v.supplierSku ? { supplierSku: v.supplierSku } : {}),
      })),
      details: [head.Type, head.Vendor && `Supplied by ${head.Vendor}`, head.Tags].filter(Boolean).map((d) => sentence(d, 80)),
      care: null,
      grams,
      images,
      supplier,
      // The handle is Shopify's product-level identifier, so it is what a
      // re-import matches on. A variant SKU would move if the first variant
      // ever changed, and the piece would import a second time.
      supplierProductId: handle,
      // No column in the CSV carries the supplier's listing URL; it is filled
      // in by hand or by an API import, not invented from an unrelated field.
      supplierUrl: null,
      costCents: cost || null,
      status,
    });
  }
  return { products, skipped };
}

/** A plain JSON export: already product-shaped, so only the naming differs. */
function fromJson(data) {
  const list = Array.isArray(data) ? data : (data.products ?? []);
  const products = [];
  const skipped = [];
  for (const p of list) {
    const name = stripHtml(p.title ?? p.name ?? "");
    const category = forcedCategory ?? guessCategory([name, p.type, (p.tags ?? []).join(" ")].filter(Boolean).join(" "));
    if (!name || !category) {
      skipped.push({ handle: p.id ?? "?", name: name || "(untitled)", why: "no name, or no category — pass --category" });
      continue;
    }
    const variants = (p.variants ?? [{}]).map((v, i) => {
      const cost = cents(v.cost ?? v.price ?? p.price);
      return {
        code: variantCode(v.option1 ?? v.title ?? `V${i + 1}`),
        label: stripHtml(v.title ?? v.option1 ?? "One size"),
        price: retailFrom(cost),
        cost,
        stock: Math.max(0, Number(v.inventory_quantity ?? v.stock ?? 0)),
        image: v.image ?? undefined,
        supplierSku: v.sku ?? undefined,
      };
    });
    const cost = Math.min(...variants.map((v) => v.cost).filter((c) => c > 0)) || 0;
    const price = retailFrom(cost);
    products.push({
      slug: slugify(name),
      name,
      department,
      category,
      tagline: sentence(p.type ?? p.subtitle ?? "", 60),
      story: sentence(p.description ?? p.body_html ?? "", 420),
      price,
      variantKind: variantKindFor(p.options?.[0]?.name ?? ""),
      variants: variants.map((v) => ({
        code: v.code,
        label: v.label,
        ...(v.price !== price ? { price: v.price } : {}),
        stock: v.stock,
        ...(v.image ? { image: v.image } : {}),
        ...(v.supplierSku ? { supplierSku: v.supplierSku } : {}),
      })),
      details: [p.type, p.vendor && `Supplied by ${p.vendor}`].filter(Boolean).map((d) => sentence(d, 80)),
      care: null,
      grams: Math.round(Number(p.grams ?? 0)) || 250,
      images: (p.images ?? []).map((im) => (typeof im === "string" ? im : im.src)).filter(Boolean),
      supplier,
      supplierProductId: String(p.id ?? p.sku ?? slugify(name)),
      supplierUrl: p.url ?? null,
      costCents: cost || null,
      status,
    });
  }
  return { products, skipped };
}

// ─── Output ──────────────────────────────────────────────────────────────────

const q = (v) => (v == null || v === "" ? "null" : `'${String(v).replace(/'/g, "''")}'`);
const arr = (xs) => (xs?.length ? `array[${xs.map(q).join(",")}]` : "'{}'");

function toSql(products) {
  const rows = products
    .map((p, i) =>
      "  (" +
      [
        q(`${supplier}-${p.supplierProductId}`.slice(0, 64)),
        q(p.slug), q(p.name), q(p.department), q(p.category), q(p.tagline), q(p.story),
        p.price, "null", q(p.variantKind), `${q(JSON.stringify(p.variants))}::jsonb`,
        arr(p.details), q(p.care), p.grams, q("#C8A063"), q("#8A6215"),
        arr(p.images), q(p.images[0] ?? null),
        q(p.supplier), q(p.supplierProductId), q(p.supplierUrl), p.costCents ?? "null", "null", "null",
        q(p.status), "false", 100 + i,
      ].join(",") + ")",
    )
    .join(",\n");

  return `-- ─── Imported dropship catalogue ────────────────────────────────────────────
-- GENERATED by scripts/import_alidrop.mjs from ${path.basename(file)}
-- ${products.length} products · department ${department} · supplier ${supplier}
--
-- Matched on (supplier, supplier_product_id): re-running an import updates each
-- piece rather than adding a second copy. Stock and price come from the export,
-- so the most recent import wins on both.

begin;

insert into public.products
  (id, slug, name, department, category, tagline, story, price_cents, compare_at_cents, variant_kind, variants, details, care, grams, hue, shade, images, image_url, supplier, supplier_product_id, supplier_url, cost_cents, lead_min_days, lead_max_days, status, vip_only, sort_order)
values
${rows}
on conflict (supplier, supplier_product_id) do update set
  slug = excluded.slug,
  name = excluded.name,
  department = excluded.department,
  category = excluded.category,
  tagline = excluded.tagline,
  story = excluded.story,
  price_cents = excluded.price_cents,
  variant_kind = excluded.variant_kind,
  variants = excluded.variants,
  details = excluded.details,
  grams = excluded.grams,
  images = excluded.images,
  image_url = excluded.image_url,
  supplier_url = excluded.supplier_url,
  cost_cents = excluded.cost_cents,
  status = excluded.status,
  updated_at = now();

commit;
`;
}

async function pushToSupabase(products) {
  const url = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error("--push needs SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the environment.");
    process.exit(1);
  }
  const body = products.map((p, i) => ({
    id: `${supplier}-${p.supplierProductId}`.slice(0, 64),
    slug: p.slug,
    name: p.name,
    department: p.department,
    category: p.category,
    tagline: p.tagline,
    story: p.story,
    price_cents: p.price,
    variant_kind: p.variantKind,
    variants: p.variants,
    details: p.details,
    grams: p.grams,
    images: p.images,
    image_url: p.images[0] ?? null,
    supplier: p.supplier,
    supplier_product_id: p.supplierProductId,
    supplier_url: p.supplierUrl,
    cost_cents: p.costCents,
    status: p.status,
    sort_order: 100 + i,
  }));
  const res = await fetch(`${url.replace(/\/$/, "")}/rest/v1/products?on_conflict=supplier,supplier_product_id`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    console.error(`Supabase refused the import (${res.status}): ${await res.text()}`);
    process.exit(1);
  }
  console.log(`pushed ${body.length} products to ${url}`);
}

// ─── Run ─────────────────────────────────────────────────────────────────────

const raw = await fs.readFile(file, "utf8");
const isJson = file.endsWith(".json") || raw.trimStart().startsWith("[") || raw.trimStart().startsWith("{");
const { products, skipped } = isJson ? fromJson(JSON.parse(raw)) : fromShopifyCsv(parseCsv(raw));

if (!products.length) {
  console.error(`Nothing to import from ${file}.`);
  if (skipped.length) for (const s of skipped) console.error(`  · ${s.name}: ${s.why}`);
  process.exit(1);
}

// Two slugs that collide would overwrite each other on the storefront, so the
// later one is suffixed rather than silently winning.
const seen = new Set();
for (const p of products) {
  let slug = p.slug;
  for (let n = 2; seen.has(slug); n += 1) slug = `${p.slug}-${n}`;
  p.slug = slug;
  seen.add(slug);
}

const noImages = products.filter((p) => !p.images.length);
const noStock = products.filter((p) => p.variants.every((v) => v.stock <= 0));
const noCost = products.filter((p) => !p.costCents);

console.log(`Parsed ${products.length} products from ${path.basename(file)} into ${department}.`);
console.log(`  images   ${products.length - noImages.length}/${products.length} have photography`);
console.log(`  stock    ${products.length - noStock.length}/${products.length} have a variant in stock`);
console.log(`  pricing  ×${margin} on supplier cost, rounded up to $${roundTo / 100}`);
for (const p of products.slice(0, 5)) {
  console.log(`  · ${p.name} — ${p.category} · ${p.variants.length} variants · ${p.images.length} images · $${p.price / 100}`);
}
if (products.length > 5) console.log(`  · … and ${products.length - 5} more`);
if (noCost.length) console.log(`  ! ${noCost.length} products had no cost column; priced from their listed price instead.`);
if (skipped.length) {
  console.log(`\nSkipped ${skipped.length}:`);
  for (const s of skipped) console.log(`  · ${s.name}: ${s.why}`);
}

if (dryRun) {
  console.log("\n--dry-run: nothing written.");
  process.exit(0);
}
if (push) {
  await pushToSupabase(products);
  process.exit(0);
}

const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
const out = String(flag("out", `supabase/migrations/${stamp}_import_${supplier}_${department}.sql`));
await fs.mkdir(path.dirname(out), { recursive: true });
await fs.writeFile(out, toSql(products));
console.log(`\nwrote ${out} — apply it with your usual migration step, or re-run with --push.`);
