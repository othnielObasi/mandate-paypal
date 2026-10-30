"use client";

import { useCallback, useEffect, useState } from "react";
import { api, day } from "../../components/api";
import { Check, Copy, Cross, Plug } from "../../components/icons";
import { useStore } from "../store";

type Conn = { id: string; label: string; createdAt: string; revoked: boolean };
type Fresh = { id: string; label: string; url: string };

const CLIENTS = ["Claude Desktop", "ChatGPT", "Cursor", "My own agent"];

function steps(label: string, url: string): Array<React.ReactNode> {
  if (/claude code/i.test(label))
    return [
      <>
        Run <code className="code-inline">claude mcp add --transport http mandate {url}</code>
      </>,
      <>Ask: &ldquo;Find me a cleaning spray under $5 and buy it.&rdquo;</>,
    ];
  if (/claude/i.test(label)) return [<>In Claude, open Settings, then Connectors, then Add custom connector.</>, <>Name it &ldquo;Mandate&rdquo; and paste the link.</>, <>Ask: &ldquo;Find me a cleaning spray under $5 and buy it.&rdquo;</>];
  if (/chatgpt/i.test(label)) return [<>In ChatGPT, open Settings, then Connectors, then Create (developer mode).</>, <>Name it &ldquo;Mandate&rdquo; and paste the link as the MCP server URL.</>, <>Ask: &ldquo;Find me a cleaning spray under $5 and buy it.&rdquo;</>];
  if (/cursor/i.test(label)) return [<>In Cursor, open Settings, then MCP, then Add new MCP server.</>, <>Choose Streamable HTTP and paste the link.</>, <>Ask the agent to search Mandate&rsquo;s catalog and buy something.</>];
  return [<>Point any MCP client at the link (Streamable HTTP, JSON responses).</>, <>Tools: get_mandate, search_products, get_product, buy.</>, <>Every buy goes through your rules first.</>];
}

export default function AssistantsPage() {
  const { mandate, refresh, toast, ready } = useStore();
  const [list, setList] = useState<Conn[]>([]);
  const [label, setLabel] = useState("Claude Desktop");
  const [fresh, setFresh] = useState<Fresh | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const load = useCallback(async () => {
    if (mandate) setList(await api<Conn[]>(`/api/mandates/${mandate.id}/connections`));
  }, [mandate]);
  useEffect(() => {
    void load().catch(() => undefined);
  }, [load]);

  const create = async (name = label) => {
    if (!mandate) return;
    setWorking(true);
    setError(null);
    try {
      const r = await api<Fresh>(`/api/mandates/${mandate.id}/connections`, { method: "POST", body: JSON.stringify({ label: name.trim() }) });
      setFresh(r);
      setCopied(false);
      await load();
      await refresh();
      requestAnimationFrame(() => document.getElementById("new-link")?.scrollIntoView({ behavior: "smooth", block: "center" }));
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setWorking(false);
    }
  };

  const revoke = async (c: Conn) => {
    await api(`/api/connections/${c.id}`, { method: "DELETE" });
    if (fresh?.id === c.id) setFresh(null);
    await load();
    await refresh();
    toast(`${c.label} can no longer shop for you.`);
  };

  const copy = async () => {
    if (!fresh) return;
    try {
      await navigator.clipboard.writeText(fresh.url);
      setCopied(true);
    } catch {
      setCopied(false);
      toast("Copy failed. Select the link and copy it by hand.");
    }
  };

  const active = list.filter((c) => !c.revoked);
  const revoked = list.filter((c) => c.revoked);
  const disabled = !mandate || mandate.status === "revoked";

  return (
    <>
      <section className="page-head">
        <div>
          <h1 className="page-title">Assistants</h1>
          <p className="page-sub">Let the AI you already use shop for you. Each one gets its own private link over MCP, works only inside your signed rules, and can be cut off with one click.</p>
        </div>
      </section>

      {ready && !mandate && <div className="banner banner-info">Write and sign a mandate first; assistants connect to it.</div>}

      <div className="split">
        <div className="col">
          <section className="card card-lg" aria-labelledby="connect-h" data-testid="connections">
            <h2 id="connect-h" className="card-title">
              Connect an assistant
            </h2>
            <p className="small mt-8">Works with any assistant that supports remote MCP servers.</p>
            <div className="pickers mt-16">
              {CLIENTS.map((c) => (
                <button key={c} type="button" className="picker" aria-pressed={label === c} style={label === c ? { borderColor: "var(--accent)", color: "var(--accent)", fontWeight: 600 } : undefined} onClick={() => setLabel(c)} disabled={disabled}>
                  {c}
                </button>
              ))}
            </div>
            <form
              className="row mt-16"
              onSubmit={(e) => {
                e.preventDefault();
                void create();
              }}
            >
              <div className="field grow" style={{ flex: "1 1 220px" }}>
                <label htmlFor="as-name" className="tiny">
                  Assistant name
                </label>
                <input id="as-name" className="input" value={label} onChange={(e) => setLabel(e.target.value)} maxLength={60} disabled={disabled} />
              </div>
              <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-end" }} disabled={disabled || working || !label.trim()}>
                {working ? <span className="spinner" aria-hidden="true" /> : <Plug size={16} />} Create connection URL
              </button>
            </form>
            {error && (
              <p className="error-text mt-12" role="alert">
                {error}
              </p>
            )}

            {fresh && (
              <div id="new-link" className="card card-accent mt-24" data-testid="connection-url" style={{ boxShadow: "none" }}>
                <h3 style={{ fontSize: 17 }}>Your link for {fresh.label} is ready</h3>
                <p className="tiny mt-8" style={{ color: "var(--ask)", fontWeight: 600 }}>
                  Shown once. Copy it now; anyone with it can shop within your rules.
                </p>
                <div className="row mt-12">
                  <code className="code grow" style={{ flex: "1 1 320px", padding: "11px 14px" }}>
                    {fresh.url}
                  </code>
                  <button type="button" className="btn btn-primary" onClick={copy}>
                    {copied ? <Check size={16} /> : <Copy size={16} />}
                    {copied ? "Copied" : "Copy URL"}
                  </button>
                </div>
                <ol className="mt-16 small" style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 6, color: "var(--ink-2)" }}>
                  {steps(fresh.label, fresh.url).map((s, i) => (
                    <li key={i}>{s}</li>
                  ))}
                </ol>
              </div>
            )}
          </section>

          <section className="card" aria-labelledby="connected-h">
            <h2 id="connected-h" className="card-title" style={{ marginBottom: 8 }}>
              Connected
            </h2>
            <ul className="list">
              <li className="row between" style={{ padding: "14px 0" }}>
                <span>
                  <strong>Mandate agent</strong>
                  <br />
                  <span className="small">Built in · always within your rules</span>
                </span>
                <span className="chip chip-allow">Built in</span>
              </li>
              {active.map((c) => (
                <li key={c.id} className="row between" style={{ padding: "14px 0" }}>
                  <span>
                    <strong>{c.label}</strong>
                    <br />
                    <span className="small">Connected over MCP · since {day(c.createdAt)}</span>
                  </span>
                  <span className="row">
                    <span className="chip chip-allow">Connected</span>
                    <button className="btn btn-sm btn-danger" onClick={() => revoke(c)}>
                      Revoke
                    </button>
                  </span>
                </li>
              ))}
              {revoked.map((c) => (
                <li key={c.id} className="row between" style={{ padding: "14px 0" }}>
                  <span>
                    <strong>{c.label}</strong>
                    <br />
                    <span className="small">Since {day(c.createdAt)}</span>
                  </span>
                  <span className="chip chip-block">Revoked</span>
                </li>
              ))}
            </ul>
          </section>
        </div>

        <aside className="col">
          <section className="card" aria-labelledby="can-h">
            <h2 id="can-h" className="section-label" style={{ marginBottom: 12 }}>
              What assistants can do
            </h2>
            <ul className="ticks">
              <li>
                <Check size={16} className="ok-ico" />
                Search shops and compare prices
              </li>
              <li>
                <Check size={16} className="ok-ico" />
                Buy within your signed rules
              </li>
              <li>
                <Check size={16} className="ok-ico" />
                Ask you to approve anything over a limit
              </li>
            </ul>
            <h2 className="section-label" style={{ margin: "20px 0 12px" }}>
              What they can&rsquo;t
            </h2>
            <ul className="ticks">
              <li>
                <Cross size={16} className="bad-ico" />
                See or use your PayPal login
              </li>
              <li>
                <Cross size={16} className="bad-ico" />
                Change your rules or budget
              </li>
              <li>
                <Cross size={16} className="bad-ico" />
                Approve a purchase for you
              </li>
            </ul>
          </section>
          <section className="card card-night">
            <h2 style={{ fontSize: 16 }}>Why this is safe</h2>
            <p className="small mt-8">Assistants never hold a payment credential. They can only propose; Mandate&rsquo;s gate decides, and only a single-use permit can make PayPal move money.</p>
          </section>
        </aside>
      </div>
    </>
  );
}
