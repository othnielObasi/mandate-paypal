import { z } from "zod";
import { checkClientData, clientOrigin, registrationChallenge, spkiToJwk } from "@/lib/passkey/webauthn";
import { passkeyOwner } from "@/lib/passkey/store";
import { getContainer } from "@/lib/server/container";
import { handle, HttpError, json, readBody } from "@/lib/server/http";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const b64u = z.string().regex(/^[A-Za-z0-9_-]+$/).max(8192);
const Body = z
  .object({
    mandateId: z.string().min(1),
    credentialId: b64u,
    /** AuthenticatorAttestationResponse.getPublicKey(): P-256 SPKI, base64url. */
    publicKey: b64u,
    clientDataJSON: b64u,
    label: z.string().trim().min(1).max(60).optional(),
  })
  .strict();

const view = (k: { credentialId: string; label: string; createdAt: string; rpId: string }) => ({ credentialId: k.credentialId, label: k.label, rpId: k.rpId, createdAt: k.createdAt });

/** Passkeys that can approve purchases under a mandate's owner. */
export const GET = handle(async (req: Request) => {
  const mandateId = new URL(req.url).searchParams.get("mandateId");
  const c = getContainer();
  const m = mandateId ? await c.mandates.get(mandateId) : undefined;
  if (!m) throw new HttpError(404, "Mandate not found.");
  return json({ challenge: registrationChallenge(m.id), passkeys: (await c.stores.passkeys.listForUser(passkeyOwner(m))).map(view) });
});

/** Register a passkey. Only its public key is kept. */
export const POST = handle(async (req: Request) => {
  const b = await readBody(req, Body);
  const c = getContainer();
  const m = await c.mandates.get(b.mandateId);
  if (!m) throw new HttpError(404, "Mandate not found.");
  const bad = checkClientData(b.clientDataJSON, { type: "webauthn.create", challenge: registrationChallenge(m.id), origin: c.mcp.allowedOrigins });
  if (bad) throw new HttpError(400, `Passkey registration failed: ${bad}.`);
  let publicKey;
  try {
    publicKey = spkiToJwk(b.publicKey);
  } catch (e) {
    throw new HttpError(400, e instanceof Error ? e.message : "Unsupported passkey.");
  }
  const origin = clientOrigin(b.clientDataJSON);
  const rec = { credentialId: b.credentialId, userId: passkeyOwner(m), publicKey, rpId: new URL(origin).hostname, label: b.label ?? "This device", createdAt: new Date().toISOString() };
  await c.stores.passkeys.add(rec);
  await c.receipts.append({ mandateId: m.id, type: "passkey", summary: `Registered a passkey (${rec.label}) for approving purchases`, payload: { credentialId: rec.credentialId, rpId: rec.rpId } });
  return json(view(rec), 201);
});
