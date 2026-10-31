# Mandate shopper on Astropods

A shopping agent hosted on [Astropods](https://docs.astropods.com) that can spend money only through Mandate.

It has no card, no PayPal access and no payment code. Its only tools come from Mandate's MCP server (`get_mandate`, `search_products`, `get_product`, `buy`), through a private connection link you create on Mandate's **Assistants** page. Every `buy` goes through Mandate's policy gate: it is paid, sent to you for approval, or blocked, with the same signed AP2 evidence as Mandate's own agent. Revoke the link and the agent loses access straight away (Mandate answers 401).

Built with Mastra and the Astropods Mastra adapter, like the samples in [astropods/agents](https://github.com/astropods/agents).

## Run it

Needs the [Astropods CLI](https://docs.astropods.com/install-cli) (`ast`) and Docker.

1. In Mandate, sign your rules, then on **Assistants** create a connection named "Astropods shopper" and copy the URL (`https://<your-mandate>/api/mcp/<token>`). It must be reachable from Astropods, so use the hosted app, not localhost.
2. From this folder:

   ```bash
   ast login
   ast project configure          # MANDATE_MCP_URL, and ANTHROPIC_API_KEY for the model
   ast project start              # chat with it locally in the web adapter
   ```

3. Deploy:

   ```bash
   ast blueprint push mandate-shopper
   ast blueprint deploy mandate-shopper
   ```

Try "buy washing-up liquid and sponges", then "buy a $50 gift card": the first is paid within your rules; the second is blocked by Mandate, whatever the agent intends.

## Configuration

| Input | What it is |
| --- | --- |
| `MANDATE_MCP_URL` | The connection URL from Mandate's Assistants page. Secret: it carries the connection's token. |
| `ANTHROPIC_API_KEY` | From `models.anthropic` in `astropods.yml`. |
| `MANDATE_SHOPPER_MODEL` | Optional, `provider/model`. Default `anthropic/claude-sonnet-4-6`. |

On start the agent wakes Mandate (a free-plan host may be asleep) and refuses to start if it cannot list Mandate's tools, for example because the link was revoked.
