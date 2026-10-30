"use client";

import { useState } from "react";
import NextLink from "next/link";
import { useRouter } from "next/navigation";
import type { Policy } from "@/lib/gate/policy";
import { formToPolicy, policyToForm, type PolicyForm } from "@/lib/ui/policy-form";
import { api } from "../../components/api";
import { Arrow, Back, Key, Shield } from "../../components/icons";
import { useStore, type Mandate } from "../store";

const EXAMPLES = [
  "Household basics, up to $80 a month, nothing over $25, never more than 10% above market price, verified sellers only",
  "Office supplies, $100 a month, nothing over $30, never more than 10% above market price",
  "Household basics, $40 a week, nothing over $15, refuse anything above that",
];

const SHORT = ["Household basics, $80 a month", "Office supplies, $100 a month", "Strict: $40 a week, refuse over $15"];

type Step = "write" | "check" | "signing";

export default function Setup() {
  const router = useRouter();
  const { mandate, refresh, act, busy, toast } = useStore();
  const [step, setStep] = useState<Step>("write");
  const [text, setText] = useState(mandate?.rawText && mandate.rawText.length > 20 ? mandate.rawText : EXAMPLES[0]!);
  const [base, setBase] = useState<Policy | null>(null);
  const [form, setForm] = useState<PolicyForm | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const read = () =>
    act(async () => {
      const r = await api<{ policy: Policy }>("/api/mandates/preview", { method: "POST", body: JSON.stringify({ text }) });
      setBase(r.policy);
      setForm(policyToForm(r.policy));
      setFormError(null);
      setStep("check");
      window.scrollTo({ top: 0 });
    });

  const sign = () => {
    if (!form || !base) return;
    const r = formToPolicy(form, base.currency);
    if (!r.ok) return setFormError(r.error);
    setFormError(null);
    setStep("signing");
    void act(async () => {
      const m = await api<Mandate>("/api/mandates", { method: "POST", body: JSON.stringify({ text, policy: r.policy }) });
      await refresh(m.id);
      toast("Mandate signed. Your agents can start shopping.");
      router.push("/app");
    }).then((ok) => ok === undefined && setStep("check"));
  };

  const set = <K extends keyof PolicyForm>(k: K, v: PolicyForm[K]) => setForm((f) => (f ? { ...f, [k]: v } : f));

  return (
    <div className="stack" style={{ gap: 28 }}>
      <div className="row between">
        {step === "write" ? (
          mandate ? (
            <NextLink href="/app" className="small row" style={{ gap: 6 }}>
              <Back size={16} /> Back to my mandate
            </NextLink>
          ) : (
            <span />
          )
        ) : (
          <button type="button" className="btn btn-sm btn-ghost" onClick={() => setStep("write")} disabled={step === "signing"}>
            <Back size={16} /> Change what I wrote
          </button>
        )}
        <ol className="steps-nav" aria-label="Setup steps">
          <li className={step !== "write" ? "done" : undefined} aria-current={step === "write" ? "step" : undefined}>
            {step !== "write" ? "✓ Write" : "1 · Write"}
          </li>
          <li aria-current={step === "check" ? "step" : undefined} className={step === "signing" ? "done" : undefined}>
            {step === "signing" ? "✓ Check" : "2 · Check"}
          </li>
          <li aria-current={step === "signing" ? "step" : undefined}>3 · Sign</li>
        </ol>
      </div>

      {step === "write" && (
        <div className="split" style={{ gap: 48 }}>
          <section className="stack" style={{ gap: 0 }}>
            <h1 className="hero-title">What may your agents buy for you?</h1>
            <p className="lede mt-12">Say it the way you&rsquo;d tell a person. Mandate turns it into rules every agent has to obey, and you check them before anything is signed.</p>
            <label htmlFor="mandate-text" className="label mt-24" style={{ marginBottom: 8 }}>
              Your mandate
            </label>
            <textarea id="mandate-text" className="textarea textarea-hero" rows={4} value={text} onChange={(e) => setText(e.target.value)} />
            <p className="small mt-16" style={{ marginBottom: 8 }}>
              Or start from one of these
            </p>
            <div className="pickers">
              {SHORT.map((s, i) => (
                <button key={s} type="button" className="picker" onClick={() => setText(EXAMPLES[i]!)}>
                  {s}
                </button>
              ))}
            </div>
            <div className="row mt-24" style={{ gap: 16 }}>
              <button type="button" className="btn btn-primary btn-lg" onClick={read} disabled={busy || text.trim().length < 3}>
                {busy ? <span className="spinner" aria-hidden="true" /> : null}
                Read my rules
                <Arrow size={18} />
              </button>
              <span className="small">Nothing is saved or signed yet.</span>
            </div>
          </section>
          <aside className="card card-lg" aria-labelledby="how">
            <h2 id="how" className="card-title" style={{ marginBottom: 16 }}>
              How Mandate keeps you in control
            </h2>
            <ol className="numbered">
              <li>
                <span className="n">1</span>
                <span>
                  <strong>You sign the limits.</strong>
                  <br />
                  <span className="muted">Categories, a per-item cap, a budget, a fair-price rule, trusted sellers.</span>
                </span>
              </li>
              <li>
                <span className="n">2</span>
                <span>
                  <strong>Any agent can shop.</strong>
                  <br />
                  <span className="muted">Mandate&rsquo;s own, Claude, ChatGPT or yours. None can touch PayPal directly.</span>
                </span>
              </li>
              <li>
                <span className="n">3</span>
                <span>
                  <strong>Every purchase is checked.</strong>
                  <br />
                  <span className="muted">Within your rules, it pays. Over a limit, it asks you. Anything else is blocked.</span>
                </span>
              </li>
              <li>
                <span className="n">4</span>
                <span>
                  <strong>Everything is provable.</strong>
                  <br />
                  <span className="muted">Sellers can verify your consent, and every step is a signed receipt.</span>
                </span>
              </li>
            </ol>
          </aside>
        </div>
      )}

      {step !== "write" && form && (
        <>
          <div>
            <h1 className="page-title" style={{ fontSize: "clamp(28px, 4vw, 38px)" }}>
              Is this what you meant?
            </h1>
            <p className="page-sub" style={{ fontSize: 17 }}>
              Here is what the AI read from your sentence. Change anything that&rsquo;s wrong. These exact rules are what you&rsquo;ll sign.
            </p>
          </div>
          <div className="split" style={{ alignItems: "start" }}>
            <section className="card card-lg" style={{ paddingTop: 8, paddingBottom: 8 }} aria-label="Your rules" data-testid="rules-editor">
              <div className="rule-row">
                <label htmlFor="f-cat" className="rule-name">
                  Agents may buy
                  <br />
                  <span className="hint">Categories, separated by commas</span>
                </label>
                <div className="rule-ctl">
                  <input id="f-cat" className="input" value={form.categories} onChange={(e) => set("categories", e.target.value)} />
                </div>
              </div>
              <div className="rule-row">
                <label htmlFor="f-item" className="rule-name">
                  Most they can spend on one order
                </label>
                <div className="rule-ctl">
                  <input id="f-item" className="input input-sm" inputMode="decimal" value={form.maxItem} onChange={(e) => set("maxItem", e.target.value)} aria-describedby="f-item-unit" />
                  <span id="f-item-unit" className="muted">
                    USD, and above that
                  </span>
                  <select className="select" style={{ width: "auto" }} value={form.overLimit} onChange={(e) => set("overLimit", e.target.value as PolicyForm["overLimit"])} aria-label="Above the per-order limit">
                    <option value="ask">ask me</option>
                    <option value="block">refuse</option>
                  </select>
                </div>
              </div>
              <div className="rule-row">
                <label htmlFor="f-budget" className="rule-name">
                  Total budget
                </label>
                <div className="rule-ctl">
                  <input id="f-budget" className="input input-sm" inputMode="decimal" value={form.budget} onChange={(e) => set("budget", e.target.value)} />
                  <span className="muted">USD per</span>
                  <select className="select" style={{ width: "auto" }} value={form.period} onChange={(e) => set("period", e.target.value as PolicyForm["period"])} aria-label="Budget period">
                    <option value="week">week</option>
                    <option value="month">month</option>
                  </select>
                </div>
              </div>
              <div className="rule-row">
                <label htmlFor="f-market" className="rule-name">
                  Fair price
                  <br />
                  <span className="hint">Compared with live prices from other shops</span>
                </label>
                <div className="rule-ctl">
                  <span className="muted">never more than</span>
                  <input id="f-market" className="input input-xs" inputMode="numeric" placeholder="off" value={form.maxPremium} onChange={(e) => set("maxPremium", e.target.value)} />
                  <span className="muted">% above market</span>
                </div>
              </div>
              {form.maxPremium.trim() && (
                <div className="rule-row">
                  <label htmlFor="f-market-none" className="rule-name">
                    No market price
                    <br />
                    <span className="hint">If no other shop lists it</span>
                  </label>
                  <div className="rule-ctl">
                    <select id="f-market-none" className="select" style={{ width: "auto" }} value={form.marketUnavailable} onChange={(e) => set("marketUnavailable", e.target.value as PolicyForm["marketUnavailable"])}>
                      <option value="ask">Ask me</option>
                      <option value="block">Don&rsquo;t buy</option>
                      <option value="allow">Buy anyway</option>
                    </select>
                  </div>
                </div>
              )}
              <div className="rule-row">
                <span className="rule-name">Sellers</span>
                <div className="rule-ctl">
                  <label className="check">
                    <input type="checkbox" checked={form.verifiedOnly} onChange={(e) => set("verifiedOnly", e.target.checked)} />
                    Verified sellers only
                  </label>
                </div>
              </div>
              <div className="rule-row">
                <label htmlFor="f-blocked" className="rule-name">
                  Never buy from
                </label>
                <div className="rule-ctl">
                  <input id="f-blocked" className="input" placeholder="No one blocked" value={form.blocked} onChange={(e) => set("blocked", e.target.value)} />
                </div>
              </div>
              <div className="rule-row">
                <label htmlFor="f-exp" className="rule-name">
                  Ends on
                </label>
                <div className="rule-ctl">
                  <input id="f-exp" type="date" className="input" style={{ width: "auto" }} value={form.expires} onChange={(e) => set("expires", e.target.value)} />
                </div>
              </div>
              {formError && (
                <p className="error-text" role="alert" style={{ padding: "0 0 16px" }}>
                  {formError}
                </p>
              )}
            </section>

            <aside className="col" aria-label="What you are signing">
              <section className="card card-lg card-night">
                <div className="row" style={{ gap: 8, marginBottom: 12 }}>
                  <Shield size={18} style={{ color: "var(--night-accent)" }} />
                  <h2 style={{ fontSize: 15 }}>What you&rsquo;re signing</h2>
                </div>
                <p className="small" style={{ marginBottom: 14 }}>
                  An Intent Mandate, the AP2-style credential that PayPal&rsquo;s merchants can check. It says what any agent may do without asking you.
                </p>
                <pre className="code">{intentPreview(text, form)}</pre>
              </section>
              <section className="card card-lg">
                <button type="button" className="btn btn-primary btn-lg btn-block" onClick={sign} disabled={step === "signing"}>
                  {step === "signing" ? <span className="spinner" aria-hidden="true" /> : <Key size={18} />}
                  {step === "signing" ? "Signing…" : "Sign and activate"}
                </button>
                <p className="small mt-12">
                  Signed with Ed25519. In this sandbox demo Mandate holds the key for you; in production your device&rsquo;s passkey signs. You can pause or revoke at any time.
                </p>
              </section>
            </aside>
          </div>
        </>
      )}
    </div>
  );
}

function intentPreview(text: string, f: PolicyForm): string {
  const pct = f.maxPremium.trim();
  const desc = text.length > 34 ? `${text.slice(0, 34)}…` : text;
  return [
    "intent_mandate {",
    `  description: "${desc}"`,
    "  user_cart_confirmation_required: false",
    `  intent_expiry: ${f.expires}T23:59Z`,
    "  limits {",
    `    categories: [${f.categories}]`,
    `    per_order: $${f.maxItem} → ${f.overLimit === "ask" ? "ask" : "refuse"}`,
    `    budget: $${f.budget} / ${f.period}`,
    `    max_above_market: ${pct ? `${pct}%, if unknown → ${f.marketUnavailable}` : "off"}`,
    `    sellers: ${f.verifiedOnly ? "verified only" : "any"}${f.blocked.trim() ? `, never ${f.blocked}` : ""}`,
    "  }",
    "}",
  ].join("\n");
}
