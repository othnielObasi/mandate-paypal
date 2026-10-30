import type { SVGProps } from "react";

type P = SVGProps<SVGSVGElement> & { size?: number };

function Base({ size = 18, children, ...rest }: P & { children: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

export const Check = (p: P) => (
  <Base strokeWidth={2.6} {...p}>
    <path d="M5 12l5 5L20 7" />
  </Base>
);
export const Cross = (p: P) => (
  <Base strokeWidth={2.6} {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Base>
);
export const Shield = (p: P) => (
  <Base {...p}>
    <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
    <path d="M9 12l2 2 4-4" />
  </Base>
);
export const ShieldX = (p: P) => (
  <Base {...p}>
    <path d="M12 3l7 3v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6z" />
    <path d="M9.5 9.5l5 5M14.5 9.5l-5 5" />
  </Base>
);
export const Key = (p: P) => (
  <Base {...p}>
    <circle cx="8" cy="15" r="4" />
    <path d="M11 12l9-9M17 6l3 3" />
  </Base>
);
export const Arrow = (p: P) => (
  <Base {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Base>
);
export const Back = (p: P) => (
  <Base {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Base>
);
export const Doc = (p: P) => (
  <Base {...p}>
    <path d="M7 3h7l5 5v13H7z" />
    <path d="M14 3v5h5M10 13h6M10 17h6" />
  </Base>
);
export const Truck = (p: P) => (
  <Base {...p}>
    <path d="M3 7h11v9H3zM14 10h4l3 3v3h-7" />
    <circle cx="7" cy="18" r="2" />
    <circle cx="17" cy="18" r="2" />
  </Base>
);
export const Home = (p: P) => (
  <Base {...p}>
    <path d="M4 11l8-7 8 7v9H4z" />
    <path d="M10 20v-6h4v6" />
  </Base>
);
export const Box = (p: P) => (
  <Base {...p}>
    <path d="M3 7l9-4 9 4v10l-9 4-9-4z" />
    <path d="M3 7l9 4 9-4M12 11v10" />
  </Base>
);
export const Plug = (p: P) => (
  <Base {...p}>
    <path d="M9 2v6M15 2v6M6 8h12v4a6 6 0 01-12 0zM12 18v4" />
  </Base>
);
export const Receipt = (p: P) => (
  <Base {...p}>
    <path d="M6 3h12v18l-3-2-3 2-3-2-3 2z" />
    <path d="M9 8h6M9 12h6" />
  </Base>
);
export const Bolt = (p: P) => (
  <Base {...p}>
    <path d="M13 2L4 14h7l-1 8 9-12h-7z" />
  </Base>
);
export const Copy = (p: P) => (
  <Base {...p}>
    <rect x="9" y="9" width="12" height="12" rx="2" />
    <path d="M5 15V5a2 2 0 012-2h10" />
  </Base>
);
export const Download = (p: P) => (
  <Base {...p}>
    <path d="M12 3v12M6 11l6 6 6-6M4 21h16" />
  </Base>
);
export const Pause = (p: P) => (
  <Base {...p}>
    <path d="M9 5v14M15 5v14" />
  </Base>
);
export const Play = (p: P) => (
  <Base {...p}>
    <path d="M7 4l13 8-13 8z" />
  </Base>
);
export const Store = (p: P) => (
  <Base {...p}>
    <path d="M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9h16" />
    <path d="M9 20v-6h6v6" />
  </Base>
);
export const Spark = (p: P) => (
  <Base {...p}>
    <path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5L18 18M18 6l-2.5 2.5M8.5 15.5L6 18" />
  </Base>
);
export const Lock = (p: P) => (
  <Base {...p}>
    <rect x="4" y="10" width="16" height="11" rx="2" />
    <path d="M8 10V7a4 4 0 018 0v3" />
  </Base>
);
export const Link = (p: P) => (
  <Base {...p}>
    <path d="M10 14a4 4 0 005.66 0l3-3a4 4 0 00-5.66-5.66l-1 1" />
    <path d="M14 10a4 4 0 00-5.66 0l-3 3a4 4 0 005.66 5.66l1-1" />
  </Base>
);
export const Alert = (p: P) => (
  <Base {...p}>
    <path d="M12 3l10 18H2z" />
    <path d="M12 10v5M12 18h.01" />
  </Base>
);
export const Github = (p: P) => (
  <Base {...p}>
    <path d="M9 19c-4 1.5-4-2-6-2.5M15 21v-3.5a3 3 0 00-.8-2.3c2.8-.3 5.8-1.4 5.8-6.2a4.8 4.8 0 00-1.3-3.3 4.5 4.5 0 00-.1-3.3s-1.1-.3-3.5 1.3a12 12 0 00-6.2 0C6.5 2.1 5.4 2.4 5.4 2.4a4.5 4.5 0 00-.1 3.3A4.8 4.8 0 004 9c0 4.8 3 5.9 5.8 6.2a3 3 0 00-.8 2.3V21" />
  </Base>
);

export function Mark({ size = 28 }: { size?: number }) {
  return (
    <svg className="mark" width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
      <rect x="1" y="1" width="26" height="26" rx="8" />
      <path d="M8 14.5l4 4 8-9" strokeWidth={2.4} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
