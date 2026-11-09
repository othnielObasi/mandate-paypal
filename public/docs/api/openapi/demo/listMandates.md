# The demo user's mandates (/docs/api/openapi/demo/listMandates)

`GET /api/mandates`

Every mandate the demo user has signed, with its rules and status (active, paused or revoked).

```yaml
openapi: 3.2.0
servers:
  - url: https://mandate-e13m.onrender.com
    description: Hosted demo (Render, PayPal sandbox)
  - url: http://localhost:3000
    description: Local (npm run dev)
security: []
paths:
  /api/mandates:
    get:
      tags:
        - Demo
      operationId: listMandates
      summary: The demo user's mandates
      description: Every mandate the demo user has signed, with its rules and status
        (active, paused or revoked).
      responses:
        "200":
          description: Mandates
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Mandate"
      x-apimatic-codeSamples:
        - lang: csharp
          label: C#
          sources:
            Example: |-
              try
              {
                  var response = await client.Demo.ListMandates();
                  // TODO: Handle 'response' of type IReadOnlyList<Mandate>
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
                  response = client.demo.list_mandates()
                  # TODO: Handle 'response' of type list[Mandate]
              except ApiError as e:
                  ...  # TODO: Handle 'e.error' of type RawError
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.demo.listMandates();
                // TODO: Handle 'response' of type Mandate[]
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
    Mandate:
      type: object
      properties:
        id:
          type: string
        userId:
          type: string
        status:
          type: string
          enum:
            - active
            - paused
            - revoked
        rawText:
          type: string
        createdAt:
          type: string
          format: date-time
        policy:
          $ref: "#/components/schemas/Policy"
    Policy:
      type: object
      description: The signed rules. Money is in minor units (cents).
      properties:
        categories:
          type: array
          items:
            type: string
        currency:
          type: string
          example: USD
        maxItemMinor:
          type: integer
        budget:
          $ref: "#/components/schemas/Budget"
        sellers:
          $ref: "#/components/schemas/SellerRules"
        overLimit:
          type: string
          enum:
            - ask
            - block
        maxPremiumPct:
          type:
            - integer
            - "null"
          description: Fair-price limit, % above market
        marketUnavailable:
          type: string
          enum:
            - ask
            - block
            - allow
        expires:
          type: string
          format: date
    Budget:
      type: object
      properties:
        amountMinor:
          type: integer
        period:
          type: string
          enum:
            - week
            - month
    SellerRules:
      type: object
      properties:
        verifiedOnly:
          type: boolean
        blocked:
          type: array
          items:
            type: string
info:
  title: Mandate API
  version: 0.2.0
```