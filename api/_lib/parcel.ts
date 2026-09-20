// Turning a bag into a parcel: per-format packed weight and size, then the
// smallest carton the order fits into. These are the figures the Australia
// Post rate lookup is built from, so keep them close to what you actually
// pack — a wrong weight means a wrong price at checkout.

import type { FormatKey } from "./catalogue.js";

interface ItemParcel {
  kg: number; // packed weight of one unit
  l: number; // cm
  w: number;
  h: number;
}

/** Packed weight and size of a single unit of each format. */
export const ITEM_PARCEL: Record<FormatKey, ItemParcel> = {
  perf10: { kg: 0.1, l: 10, w: 6, h: 4 },
  perf30: { kg: 0.22, l: 13, w: 8, h: 6 },
  perf50: { kg: 0.35, l: 15, w: 9, h: 7 },
  car: { kg: 0.12, l: 10, w: 7, h: 5 },
  wash: { kg: 0.42, l: 20, w: 8, h: 8 },
  moist: { kg: 0.42, l: 20, w: 8, h: 8 },
  ritual: { kg: 1.3, l: 30, w: 22, h: 12 },
};

/** Cartons the atelier packs into, smallest first. */
const BOXES = [
  { name: "Small", l: 22, w: 16, h: 8, kg: 0.08 },
  { name: "Medium", l: 31, w: 22, h: 10, kg: 0.14 },
  { name: "Large", l: 40, w: 30, h: 15, kg: 0.25 },
];

/** Australia Post's domestic parcel ceiling. */
export const MAX_PARCEL_KG = 22;

export interface Parcel {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
  weightKg: number;
  box: string;
}

/**
 * A line as the parcel sees it: either a fragrance format, whose packed size is
 * in the table above, or a piece of goods, which carries its own weight.
 *
 * Goods have no fixed carton, so a volume is derived from the weight at roughly
 * the density of folded cloth in tissue (about 4.5 cm³ per gram, measured off
 * the linen shirt). Jewellery and watches come out generous on volume and thin
 * on weight, which is the safe direction: Australia Post charges on whichever
 * of weight or cubic size is greater, so over-stating the box never under-
 * charges the customer.
 */
export interface ParcelLine {
  format?: FormatKey;
  /** Packed weight of one unit, grams — a goods line. */
  grams?: number;
  qty: number;
}

/** cm³ per gram, folded and wrapped. */
const GOODS_DENSITY = 4.5;

export function parcelFor(lines: ParcelLine[]): Parcel {
  let contentsKg = 0;
  let contentsVol = 0;
  let longest = 0;
  for (const l of lines) {
    const qty = Math.max(1, l.qty);
    if (l.grams != null && l.format == null) {
      const kg = l.grams / 1000;
      contentsKg += kg * qty;
      contentsVol += l.grams * GOODS_DENSITY * qty;
      // A folded garment is about the long side of the medium carton.
      longest = Math.max(longest, l.grams >= 300 ? 31 : 22);
      continue;
    }
    const item = l.format ? ITEM_PARCEL[l.format] : undefined;
    if (!item) continue;
    contentsKg += item.kg * qty;
    contentsVol += item.l * item.w * item.h * qty;
    longest = Math.max(longest, item.l);
  }
  // A quarter again on top of the contents, for padding and air.
  const needed = contentsVol * 1.25;
  const box = BOXES.find((b) => b.l * b.w * b.h >= needed && b.l >= longest) ?? BOXES[BOXES.length - 1];
  const weightKg = Math.max(0.1, Math.round((contentsKg + box.kg) * 100) / 100);
  return { lengthCm: box.l, widthCm: box.w, heightCm: box.h, weightKg, box: box.name };
}
