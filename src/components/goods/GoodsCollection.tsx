import { useMemo, useState } from "react";
import {
  type CategoryDef,
  type DepartmentDef,
  type Product,
  CATEGORY_BY_ID,
  anyInStock,
  categoriesIn,
  fromPrice,
} from "../../lib/goods";
import { GOLD, CREAM, money } from "../../lib/data";
import { navigate, paths } from "../../lib/route";
import GoodsCard from "./GoodsCard";
import { Chip, Container } from "../ui";
import { MONO, SERIF, micro, body } from "../styles";

type Sort = "featured" | "low" | "high";

const SORTS: { id: Sort; label: string }[] = [
  { id: "featured", label: "Featured" },
  { id: "low", label: "Price low" },
  { id: "high", label: "Price high" },
];

interface Props {
  /** The department being browsed. */
  department: DepartmentDef;
  /** Set when a single category was asked for, which fixes the filter. */
  category?: CategoryDef | null;
  products: Product[];
  vip: boolean;
}

/**
 * The listing page behind both `#/women` and `#/c/dresses`: the same grid, with
 * the category chips either acting as a filter (department) or showing where
 * you are (category). Sizes are deliberately not a filter here — "show me what
 * is left in a medium" belongs on a product page, not a category one, and
 * filtering a range down to the sizes in stock hides the range.
 */
export default function GoodsCollection({ department, category, products, vip }: Props) {
  const [active, setActive] = useState<string | null>(category?.id ?? null);
  const [sort, setSort] = useState<Sort>("featured");
  const [inStockOnly, setInStockOnly] = useState(false);

  const categories = categoriesIn(department.id);
  const all = useMemo(() => products.filter((p) => p.department === department.id && p.status !== "hidden"), [products, department.id]);

  const list = useMemo(() => {
    let out = active ? all.filter((p) => p.category === active) : all;
    if (inStockOnly) out = out.filter(anyInStock);
    if (sort === "low") out = [...out].sort((a, b) => fromPrice(a) - fromPrice(b));
    if (sort === "high") out = [...out].sort((a, b) => fromPrice(b) - fromPrice(a));
    return out;
  }, [all, active, inStockOnly, sort]);

  const heading = category ? category.name : department.name;
  const standfirst = category ? category.blurb : department.intro;

  return (
    <main data-screen-label={heading}>
      <Container style={{ padding: "44px 32px 8px" }}>
        <div style={{ ...micro, color: GOLD }}>
          {category ? (
            <button
              onClick={() => navigate(paths.department(department.slug))}
              style={{ background: "none", border: 0, padding: 0, cursor: "pointer", font: "inherit", color: "inherit", letterSpacing: "inherit" }}
            >
              {department.name}
            </button>
          ) : (
            department.tagline
          )}
        </div>
        <h1 style={{ margin: "10px 0 0", fontFamily: SERIF, fontWeight: 400, fontSize: 48, color: CREAM, lineHeight: 1 }}>{heading}</h1>
        <p style={{ ...body, margin: "12px 0 0", maxWidth: 560 }}>{standfirst}</p>
      </Container>

      <Container style={{ padding: "18px 32px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", borderBottom: "1px solid #e4ddd0", paddingBottom: 14 }}>
          <span style={{ ...micro, marginRight: 4 }}>Category</span>
          <Chip active={active === null} onClick={() => setActive(null)}>All</Chip>
          {categories.map((c) => (
            <Chip key={c.id} active={active === c.id} onClick={() => setActive(active === c.id ? null : c.id)}>
              {c.name}
            </Chip>
          ))}
          <span style={{ ...micro, marginLeft: 16, marginRight: 4 }}>Sort</span>
          {SORTS.map((s) => (
            <Chip key={s.id} active={sort === s.id} onClick={() => setSort(s.id)}>{s.label}</Chip>
          ))}
          <Chip active={inStockOnly} onClick={() => setInStockOnly(!inStockOnly)} style={{ marginLeft: 16 }}>In stock</Chip>
          <span style={{ marginLeft: "auto", fontFamily: MONO, fontSize: 10, color: "rgba(20,18,14,0.68)" }}>
            {list.length} of {all.length}
          </span>
        </div>

        {list.length === 0 ? (
          <p style={{ ...body, marginTop: 30 }}>
            Nothing here yet.{" "}
            <button
              style={{ background: "none", border: 0, color: GOLD, cursor: "pointer", padding: 0, font: "inherit" }}
              onClick={() => {
                setActive(null);
                setInStockOnly(false);
              }}
            >
              Clear filters
            </button>{" "}
            to see the whole department.
          </p>
        ) : (
          <div className="kb-vault-grid" style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {list.map((p) => (
              <GoodsCard key={p.id} product={p} vip={vip} />
            ))}
          </div>
        )}
      </Container>
    </main>
  );
}

/**
 * The department landing page: the categories as tiles over a short row of the
 * pieces most worth opening with, then the full grid underneath. One page, so
 * a shopper who knows what they want and one who does not both get somewhere.
 */
export function DepartmentPage({ department, products, vip }: { department: DepartmentDef; products: Product[]; vip: boolean }) {
  const categories = categoriesIn(department.id);
  const mine = products.filter((p) => p.department === department.id && p.status !== "hidden");
  const counts = new Map(categories.map((c) => [c.id, mine.filter((p) => p.category === c.id).length]));

  return (
    <main data-screen-label={department.name}>
      <Container style={{ padding: "44px 32px 0" }}>
        <div style={{ ...micro, color: GOLD }}>{department.tagline}</div>
        <h1 style={{ margin: "10px 0 0", fontFamily: SERIF, fontWeight: 400, fontSize: 52, color: CREAM, lineHeight: 1 }}>{department.name}</h1>
        <p style={{ ...body, margin: "14px 0 0", maxWidth: 620, fontSize: 14.5 }}>{department.intro}</p>

        <div className="kb-choose-grid" style={{ marginTop: 26, display: "grid", gridTemplateColumns: `repeat(${Math.min(categories.length, 5)}, 1fr)`, gap: 12 }}>
          {categories.map((c) => {
            // The tile takes its tone from the first piece in the category, so
            // the row is a palette of the department rather than five greys.
            const lead = mine.find((p) => p.category === c.id);
            return (
              <button
                key={c.id}
                className="kb-card"
                onClick={() => navigate(paths.category(c.slug))}
                style={{
                  textAlign: "left",
                  cursor: "pointer",
                  border: "1px solid #e4ddd0",
                  background: `linear-gradient(180deg, ${lead ? `${lead.hue}22` : "#fcfaf6"} 0%, #ffffff 68%)`,
                  padding: "18px 16px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: 6,
                  minHeight: 116,
                }}
              >
                <span style={{ fontFamily: SERIF, fontSize: 21, color: CREAM, lineHeight: 1.1 }}>{c.name}</span>
                <span style={{ fontSize: 12, color: "rgba(20,18,14,0.68)", lineHeight: 1.5 }}>{c.blurb}</span>
                <span style={{ ...micro, fontSize: 8, color: "#7a5a12", marginTop: "auto" }}>
                  {counts.get(c.id) ?? 0} {counts.get(c.id) === 1 ? "piece" : "pieces"}
                </span>
              </button>
            );
          })}
        </div>
      </Container>

      <Container style={{ padding: "34px 32px 60px" }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 16, flexWrap: "wrap", borderBottom: "1px solid #e4ddd0", paddingBottom: 12 }}>
          <h2 style={{ margin: 0, fontFamily: SERIF, fontWeight: 400, fontSize: 30, color: CREAM }}>The whole department</h2>
          <span style={{ fontFamily: MONO, fontSize: 10, color: "rgba(20,18,14,0.68)" }}>
            {mine.length} pieces · from {money(Math.min(...mine.map(fromPrice)))}
          </span>
        </div>
        <div className="kb-vault-grid" style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
          {mine.map((p) => (
            <GoodsCard key={p.id} product={p} vip={vip} />
          ))}
        </div>
      </Container>
    </main>
  );
}

export { CATEGORY_BY_ID };
