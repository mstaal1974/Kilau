import { type CSSProperties, useEffect, useRef, useState } from "react";
import Logo from "./Logo";
import { Icon } from "./ui";
import { MONO, SERIF } from "./styles";
import { navigate, paths } from "../lib/route";
import { GOLD, CREAM } from "../lib/data";
import { DEPARTMENTS, categoriesIn } from "../lib/goods";

interface HeaderProps {
  bagCount: number;
  userEmail: string | null;
  isAdmin: boolean;
  onOpenBag: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
}

const navLink: CSSProperties = {
  background: "none",
  border: 0,
  cursor: "pointer",
  color: "rgba(20,18,14,0.82)",
  fontFamily: MONO,
  fontSize: 10.5,
  letterSpacing: "0.22em",
  textTransform: "uppercase",
  padding: "26px 0",
  whiteSpace: "nowrap",
};

// SHOP mega-menu. The house sells six departments now, so the menu is one
// column per department rather than the old fragrance-first/format-second
// split: that split is still right, but it belongs inside Fragrance, which is
// where it has gone. Each column heads to the department page and lists its
// categories, so the menu is the site map and not a second taxonomy to keep
// in step with the first.
interface MenuColumn {
  label: string;
  to: string;
  items: { label: string; to: string }[];
}

const FRAGRANCE_COLUMN: MenuColumn = {
  label: "Fragrance",
  to: paths.fragrances,
  items: [
    { label: "Eau de Parfum", to: paths.fragrances },
    { label: "10ml Discovery", to: paths.discovery },
    { label: "30ml — Everyday Pour", to: paths.shop("30ml") },
    { label: "50ml — Signature Pour", to: paths.shop("50ml") },
    { label: "Car Diffusers", to: paths.car },
    { label: "Body & Bath", to: paths.body },
    { label: "Gift & Fragrance Sets", to: paths.shop("sets") },
    { label: "Find your scent", to: paths.find() },
  ],
};

const MENU: MenuColumn[] = [
  ...DEPARTMENTS.map((d) => ({
    label: d.name,
    to: paths.department(d.slug),
    items: categoriesIn(d.id).map((c) => ({ label: c.name, to: paths.category(c.slug) })),
  })),
  FRAGRANCE_COLUMN,
];

/** The departments that get their own place in the top bar. */
const PRIMARY: { label: string; to: string }[] = [
  ...DEPARTMENTS.map((d) => ({ label: d.short, to: paths.department(d.slug) })),
  { label: "Fragrance", to: paths.fragrances },
];

export default function Header({ bagCount, userEmail, isAdmin, onOpenBag, onSignIn, onSignOut }: HeaderProps) {
  const [shopOpen, setShopOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  // Below 1000px the primary nav is hidden; this drawer is the only way through
  // the site on a phone.
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeTimer = useRef<number | null>(null);

  useEffect(() => {
    const close = () => {
      setShopOpen(false);
      setMenuOpen(false);
      setDrawerOpen(false);
    };
    window.addEventListener("hashchange", close);
    return () => window.removeEventListener("hashchange", close);
  }, []);

  // An open drawer covers the page: escape closes it, and the page behind it
  // must not scroll away underneath.
  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setDrawerOpen(false);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen]);

  const openShop = () => {
    if (closeTimer.current) window.clearTimeout(closeTimer.current);
    setShopOpen(true);
  };
  const closeShopSoon = () => {
    closeTimer.current = window.setTimeout(() => setShopOpen(false), 160);
  };

  return (
    <>
        <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 60,
          background: "rgba(255,255,255,0.9)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          borderBottom: "1px solid #e4ddd0",
        }}
      >
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 32px", height: 72, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 24 }}>
          <button onClick={() => navigate(paths.home)} style={{ display: "flex", alignItems: "center", gap: 12, background: "none", border: 0, cursor: "pointer", padding: 0 }} aria-label="Kilau Bali home">
            <Logo width={22} height={26} />
            <span style={{ textAlign: "left" }}>
              <span className="kb-wordmark" style={{ display: "block", fontFamily: SERIF, fontSize: 20, letterSpacing: "0.2em", fontWeight: 600, lineHeight: 1, color: CREAM }}>
                KILAU <span style={{ color: GOLD, fontWeight: 500 }}>BALI</span>
              </span>
              <span className="kb-wordmark-sub" style={{ display: "block", fontFamily: MONO, fontSize: 8, letterSpacing: "0.32em", color: "rgba(20,18,14,0.74)", marginTop: 5, textTransform: "uppercase" }}>Clothing &amp; Fragrance</span>
            </span>
          </button>

          <nav className="kb-nav" style={{ display: "flex", alignItems: "center", gap: 26, position: "relative" }} aria-label="Primary">
            <div onMouseEnter={openShop} onMouseLeave={closeShopSoon} style={{ position: "relative" }}>
              <button className="kb-navlink" style={{ ...navLink, color: shopOpen ? GOLD : navLink.color }} onClick={() => setShopOpen((o) => !o)} aria-expanded={shopOpen} aria-haspopup="true">
                Shop
              </button>
              {shopOpen && (
                <div
                  role="menu"
                  style={{
                    position: "absolute",
                    top: "100%",
                    left: -24,
                    background: "#ffffff",
                    border: "1px solid #e4ddd0",
                    padding: "26px 30px 28px",
                    display: "grid",
                    gridTemplateColumns: "repeat(6, minmax(140px, 1fr))",
                    gap: 30,
                    boxShadow: "0 30px 60px rgba(20,18,14,0.1)",
                  }}
                >
                  {MENU.map((col) => (
                    <div key={col.label}>
                      <button
                        role="menuitem"
                        className="kb-navlink"
                        onClick={() => navigate(col.to)}
                        style={{ ...navLink, display: "block", padding: 0, marginBottom: 12, fontSize: 8.5, letterSpacing: "0.3em", color: GOLD, whiteSpace: "normal", textAlign: "left" }}
                      >
                        {col.label}
                      </button>
                      {col.items.map((x) => (
                        <button key={x.label} role="menuitem" className="kb-navlink" onClick={() => navigate(x.to)} style={{ ...navLink, display: "block", padding: "6px 0", fontFamily: SERIF, fontSize: 16, letterSpacing: 0, textTransform: "none", color: CREAM, whiteSpace: "normal", textAlign: "left" }}>
                          {x.label}
                        </button>
                      ))}
                    </div>
                  ))}
                </div>
              )}
            </div>
            {PRIMARY.map((x) => (
              <button key={x.label} className="kb-navlink" style={navLink} onClick={() => navigate(x.to)}>{x.label}</button>
            ))}
            <button className="kb-navlink" style={{ ...navLink, color: GOLD }} onClick={() => navigate(paths.discover)}>Scent DNA</button>
          </nav>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <button aria-label="Find your scent" onClick={() => navigate(paths.find())} style={{ background: "none", border: 0, cursor: "pointer", padding: 6, display: "grid", placeItems: "center" }}>
              <Icon name="search" size={19} color={CREAM} />
            </button>
            <span aria-hidden style={{ width: 1, height: 22, background: "#d8d0c0" }} />
            <button
              className="kb-pill"
              onClick={onOpenBag}
              aria-label={`Your bag, ${bagCount} items`}
              style={{ display: "flex", alignItems: "center", gap: 10, border: "1px solid rgba(184,135,60,0.52)", height: 40, padding: "0 16px", background: "none", color: GOLD, cursor: "pointer", fontFamily: MONO, fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase" }}
            >
              <Icon name="bag" size={15} />
              <span className="kb-bag-label">Your bag </span>({bagCount})
            </button>
            <div className="kb-account-desktop" style={{ position: "relative" }}>
              <button
                className="kb-navlink"
                onClick={() => (userEmail ? setMenuOpen((o) => !o) : onSignIn())}
                style={{ ...navLink, padding: "10px 0", color: userEmail ? CREAM : "rgba(20,18,14,0.82)" }}
                aria-haspopup={userEmail ? "true" : undefined}
                aria-expanded={userEmail ? menuOpen : undefined}
              >
                {userEmail ? "Account" : "Sign In"}
              </button>
              {menuOpen && userEmail && (
                <div role="menu" style={{ position: "absolute", right: 0, top: "calc(100% + 8px)", minWidth: 220, background: "#ffffff", border: "1px solid #e4ddd0", padding: 8, boxShadow: "0 24px 50px rgba(20,18,14,0.09)" }}>
                  <div style={{ padding: "8px 12px", fontFamily: MONO, fontSize: 10, color: "rgba(20,18,14,0.68)", borderBottom: "1px solid #e4ddd0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{userEmail}</div>
                  {[
                    { label: "My Orders", to: paths.account },
                    { label: "My Monthly Pour", to: paths.account },
                    ...(isAdmin ? [{ label: "Admin Console", to: paths.admin }, { label: "Staff Order Desk", to: paths.staff }] : []),
                  ].map((x) => (
                    <button key={x.label} role="menuitem" className="kb-softhover" onClick={() => navigate(x.to)} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: 0, cursor: "pointer", color: CREAM, padding: "10px 12px", fontSize: 13 }}>
                      {x.label}
                    </button>
                  ))}
                  <button role="menuitem" className="kb-softhover" onClick={onSignOut} style={{ display: "block", width: "100%", textAlign: "left", background: "none", border: 0, cursor: "pointer", color: "rgba(20,18,14,0.74)", padding: "10px 12px", fontSize: 13 }}>
                    Sign Out
                  </button>
                </div>
              )}
            </div>

            <button
              className="kb-burger"
              onClick={() => setDrawerOpen((o) => !o)}
              aria-label={drawerOpen ? "Close menu" : "Open menu"}
              aria-expanded={drawerOpen}
              aria-controls="kb-mobile-menu"
              style={{ background: "none", border: 0, cursor: "pointer", padding: 6, placeItems: "center", color: CREAM }}
            >
              {drawerOpen ? (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden>
                  <path d="M5 5l14 14M19 5 5 19" />
                </svg>
              ) : (
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" aria-hidden>
                  <path d="M3 6h18M3 12h18M3 18h18" />
                </svg>
              )}
            </button>
          </div>
        </div>

      </header>

      {/* Outside <header> on purpose: its backdrop-filter makes it the
          containing block for position:fixed, which would trap the drawer
          inside a 72px-tall box. */}
      {drawerOpen && <MobileMenu userEmail={userEmail} isAdmin={isAdmin} onSignIn={onSignIn} onSignOut={onSignOut} onClose={() => setDrawerOpen(false)} />}
    </>
  );
}

/**
 * The phone menu. Everything the desktop bar carries — the two Shop columns,
 * the primary links and the account actions — in one scrollable sheet.
 */
function MobileMenu({
  userEmail,
  isAdmin,
  onSignIn,
  onSignOut,
  onClose,
}: {
  userEmail: string | null;
  isAdmin: boolean;
  onSignIn: () => void;
  onSignOut: () => void;
  onClose: () => void;
}) {
  // navigate() fires a hashchange, which closes the drawer; go() covers the
  // case where the link is to the page we are already on.
  const go = (to: string) => {
    navigate(to);
    onClose();
  };
  const heading: CSSProperties = { fontFamily: MONO, fontSize: 8.5, letterSpacing: "0.3em", textTransform: "uppercase", color: GOLD, margin: "0 0 10px" };
  const item: CSSProperties = {
    display: "block",
    width: "100%",
    textAlign: "left",
    background: "none",
    border: 0,
    borderBottom: "1px solid #e9e2d6",
    cursor: "pointer",
    color: CREAM,
    fontFamily: SERIF,
    fontSize: 19,
    padding: "13px 0",
  };

  return (
    <div
      id="kb-mobile-menu"
      className="kb-drawer-sheet"
      style={{
        position: "fixed",
        left: 0,
        right: 0,
        top: 72,
        bottom: 0,
        zIndex: 97,
        background: "rgba(255,255,255,0.98)",
        backdropFilter: "blur(18px)",
        WebkitBackdropFilter: "blur(18px)",
        borderTop: "1px solid #e4ddd0",
        overflowY: "auto",
        WebkitOverflowScrolling: "touch",
      }}
    >
      <nav style={{ padding: "22px 24px 40px", display: "grid", gap: 26 }} aria-label="Mobile">
        <div>
          {PRIMARY.map((x) => (
            <button key={x.label} onClick={() => go(x.to)} style={item}>
              {x.label}
            </button>
          ))}
          <button onClick={() => go(paths.subscribe())} style={item}>
            Subscribe
          </button>
          <button onClick={() => go(paths.find())} style={{ ...item, color: GOLD }}>
            Find your scent
          </button>
          <button onClick={() => go(paths.discover)} style={{ ...item, color: GOLD }}>
            Scent DNA
          </button>
        </div>

        {/* Every department's categories, so the phone menu is the same site
            map as the desktop one rather than a shorter, different site. */}
        {MENU.map((col) => (
          <div key={col.label}>
            <button onClick={() => go(col.to)} style={{ ...heading, background: "none", border: 0, padding: 0, cursor: "pointer", textAlign: "left" }}>
              {col.label}
            </button>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 18px" }}>
              {col.items.map((x) => (
                <button key={x.label} onClick={() => go(x.to)} style={{ ...item, fontSize: 16, padding: "11px 0" }}>
                  {x.label}
                </button>
              ))}
            </div>
          </div>
        ))}

        <div>
          <div style={heading}>Account</div>
          {userEmail ? (
            <>
              <div style={{ fontFamily: MONO, fontSize: 10, color: "rgba(20,18,14,0.68)", paddingBottom: 10, overflow: "hidden", textOverflow: "ellipsis" }}>{userEmail}</div>
              <button onClick={() => go(paths.account)} style={item}>My Orders</button>
              <button onClick={() => go(paths.account)} style={item}>My Monthly Pour</button>
              {isAdmin && (
                <>
                  <button onClick={() => go(paths.admin)} style={item}>Admin Console</button>
                  <button onClick={() => go(paths.staff)} style={item}>Staff Order Desk</button>
                </>
              )}
              <button
                onClick={() => {
                  onSignOut();
                  onClose();
                }}
                style={{ ...item, color: "rgba(20,18,14,0.74)" }}
              >
                Sign Out
              </button>
            </>
          ) : (
            <button
              onClick={() => {
                onSignIn();
                onClose();
              }}
              style={item}
            >
              Sign In
            </button>
          )}
        </div>
      </nav>
    </div>
  );
}
