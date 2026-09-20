import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

// Transpile actual server modules in an isolated temporary directory; no network,
// credentials, live payments or database mutations are used by these regressions.
const temp = await fs.mkdtemp(path.resolve('node_modules/.checkout-security-'));
async function compile(dir) {
  for (const entry of await fs.readdir(dir, {withFileTypes: true})) {
    const source = path.join(dir, entry.name);
    if (entry.isDirectory()) { await compile(source); continue; }
    if (!source.endsWith('.ts')) continue;
    const target = path.join(temp, source.replace(/\.ts$/, '.js'));
    await fs.mkdir(path.dirname(target), {recursive:true});
    await fs.writeFile(target, ts.transpileModule(await fs.readFile(source,'utf8'), {
      compilerOptions:{module:ts.ModuleKind.ESNext, target:ts.ScriptTarget.ES2022}
    }).outputText);
  }
}
try {
  await fs.writeFile(path.join(temp,'package.json'), '{"type":"module"}');
  await compile('api');
  // The storefront seed too, so the two copies of the goods catalogue can be
  // compared: the api mirror is what actually prices a clothing line.
  await compile('src/lib');
  const {priceLines} = await import(pathToFileURL(path.join(temp,'api/_lib/stripe.js')));
  const {bagLines, chunkBag, recordOrder} = await import(pathToFileURL(path.join(temp,'api/_lib/record.js')));
  const fragrance = {id:'test', name:'Test fragrance', price:4700, price10:2100, price30:3400, stock10:20, stock30:20, stock50:20};
  const catalogue = new Map([['test', fragrance]]);
  const line = (format, qty=1, label) => ({fragranceId:'test',format,qty,label,engraving:null});
  assert.equal(priceLines([line('perf50')],catalogue)[0].unitCents,4700);
  assert.equal(priceLines([line('perf10',5,'Discovery Box')],catalogue)[0].unitCents,1000);
  for(const format of ['perf30','perf50','car','wash','moist','ritual']) {
    assert.throws(()=>priceLines([line('perf10',5,'Discovery Box'),line(format,1,'Discovery Box')],catalogue), /only 10 ml/);
  }
  assert.throws(()=>priceLines([line('perf10',4,'Discovery Box')],catalogue),/sets of five/);
  for(const qty of [0,-1,1.5,21,NaN,Infinity,'5']) assert.throws(()=>priceLines([line('perf10',qty)],catalogue),/Quantity/);
  assert.throws(()=>priceLines([line('perf50',1,'untrusted discount')],catalogue),/Invalid bundle/);
  const mixed = priceLines([line('perf10',5,'Discovery Box'),line('perf50')],catalogue);
  assert.deepEqual(mixed.map(x=>x.unitCents),[1000,4700]);

  const rows=Array.from({length:20},(_,i)=>({f:'test',k:'perf50',q:1,e:`Engraving ${i}`,s:50,u:4700}));
  const metadata=chunkBag(rows);
  assert.ok(metadata.lines2);
  assert.deepEqual(await bagLines({}, {metadata}),rows);
  const session={id:'cs_test',payment_status:'paid',metadata,payment_intent:'pi_test'};
  let calls=0;
  const db={rpc:async(name,args)=>{calls++;assert.equal(name,'record_paid_order'); assert.equal(args.p_session_id,'cs_test'); assert.equal(args.p_rows.length,20); return {data:20,error:null};}};
  assert.deepEqual(await recordOrder({},db,session),{recorded:20});
  await assert.rejects(recordOrder({},db,{...session,payment_status:'unpaid'}),/not paid/);
  assert.equal(calls,1);
  await assert.rejects(recordOrder({}, {rpc:async()=>({error:{message:'database unavailable'}})}, session),/database unavailable/);

  // ─── Goods ────────────────────────────────────────────────────────────────
  const {GOODS_SEED} = await import(pathToFileURL(path.join(temp,'api/_lib/goods.js')));
  const {PRODUCTS} = await import(pathToFileURL(path.join(temp,'src/lib/goods.js')));

  // The api mirror is what prices a bag; if it drifts from the storefront seed
  // a shopper is shown one price and charged another.
  assert.equal(GOODS_SEED.length, PRODUCTS.length, 'api goods mirror has a different number of products');
  const mirror = new Map(GOODS_SEED.map(g=>[g.id,g]));
  for (const p of PRODUCTS) {
    const g = mirror.get(p.id);
    assert.ok(g, `api mirror is missing ${p.id}`);
    assert.equal(g.slug, p.slug, `${p.id} slug`);
    assert.equal(g.name, p.name, `${p.id} name`);
    assert.equal(g.price, p.price, `${p.id} price`);
    assert.equal(g.grams, p.grams, `${p.id} grams`);
    assert.equal(g.variantKind, p.variantKind, `${p.id} variantKind`);
    assert.deepEqual(g.variants.map(v=>[v.code,v.price??null,v.stock]), p.variants.map(v=>[v.code,v.price??null,v.stock]), `${p.id} variants`);
    assert.equal(!!g.vipOnly, !!p.vipOnly, `${p.id} vipOnly`);
  }

  const dress = {id:'gtest', slug:'test-dress', name:'Test Dress', price:32900, variantKind:'size', grams:240, status:'live',
    variants:[{code:'S',label:'S',stock:3},{code:'M',label:'M',stock:0},{code:'L',label:'L',price:34900,stock:5}]};
  const goods = new Map([['gtest',dress]]);
  const gline = (variant, qty=1) => ({kind:'goods', productId:'gtest', variant, qty, engraving:null});

  assert.equal(priceLines([gline('S')],catalogue,goods)[0].unitCents,32900);
  // A variant price override wins over the product price.
  assert.equal(priceLines([gline('L')],catalogue,goods)[0].unitCents,34900);
  // Nothing about a goods line goes near the fragrance pricing path.
  assert.equal(priceLines([gline('S')],catalogue,goods)[0].sizeMl,0);
  assert.equal(priceLines([gline('S')],catalogue,goods)[0].grams,240);
  // A browser-supplied price is ignored; the server prices from the catalogue.
  assert.equal(priceLines([{...gline('S'), unitCents:1, price:1}],catalogue,goods)[0].unitCents,32900);
  assert.throws(()=>priceLines([gline('M')],catalogue,goods),/not available/, 'sold-out variant');
  assert.throws(()=>priceLines([gline('S',9)],catalogue,goods),/Only 3 left/, 'over-ordering a variant');
  assert.throws(()=>priceLines([gline('XXL')],catalogue,goods),/unknown option/);
  assert.throws(()=>priceLines([{kind:'goods',productId:'nope',variant:'S',qty:1,engraving:null}],catalogue,goods),/unknown product/);
  // Without a goods catalogue the line is refused, never priced from nothing.
  assert.throws(()=>priceLines([gline('S')],catalogue),/unknown product/);
  assert.throws(()=>priceLines([{kind:'goods',productId:'gtest',variant:5,qty:1,engraving:null}],catalogue,goods),/Invalid goods line/);
  for(const qty of [0,-1,1.5,21,NaN,'5']) assert.throws(()=>priceLines([gline('S',qty)],catalogue,goods),/Quantity/);
  // A goods line can never be smuggled into a Discovery Box.
  assert.throws(()=>priceLines([line('perf10',5,'Discovery Box'),{...gline('S'),label:'Discovery Box'}],catalogue,goods),/sets of five|Invalid/);

  const both = priceLines([line('perf50'),gline('S')],catalogue,goods);
  assert.deepEqual(both.map(x=>x.kind),['fragrance','goods']);
  assert.deepEqual(both.map(x=>x.unitCents),[4700,32900]);

  // A goods order records against product_id, and leaves fragrance_id null.
  const goodsRows=[{p:'gtest',v:'S',q:1,e:null,s:0,u:32900},{f:'test',k:'perf50',q:1,e:null,s:50,u:4700}];
  const goodsSession={id:'cs_goods',payment_status:'paid',metadata:chunkBag(goodsRows),payment_intent:'pi_goods'};
  let captured=null;
  const goodsDb={rpc:async(_n,args)=>{captured=args.p_rows; return {data:args.p_rows.length,error:null};}};
  assert.deepEqual(await recordOrder({},goodsDb,goodsSession),{recorded:2});
  assert.equal(captured[0].product_id,'gtest');
  assert.equal(captured[0].variant,'S');
  assert.equal(captured[0].fragrance_id,null);
  assert.equal(captured[0].format,null);
  assert.equal(captured[0].size_ml,0);
  assert.equal(captured[1].fragrance_id,'test');
  assert.equal(captured[1].product_id,null);
  assert.equal(captured[1].format,'perf50');

  console.log('PASS: bundle isolation, quantities, regular prices, multi-chunk baskets, paid-only recording, RPC failures, goods pricing and catalogue parity.');
} finally { await fs.rm(temp,{recursive:true,force:true}); }
