# Reference

**Parsed** endpoints return the typed payload and raise `ApiError` on a documented non-2xx. For the raw endpoints, see [Raw API Reference](raw-api-reference.md).

> Source: [MandateApiClient](mandate_api/client.py)

## Automation

> Source: [Automation](mandate_api/apis/automation.py)

<details>
<summary><code>def kill_switch(body: KillSwitchRequest | KillSwitchRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> KillSwitchResult</code></summary>

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

**Sync**

```python
try:
    response = client.automation.kill_switch(KillSwitchRequest(action=Action.PAUSE))
    # TODO: Handle 'response' of type KillSwitchResult
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type KillSwitchErrorBody
```

**Async**

```python
try:
    response = await async_client.automation.kill_switch(KillSwitchRequest(action=Action.PAUSE))
    # TODO: Handle 'response' of type KillSwitchResult
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type KillSwitchErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>body</code> | <code>[KillSwitchRequest](mandate_api/models/kill_switch_request.py) \| [KillSwitchRequestDict](mandate_api/models/kill_switch_request.py)</code> | The request body. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](mandate_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[KillSwitchResult](mandate_api/models/kill_switch_result.py)</code> -- The mandates that changed

**OnError**: <code>[ApiError](mandate_api/core/exceptions.py)&#91;[KillSwitchErrorBody](mandate_api/errors/kill_switch_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 401, 404, 503 | <code>[Error](mandate_api/models/error.py)</code> |
| anything unmapped | <code>[RawError](mandate_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

## Demo

> Source: [Demo](mandate_api/apis/demo.py)

<details>
<summary><code>def create_mandate(body: CreateMandateRequest | CreateMandateRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> Mandate</code></summary>

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

**Sync**

```python
try:
    response = client.demo.create_mandate(
        CreateMandateRequest(
            text="Household basics, up to $80 a month, nothing over $25, never more than 10% above market price, verified sellers only",
        ),
    )
    # TODO: Handle 'response' of type Mandate
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type CreateMandateErrorBody
```

**Async**

```python
try:
    response = await async_client.demo.create_mandate(
        CreateMandateRequest(
            text="Household basics, up to $80 a month, nothing over $25, never more than 10% above market price, verified sellers only",
        ),
    )
    # TODO: Handle 'response' of type Mandate
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type CreateMandateErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>body</code> | <code>[CreateMandateRequest](mandate_api/models/create_mandate_request.py) \| [CreateMandateRequestDict](mandate_api/models/create_mandate_request.py)</code> | The request body. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](mandate_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[Mandate](mandate_api/models/mandate.py)</code> -- The signed mandate

**OnError**: <code>[ApiError](mandate_api/core/exceptions.py)&#91;[CreateMandateErrorBody](mandate_api/errors/create_mandate_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400, 422, 429 | <code>[Error](mandate_api/models/error.py)</code> |
| anything unmapped | <code>[RawError](mandate_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def decide_approval(id_: str, body: DecideApprovalRequest | DecideApprovalRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> ProposeResult</code></summary>

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

**Sync**

```python
try:
    response = client.demo.decide_approval("some example string", DecideApprovalRequest(choice=Choice.APPROVE))
    # TODO: Handle 'response' of type ProposeResult
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type DecideApprovalErrorBody
```

**Async**

```python
try:
    response = await async_client.demo.decide_approval(
        "some example string", DecideApprovalRequest(choice=Choice.APPROVE)
    )
    # TODO: Handle 'response' of type ProposeResult
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type DecideApprovalErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>id_</code> | <code>str</code> | The approval ID from `listApprovals` or the agent run. |
| <code>body</code> | <code>[DecideApprovalRequest](mandate_api/models/decide_approval_request.py) \| [DecideApprovalRequestDict](mandate_api/models/decide_approval_request.py)</code> | The request body. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](mandate_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[ProposeResult](mandate_api/models/propose_result.py)</code> -- Outcome

**OnError**: <code>[ApiError](mandate_api/core/exceptions.py)&#91;[DecideApprovalErrorBody](mandate_api/errors/decide_approval_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 403, 404, 409, 410 | <code>[Error](mandate_api/models/error.py)</code> |
| anything unmapped | <code>[RawError](mandate_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def get_health(*, request_options: RequestOptionsOrDict | None = None) -> Health</code></summary>

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

**Sync**

```python
try:
    response = client.demo.get_health()
    # TODO: Handle 'response' of type Health
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RawError
```

**Async**

```python
try:
    response = await async_client.demo.get_health()
    # TODO: Handle 'response' of type Health
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RawError
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>request_options</code> | <code>[RequestOptionsOrDict](mandate_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[Health](mandate_api/models/health.py)</code> -- Status

**OnError**: <code>[ApiError](mandate_api/core/exceptions.py)&#91;[RawError](mandate_api/core/results.py)&#93;</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def list_approvals(*, mandate_id: str | None = None, request_options: RequestOptionsOrDict | None = None) -> list[Approval]</code></summary>

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

**Sync**

```python
try:
    response = client.demo.list_approvals()
    # TODO: Handle 'response' of type list[Approval]
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RawError
```

**Async**

```python
try:
    response = await async_client.demo.list_approvals()
    # TODO: Handle 'response' of type list[Approval]
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RawError
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>mandate_id</code> | <code>str \| None</code> | Only this mandate's approvals. Omit for all.<br>**Default**: <code>None</code> |
| <code>request_options</code> | <code>[RequestOptionsOrDict](mandate_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>list&#91;[Approval](mandate_api/models/approval.py)&#93;</code> -- Pending approvals

**OnError**: <code>[ApiError](mandate_api/core/exceptions.py)&#91;[RawError](mandate_api/core/results.py)&#93;</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def list_mandates(*, request_options: RequestOptionsOrDict | None = None) -> list[Mandate]</code></summary>

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

**Sync**

```python
try:
    response = client.demo.list_mandates()
    # TODO: Handle 'response' of type list[Mandate]
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RawError
```

**Async**

```python
try:
    response = await async_client.demo.list_mandates()
    # TODO: Handle 'response' of type list[Mandate]
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RawError
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>request_options</code> | <code>[RequestOptionsOrDict](mandate_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>list&#91;[Mandate](mandate_api/models/mandate.py)&#93;</code> -- Mandates

**OnError**: <code>[ApiError](mandate_api/core/exceptions.py)&#91;[RawError](mandate_api/core/results.py)&#93;</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def run_agent(body: RunAgentRequest | RunAgentRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> AgentRun</code></summary>

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

**Sync**

```python
try:
    response = client.demo.run_agent(
        RunAgentRequest(mandate_id="{{mandateId}}", task="Buy washing-up liquid and sponges")
    )
    # TODO: Handle 'response' of type AgentRun
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RunAgentErrorBody
```

**Async**

```python
try:
    response = await async_client.demo.run_agent(
        RunAgentRequest(mandate_id="{{mandateId}}", task="Buy washing-up liquid and sponges")
    )
    # TODO: Handle 'response' of type AgentRun
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RunAgentErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>body</code> | <code>[RunAgentRequest](mandate_api/models/run_agent_request.py) \| [RunAgentRequestDict](mandate_api/models/run_agent_request.py)</code> | The request body. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](mandate_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[AgentRun](mandate_api/models/agent_run.py)</code> -- The run, with every step and the gate's decisions

**OnError**: <code>[ApiError](mandate_api/core/exceptions.py)&#91;[RunAgentErrorBody](mandate_api/errors/run_agent_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 404, 429 | <code>[Error](mandate_api/models/error.py)</code> |
| anything unmapped | <code>[RawError](mandate_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

## Keys

> Source: [Keys](mandate_api/apis/keys.py)

<details>
<summary><code>def get_ap2_jwks(*, request_options: RequestOptionsOrDict | None = None) -> Jwks</code></summary>

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

**Sync**

```python
try:
    response = client.keys.get_ap2_jwks()
    # TODO: Handle 'response' of type Jwks
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RawError
```

**Async**

```python
try:
    response = await async_client.keys.get_ap2_jwks()
    # TODO: Handle 'response' of type Jwks
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RawError
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>request_options</code> | <code>[RequestOptionsOrDict](mandate_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[Jwks](mandate_api/models/jwks.py)</code> -- JWKS

**OnError**: <code>[ApiError](mandate_api/core/exceptions.py)&#91;[RawError](mandate_api/core/results.py)&#93;</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def get_receipt_public_key(*, request_options: RequestOptionsOrDict | None = None) -> None</code></summary>

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

**Sync**

```python
try:
    client.keys.get_receipt_public_key()
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RawError
```

**Async**

```python
try:
    await async_client.keys.get_receipt_public_key()
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RawError
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>request_options</code> | <code>[RequestOptionsOrDict](mandate_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: No content

**OnError**: <code>[ApiError](mandate_api/core/exceptions.py)&#91;[RawError](mandate_api/core/results.py)&#93;</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def get_trust(*, request_options: RequestOptionsOrDict | None = None) -> Trust</code></summary>

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

**Sync**

```python
try:
    response = client.keys.get_trust()
    # TODO: Handle 'response' of type Trust
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RawError
```

**Async**

```python
try:
    response = await async_client.keys.get_trust()
    # TODO: Handle 'response' of type Trust
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RawError
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>request_options</code> | <code>[RequestOptionsOrDict](mandate_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[Trust](mandate_api/models/trust.py)</code> -- Keys

**OnError**: <code>[ApiError](mandate_api/core/exceptions.py)&#91;[RawError](mandate_api/core/results.py)&#93;</code>

</dd>
</dl>

</dd>
</dl>

</details>

## Receipts

> Source: [Receipts](mandate_api/apis/receipts.py)

<details>
<summary><code>def list_receipts(*, mandate_id: str | None = None, request_options: RequestOptionsOrDict | None = None) -> list[Receipt]</code></summary>

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

**Sync**

```python
try:
    response = client.receipts.list_receipts()
    # TODO: Handle 'response' of type list[Receipt]
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RawError
```

**Async**

```python
try:
    response = await async_client.receipts.list_receipts()
    # TODO: Handle 'response' of type list[Receipt]
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RawError
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>mandate_id</code> | <code>str \| None</code> | Only this mandate's receipts. Omit for the whole log.<br>**Default**: <code>None</code> |
| <code>request_options</code> | <code>[RequestOptionsOrDict](mandate_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>list&#91;[Receipt](mandate_api/models/receipt.py)&#93;</code> -- Receipts in order

**OnError**: <code>[ApiError](mandate_api/core/exceptions.py)&#91;[RawError](mandate_api/core/results.py)&#93;</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def verify_log_copy(body: VerifyLogRequest | VerifyLogRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> ChainResult</code></summary>

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

**Sync**

```python
try:
    response = client.receipts.verify_log_copy(
        VerifyLogRequest(
            receipts=[
                Receipt(
                    seq=1,
                    type_="some example string",
                    summary="some example string",
                    payload_hash="some example string",
                    created_at=datetime(2024, 1, 15, 9, 30, 0, tzinfo=timezone.utc),
                    prev_hash="some example string",
                    hash="some example string",
                    signature="some example string",
                ),
            ],
        ),
    )
    # TODO: Handle 'response' of type ChainResult
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type VerifyLogCopyErrorBody
```

**Async**

```python
try:
    response = await async_client.receipts.verify_log_copy(
        VerifyLogRequest(
            receipts=[
                Receipt(
                    seq=1,
                    type_="some example string",
                    summary="some example string",
                    payload_hash="some example string",
                    created_at=datetime(2024, 1, 15, 9, 30, 0, tzinfo=timezone.utc),
                    prev_hash="some example string",
                    hash="some example string",
                    signature="some example string",
                ),
            ],
        ),
    )
    # TODO: Handle 'response' of type ChainResult
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type VerifyLogCopyErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>body</code> | <code>[VerifyLogRequest](mandate_api/models/verify_log_request.py) \| [VerifyLogRequestDict](mandate_api/models/verify_log_request.py)</code> | The request body. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](mandate_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[ChainResult](mandate_api/models/unions/chain_result.py)</code> -- Result

**OnError**: <code>[ApiError](mandate_api/core/exceptions.py)&#91;[VerifyLogCopyErrorBody](mandate_api/errors/verify_log_copy_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400 | <code>[Error](mandate_api/models/error.py)</code> |
| anything unmapped | <code>[RawError](mandate_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def verify_server_log(*, request_options: RequestOptionsOrDict | None = None) -> ChainResult</code></summary>

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

**Sync**

```python
try:
    response = client.receipts.verify_server_log()
    # TODO: Handle 'response' of type ChainResult
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RawError
```

**Async**

```python
try:
    response = await async_client.receipts.verify_server_log()
    # TODO: Handle 'response' of type ChainResult
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RawError
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>request_options</code> | <code>[RequestOptionsOrDict](mandate_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[ChainResult](mandate_api/models/unions/chain_result.py)</code> -- Result

**OnError**: <code>[ApiError](mandate_api/core/exceptions.py)&#91;[RawError](mandate_api/core/results.py)&#93;</code>

</dd>
</dl>

</dd>
</dl>

</details>

## Verification

> Source: [Verification](mandate_api/apis/verification.py)

<details>
<summary><code>def get_ap2_evidence(paypal_order_id: str, *, request_options: RequestOptionsOrDict | None = None) -> Ap2Verdict</code></summary>

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

**Sync**

```python
try:
    response = client.verification.get_ap2_evidence("5O190127TN364715T")
    # TODO: Handle 'response' of type Ap2Verdict
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type GetAp2EvidenceErrorBody
```

**Async**

```python
try:
    response = await async_client.verification.get_ap2_evidence("5O190127TN364715T")
    # TODO: Handle 'response' of type Ap2Verdict
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type GetAp2EvidenceErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>paypal_order_id</code> | <code>str</code> | PayPal order ID (sandbox), or `SIM-…` in offline mode. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](mandate_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[Ap2Verdict](mandate_api/models/ap2_verdict.py)</code> -- Evidence pack and verdict

**OnError**: <code>[ApiError](mandate_api/core/exceptions.py)&#91;[GetAp2EvidenceErrorBody](mandate_api/errors/get_ap2_evidence_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 404 | <code>[Error](mandate_api/models/error.py)</code> |
| anything unmapped | <code>[RawError](mandate_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def list_seller_payments(*, merchant_id: str | None = None, request_options: RequestOptionsOrDict | None = None) -> list[SellerPayment]</code></summary>

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

**Sync**

```python
try:
    response = client.verification.list_seller_payments(merchant_id="acme-supplies")
    # TODO: Handle 'response' of type list[SellerPayment]
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RawError
```

**Async**

```python
try:
    response = await async_client.verification.list_seller_payments(merchant_id="acme-supplies")
    # TODO: Handle 'response' of type list[SellerPayment]
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type RawError
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>merchant_id</code> | <code>str \| None</code> | Only this merchant's payments. Omit for all.<br>**Default**: <code>None</code> |
| <code>request_options</code> | <code>[RequestOptionsOrDict](mandate_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>list&#91;[SellerPayment](mandate_api/models/seller_payment.py)&#93;</code> -- Payments, newest first

**OnError**: <code>[ApiError](mandate_api/core/exceptions.py)&#91;[RawError](mandate_api/core/results.py)&#93;</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def verify_chain(body: VerifyChainRequest | VerifyChainRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> ChainVerdict</code></summary>

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

**Sync**

```python
try:
    response = client.verification.verify_chain(VerifyChainRequest(intent={}, cart={}, payment={}))
    # TODO: Handle 'response' of type ChainVerdict
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type VerifyChainErrorBody
```

**Async**

```python
try:
    response = await async_client.verification.verify_chain(VerifyChainRequest(intent={}, cart={}, payment={}))
    # TODO: Handle 'response' of type ChainVerdict
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type VerifyChainErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>body</code> | <code>[VerifyChainRequest](mandate_api/models/verify_chain_request.py) \| [VerifyChainRequestDict](mandate_api/models/verify_chain_request.py)</code> | The request body. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](mandate_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[ChainVerdict](mandate_api/models/chain_verdict.py)</code> -- Verdict

**OnError**: <code>[ApiError](mandate_api/core/exceptions.py)&#91;[VerifyChainErrorBody](mandate_api/errors/verify_chain_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 400 | <code>[Error](mandate_api/models/error.py)</code> |
| anything unmapped | <code>[RawError](mandate_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def verify_order(paypal_order_id: str, *, request_options: RequestOptionsOrDict | None = None) -> OrderVerdict</code></summary>

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

**Sync**

```python
try:
    response = client.verification.verify_order("5O190127TN364715T")
    # TODO: Handle 'response' of type OrderVerdict
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type VerifyOrderErrorBody
```

**Async**

```python
try:
    response = await async_client.verification.verify_order("5O190127TN364715T")
    # TODO: Handle 'response' of type OrderVerdict
except ApiError as e:
    ...  # TODO: Handle 'e.error' of type VerifyOrderErrorBody
```

</dd>
</dl>

### Parameters

<dl>
<dd>

| Name | Type | Description |
| --- | --- | --- |
| <code>paypal_order_id</code> | <code>str</code> | PayPal order ID (sandbox), or `SIM-…` in offline mode. |
| <code>request_options</code> | <code>[RequestOptionsOrDict](mandate_api/core/request_options.py) \| None</code> | Per-call overrides for this one request, such as a timeout, extra headers, or its retry count and statuses. |

</dd>
</dl>

### Response

<dl>
<dd>

**OnSuccess**: <code>[OrderVerdict](mandate_api/models/order_verdict.py)</code> -- Verdict. Check `ok`; a 200 does not mean the payment is valid.

**OnError**: <code>[ApiError](mandate_api/core/exceptions.py)&#91;[VerifyOrderErrorBody](mandate_api/errors/verify_order_error.py)&#93;</code>

Mapped in first-match order -- an earlier row wins over a later range that also covers the status:

| Status | `error` is |
| --- | --- |
| 404 | <code>[Error](mandate_api/models/error.py)</code> |
| anything unmapped | <code>[RawError](mandate_api/core/results.py)</code> |

</dd>
</dl>

</dd>
</dl>

</details>

