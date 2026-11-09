# Verify a Mandate v1 credential chain you hold (/docs/api/openapi/verification/verifyChain)

`POST /api/verify`

Checks an Intent, Cart and Payment Mandate chain against the published keys.

```yaml
openapi: 3.2.0
servers:
  - url: https://mandate-e13m.onrender.com
    description: Hosted demo (Render, PayPal sandbox)
  - url: http://localhost:3000
    description: Local (npm run dev)
security: []
paths:
  /api/verify:
    post:
      tags:
        - Verification
      operationId: verifyChain
      summary: Verify a Mandate v1 credential chain you hold
      description: Checks an Intent, Cart and Payment Mandate chain against the
        published keys.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/VerifyChainRequest"
      responses:
        "200":
          description: Verdict
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ChainVerdict"
        "400":
          $ref: "#/components/responses/BadRequest"
      x-apimatic-codeSamples:
        - lang: csharp
          label: C#
          sources:
            Example: |-
              try
              {
                  var response = await client.Verification.VerifyChain(
                      new VerifyChainOperationRequest
                      {
                          Body = new VerifyChainRequest
                          {
                              Intent = intent,
                              Cart = cart,
                              Payment = payment,
                          },
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
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.verification.verify_chain(
                      VerifyChainRequest(intent={}, cart={}, payment={})
                  )
                  # TODO: Handle 'response' of type ChainVerdict
              except ApiError as e:
                  # TODO: Handle 'e.error' of type VerifyChainErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.verification.verifyChain({
                  body: { intent: {}, cart: {}, payment: {} },
                });
                // TODO: Handle 'response' of type ChainVerdict
              } catch (err) {
                // TODO: Handle 'err' of type Verification.VerifyChainError, discriminated with 'err.payload.kind'
              }
components:
  securitySchemes:
    automationSecret:
      type: http
      scheme: bearer
      description: The server's AUTOMATION_SECRET (16+ characters), stored in the Zap.
  schemas:
    VerifyChainRequest:
      type: object
      additionalProperties: false
      required:
        - intent
        - cart
        - payment
      properties:
        intent:
          type: object
          description: Intent Mandate as returned in `chain.intent`
        cart:
          type: object
          description: Cart Mandate as returned in `chain.cart`
        payment:
          type: object
          description: Payment Mandate as returned in `chain.payment`
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
  responses:
    BadRequest:
      description: Malformed request
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
info:
  title: Mandate API
  version: 0.2.0
```