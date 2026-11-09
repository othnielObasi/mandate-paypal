# Sign spending rules (/docs/api/openapi/demo/createMandate)

`POST /api/mandates`

With only `text`, the rules reader (the configured model, or the offline reader) turns the
sentence into a policy and Mandate signs it. With `policy`, the rules the user reviewed are
validated and signed. Rate limited when the model is called.


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
    post:
      tags:
        - Demo
      operationId: createMandate
      summary: Sign spending rules
      description: >
        With only `text`, the rules reader (the configured model, or the offline
        reader) turns the

        sentence into a policy and Mandate signs it. With `policy`, the rules
        the user reviewed are

        validated and signed. Rate limited when the model is called.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/CreateMandateRequest"
            example:
              text: Household basics, up to $80 a month, nothing over $25, never more than 10%
                above market price, verified sellers only
      responses:
        "201":
          description: The signed mandate
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Mandate"
        "400":
          $ref: "#/components/responses/BadRequest"
        "422":
          $ref: "#/components/responses/Unprocessable"
        "429":
          $ref: "#/components/responses/RateLimited"
      x-apimatic-codeSamples:
        - lang: csharp
          label: C#
          sources:
            Example: >-
              try

              {
                  var response = await client.Demo.CreateMandate(
                      new CreateMandateOperationRequest
                      {
                          Body = new CreateMandateRequest
                          {
                              Text = "Household basics, up to $80 a month, nothing over $25, never more than 10% above market price, verified sellers only",
                          },
                      });
                  // TODO: Handle 'response' of type Mandate
              }

              catch (ApiException<CreateMandateError> ex)

              {
                  if (ex.Error.TryGetError(out var error))
                  {
                      // TODO: Handle 'error' of type Error
                  }
              }
        - lang: python
          label: Python
          sources:
            Example: >-
              try:
                  response = client.demo.create_mandate(
                      CreateMandateRequest(
                          text="Household basics, up to $80 a month, nothing over $25, never more than 10% above market price, verified sellers only",
                      ),
                  )
                  # TODO: Handle 'response' of type Mandate
              except ApiError as e:
                  # TODO: Handle 'e.error' of type CreateMandateErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.demo.createMandate({
                  body: {
                    text: "Household basics, up to $80 a month, nothing over $25, never more than 10% above market price, verified sellers only",
                  },
                });
                // TODO: Handle 'response' of type Mandate
              } catch (err) {
                // TODO: Handle 'err' of type Demo.CreateMandateError, discriminated with 'err.payload.kind'
              }
components:
  securitySchemes:
    automationSecret:
      type: http
      scheme: bearer
      description: The server's AUTOMATION_SECRET (16+ characters), stored in the Zap.
  schemas:
    CreateMandateRequest:
      type: object
      additionalProperties: false
      required:
        - text
      properties:
        text:
          type: string
          maxLength: 2000
          description: The rules in plain English
        policy:
          $ref: "#/components/schemas/Policy"
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
    Error:
      type: object
      required:
        - error
      properties:
        error:
          type: string
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
  responses:
    BadRequest:
      description: Malformed request
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
    Unprocessable:
      description: The rules could not be read or are invalid
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
    RateLimited:
      description: Too many requests to routes that call the model
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
info:
  title: Mandate API
  version: 0.2.0
```