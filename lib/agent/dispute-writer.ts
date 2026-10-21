import type { LlmClient } from "./runtime";

export interface DisputeFacts {
  paypalOrderId: string;
  merchantId: string;
  items: string;
  amount: string;
  paidAt: string;
  carrierStatus: string;
  expectedBy: string;
}

/** The marker lets the offline planner recognise this request. */
export const DISPUTE_SYSTEM = `DISPUTE_STATEMENT
Write a buyer's PayPal dispute statement for an item that was not received.
Use only the facts in the user's JSON. Do not invent dates, amounts, conversations or promises.
Mention the PayPal order id and the amount exactly as given. Plain, polite, factual. 2 to 4 sentences. No headings.`;

export function disputeTemplate(f: DisputeFacts): string {
  const what = f.carrierStatus === "LOST" ? "the carrier reports the parcel lost in transit" : "the parcel is still not delivered";
  return (
    `I am filing a claim for PayPal order ${f.paypalOrderId} from ${f.merchantId} (${f.items}), paid ${f.amount} on ${f.paidAt}. ` +
    `The item has not been received: ${what}, and it was expected by ${f.expectedBy}. ` +
    `I am requesting a full refund of ${f.amount}. Signed receipts of the purchase and the tracking history are attached.`
  );
}

function valid(text: string, f: DisputeFacts): boolean {
  return text.length >= 60 && text.length <= 1200 && text.includes(f.paypalOrderId) && text.includes(f.amount);
}

/** The model writes; checks decide. Anything that fails the checks falls back to the factual template. */
export async function writeDisputeStatement(f: DisputeFacts, llm: LlmClient): Promise<{ statement: string; writer: "model" | "template" }> {
  try {
    const res = await llm.complete({ system: DISPUTE_SYSTEM, messages: [{ role: "user", content: JSON.stringify(f) }], tools: [], maxTokens: 400 });
    const text = res.content
      .filter((b) => b.type === "text")
      .map((b) => (b as { text: string }).text)
      .join("")
      .trim();
    if (valid(text, f)) return { statement: text, writer: "model" };
  } catch {
    // fall through to the template
  }
  return { statement: disputeTemplate(f), writer: "template" };
}
