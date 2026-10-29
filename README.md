# Mandate

**Let any AI agent spend your money, only within rules you signed.**

Mandate is a working implementation of AP2-style payment mandates on today's PayPal APIs. You describe what an agent may buy in one sentence, check the rules it read, and sign them. From then on, any agent can shop for you: Mandate's own agent, or Claude, ChatGPT or your own agent connected over MCP. Every purchase is priced and signed by the merchant, checked by a deterministic gate against the limits you signed (including a market-price check), and paid through the PayPal Agent Toolkit with a signed Payment Mandate attached to the PayPal order. Sellers can verify each payment with public keys alone, the parcel is followed to your door, and a dispute is drafted if it never arrives.

Built for the PayPal AI Hackathon (2026).

## Why

AI agents can now buy things, but nobody can prove what an agent was allowed to do. PayPal has backed Google's Agent Payments Protocol (AP2), whose **Intent Mandate** lets a user pre-authorise budget, categories and timing, and has said mandate evidence should extend Seller Protection and feed fraud models ([PayPal Developer blog](https://developer.paypal.com/community/blog/PayPal-Agent-Payments-Protocol/)). No SDK has shipped. Mandate shows the whole loop working on PayPal today: signed intent, signed cart, signed payment, verifiable by the seller, usable in a dispute.

## What it does

| Moment | What you see |
| --- | --- |
| **Sign your mandate** | "Household basics, up to $80 a month, nothing over $25, never more than 10% above market price, verified sellers only" is read into rules you check, edit and sign (an AP2-style **Intent Mandate**). |
| **In-policy purchase** | The merchant quotes and signs a **Cart Mandate**. The gate allows it, a **Payment Mandate** is issued, and the executor pays through the PayPal Agent Toolkit. The Payment Mandate's fingerprint travels on the PayPal order. |
| **Over a limit** | A $32 kettle goes to you; your approval is your signature on that exact cart (human-present mode). |
| **Above market price** | Ink at $22.99 when the market is ~$19.99 (Channel3) is 15% over your 10% limit, so it goes to you. |
| **Prompt injection** | A product page tells the agent to buy a "Platinum bundle" and a gift card. Both are blocked: the instruction came from untrusted content. |
| **Any agent, same rules** | Connect Claude, ChatGPT or your own agent over MCP with a revocable URL. It can search and buy, but only through the same gate; the ledger shows which assistant tried. |
| **Seller check** | The seller view verifies every agent payment with public keys only: intent signed by the buyer, cart by the merchant, payment authorised, within the signed limits, fingerprint on the PayPal order. |
| **Follow-through** | Each order ships with tracking added to the PayPal transaction. A lost parcel gets an AI-drafted dispute whose evidence includes the signed receipts and the verified mandate chain; it is filed only when you confirm. |
| **Proof** | The receipts ledger (AG Grid) holds every step, Ed25519-signed and hash-chained. Edit any row and Verify names the row that changed. |
| **Kill switch** | Pause or revoke the mandate, or any single assistant's connection. |

## How it works

```
You ── sentence ──▶ rules you edit ──▶ Intent Mandate (signed by you)
                                              │
Mandate agent ─┐                              ▼
Claude / any ──┼─ MCP ─▶ tools ─▶ merchant quotes + signs Cart Mandate ─▶ policy gate
agent         ─┘   (provenance tracked)                                    │  (signed limits, seller,
                                                                           │   item cap, budget,
                                                                           │   market price via Channel3)
                                               allow ◀─────────────────────┤──▶ ask you ──▶ you sign
                                                 │                         └──▶ block
                                                 ▼
                       Payment Mandate + single-use permit ─▶ executor ─▶ PayPal Agent Toolkit (sandbox)
                                                                              │ fingerprint on the order
                       seller check (public keys only) ◀──────────────────────┘
                       fulfilment: tracking → problem → AI-drafted dispute → you confirm
                       every step ─▶ signed, hash-chained receipt log
```

- **The model proposes, the gate decides.** The gate (`lib/gate/evaluate.ts`) is pure, deterministic and fails closed.
- **The limits the agent obeys are the ones you signed.** If the limits on file differ from your signed Intent Mandate, everything is blocked.
- **The agent cannot reach money.** Agents get search, read and propose tools only. Prices, categories and seller status come from the merchant's signed cart and registry, never from the agent. An architecture test fails the build if agent code imports anything that moves money.
- **Provenance.** A product counts as agent-originated only if a search surfaced it, and that search did not use words that appeared only in untrusted page text. This holds per session for outside agents over MCP too.
- **Permits.** Signed over the order digest, expire in 5 minutes, consumed atomically.

### AP2 alignment

| AP2 concept | In Mandate |
| --- | --- |
| Intent Mandate (human not present) | `lib/ap2/mandates.ts`: AP2 fields plus `x_mandate` with the machine-enforceable limits; signed with the user's key |
| Cart Mandate with `merchant_signature` | PaymentRequest-style cart signed by the merchant's key; 15-minute expiry |
| Payment Mandate with `user_authorization` | Human-not-present: attested by the gateway against the signed intent. Human-present: signed by the user who approved the cart |
| Verifiable credentials, allow-listed participants | Compact Ed25519 JWS; published trust keys at `/api/trust`; verifier in `lib/ap2/verify.ts` |
| Mandate evidence for disputes and Seller Protection | Seller view and `/api/verify/:paypalOrderId`; chain included in dispute evidence |

Field names follow the AP2 spec's examples ([ap2-protocol.org](https://ap2-protocol.org/a2a-extension)). Mandate is **aligned with** AP2, not certified against it.

## Connect your own AI assistant (MCP)

1. In the Agent panel, under **Connect another AI assistant**, name it and press **Create connection URL**. The URL is shown once.
2. Claude Code: `claude mcp add --transport http mandate <URL>`. Other assistants: add a remote MCP server and paste the URL. Or send `Authorization: Bearer <token>` to `/api/mcp`.
3. The assistant gets `get_mandate`, `search_products`, `get_product` and `buy`. Revoke the connection or the mandate to cut it off.

## Tools used

| Tool | How it is used |
| --- | --- |
| **PayPal Agent Toolkit** (`@paypal/agent-toolkit` 1.11) | `create_order` (with the Payment Mandate fingerprint as the item description), `pay_order`, `get_order` (to read the fingerprint back for the seller check), `create_shipment_tracking` / `update_shipment_tracking`, `list_disputes`. Called by the executor and fulfilment only; never handed to a model. |
| **PayPal REST and webhooks** | OAuth and `verify-webhook-signature`. `CHECKOUT.ORDER.APPROVED` captures orders whose buyer never returned; `CUSTOMER.DISPUTE.*` links disputes to orders. |
| **PayPal sandbox** | All money movement. The app refuses to start against production. |
| **Claude** (Anthropic Messages API, default `claude-sonnet-5-5`) | Drives the shopping agent through tool use, reads the plain-English mandate into a policy (validated by a strict schema), and writes the dispute statement (checked against the facts). |
| **Model Context Protocol** | Mandate is an MCP server (Streamable HTTP) so any MCP-capable assistant can shop under a mandate. Tested with the official MCP TypeScript SDK client. |
| **Channel3** | Market reference prices for the market-price rule: the median of matching products' cheapest in-stock offers. |
| **AG Grid Community** 33 | The receipts ledger (editable cells as a live tamper test, search, filters, CSV export) and the seller view's payments grid. |
| **Postgres** | Optional persistence for every store (`DATABASE_URL`). |
| **Render** | Hosting for the demo. |
| **Offline stand-ins** | Without keys: an offline planner instead of Claude, simulated PayPal, a simulated carrier and a simulated market, each labelled in the UI. The "compromised-agent drill" uses the planner to obey product pages, so the injection defence can be shown reliably. |

## Run it

Requires Node 20+.

```bash
git clone https://github.com/othnielObasi/mandate-paypal && cd mandate-paypal
npm install
npm run dev          # http://localhost:3000
```

With no environment variables it runs fully offline. For real services, copy `.env.example` to `.env.local`:

- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`: a PayPal **sandbox** app. PayPal asks the sandbox buyer to approve each order.
- `PAYPAL_WEBHOOK_ID`: the sandbox webhook pointing at `/api/paypal/webhooks`.
- `ANTHROPIC_API_KEY`: Claude drives the agent.
- `CHANNEL3_API_KEY`: real market prices.
- `DATABASE_URL` and `MANDATE_SIGNING_KEY`: everything, including the receipt chain and the signed mandates, survives restarts.

### Demo script

1. **Read my rules**, adjust anything, **Save mandate**: it is signed.
2. Run "Buy washing-up liquid and sponges": paid, shipped, signed.
3. Open **check as the seller**: every check passes, including the fingerprint on the PayPal order.
4. Run "Buy an electric kettle" and approve: a human-present, user-signed payment.
5. **Compromised-agent drill**: injected purchases blocked.
6. **Create connection URL**, connect Claude, and ask it to buy something: it works within the rules; ask it to buy a gift card: blocked.
7. On an order, **Simulate lost parcel**, **Draft dispute**, **Confirm and file dispute**.
8. In the ledger, edit a payment row and press **Verify chain**.

## Tests

Built test-first.

```bash
npm test             # 345 unit and integration tests (359 with TEST_DATABASE_URL)
npm run test:e2e     # 14 Playwright journeys in Chromium, including a real MCP client
npm run typecheck
```

| Area | What the tests prove |
| --- | --- |
| Policy gate | Every rule including the market-price premium; fails closed; property tests: an `allow` never breaks a limit, an approval never overrides a hard rule |
| AP2 credentials | JWS round trip, no `alg` downgrade; derived keys; tampered intent, cart price, payment or mode all rejected; expiry; unknown parties |
| Governor | Signed limits enforced; merchant-quoted prices; registry seller status; human-present vs not-present signing; fingerprint on the PayPal order; budget and market properties |
| Seller check | Verdicts from public keys only; fingerprint mismatch flagged; offline re-verification catches a changed price |
| MCP server | Official SDK client end to end; revoked connections and mandates refused; sessions bound to connections; protocol edges; Origin guard |
| Market rule | Channel3 request shape, median of cheapest in-stock offers, too-few-products and errors mean no rule, caching |
| Permits, receipts, executor | Single use, digest binding, tamper detection, no PayPal call without a valid permit |
| Fulfilment and webhooks | Tracking, lost and overdue detection, dispute drafting and filing, signature-verified webhooks |
| Storage | One contract suite on memory, PGlite and real Postgres through a connection pool; restart test |
| End to end | Every demo step in a real browser, phone width, and an outside MCP agent against the running server |

Safety checks are mutation-tested: removing any of 25 guards (permit consumption, signed-limit check, registry seller status, verifier limit and signer checks, provenance tainting, webhook signatures, trusted-proxy IP, MCP revocation and session binding, market-price maths, and more) makes the suite fail.

## Limitations

- **AP2-aligned, not certified.** Field names follow the spec's examples; the signature format (Ed25519 JWS) is our choice where the spec leaves it open.
- **Demo key custody.** The user's signing key is derived on the server; in production it would live on the user's device (a passkey), and merchants would hold their own keys.
- The **market-price rule** applies only when a reference exists; without data it is skipped and the record says so.
- Parcels use a **simulated carrier**; tracking numbers are added to the real PayPal transaction.
- PayPal has no buyer-side dispute API: in PayPal mode you file the drafted claim in the Resolution Center and Mandate links it back.
- The Agent Toolkit's `create_order` accepts USD only and has no Vault support, so the demo runs in USD with a buyer approval per order.
- One server instance; MCP sessions are in memory. Single demo user, no login.

## Licence

MIT. See [LICENSE](LICENSE).
