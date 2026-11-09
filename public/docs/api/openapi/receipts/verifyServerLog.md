# Verify the server's own log (/docs/api/openapi/receipts/verifyServerLog)

`GET /api/receipts/verify`

Re-checks every hash link and signature in the server's decision log.

```yaml
openapi: 3.2.0
servers:
  - url: https://mandate-e13m.onrender.com
    description: Hosted demo (Render, PayPal sandbox)
  - url: http://localhost:3000
    description: Local (npm run dev)
security: []
paths:
  /api/receipts/verify:
    get:
      tags:
        - Receipts
      operationId: verifyServerLog
      summary: Verify the server's own log
      description: Re-checks every hash link and signature in the server's decision log.
      responses:
        "200":
          description: Result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ChainResult"
      x-apimatic-codeSamples:
        - lang: csharp
          label: C#
          sources:
            Example: |-
              try
              {
                  var response = await client.Receipts.VerifyServerLog();
                  // TODO: Handle 'response' of type ChainResult
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
                  response = client.receipts.verify_server_log()
                  # TODO: Handle 'response' of type ChainResult
              except ApiError as e:
                  ...  # TODO: Handle 'e.error' of type RawError
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.receipts.verifyServerLog();
                // TODO: Handle 'response' of type ChainResult
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
    ChainResult:
      oneOf:
        - $ref: "#/components/schemas/ChainIntact"
        - $ref: "#/components/schemas/ChainBroken"
    ChainIntact:
      type: object
      required:
        - ok
        - count
      properties:
        ok:
          type: boolean
          description: Always true for an intact chain
        count:
          type: integer
    ChainBroken:
      type: object
      required:
        - ok
        - brokenAt
        - reason
      properties:
        ok:
          type: boolean
          description: Always false for a broken chain
        brokenAt:
          type: integer
          description: seq of the first altered receipt
        reason:
          type: string
          enum:
            - sequence_gap
            - chain_break
            - payload_mismatch
            - hash_mismatch
            - bad_signature
info:
  title: Mandate API
  version: 0.2.0
```