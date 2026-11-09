import{r as e}from"./rolldown-runtime-XKyaHtl9.js";import{t}from"./jsx-runtime-LKYXHABd.js";var n=e(t()),r={title:`How Mandate decides`},i=`Every purchase an agent tries, whether from Mandate's own agent, a scheduled buy, or an outside assistant over MCP, goes through the same gate. It checks 7 rules in order:

| # | Rule | If it fails |
|---|------|-------------|
| 1 | **Mandate**: active, not expired, right currency | Blocked |
| 2 | **Request came from** the user's task, not text on a web page | Blocked |
| 3 | **Category** is one the user allowed | Blocked |
| 4 | **Seller** is verified and not on the user's blocked list | Blocked |
| 5 | **Item limit**: under the per-item cap | The user is asked |
| 6 | **Market price**: not too far above similar items (Channel3) | The user is asked |
| 7 | **Budget**: fits what is left this period | The user is asked |

Allowed purchases get a one-time permit for that exact cart and price; only then does Mandate use PayPal. Every decision is a signed, hash-chained receipt, and each one records how all 7 rules came out.

The gate is plain code, not a model: the same purchase always gets the same answer.
`,a={contents:[{heading:void 0,content:`Every purchase an agent tries, whether from Mandate's own agent, a scheduled buy, or an outside assistant over MCP, goes through the same gate. It checks 7 rules in order:`},{heading:void 0,content:`| #   | Rule                                             | If it fails |
| --- | ------------------------------------------------ | ----------- |
| 1   | **Mandate**: active, not expired, right currency | Blocked     |`,table:`table-0`},{heading:void 0,content:`| #   | Rule                                                          | If it fails |
| --- | ------------------------------------------------------------- | ----------- |
| 2   | **Request came from** the user's task, not text on a web page | Blocked     |`,table:`table-0`},{heading:void 0,content:`| #   | Rule                                 | If it fails |
| --- | ------------------------------------ | ----------- |
| 3   | **Category** is one the user allowed | Blocked     |`,table:`table-0`},{heading:void 0,content:`| #   | Rule                                                      | If it fails |
| --- | --------------------------------------------------------- | ----------- |
| 4   | **Seller** is verified and not on the user's blocked list | Blocked     |`,table:`table-0`},{heading:void 0,content:`| #   | Rule                                   | If it fails       |
| --- | -------------------------------------- | ----------------- |
| 5   | **Item limit**: under the per-item cap | The user is asked |`,table:`table-0`},{heading:void 0,content:`| #   | Rule                                                         | If it fails       |
| --- | ------------------------------------------------------------ | ----------------- |
| 6   | **Market price**: not too far above similar items (Channel3) | The user is asked |`,table:`table-0`},{heading:void 0,content:`| #   | Rule                                      | If it fails       |
| --- | ----------------------------------------- | ----------------- |
| 7   | **Budget**: fits what is left this period | The user is asked |`,table:`table-0`},{heading:void 0,content:`Allowed purchases get a one-time permit for that exact cart and price; only then does Mandate use PayPal. Every decision is a signed, hash-chained receipt, and each one records how all 7 rules came out.`},{heading:void 0,content:`The gate is plain code, not a model: the same purchase always gets the same answer.`}],headings:[]},o=[];function s(e){let t={p:`p`,strong:`strong`,table:`table`,tbody:`tbody`,td:`td`,th:`th`,thead:`thead`,tr:`tr`,...e.components};return(0,n.jsxs)(n.Fragment,{children:[(0,n.jsx)(t.p,{children:`Every purchase an agent tries, whether from Mandate's own agent, a scheduled buy, or an outside assistant over MCP, goes through the same gate. It checks 7 rules in order:`}),`
`,(0,n.jsxs)(t.table,{children:[(0,n.jsx)(t.thead,{children:(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.th,{children:`#`}),(0,n.jsx)(t.th,{children:`Rule`}),(0,n.jsx)(t.th,{children:`If it fails`})]})}),(0,n.jsxs)(t.tbody,{children:[(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:`1`}),(0,n.jsxs)(t.td,{children:[(0,n.jsx)(t.strong,{children:`Mandate`}),`: active, not expired, right currency`]}),(0,n.jsx)(t.td,{children:`Blocked`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:`2`}),(0,n.jsxs)(t.td,{children:[(0,n.jsx)(t.strong,{children:`Request came from`}),` the user's task, not text on a web page`]}),(0,n.jsx)(t.td,{children:`Blocked`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:`3`}),(0,n.jsxs)(t.td,{children:[(0,n.jsx)(t.strong,{children:`Category`}),` is one the user allowed`]}),(0,n.jsx)(t.td,{children:`Blocked`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:`4`}),(0,n.jsxs)(t.td,{children:[(0,n.jsx)(t.strong,{children:`Seller`}),` is verified and not on the user's blocked list`]}),(0,n.jsx)(t.td,{children:`Blocked`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:`5`}),(0,n.jsxs)(t.td,{children:[(0,n.jsx)(t.strong,{children:`Item limit`}),`: under the per-item cap`]}),(0,n.jsx)(t.td,{children:`The user is asked`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:`6`}),(0,n.jsxs)(t.td,{children:[(0,n.jsx)(t.strong,{children:`Market price`}),`: not too far above similar items (Channel3)`]}),(0,n.jsx)(t.td,{children:`The user is asked`})]}),(0,n.jsxs)(t.tr,{children:[(0,n.jsx)(t.td,{children:`7`}),(0,n.jsxs)(t.td,{children:[(0,n.jsx)(t.strong,{children:`Budget`}),`: fits what is left this period`]}),(0,n.jsx)(t.td,{children:`The user is asked`})]})]})]}),`
`,(0,n.jsx)(t.p,{children:`Allowed purchases get a one-time permit for that exact cart and price; only then does Mandate use PayPal. Every decision is a signed, hash-chained receipt, and each one records how all 7 rules came out.`}),`
`,(0,n.jsx)(t.p,{children:`The gate is plain code, not a model: the same purchase always gets the same answer.`})]})}function c(e={}){let{wrapper:t}=e.components||{};return t?(0,n.jsx)(t,{...e,children:(0,n.jsx)(s,{...e})}):s(e)}export{i as _markdown,c as default,r as frontmatter,a as structuredData,o as toc};