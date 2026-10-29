"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./api";

type Conn = { id: string; label: string; createdAt: string; revoked: boolean };

/** Let any MCP-capable AI assistant shop under this mandate, and cut it off at any time. */
export function Connections({ mandateId, onChange }: { mandateId: string; onChange: () => void }) {
  const [label, setLabel] = useState("Claude Desktop");
  const [list, setList] = useState<Conn[]>([]);
  const [fresh, setFresh] = useState<{ label: string; url: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => setList(await api<Conn[]>(`/api/mandates/${mandateId}/connections`)), [mandateId]);
  useEffect(() => {
    setFresh(null);
    void load().catch(() => undefined);
  }, [load]);

  const create = async () => {
    try {
      const r = await api<{ label: string; url: string }>(`/api/mandates/${mandateId}/connections`, { method: "POST", body: JSON.stringify({ label }) });
      setFresh(r);
      setError(null);
      await load();
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  };

  const revoke = async (id: string) => {
    await api(`/api/connections/${id}`, { method: "DELETE" });
    await load();
    onChange();
  };

  return (
    <div className="connections" data-testid="connections">
      <h3>Connect another AI assistant</h3>
      <p className="small">Any assistant that speaks MCP (Claude, ChatGPT, your own agent) can shop for you, but only through this mandate's rules.</p>
      <div className="row">
        <input type="text" value={label} onChange={(e) => setLabel(e.target.value)} aria-label="Assistant name" style={{ flex: 1, minWidth: 140 }} />
        <button onClick={create}>Create connection URL</button>
      </div>
      {error && <p className="error">{error}</p>}
      {fresh && (
        <div className="secret" data-testid="connection-url">
          <div className="small">
            Connection URL for <strong>{fresh.label}</strong>. Shown once; treat it like a password.
          </div>
          <code>{fresh.url}</code>
          <div className="row">
            <button onClick={() => navigator.clipboard?.writeText(fresh.url)}>Copy URL</button>
          </div>
          <div className="small">
            Claude Code: <code>claude mcp add --transport http mandate {fresh.url}</code>
            <br />
            Other assistants: add a remote MCP server and paste the URL.
          </div>
        </div>
      )}
      {list.length > 0 && (
        <ul className="feed">
          {list.map((c) => (
            <li key={c.id} className="orderhead">
              <span>
                <strong>{c.label}</strong> <span className="small">connected {new Date(c.createdAt).toLocaleString()}</span>
              </span>
              {c.revoked ? (
                <span className="badge b-info">revoked</span>
              ) : (
                <button className="danger" onClick={() => revoke(c.id)}>
                  Revoke
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
