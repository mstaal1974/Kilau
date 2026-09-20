// Palette and surfaces for the Scent DNA experience. Lighter and warmer than a
// dark comp: paper ground, gold edge lighting, a deep teal for the data lines.
//
// The three helpers below are the whole contrast story for this screen. `ink`
// takes the alpha a dark comp would have used and re-cuts it for white — an
// alpha that reads at 4.9:1 on black is 2.6:1 on white, so anything meant as
// text is floored at 0.62 (5.3:1) and the decorative tints below 0.15 pass
// through untouched. `goldA` and `cyanA` do the same for the two accents,
// swapping in the darker mix whenever the value is being used as ink.
import type { CSSProperties } from "react";

export const SD = {
  paper: "#FFFFFF",
  mist: "#F6F3EC",
  haze: "#EDF1F7",
  cyan: "#1F6F8B",
  cyanLeaf: "#7FD0F0",
  gold: "#7A5A12",      // accent ink on the cooler Scent DNA ground — 5:1 there
  goldLeaf: "#C8A063",  // gold fills and edge lighting
  goldLeafPale: "#D9B98A", // the lighter half of a gold fill gradient
  softGold: "#6B4E10",  // the emphasis tone: on paper the highlight goes deeper, not lighter
  text: "#14120E",
} as const;

/** Re-cut a dark-comp alpha for white: text stays text, tints stay tints. */
const forWhite = (a: number): number =>
  a <= 0.15 ? a : a < 0.4 ? 0.62 : a < 0.6 ? 0.68 : a < 0.72 ? 0.74 : a < 0.85 ? 0.82 : 0.9;

/** Near-black text at an opacity, floored so every tone clears 4.5:1. */
export const ink = (a: number): string => `rgba(20,18,14,${forWhite(a)})`;
/** Hairlines and washes only — never text. */
export const inkLine = (a: number): string => `rgba(20,18,14,${Math.min(a, 0.16)})`;
export const cyanA = (a: number): string => (a >= 0.5 ? "rgba(31,111,139,1)" : `rgba(31,111,139,${a})`);
export const goldA = (a: number): string => (a >= 0.5 ? "rgba(122,90,18,1)" : `rgba(184,135,60,${a})`);
/** Decorative gold at an opacity: gradients, glows, edge lighting. */
export const goldLeafA = (a: number): string => `rgba(200,160,99,${a})`;

export const SERIF = "'Cormorant Garamond',serif";
export const MONO = "'Space Mono',monospace";
export const SANS = "'Hanken Grotesk',system-ui,sans-serif";

/** Paper glass: a frosted pane, a gold hairline, a soft warm shadow. */
export const glass: CSSProperties = {
  background: "linear-gradient(160deg, rgba(255,255,255,0.92), rgba(246,243,236,0.88))",
  border: `1px solid ${goldLeafA(0.42)}`,
  backdropFilter: "blur(14px)",
  WebkitBackdropFilter: "blur(14px)",
  boxShadow: "0 24px 60px rgba(20,18,14,0.08), inset 0 1px 0 rgba(255,255,255,0.9)",
};

export const eyebrow: CSSProperties = {
  fontFamily: MONO,
  fontSize: 9.5,
  letterSpacing: "0.34em",
  textTransform: "uppercase",
  // The deepest gold: an eyebrow sits over the drifting vapour, so it has to
  // clear 4.5:1 against the warmest moment of that animation, not just paper.
  color: SD.softGold,
};

export const micro: CSSProperties = {
  fontFamily: MONO,
  fontSize: 9,
  letterSpacing: "0.26em",
  textTransform: "uppercase",
  color: ink(0.7),
};

export const display: CSSProperties = {
  margin: 0,
  fontFamily: SERIF,
  fontWeight: 400,
  lineHeight: 1.02,
  letterSpacing: "-0.01em",
  color: SD.text,
};

export const bodyText: CSSProperties = {
  fontFamily: SANS,
  fontSize: 15,
  lineHeight: 1.75,
  color: ink(0.75),
};

/** The primary action: gold, generous, unmistakable. Ink on it reads 7.7:1. */
export const ctaGold: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 12,
  height: 56,
  padding: "0 34px",
  border: 0,
  cursor: "pointer",
  background: `linear-gradient(100deg, ${SD.goldLeaf}, ${SD.goldLeafPale})`,
  color: SD.text,
  fontFamily: MONO,
  fontSize: 11,
  letterSpacing: "0.28em",
  textTransform: "uppercase",
  fontWeight: 700,
  whiteSpace: "nowrap",
};

export const ctaGhost: CSSProperties = {
  ...ctaGold,
  height: 50,
  background: "rgba(255,255,255,0.7)",
  border: `1px solid ${goldA(0.42)}`,
  color: SD.text,
  fontWeight: 600,
};

export const ctaQuiet: CSSProperties = {
  ...ctaGhost,
  border: `1px solid ${inkLine(0.16)}`,
  color: ink(0.7),
  letterSpacing: "0.22em",
  fontSize: 10,
};
