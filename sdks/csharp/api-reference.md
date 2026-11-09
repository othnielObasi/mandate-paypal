# Reference

Every operation below is shown in its throwing form. On an error status it throws `ApiException<TError>` — the status code, headers, content type and the operation's error type, `RawError` (the raw body) when the spec declares none — and where an operation offers an `…AsResult` sibling, that sibling returns `ApiResult<TResponse, TError>` instead. A request that produces no usable response surfaces as `SdkConnectionException` or `SdkTimeoutException`, a body that does not match the documented response type as `ResponseDeserializationException`, and a required credential that is not configured, or one that cannot be applied, as `AuthSchemeException`; all of them derive from `SdkException` and name the failed call. See [README → Error Handling](README.md#error-handling).

> Source: [MandateApiClient](src/MandateApi/MandateApiClient.cs)

## Automation

> Source: [Automation](src/MandateApi/Api/Automation.cs)

<details>
<summary><code>Task&lt;KillSwitchResult&gt; KillSwitch(KillSwitchOperationRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default);</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

For a Zap such as "text STOP to pause every agent". Without `mandateId` it acts on all of the
user's mandates. Logged in the signed decision log as "via automation".

</dd>
</dl>

### Usage

<dl>
<dd>

```csharp
try
{
    var response = await client.Automation.KillSwitch(new KillSwitchOperationRequest
    {
        Body = new KillSwitchRequest { Action = ActionEnum.Pause },
    });
    // TODO: Handle 'response' of type KillSwitchResult
}
catch (ApiException<KillSwitchError> ex)
{
    if (ex.Error.TryGetError(out var error))
    {
        // TODO: Handle 'error' of type Error
    }
}
```

</dd>
</dl>

### Request

<dl>
<dd>

<code>[KillSwitchOperationRequest](src/MandateApi/Requests/Automation/KillSwitchOperationRequest.cs)</code>

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[KillSwitchResult](src/MandateApi/Models/KillSwitchResult.cs)</code>

**OnError**: <code>[ApiException](src/MandateApi/Core/Exceptions/ApiException.cs)&lt;[KillSwitchError](src/MandateApi/Errors/KillSwitchError.cs)&gt;</code>

</dd>
</dl>

</dd>
</dl>

</details>

## Demo

> Source: [Demo](src/MandateApi/Api/Demo.cs)

<details>
<summary><code>Task&lt;Mandate&gt; CreateMandate(CreateMandateOperationRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default);</code></summary>

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

### Usage

<dl>
<dd>

```csharp
try
{
    var response = await client.Demo.CreateMandate(new CreateMandateOperationRequest
    {
        Body = new CreateMandateRequest
        {
            Text = "Household basics, up to $80 a month, nothing over $25, never more than 10% above market price, verified sellers only",
        },
    });
    // TODO: Handle 'response' of type Mandate
}
catch (ApiException<CreateMandateError> ex)
{
    if (ex.Error.TryGetError(out var error))
    {
        // TODO: Handle 'error' of type Error
    }
}
```

</dd>
</dl>

### Request

<dl>
<dd>

<code>[CreateMandateOperationRequest](src/MandateApi/Requests/Demo/CreateMandateOperationRequest.cs)</code>

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[Mandate](src/MandateApi/Models/Mandate.cs)</code>

**OnError**: <code>[ApiException](src/MandateApi/Core/Exceptions/ApiException.cs)&lt;[CreateMandateError](src/MandateApi/Errors/CreateMandateError.cs)&gt;</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>Task&lt;ProposeResult&gt; DecideApproval(DecideApprovalOperationRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default);</code></summary>

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

### Usage

<dl>
<dd>

```csharp
try
{
    var response = await client.Demo.DecideApproval(new DecideApprovalOperationRequest
    {
        Id = "some example string",
        Body = new DecideApprovalRequest { Choice = Choice.Approve },
    });
    // TODO: Handle 'response' of type ProposeResult
}
catch (ApiException<DecideApprovalError> ex)
{
    if (ex.Error.TryGetError(out var error))
    {
        // TODO: Handle 'error' of type Error
    }
}
```

</dd>
</dl>

### Request

<dl>
<dd>

<code>[DecideApprovalOperationRequest](src/MandateApi/Requests/Demo/DecideApprovalOperationRequest.cs)</code>

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[ProposeResult](src/MandateApi/Models/ProposeResult.cs)</code>

**OnError**: <code>[ApiException](src/MandateApi/Core/Exceptions/ApiException.cs)&lt;[DecideApprovalError](src/MandateApi/Errors/DecideApprovalError.cs)&gt;</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>Task&lt;Health&gt; GetHealth(RequestOptions? requestOptions = null, CancellationToken cancellationToken = default);</code></summary>

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

### Usage

<dl>
<dd>

```csharp
try
{
    var response = await client.Demo.GetHealth();
    // TODO: Handle 'response' of type Health
}
catch (ApiException<RawError> ex)
{
    // TODO: Handle 'ex.Error' of type RawError
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[Health](src/MandateApi/Models/Health.cs)</code>

**OnError**: <code>[ApiException](src/MandateApi/Core/Exceptions/ApiException.cs)&lt;[RawError](src/MandateApi/Core/ErrorResponse/RawError.cs)&gt;</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>Task&lt;IReadOnlyList&lt;Approval&gt;&gt; ListApprovals(ListApprovalsRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default);</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Purchases the gate sent to the user (over a soft limit), with when each request expires.

</dd>
</dl>

### Usage

<dl>
<dd>

```csharp
try
{
    var response = await client.Demo.ListApprovals(new ListApprovalsRequest());
    // TODO: Handle 'response' of type IReadOnlyList<Approval>
}
catch (ApiException<RawError> ex)
{
    // TODO: Handle 'ex.Error' of type RawError
}
```

</dd>
</dl>

### Request

<dl>
<dd>

<code>[ListApprovalsRequest](src/MandateApi/Requests/Demo/ListApprovalsRequest.cs)</code>

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>IReadOnlyList&lt;[Approval](src/MandateApi/Models/Approval.cs)&gt;</code>

**OnError**: <code>[ApiException](src/MandateApi/Core/Exceptions/ApiException.cs)&lt;[RawError](src/MandateApi/Core/ErrorResponse/RawError.cs)&gt;</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>Task&lt;IReadOnlyList&lt;Mandate&gt;&gt; ListMandates(RequestOptions? requestOptions = null, CancellationToken cancellationToken = default);</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Every mandate the demo user has signed, with its rules and status (active, paused or revoked).

</dd>
</dl>

### Usage

<dl>
<dd>

```csharp
try
{
    var response = await client.Demo.ListMandates();
    // TODO: Handle 'response' of type IReadOnlyList<Mandate>
}
catch (ApiException<RawError> ex)
{
    // TODO: Handle 'ex.Error' of type RawError
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>IReadOnlyList&lt;[Mandate](src/MandateApi/Models/Mandate.cs)&gt;</code>

**OnError**: <code>[ApiException](src/MandateApi/Core/Exceptions/ApiException.cs)&lt;[RawError](src/MandateApi/Core/ErrorResponse/RawError.cs)&gt;</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>Task&lt;AgentRun&gt; RunAgent(RunAgentOperationRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default);</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

The agent can only search, read and propose. Each proposal goes through the policy gate, which
pays, asks the user, or blocks. With `stream: true` the response is NDJSON, one step per line.

</dd>
</dl>

### Usage

<dl>
<dd>

```csharp
try
{
    var response = await client.Demo.RunAgent(new RunAgentOperationRequest
    {
        Body = new RunAgentRequest { MandateId = "{{mandateId}}", Task = "Buy washing-up liquid and sponges" },
    });
    // TODO: Handle 'response' of type AgentRun
}
catch (ApiException<RunAgentError> ex)
{
    if (ex.Error.TryGetError(out var error))
    {
        // TODO: Handle 'error' of type Error
    }
}
```

</dd>
</dl>

### Request

<dl>
<dd>

<code>[RunAgentOperationRequest](src/MandateApi/Requests/Demo/RunAgentOperationRequest.cs)</code>

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[AgentRun](src/MandateApi/Models/AgentRun.cs)</code>

**OnError**: <code>[ApiException](src/MandateApi/Core/Exceptions/ApiException.cs)&lt;[RunAgentError](src/MandateApi/Errors/RunAgentError.cs)&gt;</code>

</dd>
</dl>

</dd>
</dl>

</details>

## Keys

> Source: [Keys](src/MandateApi/Api/Keys.cs)

<details>
<summary><code>Task&lt;Jwks&gt; GetAp2Jwks(RequestOptions? requestOptions = null, CancellationToken cancellationToken = default);</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Provider, agent, payment gateway, merchants and users. Look keys up by `kid`.

</dd>
</dl>

### Usage

<dl>
<dd>

```csharp
try
{
    var response = await client.Keys.GetAp2Jwks();
    // TODO: Handle 'response' of type Jwks
}
catch (ApiException<RawError> ex)
{
    // TODO: Handle 'ex.Error' of type RawError
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[Jwks](src/MandateApi/Models/Jwks.cs)</code>

**OnError**: <code>[ApiException](src/MandateApi/Core/Exceptions/ApiException.cs)&lt;[RawError](src/MandateApi/Core/ErrorResponse/RawError.cs)&gt;</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>Task GetReceiptPublicKey(RequestOptions? requestOptions = null, CancellationToken cancellationToken = default);</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

The PEM public key for checking the `signature` on every receipt in the decision log.

</dd>
</dl>

### Usage

<dl>
<dd>

```csharp
try
{
    await client.Keys.GetReceiptPublicKey();
}
catch (ApiException<RawError> ex)
{
    // TODO: Handle 'ex.Error' of type RawError
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: No content

**OnError**: <code>[ApiException](src/MandateApi/Core/Exceptions/ApiException.cs)&lt;[RawError](src/MandateApi/Core/ErrorResponse/RawError.cs)&gt;</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>Task&lt;Trust&gt; GetTrust(RequestOptions? requestOptions = null, CancellationToken cancellationToken = default);</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

The full trust bundle in one call: users' and merchants' Ed25519 keys (with each merchant's
verified status), the platform key, and the AP2 JWKS. Cache it to verify payments offline.

</dd>
</dl>

### Usage

<dl>
<dd>

```csharp
try
{
    var response = await client.Keys.GetTrust();
    // TODO: Handle 'response' of type Trust
}
catch (ApiException<RawError> ex)
{
    // TODO: Handle 'ex.Error' of type RawError
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[Trust](src/MandateApi/Models/Trust.cs)</code>

**OnError**: <code>[ApiException](src/MandateApi/Core/Exceptions/ApiException.cs)&lt;[RawError](src/MandateApi/Core/ErrorResponse/RawError.cs)&gt;</code>

</dd>
</dl>

</dd>
</dl>

</details>

## Receipts

> Source: [Receipts](src/MandateApi/Api/Receipts.cs)

<details>
<summary><code>Task&lt;IReadOnlyList&lt;Receipt&gt;&gt; ListReceipts(ListReceiptsRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default);</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Every decision Mandate made, in order. Each receipt carries the hash of the one before it and an
Ed25519 signature, so any edit, insertion or deletion breaks the chain.

</dd>
</dl>

### Usage

<dl>
<dd>

```csharp
try
{
    var response = await client.Receipts.ListReceipts(new ListReceiptsRequest());
    // TODO: Handle 'response' of type IReadOnlyList<Receipt>
}
catch (ApiException<RawError> ex)
{
    // TODO: Handle 'ex.Error' of type RawError
}
```

</dd>
</dl>

### Request

<dl>
<dd>

<code>[ListReceiptsRequest](src/MandateApi/Requests/Receipts/ListReceiptsRequest.cs)</code>

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>IReadOnlyList&lt;[Receipt](src/MandateApi/Models/Receipt.cs)&gt;</code>

**OnError**: <code>[ApiException](src/MandateApi/Core/Exceptions/ApiException.cs)&lt;[RawError](src/MandateApi/Core/ErrorResponse/RawError.cs)&gt;</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>Task&lt;ChainResult&gt; VerifyLogCopy(VerifyLogCopyRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default);</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Names the first altered entry (`brokenAt`) and why.

</dd>
</dl>

### Usage

<dl>
<dd>

```csharp
try
{
    var response = await client.Receipts.VerifyLogCopy(new VerifyLogCopyRequest
    {
        Body = new VerifyLogRequest
        {
            Receipts = [
                new Receipt
                {
                    Seq = 1,
                    Type = "some example string",
                    Summary = "some example string",
                    PayloadHash = "some example string",
                    CreatedAt = DateTimeOffset.Parse("2024-01-15T09:30:00Z"),
                    PrevHash = "some example string",
                    Hash = "some example string",
                    Signature = "some example string",
                },
            ],
        },
    });
    // TODO: Handle 'response' of type ChainResult
}
catch (ApiException<VerifyLogCopyError> ex)
{
    if (ex.Error.TryGetError(out var error))
    {
        // TODO: Handle 'error' of type Error
    }
}
```

</dd>
</dl>

### Request

<dl>
<dd>

<code>[VerifyLogCopyRequest](src/MandateApi/Requests/Receipts/VerifyLogCopyRequest.cs)</code>

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[ChainResult](src/MandateApi/Models/AnyOf/ChainResult.cs)</code>

**OnError**: <code>[ApiException](src/MandateApi/Core/Exceptions/ApiException.cs)&lt;[VerifyLogCopyError](src/MandateApi/Errors/VerifyLogCopyError.cs)&gt;</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>Task&lt;ChainResult&gt; VerifyServerLog(RequestOptions? requestOptions = null, CancellationToken cancellationToken = default);</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Re-checks every hash link and signature in the server's decision log.

</dd>
</dl>

### Usage

<dl>
<dd>

```csharp
try
{
    var response = await client.Receipts.VerifyServerLog();
    // TODO: Handle 'response' of type ChainResult
}
catch (ApiException<RawError> ex)
{
    // TODO: Handle 'ex.Error' of type RawError
}
```

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[ChainResult](src/MandateApi/Models/AnyOf/ChainResult.cs)</code>

**OnError**: <code>[ApiException](src/MandateApi/Core/Exceptions/ApiException.cs)&lt;[RawError](src/MandateApi/Core/ErrorResponse/RawError.cs)&gt;</code>

</dd>
</dl>

</dd>
</dl>

</details>

## Verification

> Source: [Verification](src/MandateApi/Api/Verification.cs)

<details>
<summary><code>Task&lt;Ap2Verdict&gt; GetAp2Evidence(GetAp2EvidenceRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default);</code></summary>

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

### Usage

<dl>
<dd>

```csharp
try
{
    var response = await client.Verification.GetAp2Evidence(new GetAp2EvidenceRequest
    {
        PaypalOrderId = "5O190127TN364715T",
    });
    // TODO: Handle 'response' of type Ap2Verdict
}
catch (ApiException<GetAp2EvidenceError> ex)
{
    if (ex.Error.TryGetError(out var error))
    {
        // TODO: Handle 'error' of type Error
    }
}
```

</dd>
</dl>

### Request

<dl>
<dd>

<code>[GetAp2EvidenceRequest](src/MandateApi/Requests/Verification/GetAp2EvidenceRequest.cs)</code>

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[Ap2Verdict](src/MandateApi/Models/Ap2Verdict.cs)</code>

**OnError**: <code>[ApiException](src/MandateApi/Core/Exceptions/ApiException.cs)&lt;[GetAp2EvidenceError](src/MandateApi/Errors/GetAp2EvidenceError.cs)&gt;</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>Task&lt;IReadOnlyList&lt;SellerPayment&gt;&gt; ListSellerPayments(ListSellerPaymentsRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default);</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Every agent payment to a merchant, newest first, each with its Mandate v1 verdict and AP2 v0.2
result. A seller's queue of "safe to fulfil" and "don't ship" orders.

</dd>
</dl>

### Usage

<dl>
<dd>

```csharp
try
{
    var response = await client.Verification.ListSellerPayments(new ListSellerPaymentsRequest
    {
        MerchantId = "acme-supplies",
    });
    // TODO: Handle 'response' of type IReadOnlyList<SellerPayment>
}
catch (ApiException<RawError> ex)
{
    // TODO: Handle 'ex.Error' of type RawError
}
```

</dd>
</dl>

### Request

<dl>
<dd>

<code>[ListSellerPaymentsRequest](src/MandateApi/Requests/Verification/ListSellerPaymentsRequest.cs)</code>

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>IReadOnlyList&lt;[SellerPayment](src/MandateApi/Models/SellerPayment.cs)&gt;</code>

**OnError**: <code>[ApiException](src/MandateApi/Core/Exceptions/ApiException.cs)&lt;[RawError](src/MandateApi/Core/ErrorResponse/RawError.cs)&gt;</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>Task&lt;ChainVerdict&gt; VerifyChain(VerifyChainOperationRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default);</code></summary>

<dl>
<dd>

### Description

<dl>
<dd>

Checks an Intent, Cart and Payment Mandate chain against the published keys.

</dd>
</dl>

### Usage

<dl>
<dd>

```csharp
try
{
    var response = await client.Verification.VerifyChain(new VerifyChainOperationRequest
    {
        Body = new VerifyChainRequest { Intent = intent, Cart = cart, Payment = payment },
    });
    // TODO: Handle 'response' of type ChainVerdict
}
catch (ApiException<VerifyChainError> ex)
{
    if (ex.Error.TryGetError(out var error))
    {
        // TODO: Handle 'error' of type Error
    }
}
```

</dd>
</dl>

### Request

<dl>
<dd>

<code>[VerifyChainOperationRequest](src/MandateApi/Requests/Verification/VerifyChainOperationRequest.cs)</code>

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[ChainVerdict](src/MandateApi/Models/ChainVerdict.cs)</code>

**OnError**: <code>[ApiException](src/MandateApi/Core/Exceptions/ApiException.cs)&lt;[VerifyChainError](src/MandateApi/Errors/VerifyChainError.cs)&gt;</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>Task&lt;OrderVerdict&gt; VerifyOrder(VerifyOrderRequest request, RequestOptions? requestOptions = null, CancellationToken cancellationToken = default);</code></summary>

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

### Usage

<dl>
<dd>

```csharp
try
{
    var response = await client.Verification.VerifyOrder(new VerifyOrderRequest
    {
        PaypalOrderId = "5O190127TN364715T",
    });
    // TODO: Handle 'response' of type OrderVerdict
}
catch (ApiException<VerifyOrderError> ex)
{
    if (ex.Error.TryGetError(out var error))
    {
        // TODO: Handle 'error' of type Error
    }
}
```

</dd>
</dl>

### Request

<dl>
<dd>

<code>[VerifyOrderRequest](src/MandateApi/Requests/Verification/VerifyOrderRequest.cs)</code>

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[OrderVerdict](src/MandateApi/Models/OrderVerdict.cs)</code>

**OnError**: <code>[ApiException](src/MandateApi/Core/Exceptions/ApiException.cs)&lt;[VerifyOrderError](src/MandateApi/Errors/VerifyOrderError.cs)&gt;</code>

</dd>
</dl>

</dd>
</dl>

</details>

