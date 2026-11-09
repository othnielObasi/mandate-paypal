# Ed25519 public key that signs receipts and permits (/docs/api/openapi/keys/getReceiptPublicKey)

`GET /api/public-key`

The PEM public key for checking the `signature` on every receipt in the decision log.

```yaml
openapi: 3.2.0
servers:
  - url: https://mandate-e13m.onrender.com
    description: Hosted demo (Render, PayPal sandbox)
  - url: http://localhost:3000
    description: Local (npm run dev)
security: []
paths:
  /api/public-key:
    get:
      tags:
        - Keys
      operationId: getReceiptPublicKey
      summary: Ed25519 public key that signs receipts and permits
      description: The PEM public key for checking the `signature` on every receipt in
        the decision log.
      responses:
        "200":
          description: PEM public key
          content:
            application/x-pem-file:
              schema:
                type: string
      x-apimatic-codeSamples:
        - lang: csharp
          label: C#
          sources:
            Example: |-
              try
              {
                  await client.Keys.GetReceiptPublicKey();
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
                  client.keys.get_receipt_public_key()
              except ApiError as e:
                  ...  # TODO: Handle 'e.error' of type RawError
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                await client.keys.getReceiptPublicKey();
              } catch (err) {
                // TODO: Handle 'err' of type ApiError, where 'err.payload' is always the Undeclared arm
              }
components:
  securitySchemes:
    automationSecret:
      type: http
      scheme: bearer
      description: The server's AUTOMATION_SECRET (16+ characters), stored in the Zap.
info:
  title: Mandate API
  version: 0.2.0
```