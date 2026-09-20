// Non-text contrast: a control's own boundary must clear 3:1 against what sits
// behind it, or the field is invisible on paper.
import { chromium } from 'playwright';
const lin = (c) => { c /= 255; return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
const parse = (c) => { const m = String(c).match(/rgba?\(([\d.]+),\s*([\d.]+),\s*([\d.]+)(?:,\s*([\d.]+))?\)/); return m ? [+m[1], +m[2], +m[3], m[4] === undefined ? 1 : +m[4]] : null; };

const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const p = await b.newPage({ viewport: { width: 1400, height: 1200 } });
const seen = new Set();
for (const route of ['#/', '#/checkout', '#/find', '#/subscribe', '#/help', '#/fragrances', '#/discovery', '#/about']) {
  await p.goto('http://127.0.0.1:4173/' + route, { waitUntil: 'networkidle' });
  await p.reload({ waitUntil: 'networkidle' });
  await p.waitForTimeout(600);
  const rows = await p.evaluate(() => {
    const out = [];
    for (const el of document.querySelectorAll('input, textarea, select, label')) {
      const s = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      if (r.width < 4 || r.height < 4) continue;
      let bgEl = el.parentElement, bg = 'rgb(255,255,255)';
      while (bgEl) { const c = getComputedStyle(bgEl).backgroundColor; if (c && !c.endsWith(', 0)') && c !== 'rgba(0, 0, 0, 0)') { bg = c; break; } bgEl = bgEl.parentElement; }
      out.push({ tag: el.tagName, type: el.type || '', border: s.borderTopColor, width: s.borderTopWidth, bg, own: s.backgroundColor });
    }
    return out;
  });
  for (const r of rows) {
    if (r.width === '0px') continue;
    const fg = parse(r.border), bgc = parse(r.bg);
    if (!fg || !bgc) continue;
    const eff = fg.slice(0, 3).map((c, i) => c * fg[3] + bgc[i] * (1 - fg[3]));
    const cr = ratio(eff, bgc.slice(0, 3));
    const key = `${r.tag}${r.type}|${r.border}|${r.bg}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (cr < 3) console.log(`  ${cr.toFixed(2)} ${route} ${r.tag}[${r.type}] border=${r.border} over ${r.bg}`);
  }
}
await b.close();
