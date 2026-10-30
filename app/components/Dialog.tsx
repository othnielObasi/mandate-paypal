"use client";

import { useEffect, useRef } from "react";
import { Cross } from "./icons";

/**
 * Accessible modal sheet: traps focus, closes on Escape or backdrop click,
 * restores focus to the opener. On phones it slides up from the bottom.
 */
export function Dialog({ label, onClose, children, testId }: { label: string; onClose: () => void; children: React.ReactNode; testId?: string }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const el = ref.current!;
    const focusables = () => Array.from(el.querySelectorAll<HTMLElement>('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')).filter((f) => !f.hasAttribute("disabled"));
    (focusables()[1] ?? focusables()[0])?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key !== "Tab") return;
      const f = focusables();
      if (f.length === 0) return;
      const first = f[0]!;
      const last = f[f.length - 1]!;
      if (e.shiftKey && document.activeElement === first) (e.preventDefault(), last.focus());
      else if (!e.shiftKey && document.activeElement === last) (e.preventDefault(), first.focus());
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
      opener?.focus?.();
    };
  }, [onClose]);

  return (
    <div className="scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={label} ref={ref} data-testid={testId}>
        <button type="button" className="btn btn-sm btn-ghost sheet-close" onClick={onClose} aria-label="Close">
          <Cross size={16} />
        </button>
        {children}
      </div>
    </div>
  );
}
