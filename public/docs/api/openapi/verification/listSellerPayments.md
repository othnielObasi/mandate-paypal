# A merchant's agent payments with their verdicts (/docs/api/openapi/verification/listSellerPayments)

`GET /api/seller`

Every agent payment to a merchant, newest first, each with its Mandate v1 verdict and AP2 v0.2
result. A seller's queue of "safe to fulfil" and "don't ship" orders.


```yaml
openapi: 3.2.0
servers:
  - url: https://mandate-e13m.onrender.com
    description: Hosted demo (Render, PayPal sandbox)
  - url: http://localhost:3000
    description: Local (npm run dev)
security: []
paths:
  /api/seller:
    get:
      tags:
        - Verification
      operationId: listSellerPayments
      summary: A merchant's agent payments with their verdicts
      description: >
        Every agent payment to a merchant, newest first, each with its Mandate
        v1 verdict and AP2 v0.2

        result. A seller's queue of "safe to fulfil" and "don't ship" orders.
      parameters:
        - name: merchantId
          in: query
          required: false
          description: Only this merchant's payments. Omit for all.
          schema:
            type: string
            example: acme-supplies
      responses:
        "200":
          description: Payments, newest first
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/SellerPayment"
      x-apimatic-codeSamples:
        - lang: csharp
          label: C#
          sources:
            Example: >-
              try

              {
                  var response = await client.Verification.ListSellerPayments(
                      new ListSellerPaymentsRequest
                      {
                          MerchantId = "acme-supplies",
                      });
                  // TODO: Handle 'response' of type IReadOnlyList<SellerPayment>
              }

              catch (ApiException<RawError> ex)

              {
                  // TODO: Handle 'ex.Error' of type RawError
              }
        - lang: python
          label: Python
          sources:
            Example: |-
              try:
                  response = client.verification.list_seller_payments(
                      merchant_id="acme-supplies"
                  )
                  # TODO: Handle 'response' of type list[SellerPayment]
              except ApiError as e:
                  ...  # TODO: Handle 'e.error' of type RawError
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response =
                  await client.verification.listSellerPayments({
                    merchantId: "acme-supplies",
                  });
                // TODO: Handle 'response' of type SellerPayment[]
              } catch (err) {
                // TODO: Handle 'err' of type ApiError, where 'err.payload' is always the Undeclared arm
              }
components:
  securitySchemes:
    automationSecret:
      type: http
      scheme: bearer
      description: The server's AUTOMATION_SECRET (16+ characters), stored in the Zap.
  schemas:
    SellerPayment:
      allOf:
        - $ref: "#/components/schemas/ChainVerdict"
        - $ref: "#/components/schemas/SellerPaymentDetails"
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
    SellerPaymentDetails:
      type: object
      properties:
        paypalOrderId:
          type: string
        paymentMandateId:
          type: string
        mode:
          type: string
        merchant:
          type: string
        total:
          type: string
        items:
          type: array
          items:
            type: string
        createdAt:
          type: string
          format: date-time
        ap2:
          type:
            - boolean
            - "null"
          description: AP2 v0.2 verdict, null if no AP2 evidence
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
info:
  title: Mandate API
  version: 0.2.0
```