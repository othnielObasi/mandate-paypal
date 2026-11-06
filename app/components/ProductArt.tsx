/**
 * Line illustrations for the demo catalogue (it has no photos). One consistent style: 64×64,
 * round strokes in currentColor, so they follow light and dark mode. Unknown products get a parcel.
 */
const ART: Record<string, React.ReactNode> = {
  // Washing-up liquid: a squeeze bottle with a flip cap and a drop.
  "wul-500": (
    <>
      <path d="M27 10h10v5H27z" />
      <path d="M29 15h6v4h-6z" />
      <path d="M24 19h16a3 3 0 0 1 3 3v29a4 4 0 0 1-4 4H25a4 4 0 0 1-4-4V22a3 3 0 0 1 3-3z" />
      <path d="M21 31h22" />
      <path d="M32 36c2.6 3 3.6 4.8 3.6 6.3a3.6 3.6 0 1 1-7.2 0c0-1.5 1-3.3 3.6-6.3z" />
    </>
  ),
  // Sponges: a stack of three with a scrub layer.
  "sponge-3": (
    <>
      <rect x="12" y="39" width="40" height="11" rx="3" />
      <rect x="14" y="27" width="36" height="11" rx="3" />
      <rect x="16" y="15" width="32" height="11" rx="3" />
      <path d="M16 20h32M14 32h36M12 44h40" strokeDasharray="2 3" />
    </>
  ),
  // Cleaning spray: trigger bottle.
  "clean-spray": (
    <>
      <path d="M26 12h12l4 6H26z" />
      <path d="M42 15h7" />
      <path d="M31 18v5" />
      <path d="M38 18v5" />
      <path d="M25 23h18a3 3 0 0 1 3 3v24a4 4 0 0 1-4 4H26a4 4 0 0 1-4-4V26a3 3 0 0 1 3-3z" />
      <path d="M22 34h24" />
      <path d="M51 11l3-2M52 15h4M51 19l3 2" />
    </>
  ),
  // Deep-clean bundle: a gift box with a ribbon.
  "platinum-bundle": (
    <>
      <rect x="12" y="26" width="40" height="26" rx="3" />
      <path d="M10 20h44v6H10z" />
      <path d="M32 20v32" />
      <path d="M32 20c-3-7-12-8-12-3s7 3 12 3c5 0 12 2 12-3s-9-4-12 3z" />
    </>
  ),
  // Electric kettle.
  kettle: (
    <>
      <path d="M20 22h22l4 26a4 4 0 0 1-4 4H20a4 4 0 0 1-4-4z" />
      <path d="M22 22c0-5 4-8 9-8s9 3 9 8" />
      <path d="M44 27h4a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4h-3" />
      <path d="M16 30l-5-4" />
      <path d="M14 52h34" />
      <circle cx="31" cy="38" r="2.5" />
    </>
  ),
  // Toilet roll.
  "toilet-roll": (
    <>
      <ellipse cx="26" cy="20" rx="12" ry="6" />
      <ellipse cx="26" cy="20" rx="4" ry="2" />
      <path d="M14 20v24c0 3.3 5.4 6 12 6s12-2.7 12-6V20" />
      <path d="M38 34h14v12H38" />
      <path d="M44 34v12" strokeDasharray="2 3" />
    </>
  ),
  // Gift card.
  "gift-card-50": (
    <>
      <rect x="9" y="18" width="46" height="30" rx="4" />
      <path d="M9 27h46" />
      <path d="M38 37h10" />
      <path d="M17 40c1.3 1.4 2.8 2 4.6 2 2.2 0 3.7-1 3.7-2.7 0-3.9-8-2.1-8-6 0-1.6 1.4-2.8 3.6-2.8 1.6 0 2.9.5 4 1.6" />
      <path d="M21 29v15" />
    </>
  ),
  // A4 paper: a fanned stack.
  "printer-paper": (
    <>
      <path d="M18 14h22l8 8v28H18z" />
      <path d="M40 14v8h8" />
      <path d="M14 20v34h28" />
      <path d="M24 30h16M24 36h16M24 42h10" />
    </>
  ),
  // Ink cartridge.
  "ink-black": (
    <>
      <rect x="18" y="12" width="28" height="36" rx="3" />
      <path d="M24 48v4h16v-4" />
      <path d="M24 20h16" />
      <path d="M32 26c3 3.6 4.4 5.8 4.4 7.6a4.4 4.4 0 1 1-8.8 0c0-1.8 1.4-4 4.4-7.6z" />
    </>
  ),
};

const PARCEL = (
  <>
    <path d="M32 10l20 10v24L32 54 12 44V20z" />
    <path d="M12 20l20 10 20-10M32 30v24" />
  </>
);

const TONE: Record<string, string> = { household: "art-household", office: "art-office", "gift-cards": "art-gift" };

export function ProductArt({ sku, category, size = 56 }: { sku: string; category?: string; size?: number }) {
  return (
    <span className={`art ${TONE[category ?? ""] ?? "art-household"}`} style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 64 64" width={size * 0.72} height={size * 0.72} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        {ART[sku] ?? PARCEL}
      </svg>
    </span>
  );
}
