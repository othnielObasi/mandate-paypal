"""Builds the judges' brief (video/brief/brief.html) from real footage frames; print.mjs turns it into a PDF."""
from pathlib import Path

HERE = Path(__file__).parent
F = "../footage"
TG = "telegram.png"  # the real Mandate Alerts bot chat, copied next to this file


def shot(src, box=None, w=None, cap="", tall=False):
    """A screenshot, optionally cropped to box=(x, y, w, h) in 1920x1080 frame pixels."""
    if box is None:
        img = f'<img src="{src}" style="width:100%;display:block">'
        return f'<figure><div class="frame">{img}</div><figcaption>{cap}</figcaption></figure>'
    x, y, bw, bh = box
    # Scale so the crop fills the figure width; the container keeps the crop's aspect ratio.
    pct = 100 * 1920 / bw
    img = (f'<img src="{src}" style="position:absolute;width:{pct:.3f}%;left:{-100 * x / bw:.3f}%;'
           f'top:{-100 * y / bh:.3f}%;max-width:none">')
    ratio = 100 * bh / bw
    return (f'<figure><div class="frame" style="position:relative;padding-top:{ratio:.3f}%;overflow:hidden">{img}</div>'
            f'<figcaption>{cap}</figcaption></figure>')


CHECK = '<svg viewBox="0 0 28 28"><path d="M8 14.5l4 4 8-9" stroke="#fff" stroke-width="2.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/></svg>'

html = f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>Mandate · Judges' brief</title>
<style>
@font-face {{ font-family: G; src: url(../../node_modules/@fontsource/geist-sans/files/geist-sans-latin-400-normal.woff2); font-weight: 400; }}
@font-face {{ font-family: G; src: url(../../node_modules/@fontsource/geist-sans/files/geist-sans-latin-600-normal.woff2); font-weight: 600; }}
@font-face {{ font-family: G; src: url(../../node_modules/@fontsource/geist-sans/files/geist-sans-latin-700-normal.woff2); font-weight: 700; }}
@font-face {{ font-family: M; src: url(../../node_modules/@fontsource/geist-mono/files/geist-mono-latin-500-normal.woff2); font-weight: 500; }}
@page {{ size: A4; margin: 14mm 14mm 16mm; }}
:root {{ --ink: #0f1222; --ink2: #464c63; --muted: #6b7189; --line: #e3e6ef; --blue: #1d4ed8; --violet: #6d5bd0; --allow: #13794b; --ask: #a35f00; --block: #b4231b; --soft: #f4f6fb; }}
* {{ box-sizing: border-box; }}
body {{ margin: 0; font: 400 10.5pt/1.5 G, system-ui, sans-serif; color: var(--ink); }}
h1 {{ font-size: 40pt; letter-spacing: -.04em; line-height: 1; margin: 0; }}
h2 {{ font-size: 17pt; letter-spacing: -.02em; margin: 0 0 3mm; }}
h3 {{ font-size: 11.5pt; margin: 0 0 1.5mm; }}
p {{ margin: 0 0 2.5mm; color: var(--ink2); }}
.kicker {{ font: 500 8pt/1 M, monospace; letter-spacing: .14em; text-transform: uppercase; color: var(--violet); margin-bottom: 2mm; }}
.page {{ page-break-after: always; }}
.page:last-child {{ page-break-after: auto; }}
.mark {{ width: 15mm; height: 15mm; border-radius: 4mm; background: var(--blue); display: flex; align-items: center; justify-content: center; }}
.mark svg {{ width: 10mm; height: 10mm; }}
.tag {{ font-size: 17pt; font-weight: 700; letter-spacing: -.02em; margin-top: 3mm; }}
.tag span {{ color: var(--violet); }}
.essence {{ margin: 6mm 0 5mm; padding: 4mm 5mm; border-left: 3px solid var(--blue); background: var(--soft); font-size: 12pt; color: var(--ink); }}
.links {{ display: grid; grid-template-columns: auto 1fr; gap: 1mm 4mm; font-size: 10pt; margin-bottom: 5mm; }}
.links b {{ color: var(--muted); font-weight: 600; }}
.links a {{ color: var(--blue); text-decoration: none; }}
.stats {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: 3mm; margin: 4mm 0 5mm; }}
.stat {{ border: 1px solid var(--line); border-radius: 3mm; padding: 3.5mm 4mm; }}
.stat b {{ display: block; font-size: 20pt; letter-spacing: -.03em; line-height: 1.1; }}
.stat span {{ display: block; font-size: 9pt; color: var(--ink2); margin-top: 1mm; }}
.stat small {{ display: block; font: 500 7pt/1.3 M, monospace; color: var(--muted); margin-top: 1.5mm; }}
figure {{ margin: 0 0 4mm; break-inside: avoid; }}
.frame {{ border: 1px solid var(--line); border-radius: 2.5mm; overflow: hidden; box-shadow: 0 1mm 3mm rgba(15,18,34,.06); }}
figcaption {{ font-size: 8.5pt; color: var(--muted); margin-top: 1.5mm; }}
.two {{ display: grid; grid-template-columns: 1fr 1fr; gap: 5mm; }}
.flow {{ display: flex; align-items: stretch; gap: 2mm; margin: 4mm 0 5mm; }}
.node {{ flex: 1; border: 1px solid var(--line); border-radius: 2.5mm; padding: 3mm; font-size: 8.5pt; color: var(--ink2); background: #fff; }}
.node b {{ display: block; font-size: 10pt; color: var(--ink); margin-bottom: 1mm; }}
.node.gate {{ border-color: var(--blue); background: #eef3ff; }}
.node.pp {{ border-color: #9bb5f5; }}
.arrow {{ display: flex; align-items: center; color: var(--muted); font-size: 12pt; }}
ol.rules {{ margin: 0 0 4mm; padding-left: 5mm; columns: 2; column-gap: 8mm; font-size: 9.5pt; color: var(--ink2); }}
ol.rules li {{ margin-bottom: 1mm; break-inside: avoid; }}
ol.rules b {{ color: var(--ink); }}
table {{ width: 100%; border-collapse: collapse; font-size: 9pt; margin-bottom: 5mm; }}
th {{ text-align: left; font: 500 7.5pt/1 M, monospace; letter-spacing: .1em; text-transform: uppercase; color: var(--muted); padding: 2mm 2mm 2mm 0; border-bottom: 1px solid var(--line); }}
td {{ padding: 2mm 2mm 2mm 0; border-bottom: 1px solid var(--line); vertical-align: top; color: var(--ink2); }}
td:first-child {{ font-weight: 600; color: var(--ink); white-space: nowrap; }}
.steps {{ counter-reset: s; margin: 0 0 4mm; padding: 0; list-style: none; }}
.steps li {{ counter-increment: s; position: relative; padding: 0 0 2.5mm 9mm; color: var(--ink2); }}
.steps li::before {{ content: counter(s); position: absolute; left: 0; top: 0; width: 6mm; height: 6mm; border-radius: 50%; background: var(--blue); color: #fff; font-weight: 700; font-size: 8.5pt; display: flex; align-items: center; justify-content: center; }}
.steps b {{ color: var(--ink); }}
.note {{ font-size: 9pt; padding: 3mm 4mm; border-radius: 2.5mm; background: var(--soft); color: var(--ink2); }}
.chip {{ display: inline-block; padding: .5mm 2.2mm; border-radius: 9mm; font-size: 8pt; font-weight: 600; }}
.c-allow {{ background: #e3f5ec; color: var(--allow); }} .c-ask {{ background: #fdf0dc; color: var(--ask); }} .c-block {{ background: #fde6e4; color: var(--block); }}
.foot {{ font-size: 8pt; color: var(--muted); margin-top: 4mm; }}
</style></head><body>

<!-- 1 · Cover -->
<section class="page">
  <div style="display:flex;align-items:center;gap:5mm"><div class="mark">{CHECK}</div><h1>Mandate</h1></div>
  <div class="tag">Your AI can shop. <span>It can't cross the line.</span></div>
  <div class="essence"><b>AI agents can pay with PayPal safely</b>, because every payment is checked against rules the user signed, and the seller gets proof the user said yes.</div>
  <div class="links">
    <b>Demo video</b><a href="https://www.youtube.com/watch?v=VOXk6WO7XgY">youtube.com/watch?v=VOXk6WO7XgY</a> <!-- 2:55 -->
    <b>Live demo</b><a href="https://mandate-e13m.onrender.com">mandate-e13m.onrender.com</a> <!-- PayPal sandbox -->
    <b>Code (MIT)</b><a href="https://github.com/othnielObasi/mandate-paypal">github.com/othnielObasi/mandate-paypal</a>
    <b>API docs</b><a href="https://mandate-e13m.onrender.com/docs">mandate-e13m.onrender.com/docs</a>
    <b>How it works</b><a href="https://mandate-e13m.onrender.com/how-it-works">mandate-e13m.onrender.com/how-it-works</a>
  </div>
  <div class="kicker">Why it matters now</div>
  <div class="stats">
    <div class="stat"><b>$1T</b><span>US retail that AI agents could orchestrate by 2030</span><small>McKinsey, 2025</small></div>
    <div class="stat"><b style="color:var(--block)">42–68%</b><span>of hidden-instruction attacks hijacked browsing agents in tests</span><small>StakeBench via CSO Online, 2026</small></div>
    <div class="stat"><b style="color:var(--ask)">$36.9B</b><span>chargeback costs this year, with no rule yet on who pays when an agent buys</span><small>Mastercard via Chargeflow, 2026</small></div>
  </div>
  {shot(f"{F}/drill/00072.jpg", (180, 130, 1020, 600), cap="Live app: an agent handed to an attacker obeys a planted instruction and tries to buy a $50 gift card. Mandate blocks it; nothing is paid.")}
</section>

<!-- 2 · How it works -->
<section class="page">
  <div class="kicker">How it works</div>
  <h2>The AI proposes. Plain code decides. Only then does PayPal move money.</h2>
  <p>Mandate never tries to make the model trustworthy. It assumes the agent can be fooled, and puts a deterministic gate between any agent and the user's PayPal wallet.</p>
  <div class="flow">
    <div class="node"><b>1 · Signed rules</b>User writes limits in plain English; Meta Muse Spark structures them; the user checks and signs an AP2 Intent Mandate.</div>
    <div class="arrow">→</div>
    <div class="node"><b>2 · Agent proposes</b>Mandate's agent, Claude, ChatGPT or any MCP client proposes a purchase. Web content is tagged untrusted.</div>
    <div class="arrow">→</div>
    <div class="node gate"><b>3 · The gate</b>Seven rules, in order. <span class="chip c-allow">Pay</span> <span class="chip c-ask">Ask</span> <span class="chip c-block">Block</span></div>
    <div class="arrow">→</div>
    <div class="node pp"><b>4 · PayPal</b>Only the executor, holding a single-use permit for that exact amount, calls PayPal.</div>
    <div class="arrow">→</div>
    <div class="node"><b>5 · Proof</b>Signed, hash-chained receipt. The seller verifies with public keys before shipping.</div>
  </div>
  <h3>The seven rules every purchase meets</h3>
  <ol class="rules">
    <li><b>Mandate</b>: signed, active, not revoked</li>
    <li><b>Request came from</b>: the user's task, not a web page</li>
    <li><b>Category</b>: one the user allowed</li>
    <li><b>Seller</b>: allowed (optionally verified only)</li>
    <li><b>Item limit</b>: over it, the agent asks</li>
    <li><b>Market price</b>: compared with ~10 shops (Channel3)</li>
    <li><b>Budget</b>: fits what's left this period</li>
  </ol>
  <div class="two">
    {shot(f"{F}/page/00018.jpg", (380, 330, 1160, 470), cap="The attacker: a normal-looking review page with a note planted for AI agents (live at /demo/deals).")}
    {shot(f"{F}/why/00053.jpg", (185, 290, 1010, 650), cap="“How it decided”: the gift card stopped at <b>Request came from</b>, since text on a web page is not the user's task.")}
  </div>
</section>

<!-- 3 · Pays what you approved -->
<section class="page">
  <div class="kicker">It pays what you did approve</div>
  <h2>Rules in one sentence. PayPal connected once. Paid in seconds.</h2>
  {shot(f"{F}/setup/00203.jpg", (100, 130, 1720, 950), cap="The user's sentence, structured by Meta Muse Spark into editable rules, shown as the exact AP2 Intent Mandate they sign.")}
  <div class="two">
    {shot(f"{F}/buy/00150.jpg", (180, 560, 1030, 340), cap="Inside the rules: paid at once from the PayPal Vault wallet, with no checkout step.")}
    {shot(f"{F}/ask/00056.jpg", (95, 300, 1150, 340), cap="Over the $25 item limit: the agent stops and asks. Approve in the app, with a passkey, or in Telegram.")}
  </div>
</section>

<!-- 4 · Approvals, schedules, seller proof -->
<section class="page">
  <div class="kicker">Approve anywhere · run on a schedule · prove it to the seller</div>
  <h2>The user stays in charge. The seller gets proof.</h2>
  <div class="two">
    {shot(TG, cap="Real Telegram alerts from the Mandate Alerts bot. Approval requests carry one-tap ✓ Approve / ✕ Decline buttons. Slack, Discord and Zapier (email, 7,000+ apps) are also supported.")}
    {shot(f"{F}/schedule/00119.jpg", (90, 120, 1740, 960), cap="Scheduled buys on a Bryntum calendar: weekly basics run on their own, still through the gate.")}
  </div>
  <div class="two">
    {shot(f"{F}/proof/00004.jpg", (990, 60, 830, 640), cap="The seller's view: AP2 v0.2 checks (ES256, SD-JWT chains), Mandate v1 checks and PayPal's own order record, before shipping.")}
    {shot(f"{F}/proof/00118.jpg", (100, 300, 1140, 590), cap="Tamper-evident: edit any receipt and “Verify chain” names the exact altered row.")}
  </div>
</section>

<!-- 5 · PayPal, AI and partners -->
<section class="page">
  <div class="kicker">What it's built on</div>
  <h2>PayPal and AI</h2>
  <table>
    <tr><th>Tool</th><th>What it does in Mandate</th></tr>
    <tr><td>PayPal Agent Toolkit</td><td>Creates and captures the orders purchases become. Only the permit-holding executor calls it; the model never has payment access.</td></tr>
    <tr><td>PayPal Vault (v3)</td><td>Connect PayPal once through PayPal's own login; in-rules purchases then pay instantly from the saved wallet (Orders v2 with <code>vault_id</code>).</td></tr>
    <tr><td>PayPal Webhooks</td><td><code>CHECKOUT.ORDER.APPROVED</code>, verified with the webhook ID, captures approved orders even if the buyer has left the page.</td></tr>
    <tr><td>PayPal Server SDK</td><td>Reads PayPal's own order record during seller verification, confirming the signed amount was captured. Tracking is added to orders.</td></tr>
    <tr><td>Meta Muse Spark</td><td>The shopping agent (search, pick, explain) and the rules reader that turns a sentence into structured limits.</td></tr>
    <tr><td>AP2 v0.2 + MCP</td><td>Signed intent, cart and payment mandates (interop-tested against Google's AP2 reference SDK); MCP server so any agent shops through the same gate.</td></tr>
  </table>
  <h2>Sponsor tools</h2>
  <table>
    <tr><th>Sponsor</th><th>Use</th></tr>
    <tr><td>AG Grid · AG Studio</td><td>Receipts ledger (editable, tamper test), decision explorer (one column per rule), Insights dashboard.</td></tr>
    <tr><td>Bryntum Calendar</td><td>Scheduled buys: create, drag, “Run now”; every run goes through the gate.</td></tr>
    <tr><td>Channel3</td><td>Real products from real stores, and the market median across ~10 shops for the fair-price rule.</td></tr>
    <tr><td>KERNEL</td><td>Cloud browser for reading web pages; output is tagged untrusted.</td></tr>
    <tr><td>APIMatic</td><td>API portal at /docs, TypeScript, Python and C# SDKs, and a Context Plugin for AI coding assistants.</td></tr>
    <tr><td>Zapier</td><td>Per-workspace alert hooks (email, WhatsApp, SMS, 7,000+ apps) and an automation kill switch.</td></tr>
    <tr><td>Postman</td><td>OpenAPI spec and a collection that runs the whole story with 42 assertions.</td></tr>
    <tr><td>Render</td><td>Hosts the live app and its Postgres database.</td></tr>
    <tr><td>Astropods</td><td>An external shopper agent that buys through Mandate's API.</td></tr>
  </table>
</section>

<!-- 6 · Testing guide -->
<section class="page">
  <div class="kicker">For judges</div>
  <h2>Test it in five minutes</h2>
  <p>Open <b>mandate-e13m.onrender.com/app</b>. No sign-up: each browser gets its own private workspace. All payments use the PayPal sandbox.</p>
  <ol class="steps">
    <li><b>Set your rules.</b> Keep the example sentence or write your own, click “Read my rules”, adjust anything, then “Sign and activate”.</li>
    <li><b>Try to break it.</b> In “Your agent”, click <b>Compromised-agent drill</b>. The agent obeys a planted instruction; the gate blocks it. Open “How it decided”.</li>
    <li><b>Pay within the rules.</b> Click <b>Connect PayPal</b> and log in with the sandbox buyer given in the submission's testing instructions (once). Ask “Buy washing-up liquid”: paid instantly.</li>
    <li><b>Go over a limit.</b> Ask “Buy an electric kettle” ($32 against a $25 limit). Approve it on the card or in Notifications.</li>
    <li><b>Be the seller.</b> Use any “Check payment” link or “Seller view”. On Receipts, double-click a “What happened” cell, edit it, press “Verify chain”.</li>
    <li><b>Explore.</b> Schedule (Bryntum), Insights → “Hijack attempts” (AG Grid), Notifications (Telegram/Slack/Discord/Zapier), Developers and /docs.</li>
  </ol>
  <h3>Engineering</h3>
  <table>
    <tr><td>Safety by design</td><td>Model never holds payment credentials; single-use, amount-bound permits; untrusted-content provenance; passkey approvals; kill switch.</td></tr>
    <tr><td>Evidence</td><td>Ed25519-signed, hash-chained receipts; AP2 v0.2 evidence packs for disputes; PDF receipts; public verification API.</td></tr>
    <tr><td>Quality</td><td>525 unit tests and 24 Playwright end-to-end tests, including axe accessibility scans in light and dark mode.</td></tr>
    <tr><td>Stack</td><td>Next.js 15, React 19, TypeScript, Postgres on Render.</td></tr>
  </table>
  <div class="note">The demo uses the PayPal sandbox only. The live agent (Muse Spark) usually refuses planted instructions on its own; the drill deliberately uses a compromised agent to show that the gate holds even when the agent doesn't.</div>
  <p class="foot">Mandate · PayPal AI Hackathon 2026 · MIT licence</p>
</section>
</body></html>
"""
(HERE / "brief.html").write_text(html, encoding="utf-8")
print("brief.html written")
