# Verify a copy of the log you hold (/docs/api/openapi/receipts/verifyLogCopy)

`POST /api/receipts/verify`

Names the first altered entry (`brokenAt`) and why.

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
    post:
      tags:
        - Receipts
      operationId: verifyLogCopy
      summary: Verify a copy of the log you hold
      description: Names the first altered entry (`brokenAt`) and why.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/VerifyLogRequest"
      responses:
        "200":
          description: Result
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ChainResult"
              examples:
                intact:
                  value:
                    ok: true
                    count: 9
                tampered:
                  value:
                    ok: false
                    brokenAt: 3
                    reason: payload_mismatch
        "400":
          $ref: "#/components/responses/BadRequest"
      x-apimatic-codeSamples:
        - lang: csharp
          label: C#
          sources:
            Example: |-
              try
              {
                  var response = await client.Receipts.VerifyLogCopy(
                      new VerifyLogCopyRequest
                      {
                          Body = new VerifyLogRequest
                          {
                              Receipts = [
                                  new Receipt
                                  {
                                      Seq = 1,
                                      Type = "some example string",
                                      Summary = "some example string",
                                      PayloadHash = "some example string",
                                      CreatedAt = DateTimeOffset.Parse(
                                          "2024-01-15T09:30:00Z"),
                                      PrevHash = "some example string",
                                      Hash = "some example string",
                                      Signature = "some example string",
                                  },
                              ],
                          },
                      });
                  // TODO: Handle 'response' of type ChainResult
              }
              catch (ApiException<VerifyLogCopyError> ex)
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
                  response = client.receipts.verify_log_copy(
                      VerifyLogRequest(
                          receipts=[
                              Receipt(
                                  seq=1,
                                  type_="some example string",
                                  summary="some example string",
                                  payload_hash="some example string",
                                  created_at=datetime(
                                      2024,
                                      1,
                                      15,
                                      9,
                                      30,
                                      0,
                                      tzinfo=timezone.utc,
                                  ),
                                  prev_hash="some example string",
                                  hash="some example string",
                                  signature="some example string",
                              ),
                          ],
                      ),
                  )
                  # TODO: Handle 'response' of type ChainResult
              except ApiError as e:
                  # TODO: Handle 'e.error' of type VerifyLogCopyErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.receipts.verifyLogCopy({
                  body: {
                    receipts: [
                      {
                        seq: 1,
                        type: "some example string",
                        summary: "some example string",
                        payloadHash: "some example string",
                        createdAt: new Date(
                          Date.UTC(2024, 0, 15, 9, 30, 0),
                        ),
                        prevHash: "some example string",
                        hash: "some example string",
                        signature: "some example string",
                      },
                    ],
                  },
                });
                // TODO: Handle 'response' of type ChainResult
              } catch (err) {
                // TODO: Handle 'err' of type Receipts.VerifyLogCopyError, discriminated with 'err.payload.kind'
              }
components:
  securitySchemes:
    automationSecret:
      type: http
      scheme: bearer
      description: The server's AUTOMATION_SECRET (16+ characters), stored in the Zap.
  schemas:
    VerifyLogRequest:
      type: object
      required:
        - receipts
      properties:
        receipts:
          type: array
          maxItems: 5000
          items:
            $ref: "#/components/schemas/Receipt"
    ChainResult:
      oneOf:
        - $ref: "#/components/schemas/ChainIntact"
        - $ref: "#/components/schemas/ChainBroken"
    Error:
      type: object
      required:
        - error
      properties:
        error:
          type: string
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