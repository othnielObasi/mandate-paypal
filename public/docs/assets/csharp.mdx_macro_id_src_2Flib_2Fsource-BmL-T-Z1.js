import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{t}from"./jsx-runtime-LKYXHABd.js";import{n,t as r}from"./server.browser-CRtpYEZZ.js";var i=e(t()),a={title:`C# SDK`,description:`Install and start using the C# SDK.`};function o(e){if(!r())return null;let t=n(e.components);return(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(t.SdkActions,{download:`/__downloads/sdk/csharp.zip`,source:``,packageUrl:``,registry:``}),`

## Intro [#intro]

The Mandate API SDK provides access to the Mandate API REST APIs.

Mandate is an authorisation layer for AI-agent payments on PayPal. Every agent payment carries
AP2 v0.2 mandates (the customer's signed limits, the merchant's signed checkout, the agent's closed
mandates) and signed receipts. The **Verification** endpoints let a seller, PayPal or a dispute
reviewer check a payment with public keys alone. The **Demo** endpoints drive the same flow the app
uses: sign rules, let the agent shop, approve over-limit purchases.

Sandbox only. No real money moves. Without keys the server runs fully offline with simulated
PayPal order IDs (\`SIM-…\`); with PayPal sandbox keys the IDs are real sandbox order IDs.

## Installation [#installation]

Add the SDK as a project reference into your solution:

\`\`\`bash
dotnet add reference <path-to-sdk>/src/MandateApi/MandateApi.csproj
\`\`\`

The project takes its build settings from the files around it, so reference it in place.

## Quick Start [#quick-start]

### Dependency Injection [#dependency-injection]

Register the client with \`IServiceCollection\` and resolve it from the container. The \`HttpClient\` is managed by \`IHttpClientFactory\`. Configure the client's behavior through \`MandateApiClientOptions\`.

\`\`\`csharp
services.AddMandateApiClient(options =>
{
    options.AutomationSecret = "YOUR_BEARER_TOKEN";
    options.Environment = ServerEnvironment.Production;
    // TODO: configure more client options here
});
\`\`\`

### Direct Instantiation [#direct-instantiation]

Create the client by passing an \`HttpClient\` you manage yourself. Configure the client's behavior through \`MandateApiClientOptions\`.

\`\`\`csharp
var httpClient = new HttpClient();
// TODO: configure more client options here
var options = new MandateApiClientOptions
{
    AutomationSecret = "YOUR_BEARER_TOKEN",
    Environment = ServerEnvironment.Production,
};
var client = new MandateApiClient(httpClient, options);
\`\`\`
`]})}var s={contents:[{heading:`intro`,content:`The Mandate API SDK provides access to the Mandate API REST APIs.`},{heading:`intro`,content:`Mandate is an authorisation layer for AI-agent payments on PayPal. Every agent payment carries
AP2 v0.2 mandates (the customer's signed limits, the merchant's signed checkout, the agent's closed
mandates) and signed receipts. The **Verification** endpoints let a seller, PayPal or a dispute
reviewer check a payment with public keys alone. The **Demo** endpoints drive the same flow the app
uses: sign rules, let the agent shop, approve over-limit purchases.`},{heading:`intro`,content:"Sandbox only. No real money moves. Without keys the server runs fully offline with simulated\nPayPal order IDs (`SIM-…`); with PayPal sandbox keys the IDs are real sandbox order IDs."},{heading:`installation`,content:`Add the SDK as a project reference into your solution:`},{heading:`installation`,content:`The project takes its build settings from the files around it, so reference it in place.`},{heading:`dependency-injection`,content:"Register the client with `IServiceCollection` and resolve it from the container. The `HttpClient` is managed by `IHttpClientFactory`. Configure the client's behavior through `MandateApiClientOptions`."},{heading:`direct-instantiation`,content:"Create the client by passing an `HttpClient` you manage yourself. Configure the client's behavior through `MandateApiClientOptions`."}],headings:[{id:`intro`,content:`Intro`},{id:`installation`,content:`Installation`},{id:`quick-start`,content:`Quick Start`},{id:`dependency-injection`,content:`Dependency Injection`},{id:`direct-instantiation`,content:`Direct Instantiation`}]},c=[{depth:2,url:`#intro`,title:(0,i.jsx)(i.Fragment,{children:`Intro`})},{depth:2,url:`#installation`,title:(0,i.jsx)(i.Fragment,{children:`Installation`})},{depth:2,url:`#quick-start`,title:(0,i.jsx)(i.Fragment,{children:`Quick Start`})},{depth:3,url:`#dependency-injection`,title:(0,i.jsx)(i.Fragment,{children:`Dependency Injection`})},{depth:3,url:`#direct-instantiation`,title:(0,i.jsx)(i.Fragment,{children:`Direct Instantiation`})}];function l(e){let t={code:`code`,h2:`h2`,h3:`h3`,p:`p`,pre:`pre`,span:`span`,strong:`strong`,...e.components},{SdkActions:n}=t;return n||d(`SdkActions`,!0),(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(n,{download:`/__downloads/sdk/csharp.zip`,source:``,packageUrl:``,registry:``}),`
`,(0,i.jsx)(t.h2,{id:`intro`,children:`Intro`}),`
`,(0,i.jsx)(t.p,{children:`The Mandate API SDK provides access to the Mandate API REST APIs.`}),`
`,(0,i.jsxs)(t.p,{children:[`Mandate is an authorisation layer for AI-agent payments on PayPal. Every agent payment carries
AP2 v0.2 mandates (the customer's signed limits, the merchant's signed checkout, the agent's closed
mandates) and signed receipts. The `,(0,i.jsx)(t.strong,{children:`Verification`}),` endpoints let a seller, PayPal or a dispute
reviewer check a payment with public keys alone. The `,(0,i.jsx)(t.strong,{children:`Demo`}),` endpoints drive the same flow the app
uses: sign rules, let the agent shop, approve over-limit purchases.`]}),`
`,(0,i.jsxs)(t.p,{children:[`Sandbox only. No real money moves. Without keys the server runs fully offline with simulated
PayPal order IDs (`,(0,i.jsx)(t.code,{children:`SIM-…`}),`); with PayPal sandbox keys the IDs are real sandbox order IDs.`]}),`
`,(0,i.jsx)(t.h2,{id:`installation`,children:`Installation`}),`
`,(0,i.jsx)(t.p,{children:`Add the SDK as a project reference into your solution:`}),`
`,(0,i.jsx)(i.Fragment,{children:(0,i.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,title:`Terminal`,children:(0,i.jsx)(t.code,{children:(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`dotnet`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` add`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` reference`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:` <`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:`path-to-sd`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`k`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`>`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:`/src/MandateApi/MandateApi.csproj`})]})})})}),`
`,(0,i.jsx)(t.p,{children:`The project takes its build settings from the files around it, so reference it in place.`}),`
`,(0,i.jsx)(t.h2,{id:`quick-start`,children:`Quick Start`}),`
`,(0,i.jsx)(t.h3,{id:`dependency-injection`,children:`Dependency Injection`}),`
`,(0,i.jsxs)(t.p,{children:[`Register the client with `,(0,i.jsx)(t.code,{children:`IServiceCollection`}),` and resolve it from the container. The `,(0,i.jsx)(t.code,{children:`HttpClient`}),` is managed by `,(0,i.jsx)(t.code,{children:`IHttpClientFactory`}),`. Configure the client's behavior through `,(0,i.jsx)(t.code,{children:`MandateApiClientOptions`}),`.`]}),`
`,(0,i.jsx)(i.Fragment,{children:(0,i.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,title:`C#`,children:(0,i.jsxs)(t.code,{children:[(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`services.`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`AddMandateApiClient`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`(`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`options`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:` =>`})]}),`
`,(0,i.jsx)(t.span,{className:`line`,children:(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`{`})}),`
`,(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`    options.AutomationSecret `}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`=`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` "YOUR_BEARER_TOKEN"`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`;`})]}),`
`,(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`    options.Environment `}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`=`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:` ServerEnvironment.Production;`})]}),`
`,(0,i.jsx)(t.span,{className:`line`,children:(0,i.jsx)(t.span,{style:{"--shiki-light":`#6A737D`,"--shiki-dark":`#6A737D`},children:`    // TODO: configure more client options here`})}),`
`,(0,i.jsx)(t.span,{className:`line`,children:(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`});`})})]})})}),`
`,(0,i.jsx)(t.h3,{id:`direct-instantiation`,children:`Direct Instantiation`}),`
`,(0,i.jsxs)(t.p,{children:[`Create the client by passing an `,(0,i.jsx)(t.code,{children:`HttpClient`}),` you manage yourself. Configure the client's behavior through `,(0,i.jsx)(t.code,{children:`MandateApiClientOptions`}),`.`]}),`
`,(0,i.jsx)(i.Fragment,{children:(0,i.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,title:`C#`,children:(0,i.jsxs)(t.code,{children:[(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`var`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:` httpClient`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:` =`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:` new`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:` HttpClient`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`();`})]}),`
`,(0,i.jsx)(t.span,{className:`line`,children:(0,i.jsx)(t.span,{style:{"--shiki-light":`#6A737D`,"--shiki-dark":`#6A737D`},children:`// TODO: configure more client options here`})}),`
`,(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`var`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:` options`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:` =`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:` new`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:` MandateApiClientOptions`})]}),`
`,(0,i.jsx)(t.span,{className:`line`,children:(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`{`})}),`
`,(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`    AutomationSecret `}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`=`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` "YOUR_BEARER_TOKEN"`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`,`})]}),`
`,(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`    Environment `}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`=`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:` ServerEnvironment.Production,`})]}),`
`,(0,i.jsx)(t.span,{className:`line`,children:(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`};`})}),`
`,(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`var`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:` client`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:` =`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:` new`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:` MandateApiClient`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`(httpClient, options);`})]})]})})})]})}function u(e={}){let{wrapper:t}=e.components||{};return t?(0,i.jsx)(t,{...e,children:(0,i.jsx)(l,{...e})}):l(e)}function d(e,t){throw Error(`Expected `+(t?`component`:`object`)+" `"+e+"` to be defined: you likely forgot to import, pass, or provide it.")}export{o as _markdown,u as default,a as frontmatter,s as structuredData,c as toc};