import { Art, Container, Arrow } from "./ui";
import { h2, micro, SERIF, MONO } from "./styles";
import { navigate, paths } from "../lib/route";
import { GOLD, CREAM } from "../lib/data";

// Photography lives in public/assets; filenames with spaces are URL-encoded.
const TILES = [
  { key: "discover", title: "Discover", sub: "Samples & sets", src: "/assets/10-ml-bottles-Remix-1.jpg", position: "78% 55%", fallback: "/assets/bottle-square.jpg", to: paths.discovery },
  { key: "wear", title: "Wear", sub: "Eau de Parfum", src: "/assets/30%20ml%20bottle.jpeg", position: "62% 48%", fallback: "/assets/bottle-pdp.jpg", to: paths.fragrances },
  { key: "drive", title: "Drive", sub: "Car diffusers", src: "/assets/car-freshner.jpg", position: "60% 62%", fallback: "/assets/bottle-portrait.webp", to: paths.car },
  { key: "ritual", title: "Ritual", sub: "Body & bath", src: "/assets/body%20and%20sets.jpg", position: "center 62%", fallback: "/assets/bottle-pair.png", to: paths.body },
];

/** Section 2 — the four Kilau Bali ranges. Explains the business at a glance. */
export default function ChooseKilau() {
  return (
    <section aria-label="Choose your Kilau" style={{ padding: "34px 0 22px", borderBottom: "1px solid #e4ddd0" }}>
      <Container>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 20, flexWrap: "wrap" }}>
          <h2 style={h2}>Choose your Kilau</h2>
          <span style={{ ...micro, color: "rgba(20,18,14,0.74)" }}>Different worlds. A bolder you.</span>
        </div>
        <div className="kb-choose-grid" style={{ marginTop: 22, display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {TILES.map((t) => (
            <button key={t.key} className="kb-card" onClick={() => navigate(t.to)} style={{ padding: 0, border: "1px solid #e4ddd0", background: "none", cursor: "pointer", textAlign: "left" }}>
              <Art src={t.src} fallback={t.fallback} alt="" position={t.position} style={{ height: 168 }} overlay="linear-gradient(90deg, rgba(255,255,255,0.96) 0%, rgba(255,255,255,0.9) 40%, rgba(255,255,255,0.42) 72%, rgba(255,255,255,0.26) 100%)">
                <div style={{ position: "absolute", inset: 0, padding: "24px 22px", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontFamily: SERIF, fontSize: 24, letterSpacing: "0.12em", textTransform: "uppercase", color: CREAM }}>{t.title}</div>
                    <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.26em", textTransform: "uppercase", color: "#7a5a12", marginTop: 6 }}>{t.sub}</div>
                  </div>
                  <span style={{ width: 26, height: 26, borderRadius: "50%", border: "1px solid rgba(184,135,60,0.52)", display: "grid", placeItems: "center", color: GOLD }}>
                    <Arrow size={10} />
                  </span>
                </div>
              </Art>
            </button>
          ))}
        </div>
      </Container>
    </section>
  );
}
