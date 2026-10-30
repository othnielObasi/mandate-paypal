# Mandate

**Let any AI agent spend your money, only within rules you signed, and let anyone check it did.**

Mandate is an independent authorisation layer for AI-agent payments, running on PayPal today. You describe what agents may buy in one sentence, check the rules it read, and sign them. From then on any agent can shop for you: Mandate's own agent, or Claude, ChatGPT or your own agent connected over MCP. No agent can move money itself. Every purchase is priced and signed by the merchant, decided by a deterministic gate against the limits you signed, and paid through the PayPal Agent Toolkit. Each payment carries [AP2 v0.2](https://github.com/google-agentic-commerce/AP2) mandates and receipts that a seller, PayPal or a dispute reviewer can verify with public keys alone.

Built for the PayPal AI Hackathon (2026). An independent open-source project, not affiliated with or endorsed by PayPal or Google.

## Why

AI agents can now buy things, but nobody can prove what an agent was allowed to do. Asking a model to follow spending instructions is not a control: it can misread them, be steered by a product page, or simply be wrong.

PayPal has backed Google's Agent Payments Protocol (AP2), whose mandates let a user pre-authorise what an agent may spend, and has said mandate evidence should feed Seller Protection and fraud models ([PayPal Developer blog](https://developer.paypal.com/community/blog/PayPal-Agent-Payments-Protocol/)). Mandate shows the whole loop working on PayPal now: signed authority, a gate the agent cannot override, payment, and evidence anyone can check.

Its value is that it sits **outside** any one agent: the same signed rules and the same verifiable evidence apply whichever assistant starts the purchase.

## What it does

| Moment | What happens |
| --- | --- |
| **Sign your rules** | "Household basics, up to $80 a month, nothing over $25, never more than 10% above market price, verified sellers only" is read into rules you check, edit and sign. |
| **In-policy purchase** | The merchant quotes and signs the checkout. The gate allows it, a single-use permit is issued, and the executor pays through the PayPal Agent Toolkit. The agent closes your AP2 mandates for that exact checkout. |
| **Over a limit** | A $32 kettle goes to you. Approving signs that exact cart; with a **passkey**, your phone or laptop signs it with Face ID, fingerprint or PIN. |
| **Above market price** | Ink at $22.99 when the market is about $19.99 is 15% over your 10% limit, so it goes to you. If no market price can be found, Mandate does what you signed: ask you (default), block, or buy anyway. |
| **Prompt injection** | A product page tells the agent to buy a bundle and a gift card. Both are blocked: the instruction came from untrusted content, not from your task. |
| **Agents at the same time** | Several agents buying at once cannot overspend: budget decisions for a mandate are made one at a time, across server processes. |
| **Any agent, same rules** | Connect Claude, ChatGPT or your own agent over MCP with a revocable link. It can search and buy, but only through the same gate. |
| **Proof for you** | Tap any paid purchase to see its AP2 verdict, how it was authorised, every check and both receipts, and download the evidence. |
| **Seller check** | Sellers verify each agent payment with public keys alone, before they ship. |
| **Follow-through** | Orders are tracked, with tracking added to the PayPal transaction. A lost parcel gets a drafted dispute, in your words if you edit it, carrying the AP2 evidence; it is filed only when you confirm. |
| **Tamper evidence** | Every decision is Ed25519-signed and hash-chained. Edit any row in the ledger and Verify names the row that changed. |
| **Kill switch** | Pause or revoke the mandate, or any one assistant's connection. |

## How it works

```
You ── sentence ──▶ rules you check and edit ──▶ sign
                                                  │  Intent Mandate (v1) + AP2 v0.2 open Checkout and Payment Mandates
Mandate agent ─┐                                  ▼
Claude / any ──┼─ MCP ─▶ search / read / propose ─▶ merchant prices and signs the checkout
agent         ─┘    (provenance tracked)                         │
                                                                 ▼
                              ┌──────── per-mandate lock ────────────────────────────┐
                              │ policy gate: signed limits, category, seller,         │
                              │ item cap, fair price, budget (spent + held, one read) │
                              │   allow ──▶ AP2 mandates closed, permit issued        │
                              │   ask   ──▶ you approve (passkey signs the exact cart)│
                              │   block                                               │
                              └──────────────────────────────────────────────────────┘
                                                                 │
                        executor (the only code that holds PayPal) ─▶ PayPal Agent Toolkit (sandbox)
                                                                 │
                        merchant + gateway receipts ─▶ seller check, proof, dispute evidence
                        every step ─▶ signed, hash-chained receipt log
```

### Trust boundaries

| Component | Trusted for | Not trusted for |
| --- | --- | --- |
| **Agent** (any model, any vendor) | Finding products and proposing purchases | Prices, categories, seller status, or anything that moves money. Its tools are search, read and propose only; a build-time architecture test fails if agent code imports payment code. |
| **Product pages** | Nothing | Text from pages is tracked as untrusted; a purchase that only untrusted text suggested is blocked. |
| **Merchant** | Its own prices and checkout, which it signs | Its own legitimacy: seller status comes from Mandate's registry. |
| **Policy gate** (`lib/gate/evaluate.ts`) | The decision | Pure, deterministic, fails closed. If the rules on file differ from what you signed, everything is blocked. |
| **Executor** | Moving money | It pays only for a stored, signed, unexpired, unused permit whose digest matches the exact order. |
| **You** | Approvals | With a passkey, approvals need your device's signature over the exact cart. |
| **Verifier** (seller, PayPal, reviewer) | Checking | Needs only the published public keys. |

### Money safety

- **No overspend under concurrency.** The budget check and the money reservation run under a per-mandate lock (a Postgres advisory lock when several server processes share a database). Spent and held money are read in one snapshot.
- **Money in flight stays held.** A permit holds its amount from issue until the payment settles. Settling records the payment and releases the permit in one statement, so money is never counted twice or missed.
- **Failures fail safe.** If PayPal never created an order, the hold is released. If an order exists but capture failed, the money stays held and the record says it needs reconciling.
- **Signed rules are never silently skipped.** With no market reference price, the fair-price rule asks you, blocks, or allows, exactly as you signed.
- **Permits** are signed over the order digest, expire in 5 minutes and are consumed atomically.
- **The receipt chain never forks.** If two processes write at once, the second re-reads the head and signs at the next position.

### AP2 v0.2

Every purchase carries mandates in the current [AP2 specification](https://github.com/google-agentic-commerce/AP2):

- **When you sign your rules**, Mandate (as AP2 "Trusted Agent Provider") issues an open Checkout Mandate and an open Payment Mandate as SD-JWTs (ES256). The payment mandate carries the standard constraints: `payment.amount_range`, `payment.budget` with `payment.agent_recurrence`, and `payment.reference` to the open checkout mandate. Both delegate (`cnf`) to Mandate's agent key.
- **On each in-policy purchase** the merchant signs the checkout (a UCP checkout object, ES256 JWT) and the agent closes both mandates with key-binding hops bound to that checkout's hash. **Purchases you approve** are closed with your key instead (human present).
- **With a passkey**, your device also signs a WebAuthn challenge derived from the approval and the merchant-signed cart. The assertion travels in the evidence pack, and verifiers recompute the challenge from the checkout, so the signature covers what was bought.
- **After PayPal captures**, the merchant and Mandate's payment gateway issue signed checkout and payment receipts.
- **Verification** follows the spec's dispute rules: `GET /api/ap2/orders/{paypalOrderId}` returns the evidence pack and verdict; `GET /api/ap2/jwks` publishes the keys.

Rules that depend on live data (verified or blocked sellers) or have no standard AP2 constraint (categories, fair price, untrusted-content origin) are enforced by Mandate's gate before anything is signed: verifiers must reject constraints they do not know, and a frozen merchant list would wrongly block sellers verified later.

Interoperability is tested against Google's AP2 reference SDK (pinned in CI) in both directions: it verifies Mandate-built purchases with no violations, including evidence from the real purchase flow, agrees on budget enforcement, and Mandate verifies chains the reference SDK produces. The original Mandate v1 credentials (Ed25519 JWS: Intent, Cart and Payment Mandates, with the payment fingerprint on the PayPal order) are still issued and verified alongside.

## Verification API

For sellers, PayPal, and anyone integrating. Full reference at `/developers` in the app.

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/api/verify/{paypalOrderId}` | Verdict for an agent payment: Mandate v1 checks plus the AP2 v0.2 verdict |
| GET | `/api/ap2/orders/{paypalOrderId}` | AP2 evidence pack: signed checkout, mandate chains, receipts, budget context, passkey assertion if any, and every check |
| GET | `/api/ap2/jwks` | ES256 public keys for everything Mandate signs |
| GET | `/api/seller?merchantId={id}` | A merchant's agent payments with their verdicts |
| GET | `/api/trust` | All public keys, v1 and AP2 |
| GET | `/api/receipts` · POST `/api/receipts/verify` | The signed decision log, and verification of a copy you hold |

## Connect your own AI assistant (MCP)

1. On the **Assistants** page, name it and press **Create connection URL**. The URL is shown once.
2. Claude Code: `claude mcp add --transport http mandate <URL>`. Other assistants: add a remote MCP server and paste the URL, or send `Authorization: Bearer <token>` to `/api/mcp`.
3. The assistant gets `get_mandate`, `search_products`, `get_product` and `buy`. Revoke the connection or the mandate to cut it off.

## What is real and what is simulated

| Part | With keys set | Without keys (offline demo) |
| --- | --- | --- |
| Payments | **PayPal sandbox** through the PayPal Agent Toolkit; the buyer approves each order in PayPal | Simulated PayPal, labelled in the UI |
| Shopping agent and rules reader | **Claude** (Anthropic API) | An offline planner |
| Market prices | **Channel3** live prices | Fixed reference prices for the demo catalogue |
| Merchants and catalogue | Demo merchants with their own signing keys | Same |
| Parcels | Simulated carrier; tracking numbers are added to the **real** PayPal transaction | Simulated carrier |
| Disputes | Drafted by Mandate; you file in PayPal's Resolution Center (PayPal has no buyer-side dispute API) and Mandate links it back | Simulated |
| Signing, AP2, passkeys, gate, ledger | Real cryptography in every mode | Same (passkeys need the hosted app; the standalone preview uses a labelled demo key) |
| Production PayPal | Refused: the app will not start against production | — |

## Tools used

| Tool | How it is used |
| --- | --- |
| **PayPal Agent Toolkit** (`@paypal/agent-toolkit` 1.11) | `create_order` (with the payment fingerprint as the item description), `pay_order`, `get_order`, `create_shipment_tracking` / `update_shipment_tracking`, `list_disputes`. Called by the executor and fulfilment only; never handed to a model. |
| **PayPal REST and webhooks** | OAuth and `verify-webhook-signature`. `CHECKOUT.ORDER.APPROVED` captures orders whose buyer never returned; `CUSTOMER.DISPUTE.*` links disputes to orders. |
| **Claude** (Anthropic Messages API, default `claude-sonnet-5-5`) | Drives the shopping agent through tool use, reads the plain-English rules into a policy (validated by a strict schema), and drafts the dispute statement (checked against the facts). |
| **Model Context Protocol** | Mandate is an MCP server (Streamable HTTP), tested with the official TypeScript SDK client. |
| **AP2 reference SDK** (Google) | Interoperability tests, pinned to a commit. |
| **WebAuthn / passkeys** | Device-signed approvals (ES256). |
| **Channel3** | Market reference prices: the median of matching products' cheapest in-stock offers. |
| **AG Grid Community** 33 | The receipts ledger (editable cells as a live tamper test) and the seller payments grid. |
| **Postgres** | Optional persistence for every store (`DATABASE_URL`), and the cross-process budget lock. |
| **Render** | Hosting. |

## Run it

### Deploy (one click)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/othnielObasi/mandate-paypal)

Render reads `render.yaml`, builds the app and gives it a public URL. Leave the keys blank for the offline demo, or add your PayPal sandbox, Anthropic and Channel3 keys. The landing page is at `/`, the app at `/app`, the seller check at `/seller`, the API docs at `/developers`.

### Locally

Requires Node 20+.

```bash
git clone https://github.com/othnielObasi/mandate-paypal && cd mandate-paypal
npm install
npm run dev          # http://localhost:3000
```

With no environment variables it runs fully offline. For real services, copy `.env.example` to `.env.local`:

- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`: a PayPal **sandbox** app.
- `PAYPAL_WEBHOOK_ID`: the sandbox webhook pointing at `/api/paypal/webhooks`.
- `ANTHROPIC_API_KEY`: Claude drives the agent and reads the rules.
- `CHANNEL3_API_KEY`: real market prices.
- `DATABASE_URL` and `MANDATE_SIGNING_KEY`: everything, including the receipt chain and the signed mandates, survives restarts, and several instances can share one database.

### Standalone preview

`npm run preview:html` builds `dist/mandate-preview.html`: the real pages and API handlers in one file that runs offline in a browser, for review without a server. `npm run preview:smoke` clicks through it on desktop and phone with the network blocked.

### Demo script (about 3 minutes)

The Home page has a **Try it in 3 steps** card that walks the first three.

1. Write and sign your rules.
2. "Buy washing-up liquid and sponges": paid within your rules. Tap it to see the AP2 proof.
3. "Buy an electric kettle": over your limit, so it asks you. Add a passkey first to approve on your device.
4. **Compromised-agent drill**: the injected purchases are blocked.
5. **Check as the seller**: every AP2 check passes, before shipping.
6. Connect Claude over MCP and ask it to buy a gift card: blocked by the same rules.
7. On an order, **Simulate lost parcel**, **Draft dispute**, edit it, **Confirm and file**.
8. In the ledger, edit a payment row and press **Verify chain**: the changed row is named.

## Tests

Built test-first.

```bash
npm test             # 417 unit and integration tests; 439 with TEST_DATABASE_URL and AP2_PYTHON set
npm run test:e2e     # 21 Playwright tests in Chromium: every journey, phone width, a real MCP client,
                     # a virtual passkey, and an axe WCAG 2.1 AA scan in light and dark mode
npm run typecheck
```

| Area | What the tests prove |
| --- | --- |
| Policy gate | Every rule; fails closed; the fair-price rule with no market data asks, blocks or allows as signed; property tests: an `allow` never breaks a limit, an approval never overrides a hard rule |
| Budget under concurrency | Agents buying at once in one process, and across two server processes on real Postgres, never exceed the signed budget; the receipt chain stays unbroken |
| Money lifecycle | Money held while a payment is in flight (even past the permit's lifetime); released when PayPal never created an order or the buyer cancels; kept when capture may have happened |
| AP2 v0.2 | ES256 and SD-JWT chains; constraints; tampering caught; interop with Google's reference SDK in both directions, including a real purchase |
| Passkeys | A software authenticator and Chrome's virtual authenticator: the device must sign this exact cart; wrong origin, site, key, cart or missing user verification are refused; a changed stored assertion fails verification |
| Governor and seller check | Signed limits enforced; merchant-quoted prices; registry seller status; verdicts from public keys only |
| MCP server | Official SDK client end to end; revoked connections refused; sessions bound to connections; Origin guard |
| Storage | One contract suite on memory, PGlite and real Postgres through a connection pool; restart test |
| End to end | Every demo step in a real browser, phone width, accessibility scan, outside MCP agent against the running server, offline standalone preview |

Safety checks are mutation-tested: removing any of the guards (permit consumption, signed-limit check, seller status, provenance tainting, webhook signatures, MCP revocation and session binding, market-price maths and its no-data fallback, the budget lock, in-flight holds, the receipt-chain retry, and more) makes the suite fail.

## Limitations

- **Sandbox only.** No real money moves, and the app refuses PayPal production.
- **Key custody.** Approvals can be signed by your passkey, but the standing rules are signed by a server-held key (Mandate acting as AP2 Trusted Agent Provider). Merchant keys are demo keys held by Mandate.
- **Merchant identity.** Seller verification is a demo registry; production needs merchant onboarding, key rotation and revocation.
- **Reconciliation.** Payments whose capture may have happened are held and flagged, but there is no background job yet that settles or releases them against PayPal.
- **Tamper-evident, not tamper-proof.** The receipt chain shows any change, but an operator holding the signing key could rewrite it entirely; external anchoring would close that.
- **Prompt-injection defence** is provenance-based and tested against the scenarios here, not a full adversarial evaluation.
- PayPal has no buyer-side dispute API: in PayPal mode you file the drafted claim in the Resolution Center and Mandate links it back.
- The Agent Toolkit's `create_order` accepts USD only and has no Vault support, so the demo runs in USD with a buyer approval per order.
- MCP sessions are kept in memory, so an assistant reconnects if its server instance restarts. Single demo user, no login.

## Licence

MIT. See [LICENSE](LICENSE).
