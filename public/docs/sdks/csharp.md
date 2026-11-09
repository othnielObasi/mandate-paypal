# C# SDK (/docs/sdks/csharp)

[Download SDK](/docs/__downloads/sdk/csharp.zip)

## Intro [#intro]

The Mandate API SDK provides access to the Mandate API REST APIs.

Mandate is an authorisation layer for AI-agent payments on PayPal. Every agent payment carries
AP2 v0.2 mandates (the customer's signed limits, the merchant's signed checkout, the agent's closed
mandates) and signed receipts. The **Verification** endpoints let a seller, PayPal or a dispute
reviewer check a payment with public keys alone. The **Demo** endpoints drive the same flow the app
uses: sign rules, let the agent shop, approve over-limit purchases.

Sandbox only. No real money moves. Without keys the server runs fully offline with simulated
PayPal order IDs (`SIM-…`); with PayPal sandbox keys the IDs are real sandbox order IDs.

## Installation [#installation]

Add the SDK as a project reference into your solution:

```bash
dotnet add reference <path-to-sdk>/src/MandateApi/MandateApi.csproj
```

The project takes its build settings from the files around it, so reference it in place.

## Quick Start [#quick-start]

### Dependency Injection [#dependency-injection]

Register the client with `IServiceCollection` and resolve it from the container. The `HttpClient` is managed by `IHttpClientFactory`. Configure the client's behavior through `MandateApiClientOptions`.

```csharp
services.AddMandateApiClient(options =>
{
    options.AutomationSecret = "YOUR_BEARER_TOKEN";
    options.Environment = ServerEnvironment.Production;
    // TODO: configure more client options here
});
```

### Direct Instantiation [#direct-instantiation]

Create the client by passing an `HttpClient` you manage yourself. Configure the client's behavior through `MandateApiClientOptions`.

```csharp
var httpClient = new HttpClient();
// TODO: configure more client options here
var options = new MandateApiClientOptions
{
    AutomationSecret = "YOUR_BEARER_TOKEN",
    Environment = ServerEnvironment.Production,
};
var client = new MandateApiClient(httpClient, options);
```