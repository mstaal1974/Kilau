// The Kilau sunburst: a gold disc inside twenty-four tapered rays, with a pair
// of attendant dots above and below — the mark from the house logo, sized on
// demand. `width`/`height` are kept from the old flask mark's signature so the
// call sites read the same; the drawing is square, so the smaller wins.
const RAYS = 24;
const CENTRE = 40;

export default function Logo({ width = 22, height = 26, title }: { width?: number; height?: number; title?: string }) {
  const size = Math.min(width, height) * 1.5;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      style={{ flex: "0 0 auto" }}
    >
      <defs>
        <linearGradient id="kb-sun" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#D9B98A" />
          <stop offset="48%" stopColor="#C8A063" />
          <stop offset="100%" stopColor="#8A6215" />
        </linearGradient>
      </defs>
      {Array.from({ length: RAYS }, (_, i) => {
        const long = i % 2 === 0;
        const rad = ((i * 360) / RAYS - 90) * (Math.PI / 180);
        const [inner, outer] = [13, long ? 26 : 20.5];
        return (
          <line
            key={i}
            x1={CENTRE + inner * Math.cos(rad)}
            y1={CENTRE + inner * Math.sin(rad)}
            x2={CENTRE + outer * Math.cos(rad)}
            y2={CENTRE + outer * Math.sin(rad)}
            stroke="url(#kb-sun)"
            strokeWidth={long ? 1.6 : 1.1}
            strokeLinecap="round"
          />
        );
      })}
      <circle cx={CENTRE} cy={CENTRE} r="8.6" fill="url(#kb-sun)" />
      <circle cx={CENTRE} cy={CENTRE - 31} r="1.5" fill="#B8873C" />
      <circle cx={CENTRE} cy={CENTRE - 36.5} r="1" fill="#C8A063" />
      <circle cx={CENTRE} cy={CENTRE + 31} r="1.5" fill="#B8873C" />
      <circle cx={CENTRE} cy={CENTRE + 36.5} r="1" fill="#C8A063" />
    </svg>
  );
}
