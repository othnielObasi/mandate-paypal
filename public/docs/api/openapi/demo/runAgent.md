# Let the shopping agent carry out a task under a mandate (/docs/api/openapi/demo/runAgent)

`POST /api/agent/run`

The agent can only search, read and propose. Each proposal goes through the policy gate, which
pays, asks the user, or blocks. With `stream: true` the response is NDJSON, one step per line.


```yaml
openapi: 3.2.0
servers:
  - url: https://mandate-e13m.onrender.com
    description: Hosted demo (Render, PayPal sandbox)
  - url: http://localhost:3000
    description: Local (npm run dev)
security: []
paths:
  /api/agent/run:
    post:
      tags:
        - Demo
      operationId: runAgent
      summary: Let the shopping agent carry out a task under a mandate
      description: >
        The agent can only search, read and propose. Each proposal goes through
        the policy gate, which

        pays, asks the user, or blocks. With `stream: true` the response is
        NDJSON, one step per line.
      requestBody:
        required: true
        content:
          application/json:
            schema:
              $ref: "#/components/schemas/RunAgentRequest"
            example:
              mandateId: "{{mandateId}}"
              task: Buy washing-up liquid and sponges
      responses:
        "200":
          description: The run, with every step and the gate's decisions
          content:
            application/json:
              schema:
                $ref: "#/components/schemas/AgentRun"
        "404":
          $ref: "#/components/responses/NotFound"
        "429":
          $ref: "#/components/responses/RateLimited"
      x-apimatic-codeSamples:
        - lang: csharp
          label: C#
          sources:
            Example: |-
              try
              {
                  var response = await client.Demo.RunAgent(
                      new RunAgentOperationRequest
                      {
                          Body = new RunAgentRequest
                          {
                              MandateId = "{{mandateId}}",
                              Task = "Buy washing-up liquid and sponges",
                          },
                      });
                  // TODO: Handle 'response' of type AgentRun
              }
              catch (ApiException<RunAgentError> ex)
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
                  response = client.demo.run_agent(
                      RunAgentRequest(
                          mandate_id="{{mandateId}}",
                          task="Buy washing-up liquid and sponges",
                      ),
                  )
                  # TODO: Handle 'response' of type AgentRun
              except ApiError as e:
                  ...  # TODO: Handle 'e.error' of type RunAgentErrorBody
        - lang: typescript
          label: TypeScript
          sources:
            Example: >-
              try {
                const response = await client.demo.runAgent({
                  body: {
                    mandateId: "{{mandateId}}",
                    task: "Buy washing-up liquid and sponges",
                  },
                });
                // TODO: Handle 'response' of type AgentRun
              } catch (err) {
                // TODO: Handle 'err' of type Demo.RunAgentError, discriminated with 'err.payload.kind'
              }
components:
  securitySchemes:
    automationSecret:
      type: http
      scheme: bearer
      description: The server's AUTOMATION_SECRET (16+ characters), stored in the Zap.
  schemas:
    RunAgentRequest:
      type: object
      additionalProperties: false
      required:
        - mandateId
        - task
      properties:
        mandateId:
          type: string
        task:
          type: string
          maxLength: 500
        drill:
          type: boolean
          description: "Compromised-agent drill: a planner that obeys product pages."
        stream:
          type: boolean
          description: Stream NDJSON
          one step per line: null
    AgentRun:
      type: object
      properties:
        final:
          type: string
        stoppedBy:
          type: string
          enum:
            - end
            - step_limit
            - model_error
        events:
          type: array
          items:
            $ref: "#/components/schemas/AgentEvent"
    Error:
      type: object
      required:
        - error
      properties:
        error:
          type: string
    AgentEvent:
      type: object
      properties:
        kind:
          type: string
          enum:
            - text
            - tool
        text:
          type: string
        name:
          type: string
          example: propose_purchase
        input: {}
        ok:
          type: boolean
        result:
          description: For propose_purchase, a ProposeResult
  responses:
    NotFound:
      description: Not found
      content:
        application/json:
          schema:
            $ref: "#/components/schemas/Error"
          example:
            error: No agent payment mandate is on file for this PayPal order.
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