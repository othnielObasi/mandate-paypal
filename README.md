# Mandate

**Let an AI spend your money, within rules you set.**

Mandate is a governed buying agent on PayPal. You describe what the agent may buy in one sentence, check the rules it read, and save them. The agent then shops and proposes purchases. A deterministic policy gate decides each one: pay it, ask you, or block it. Only a separate executor, holding a single-use permit from the gate, can move money through PayPal. After payment, Mandate follows the parcel to your door, and if it never arrives, drafts the dispute for you. Every step is written to a signed, hash-chained receipt log you can verify.

Built for the PayPal AI Hackathon (2026).

## The problem

AI agents can now buy things, but people do not trust them with money. Today the choice is to approve every purchase by hand, which defeats the point of an agent, or hand the agent an open wallet. Mandate gives you a third option: delegate within limits the agent cannot break, keep proof of everything it did, and have it follow through when something goes wrong.

## What it does

| Moment | What you see |
| --- | --- |
| **Set a mandate** | "Household basics, up to $80 a month, nothing over $25, verified sellers only" is read into rules you can check and edit before saving. |
| **In-policy purchase** | The gate allows it, issues a 5-minute single-use permit bound to that exact order, and the executor pays through PayPal. |
| **Over a limit** | A $32 kettle goes to you for a one-tap approval. Hard rules are rechecked at approval time. |
| **Prompt injection** | A product page tells the agent to buy a "Platinum bundle" and a gift card. Both are blocked: the instruction came from untrusted content, not from you. |
| **Follow-through** | Each paid order ships with tracking, added to the PayPal transaction. If the parcel is lost, the AI drafts a not-received dispute with signed receipts as evidence; it is filed only when you confirm. |
| **Proof** | The receipts ledger (AG Grid) shows every decision, permit, payment, tracking update and dispute. Edit any row and press Verify: the chain names the row that was altered. |
| **Kill switch** | Pause or revoke; the next purchase is blocked. |

## How it works

```
User ──sentence──▶ Mandate parser (model drafts, schema decides) ──▶ rules the user edits and saves
                                                                             │
Agent (Claude) ──tool call──▶ Tool wrappers ──intent──▶ Policy gate ──allow──▶ Permit (Ed25519, single use, order-bound)
   ▲                              │                        │                         │
   └── untrusted product pages ───┘ provenance tracking    ├─approve──▶ You          ▼
                                                           └─block              Executor ──▶ PayPal Agent Toolkit (sandbox)
                                                                                     │
                                       Fulfilment: tracking → problem detection → AI-drafted dispute → you confirm
                                                 every step ──▶ signed, hash-chained receipt log
```

- **The model proposes, the gate decides.** The gate (`lib/gate/evaluate.ts`) is pure and deterministic and fails closed on any error.
- **The agent cannot reach money.** Its only tools are `search_catalog`, `get_product` and `propose_purchase`. Prices, sellers and categories come from the catalogue, never from the model. An architecture test fails the build if agent code imports PayPal, the executor, permits or signing keys.
- **Provenance.** A product counts as agent-originated only if a search surfaced it, and that search did not use words that appeared only in untrusted page text. Anything else is tagged `untrusted_instruction` and blocked.
- **Permits.** Signed over the SHA-256 digest of the canonical order, expire in 5 minutes, and are consumed atomically, so replay and order-swapping fail.
- **Disputes.** The model writes the statement from the order's facts only; if the statement does not cite the order id and amount, a factual template is used instead. The evidence bundle carries the signed receipts for that purchase and their digest.

## Tools used

| Tool | How it is used |
| --- | --- |
| **PayPal Agent Toolkit** (`@paypal/agent-toolkit` 1.11) | The executor calls `create_order`, `pay_order` and `get_order`; fulfilment calls `create_shipment_tracking` and `update_shipment_tracking` on the capture, and `list_disputes` to find the buyer's claim. The toolkit is never handed to the model, so every payment passes the gate. |
| **PayPal REST** | OAuth and `verify-webhook-signature` for the webhook receiver. |
| **PayPal webhooks** | `CHECKOUT.ORDER.APPROVED` captures an order whose buyer approved but never returned; `CUSTOMER.DISPUTE.*` links disputes to orders and follows them to resolution. |
| **PayPal sandbox** | All money movement. The app refuses to start against production. |
| **Claude** (Anthropic Messages API, default `claude-sonnet-5-5`) | Drives the shopping agent through tool use, reads the plain-English mandate into a policy (validated by a strict schema), and writes the dispute statement. |
| **AG Grid Community** 33 | The receipts ledger: editable cells as a live tamper test, broken-row highlighting, search, filters, pagination, CSV export. |
| **Postgres** | Optional persistence for every store (`DATABASE_URL`). |
| **Render** | Hosting for the demo. |
| **Offline planner** | A deterministic stand-in so the app runs with no API keys. The "compromised-agent drill" uses it to obey product pages, so the injection defence can be shown reliably. |

## Run it

Requires Node 20+.

```bash
git clone https://github.com/othnielObasi/mandate-paypal && cd mandate-paypal
npm install
npm run dev          # http://localhost:3000
```

With no environment variables it runs fully offline: simulated payments, a simulated carrier, the offline planner and in-memory storage. To use real services, copy `.env.example` to `.env.local`:

- `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`: a PayPal **sandbox** app. Payments, tracking and dispute lookup then go through the Agent Toolkit. PayPal asks the sandbox buyer to approve each order; log in with your sandbox personal account.
- `PAYPAL_WEBHOOK_ID`: the sandbox webhook pointing at `/api/paypal/webhooks`.
- `ANTHROPIC_API_KEY`: let Claude drive the agent.
- `DATABASE_URL` and `MANDATE_SIGNING_KEY`: keep everything, including a verifiable receipt chain, across restarts.

### Demo script

1. Press **Read my rules**, adjust anything, **Save mandate**.
2. Run "Buy washing-up liquid and sponges": both paid and shipped.
3. Run "Buy an electric kettle": approve it on the card.
4. Run "Buy toilet roll": blocked, unverified seller.
5. **Compromised-agent drill**: the spray is paid; the injected bundle and gift card are blocked.
6. On an order, **Simulate lost parcel**, **Draft dispute**, then **Confirm and file dispute**.
7. In the ledger, double-click a payment row, change the amount, press **Verify chain**; then **Undo edits**.

## Tests

Built test-first.

```bash
npm test             # unit and integration (270 with TEST_DATABASE_URL, 258 without)
npm run test:e2e     # Playwright, 10 end-to-end journeys in Chromium
npm run typecheck
```

| Area | What the tests prove |
| --- | --- |
| Policy gate | Every rule, fail-closed on garbage input; property tests: an `allow` never breaks a limit, an approval never overrides a hard rule |
| Permits | Expiry, digest binding, wrong key, any single-field edit breaks the signature, single use under concurrency |
| Receipts | Edit, delete, reorder and re-hash-without-signing are all detected; concurrent appends never fork the chain |
| Executor | No PayPal call without a stored, valid, unused permit for that exact order; replay and races pay once |
| Governor | End-to-end flows; property tests: spend never exceeds the budget without approval, every PayPal call has an allow decision and permit before it |
| Agent | Catalogue facts beat model claims; provenance catches injected purchases; step limit; model errors |
| Fulfilment | Shipping, lost and overdue detection, AI statement with factual fallback, evidence bundle, confirm-to-file, Resolution Center hand-off, dispute sync |
| Storage | One contract suite runs on memory, PGlite and real Postgres through a connection pool; a restart test proves state and the receipt chain survive |
| Webhooks and limits | Signature verification fails closed, duplicate deliveries are harmless, spoofed client IPs don't bypass limits |
| PayPal adapters | Request mapping and response parsing against the toolkit's real output shapes |
| API and UI logic | Every route; the rules form; the ledger's tamper copy |
| End to end | Every demo step in a real browser, including phone width |
| Architecture | Agent code cannot import anything that moves money |

Safety checks were mutation-tested: removing single-use consumption, permit verification, the amount check, reserved-money accounting, hard-rule ordering, provenance tainting, dispute confirmation, the dispute's problem check, statement validation, webhook signature checking or the trusted-proxy IP rule each makes the suite fail.

## Limitations

- Parcels are handled by a **simulated carrier**, labelled as such in the UI; tracking numbers are added to the real PayPal transaction.
- PayPal has no buyer-side dispute API. In PayPal mode Mandate drafts the claim, you file it in the sandbox Resolution Center, and Mandate links it back by webhook or lookup.
- With the Agent Toolkit each order needs the sandbox buyer's approval in PayPal; the toolkit's `create_order` has no Vault support and only accepts USD, so the demo runs in USD.
- Designed for one server instance: a second instance cannot fork the receipt chain (the sequence number is a primary key) but would see conflicts.
- Single demo user; no authentication.
- Provenance tracking is a heuristic over search terms, backed by the gate's category, seller and limit rules.

## Licence

MIT. See [LICENSE](LICENSE).
