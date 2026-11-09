# ES256 public keys (JWKS) for every AP2 credential (/docs/api/openapi/keys/getAp2Jwks)

`GET /api/ap2/jwks`

Provider, agent, payment gateway, merchants and users. Look keys up by `kid`.

```yaml
openapi: 3.2.0
servers:
  - url: https://mandate-e13m.onrender.com
    description: Hosted demo (Render, PayPal sandbox)
  - url: http://localhost:3000
    description: Local (npm run dev)
security: []
paths:
  /api/ap2/jwks:
    get:
      tags:
        - Keys
      operationId: getAp2Jwks
      summary: ES256 public keys (JWKS) for every AP2 credential
      description: Provider, agent, payment gateway, merchants and users. Look keys up
        by `kid`.
      responses:
        "200":
          description: JWKS
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Jwks"
      x-apimatic-codeSamples:
        - lang: csharp
          label: C#
          sources:
            Example: |-
              try
              {
                  var response = await client.Keys.GetAp2Jwks();
                  // TODO: Handle 'response' of type Jwks
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
                  response = client.keys.get_ap2_jwks()
                  # TODO: Handle 'response' of type Jwks
              except ApiError as e:
                  ...  # TODO: Handle 'e.error' of type RawError
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.keys.getAp2Jwks();
                // TODO: Handle 'response' of type Jwks
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