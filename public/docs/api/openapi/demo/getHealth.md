# Server status and which services are live or simulated (/docs/api/openapi/demo/getHealth)

`GET /api/health`

Which integrations this server is running with: real PayPal sandbox or simulated payments, the
model behind the agent, where data is stored, and whether Zapier alerts and the kill switch are on.
Always sandbox-only.


```yaml
openapi: 3.2.0
servers:
  - url: https://mandate-e13m.onrender.com
    description: Hosted demo (Render, PayPal sandbox)
  - url: http://localhost:3000
    description: Local (npm run dev)
security: []
paths:
  /api/health:
    get:
      tags:
        - Demo
      operationId: getHealth
      summary: Server status and which services are live or simulated
      description: >
        Which integrations this server is running with: real PayPal sandbox or
        simulated payments, the

        model behind the agent, where data is stored, and whether Zapier alerts
        and the kill switch are on.

        Always sandbox-only.
      responses:
        "200":
          description: Status
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/Health"
              example:
                ok: true
                provider: simulated
                model: offline-planner
                modelProvider: offline
                signingKey: ephemeral
                storage: memory
                market: simulated market
                web: own-pages
                automation:
                  alerts: off
                  killSwitch: off
                sandboxOnly: true
      x-apimatic-codeSamples:
        - lang: csharp
          label: C#
          sources:
            Example: |-
              try
              {
                  var response = await client.Demo.GetHealth();
                  // TODO: Handle 'response' of type Health
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
                  response = client.demo.get_health()
                  # TODO: Handle 'response' of type Health
              except ApiError as e:
                  ...  # TODO: Handle 'e.error' of type RawError
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.demo.getHealth();
                // TODO: Handle 'response' of type Health
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
    Health:
      type: object
      properties:
        ok:
          type: boolean
        provider:
          type: string
          description: "`paypal-agent-toolkit` with sandbox keys, else `simulated`"
        model:
          type: string
          description: Model ID (muse-spark-1.3, claude-sonnet-5-5…), or `offline-planner`
        modelProvider:
          type: string
          enum:
            - Meta Model API
            - Claude API
            - offline
        signingKey:
          type: string
          enum:
            - configured
            - ephemeral
        storage:
          type: string
          enum:
            - postgres
            - memory
        market:
          type: string
        web:
          type: string
          enum:
            - kernel
            - own-pages
          description: KERNEL cloud browser, or only the app's own /demo pages
        automation:
          $ref: "#/components/schemas/AutomationStatus"
        sandboxOnly:
          type: boolean
          description: Always true. Mandate never moves real money.
    AutomationStatus:
      type: object
      properties:
        alerts:
          type: string
          enum:
            - zapier
            - off
        killSwitch:
          type: string
          enum:
            - on
            - off
info:
  title: Mandate API
  version: 0.2.0
```