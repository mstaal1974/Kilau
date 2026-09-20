// Emits supabase/migrations/0033_goods_seed.sql from src/lib/goods.ts, so the
// stored catalogue and the seed the app falls back to cannot drift apart by
// hand-editing one of them. Re-run after changing the seed:
//
//   node scripts/generate_goods_seed.mjs
//
import fs from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

const out = "supabase/migrations/0033_goods_seed.sql";
const temp = await fs.mkdtemp(path.resolve("node_modules/.goods-seed-"));
try {
  await fs.writeFile(path.join(temp, "package.json"), '{"type":"module"}');
  const source = await fs.readFile("src/lib/goods.ts", "utf8");
  await fs.writeFile(
    path.join(temp, "goods.js"),
    ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText,
  );
  const { PRODUCTS } = await import(pathToFileURL(path.join(temp, "goods.js")));

  const q = (v) => (v == null ? "null" : `'${String(v).replace(/'/g, "''")}'`);
  const arr = (xs) => (xs.length ? `array[${xs.map(q).join(",")}]` : "'{}'");
  const rows = PRODUCTS.map((p, i) =>
    "  (" +
    [
      q(p.id), q(p.slug), q(p.name), q(p.department), q(p.category), q(p.tagline), q(p.story),
      p.price, p.compareAt ?? "null", q(p.variantKind), `${q(JSON.stringify(p.variants))}::jsonb`,
      arr(p.details), q(p.care ?? null), p.grams, q(p.hue), q(p.shade), q(p.imageUrl ?? null),
      q(p.status ?? "live"), p.vipOnly ? "true" : "false", i + 1,
    ].join(",") + ")",
  ).join(",\n");

  const sql = `-- ─── The goods catalogue ─────────────────────────────────────────────────────
--
-- GENERATED from src/lib/goods.ts by scripts/generate_goods_seed.mjs. Edit the
-- seed there and re-run the script rather than editing this file, so the rows
-- the database stores and the rows the app falls back to stay identical.
--
-- Idempotent: re-running updates the catalogue in place and never touches
-- stock that the shop has since sold down, because the whole variants array is
-- replaced only on a fresh insert.

begin;

insert into public.products
  (id, slug, name, department, category, tagline, story, price_cents, compare_at_cents, variant_kind, variants, details, care, grams, hue, shade, image_url, status, vip_only, sort_order)
values
${rows}
on conflict (id) do update set
  slug = excluded.slug,
  name = excluded.name,
  department = excluded.department,
  category = excluded.category,
  tagline = excluded.tagline,
  story = excluded.story,
  price_cents = excluded.price_cents,
  compare_at_cents = excluded.compare_at_cents,
  variant_kind = excluded.variant_kind,
  details = excluded.details,
  care = excluded.care,
  grams = excluded.grams,
  hue = excluded.hue,
  shade = excluded.shade,
  status = excluded.status,
  vip_only = excluded.vip_only,
  sort_order = excluded.sort_order,
  updated_at = now();

commit;
`;
  await fs.writeFile(out, sql);
  console.log(`wrote ${out} — ${PRODUCTS.length} products`);
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}
