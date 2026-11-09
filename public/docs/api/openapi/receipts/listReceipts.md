# The signed, hash-chained decision log (/docs/api/openapi/receipts/listReceipts)

`GET /api/receipts`

Every decision Mandate made, in order. Each receipt carries the hash of the one before it and an
Ed25519 signature, so any edit, insertion or deletion breaks the chain.


```yaml
openapi: 3.2.0
servers:
  - url: https://mandate-e13m.onrender.com
    description: Hosted demo (Render, PayPal sandbox)
  - url: http://localhost:3000
    description: Local (npm run dev)
security: []
paths:
  /api/receipts:
    get:
      tags:
        - Receipts
      operationId: listReceipts
      summary: The signed, hash-chained decision log
      description: >
        Every decision Mandate made, in order. Each receipt carries the hash of
        the one before it and an

        Ed25519 signature, so any edit, insertion or deletion breaks the chain.
      parameters:
        - name: mandateId
          in: query
          required: false
          description: Only this mandate's receipts. Omit for the whole log.
          schema:
            type: string
      responses:
        "200":
          description: Receipts in order
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Receipt"
      x-apimatic-codeSamples:
        - lang: csharp
          label: C#
          sources:
            Example: |-
              try
              {
                  var response = await client.Receipts.ListReceipts(
                      new ListReceiptsRequest());
                  // TODO: Handle 'response' of type IReadOnlyList<Receipt>
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
                  response = client.receipts.list_receipts()
                  # TODO: Handle 'response' of type list[Receipt]
              except ApiError as e:
                  ...  # TODO: Handle 'e.error' of type RawError
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.receipts.listReceipts();
                // TODO: Handle 'response' of type Receipt[]
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
    Receipt:
      type: object
      required:
        - seq
        - type
        - summary
        - payloadHash
        - createdAt
        - prevHash
        - hash
        - signature
      properties:
        seq:
          type: integer
        mandateId:
          type: string
        type:
          type: string
          example: decision
        summary:
          type: string
        payload: {}
        payloadHash:
          type: string
        createdAt:
          type: string
          format: date-time
        prevHash:
          type: string
        hash:
          type: string
        signature:
          type: string
          description: Ed25519 over `hash`, verify with /api/public-key
info:
  title: Mandate API
  version: 0.2.0
```