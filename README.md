<div align="center">

# ✅ Mandate

### Your AI can shop. It can't cross the line.

**An authorisation layer for AI-agent payments on PayPal.** You sign your spending rules once, in plain English. Any AI agent can then shop for you, but every purchase must pass a deterministic gate before PayPal moves money, and every payment carries proof a seller can verify with public keys alone.

[![Live demo](https://img.shields.io/badge/live%20demo-mandate--e13m.onrender.com-1d4ed8?style=for-the-badge)](https://mandate-e13m.onrender.com)
[![PayPal sandbox](https://img.shields.io/badge/PayPal-sandbox-003087?style=for-the-badge&logo=paypal&logoColor=white)](https://developer.paypal.com)
[![Licence: MIT](https://img.shields.io/badge/licence-MIT-6d5bd0?style=for-the-badge)](LICENSE)
[![Demo video](https://img.shields.io/badge/demo%20video-2%3A55-c4302b?style=for-the-badge&logo=youtube&logoColor=white)](https://www.youtube.com/watch?v=VOXk6WO7XgY)

[**▶ Watch the demo**](https://www.youtube.com/watch?v=VOXk6WO7XgY) · [**Try it live**](https://mandate-e13m.onrender.com/app) · [**Mandate Map**](https://mandate-e13m.onrender.com/how-it-works) · [**API docs**](https://mandate-e13m.onrender.com/docs) · [**Developers**](https://mandate-e13m.onrender.com/developers) · [**Judges' brief (PDF)**](docs/Mandate-judges-brief.pdf)

[![Watch the 3-minute demo on YouTube](https://img.youtube.com/vi/VOXk6WO7XgY/maxresdefault.jpg)](https://www.youtube.com/watch?v=VOXk6WO7XgY)

<sub>▶ Click to watch the demo: a hijacked agent is stopped, an approved purchase is paid through PayPal, and the seller gets proof.</sub>

</div>

> Built for the PayPal AI Hackathon 2026. An independent open-source project, not affiliated with or endorsed by PayPal or Google. All payments run in the **PayPal sandbox**; the app refuses PayPal production.

---

## Contents

- [The problem](#the-problem)
- [What Mandate does](#what-mandate-does)
- [See it working](#see-it-working)
- [How it works](#how-it-works)
- [Built with PayPal and AI](#built-with-paypal-and-ai)
- [Sponsor integrations](#sponsor-integrations)
- [For developers](#for-developers)
- [Run it yourself](#run-it-yourself)
- [Tests and quality](#tests-and-quality)
- [Project structure](#project-structure)
- [Roadmap](#roadmap)
- [Limitations](#limitations)
- [Licence](#licence)

---

## The problem

AI agents can now pay for things, and that's the uncomfortable part.

| | |
| --- | --- |
| **$1 trillion** | of US retail could be orchestrated by AI agents by 2030 ([McKinsey, 2025](https://www.mckinsey.com/industries/retail/our-insights/the-agentic-commerce-opportunity-how-ai-agents-are-ushering-in-a-new-era-for-consumers-and-merchants)) |
| **42–68%** | of hidden-instruction attacks hijacked browsing agents in tests ([StakeBench, reported by CSO Online, 2026](https://www.pulse.bot/ai/news/prompt-injection-breaks-todays-ai-agents-study-warns-7de78e44-e8b3-4038-b0cb-b1eb0005a078/)) |
| **$36.9 billion** | in chargeback costs in 2026, with no settled rule on who pays when an agent buys the wrong thing ([Mastercard, via Chargeflow](https://www.chargeflow.io/blog/agentic-commerce-and-its-impact-on-fraud-and-chargebacks)) |

Asking a model to follow spending instructions is not a control: it can misread them, be steered by a web page, or simply be wrong. And today nobody (not the user, not the merchant, not PayPal) can prove what an agent was actually allowed to do.

PayPal has backed Google's Agent Payments Protocol (AP2), whose mandates let a user pre-authorise what an agent may spend, and has said mandate evidence should feed Seller Protection and fraud models ([PayPal Developer blog](https://developer.paypal.com/community/blog/PayPal-Agent-Payments-Protocol/)). **Mandate shows that whole loop working on PayPal now**: signed authority, a gate the agent cannot override, payment, and evidence anyone can check.

## What Mandate does

Mandate never tries to make the AI trustworthy. It assumes the agent **can** be fooled, and puts plain code between any agent and the user's money.

1. **It stops what you didn't approve.** Seven rules, checked in order, by code, not a model. A purchase that only a web page asked for is blocked, however convinced the agent is.
2. **It pays what you did approve.** Inside your rules, payment is instant from your saved PayPal wallet. Over a limit, the agent stops and asks you, in the app, with a passkey, or with one tap in Telegram.
3. **It gives the seller proof.** Every decision becomes a signed, hash-chained receipt with AP2 v0.2 mandates. A seller checks a payment before shipping, so there's proof you said yes.

And because Mandate sits **outside** any single agent, the same rules and evidence apply whether the purchase comes from Mandate's own agent, Claude, ChatGPT, or any MCP client.

<details>
<summary><b>Everything it does, in one table</b></summary>

| Capability | What happens |
| --- | --- |
| **Sign your rules** | "Household basics, up to $80 a month, nothing over $25, never more than 10% above market price, verified sellers only" is read by Meta Muse Spark into rules you check, edit and sign. |
| **In-policy purchase** | The merchant quotes and signs the checkout. The gate allows it, a single-use permit is issued, and the executor pays through PayPal. The agent closes your AP2 mandates for that exact checkout. |
| **Connect PayPal once** | Log in to PayPal and agree once (PayPal Vault). Purchases your rules allow are then paid straight away; nothing outside your rules can be. Without it, each order is approved in PayPal, and a webhook completes it even if you close the tab. |
| **Over a limit** | A $32 kettle goes to you. Approving signs that exact cart; with a **passkey**, your device signs it with Face ID, fingerprint or PIN. |
| **Prompt injection** | A page tells the agent to buy a bundle and a gift card. Both are blocked: the instruction came from untrusted content, not your task. |
| **Fair price** | Every product is compared with the median of similar items across ~10 shops (Channel3). Above your limit, it asks you. |
| **Real products** | Beyond the demo store, the agent searches real shops through **Channel3**, judged by the same rules. |
| **Scheduled buys** | "Washing-up liquid every Monday" runs on its own from a **Bryntum** calendar, through the same gate. |
| **Many agents at once** | Concurrent agents cannot overspend: budget decisions per mandate are serialised, across server processes. |
| **Any agent, same rules** | Connect Claude, ChatGPT or your own agent over **MCP** with a revocable link. |
| **Notifications** | A Notifications page, live pop-ups, and per-workspace alerts to **Telegram** (approve from the message), Slack, Discord or **Zapier**. |
| **Audit rule by rule** | **Insights** (AG Studio) and an **AG Grid** decision explorer: every decision a row, the 7 rules as columns. |
| **Seller check** | Sellers verify each agent payment with public keys alone, including PayPal's own record of the capture. |
| **Follow-through** | Tracking is added to the PayPal transaction; a lost parcel gets a drafted dispute carrying the AP2 evidence. |
| **Tamper evidence** | Every decision is Ed25519-signed and hash-chained. Edit any row and Verify names it. |
| **Kill switch** | Pause or revoke the mandate or any one assistant, from the app or a Zap. |
| **Private workspaces** | Each browser gets its own workspace; sign out ends it (agents paused, PayPal disconnected, assistants cut off). |

</details>

## See it working

Every screenshot below is from the live app.

![Mandate landing page](docs/screenshots/landing.jpg)

### 1 · It stops what you didn't approve

| A review page with a note planted for AI agents… | …a compromised agent obeys it, and the gate blocks the payment |
| :---: | :---: |
| ![Planted instruction on a web page](docs/screenshots/planted-page.jpg) | ![Gift card blocked](docs/screenshots/hijack-blocked.jpg) |

| "How it decided": stopped at *Request came from* | Every decision, rule by rule (AG Grid) |
| :---: | :---: |
| ![How it decided](docs/screenshots/how-it-decided.jpg) | ![Decision explorer](docs/screenshots/decision-explorer.jpg) |

### 2 · It pays what you did approve

| Rules in one sentence, checked and signed as an AP2 Intent Mandate |
| :---: |
| ![Sign your rules](docs/screenshots/sign-rules.jpg) |

| Inside the rules: paid instantly from PayPal Vault | Over a limit: the agent asks |
| :---: | :---: |
| ![Paid instantly](docs/screenshots/paid-instantly.jpg) | ![Asks you](docs/screenshots/asks-you.jpg) |

| Notifications and alert channels | One-tap approvals in Telegram |
| :---: | :---: |
| ![Notifications](docs/screenshots/notifications.jpg) | ![Telegram alerts](docs/screenshots/telegram.jpg) |

| Scheduled buys (Bryntum Calendar) | Insights (AG Studio) |
| :---: | :---: |
| ![Schedule](docs/screenshots/schedule.jpg) | ![Insights](docs/screenshots/insights.jpg) |

### 3 · The seller gets proof

| AP2 v0.2 checks before shipping | Edit one record, and the chain names it |
| :---: | :---: |
| ![Seller check](docs/screenshots/seller-check.jpg) | ![Tamper evident](docs/screenshots/tamper-evident.jpg) |

## How it works

**The AI proposes. Plain code decides. Only then does PayPal move money.**

```mermaid
flowchart LR
    U(["👤 You"]) -->|one sentence| R["Rules you check<br/>and sign<br/><i>AP2 Intent Mandate</i>"]
    subgraph Agents ["Any agent (untrusted)"]
        A1["Mandate agent<br/><i>Meta Muse Spark</i>"]
        A2["Claude · ChatGPT ·<br/>any MCP client"]
    end
    W["🌐 Web pages<br/><i>KERNEL · tagged untrusted</i>"] -.->|read, never obeyed| A1
    A1 & A2 -->|propose| M["Merchant prices<br/>and signs checkout"]
    R --> G
    M --> G{"🛡️ Policy gate<br/>7 rules · fails closed"}
    G -->|allow| P["Single-use permit"]
    G -->|ask| H(["You approve<br/><i>app · passkey · Telegram</i>"])
    G -->|block| X["⛔ Nothing paid"]
    H -->|approved| P
    P --> E["Executor<br/><i>the only code that holds PayPal</i>"]
    E --> PP["💳 PayPal<br/>Agent Toolkit · Vault · Orders v2"]
    PP --> RC["Signed receipts<br/><i>hash-chained log</i>"]
    RC --> S(["🏪 Seller verifies<br/>with public keys"])
```

Explore every step interactively in the **[Mandate Map](https://mandate-e13m.onrender.com/how-it-works)**: click any card for the details.

![The Mandate Map](docs/screenshots/mandate-map.jpg)

### The seven rules

Every purchase meets the same rules, in order. The first that fails decides.

| # | Rule | Passes when |
| --- | --- | --- |
| 1 | **Mandate** | Signed, active, not paused or revoked, and identical to what you signed |
| 2 | **Request came from** | Your task, not text on a web page or product page |
| 3 | **Category** | One you allowed |
| 4 | **Seller** | Allowed by your rules (optionally verified sellers only, never a blocked one) |
| 5 | **Item limit** | Under your per-order cap; above it, the agent **asks** |
| 6 | **Market price** | Within your fair-price limit against the market median (or asks / blocks / allows as you signed) |
| 7 | **Budget** | Fits what's left this period, counting money already held |

### A purchase, step by step

```mermaid
sequenceDiagram
    autonumber
    participant Ag as Agent
    participant Me as Merchant
    participant Ga as Policy gate
    participant Ex as Executor
    participant PP as PayPal
    participant Lo as Signed log
    participant Se as Seller
    Ag->>Me: propose item
    Me-->>Ag: signed checkout (ES256)
    Ag->>Ga: purchase + provenance
    Ga->>Ga: 7 rules under a per-mandate lock
    alt allowed
        Ga->>Lo: decision receipt
        Ga->>Ex: single-use permit (5 min, exact order digest)
        Ex->>PP: create + capture (Vault wallet or buyer approval)
        PP-->>Ex: captured
        Ex->>Lo: payment receipt + AP2 receipts
    else over a limit
        Ga->>Lo: ask receipt
        Note over Ga: waits for your signed approval
    else blocked
        Ga->>Lo: block receipt (nothing paid)
    end
    Se->>Lo: verify with public keys + PayPal's own order record
```

<details>
<summary><b>Trust boundaries</b></summary>

| Component | Trusted for | Not trusted for |
| --- | --- | --- |
| **Agent** (any model, any vendor) | Finding products and proposing purchases | Prices, categories, seller status, or anything that moves money. Its tools are search, read and propose only; a build-time architecture test fails if agent code imports payment code. |
| **Web and product pages** | Nothing | Text from pages is tracked as untrusted; a purchase that only untrusted text suggested is blocked. |
| **Merchant** | Its own prices and checkout, which it signs | Its own legitimacy: seller status comes from Mandate's registry. |
| **Policy gate** (`lib/gate/evaluate.ts`) | The decision | Pure, deterministic, fails closed. If the rules on file differ from what you signed, everything is blocked. |
| **Executor** | Moving money | It pays only for a stored, signed, unexpired, unused permit whose digest matches the exact order. |
| **You** | Approvals | With a passkey, approvals need your device's signature over the exact cart. |
| **Verifier** (seller, PayPal, reviewer) | Checking | Needs only the published public keys. |

</details>

<details>
<summary><b>Money safety</b></summary>

- **No overspend under concurrency.** The budget check and the money reservation run under a per-mandate lock (a Postgres advisory lock when several server processes share a database). Spent and held money are read in one snapshot.
- **Money in flight stays held.** A permit holds its amount from issue until the payment settles. Settling records the payment and releases the permit in one statement, so money is never counted twice or missed.
- **Failures fail safe.** If PayPal never created an order, the hold is released. If an order exists but capture failed, the money stays held and the record says it needs reconciling.
- **Signed rules are never silently skipped.** With no market reference price, the fair-price rule asks you, blocks, or allows, exactly as you signed.
- **Permits** are signed over the order digest, expire in 5 minutes and are consumed atomically.
- **The receipt chain never forks.** If two processes write at once, the second re-reads the head and signs at the next position.

</details>

<details>
<summary><b>AP2 v0.2</b></summary>

Every purchase carries mandates in the current [AP2 specification](https://github.com/google-agentic-commerce/AP2):

- **When you sign your rules**, Mandate (as AP2 "Trusted Agent Provider") issues an open Checkout Mandate and an open Payment Mandate as SD-JWTs (ES256), with the standard constraints `payment.amount_range`, `payment.budget` with `payment.agent_recurrence`, and `payment.reference`. Both delegate (`cnf`) to Mandate's agent key.
- **On each in-policy purchase** the merchant signs the checkout (a UCP checkout object, ES256 JWT) and the agent closes both mandates with key-binding hops bound to that checkout's hash. **Purchases you approve** are closed with your key instead (human present).
- **With a passkey**, your device also signs a WebAuthn challenge derived from the approval and the merchant-signed cart; verifiers recompute it from the checkout, so the signature covers what was bought.
- **After PayPal captures**, the merchant and Mandate's payment gateway issue signed checkout and payment receipts.
- **Verification** follows the spec's dispute rules: `GET /api/ap2/orders/{paypalOrderId}` returns the evidence pack and verdict; `GET /api/ap2/jwks` publishes the keys.

Rules that depend on live data (verified or blocked sellers) or have no standard AP2 constraint (categories, fair price, untrusted-content origin) are enforced by Mandate's gate before anything is signed.

Interoperability is tested against **Google's AP2 reference SDK** (pinned in CI) in both directions. The original Mandate v1 credentials (Ed25519 JWS: Intent, Cart and Payment Mandates, with the payment fingerprint on the PayPal order) are still issued and verified alongside.

</details>

## Built with PayPal and AI

| Tool | What it does in Mandate |
| --- | --- |
| **PayPal Agent Toolkit** (`@paypal/agent-toolkit`) | `create_order`, `pay_order`, `get_order`, shipment tracking and `list_disputes`. Called only by the executor and fulfilment, never handed to a model. |
| **PayPal Vault (REST v3) + Orders v2** | "Connect PayPal once": a setup token the buyer approves, exchanged for a payment token. In-rules purchases are then created and captured with `payment_source.paypal.vault_id`, with no redirect. Disconnect deletes the token at PayPal. |
| **PayPal Webhooks** | Verified with `verify-webhook-signature`. `CHECKOUT.ORDER.APPROVED` captures orders whose buyer never returned (tested live: captured ~5 s after approval with the tab closed); `CUSTOMER.DISPUTE.*` links disputes to orders. |
| **PayPal Server SDK** (`@paypal/paypal-server-sdk`, generated by APIMatic) | `OrdersController.getOrder` in the seller check: PayPal's own order record must show the exact signed amount, captured, before a seller ships. Fails closed. |
| **Meta Muse Spark** (Meta Model API) | Drives the shopping agent through tool use, reads plain-English rules into a policy (validated by a strict schema), and drafts dispute statements. Claude (Anthropic API) is supported as an alternative through the same client. |
| **AP2 v0.2** + Google's reference SDK | Signed intent, checkout and payment mandates and receipts; interoperability tests. |
| **Model Context Protocol** | Mandate is an MCP server (Streamable HTTP) so any agent can shop through the same gate. |
| **WebAuthn passkeys** | Device-signed approvals over the exact cart (ES256). |

## Sponsor integrations

| Sponsor | How Mandate uses it |
| --- | --- |
| **AG Grid** + **AG Studio** | The decision explorer (the 7 rules as columns, quick views incl. "Hijack attempts", CSV), the editable receipts ledger (a live tamper test), the seller payments grid, and the Insights dashboard. |
| **Bryntum Calendar** | The Schedule page: scheduled buys and past purchases coloured by the gate's decision; drag to reschedule; **Run now**. |
| **Channel3** | Real product search beyond the demo store, and the market median of ~10 shops for every purchase (fair-price rule, product cards, "saved vs market"). |
| **KERNEL** | Cloud browsers for the agent's `read_web_page` tool: one browser per read, deleted afterwards; the text is tracked as untrusted. |
| **APIMatic** | The [API portal](https://mandate-e13m.onrender.com/docs), SDKs in **TypeScript, Python and C#** (`sdks/`), a Context Plugin for AI coding assistants, and spec validation. |
| **Zapier** | Alerts out (approval needed, blocked, paid, paused) per workspace or site-wide, and a kill switch in. |
| **Postman** | A collection that runs the whole buyer, seller and auditor story with 42 assertions (Newman in CI). |
| **Render** | Hosts the live app and its Postgres database (`render.yaml` blueprint). |
| **Astropods** | Hosts an outside shopping agent (`agents/astropods-shopper`) whose only tools are Mandate's MCP tools. |

Also: **Telegram Bot API** (approve or decline from the alert), Slack and Discord webhooks, Postgres.

## For developers

![API portal generated by APIMatic](docs/screenshots/api-portal.jpg)

### Verify any payment in one call

| Method | Path | Returns |
| --- | --- | --- |
| GET | `/api/verify/{paypalOrderId}` | Verdict for an agent payment: Mandate v1 checks, PayPal's own order record, and the AP2 v0.2 verdict |
| GET | `/api/ap2/orders/{paypalOrderId}` | AP2 evidence pack: signed checkout, mandate chains, receipts, budget context, passkey assertion, every check |
| GET | `/api/ap2/jwks` | ES256 public keys for everything Mandate signs |
| GET | `/api/seller?merchantId={id}` | A merchant's agent payments with their verdicts |
| GET | `/api/trust` | All public keys, v1 and AP2 |
| GET · POST | `/api/receipts` · `/api/receipts/verify` | The signed decision log, and verification of a copy you hold |

```ts
import { MandateApiClient, ServerEnvironment } from "mandate-api"; // sdks/typescript, generated by APIMatic

const mandate = new MandateApiClient({ serverEnvironment: ServerEnvironment.Production });
const verdict = await mandate.verification.verifyOrder({ paypalOrderId: "5O190127TN364715T" });
if (verdict.ok && verdict.ap2?.ok) ship(); // safe only when both chains verify with public keys
```

The full API is described in [`public/openapi.yaml`](public/openapi.yaml) (OpenAPI 3.1). SDKs live in [`sdks/`](sdks) (TypeScript, Python, C#); [`tests/sdk/apimatic-sdk.test.ts`](tests/sdk/apimatic-sdk.test.ts) drives the generated SDK against the real route handlers.

```bash
npx newman run postman/Mandate.postman_collection.json --env-var baseUrl=http://localhost:3000   # 42 assertions
npm run api:validate                     # APIMatic lint of public/openapi.yaml   (needs APIMATIC_API_KEY)
npm run sdk:generate -- python csharp    # regenerate SDKs (also java, php, ruby, go)
npm run docs:generate                    # rebuild the API portal into public/docs
```

### Connect your own AI assistant (MCP)

1. On the **Assistants** page, name it and press **Create connection URL** (shown once).
2. Claude Code: `claude mcp add --transport http mandate <URL>`. Other assistants: add a remote MCP server, or send `Authorization: Bearer <token>` to `/api/mcp`.
3. The assistant gets `get_mandate`, `search_products`, `get_product` and `buy`, all through the same gate. Revoke the connection or the mandate to cut it off.

<details>
<summary><b>Alerts, Zapier events and the kill switch</b></summary>

Each workspace connects its own channels on the Notifications page: **Telegram** (a one-time `t.me` link; approval alerts carry Approve and Decline buttons, refused when the workspace requires a passkey), **Slack** or **Discord** (the channel's webhook), or **Zapier** (a Catch Hook). The operator can also send every workspace's alerts to one Zap with `ZAPIER_HOOK_URL`.

| `event` | When |
| --- | --- |
| `approval.needed` | A purchase is over a limit and waits for you |
| `purchase.blocked` | The gate blocked a purchase (`rule` says which) |
| `purchase.paid` | A payment went through (`link` is its public verdict) |
| `payment.failed` | PayPal declined or the buyer cancelled |
| `mandate.status_changed` | The mandate was paused, resumed or revoked |

With `AUTOMATION_SECRET` set, a Zap can pause, resume or revoke spending (never approve or raise a limit):

```bash
curl -X POST $MANDATE/api/automation/kill-switch \
  -H "Authorization: Bearer $AUTOMATION_SECRET" -H "content-type: application/json" \
  -d '{"action":"pause"}'
```

</details>

<details>
<summary><b>Reading the web safely (KERNEL)</b></summary>

With `KERNEL_API_KEY` set, the agent's `read_web_page` tool opens the page in a [KERNEL](https://kernel.sh) cloud browser, created for one read and deleted afterwards. Everything it returns is untrusted: words that appear only on the page, never in your task, taint any product found with them, so the gate blocks a purchase that only the page asked for. Try it with `/demo/deals`, a review page served by the app with a planted "note to AI shopping agents". Without a key, the agent can read only the app's own `/demo` pages.

</details>

## Run it yourself

### One click

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/othnielObasi/mandate-paypal)

Render reads `render.yaml`, builds the app and gives it a public URL. Leave the keys blank for the offline demo, or add your own sandbox and API keys.

### Locally

Requires Node 20+.

```bash
git clone https://github.com/othnielObasi/mandate-paypal && cd mandate-paypal
npm install
npm run dev          # http://localhost:3000  ·  landing /, app /app, seller /seller, docs /developers
```

With no environment variables it runs fully offline (simulated PayPal and an offline planner, clearly labelled). For real services, copy `.env.example` to `.env.local`:

| Variable | Enables |
| --- | --- |
| `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET` | A PayPal **sandbox** app (Agent Toolkit, Vault, Orders) |
| `PAYPAL_WEBHOOK_ID` | Verified webhooks at `/api/paypal/webhooks` |
| `MODEL_API_KEY` or `ANTHROPIC_API_KEY` | Meta Muse Spark or Claude for the agent and rules reader (`MANDATE_LLM=meta\|claude` picks one) |
| `CHANNEL3_API_KEY` | Real products and market prices |
| `KERNEL_API_KEY` | Reading any public web page in a cloud browser |
| `TELEGRAM_BOT_TOKEN` | Telegram alerts (webhook at `/api/telegram/webhook`) |
| `ZAPIER_HOOK_URL`, `AUTOMATION_SECRET` | Site-wide Zapier alerts and the kill switch |
| `DATABASE_URL`, `MANDATE_SIGNING_KEY` | Persistence across restarts and multiple instances |
| `MANDATE_SCHEDULER=off` | Stops scheduled buys running on that instance |

<details>
<summary><b>What is real and what is simulated</b></summary>

| Part | With keys set | Without keys (offline demo) |
| --- | --- | --- |
| Payments | **PayPal sandbox**: Agent Toolkit with buyer approval, or the saved wallet (Vault) | Simulated PayPal and wallet, labelled in the UI |
| Agent and rules reader | **Muse Spark** (Meta Model API) or **Claude** | An offline planner |
| Market prices and real products | **Channel3** | Fixed reference prices; demo store only |
| Web pages the agent reads | **KERNEL** cloud browser | Only the app's own `/demo` pages |
| Parcels | Simulated carrier; tracking is added to the **real** PayPal transaction | Simulated carrier |
| Disputes | Drafted by Mandate; filed in PayPal's Resolution Center and linked back | Simulated |
| Signing, AP2, passkeys, gate, ledger | Real cryptography in every mode | Same |
| Production PayPal | Refused: the app will not start against production | — |

</details>

<details>
<summary><b>Standalone preview and demo video</b></summary>

- `npm run preview:html` builds `dist/mandate-preview.html`: the real pages and API handlers in one file that runs offline in a browser; `npm run preview:smoke` clicks through it with the network blocked.
- [`video/`](video) holds the pipeline that records the live app and renders the demo video (see [`video/README.md`](video/README.md)).

</details>

## Tests and quality

Built test-first.

```bash
npm test             # unit and integration tests (Vitest)
npm run test:e2e     # Playwright: every journey, phone width, a real MCP client, a virtual passkey,
                     # and an axe WCAG 2.1 AA scan in light and dark mode
npm run typecheck
```

**525 unit and integration tests passing** (21 more run with `TEST_DATABASE_URL` and `AP2_PYTHON` set: real Postgres and Google's Python AP2 SDK) and **24 end-to-end tests**, plus the 42-assertion Postman run in CI.

| Area | What the tests prove |
| --- | --- |
| Policy gate | Every rule; fails closed; property tests: an `allow` never breaks a limit, an approval never overrides a hard rule |
| Budget under concurrency | Agents buying at once, in one process and across two server processes on real Postgres, never exceed the budget |
| Money lifecycle | Money held while a payment is in flight; released when no order was created; kept when capture may have happened |
| AP2 v0.2 | ES256 and SD-JWT chains; constraints; tampering caught; interop with Google's reference SDK in both directions |
| Passkeys | The device must sign this exact cart; wrong origin, key, cart or missing user verification are refused |
| Seller check | Verdicts from public keys only; PayPal's own order record must match |
| MCP server | Official SDK client end to end; revoked connections refused; sessions bound to connections |
| Architecture | Agent code can never import payment code |

Safety checks are **mutation-tested**: removing any guard (permit consumption, signed-limit check, seller status, provenance tainting, webhook signatures, MCP revocation, market-price maths, the budget lock, in-flight holds, the receipt-chain retry, and more) makes the suite fail.

## Project structure

```
app/                   Next.js pages and API routes
  app/                 the signed-in app: home, orders, schedule, insights, notifications, receipts
  api/                 REST + MCP endpoints (agent, ap2, verify, paypal, wallet, alerts, schedules, …)
  how-it-works/        the Mandate Map
  developers/ seller/  developer docs page and the seller check
lib/
  gate/                the pure policy gate (7 rules)
  core/                governor (decisions, permits) and executor (the only PayPal caller)
  paypal/              Agent Toolkit, Vault, webhooks, Server SDK order records
  ap2/ ap2v2/          Mandate v1 credentials and AP2 v0.2 mandates and receipts
  agent/ web/          agent runtime and untrusted web reading (KERNEL)
  merchant/ market/    demo store, Channel3 products and market prices
  alerts/ schedule/    Telegram/Slack/Discord/Zapier alerts and scheduled buys
  mcp/ passkey/ db/    MCP server, WebAuthn approvals, Postgres and in-memory stores
tests/ e2e/            Vitest suites and Playwright journeys
sdks/                  APIMatic-generated TypeScript, Python and C# SDKs
apimatic/src/          API portal and Context Plugin configuration
public/docs/           the generated API portal (served at /docs)
postman/               the Postman collection
agents/                an outside agent hosted on Astropods
preview/               the offline single-file preview
docs/                  README screenshots and the judges' brief
video/                 demo video pipeline
```

## Roadmap

**Shipped**
- [x] Plain-English rules → signed AP2 v0.2 mandates
- [x] Seven-rule deterministic gate with untrusted-content provenance
- [x] PayPal Agent Toolkit, Vault (connect once), webhooks and Server SDK verification
- [x] Passkey approvals, Telegram one-tap approvals, Slack, Discord and Zapier alerts
- [x] Seller verification with public keys, AP2 evidence packs, PDF receipts
- [x] Any agent via MCP; scheduled buys; Insights and decision explorer

**Next**
- [ ] User-held keys for standing rules (passkey-signed mandates, not only approvals)
- [ ] Background reconciliation of payments whose capture is uncertain
- [ ] Household and team mandates: shared budgets, per-person limits and approvers
- [ ] Per-category budgets, delivery windows and preferred sellers
- [ ] Accounts and persistent MCP sessions beyond a browser workspace

**Later**
- [ ] Live PayPal payments with a pilot group
- [ ] A merchant plugin that verifies the mandate automatically at checkout
- [ ] Merchant onboarding with key rotation and revocation
- [ ] External anchoring of the receipt chain (tamper-proof, not only tamper-evident)
- [ ] A full adversarial evaluation of the prompt-injection defence

## Limitations

- **Sandbox only.** No real money moves, and the app refuses PayPal production.
- **Key custody.** Approvals can be signed by your passkey, but standing rules are signed by a server-held key (Mandate as AP2 Trusted Agent Provider). Merchant keys are demo keys.
- **Merchant identity.** Seller verification uses a demo registry; production needs merchant onboarding.
- **Reconciliation.** Uncertain captures are held and flagged, but no background job settles them yet.
- **Tamper-evident, not tamper-proof.** An operator holding the signing key could rewrite the whole chain; external anchoring would close that.
- **Prompt-injection defence** is provenance-based and tested against the scenarios here, not a full adversarial evaluation.
- PayPal has no buyer-side dispute API, so drafted claims are filed in the Resolution Center and linked back.
- The Agent Toolkit's `create_order` accepts USD only and has no Vault support, so saved-wallet payments use PayPal's REST API directly.
- Channel3 products are listings, never verified sellers; a sandbox checkout pays Mandate's sandbox merchant.
- Workspaces belong to a browser (a cookie); MCP sessions are kept in memory.

## Licence

[MIT](LICENSE). Third-party assets are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
