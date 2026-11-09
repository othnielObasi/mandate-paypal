# All public keys, Mandate v1 (Ed25519 PEM) and AP2 v0.2 (JWKS) (/docs/api/openapi/keys/getTrust)

`GET /api/trust`

The full trust bundle in one call: users' and merchants' Ed25519 keys (with each merchant's
verified status), the platform key, and the AP2 JWKS. Cache it to verify payments offline.


```yaml
openapi: 3.2.0
servers:
  - url: https://mandate-e13m.onrender.com
    description: Hosted demo (Render, PayPal sandbox)
  - url: http://localhost:3000
    description: Local (npm run dev)
security: []
paths:
  /api/trust:
    get:
      tags:
        - Keys
      operationId: getTrust
      summary: All public keys, Mandate v1 (Ed25519 PEM) and AP2 v0.2 (JWKS)
      description: >
        The full trust bundle in one call: users' and merchants' Ed25519 keys
        (with each merchant's

        verified status), the platform key, and the AP2 JWKS. Cache it to verify
        payments offline.
      responses:
        "200":
          description: Keys
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Trust"
      x-apimatic-codeSamples:
        - lang: csharp
          label: C#
          sources:
            Example: |-
              try
              {
                  var response = await client.Keys.GetTrust();
                  // TODO: Handle 'response' of type Trust
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
                  response = client.keys.get_trust()
                  # TODO: Handle 'response' of type Trust
              except ApiError as e:
                  ...  # TODO: Handle 'e.error' of type RawError
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.keys.getTrust();
                // TODO: Handle 'response' of type Trust
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
    Trust:
      type: object
      properties:
        users:
          type: object
          additionalProperties:
            type: string
            description: Ed25519 PEM
        merchants:
          type: object
          additionalProperties:
            $ref: "#/components/schemas/TrustedMerchant"
        platform:
          type: string
          description: Ed25519 PEM
        ap2:
          $ref: "#/components/schemas/Jwks"
    TrustedMerchant:
      type: object
      properties:
        publicKey:
          type: string
        verified:
          type: boolean
        name:
          type: string
    Jwks:
      type: object
      required:
        - keys
      properties:
        keys:
          type: array
          items:
            $ref: "#/components/schemas/Jwk"
    Jwk:
      type: object
      required:
        - kty
        - crv
        - x
        - y
        - kid
      properties:
        kty:
          type: string
          const: EC
        crv:
          type: string
          const: P-256
        x:
          type: string
        y:
          type: string
        kid:
          type: string
          example: mandate-provider
        alg:
          type: string
          const: ES256
        use:
          type: string
          const: sig
info:
  title: Mandate API
  version: 0.2.0
```