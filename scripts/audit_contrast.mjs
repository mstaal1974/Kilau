// Pixel-level contrast audit: measures every run of text against the pixels
// actually rendered behind it, which is the only way to check type that sits
// over photography. Text is made transparent, the page is captured, and each
// text box is sampled against its own colour.
import { chromium } from 'playwright';
import { PNG } from 'pngjs';

const BASE = process.argv[2] || process.env.BASE_URL || 'http://127.0.0.1:4173/';
const ROUTES = process.argv.slice(3).length ? process.argv.slice(3) : [
  '#/', '#/fragrances', '#/discovery', '#/car', '#/body', '#/subscribe',
  '#/checkout', '#/find', '#/help', '#/about', '#/account', '#/thanks',
  '#/shop/him', '#/product/smoky-obsidian', '#/discover',
];

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
    // Measure the line boxes of the text itself, not the element's padding box:
    // a heading whose box spans a photo is only ever read where its glyphs are.
    const rects = [];
    for (const n of nodes) { const range = document.createRange(); range.selectNodeContents(n); rects.push(...Array.from(range.getClientRects())); }
    // Drop anything painted over by something else — chiefly text scrolled
    // under the sticky header, which is occluded rather than low-contrast.
    const visible = (r) => {
      const cx = Math.min(innerWidth - 1, r.x + Math.min(6, r.width / 2));
      const cy = Math.min(innerHeight - 1, r.y + r.height / 2);
      const hit = document.elementFromPoint(cx, cy);
      return !!hit && (hit === el || el.contains(hit) || hit.contains(el));
    };
    const boxes = rects.filter((r) => r.width >= 2 && r.height >= 2 && r.bottom > 0 && r.top < innerHeight && visible(r));
    if (!boxes.length) continue;
    const text = nodes.map((n) => n.textContent.trim()).join(' ').trim();
    const r = boxes[0];
    const m = String(s.color).match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/);
    if (!m || (m[4] !== undefined && +m[4] === 0)) continue;
    const size = parseFloat(s.fontSize), weight = +s.fontWeight || 400;
    out.push({
      text: text.slice(0, 48), size, weight,
      fg: [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]],
      boxes: boxes.map((b) => ({ x: Math.max(0, b.x), y: Math.max(0, b.y), w: Math.min(b.width, innerWidth - b.x), h: Math.min(b.height, innerHeight - b.y) })),
      overArt: (() => { let n = el; while (n && n !== document.documentElement) { const cs = getComputedStyle(n);
        if (cs.backgroundImage !== 'none' && !cs.backgroundImage.startsWith('linear-gradient') && !cs.backgroundImage.startsWith('radial-gradient')) return true;
        if (n.querySelector && n.querySelector(':scope > img')) return true; n = n.parentElement; } return false; })(),
    });
  }
  return out;
};

const browser = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
const page = await browser.newPage({ viewport: { width: 1400, height: 1000 }, deviceScaleFactor: 1 });
let total = 0;
for (const route of ROUTES) {
  await page.goto(BASE + route, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const scans = [];
  for (const scrollY of [0, 900, 1800, 2700]) {
    await page.evaluate((y) => window.scrollTo(0, y), scrollY);
    await page.waitForTimeout(250);
    const items = await page.evaluate(COLLECT);
    if (!items.length) continue;
    await page.addStyleTag({ content: '*{color:transparent!important;text-shadow:none!important;-webkit-text-fill-color:transparent!important}' });
    await page.waitForTimeout(120);
    const png = PNG.sync.read(await page.screenshot());
    await page.evaluate(() => document.querySelectorAll('style').forEach((s) => { if (s.textContent.includes('-webkit-text-fill-color:transparent')) s.remove(); }));
    for (const it of items) {
      const need = it.size >= 24 || (it.size >= 18.66 && it.weight >= 700) ? 3 : 4.5;
      let worst = Infinity, worstPx = null;
      for (const box of it.boxes) {
        // A one-pixel inset keeps the sample off the glyph's own antialiased edge.
        const x0 = Math.round(box.x) + 2, y0 = Math.round(box.y) + 2;
        const x1 = Math.min(png.width - 1, Math.round(box.x + box.w) - 2), y1 = Math.min(png.height - 1, Math.round(box.y + box.h) - 2);
        for (let y = y0; y <= y1; y += 1) for (let x = x0; x <= x1; x += 1) {
          if (x < 0 || y < 0) continue;
          const i = (png.width * y + x) << 2;
          const bg = [png.data[i], png.data[i + 1], png.data[i + 2]];
          const eff = it.fg.slice(0, 3).map((c, k) => c * it.fg[3] + bg[k] * (1 - it.fg[3]));
          const cr = ratio(eff, bg);
          if (cr < worst) { worst = cr; worstPx = bg; var wx = x, wy = y; }
        }
      }
      if (worst === Infinity) continue;
      var at = typeof wx === 'number' ? `${wx},${wy}` : '?';
      if (worst + 0.005 < need) scans.push({ ...it, worst: +worst.toFixed(2), need, bg: worstPx, at, scrollY });
    }
  }
  const seen = new Set();
  const uniq = scans.filter((s) => { const k = s.text + s.size; if (seen.has(k)) return false; seen.add(k); return true; });
  console.log(`\n=== ${route} — ${uniq.length} ===`);
  for (const s of uniq.slice(0, 14))
    console.log(`  ${s.worst}/${s.need} ${Math.round(s.size)}px rgba(${s.fg}) worst-bg rgb(${s.bg}) @${s.at} scroll=${s.scrollY} art=${s.overArt} :: "${s.text}"`);
  total += uniq.length;
}
console.log(`\nTOTAL: ${total}`);
await browser.close();
