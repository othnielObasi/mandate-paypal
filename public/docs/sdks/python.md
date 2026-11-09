# Python SDK (/docs/sdks/python)

[Download SDK](/docs/__downloads/sdk/python.zip)

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

Add the SDK to your project from its folder, with whichever package manager your project uses. Give each tool a path containing a slash, such as `../mandate-api` — a bare folder name is looked up on PyPI instead, and resolves to whatever project holds that name there:

```bash
pip install <path-to-sdk>
```

```bash
uv add <path-to-sdk>
```

```bash
poetry add <path-to-sdk>
```

## Quick Start [#quick-start]

### Synchronous client [#synchronous-client]

Construct `MandateApiClient` with keyword arguments, and call `close()` when you are done. Every argument is optional.

```python
from mandate_api import MandateApiClient

client = MandateApiClient(automation_secret="YOUR_BEARER_TOKEN", environment="production")

client.close()
```

Alternatively, scope it — `with MandateApiClient(...) as client:` closes the pool on exit.

### Asynchronous client [#asynchronous-client]

`AsyncMandateApiClient` mirrors `MandateApiClient` with **identical method names**, and every endpoint method is a coroutine. It takes the same arguments, with some differences — for example, the transport argument is `custom_async_http_client`.

```python
from asyncio import run

from mandate_api import AsyncMandateApiClient

async def main() -> None:
    client = AsyncMandateApiClient(automation_secret="YOUR_BEARER_TOKEN", environment="production")
    await client.aclose()

run(main())
```

Alternatively, scope it — `async with AsyncMandateApiClient(...) as client:` closes the pool on exit.