# Reference

> Source: [MandateApiClient](src/client.ts)

## Verification

> Source: [Verification](src/resources/verification.ts)

<details>
<summary><code>getAp2Evidence(request: Verification.GetAp2EvidenceRequest, options?: RequestOptions): ApiPromise&lt;Ap2Verdict, Verification.GetAp2EvidenceError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

The merchant-signed checkout JWT, the Checkout and Payment Mandate chains (SD-JWT, ES256),
the checkout and payment receipts, budget context, the passkey assertion if the buyer approved
on their device, and every check with its result. Verify independently with `/api/ap2/jwks`.


</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.verification.getAp2Evidence({ paypalOrderId: "5O190127TN364715T" });
  // TODO: Handle 'response' of type Ap2Verdict
} catch (err) {
  // TODO: Handle 'err' of type Verification.GetAp2EvidenceError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.verification.getAp2Evidence({ paypalOrderId: "5O190127TN364715T" }).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type Ap2Verdict
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>paypalOrderId</code> | <code>string</code> | PayPal order ID (sandbox), or `SIM-…` in offline mode. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.verification.getAp2Evidence(request)`

- **OnSuccess**: <code>[Ap2Verdict](src/models/ap2-verdict.ts)</code>
- **OnError**: throws <code>[Verification.GetAp2EvidenceError](src/resources/verification.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.verification.getAp2Evidence(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;Ap2Verdict, Verification.GetAp2EvidenceError&gt;</code>, with `result.value` of type <code>[Ap2Verdict](src/models/ap2-verdict.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[MandateApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>listSellerPayments(request?: Verification.ListSellerPaymentsRequest, options?: RequestOptions): ApiPromise&lt;SellerPayment[], ApiError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Every agent payment to a merchant, newest first, each with its Mandate v1 verdict and AP2 v0.2
result. A seller's queue of "safe to fulfil" and "don't ship" orders.


</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.verification.listSellerPayments({ merchantId: "acme-supplies" });
  // TODO: Handle 'response' of type SellerPayment[]
} catch (err) {
  // TODO: Handle 'err' of type ApiError, where 'err.payload' is always the Undeclared arm
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.verification.listSellerPayments({ merchantId: "acme-supplies" }).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type SellerPayment[]
} else {
  // TODO: Handle 'result', where 'result.payload' is always the Undeclared arm
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>merchantId?</code> | <code>string</code> | Only this merchant's payments. Omit for all. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.verification.listSellerPayments(request)`

- **OnSuccess**: <code>[SellerPayment](src/models/seller-payment.ts)[]</code>
- **OnError**: throws <code>[ApiError](src/core/api-error.ts)</code>, with `err.payload` always the <code>[Undeclared](src/core/api-error.ts)</code> arm

**As ApiResult**: `await client.verification.listSellerPayments(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;SellerPayment[], ApiError&gt;</code>, with `result.value` of type <code>[SellerPayment](src/models/seller-payment.ts)[]</code>
- **OnError**: `result.payload` always the <code>[Undeclared](src/core/api-error.ts)</code> arm, with `result.message`

**Thrown**: <code>[MandateApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>verifyChain(request: Verification.VerifyChainRequestParams, options?: RequestOptions): ApiPromise&lt;ChainVerdict, Verification.VerifyChainError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Checks an Intent, Cart and Payment Mandate chain against the published keys.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.verification.verifyChain({ body: { intent: {}, cart: {}, payment: {} } });
  // TODO: Handle 'response' of type ChainVerdict
} catch (err) {
  // TODO: Handle 'err' of type Verification.VerifyChainError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.verification.verifyChain({
  body: { intent: {}, cart: {}, payment: {} },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type ChainVerdict
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>body</code> | <code>[VerifyChainRequest](src/models/verify-chain-request.ts)</code> | - |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.verification.verifyChain(request)`

- **OnSuccess**: <code>[ChainVerdict](src/models/chain-verdict.ts)</code>
- **OnError**: throws <code>[Verification.VerifyChainError](src/resources/verification.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.verification.verifyChain(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;ChainVerdict, Verification.VerifyChainError&gt;</code>, with `result.value` of type <code>[ChainVerdict](src/models/chain-verdict.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[MandateApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>verifyOrder(request: Verification.VerifyOrderRequest, options?: RequestOptions): ApiPromise&lt;OrderVerdict, Verification.VerifyOrderError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Is this PayPal order backed by a mandate the buyer signed? Returns the Mandate v1 checks
(Intent, Cart and Payment Mandates, Ed25519), the `paypal_order_record` check (PayPal's own
order record, read with the PayPal Server SDK, shows the signed amount captured), and the
AP2 v0.2 verdict in `ap2`.
Fulfil only when `ok` and `ap2.ok` are both true.


</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.verification.verifyOrder({ paypalOrderId: "5O190127TN364715T" });
  // TODO: Handle 'response' of type OrderVerdict
} catch (err) {
  // TODO: Handle 'err' of type Verification.VerifyOrderError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.verification.verifyOrder({ paypalOrderId: "5O190127TN364715T" }).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type OrderVerdict
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>paypalOrderId</code> | <code>string</code> | PayPal order ID (sandbox), or `SIM-…` in offline mode. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.verification.verifyOrder(request)`

- **OnSuccess**: <code>[OrderVerdict](src/models/order-verdict.ts)</code>
- **OnError**: throws <code>[Verification.VerifyOrderError](src/resources/verification.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.verification.verifyOrder(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;OrderVerdict, Verification.VerifyOrderError&gt;</code>, with `result.value` of type <code>[OrderVerdict](src/models/order-verdict.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[MandateApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

## Keys

> Source: [Keys](src/resources/keys.ts)

<details>
<summary><code>getAp2Jwks(options?: RequestOptions): ApiPromise&lt;Jwks, ApiError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Provider, agent, payment gateway, merchants and users. Look keys up by `kid`.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.keys.getAp2Jwks();
  // TODO: Handle 'response' of type Jwks
} catch (err) {
  // TODO: Handle 'err' of type ApiError, where 'err.payload' is always the Undeclared arm
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.keys.getAp2Jwks().asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type Jwks
} else {
  // TODO: Handle 'result', where 'result.payload' is always the Undeclared arm
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.keys.getAp2Jwks()`

- **OnSuccess**: <code>[Jwks](src/models/jwks.ts)</code>
- **OnError**: throws <code>[ApiError](src/core/api-error.ts)</code>, with `err.payload` always the <code>[Undeclared](src/core/api-error.ts)</code> arm

**As ApiResult**: `await client.keys.getAp2Jwks().asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;Jwks, ApiError&gt;</code>, with `result.value` of type <code>[Jwks](src/models/jwks.ts)</code>
- **OnError**: `result.payload` always the <code>[Undeclared](src/core/api-error.ts)</code> arm, with `result.message`

**Thrown**: <code>[MandateApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>getReceiptPublicKey(options?: RequestOptions): ApiPromise&lt;undefined, ApiError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

The PEM public key for checking the `signature` on every receipt in the decision log.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  await client.keys.getReceiptPublicKey();
} catch (err) {
  // TODO: Handle 'err' of type ApiError, where 'err.payload' is always the Undeclared arm
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.keys.getReceiptPublicKey().asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: The call succeeded and resolves to no body
} else {
  // TODO: Handle 'result', where 'result.payload' is always the Undeclared arm
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.keys.getReceiptPublicKey()`

- **OnSuccess**: <code>undefined</code>
- **OnError**: throws <code>[ApiError](src/core/api-error.ts)</code>, with `err.payload` always the <code>[Undeclared](src/core/api-error.ts)</code> arm

**As ApiResult**: `await client.keys.getReceiptPublicKey().asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;undefined, ApiError&gt;</code>, with `result.value` of type <code>undefined</code>
- **OnError**: `result.payload` always the <code>[Undeclared](src/core/api-error.ts)</code> arm, with `result.message`

**Thrown**: <code>[MandateApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>getTrust(options?: RequestOptions): ApiPromise&lt;Trust, ApiError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

The full trust bundle in one call: users' and merchants' Ed25519 keys (with each merchant's
verified status), the platform key, and the AP2 JWKS. Cache it to verify payments offline.


</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.keys.getTrust();
  // TODO: Handle 'response' of type Trust
} catch (err) {
  // TODO: Handle 'err' of type ApiError, where 'err.payload' is always the Undeclared arm
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.keys.getTrust().asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type Trust
} else {
  // TODO: Handle 'result', where 'result.payload' is always the Undeclared arm
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.keys.getTrust()`

- **OnSuccess**: <code>[Trust](src/models/trust.ts)</code>
- **OnError**: throws <code>[ApiError](src/core/api-error.ts)</code>, with `err.payload` always the <code>[Undeclared](src/core/api-error.ts)</code> arm

**As ApiResult**: `await client.keys.getTrust().asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;Trust, ApiError&gt;</code>, with `result.value` of type <code>[Trust](src/models/trust.ts)</code>
- **OnError**: `result.payload` always the <code>[Undeclared](src/core/api-error.ts)</code> arm, with `result.message`

**Thrown**: <code>[MandateApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

## Receipts

> Source: [Receipts](src/resources/receipts.ts)

<details>
<summary><code>listReceipts(request?: Receipts.ListReceiptsRequest, options?: RequestOptions): ApiPromise&lt;Receipt[], ApiError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Every decision Mandate made, in order. Each receipt carries the hash of the one before it and an
Ed25519 signature, so any edit, insertion or deletion breaks the chain.


</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.receipts.listReceipts();
  // TODO: Handle 'response' of type Receipt[]
} catch (err) {
  // TODO: Handle 'err' of type ApiError, where 'err.payload' is always the Undeclared arm
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.receipts.listReceipts().asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type Receipt[]
} else {
  // TODO: Handle 'result', where 'result.payload' is always the Undeclared arm
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>mandateId?</code> | <code>string</code> | Only this mandate's receipts. Omit for the whole log. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.receipts.listReceipts(request)`

- **OnSuccess**: <code>[Receipt](src/models/receipt.ts)[]</code>
- **OnError**: throws <code>[ApiError](src/core/api-error.ts)</code>, with `err.payload` always the <code>[Undeclared](src/core/api-error.ts)</code> arm

**As ApiResult**: `await client.receipts.listReceipts(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;Receipt[], ApiError&gt;</code>, with `result.value` of type <code>[Receipt](src/models/receipt.ts)[]</code>
- **OnError**: `result.payload` always the <code>[Undeclared](src/core/api-error.ts)</code> arm, with `result.message`

**Thrown**: <code>[MandateApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>verifyLogCopy(request: Receipts.VerifyLogCopyRequest, options?: RequestOptions): ApiPromise&lt;ChainResult, Receipts.VerifyLogCopyError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Names the first altered entry (`brokenAt`) and why.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.receipts.verifyLogCopy({
    body: {
      receipts: [
        {
          seq: 1,
          type: "some example string",
          summary: "some example string",
          payloadHash: "some example string",
          createdAt: new Date(Date.UTC(2024, 0, 15, 9, 30, 0)),
          prevHash: "some example string",
          hash: "some example string",
          signature: "some example string",
        },
      ],
    },
  });
  // TODO: Handle 'response' of type ChainResult
} catch (err) {
  // TODO: Handle 'err' of type Receipts.VerifyLogCopyError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.receipts.verifyLogCopy({
  body: {
    receipts: [
      {
        seq: 1,
        type: "some example string",
        summary: "some example string",
        payloadHash: "some example string",
        createdAt: new Date(Date.UTC(2024, 0, 15, 9, 30, 0)),
        prevHash: "some example string",
        hash: "some example string",
        signature: "some example string",
      },
    ],
  },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type ChainResult
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>body</code> | <code>[VerifyLogRequest](src/models/verify-log-request.ts)</code> | - |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.receipts.verifyLogCopy(request)`

- **OnSuccess**: <code>[ChainResult](src/models/unions/chain-result.ts)</code>
- **OnError**: throws <code>[Receipts.VerifyLogCopyError](src/resources/receipts.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.receipts.verifyLogCopy(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;ChainResult, Receipts.VerifyLogCopyError&gt;</code>, with `result.value` of type <code>[ChainResult](src/models/unions/chain-result.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[MandateApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>verifyServerLog(options?: RequestOptions): ApiPromise&lt;ChainResult, ApiError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Re-checks every hash link and signature in the server's decision log.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.receipts.verifyServerLog();
  // TODO: Handle 'response' of type ChainResult
} catch (err) {
  // TODO: Handle 'err' of type ApiError, where 'err.payload' is always the Undeclared arm
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.receipts.verifyServerLog().asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type ChainResult
} else {
  // TODO: Handle 'result', where 'result.payload' is always the Undeclared arm
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.receipts.verifyServerLog()`

- **OnSuccess**: <code>[ChainResult](src/models/unions/chain-result.ts)</code>
- **OnError**: throws <code>[ApiError](src/core/api-error.ts)</code>, with `err.payload` always the <code>[Undeclared](src/core/api-error.ts)</code> arm

**As ApiResult**: `await client.receipts.verifyServerLog().asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;ChainResult, ApiError&gt;</code>, with `result.value` of type <code>[ChainResult](src/models/unions/chain-result.ts)</code>
- **OnError**: `result.payload` always the <code>[Undeclared](src/core/api-error.ts)</code> arm, with `result.message`

**Thrown**: <code>[MandateApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

## Demo

> Source: [Demo](src/resources/demo.ts)

<details>
<summary><code>createMandate(request: Demo.CreateMandateRequestParams, options?: RequestOptions): ApiPromise&lt;Mandate, Demo.CreateMandateError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

With only `text`, the rules reader (the configured model, or the offline reader) turns the
sentence into a policy and Mandate signs it. With `policy`, the rules the user reviewed are
validated and signed. Rate limited when the model is called.


</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.demo.createMandate({
    body: {
      text: "Household basics, up to $80 a month, nothing over $25, never more than 10% above market price, verified sellers only",
    },
  });
  // TODO: Handle 'response' of type Mandate
} catch (err) {
  // TODO: Handle 'err' of type Demo.CreateMandateError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.demo.createMandate({
  body: {
    text: "Household basics, up to $80 a month, nothing over $25, never more than 10% above market price, verified sellers only",
  },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type Mandate
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>body</code> | <code>[CreateMandateRequest](src/models/create-mandate-request.ts)</code> | - |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.demo.createMandate(request)`

- **OnSuccess**: <code>[Mandate](src/models/mandate.ts)</code>
- **OnError**: throws <code>[Demo.CreateMandateError](src/resources/demo.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.demo.createMandate(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;Mandate, Demo.CreateMandateError&gt;</code>, with `result.value` of type <code>[Mandate](src/models/mandate.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[MandateApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>decideApproval(request: Demo.DecideApprovalRequestParams, options?: RequestOptions): ApiPromise&lt;ProposeResult, Demo.DecideApprovalError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

If the user has a passkey, approving needs a WebAuthn assertion over this exact cart
(challenge from `GET /api/approvals/{id}/passkey`). Hard rules (category, seller, injected
instructions) can never be approved through.


</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.demo.decideApproval({
    id: "some example string",
    body: { choice: Choice.Approve },
  });
  // TODO: Handle 'response' of type ProposeResult
} catch (err) {
  // TODO: Handle 'err' of type Demo.DecideApprovalError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.demo.decideApproval({
  id: "some example string",
  body: { choice: Choice.Approve },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type ProposeResult
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id</code> | <code>string</code> | The approval ID from `listApprovals` or the agent run. |
| <code>body</code> | <code>[DecideApprovalRequest](src/models/decide-approval-request.ts)</code> | - |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.demo.decideApproval(request)`

- **OnSuccess**: <code>[ProposeResult](src/models/propose-result.ts)</code>
- **OnError**: throws <code>[Demo.DecideApprovalError](src/resources/demo.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.demo.decideApproval(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;ProposeResult, Demo.DecideApprovalError&gt;</code>, with `result.value` of type <code>[ProposeResult](src/models/propose-result.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[MandateApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>getHealth(options?: RequestOptions): ApiPromise&lt;Health, ApiError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Which integrations this server is running with: real PayPal sandbox or simulated payments, the
model behind the agent, where data is stored, and whether Zapier alerts and the kill switch are on.
Always sandbox-only.


</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.demo.getHealth();
  // TODO: Handle 'response' of type Health
} catch (err) {
  // TODO: Handle 'err' of type ApiError, where 'err.payload' is always the Undeclared arm
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.demo.getHealth().asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type Health
} else {
  // TODO: Handle 'result', where 'result.payload' is always the Undeclared arm
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.demo.getHealth()`

- **OnSuccess**: <code>[Health](src/models/health.ts)</code>
- **OnError**: throws <code>[ApiError](src/core/api-error.ts)</code>, with `err.payload` always the <code>[Undeclared](src/core/api-error.ts)</code> arm

**As ApiResult**: `await client.demo.getHealth().asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;Health, ApiError&gt;</code>, with `result.value` of type <code>[Health](src/models/health.ts)</code>
- **OnError**: `result.payload` always the <code>[Undeclared](src/core/api-error.ts)</code> arm, with `result.message`

**Thrown**: <code>[MandateApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>listApprovals(request?: Demo.ListApprovalsRequest, options?: RequestOptions): ApiPromise&lt;Approval[], ApiError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Purchases the gate sent to the user (over a soft limit), with when each request expires.

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.demo.listApprovals();
  // TODO: Handle 'response' of type Approval[]
} catch (err) {
  // TODO: Handle 'err' of type ApiError, where 'err.payload' is always the Undeclared arm
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.demo.listApprovals().asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type Approval[]
} else {
  // TODO: Handle 'result', where 'result.payload' is always the Undeclared arm
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>mandateId?</code> | <code>string</code> | Only this mandate's approvals. Omit for all. |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.demo.listApprovals(request)`

- **OnSuccess**: <code>[Approval](src/models/approval.ts)[]</code>
- **OnError**: throws <code>[ApiError](src/core/api-error.ts)</code>, with `err.payload` always the <code>[Undeclared](src/core/api-error.ts)</code> arm

**As ApiResult**: `await client.demo.listApprovals(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;Approval[], ApiError&gt;</code>, with `result.value` of type <code>[Approval](src/models/approval.ts)[]</code>
- **OnError**: `result.payload` always the <code>[Undeclared](src/core/api-error.ts)</code> arm, with `result.message`

**Thrown**: <code>[MandateApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>listMandates(options?: RequestOptions): ApiPromise&lt;Mandate[], ApiError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Every mandate the demo user has signed, with its rules and status (active, paused or revoked).

</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.demo.listMandates();
  // TODO: Handle 'response' of type Mandate[]
} catch (err) {
  // TODO: Handle 'err' of type ApiError, where 'err.payload' is always the Undeclared arm
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.demo.listMandates().asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type Mandate[]
} else {
  // TODO: Handle 'result', where 'result.payload' is always the Undeclared arm
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.demo.listMandates()`

- **OnSuccess**: <code>[Mandate](src/models/mandate.ts)[]</code>
- **OnError**: throws <code>[ApiError](src/core/api-error.ts)</code>, with `err.payload` always the <code>[Undeclared](src/core/api-error.ts)</code> arm

**As ApiResult**: `await client.demo.listMandates().asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;Mandate[], ApiError&gt;</code>, with `result.value` of type <code>[Mandate](src/models/mandate.ts)[]</code>
- **OnError**: `result.payload` always the <code>[Undeclared](src/core/api-error.ts)</code> arm, with `result.message`

**Thrown**: <code>[MandateApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>runAgent(request: Demo.RunAgentRequestParams, options?: RequestOptions): ApiPromise&lt;AgentRun, Demo.RunAgentError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

The agent can only search, read and propose. Each proposal goes through the policy gate, which
pays, asks the user, or blocks. With `stream: true` the response is NDJSON, one step per line.


</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.demo.runAgent({
    body: { mandateId: "{{mandateId}}", task: "Buy washing-up liquid and sponges" },
  });
  // TODO: Handle 'response' of type AgentRun
} catch (err) {
  // TODO: Handle 'err' of type Demo.RunAgentError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.demo.runAgent({
  body: { mandateId: "{{mandateId}}", task: "Buy washing-up liquid and sponges" },
}).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type AgentRun
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>body</code> | <code>[RunAgentRequest](src/models/run-agent-request.ts)</code> | - |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.demo.runAgent(request)`

- **OnSuccess**: <code>[AgentRun](src/models/agent-run.ts)</code>
- **OnError**: throws <code>[Demo.RunAgentError](src/resources/demo.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.demo.runAgent(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;AgentRun, Demo.RunAgentError&gt;</code>, with `result.value` of type <code>[AgentRun](src/models/agent-run.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[MandateApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

## Automation

> Source: [Automation](src/resources/automation.ts)

<details>
<summary><code>killSwitch(request: Automation.KillSwitchRequestParams, options?: RequestOptions): ApiPromise&lt;KillSwitchResult, Automation.KillSwitchError&gt;</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

For a Zap such as "text STOP to pause every agent". Without `mandateId` it acts on all of the
user's mandates. Logged in the signed decision log as "via automation".


</dd>
</dl>

### Direct Usage

<dl>
<dd>

```ts
try {
  const response = await client.automation.killSwitch({ body: { action: Action.Pause } });
  // TODO: Handle 'response' of type KillSwitchResult
} catch (err) {
  // TODO: Handle 'err' of type Automation.KillSwitchError, discriminated with 'err.payload.kind'
}
```

</dd>
</dl>

### Usage as ApiResult

<dl>
<dd>

```ts
const result = await client.automation.killSwitch({ body: { action: Action.Pause } }).asApiResult();
// TODO: Use 'result.status' and 'result.headers' to read the raw response status and headers
if (result.ok) {
  // TODO: Use 'result.value' of type KillSwitchResult
} else {
  // TODO: Handle 'result', discriminated with 'result.payload.kind'
}
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>body</code> | <code>[KillSwitchRequest](src/models/kill-switch-request.ts)</code> | - |

</dd>
</dl>

### Response

<dl>
<dd>

**Direct**: `await client.automation.killSwitch(request)`

- **OnSuccess**: <code>[KillSwitchResult](src/models/kill-switch-result.ts)</code>
- **OnError**: throws <code>[Automation.KillSwitchError](src/resources/automation.ts)</code>, with `err.payload` discriminated on `kind`

**As ApiResult**: `await client.automation.killSwitch(request).asApiResult()`

- **OnSuccess**: <code>[ApiResult](src/core/api-promise.ts)&lt;KillSwitchResult, Automation.KillSwitchError&gt;</code>, with `result.value` of type <code>[KillSwitchResult](src/models/kill-switch-result.ts)</code>
- **OnError**: `result.payload` discriminated on `kind`, with `result.message`

**Thrown**: <code>[MandateApiError](src/core/errors.ts)</code> on any operational failure — a caller abort and a programmer error stay outside the family and reach you raw

</dd>
</dl>

</dd>
</dl>

</details>

