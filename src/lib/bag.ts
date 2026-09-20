// The bag: format-level lines persisted to localStorage, plus the orders the
// visitor has placed (each line becomes an order row, paid at checkout). A tiny
// external store so any component can subscribe with useSyncExternalStore.

import type { FormatKey } from "./data";

interface LineBase {
  id: string;
  qty: number;
  engraving: string | null;
  /** Price override in cents — Discovery Box pieces are priced as a set. */
  unitPrice?: number;
  label?: string; // e.g. "Discovery Box"
}

/** A fragrance in one of its formats. */
export interface FragranceLine extends LineBase {
  kind: "fragrance";
  // `${fragranceId}:${format}`, or `…:box` for a Discovery Box piece.
  fragranceId: string;
  format: FormatKey;
}

/** A piece of goods in one of its variants — a size, a shade, a strap. */
export interface GoodsLine extends LineBase {
  kind: "goods";
  // `g:${productId}:${variant}`.
  productId: string;
  variant: string;
}

export type BagLine = FragranceLine | GoodsLine;

export const isGoodsLine = (l: BagLine): l is GoodsLine => l.kind === "goods";

export interface Order {
  id: string;
  fragranceId: string;
  format: FormatKey;
  sizeMl: number;
  qty: number;
  chargeCents: number; // per unit
  engraving: string | null;
  createdAt: number;
}

const BAG_KEY = "kb:bag";
const ORDERS_KEY = "kb:orders";
const LEGACY_KEY = "kb:commits"; // pre-redesign single-commit map

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}
function save(key: string, v: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* quota / private mode */
  }
}

/** Migrates the old {fragranceId: {label,sizeMl,chargeCents}} map into orders. */
function loadOrders(): Order[] {
  const orders = load<Order[]>(ORDERS_KEY, []);
  const legacy = load<Record<string, { label: string | null; sizeMl?: number; chargeCents?: number }> | null>(LEGACY_KEY, null);
  if (!legacy) return orders;
  const migrated: Order[] = Object.entries(legacy).map(([fragranceId, rec]) => ({
    id: `legacy:${fragranceId}`,
    fragranceId,
    format: rec.sizeMl === 10 ? "perf10" : rec.sizeMl === 30 ? "perf30" : "perf50",
    sizeMl: rec.sizeMl ?? 50,
    qty: 1,
    chargeCents: rec.chargeCents ?? 0,
    engraving: rec.label,
    createdAt: 0,
  }));
  const all = [...orders, ...migrated.filter((m) => !orders.some((o) => o.id === m.id))];
  save(ORDERS_KEY, all);
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
  return all;
}

/**
 * Bags saved before the house sold anything but fragrance have no `kind`.
 * They are all fragrance lines, so tag them on the way in rather than leaving
 * a shopper's bag to fail the union.
 */
function loadLines(): BagLine[] {
  return load<BagLine[]>(BAG_KEY, []).map((l) => (l.kind ? l : { ...(l as FragranceLine), kind: "fragrance" }));
}

let lines: BagLine[] = loadLines();
let orders: Order[] = loadOrders();
const subs = new Set<() => void>();
function emit() {
  for (const cb of subs) cb();
}

export function subscribeBag(cb: () => void): () => void {
  subs.add(cb);
  return () => subs.delete(cb);
}
export function bagLines(): BagLine[] {
  return lines;
}
export function bagOrders(): Order[] {
  return orders;
}

/** Adds `line` to the bag, or tops up the quantity if it is already there. */
function put(line: BagLine, qty: number, engraving: string | null): void {
  const existing = lines.find((l) => l.id === line.id);
  lines = existing
    ? lines.map((l) => (l.id === line.id ? { ...l, qty: Math.min(9, l.qty + qty), engraving: engraving ?? l.engraving } : l))
    : [...lines, line];
  save(BAG_KEY, lines);
  emit();
}

export function addToBag(
  fragranceId: string,
  format: FormatKey,
  qty = 1,
  engraving: string | null = null,
  extra?: { unitPrice?: number; label?: string },
): void {
  const id = `${fragranceId}:${format}${extra?.label ? ":box" : ""}`;
  put({ kind: "fragrance", id, fragranceId, format, qty, engraving, ...extra }, qty, engraving);
}

/** The goods equivalent: a product in one of its variants. */
export function addProductToBag(productId: string, variant: string, qty = 1, engraving: string | null = null): void {
  put({ kind: "goods", id: `g:${productId}:${variant}`, productId, variant, qty, engraving }, qty, engraving);
}

export function setQty(id: string, qty: number): void {
  lines = qty <= 0 ? lines.filter((l) => l.id !== id) : lines.map((l) => (l.id === id ? { ...l, qty: Math.min(9, qty) } : l));
  save(BAG_KEY, lines);
  emit();
}

export function removeLine(id: string): void {
  setQty(id, 0);
}

export function clearBag(): void {
  lines = [];
  save(BAG_KEY, lines);
  emit();
}

export function bagCount(): number {
  return lines.reduce((n, l) => n + l.qty, 0);
}

/** Moves the bag into orders (called after each line is authorised). */
export function recordOrders(placed: Omit<Order, "id" | "createdAt">[]): Order[] {
  const now = Date.now();
  const created = placed.map((p, i) => ({ ...p, id: `o_${now.toString(36)}_${i}`, createdAt: now }));
  orders = [...created, ...orders];
  save(ORDERS_KEY, orders);
  lines = [];
  save(BAG_KEY, lines);
  emit();
  return created;
}

/** Local orders for a fragrance (used to bump batch progress optimistically). */
export function ordersFor(fragranceId: string): number {
  return orders.filter((o) => o.fragranceId === fragranceId).reduce((n, o) => n + o.qty, 0);
}

// ─── Discovery box: pick five 10 ml scents ───────────────────────────────────
const DISCOVERY_KEY = "kb:discovery";
let discovery: string[] = load<string[]>(DISCOVERY_KEY, []);

export function discoveryIds(): string[] {
  return discovery;
}
export function toggleDiscovery(fragranceId: string, max: number): boolean {
  if (discovery.includes(fragranceId)) discovery = discovery.filter((x) => x !== fragranceId);
  else if (discovery.length < max) discovery = [...discovery, fragranceId];
  else return false;
  save(DISCOVERY_KEY, discovery);
  emit();
  return true;
}
export function clearDiscovery(): void {
  discovery = [];
  save(DISCOVERY_KEY, discovery);
  emit();
}

// ─── The bag, on the wire ────────────────────────────────────────────────────
//
// What the postage quote and the checkout session are sent. Prices are never
// included: the server prices the bag itself from the live catalogue, and this
// only says what is in it. A fragrance line carries no `kind` so a session
// created by an older build still parses.

export type WireLine =
  | { kind?: "fragrance"; fragranceId: string; format: FormatKey; qty: number; engraving: string | null; label?: string }
  | { kind: "goods"; productId: string; variant: string; qty: number; engraving: string | null };

export function toWire(lines: BagLine[]): WireLine[] {
  return lines.map((l) =>
    l.kind === "goods"
      ? { kind: "goods" as const, productId: l.productId, variant: l.variant, qty: l.qty, engraving: l.engraving }
      : { fragranceId: l.fragranceId, format: l.format, qty: l.qty, engraving: l.engraving, label: l.label },
  );
}
