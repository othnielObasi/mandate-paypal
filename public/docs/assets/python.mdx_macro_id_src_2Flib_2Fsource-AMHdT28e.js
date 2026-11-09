import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{t}from"./jsx-runtime-LKYXHABd.js";import{n,t as r}from"./server.browser-CRtpYEZZ.js";var i=e(t()),a={title:`Python SDK`,description:`Install and start using the Python SDK.`};function o(e){if(!r())return null;let t=n(e.components);return(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(t.SdkActions,{download:`/__downloads/sdk/python.zip`,source:``,packageUrl:``,registry:``}),`

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

Add the SDK to your project from its folder, with whichever package manager your project uses. Give each tool a path containing a slash, such as \`../mandate-api\` — a bare folder name is looked up on PyPI instead, and resolves to whatever project holds that name there:

\`\`\`bash
pip install <path-to-sdk>
\`\`\`

\`\`\`bash
uv add <path-to-sdk>
\`\`\`

\`\`\`bash
poetry add <path-to-sdk>
\`\`\`

## Quick Start [#quick-start]

### Synchronous client [#synchronous-client]

Construct \`MandateApiClient\` with keyword arguments, and call \`close()\` when you are done. Every argument is optional.

\`\`\`python
from mandate_api import MandateApiClient

client = MandateApiClient(automation_secret="YOUR_BEARER_TOKEN", environment="production")

client.close()
\`\`\`

Alternatively, scope it — \`with MandateApiClient(...) as client:\` closes the pool on exit.

### Asynchronous client [#asynchronous-client]

\`AsyncMandateApiClient\` mirrors \`MandateApiClient\` with **identical method names**, and every endpoint method is a coroutine. It takes the same arguments, with some differences — for example, the transport argument is \`custom_async_http_client\`.

\`\`\`python
from asyncio import run

from mandate_api import AsyncMandateApiClient


async def main() -> None:
    client = AsyncMandateApiClient(automation_secret="YOUR_BEARER_TOKEN", environment="production")
    await client.aclose()


run(main())
\`\`\`

Alternatively, scope it — \`async with AsyncMandateApiClient(...) as client:\` closes the pool on exit.
`]})}var s={contents:[{heading:`intro`,content:`The Mandate API SDK provides access to the Mandate API REST APIs.`},{heading:`intro`,content:`Mandate is an authorisation layer for AI-agent payments on PayPal. Every agent payment carries
AP2 v0.2 mandates (the customer's signed limits, the merchant's signed checkout, the agent's closed
mandates) and signed receipts. The **Verification** endpoints let a seller, PayPal or a dispute
reviewer check a payment with public keys alone. The **Demo** endpoints drive the same flow the app
uses: sign rules, let the agent shop, approve over-limit purchases.`},{heading:`intro`,content:"Sandbox only. No real money moves. Without keys the server runs fully offline with simulated\nPayPal order IDs (`SIM-…`); with PayPal sandbox keys the IDs are real sandbox order IDs."},{heading:`installation`,content:"Add the SDK to your project from its folder, with whichever package manager your project uses. Give each tool a path containing a slash, such as `../mandate-api` — a bare folder name is looked up on PyPI instead, and resolves to whatever project holds that name there:"},{heading:`synchronous-client`,content:"Construct `MandateApiClient` with keyword arguments, and call `close()` when you are done. Every argument is optional."},{heading:`synchronous-client`,content:"Alternatively, scope it — `with MandateApiClient(...) as client:` closes the pool on exit."},{heading:`asynchronous-client`,content:"`AsyncMandateApiClient` mirrors `MandateApiClient` with **identical method names**, and every endpoint method is a coroutine. It takes the same arguments, with some differences — for example, the transport argument is `custom_async_http_client`."},{heading:`asynchronous-client`,content:"Alternatively, scope it — `async with AsyncMandateApiClient(...) as client:` closes the pool on exit."}],headings:[{id:`intro`,content:`Intro`},{id:`installation`,content:`Installation`},{id:`quick-start`,content:`Quick Start`},{id:`synchronous-client`,content:`Synchronous client`},{id:`asynchronous-client`,content:`Asynchronous client`}]},c=[{depth:2,url:`#intro`,title:(0,i.jsx)(i.Fragment,{children:`Intro`})},{depth:2,url:`#installation`,title:(0,i.jsx)(i.Fragment,{children:`Installation`})},{depth:2,url:`#quick-start`,title:(0,i.jsx)(i.Fragment,{children:`Quick Start`})},{depth:3,url:`#synchronous-client`,title:(0,i.jsx)(i.Fragment,{children:`Synchronous client`})},{depth:3,url:`#asynchronous-client`,title:(0,i.jsx)(i.Fragment,{children:`Asynchronous client`})}];function l(e){let t={code:`code`,h2:`h2`,h3:`h3`,p:`p`,pre:`pre`,span:`span`,strong:`strong`,...e.components},{SdkActions:n}=t;return n||d(`SdkActions`,!0),(0,i.jsxs)(i.Fragment,{children:[(0,i.jsx)(n,{download:`/__downloads/sdk/python.zip`,source:``,packageUrl:``,registry:``}),`
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
`,(0,i.jsxs)(t.p,{children:[`Add the SDK to your project from its folder, with whichever package manager your project uses. Give each tool a path containing a slash, such as `,(0,i.jsx)(t.code,{children:`../mandate-api`}),` — a bare folder name is looked up on PyPI instead, and resolves to whatever project holds that name there:`]}),`
`,(0,i.jsx)(i.Fragment,{children:(0,i.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,title:`Terminal`,children:(0,i.jsx)(t.code,{children:(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`pip`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` install`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:` <`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:`path-to-sd`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`k`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`>`})]})})})}),`
`,(0,i.jsx)(i.Fragment,{children:(0,i.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,title:`Terminal`,children:(0,i.jsx)(t.code,{children:(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`uv`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` add`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:` <`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:`path-to-sd`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`k`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`>`})]})})})}),`
`,(0,i.jsx)(i.Fragment,{children:(0,i.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,title:`Terminal`,children:(0,i.jsx)(t.code,{children:(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:`poetry`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:` add`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:` <`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:`path-to-sd`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`k`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`>`})]})})})}),`
`,(0,i.jsx)(t.h2,{id:`quick-start`,children:`Quick Start`}),`
`,(0,i.jsx)(t.h3,{id:`synchronous-client`,children:`Synchronous client`}),`
`,(0,i.jsxs)(t.p,{children:[`Construct `,(0,i.jsx)(t.code,{children:`MandateApiClient`}),` with keyword arguments, and call `,(0,i.jsx)(t.code,{children:`close()`}),` when you are done. Every argument is optional.`]}),`
`,(0,i.jsx)(i.Fragment,{children:(0,i.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,title:`Python`,children:(0,i.jsxs)(t.code,{children:[(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`from`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:` mandate_api `}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`import`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:` MandateApiClient`})]}),`
`,(0,i.jsx)(t.span,{className:`line`}),`
`,(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`client `}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`=`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:` MandateApiClient(`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#E36209`,"--shiki-dark":`#FFAB70`},children:`automation_secret`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`=`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:`"YOUR_BEARER_TOKEN"`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`, `}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#E36209`,"--shiki-dark":`#FFAB70`},children:`environment`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`=`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:`"production"`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`)`})]}),`
`,(0,i.jsx)(t.span,{className:`line`}),`
`,(0,i.jsx)(t.span,{className:`line`,children:(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`client.close()`})})]})})}),`
`,(0,i.jsxs)(t.p,{children:[`Alternatively, scope it — `,(0,i.jsx)(t.code,{children:`with MandateApiClient(...) as client:`}),` closes the pool on exit.`]}),`
`,(0,i.jsx)(t.h3,{id:`asynchronous-client`,children:`Asynchronous client`}),`
`,(0,i.jsxs)(t.p,{children:[(0,i.jsx)(t.code,{children:`AsyncMandateApiClient`}),` mirrors `,(0,i.jsx)(t.code,{children:`MandateApiClient`}),` with `,(0,i.jsx)(t.strong,{children:`identical method names`}),`, and every endpoint method is a coroutine. It takes the same arguments, with some differences — for example, the transport argument is `,(0,i.jsx)(t.code,{children:`custom_async_http_client`}),`.`]}),`
`,(0,i.jsx)(i.Fragment,{children:(0,i.jsx)(t.pre,{className:`shiki shiki-themes github-light github-dark`,style:{"--shiki-light":`#24292e`,"--shiki-dark":`#e1e4e8`,"--shiki-light-bg":`#fff`,"--shiki-dark-bg":`#24292e`},tabIndex:`0`,title:`Python`,children:(0,i.jsxs)(t.code,{children:[(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`from`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:` asyncio `}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`import`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:` run`})]}),`
`,(0,i.jsx)(t.span,{className:`line`}),`
`,(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`from`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:` mandate_api `}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`import`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:` AsyncMandateApiClient`})]}),`
`,(0,i.jsx)(t.span,{className:`line`}),`
`,(0,i.jsx)(t.span,{className:`line`}),`
`,(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`async`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:` def`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#6F42C1`,"--shiki-dark":`#B392F0`},children:` main`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`() -> `}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#005CC5`,"--shiki-dark":`#79B8FF`},children:`None`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`:`})]}),`
`,(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`    client `}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`=`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:` AsyncMandateApiClient(`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#E36209`,"--shiki-dark":`#FFAB70`},children:`automation_secret`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`=`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:`"YOUR_BEARER_TOKEN"`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`, `}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#E36209`,"--shiki-dark":`#FFAB70`},children:`environment`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`=`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#032F62`,"--shiki-dark":`#9ECBFF`},children:`"production"`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`)`})]}),`
`,(0,i.jsxs)(t.span,{className:`line`,children:[(0,i.jsx)(t.span,{style:{"--shiki-light":`#D73A49`,"--shiki-dark":`#F97583`},children:`    await`}),(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:` client.aclose()`})]}),`
`,(0,i.jsx)(t.span,{className:`line`}),`
`,(0,i.jsx)(t.span,{className:`line`}),`
`,(0,i.jsx)(t.span,{className:`line`,children:(0,i.jsx)(t.span,{style:{"--shiki-light":`#24292E`,"--shiki-dark":`#E1E4E8`},children:`run(main())`})})]})})}),`
`,(0,i.jsxs)(t.p,{children:[`Alternatively, scope it — `,(0,i.jsx)(t.code,{children:`async with AsyncMandateApiClient(...) as client:`}),` closes the pool on exit.`]})]})}function u(e={}){let{wrapper:t}=e.components||{};return t?(0,i.jsx)(t,{...e,children:(0,i.jsx)(l,{...e})}):l(e)}function d(e,t){throw Error(`Expected `+(t?`component`:`object`)+" `"+e+"` to be defined: you likely forgot to import, pass, or provide it.")}export{o as _markdown,u as default,a as frontmatter,s as structuredData,c as toc};