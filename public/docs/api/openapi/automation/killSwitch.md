# Pause, resume or revoke spending from an automation (/docs/api/openapi/automation/killSwitch)

`POST /api/automation/kill-switch`

For a Zap such as "text STOP to pause every agent". Without `mandateId` it acts on all of the
user's mandates. Logged in the signed decision log as "via automation".


```yaml
openapi: 3.2.0
servers:
  - url: https://mandate-e13m.onrender.com
    description: Hosted demo (Render, PayPal sandbox)
  - url: http://localhost:3000
    description: Local (npm run dev)
security: []
paths:
  /api/automation/kill-switch:
    post:
      tags:
        - Automation
      operationId: killSwitch
      summary: Pause, resume or revoke spending from an automation
      description: >
        For a Zap such as "text STOP to pause every agent". Without `mandateId`
        it acts on all of the

        user's mandates. Logged in the signed decision log as "via automation".
      security:
        - automationSecret: []
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/KillSwitchRequest"
            example:
              action: pause
      responses:
        "200":
          description: The mandates that changed
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/KillSwitchResult"
        "400":
          $ref: "#/components/responses/BadRequest"
        "401":
          description: Missing or wrong bearer token
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Error"
        "404":
          $ref: "#/components/responses/NotFound"
        "503":
          description: Not configured (no AUTOMATION_SECRET)
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
                  var response = await client.Automation.KillSwitch(
                      new KillSwitchOperationRequest
                      {
                          Body = new KillSwitchRequest
                          {
                              Action = ActionEnum.Pause,
                          },
                      });
                  // TODO: Handle 'response' of type KillSwitchResult
              }
              catch (ApiException<KillSwitchError> ex)
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
                  response = client.automation.kill_switch(
                      KillSwitchRequest(action=Action.PAUSE)
                  )
                  # TODO: Handle 'response' of type KillSwitchResult
              except ApiError as e:
                  # TODO: Handle 'e.error' of type KillSwitchErrorBody
                  ...
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.automation.killSwitch({
                  body: { action: Action.Pause },
                });
                // TODO: Handle 'response' of type KillSwitchResult
              } catch (err) {
                // TODO: Handle 'err' of type Automation.KillSwitchError, discriminated with 'err.payload.kind'
              }
components:
  securitySchemes:
    automationSecret:
      type: http
      scheme: bearer
      description: The server's AUTOMATION_SECRET (16+ characters), stored in the Zap.
  schemas:
    KillSwitchRequest:
      type: object
      additionalProperties: false
      required:
        - action
      properties:
        action:
          type: string
          enum:
            - pause
            - resume
            - revoke
        mandateId:
          type: string
          description: Only this mandate. Omit for all of the user's mandates.
    KillSwitchResult:
      type: object
      properties:
        ok:
          type: boolean
        action:
          type: string
        status:
          type: string
          enum:
            - active
            - paused
            - revoked
        changed:
          type: array
          items:
            type: string
          description: IDs of the mandates that changed
    Error:
      type: object
      required:
        - error
      properties:
        error:
          type: string
  responses:
    BadRequest:
      description: Malformed request
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
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