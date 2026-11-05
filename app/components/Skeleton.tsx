/** Loading placeholders shaped like the content they stand in for. */

export function Sk({ w = "100%", h = 14, r, style }: { w?: number | string; h?: number; r?: number; style?: React.CSSProperties }) {
  return <span className="sk" style={{ width: w, height: h, borderRadius: r, ...style }} aria-hidden="true" />;
}

/** A card of placeholder lines: a title, then `lines` rows. */
export function SkCard({ lines = 3, height }: { lines?: number; height?: number }) {
  return (
    <div className="card" aria-hidden="true" style={{ minHeight: height }}>
      <Sk w="38%" h={16} />
      <div className="stack mt-16" style={{ gap: 12 }}>
        {Array.from({ length: lines }, (_, i) => (
          <Sk key={i} w={`${92 - ((i * 17) % 40)}%`} />
        ))}
      </div>
    </div>
  );
}

/** Rows of a table or list while it loads. */
export function SkRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="stack" style={{ gap: 14, padding: "18px 20px" }} aria-hidden="true">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="row" style={{ gap: 14, flexWrap: "nowrap" }}>
          <Sk w={64} h={22} r={999} />
          <Sk w={`${70 - ((i * 13) % 30)}%`} />
          <Sk w={56} style={{ marginLeft: "auto" }} />
        </div>
      ))}
    </div>
  );
}
