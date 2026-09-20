// The same pixel audit, but for the things a route alone does not show: the
// overlays, the phone layout, and the quiz screens you only reach by answering.
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:4173/';
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const la = lum(...a), lb = lum(...b); return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05); };

const COLLECT = () => {
  const out = [];
  for (const el of document.querySelectorAll('*')) {
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || +s.opacity === 0) continue;
    const nodes = Array.from(el.childNodes).filter((n) => n.nodeType === 3 && n.textContent.trim());
    if (!nodes.length) continue;
    const rects = [];
    for (const n of nodes) { const r = document.createRange(); r.selectNodeContents(n); rects.push(...Array.from(r.getClientRects())); }
    const visible = (r) => {
      const hit = document.elementFromPoint(Math.min(innerWidth - 1, r.x + Math.min(6, r.width / 2)), Math.min(innerHeight - 1, r.y + r.height / 2));
      return !!hit && (hit === el || el.contains(hit) || hit.contains(el));
    };
    const boxes = rects.filter((r) => r.width >= 2 && r.height >= 2 && r.bottom > 0 && r.top < innerHeight && visible(r));
    if (!boxes.length) continue;
    const m = String(s.color).match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if (!m || (m[4] !== undefined && +m[4] === 0)) continue;
    out.push({ text: nodes.map((n) => n.textContent.trim()).join(' ').slice(0, 44), size: parseFloat(s.fontSize), weight: +s.fontWeight || 400,
      fg: [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]],
      boxes: boxes.map((b) => ({ x: Math.max(0, b.x), y: Math.max(0, b.y), w: Math.min(b.width, innerWidth - b.x), h: Math.min(b.height, innerHeight - b.y) })) });
  }
  return out;
};

async function check(page, label) {
  const items = await page.evaluate(COLLECT);
  if (!items.length) { console.log(`=== ${label} — no text ===`); return 0; }
  await page.addStyleTag({ content: '*{color:transparent!important;text-shadow:none!important;-webkit-text-fill-color:transparent!important}' });
  await page.waitForTimeout(150);
  const png = PNG.sync.read(await page.screenshot());
  await page.evaluate(() => document.querySelectorAll('style').forEach((s) => { if (s.textContent.includes('-webkit-text-fill-color:transparent')) s.remove(); }));
  const bad = [];
  for (const it of items) {
    const need = it.size >= 24 || (it.size >= 18.66 && it.weight >= 700) ? 3 : 4.5;
    let worst = Infinity, px = null;
    for (const b of it.boxes) {
      for (let y = Math.round(b.y) + 2; y <= Math.min(png.height - 1, Math.round(b.y + b.h) - 2); y++)
        for (let x = Math.round(b.x) + 2; x <= Math.min(png.width - 1, Math.round(b.x + b.w) - 2); x++) {
          if (x < 0 || y < 0) continue;
          const i = (png.width * y + x) << 2;
          const bg = [png.data[i], png.data[i + 1], png.data[i + 2]];
          const cr = ratio(it.fg.slice(0, 3).map((c, k) => c * it.fg[3] + bg[k] * (1 - it.fg[3])), bg);
          if (cr < worst) { worst = cr; px = bg; }
        }
    }
    if (worst !== Infinity && worst + 0.005 < need) bad.push(`  ${worst.toFixed(2)}/${need} ${Math.round(it.size)}px rgba(${it.fg}) on rgb(${px}) :: "${it.text}"`);
  }
  console.log(`=== ${label} — ${bad.length} ===`);
  bad.slice(0, 12).forEach((l) => console.log(l));
  return bad.length;
}

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
let total = 0;

// ── Overlays on the desktop layout ──────────────────────────────────────────
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 });
await page.goto(BASE + '#/fragrances', { waitUntil: 'networkidle' });
await page.waitForTimeout(700);
await page.getByRole('button', { name: /Your bag/i }).click();
await page.waitForTimeout(500);
total += await check(page, 'bag drawer');
await page.keyboard.press('Escape').catch(() => {});
await page.goto(BASE + '#/fragrances', { waitUntil: 'networkidle' });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(600);
await page.getByRole('button', { name: /^Sign In$/i }).first().click();
await page.waitForTimeout(500);
total += await check(page, 'sign-in dialog');
await page.goto(BASE + '#/fragrances', { waitUntil: 'networkidle' });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(700);
const quick = page.getByRole('button', { name: /Choose options/i }).first();
if (await quick.count()) { await quick.click(); await page.waitForTimeout(600); total += await check(page, 'quick view'); }
await page.goto(BASE + '#/', { waitUntil: 'networkidle' });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(700);
const chat = page.locator('button[aria-label*="oncierge" i], button[aria-label*="hat" i]').first();
if (await chat.count()) { await chat.click({ timeout: 5000 }).catch(() => {}); await page.waitForTimeout(700); total += await check(page, 'chat widget'); }

// ── A piece of goods, from the product page to the bag ──────────────────────
await page.goto(BASE + '#/p/sanur-slip-dress', { waitUntil: 'networkidle' });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(700);
const addDress = page.getByRole('button', { name: /^Add to bag$/i }).first();
if (await addDress.count()) {
  await addDress.click();
  await page.waitForTimeout(700);
  total += await check(page, 'bag drawer (goods)');
  await page.goto(BASE + '#/checkout', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  total += await check(page, 'checkout (goods)');
  await page.evaluate(() => window.scrollTo(0, 700));
  await page.waitForTimeout(400);
  total += await check(page, 'checkout (goods, scrolled)');
}

// A sold-out variant, which is the one state the picker draws differently.
await page.goto(BASE + '#/p/kilau-skin-tint', { waitUntil: 'networkidle' });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(700);
total += await check(page, 'shade picker');

// ── Checkout with something in the bag ──────────────────────────────────────
await page.goto(BASE + '#/fragrances', { waitUntil: 'networkidle' });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(700);
const add = page.getByRole('button', { name: /Choose options/i }).first();
if (await add.count()) {
  await add.click();
  await page.waitForTimeout(500);
  const confirm = page.getByRole('button', { name: /^Add to bag$/i }).last();
  await confirm.click({ timeout: 4000 }).catch(() => {});
  await page.waitForTimeout(600);
  await page.goto(BASE + '#/checkout', { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  total += await check(page, 'checkout (filled)');
  await page.evaluate(() => window.scrollTo(0, 800));
  await page.waitForTimeout(400);
  total += await check(page, 'checkout (filled, scrolled)');
}

// ── The quiz, screen by screen ──────────────────────────────────────────────
await page.goto(BASE + '#/discover', { waitUntil: 'networkidle' });
await page.reload({ waitUntil: 'networkidle' });
await page.waitForTimeout(900);
const start = page.getByRole('button', { name: /Discover My Scent DNA/i }).first();
if (await start.count()) {
  await start.click();
  for (let i = 0; i < 16; i++) {
    await page.waitForTimeout(700);
    total += await check(page, `quiz step ${i + 1}`);
    const opt = page.locator('.sd-card, .sd-chip-card, button:has-text("Continue"), button:has-text("Reveal")').first();
    if (!(await opt.count())) break;
    await opt.click().catch(() => {});
  }
  await page.waitForTimeout(1600);
  total += await check(page, 'scentprint result');
}
await page.close();

// ── The phone layout ────────────────────────────────────────────────────────
const m = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
for (const route of ['#/', '#/fragrances', '#/checkout', '#/subscribe', '#/discover', '#/women', '#/beauty', '#/c/dresses', '#/p/sanur-slip-dress', '#/p/kilau-satin-lipstick']) {
  await m.goto(BASE + route, { waitUntil: 'networkidle' });
  await m.waitForTimeout(700);
  total += await check(m, `phone ${route}`);
}
await m.goto(BASE + '#/', { waitUntil: 'networkidle' });
await m.waitForTimeout(600);
const burger = m.locator('button[aria-label="Open menu"]').first();
if (await burger.count()) { await burger.click(); await m.waitForTimeout(500); total += await check(m, 'phone menu'); }
console.log(`\nTOTAL: ${total}`);
await browser.close();
