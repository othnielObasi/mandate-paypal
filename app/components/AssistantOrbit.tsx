import { ASSISTANT_LOGOS } from "./assistant-logos";
import { Mark } from "./icons";

/** Two rows of six; each assistant appears in one row only. */
const ROWS = [ASSISTANT_LOGOS.slice(0, 6), ASSISTANT_LOGOS.slice(6, 12)];

/**
 * Logos of assistants drifting past a fixed Mandate hub: any of them connects, all of
 * them go through the same gate. Decorative; the names are also given as text.
 */
export function AssistantOrbit() {
  return (
    <div className="orbit">
      <p className="sr-only">Works with {ASSISTANT_LOGOS.map((l) => l.name).join(", ")} and any other MCP client.</p>
      <div className="orbit-field" aria-hidden="true">
        <span className="orbit-dots" />
        {ROWS.map((row, r) => (
          <div key={r} className={`orbit-row orbit-row-${r}`}>
            <div className="orbit-track">
              {/* The row twice, so the loop is seamless; the strip is narrower than one row. */}
              {[...row, ...row].map((l, i) => (
                <span key={i} className="orbit-tile" title={l.name} dangerouslySetInnerHTML={{ __html: l.svg }} />
              ))}
            </div>
          </div>
        ))}
        <span className="orbit-hub">
          <Mark size={40} />
        </span>
      </div>
    </div>
  );
}
