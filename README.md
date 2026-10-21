# Mandate

**Let an AI spend your money, within rules you set.**

Mandate is a governed buying agent on PayPal. You describe what the agent may buy in one sentence. The agent shops and proposes purchases. A deterministic policy gate decides each one: pay it, ask you, or block it. Only a separate executor, holding a single-use permit from the gate, can move money through PayPal. Every step is written to a signed, hash-chained receipt log you can verify.

Built for the [PayPal AI Hackathon](https://devpost.com/) (2026).

## The problem

AI agents can now buy things, but people do not trust them with money. Today the choice is to approve every purchase by hand, which defeats the point of an agent, or hand the agent an open wallet. Mandate gives you a third option: delegate within limits the agent cannot break, and keep proof of everything it did.

## What it does

| Moment | What you see |
| --- | --- |
| **Set a mandate** | "Household basics, up to $80 a month, nothing over $25, verified sellers only" becomes enforceable rules. |
| **In-policy purchase** | The gate allows it, issues a 5-minute single-use permit bound to that exact order, and the executor pays through PayPal. |
| **Over a limit** | A $32 kettle goes to you for a one-tap approval. Hard rules are rechecked at approval time. |
| **Prompt injection** | A product page tells the agent to buy a "Platinum bundle" and a gift card. Both are blocked: the instruction came from untrusted content, not from you. |
| **Proof** | Every decision, permit and payment is an Ed25519-signed, hash-chained receipt. The tamper test edits a payment and verification names the broken row. |
| **Kill switch** | Pause or revoke; the next purchase is blocked. |

## How it works

```
User ──mandate──▶ Mandate parser (model drafts, schema decides)
                        │
Agent (Claude) ──tool call──▶ Tool wrappers ──intent──▶ Policy gate ──allow──▶ Permit (Ed25519, single use, order-bound)
   ▲                              │                        │                         │
   └── untrusted product pages ───┘ provenance tracking    ├─approve──▶ You (approve/decline)
                                                           └─block                   ▼
                                                                         Executor ──▶ PayPal Agent Toolkit (sandbox)
                                                 every step ──▶ Signed, hash-chained receipt log
```

- **The model proposes, the gate decides.** The gate (`lib/gate/evaluate.ts`) is pure and deterministic and fails closed on any error.
- **The agent cannot reach money.** Its only tools are `search_catalog`, `get_product` and `propose_purchase`. Prices, sellers and categories come from the catalogue, never from the model. An architecture test fails the build if agent code imports PayPal, the executor, permits or signing keys.
- **Provenance.** A product counts as agent-originated only if a search surfaced it, and that search did not use words that appeared only in untrusted page text. Anything else is tagged `untrusted_instruction` and blocked.
- **Permits.** Signed over the SHA-256 digest of the canonical order, expire in 5 minutes, and are consumed atomically, so replay and order-swapping fail.

## Tools used

| Tool | How it is used |
| --- | --- |
| **PayPal Agent Toolkit** (`@paypal/agent-toolkit` 1.11) | The executor calls the toolkit's `create_order`, `pay_order` and `get_order` programmatically. The toolkit is never handed to the model, so every payment passes the gate. |
| **PayPal sandbox** | All payments. The app refuses to start against production. |
| **Claude** (Anthropic Messages API, default `claude-sonnet-5-5`) | Drives the shopping agent through tool use, and drafts the policy from your plain-English mandate (validated by a strict schema). |
| **Offline planner** | A deterministic stand-in so the app runs with no API keys. The "compromised-agent drill" uses it to obey product pages, so the injection defence can be shown reliably. |

## Run it

Requires Node 20+.

```bash
git clone <this repo> && cd mandate
npm install
npm run dev          # http://localhost:3000
```

With no environment variables it runs fully offline: simulated payments and the offline planner. To use the real services, copy `.env.example` to `.env.local` and set:

- `PAYPAL_CLIENT_ID` and `PAYPAL_CLIENT_SECRET` from a PayPal **sandbox** app. Payments then go through the Agent Toolkit. PayPal will ask the sandbox buyer to approve each order; log in with your sandbox personal account.
- `ANTHROPIC_API_KEY` to let Claude drive the agent.
- `MANDATE_SIGNING_KEY` so receipts survive restarts (command to generate one is in `.env.example`).

### Demo script

1. Create the default mandate.
2. Run "Buy washing-up liquid and sponges": both paid.
3. Run "Buy an electric kettle": approve it on the card.
4. Run "Buy toilet roll": blocked, unverified seller.
5. Click **Compromised-agent drill**: the spray is paid, the injected bundle and gift card are blocked.
6. Click **Verify chain**, then **Tamper test**.

## Tests

The safety core was built test-first.

```bash
npm test             # 154 tests
npm run typecheck
```

| Area | What the tests prove |
| --- | --- |
| Policy gate | Every rule, fail-closed on garbage input, and property tests: an `allow` never breaks a limit; an approval never overrides a hard rule |
| Permits | Expiry, digest binding, wrong key, any single-field edit breaks the signature, single use under concurrency |
| Receipts | Edit, delete, reorder and re-hash-without-signing are all detected; concurrent appends never fork the chain |
| Executor | No PayPal call without a stored, valid, unused permit for that exact order; replay and races pay once |
| Governor | End-to-end flows; property tests: spend never exceeds the budget without approval, and every PayPal call has an allow decision and permit before it |
| Agent | Catalogue facts beat model claims; provenance catches injected purchases; step limit; model errors |
| PayPal adapter | Request mapping and response parsing against the toolkit's real output shapes |
| API | Every route, including the PayPal return round trip |
| Architecture | Agent code cannot import anything that moves money |

Critical checks were also mutation-tested: removing single-use consumption, permit verification, the amount check, reserved-money accounting, the hard-rule ordering or provenance tainting each makes the suite fail.

## Limitations

- State is in memory: one server process, reset on restart. Store interfaces are ready for Postgres.
- Single demo user; no authentication.
- With the Agent Toolkit, each order needs the sandbox buyer's approval in PayPal. The toolkit's `create_order` has no Vault support and only accepts USD, so the demo runs in USD.
- Provenance tracking is a heuristic over search terms, backed by the gate's category, seller and limit rules.

## Licence

MIT. See [LICENSE](LICENSE).
