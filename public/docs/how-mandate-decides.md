# How Mandate decides (/docs/how-mandate-decides)

Every purchase an agent tries, whether from Mandate's own agent, a scheduled buy, or an outside assistant over MCP, goes through the same gate. It checks 7 rules in order:

| # | Rule | If it fails |
|---|------|-------------|
| 1 | **Mandate**: active, not expired, right currency | Blocked |
| 2 | **Request came from** the user's task, not text on a web page | Blocked |
| 3 | **Category** is one the user allowed | Blocked |
| 4 | **Seller** is verified and not on the user's blocked list | Blocked |
| 5 | **Item limit**: under the per-item cap | The user is asked |
| 6 | **Market price**: not too far above similar items (Channel3) | The user is asked |
| 7 | **Budget**: fits what is left this period | The user is asked |

Allowed purchases get a one-time permit for that exact cart and price; only then does Mandate use PayPal. Every decision is a signed, hash-chained receipt, and each one records how all 7 rules came out.

The gate is plain code, not a model: the same purchase always gets the same answer.
