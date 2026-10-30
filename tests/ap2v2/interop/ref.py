"""Bridge to Google's AP2 reference SDK for interop tests.

Reads one JSON request on stdin, writes one JSON result on stdout.
  {"op": "verify_payment", "chain": str, "root_jwk": dict, "open_checkout_hash": str?, "context": dict?}
  {"op": "verify_checkout", "chain": str, "root_jwk": dict, "checkout_jwt": str}
  {"op": "make_payment"}  -> {"chain", "root_jwk", "open_checkout_hash"}
"""

import json
import sys

from ap2.sdk.checkout_mandate_chain import CheckoutMandateChain
from ap2.sdk.constraints import MandateContext
from ap2.sdk.generated.open_payment_mandate import AllowedPayees, AmountRange, OpenPaymentMandate, PaymentReference
from ap2.sdk.generated.payment_mandate import PaymentMandate
from ap2.sdk.generated.types.amount import Amount
from ap2.sdk.generated.types.merchant import Merchant
from ap2.sdk.generated.types.payment_instrument import PaymentInstrument
from ap2.sdk.mandate import MandateClient
from ap2.sdk.payment_mandate_chain import PaymentMandateChain
from jwcrypto.jwk import JWK


def main() -> None:
    req = json.load(sys.stdin)
    client = MandateClient()
    op = req["op"]
    if op in ("verify_payment", "verify_checkout"):
        root = JWK(**req["root_jwk"])
        payloads = client.verify(token=req["chain"], key_or_provider=lambda _t: root)
        if op == "verify_payment":
            chain = PaymentMandateChain.parse(payloads)
            ctx = MandateContext(**req["context"]) if req.get("context") else None
            violations = chain.verify(expected_open_checkout_hash=req.get("open_checkout_hash"), mandate_context=ctx)
        else:
            chain = CheckoutMandateChain.parse(payloads)
            violations = chain.verify(checkout_jwt=req["checkout_jwt"])
        print(json.dumps({"payloads": payloads, "violations": violations}, default=str))
        return
    if op == "make_payment":
        provider = JWK.generate(kty="EC", crv="P-256", kid="ref-provider")
        agent = JWK.generate(kty="EC", crv="P-256")
        open_tok = client.create(
            payloads=[
                OpenPaymentMandate(
                    constraints=[
                        AmountRange(currency="USD", min=0, max=2500),
                        AllowedPayees(allowed=[Merchant(id="acme-supplies", name="Acme Supplies")]),
                        PaymentReference(conditional_transaction_id="ref-open-checkout"),
                    ],
                    cnf={"jwk": json.loads(agent.export_public())},
                )
            ],
            issuer_key=provider,
        )
        chain = client.present(
            holder_key=agent,
            mandate_token=open_tok,
            payloads=[
                PaymentMandate(
                    transaction_id="tx-ref",
                    payee=Merchant(id="acme-supplies", name="Acme Supplies"),
                    payment_amount=Amount(amount=450, currency="USD"),
                    payment_instrument=PaymentInstrument(id="paypal-wallet", type="paypal"),
                )
            ],
            aud="paypal",
            nonce="ref-nonce",
        )
        print(json.dumps({"chain": chain, "root_jwk": json.loads(provider.export_public()), "open_checkout_hash": "ref-open-checkout"}))
        return
    raise SystemExit(f"unknown op {op}")


if __name__ == "__main__":
    main()
