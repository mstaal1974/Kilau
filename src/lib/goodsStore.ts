// Reading the goods catalogue, the same way the fragrance one is read: render
// the seed immediately so there is no loading flash, then swap in the rows
// stored in Supabase once they arrive. Unconfigured deployments — the offline
// demo — simply stay on the seed.

import { useCallback, useEffect, useState } from "react";
import { type Department, type GoodsStatus, type Product, type Variant, type VariantKind, PRODUCTS } from "./goods";
import { supabase } from "./supabase";

/** Shape of a row in public.products (snake_case, as stored). */
export interface ProductRow {
  id: string;
  slug: string;
  name: string;
  department: Department;
  category: string;
  tagline: string;
  story: string;
  price_cents: number;
  compare_at_cents: number | null;
  variant_kind: VariantKind;
  variants: Variant[] | null;
  details: string[] | null;
  care: string | null;
  grams: number;
  hue: string;
  shade: string;
  image_url: string | null;
  status: GoodsStatus;
  vip_only: boolean;
  sort_order: number;
}

export function rowToProduct(r: ProductRow): Product {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    department: r.department,
    category: r.category,
    tagline: r.tagline,
    story: r.story,
    price: r.price_cents,
    compareAt: r.compare_at_cents ?? undefined,
    variantKind: r.variant_kind,
    variants: r.variants ?? [],
    details: r.details ?? [],
    care: r.care ?? undefined,
    grams: r.grams,
    hue: r.hue,
    shade: r.shade,
    imageUrl: r.image_url ?? undefined,
    status: r.status,
    vipOnly: r.vip_only,
  };
}

export function useProducts() {
  const [remote, setRemote] = useState<Product[] | null>(null);

  const reload = useCallback(() => {
    if (!supabase) return;
    void supabase
      .from("products")
      .select("*")
      .order("sort_order", { ascending: true })
      .then(({ data, error }) => {
        // A deployment that has not run the goods migration yet keeps the seed
        // rather than emptying the shop.
        if (error || !data || data.length === 0) return;
        setRemote((data as ProductRow[]).map(rowToProduct));
      });
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return { products: remote ?? PRODUCTS, reload };
}
