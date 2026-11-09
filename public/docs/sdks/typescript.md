# TypeScript SDK (/docs/sdks/typescript)

[Download SDK](/docs/__downloads/sdk/typescript.zip)

## Intro [#intro]

The Mandate API SDK provides access to the Mandate API REST APIs.

Mandate is an authorisation layer for AI-agent payments on PayPal. Every agent payment carries
AP2 v0.2 mandates (the customer's signed limits, the merchant's signed checkout, the agent's closed
mandates) and signed receipts. The **Verification** endpoints let a seller, PayPal or a dispute
reviewer check a payment with public keys alone. The **Demo** endpoints drive the same flow the app
uses: sign rules, let the agent shop, approve over-limit purchases.

Sandbox only. No real money moves. Without keys the server runs fully offline with simulated
PayPal order IDs (`SIM-…`); with PayPal sandbox keys the IDs are real sandbox order IDs.

## Installation [#installation]

The SDK compiles to `dist/` before it can be referenced — run its `build` script once in the SDK folder, then add it to your project by path:

```bash
npm install <path-to-sdk>
```

## Quick Start [#quick-start]

Create one client and reuse it. Configure its behaviour through `ClientOptions`.

```ts
import { MandateApiClient, ServerEnvironment } from "mandate-api";

const client = new MandateApiClient({
  serverEnvironment: ServerEnvironment.Production,
  automationSecret: "YOUR_BEARER_TOKEN",
});
```

Nothing in `ClientOptions` is required — `new MandateApiClient()` compiles — and each option left out falls back to its default. `serverEnvironment` is spelled out above so the environment a call reaches is visible where the client is built rather than inherited silently.

### From CommonJS [#from-commonjs]

The package ships both dialects from a single entry, so `require` works with full types. In a TypeScript CommonJS file use the `import ... = require(...)` form — a plain destructuring `require` runs fine but gives you `any`.

```ts
import sdk = require("mandate-api");

const client = new sdk.MandateApiClient({
  serverEnvironment: sdk.ServerEnvironment.Production,
  automationSecret: "YOUR_BEARER_TOKEN",
});
```