# Verdict for an agent payment (/docs/api/openapi/verification/verifyOrder)

`GET /api/verify/{paypalOrderId}`

Is this PayPal order backed by a mandate the buyer signed? Returns the Mandate v1 checks
(Intent, Cart and Payment Mandates, Ed25519), the `paypal_order_record` check (PayPal's own
order record, read with the PayPal Server SDK, shows the signed amount captured), and the
AP2 v0.2 verdict in `ap2`.
Fulfil only when `ok` and `ap2.ok` are both true.


```yaml
openapi: 3.2.0
servers:
  - url: https://mandate-e13m.onrender.com
    description: Hosted demo (Render, PayPal sandbox)
  - url: http://localhost:3000
    description: Local (npm run dev)
security: []
paths:
  /api/verify/{paypalOrderId}:
    get:
      tags:
        - Verification
      operationId: verifyOrder
      summary: Verdict for an agent payment
      description: >
        Is this PayPal order backed by a mandate the buyer signed? Returns the
        Mandate v1 checks

        (Intent, Cart and Payment Mandates, Ed25519), the `paypal_order_record`
        check (PayPal's own

        order record, read with the PayPal Server SDK, shows the signed amount
        captured), and the

        AP2 v0.2 verdict in `ap2`.

        Fulfil only when `ok` and `ap2.ok` are both true.
      parameters:
        - $ref: "#/components/parameters/PayPalOrderId"
      responses:
        "200":
          description: Verdict. Check `ok`; a 200 does not mean the payment is valid.
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/OrderVerdict"
        "404":
          $ref: "#/components/responses/NotFound"
      x-apimatic-codeSamples:
        - lang: csharp
          label: C#
          sources:
            Example: |-
              try
              {
                  var response = await client.Verification.VerifyOrder(
                      new VerifyOrderRequest
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
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.verification.verify_order(
                      "5O190127TN364715T"
                  )
                  # TODO: Handle 'response' of type OrderVerdict
              except ApiError as e:
                  # TODO: Handle 'e.error' of type VerifyOrderErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.verification.verifyOrder({
                  paypalOrderId: "5O190127TN364715T",
                });
                // TODO: Handle 'response' of type OrderVerdict
              } catch (err) {
                // TODO: Handle 'err' of type Verification.VerifyOrderError, discriminated with 'err.payload.kind'
              }
components:
  securitySchemes:
    automationSecret:
      type: http
      scheme: bearer
      description: The server's AUTOMATION_SECRET (16+ characters), stored in the Zap.
  parameters:
    PayPalOrderId:
      name: paypalOrderId
      in: path
      required: true
      description: PayPal order ID (sandbox), or `SIM-…` in offline mode.
      schema:
        type: string
        example: 5O190127TN364715T
  schemas:
    OrderVerdict:
      allOf:
        - $ref: "#/components/schemas/ChainVerdict"
        - $ref: "#/components/schemas/OrderDetails"
    Error:
      type: object
      required:
        - error
      properties:
        error:
          type: string
    ChainVerdict:
      type: object
      required:
        - ok
        - checks
      properties:
        ok:
          type: boolean
        checks:
          type: array
          items:
            $ref: "#/components/schemas/Check"
        notes:
          type: array
          items:
            type: string
    OrderDetails:
      type: object
      properties:
        paypalOrderId:
          type: string
        paymentMandateId:
          type: string
        mode:
          type: string
          enum:
            - human_not_present
            - human_present
        merchant:
          type: string
        total:
          type: string
          example: USD 4.50
        items:
          type: array
          items:
            type: string
        createdAt:
          type: string
          format: date-time
        chain:
          $ref: "#/components/schemas/CredentialChain"
        ap2:
          oneOf:
            - $ref: "#/components/schemas/Ap2Verdict"
            - type: "null"
    CredentialChain:
      type: object
      description: Mandate v1 credentials (Ed25519 JWS). Post them to `/api/verify` to
        re-check.
      properties:
        intent:
          type: object
        cart:
          type: object
        payment:
          type: object
    Ap2Verdict:
      type: object
      required:
        - spec
        - ok
        - checks
        - evidence
      properties:
        spec:
          type: string
          const: ap2/0.2
        paypalOrderId:
          type: string
        ok:
          type: boolean
          description: Safe to fulfil only when true
        mode:
          type: string
          enum:
            - human_not_present
            - human_present
        checks:
          type: array
          description: >
            checkout_signed, checkout_chain, checkout_hash,
            checkout_constraints, payment_chain,

            payment_matches_checkout, payment_constraints, checkout_receipt,
            payment_receipt,

            and passkey_approval when the buyer approved on their device.
          items:
            $ref: "#/components/schemas/Check"
        amount:
          $ref: "#/components/schemas/Money"
        merchant:
          $ref: "#/components/schemas/MerchantRef"
        evidence:
          $ref: "#/components/schemas/Ap2Evidence"
    Check:
      type: object
      required:
        - id
        - label
        - ok
        - detail
      properties:
        id:
          type: string
          example: checkout_signed
        label:
          type: string
          example: Checkout signed by the merchant
        ok:
          type: boolean
        detail:
          type: string
    Money:
      type: object
      properties:
        amount:
          type: integer
          description: Minor units (cents)
        currency:
          type: string
          example: USD
    MerchantRef:
      type: object
      properties:
        id:
          type: string
        name:
          type: string
    Ap2Evidence:
      type: object
      properties:
        spec:
          type: string
          const: ap2/0.2
        mode:
          type: string
        checkoutJwt:
          type: string
          description: Merchant-signed UCP checkout (ES256 JWT)
        checkoutChain:
          type: string
          description: Checkout Mandate SD-JWT chain
        paymentChain:
          type: string
          description: Payment Mandate SD-JWT chain
        context:
          $ref: "#/components/schemas/BudgetContext"
        checkoutReceipt:
          type: string
          description: Merchant receipt (ES256 JWT)
        paymentReceipt:
          type: string
          description: Payment gateway receipt with PayPal order and capture IDs (ES256 JWT)
        openCheckoutHash:
          type: string
        passkey:
          type: object
          description: WebAuthn assertion, present when the buyer approved on their device
    BudgetContext:
      type: object
      description: Budget already used in the period, for the budget constraint
      properties:
        totalAmount:
          type: integer
        totalUses:
          type: integer
  responses:
    NotFound:
      description: Not found
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
          example:
            error: No agent payment mandate is on file for this PayPal order.
info:
  title: Mandate API
  version: 0.2.0
```