import { DEPARTMENTS, type Product, fromPrice } from "../../lib/goods";
import { CREAM, money } from "../../lib/data";
import { navigate, paths } from "../../lib/route";
import { GoodsArt } from "./GoodsArt";
import { Container } from "../ui";
import { SERIF, h2, micro } from "../styles";

/**
 * The homepage row that says the house is more than a perfumer: five
 * departments, each fronted by a piece from it. Fragrance keeps its own bands
 * above; this is what the wordmark's second half is about.
 */
export default function DepartmentsBand({ products }: { products: Product[] }) {
  const tiles = DEPARTMENTS.map((d) => {
    const mine = products.filter((p) => p.department === d.id && p.status !== "hidden");
    return { department: d, lead: mine[0] ?? null, count: mine.length, from: mine.length ? Math.min(...mine.map(fromPrice)) : 0 };
  }).filter((t) => t.lead);

  if (!tiles.length) return null;

  return (
    <section aria-label="Departments" style={{ padding: "34px 0 30px", borderBottom: "1px solid #e4ddd0", background: "#fcfaf6" }}>
      <Container>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 20, flexWrap: "wrap" }}>
          <h2 style={h2}>Clothing &amp; more</h2>
          <span style={{ ...micro, color: "rgba(20,18,14,0.74)" }}>Made and finished on the island</span>
        </div>

        <div className="kb-choose-grid" style={{ marginTop: 22, display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12 }}>
          {tiles.map(({ department, lead, count, from }) => (
            <button
              key={department.id}
              className="kb-card"
              onClick={() => navigate(paths.department(department.slug))}
              style={{ padding: 0, border: "1px solid #e4ddd0", background: "#ffffff", cursor: "pointer", textAlign: "left", display: "flex", flexDirection: "column" }}
            >
              {lead && <GoodsArt product={lead} height={168} />}
              <span style={{ padding: "14px 16px 16px", display: "flex", flexDirection: "column", gap: 5, flex: 1 }}>
                <span style={{ fontFamily: SERIF, fontSize: 22, letterSpacing: "0.1em", textTransform: "uppercase", color: CREAM, lineHeight: 1.1 }}>{department.short}</span>
                <span style={{ fontSize: 12, color: "rgba(20,18,14,0.68)", lineHeight: 1.5 }}>{department.tagline}</span>
                <span style={{ ...micro, fontSize: 8, color: "#7a5a12", marginTop: "auto", paddingTop: 8 }}>
                  {count} pieces · from {money(from)}
                </span>
              </span>
            </button>
          ))}
        </div>

      </Container>
    </section>
  );
}
