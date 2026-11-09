# AP2 v0.2 evidence pack for a PayPal order (/docs/api/openapi/verification/getAp2Evidence)

`GET /api/ap2/orders/{paypalOrderId}`

The merchant-signed checkout JWT, the Checkout and Payment Mandate chains (SD-JWT, ES256),
the checkout and payment receipts, budget context, the passkey assertion if the buyer approved
on their device, and every check with its result. Verify independently with `/api/ap2/jwks`.


```yaml
openapi: 3.2.0
servers:
  - url: https://mandate-e13m.onrender.com
    description: Hosted demo (Render, PayPal sandbox)
  - url: http://localhost:3000
    description: Local (npm run dev)
security: []
paths:
  /api/ap2/orders/{paypalOrderId}:
    get:
      tags:
        - Verification
      operationId: getAp2Evidence
      summary: AP2 v0.2 evidence pack for a PayPal order
      description: >
        The merchant-signed checkout JWT, the Checkout and Payment Mandate
        chains (SD-JWT, ES256),

        the checkout and payment receipts, budget context, the passkey assertion
        if the buyer approved

        on their device, and every check with its result. Verify independently
        with `/api/ap2/jwks`.
      parameters:
        - $ref: "#/components/parameters/PayPalOrderId"
      responses:
        "200":
          description: Evidence pack and verdict
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Ap2Verdict"
        "404":
          $ref: "#/components/responses/NotFound"
      x-apimatic-codeSamples:
        - lang: csharp
          label: C#
          sources:
            Example: |-
              try
              {
                  var response = await client.Verification.GetAp2Evidence(
                      new GetAp2EvidenceRequest
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
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.verification.get_ap2_evidence(
                      "5O190127TN364715T"
                  )
                  # TODO: Handle 'response' of type Ap2Verdict
              except ApiError as e:
                  # TODO: Handle 'e.error' of type GetAp2EvidenceErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.verification.getAp2Evidence(
                  { paypalOrderId: "5O190127TN364715T" },
                );
                // TODO: Handle 'response' of type Ap2Verdict
              } catch (err) {
                // TODO: Handle 'err' of type Verification.GetAp2EvidenceError, discriminated with 'err.payload.kind'
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
    Error:
      type: object
      required:
        - error
      properties:
        error:
          type: string
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