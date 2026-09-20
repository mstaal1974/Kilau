import { useEffect, useState } from "react";
import {
  type Check,
  type CheckState,
  type SetupGroup,
  type SetupReport,
  loadSetup,
  outstanding,
  serverGroups,
  storefrontChecks,
} from "../lib/setup";
import { btnGhost, label } from "./adminStyles";

// Colour is never the only signal: each state also has its own mark and its
// own word, so the panel reads in greyscale and to a screen reader.
const STATE: Record<CheckState, { mark: string; word: string; colour: string }> = {
  ready: { mark: "●", word: "Ready", colour: "#2f6b3e" },
  missing: { mark: "▲", word: "Needed", colour: "#a32e24" },
  warn: { mark: "▲", word: "Check", colour: "#a8431b" },
  optional: { mark: "○", word: "Optional", colour: "rgba(20,18,14,0.74)" },
};

function Row({ check }: { check: Check }) {
  const s = STATE[check.state];
  return (
    <div style={{ display: "grid", gridTemplateColumns: "104px 1fr", gap: 14, alignItems: "start", borderTop: "1px solid #e4ddd0", padding: "12px 0" }}>
      <span style={{ ...label, color: s.colour, whiteSpace: "nowrap" }}>
        <span aria-hidden>{s.mark}</span> {s.word}
      </span>
      <div>
        <div style={{ fontSize: 14, color: "#14120e", lineHeight: 1.4 }}>{check.name}</div>
        <div style={{ fontSize: 13, color: "rgba(20,18,14,0.74)", lineHeight: 1.6, marginTop: 3 }}>{check.detail}</div>
        {/* Where to go is only worth saying when there is something to do
            there; on a check that is already satisfied it is just noise. */}
        {(check.vars?.length || (check.where && check.state !== "ready")) && (
          <div style={{ marginTop: 7, display: "flex", gap: 6, flexWrap: "wrap", alignItems: "baseline" }}>
            {(check.vars ?? []).map((v) => (
              <code
                key={v}
                style={{
                  fontFamily: "'Space Mono',monospace",
                  fontSize: 11,
                  color: "#14120e",
                  background: "#f3efe6",
                  border: "1px solid #e4ddd0",
                  padding: "2px 6px",
                }}
              >
                {v}
              </code>
            ))}
            {check.where && check.state !== "ready" && <span style={{ ...label, fontSize: 8.5 }}>{check.where}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function Group({ group }: { group: SetupGroup }) {
  return (
    <section style={{ border: "1px solid #e4ddd0", background: "#ffffff", padding: "16px 18px 6px" }}>
      <h2 style={{ margin: 0, fontFamily: "'Cormorant Garamond',serif", fontWeight: 400, fontSize: 24, color: "#14120e" }}>{group.name}</h2>
      <p style={{ margin: "5px 0 10px", fontSize: 13, color: "rgba(20,18,14,0.74)", lineHeight: 1.6, maxWidth: 680 }}>{group.blurb}</p>
      {group.checks.map((c) => (
        <Row key={c.id} check={c} />
      ))}
    </section>
  );
}

/**
 * Setup.
 *
 * Most of what decides whether this shop can actually trade lives in
 * environment variables on Vercel and in migrations in Supabase, and none of it
 * was visible from inside the app — which is how a storefront ends up looking
 * finished while quietly unable to take a payment. This is that list.
 *
 * It reports presence, never values: the server answers with a boolean per
 * secret, so no key is ever sent to the browser. Everything needing attention
 * says what it switches on, what breaks without it, and where to set it.
 */
export default function AdminSetup() {
  const [report, setReport] = useState<SetupReport | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "absent" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let active = true;
    void loadSetup().then((r) => {
      if (!active) return;
      if (r === null) setState("absent");
      else if ("error" in r) {
        setError(r.error);
        setState("error");
      } else {
        setReport(r);
        setState("ready");
      }
    });
    return () => {
      active = false;
    };
  }, [nonce]);

  // The browser's own checks need no server, so they show even when the route
  // is absent — which is exactly the case where somebody is still setting up.
  const storefront: SetupGroup = {
    id: "storefront",
    name: "Shopfront details",
    blurb: "The things a customer sees, and that the law expects before you take money.",
    checks: storefrontChecks(),
  };
  const groups = report ? [...serverGroups(report), storefront] : [storefront];
  const { blocking, warnings } = outstanding(groups);

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ border: "1px solid #e4ddd0", background: "#f7f4ee", padding: "16px 18px", display: "flex", gap: 18, alignItems: "baseline", flexWrap: "wrap" }}>
        <span style={{ fontFamily: "'Cormorant Garamond',serif", fontSize: 26, color: "#14120e", lineHeight: 1 }}>
          {state === "loading"
            ? "Checking…"
            : blocking === 0
              ? warnings === 0
                ? "Everything is wired up."
                : `${warnings} thing${warnings === 1 ? "" : "s"} to look at.`
              : `${blocking} thing${blocking === 1 ? "" : "s"} still needed.`}
        </span>
        <span style={{ fontSize: 13, color: "rgba(20,18,14,0.74)", lineHeight: 1.6, maxWidth: 560 }}>
          Presence only — no key or secret is ever sent to this page. Changes to environment variables take effect on the next deploy.
        </span>
        <button
          style={{ ...btnGhost, height: 34, marginLeft: "auto" }}
          disabled={state === "loading"}
          onClick={() => {
            setState("loading");
            setNonce((n) => n + 1);
          }}
        >
          {state === "loading" ? "Checking…" : "Re-check"}
        </button>
      </div>

      {state === "absent" && (
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.7, color: "rgba(20,18,14,0.74)", maxWidth: 680 }}>
          The server-side report isn't available here — <code>/api/admin/setup</code> needs Supabase configured, so in the
          offline demo there are no environment variables to read. The shopfront checks below still apply.
        </p>
      )}
      {state === "error" && (
        <p role="alert" style={{ margin: 0, fontSize: 13.5, lineHeight: 1.7, color: "#a32e24" }}>
          {error}
        </p>
      )}

      {groups.map((g) => (
        <Group key={g.id} group={g} />
      ))}

      <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.7, color: "rgba(20,18,14,0.74)" }}>
        Every variable is documented in <code>.env.example</code>, and the wiring guides are in{" "}
        <code>README.md</code> and <code>docs/SUPABASE_SETUP.md</code>.
      </p>
    </div>
  );
}
