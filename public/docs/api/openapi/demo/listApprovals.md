# Purchases waiting for the user (/docs/api/openapi/demo/listApprovals)

`GET /api/approvals`

Purchases the gate sent to the user (over a soft limit), with when each request expires.

```yaml
openapi: 3.2.0
servers:
  - url: https://mandate-e13m.onrender.com
    description: Hosted demo (Render, PayPal sandbox)
  - url: http://localhost:3000
    description: Local (npm run dev)
security: []
paths:
  /api/approvals:
    get:
      tags:
        - Demo
      operationId: listApprovals
      summary: Purchases waiting for the user
      description: Purchases the gate sent to the user (over a soft limit), with when
        each request expires.
      parameters:
        - name: mandateId
          in: query
          required: false
          description: Only this mandate's approvals. Omit for all.
          schema:
            type: string
      responses:
        "200":
          description: Pending approvals
          content:
            application/json:
              schema:
                type: array
                items:
                  $ref: "#/components/schemas/Approval"
      x-apimatic-codeSamples:
        - lang: csharp
          label: C#
          sources:
            Example: |-
              try
              {
                  var response = await client.Demo.ListApprovals(
                      new ListApprovalsRequest());
                  // TODO: Handle 'response' of type IReadOnlyList<Approval>
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
                  response = client.demo.list_approvals()
                  # TODO: Handle 'response' of type list[Approval]
              except ApiError as e:
                  ...  # TODO: Handle 'e.error' of type RawError
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.demo.listApprovals();
                // TODO: Handle 'response' of type Approval[]
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
    Approval:
      type: object
      properties:
        id:
          type: string
        mandateId:
          type: string
        status:
          type: string
        expiresAt:
          type: string
          format: date-time
info:
  title: Mandate API
  version: 0.2.0
```