// Shared typography and button styles for the storefront (kept apart from
// ui.tsx so React Fast Refresh sees a components-only module there).
import type { CSSProperties } from "react";
import { GOLD, CREAM, GOLD_LEAF } from "../lib/data";

export const SERIF = "'Cormorant Garamond',serif";
export const MONO = "'Space Mono',monospace";

export const eyebrow: CSSProperties = {
  fontFamily: MONO,
  fontSize: 9.5,
  letterSpacing: "0.3em",
  textTransform: "uppercase",
  color: "rgba(138,98,21,1)",
};
export const micro: CSSProperties = {
  fontFamily: MONO,
  fontSize: 9,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  color: "rgba(20,18,14,0.68)",
};
export const h2: CSSProperties = {
  margin: 0,
  fontFamily: SERIF,
  fontWeight: 400,
  fontSize: 34,
  lineHeight: 1.05,
  color: CREAM,
};
export const body: CSSProperties = { fontSize: 13.5, lineHeight: 1.7, color: "rgba(20,18,14,0.74)" };

export const btnGold: CSSProperties = {
  background: GOLD_LEAF,
  color: "#14120e",
  border: 0,
  cursor: "pointer",
  height: 46,
  padding: "0 24px",
  fontSize: 10.5,
  letterSpacing: "0.26em",
  textTransform: "uppercase",
  fontWeight: 700,
  display: "inline-flex",
  alignItems: "center",
  gap: 12,
  whiteSpace: "nowrap",
};
export const btnGhost: CSSProperties = {
  ...btnGold,
  background: "none",
  color: CREAM,
  border: `1px solid rgba(184,135,60,0.41)`,
  fontWeight: 600,
};
export const btnLink: CSSProperties = {
  background: "none",
  border: 0,
  cursor: "pointer",
  color: GOLD,
  fontFamily: MONO,
  fontSize: 9.5,
  letterSpacing: "0.26em",
  textTransform: "uppercase",
  padding: 0,
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
};

