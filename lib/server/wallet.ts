import type { Container } from "./container";

/** Receipts on the user's live mandates, so the wallet change is in the signed log. */
async function note(c: Container, userId: string, summary: string, payload: Record<string, unknown>) {
  for (const m of await c.mandates.list(userId)) {
    if (m.status !== "revoked") await c.receipts.append({ mandateId: m.id, type: "wallet", summary, payload });
  }
}

export async function connectWallet(c: Container, userId: string, setupTokenId: string) {
  const t = await c.vault.finishSetup(setupTokenId);
  const old = await c.stores.wallets.get(userId);
  await c.stores.wallets.put({ userId, paymentTokenId: t.paymentTokenId, customerId: t.customerId, email: t.email, connectedAt: new Date().toISOString() });
  if (old && old.paymentTokenId !== t.paymentTokenId) await c.vault.remove(old.paymentTokenId).catch(() => undefined);
  // The receipt log is public: no email or token here.
  await note(c, userId, "Connected PayPal: purchases your rules allow are paid from it", { provider: c.vault.name });
}

/** True if a wallet was removed. PayPal-side deletion is best effort: the token is forgotten here either way. */
export async function disconnectWallet(c: Container, userId: string): Promise<boolean> {
  const w = await c.stores.wallets.remove(userId);
  if (!w) return false;
  await c.vault.remove(w.paymentTokenId).catch((e) => console.warn("PayPal token delete failed:", e instanceof Error ? e.message : e));
  await note(c, userId, "Disconnected PayPal: each purchase needs a PayPal approval again", { provider: c.vault.name });
  return true;
}
