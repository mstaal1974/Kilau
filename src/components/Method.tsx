const MOVEMENTS = [
  { no: "/ 01", title: "Source", body: "Absolutes pressed and shipped from Dubai's oldest oud houses." },
  { no: "/ 02", title: "Macerate", body: "Each compound rests four weeks at thirty percent oil before it is judged." },
  { no: "/ 03", title: "Order", body: "Choose your size, add an engraving, and pay securely at checkout." },
  { no: "/ 04", title: "Pour", body: "Your bottle is filled to order and ships engraved with your name." },
];

export default function Method() {
  return (
    <section id="kb-method" style={{ borderTop: "1px solid #e4ddd0", marginTop: 60, background: "#fcfaf6" }}>
      <div style={{ maxWidth: 1340, margin: "0 auto", padding: "84px 32px" }}>
        <div
          style={{
            fontFamily: "'Space Mono',monospace",
            fontSize: 10,
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "rgba(138,98,21,1)",
          }}
        >
          The Method
        </div>
        <h2
          style={{
            margin: "14px 0 0",
            fontFamily: "'Cormorant Garamond',serif",
            fontWeight: 300,
            fontSize: 46,
            color: "#14120e",
            maxWidth: 640,
            lineHeight: 1.06,
          }}
        >
          Four movements from <span style={{ fontStyle: "italic", color: "#8a6215" }}>absolute to atelier.</span>
        </h2>
        <div
          style={{
            marginTop: 48,
            display: "grid",
            gridTemplateColumns: "repeat(4,1fr)",
            borderTop: "1px solid #e4ddd0",
          }}
          className="kb-method-grid"
        >
          {MOVEMENTS.map((m, i) => (
            <div
              key={m.no}
              style={{
                padding:
                  i === 0
                    ? "30px 24px 30px 0"
                    : i === MOVEMENTS.length - 1
                      ? "30px 0 30px 24px"
                      : "30px 24px",
                borderLeft: i === 0 ? undefined : "1px solid #e4ddd0",
              }}
            >
              <div style={{ fontFamily: "'Space Mono',monospace", fontSize: 11, color: "#8a6215", letterSpacing: "0.2em" }}>
                {m.no}
              </div>
              <div style={{ marginTop: 18, fontFamily: "'Cormorant Garamond',serif", fontSize: 25, color: "#14120e" }}>
                {m.title}
              </div>
              <p style={{ margin: "10px 0 0", fontSize: 12.5, lineHeight: 1.65, color: "rgba(20,18,14,0.68)" }}>
                {m.body}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
