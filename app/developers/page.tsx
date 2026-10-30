import type { Metadata } from "next";
import NextLink from "next/link";
import { Mark, Github, Shield } from "../components/icons";

export const metadata: Metadata = {
  title: "Developers",
  description: "Verify AI-agent payments with AP2 v0.2: the Mandate Verification API, evidence packs and public keys.",
};

const REPO = "https://github.com/othnielObasi/mandate-paypal";

const endpoints: Array<{ method: string; path: string; what: string }> = [
  { method: "GET", path: "/api/verify/{paypalOrderId}", what: "Verdict for an agent payment: Mandate v1 checks plus the AP2 v0.2 verdict (ap2) in one response." },
  { method: "GET", path: "/api/ap2/orders/{paypalOrderId}", what: "AP2 v0.2 evidence pack: merchant-signed checkout JWT, Checkout and Payment Mandate chains (SD-JWT), checkout and payment receipts, budget context, and every check with its result." },
  { method: "GET", path: "/api/ap2/jwks", what: "ES256 public keys (JWKS) for everything Mandate signs: provider, agent, payment gateway, merchants and users. Keys are looked up by kid." },
  { method: "GET", path: "/api/seller?merchantId={id}", what: "A merchant's agent payments, newest first, with their verdicts." },
  { method: "GET", path: "/api/trust", what: "All public keys, Mandate v1 (Ed25519, PEM) and AP2 v0.2 (JWKS) together." },
  { method: "GET", path: "/api/approvals/{id}/passkey", what: "The WebAuthn challenge for an approval: derived from the approval ID and the exact cart, so a device signature covers what is bought." },
  { method: "GET", path: "/api/receipts", what: "Mandate's signed, hash-chained decision log." },
  { method: "POST", path: "/api/receipts/verify", what: "Verify a copy of the log you hold; names the first altered entry." },
];

const checks: Array<[string, string]> = [
  ["checkout_signed", "The checkout JWT is signed (ES256) by the merchant named in it."],
  ["checkout_chain", "The Checkout Mandate chain verifies: the user's open mandate (or the user's own signature, when they approved) and the agent's closed mandate."],
  ["checkout_hash", "The closed Checkout Mandate's checkout_hash is the SHA-256 of that exact checkout JWT."],
  ["checkout_constraints", "The checkout meets the open Checkout Mandate's constraints (autonomous purchases)."],
  ["payment_chain", "The Payment Mandate chain verifies the same way."],
  ["payment_matches_checkout", "The payment's transaction_id is the checkout hash, and its amount and payee match the checkout."],
  ["payment_constraints", "The payment meets the open Payment Mandate: amount range, budget for the period, recurrence, and the reference to the open Checkout Mandate."],
  ["checkout_receipt", "The merchant's receipt is signed and references the closed Checkout Mandate."],
  ["payment_receipt", "The payment gateway's receipt is signed, references the closed Payment Mandate and carries PayPal's order and capture IDs."],
  ["passkey_approval", "Present when the customer approved on their device: a WebAuthn (ES256) assertion whose challenge is recomputed from the approval ID and the merchant-signed cart, checked for origin, site, user verification and signature."],
];

export default function Developers() {
  return (
    <>
      <header className="site-nav">
        <div className="wrap site-nav-in">
          <NextLink href="/" className="brand">
            <Mark />
            Mandate <small>developers</small>
          </NextLink>
          <span className="grow" />
          <a className="btn btn-ghost" href={REPO} target="_blank" rel="noreferrer">
            <Github size={18} /> GitHub
          </a>
          <NextLink className="btn btn-primary" href="/app">
            Open the app
          </NextLink>
        </div>
      </header>
      <main className="wrap page" id="main">
        <section className="page-head">
          <div>
            <span className="chip chip-accent" style={{ marginBottom: 12 }}>
              <Shield size={14} /> AP2 v0.2
            </span>
            <h1 className="page-title" style={{ fontSize: "clamp(30px, 4vw, 42px)" }}>
              Verify any AI-agent payment before you ship
            </h1>
            <p className="page-sub" style={{ fontSize: 17 }}>
              Every payment Mandate makes carries AP2 v0.2 mandates: the customer&rsquo;s signed limits, the merchant&rsquo;s signed checkout, the agent&rsquo;s closed mandates and signed receipts. Check them with public keys alone. Interoperability is tested against Google&rsquo;s AP2 reference SDK.
            </p>
          </div>
        </section>

        <div className="split">
          <div className="col">
            <section className="card card-flush">
              <h2 className="card-title" style={{ padding: "18px 20px", borderBottom: "1px solid var(--line)" }}>
                Verification API
              </h2>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
                <tbody>
                  {endpoints.map((e) => (
                    <tr key={e.path} style={{ borderTop: "1px solid var(--line)" }}>
                      <td style={{ padding: "12px 20px", verticalAlign: "top", whiteSpace: "nowrap" }}>
                        <span className={`chip ${e.method === "GET" ? "chip-accent" : "chip-ask"}`}>{e.method}</span>
                      </td>
                      <td style={{ padding: "12px 20px 12px 0", verticalAlign: "top" }}>
                        <code className="code-inline">{e.path}</code>
                        <p className="small" style={{ marginTop: 6 }}>
                          {e.what}
                        </p>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="card">
              <h2 className="card-title" style={{ marginBottom: 12 }}>
                What the AP2 verdict checks
              </h2>
              <p className="small" style={{ marginBottom: 14 }}>
                Following the AP2 specification&rsquo;s dispute rules. Each check comes back with <code className="code-inline">ok</code> and a human-readable detail; the payment is safe to fulfil only when all pass.
              </p>
              <ul className="ticks">
                {checks.map(([id, what]) => (
                  <li key={id}>
                    <code className="code-inline" style={{ flexShrink: 0 }}>
                      {id}
                    </code>
                    <span className="small" style={{ color: "var(--ink-2)" }}>
                      {what}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>

          <aside className="col">
            <section className="card card-night">
              <h2 style={{ fontSize: 16 }}>Try it</h2>
              <pre className="code mt-12">{`# keys
curl $MANDATE/api/ap2/jwks

# verdict for a PayPal order
curl $MANDATE/api/verify/5O190127TN364715T

# full evidence pack for a dispute
curl $MANDATE/api/ap2/orders/5O190127TN364715T`}</pre>
            </section>
            <section className="card">
              <h2 className="section-label" style={{ marginBottom: 10 }}>
                How Mandate signs
              </h2>
              <ul className="ticks small" style={{ color: "var(--ink-2)" }}>
                <li>Open Checkout and Payment Mandates are SD-JWTs signed by Mandate as Trusted Agent Provider after the user confirms their rules.</li>
                <li>They delegate (cnf) to Mandate&rsquo;s agent key, which closes each in-policy purchase with a key-binding hop.</li>
                <li>Purchases the user approves are closed with the user&rsquo;s key. With a passkey registered, the user&rsquo;s device also signs that exact cart, and the assertion travels in the evidence pack.</li>
                <li>Seller and category rules are enforced by Mandate&rsquo;s gate before signing, against the live merchant registry.</li>
              </ul>
            </section>
            <section className="card">
              <h2 className="section-label" style={{ marginBottom: 10 }}>
                Agents
              </h2>
              <p className="small">
                Any MCP client can shop under a user&rsquo;s mandate with a private connection link from the Assistants page. Tools: <code className="code-inline">get_mandate</code>, <code className="code-inline">search_products</code>, <code className="code-inline">get_product</code>, <code className="code-inline">buy</code>.
              </p>
            </section>
          </aside>
        </div>
      </main>
      <footer className="footer">
        <div className="wrap footer-in">
          <span>Sandbox demo. An independent open-source project, not affiliated with or endorsed by PayPal or Google.</span>
          <nav aria-label="Footer">
            <NextLink href="/">Home</NextLink>
            <NextLink href="/seller">Seller check</NextLink>
            <a href={REPO} target="_blank" rel="noreferrer">
              GitHub
            </a>
          </nav>
        </div>
      </footer>
    </>
  );
}
