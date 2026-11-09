# Raw Reference

**Raw** endpoints, reached through `with_raw_response`, return `ApiResult[T, E]` and never raise for an API error. For the parsed endpoints, see [API Reference](api-reference.md).

> Source: [MandateApiClient](mandate_api/client.py)

## Automation

> Source: [Automation](mandate_api/apis/automation.py)

<details>
<summary><code>def kill_switch(body: KillSwitchRequest | KillSwitchRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> ApiResult[KillSwitchResult, KillSwitchErrorBody]</code></summary>

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
result = client.automation.with_raw_response.kill_switch(KillSwitchRequest(action=Action.PAUSE))
match result:
    case Success(payload=payload):
        ...  # TODO: Handle 'payload' of type KillSwitchResult
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type KillSwitchErrorBody
```

**Async**

```python
result = await async_client.automation.with_raw_response.kill_switch(KillSwitchRequest(action=Action.PAUSE))
match result:
    case Success(payload=payload):
        ...  # TODO: Handle 'payload' of type KillSwitchResult
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type KillSwitchErrorBody
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

**Returns**: <code>[ApiResult](mandate_api/core/results.py)&#91;[KillSwitchResult](mandate_api/models/kill_switch_result.py), [KillSwitchErrorBody](mandate_api/errors/kill_switch_error.py)&#93;</code>

**On `Success`**: `payload` is <code>[KillSwitchResult](mandate_api/models/kill_switch_result.py)</code> -- The mandates that changed

**On `Failure`**: `error` is <code>[KillSwitchErrorBody](mandate_api/errors/kill_switch_error.py)</code>

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
<summary><code>def create_mandate(body: CreateMandateRequest | CreateMandateRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> ApiResult[Mandate, CreateMandateErrorBody]</code></summary>

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
result = client.demo.with_raw_response.create_mandate(
    CreateMandateRequest(
        text="Household basics, up to $80 a month, nothing over $25, never more than 10% above market price, verified sellers only",
    ),
)
match result:
    case Success(payload=payload):
        ...  # TODO: Handle 'payload' of type Mandate
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type CreateMandateErrorBody
```

**Async**

```python
result = await async_client.demo.with_raw_response.create_mandate(
    CreateMandateRequest(
        text="Household basics, up to $80 a month, nothing over $25, never more than 10% above market price, verified sellers only",
    ),
)
match result:
    case Success(payload=payload):
        ...  # TODO: Handle 'payload' of type Mandate
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type CreateMandateErrorBody
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

**Returns**: <code>[ApiResult](mandate_api/core/results.py)&#91;[Mandate](mandate_api/models/mandate.py), [CreateMandateErrorBody](mandate_api/errors/create_mandate_error.py)&#93;</code>

**On `Success`**: `payload` is <code>[Mandate](mandate_api/models/mandate.py)</code> -- The signed mandate

**On `Failure`**: `error` is <code>[CreateMandateErrorBody](mandate_api/errors/create_mandate_error.py)</code>

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
<summary><code>def decide_approval(id_: str, body: DecideApprovalRequest | DecideApprovalRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> ApiResult[ProposeResult, DecideApprovalErrorBody]</code></summary>

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
result = client.demo.with_raw_response.decide_approval(
    "some example string", DecideApprovalRequest(choice=Choice.APPROVE)
)
match result:
    case Success(payload=payload):
        ...  # TODO: Handle 'payload' of type ProposeResult
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type DecideApprovalErrorBody
```

**Async**

```python
result = await async_client.demo.with_raw_response.decide_approval(
    "some example string", DecideApprovalRequest(choice=Choice.APPROVE)
)
match result:
    case Success(payload=payload):
        ...  # TODO: Handle 'payload' of type ProposeResult
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type DecideApprovalErrorBody
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

**Returns**: <code>[ApiResult](mandate_api/core/results.py)&#91;[ProposeResult](mandate_api/models/propose_result.py), [DecideApprovalErrorBody](mandate_api/errors/decide_approval_error.py)&#93;</code>

**On `Success`**: `payload` is <code>[ProposeResult](mandate_api/models/propose_result.py)</code> -- Outcome

**On `Failure`**: `error` is <code>[DecideApprovalErrorBody](mandate_api/errors/decide_approval_error.py)</code>

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
<summary><code>def get_health(*, request_options: RequestOptionsOrDict | None = None) -> ApiResult[Health, RawError]</code></summary>

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
result = client.demo.with_raw_response.get_health()
match result:
    case Success(payload=payload):
        ...  # TODO: Handle 'payload' of type Health
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type RawError
```

**Async**

```python
result = await async_client.demo.with_raw_response.get_health()
match result:
    case Success(payload=payload):
        ...  # TODO: Handle 'payload' of type Health
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type RawError
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

**Returns**: <code>[ApiResult](mandate_api/core/results.py)&#91;[Health](mandate_api/models/health.py), [RawError](mandate_api/core/results.py)&#93;</code>

**On `Success`**: `payload` is <code>[Health](mandate_api/models/health.py)</code> -- Status

**On `Failure`**: `error` is <code>[RawError](mandate_api/core/results.py)</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def list_approvals(*, mandate_id: str | None = None, request_options: RequestOptionsOrDict | None = None) -> ApiResult[list[Approval], RawError]</code></summary>

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
result = client.demo.with_raw_response.list_approvals()
match result:
    case Success(payload=payload):
        ...  # TODO: Handle 'payload' of type list[Approval]
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type RawError
```

**Async**

```python
result = await async_client.demo.with_raw_response.list_approvals()
match result:
    case Success(payload=payload):
        ...  # TODO: Handle 'payload' of type list[Approval]
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type RawError
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

**Returns**: <code>[ApiResult](mandate_api/core/results.py)&#91;list&#91;[Approval](mandate_api/models/approval.py)&#93;, [RawError](mandate_api/core/results.py)&#93;</code>

**On `Success`**: `payload` is <code>list&#91;[Approval](mandate_api/models/approval.py)&#93;</code> -- Pending approvals

**On `Failure`**: `error` is <code>[RawError](mandate_api/core/results.py)</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def list_mandates(*, request_options: RequestOptionsOrDict | None = None) -> ApiResult[list[Mandate], RawError]</code></summary>

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
result = client.demo.with_raw_response.list_mandates()
match result:
    case Success(payload=payload):
        ...  # TODO: Handle 'payload' of type list[Mandate]
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type RawError
```

**Async**

```python
result = await async_client.demo.with_raw_response.list_mandates()
match result:
    case Success(payload=payload):
        ...  # TODO: Handle 'payload' of type list[Mandate]
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type RawError
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

**Returns**: <code>[ApiResult](mandate_api/core/results.py)&#91;list&#91;[Mandate](mandate_api/models/mandate.py)&#93;, [RawError](mandate_api/core/results.py)&#93;</code>

**On `Success`**: `payload` is <code>list&#91;[Mandate](mandate_api/models/mandate.py)&#93;</code> -- Mandates

**On `Failure`**: `error` is <code>[RawError](mandate_api/core/results.py)</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def run_agent(body: RunAgentRequest | RunAgentRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> ApiResult[AgentRun, RunAgentErrorBody]</code></summary>

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
result = client.demo.with_raw_response.run_agent(
    RunAgentRequest(mandate_id="{{mandateId}}", task="Buy washing-up liquid and sponges")
)
match result:
    case Success(payload=payload):
        ...  # TODO: Handle 'payload' of type AgentRun
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type RunAgentErrorBody
```

**Async**

```python
result = await async_client.demo.with_raw_response.run_agent(
    RunAgentRequest(mandate_id="{{mandateId}}", task="Buy washing-up liquid and sponges")
)
match result:
    case Success(payload=payload):
        ...  # TODO: Handle 'payload' of type AgentRun
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type RunAgentErrorBody
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

**Returns**: <code>[ApiResult](mandate_api/core/results.py)&#91;[AgentRun](mandate_api/models/agent_run.py), [RunAgentErrorBody](mandate_api/errors/run_agent_error.py)&#93;</code>

**On `Success`**: `payload` is <code>[AgentRun](mandate_api/models/agent_run.py)</code> -- The run, with every step and the gate's decisions

**On `Failure`**: `error` is <code>[RunAgentErrorBody](mandate_api/errors/run_agent_error.py)</code>

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
<summary><code>def get_ap2_jwks(*, request_options: RequestOptionsOrDict | None = None) -> ApiResult[Jwks, RawError]</code></summary>

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
result = client.keys.with_raw_response.get_ap2_jwks()
match result:
    case Success(payload=payload):
        ...  # TODO: Handle 'payload' of type Jwks
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type RawError
```

**Async**

```python
result = await async_client.keys.with_raw_response.get_ap2_jwks()
match result:
    case Success(payload=payload):
        ...  # TODO: Handle 'payload' of type Jwks
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type RawError
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

**Returns**: <code>[ApiResult](mandate_api/core/results.py)&#91;[Jwks](mandate_api/models/jwks.py), [RawError](mandate_api/core/results.py)&#93;</code>

**On `Success`**: `payload` is <code>[Jwks](mandate_api/models/jwks.py)</code> -- JWKS

**On `Failure`**: `error` is <code>[RawError](mandate_api/core/results.py)</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def get_receipt_public_key(*, request_options: RequestOptionsOrDict | None = None) -> ApiResult[None, RawError]</code></summary>

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
result = client.keys.with_raw_response.get_receipt_public_key()
match result:
    case Success():
        ...  # 2xx, no content
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type RawError
```

**Async**

```python
result = await async_client.keys.with_raw_response.get_receipt_public_key()
match result:
    case Success():
        ...  # 2xx, no content
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type RawError
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

**Returns**: <code>[ApiResult](mandate_api/core/results.py)&#91;None, [RawError](mandate_api/core/results.py)&#93;</code>

**On `Success`**: the 2xx carries no content; `payload` is <code>None</code>

**On `Failure`**: `error` is <code>[RawError](mandate_api/core/results.py)</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def get_trust(*, request_options: RequestOptionsOrDict | None = None) -> ApiResult[Trust, RawError]</code></summary>

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
result = client.keys.with_raw_response.get_trust()
match result:
    case Success(payload=payload):
        ...  # TODO: Handle 'payload' of type Trust
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type RawError
```

**Async**

```python
result = await async_client.keys.with_raw_response.get_trust()
match result:
    case Success(payload=payload):
        ...  # TODO: Handle 'payload' of type Trust
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type RawError
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

**Returns**: <code>[ApiResult](mandate_api/core/results.py)&#91;[Trust](mandate_api/models/trust.py), [RawError](mandate_api/core/results.py)&#93;</code>

**On `Success`**: `payload` is <code>[Trust](mandate_api/models/trust.py)</code> -- Keys

**On `Failure`**: `error` is <code>[RawError](mandate_api/core/results.py)</code>

</dd>
</dl>

</dd>
</dl>

</details>

## Receipts

> Source: [Receipts](mandate_api/apis/receipts.py)

<details>
<summary><code>def list_receipts(*, mandate_id: str | None = None, request_options: RequestOptionsOrDict | None = None) -> ApiResult[list[Receipt], RawError]</code></summary>

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
result = client.receipts.with_raw_response.list_receipts()
match result:
    case Success(payload=payload):
        ...  # TODO: Handle 'payload' of type list[Receipt]
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type RawError
```

**Async**

```python
result = await async_client.receipts.with_raw_response.list_receipts()
match result:
    case Success(payload=payload):
        ...  # TODO: Handle 'payload' of type list[Receipt]
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type RawError
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

**Returns**: <code>[ApiResult](mandate_api/core/results.py)&#91;list&#91;[Receipt](mandate_api/models/receipt.py)&#93;, [RawError](mandate_api/core/results.py)&#93;</code>

**On `Success`**: `payload` is <code>list&#91;[Receipt](mandate_api/models/receipt.py)&#93;</code> -- Receipts in order

**On `Failure`**: `error` is <code>[RawError](mandate_api/core/results.py)</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def verify_log_copy(body: VerifyLogRequest | VerifyLogRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> ApiResult[ChainResult, VerifyLogCopyErrorBody]</code></summary>

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
result = client.receipts.with_raw_response.verify_log_copy(
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
match result:
    case Success(payload=payload):
        ...  # TODO: Handle 'payload' of type ChainResult
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type VerifyLogCopyErrorBody
```

**Async**

```python
result = await async_client.receipts.with_raw_response.verify_log_copy(
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
match result:
    case Success(payload=payload):
        ...  # TODO: Handle 'payload' of type ChainResult
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type VerifyLogCopyErrorBody
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

**Returns**: <code>[ApiResult](mandate_api/core/results.py)&#91;[ChainResult](mandate_api/models/unions/chain_result.py), [VerifyLogCopyErrorBody](mandate_api/errors/verify_log_copy_error.py)&#93;</code>

**On `Success`**: `payload` is <code>[ChainResult](mandate_api/models/unions/chain_result.py)</code> -- Result

**On `Failure`**: `error` is <code>[VerifyLogCopyErrorBody](mandate_api/errors/verify_log_copy_error.py)</code>

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
<summary><code>def verify_server_log(*, request_options: RequestOptionsOrDict | None = None) -> ApiResult[ChainResult, RawError]</code></summary>

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
result = client.receipts.with_raw_response.verify_server_log()
match result:
    case Success(payload=payload):
        ...  # TODO: Handle 'payload' of type ChainResult
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type RawError
```

**Async**

```python
result = await async_client.receipts.with_raw_response.verify_server_log()
match result:
    case Success(payload=payload):
        ...  # TODO: Handle 'payload' of type ChainResult
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type RawError
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

**Returns**: <code>[ApiResult](mandate_api/core/results.py)&#91;[ChainResult](mandate_api/models/unions/chain_result.py), [RawError](mandate_api/core/results.py)&#93;</code>

**On `Success`**: `payload` is <code>[ChainResult](mandate_api/models/unions/chain_result.py)</code> -- Result

**On `Failure`**: `error` is <code>[RawError](mandate_api/core/results.py)</code>

</dd>
</dl>

</dd>
</dl>

</details>

## Verification

> Source: [Verification](mandate_api/apis/verification.py)

<details>
<summary><code>def get_ap2_evidence(paypal_order_id: str, *, request_options: RequestOptionsOrDict | None = None) -> ApiResult[Ap2Verdict, GetAp2EvidenceErrorBody]</code></summary>

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
result = client.verification.with_raw_response.get_ap2_evidence("5O190127TN364715T")
match result:
    case Success(payload=payload):
        ...  # TODO: Handle 'payload' of type Ap2Verdict
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type GetAp2EvidenceErrorBody
```

**Async**

```python
result = await async_client.verification.with_raw_response.get_ap2_evidence("5O190127TN364715T")
match result:
    case Success(payload=payload):
        ...  # TODO: Handle 'payload' of type Ap2Verdict
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type GetAp2EvidenceErrorBody
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

**Returns**: <code>[ApiResult](mandate_api/core/results.py)&#91;[Ap2Verdict](mandate_api/models/ap2_verdict.py), [GetAp2EvidenceErrorBody](mandate_api/errors/get_ap2_evidence_error.py)&#93;</code>

**On `Success`**: `payload` is <code>[Ap2Verdict](mandate_api/models/ap2_verdict.py)</code> -- Evidence pack and verdict

**On `Failure`**: `error` is <code>[GetAp2EvidenceErrorBody](mandate_api/errors/get_ap2_evidence_error.py)</code>

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
<summary><code>def list_seller_payments(*, merchant_id: str | None = None, request_options: RequestOptionsOrDict | None = None) -> ApiResult[list[SellerPayment], RawError]</code></summary>

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
result = client.verification.with_raw_response.list_seller_payments(merchant_id="acme-supplies")
match result:
    case Success(payload=payload):
        ...  # TODO: Handle 'payload' of type list[SellerPayment]
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type RawError
```

**Async**

```python
result = await async_client.verification.with_raw_response.list_seller_payments(merchant_id="acme-supplies")
match result:
    case Success(payload=payload):
        ...  # TODO: Handle 'payload' of type list[SellerPayment]
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type RawError
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

**Returns**: <code>[ApiResult](mandate_api/core/results.py)&#91;list&#91;[SellerPayment](mandate_api/models/seller_payment.py)&#93;, [RawError](mandate_api/core/results.py)&#93;</code>

**On `Success`**: `payload` is <code>list&#91;[SellerPayment](mandate_api/models/seller_payment.py)&#93;</code> -- Payments, newest first

**On `Failure`**: `error` is <code>[RawError](mandate_api/core/results.py)</code>

</dd>
</dl>

</dd>
</dl>

</details>

<details>
<summary><code>def verify_chain(body: VerifyChainRequest | VerifyChainRequestDict, *, request_options: RequestOptionsOrDict | None = None) -> ApiResult[ChainVerdict, VerifyChainErrorBody]</code></summary>

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
result = client.verification.with_raw_response.verify_chain(VerifyChainRequest(intent={}, cart={}, payment={}))
match result:
    case Success(payload=payload):
        ...  # TODO: Handle 'payload' of type ChainVerdict
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type VerifyChainErrorBody
```

**Async**

```python
result = await async_client.verification.with_raw_response.verify_chain(
    VerifyChainRequest(intent={}, cart={}, payment={})
)
match result:
    case Success(payload=payload):
        ...  # TODO: Handle 'payload' of type ChainVerdict
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type VerifyChainErrorBody
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

**Returns**: <code>[ApiResult](mandate_api/core/results.py)&#91;[ChainVerdict](mandate_api/models/chain_verdict.py), [VerifyChainErrorBody](mandate_api/errors/verify_chain_error.py)&#93;</code>

**On `Success`**: `payload` is <code>[ChainVerdict](mandate_api/models/chain_verdict.py)</code> -- Verdict

**On `Failure`**: `error` is <code>[VerifyChainErrorBody](mandate_api/errors/verify_chain_error.py)</code>

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
<summary><code>def verify_order(paypal_order_id: str, *, request_options: RequestOptionsOrDict | None = None) -> ApiResult[OrderVerdict, VerifyOrderErrorBody]</code></summary>

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
result = client.verification.with_raw_response.verify_order("5O190127TN364715T")
match result:
    case Success(payload=payload):
        ...  # TODO: Handle 'payload' of type OrderVerdict
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type VerifyOrderErrorBody
```

**Async**

```python
result = await async_client.verification.with_raw_response.verify_order("5O190127TN364715T")
match result:
    case Success(payload=payload):
        ...  # TODO: Handle 'payload' of type OrderVerdict
    case Failure(error=error):
        ...  # TODO: Handle 'error' of type VerifyOrderErrorBody
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

**Returns**: <code>[ApiResult](mandate_api/core/results.py)&#91;[OrderVerdict](mandate_api/models/order_verdict.py), [VerifyOrderErrorBody](mandate_api/errors/verify_order_error.py)&#93;</code>

**On `Success`**: `payload` is <code>[OrderVerdict](mandate_api/models/order_verdict.py)</code> -- Verdict. Check `ok`; a 200 does not mean the payment is valid.

**On `Failure`**: `error` is <code>[VerifyOrderErrorBody](mandate_api/errors/verify_order_error.py)</code>

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

