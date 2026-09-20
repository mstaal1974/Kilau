// Product art, drawn rather than photographed.
//
// There is no photography for the clothing, jewellery, beauty or watch ranges
// yet, and a grid of grey placeholder boxes makes a shop look shut. So each
// category has a silhouette — a dress, a ring, a lipstick, a watch — drawn once
// here and filled with the product's own two tones, which means a category page
// reads as a range of pieces in a palette instead of a wall of the same square.
//
// It is deliberately flat and quiet: this is a stand-in, and it should look
// like a house illustration rather than pretend to be a photograph. Drop real
// images in as `imageUrl` on the product and they take over with no other
// change — `<GoodsImage>` below prefers the photograph whenever there is one.

import { useState } from "react";
import { type Product, imageFor, imagesOf, variantOf } from "../../lib/goods";

/** Which silhouette a product gets, from its category. */
function shapeFor(categoryId: string): Shape {
  switch (categoryId) {
    case "w-dresses": return "dress";
    case "w-swim": return "swim";
    case "w-tops": return "camisole";
    case "w-bottoms": return "trouser";
    case "w-outer": return "coat";
    case "m-shirts": return "shirt";
    case "m-tees": return "tee";
    case "m-bottoms": return "trouser";
    case "m-outer": return "coat";
    case "j-rings": return "ring";
    case "j-necklaces": return "necklace";
    case "j-earrings": return "earring";
    case "j-bracelets": return "cuff";
    case "b-lips": return "lipstick";
    case "b-face": return "bottle";
    case "b-eyes": return "palette";
    case "b-skin": return "bottle";
    case "t-automatic":
    case "t-quartz": return "watch";
    case "t-straps": return "strap";
    default: return "bottle";
  }
}

type Shape =
  | "dress" | "swim" | "camisole" | "trouser" | "coat" | "shirt" | "tee"
  | "ring" | "necklace" | "earring" | "cuff"
  | "lipstick" | "bottle" | "palette"
  | "watch" | "strap";

/**
 * The drawing. Everything is stroked in the product's `shade` — the darker of
 * its two tones, all of which clear 2.5:1 on paper — so the outline reads even
 * where the fill is a pale linen.
 */
function Silhouette({ shape, hue, shade }: { shape: Shape; hue: string; shade: string }) {
  const fill = hue;
  const line = { fill: "none", stroke: shade, strokeWidth: 1.6, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };
  switch (shape) {
    case "dress":
      return (
        <g>
          <path d="M42 22 50 16h20l8 6-7 10 4 46H45l4-46z" fill={fill} {...line} />
          <path d="M50 16c0 6 4 10 10 10s10-4 10-10" {...line} />
          <path d="M49 42h22" {...line} opacity="0.55" />
        </g>
      );
    case "swim":
      return (
        <g>
          <path d="M44 24h32l-3 20c0 12-5 20-13 24-8-4-13-12-13-24z" fill={fill} {...line} />
          <path d="M44 24c6-4 10-6 16-6s10 2 16 6" {...line} />
        </g>
      );
    case "camisole":
      return (
        <g>
          <path d="M44 26 52 18h16l8 8v38H44z" fill={fill} {...line} />
          <path d="M52 18c0 5 4 8 8 8s8-3 8-8" {...line} />
        </g>
      );
    case "trouser":
      return (
        <g>
          <path d="M44 18h32v10l-4 56h-9l-3-40-3 40h-9l-4-56z" fill={fill} {...line} />
          <path d="M44 28h32" {...line} opacity="0.55" />
        </g>
      );
    case "coat":
      return (
        <g>
          <path d="M40 24 52 17h16l12 7 4 18-8 3v39H44V45l-8-3z" fill={fill} {...line} />
          <path d="M60 17v67M52 17l8 10 8-10" {...line} />
        </g>
      );
    case "shirt":
      return (
        <g>
          <path d="M40 26 52 18h16l12 8 4 14-9 3v33H45V43l-9-3z" fill={fill} {...line} />
          <path d="M52 18l8 9 8-9M60 30v45" {...line} />
        </g>
      );
    case "tee":
      return (
        <g>
          <path d="M40 27 53 19h14l13 8 3 12-8 3v32H45V42l-8-3z" fill={fill} {...line} />
          <path d="M53 19c0 4 3 7 7 7s7-3 7-7" {...line} />
        </g>
      );
    case "ring":
      return (
        <g>
          <circle cx="60" cy="58" r="22" fill="none" stroke={shade} strokeWidth="9" />
          <circle cx="60" cy="58" r="22" fill="none" stroke={fill} strokeWidth="6" />
          <ellipse cx="60" cy="33" rx="13" ry="10" fill={fill} {...line} />
        </g>
      );
    case "necklace":
      return (
        <g>
          <path d="M34 22c0 26 12 42 26 42s26-16 26-42" fill="none" stroke={fill} strokeWidth="4" />
          <path d="M34 22c0 26 12 42 26 42s26-16 26-42" fill="none" stroke={shade} strokeWidth="1.4" />
          <circle cx="60" cy="74" r="10" fill={fill} {...line} />
        </g>
      );
    case "earring":
      return (
        <g>
          <circle cx="44" cy="52" r="17" fill="none" stroke={fill} strokeWidth="7" />
          <circle cx="44" cy="52" r="17" fill="none" stroke={shade} strokeWidth="1.4" />
          <circle cx="82" cy="52" r="17" fill="none" stroke={fill} strokeWidth="7" />
          <circle cx="82" cy="52" r="17" fill="none" stroke={shade} strokeWidth="1.4" />
        </g>
      );
    case "cuff":
      return (
        <g>
          <path d="M38 40a22 22 0 1 0 44 0" fill="none" stroke={fill} strokeWidth="13" strokeLinecap="round" />
          <path d="M38 40a22 22 0 1 0 44 0" fill="none" stroke={shade} strokeWidth="1.5" strokeLinecap="round" />
        </g>
      );
    case "lipstick":
      return (
        <g>
          <rect x="50" y="46" width="20" height="40" rx="2" fill={shade} opacity="0.9" />
          <rect x="50" y="46" width="20" height="40" rx="2" {...line} />
          <path d="M53 46V26c0-4 3-7 7-7s7 3 7 7v20z" fill={fill} {...line} />
          <path d="M53 30h14" {...line} opacity="0.5" />
        </g>
      );
    case "bottle":
      return (
        <g>
          <rect x="48" y="30" width="24" height="54" rx="4" fill={fill} {...line} />
          <rect x="55" y="17" width="10" height="13" rx="2" fill={shade} opacity="0.85" />
          <rect x="55" y="17" width="10" height="13" rx="2" {...line} />
          <path d="M48 62h24" {...line} opacity="0.5" />
        </g>
      );
    case "palette":
      return (
        <g>
          <rect x="30" y="36" width="60" height="38" rx="3" fill={fill} {...line} />
          <rect x="37" y="44" width="21" height="10" rx="1.5" fill={shade} opacity="0.85" />
          <rect x="62" y="44" width="21" height="10" rx="1.5" fill={shade} opacity="0.55" />
          <rect x="37" y="58" width="21" height="10" rx="1.5" fill={shade} opacity="0.55" />
          <rect x="62" y="58" width="21" height="10" rx="1.5" fill={shade} opacity="0.85" />
        </g>
      );
    case "watch":
      return (
        <g>
          <path d="M52 18h16l-2 18H54zM52 84h16l-2-18H54z" fill={shade} opacity="0.85" />
          <path d="M52 18h16l-2 18H54zM52 84h16l-2-18H54z" {...line} />
          <circle cx="60" cy="51" r="20" fill={fill} {...line} />
          <path d="M60 39v12l8 5" {...line} />
        </g>
      );
    case "strap":
      return (
        <g>
          <path d="M46 16h12v70H46z" fill={fill} {...line} />
          <path d="M64 16h12v70H64z" fill={fill} {...line} opacity="0.85" />
          <path d="M46 34h12M46 46h12M46 58h12" {...line} opacity="0.5" />
        </g>
      );
  }
}

/**
 * The illustration on its own ground: a soft radial wash of the product's tone
 * so a grid has depth without any of it competing with the type below.
 */
export function GoodsArt({ product, height = 300 }: { product: Product; height?: number | string }) {
  const shape = shapeFor(product.category);
  return (
    <div
      aria-hidden
      style={{
        height,
        width: "100%",
        display: "grid",
        placeItems: "center",
        background: `radial-gradient(72% 62% at 50% 44%, ${product.hue}2e 0%, rgba(255,255,255,0) 72%), linear-gradient(180deg, #fcfaf6 0%, #f4f0e8 100%)`,
      }}
    >
      <svg viewBox="0 0 120 100" width="74%" height="74%" role="presentation" style={{ maxHeight: "100%" }}>
        <Silhouette shape={shape} hue={product.hue} shade={product.shade} />
      </svg>
    </div>
  );
}

/**
 * Photography when the product has it, the drawing when it does not — and the
 * drawing again if the photograph fails to load, so a broken path never leaves
 * a hole in the grid. That last part matters more for a dropshipped line than
 * a house-made one: the images belong to somebody else's CDN and can go away
 * without telling us.
 *
 * `src` overrides the product's own first image, which is how the gallery and
 * the variant picker show a different photograph of the same product.
 */
export default function GoodsImage({
  product,
  src,
  height = 300,
  objectPosition = "center",
  objectFit = "cover",
  alt,
}: {
  product: Product;
  src?: string | null;
  height?: number | string;
  objectPosition?: string;
  objectFit?: "cover" | "contain";
  alt?: string;
}) {
  const chosen = src ?? imagesOf(product)[0] ?? null;
  const [failed, setFailed] = useState<string | null>(null);
  if (!chosen || failed === chosen) return <GoodsArt product={product} height={height} />;
  return (
    <div style={{ height, width: "100%", overflow: "hidden", background: "#f4f0e8" }}>
      <img
        src={chosen}
        alt={alt ?? product.name}
        loading="lazy"
        onError={() => setFailed(chosen)}
        referrerPolicy="no-referrer"
        style={{ width: "100%", height: "100%", objectFit, objectPosition, display: "block" }}
      />
    </div>
  );
}

/**
 * The product page's picture: one large frame and a strip of thumbnails, or
 * nothing at all beyond the drawing when the piece has not been shot. Choosing
 * a variant that has its own photograph moves the gallery to it — on a
 * lipstick the shade *is* the photograph — which is why `selected` is a prop
 * rather than state owned here.
 */
export function GoodsGallery({ product, selected, height = 560 }: { product: Product; selected?: string; height?: number }) {
  const gallery = imagesOf(product);
  const variantImage = selected ? variantOf(product, selected)?.image ?? null : null;
  const [picked, setPicked] = useState<string | null>(null);

  // A variant's own photograph wins until the shopper taps a thumbnail, and
  // choosing a different variant hands control back to it.
  const [lastVariant, setLastVariant] = useState(selected);
  if (selected !== lastVariant) {
    setLastVariant(selected);
    if (picked !== null) setPicked(null);
  }
  // A supplier's CDN can drop an image without telling us. The main frame
  // already falls back to the drawing; a thumbnail has nothing to fall back to,
  // so a broken one leaves the strip rather than sitting there as a torn-page
  // icon.
  const [broken, setBroken] = useState<string[]>([]);

  const shown = picked ?? variantImage ?? gallery[0] ?? null;
  // The variant's shot belongs in the strip even when it is not in `images`.
  const thumbs = (variantImage && !gallery.includes(variantImage) ? [variantImage, ...gallery] : gallery).filter(
    (src) => !broken.includes(src),
  );

  return (
    <div>
      <div style={{ border: "1px solid #e4ddd0", background: "#ffffff" }}>
        <GoodsImage product={product} src={shown} height={height} objectFit="cover" />
      </div>
      {thumbs.length > 1 && (
        <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
          {thumbs.map((src, i) => {
            const active = src === shown;
            return (
              <button
                key={src}
                onClick={() => setPicked(src)}
                aria-label={`View image ${i + 1} of ${thumbs.length}`}
                aria-pressed={active}
                style={{
                  width: 66,
                  height: 82,
                  padding: 0,
                  cursor: "pointer",
                  overflow: "hidden",
                  background: "#ffffff",
                  border: `1px solid ${active ? "#8a6215" : "#9c9078"}`,
                  outlineOffset: 2,
                }}
              >
                <img
                  src={src}
                  alt=""
                  loading="lazy"
                  referrerPolicy="no-referrer"
                  onError={() => setBroken((b) => (b.includes(src) ? b : [...b, src]))}
                  style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: active ? 1 : 0.82 }}
                />
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** A small square of the piece: its photograph if there is one, else the drawing. */
export function GoodsThumb({ product, variant, height = 76 }: { product: Product; variant?: string; height?: number }) {
  return <GoodsImage product={product} src={imageFor(product, variant)} height={height} />;
}
