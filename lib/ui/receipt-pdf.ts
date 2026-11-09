import { PDFDocument, rgb, StandardFonts } from "pdf-lib";

/** What a person needs on a receipt. The signed JSON evidence pack is the machine-verifiable version. */
export interface ReceiptData {
  paypalOrderId: string;
  captureId: string;
  paidAt: string;
  seller: string;
  items: Array<{ title: string; qty: number; unitMinor: number }>;
  totalMinor: number;
  currency: string;
  /** "human_present": the user approved it; otherwise it was within the signed rules. */
  mode: string;
  receiptSeq: number | null;
  verifyUrl: string;
}

const money = (minor: number, currency: string) => `${currency === "USD" ? "$" : `${currency} `}${(minor / 100).toFixed(2)}`;
/** The built-in PDF fonts only cover basic Latin: keep text to that. */
const plain = (s: string) => s.replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, "-").replace(/[^\x20-\x7E]/g, "");

/** A simple one-page receipt. */
export async function receiptPdf(d: ReceiptData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Mandate receipt ${d.paypalOrderId}`);
  doc.setAuthor("Mandate");
  const page = doc.addPage([595, 842]); // A4
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const ink = rgb(0.06, 0.09, 0.16);
  const muted = rgb(0.35, 0.39, 0.47);
  const accent = rgb(0.11, 0.31, 0.85);
  const line = rgb(0.88, 0.9, 0.93);
  const L = 56;
  const R = 539;
  let y = 780;

  const text = (s: string, x: number, size = 11, f = font, color = ink) => page.drawText(plain(s), { x, y, size, font: f, color });
  const right = (s: string, size = 11, f = font, color = ink) => page.drawText(plain(s), { x: R - f.widthOfTextAtSize(plain(s), size), y, size, font: f, color });
  const rule = () => page.drawLine({ start: { x: L, y }, end: { x: R, y }, thickness: 1, color: line });

  // Header: the Mandate mark and the title.
  page.drawRectangle({ x: L, y: y - 4, width: 22, height: 22, color: accent, borderColor: accent });
  page.drawLine({ start: { x: L + 6, y: y + 7 }, end: { x: L + 10, y: y + 3 }, thickness: 2.2, color: rgb(1, 1, 1) });
  page.drawLine({ start: { x: L + 10, y: y + 3 }, end: { x: L + 17, y: y + 12 }, thickness: 2.2, color: rgb(1, 1, 1) });
  text("Mandate", L + 32, 16, bold);
  right("Payment receipt", 16, bold);
  y -= 24;
  right(new Date(d.paidAt).toUTCString().replace(" GMT", " UTC"), 10, font, muted);
  y -= 34;

  text("Paid to", L, 10, font, muted);
  text("PayPal order", 330, 10, font, muted);
  y -= 15;
  text(d.seller, L, 12, bold);
  text(d.paypalOrderId, 330, 12, bold);
  y -= 28;

  // Items
  text("Item", L, 10, bold, muted);
  text("Qty", 360, 10, bold, muted);
  right("Amount", 10, bold, muted);
  y -= 8;
  rule();
  for (const i of d.items) {
    y -= 20;
    text(i.title.length > 52 ? `${i.title.slice(0, 50)}...` : i.title, L, 11);
    text(`${i.qty} x ${money(i.unitMinor, d.currency)}`, 360, 11, font, muted);
    right(money(i.unitMinor * i.qty, d.currency));
  }
  y -= 12;
  rule();
  y -= 22;
  text("Total", L, 13, bold);
  right(money(d.totalMinor, d.currency), 13, bold);
  y -= 40;

  // How it was authorised
  text("Authorised", L, 10, font, muted);
  y -= 15;
  text(d.mode === "human_present" ? "Approved by you before payment." : "Within the spending rules you signed. No approval was needed.", L, 11);
  y -= 15;
  text("Checked by Mandate's policy gate (7 rules) before any money moved.", L, 11);
  y -= 30;

  text("Payment", L, 10, font, muted);
  y -= 15;
  text(`PayPal sandbox capture ${d.captureId}`, L, 11);
  y -= 30;

  // Verify
  text("Check this payment", L, 10, font, muted);
  y -= 15;
  text(d.verifyUrl, L, 11, font, accent);
  y -= 15;
  text(`Signed receipt${d.receiptSeq ? ` #${d.receiptSeq}` : ""} in Mandate's hash-chained log.`, L, 11, font, muted);

  // Footer
  y = 70;
  rule();
  y -= 16;
  text("PayPal sandbox: no real money moved. The signed JSON evidence pack is the machine-verifiable record of this payment.", L, 8.5, font, muted);

  return doc.save();
}
