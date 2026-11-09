# Approve or decline a purchase (/docs/api/openapi/demo/decideApproval)

`POST /api/approvals/{id}`

If the user has a passkey, approving needs a WebAuthn assertion over this exact cart
(challenge from `GET /api/approvals/{id}/passkey`). Hard rules (category, seller, injected
instructions) can never be approved through.


```yaml
openapi: 3.2.0
servers:
  - url: https://mandate-e13m.onrender.com
    description: Hosted demo (Render, PayPal sandbox)
  - url: http://localhost:3000
    description: Local (npm run dev)
security: []
paths:
  /api/approvals/{id}:
    post:
      tags:
        - Demo
      operationId: decideApproval
      summary: Approve or decline a purchase
      description: >
        If the user has a passkey, approving needs a WebAuthn assertion over
        this exact cart

        (challenge from `GET /api/approvals/{id}/passkey`). Hard rules
        (category, seller, injected

        instructions) can never be approved through.
      parameters:
        - name: id
          in: path
          required: true
          description: The approval ID from `listApprovals` or the agent run.
          schema:
            type: string
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/DecideApprovalRequest"
      responses:
        "200":
          description: Outcome
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/ProposeResult"
        "403":
          description: Passkey missing or invalid
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"
        "404":
          $ref: "#/components/responses/NotFound"
        "409":
          description: Already decided
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"
        "410":
          description: Expired
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"
      x-apimatic-codeSamples:
        - lang: csharp
          label: C#
          sources:
            Example: |-
              try
              {
                  var response = await client.Demo.DecideApproval(
                      new DecideApprovalOperationRequest
                      {
                          Id = "some example string",
                          Body = new DecideApprovalRequest
                          {
                              Choice = Choice.Approve,
                          },
                      });
                  // TODO: Handle 'response' of type ProposeResult
              }
              catch (ApiException<DecideApprovalError> ex)
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
                  response = client.demo.decide_approval(
                      "some example string",
                      DecideApprovalRequest(choice=Choice.APPROVE),
                  )
                  # TODO: Handle 'response' of type ProposeResult
              except ApiError as e:
                  # TODO: Handle 'e.error' of type DecideApprovalErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.demo.decideApproval({
                  id: "some example string",
                  body: { choice: Choice.Approve },
                });
                // TODO: Handle 'response' of type ProposeResult
              } catch (err) {
                // TODO: Handle 'err' of type Demo.DecideApprovalError, discriminated with 'err.payload.kind'
              }
components:
  securitySchemes:
    automationSecret:
      type: http
      scheme: bearer
      description: The server's AUTOMATION_SECRET (16+ characters), stored in the Zap.
  schemas:
    DecideApprovalRequest:
      type: object
      additionalProperties: false
      required:
        - choice
      properties:
        choice:
          type: string
          enum:
            - approve
            - decline
        passkey:
          $ref: "#/components/schemas/PasskeyAssertion"
    ProposeResult:
      type: object
      required:
        - status
      properties:
        status:
          type: string
          enum:
            - paid
            - awaiting_buyer
            - pending_approval
            - blocked
            - declined
            - failed
        decision:
          $ref: "#/components/schemas/Decision"
        paypalOrderId:
          type: string
        amountMinor:
          type: integer
        paymentMandateId:
          type: string
        approvalId:
          type: string
        approveUrl:
          type: string
          description: PayPal buyer approval link (sandbox mode)
        error:
          type: string
    Error:
      type: object
      required:
        - error
      properties:
        error:
          type: string
    Decision:
      type: object
      properties:
        outcome:
          type: string
          enum:
            - allow
            - approve
            - block
        rule:
          type: string
          example: item_cap
        reason:
          type: string
    PasskeyAssertion:
      type: object
      description: A WebAuthn assertion over the approval's challenge (base64url fields).
      additionalProperties: false
      required:
        - credentialId
        - clientDataJSON
        - authenticatorData
        - signature
      properties:
        credentialId:
          type: string
        clientDataJSON:
          type: string
        authenticatorData:
          type: string
        signature:
          type: string
  responses:
    NotFound:
      description: Not found
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
          example:
            error: No agent payment mandate is on file for this PayPal order.
info:
  title: Mandate API
  version: 0.2.0
```