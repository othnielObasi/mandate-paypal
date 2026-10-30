"use client";

import { api } from "./api";

export type PasskeyView = { credentialId: string; label: string; rpId: string; createdAt: string };
export type PasskeyAssertion = { credentialId: string; clientDataJSON: string; authenticatorData: string; signature: string };

const toB64url = (b: ArrayBuffer | Uint8Array) => {
  const bytes = b instanceof Uint8Array ? b : new Uint8Array(b);
  let s = "";
  for (const x of bytes) s += String.fromCharCode(x);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};
const fromB64url = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/") + "=".repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0));

/** Passkeys need a secure page that is not inside a sandboxed frame (the standalone preview falls back to a demo key). */
export function passkeysAvailable(): boolean {
  try {
    return typeof window !== "undefined" && window.isSecureContext && !!window.PublicKeyCredential && !!navigator.credentials && location.protocol !== "file:";
  } catch {
    return false;
  }
}

export async function listPasskeys(mandateId: string) {
  return api<{ challenge: string; passkeys: PasskeyView[] }>(`/api/passkeys?mandateId=${encodeURIComponent(mandateId)}`);
}

const friendly = (e: unknown, what: string): Error =>
  e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "AbortError") ? new Error(`${what} was cancelled or timed out. Nothing changed.`) : e instanceof Error ? e : new Error(String(e));

export async function registerPasskey(mandateId: string, label: string): Promise<PasskeyView> {
  const { challenge } = await listPasskeys(mandateId);
  const cred = (await navigator.credentials
    .create({
    publicKey: {
      challenge: fromB64url(challenge),
      rp: { name: "Mandate", id: location.hostname },
      user: { id: new TextEncoder().encode(mandateId).slice(0, 64), name: "mandate-user", displayName: "Mandate approvals" },
      pubKeyCredParams: [{ type: "public-key", alg: -7 }],
      authenticatorSelection: { userVerification: "required", residentKey: "preferred" },
      attestation: "none",
      timeout: 60_000,
    },
  })
    .catch((e) => {
      throw friendly(e, "Passkey setup");
    })) as PublicKeyCredential | null;
  if (!cred) throw new Error("Passkey setup was cancelled.");
  const res = cred.response as AuthenticatorAttestationResponse;
  const spki = res.getPublicKey?.();
  if (!spki || res.getPublicKeyAlgorithm?.() !== -7) throw new Error("This device's passkey type isn't supported. Mandate needs ES256 (P-256).");
  return api<PasskeyView>("/api/passkeys", {
    method: "POST",
    body: JSON.stringify({ mandateId, label, credentialId: toB64url(cred.rawId), publicKey: toB64url(spki), clientDataJSON: toB64url(res.clientDataJSON) }),
  });
}

/** Asks the device to sign this approval's exact cart. */
export async function signApproval(approvalId: string): Promise<PasskeyAssertion> {
  const c = await api<{ challenge: string; rpId: string | null; allowCredentials: string[] }>(`/api/approvals/${encodeURIComponent(approvalId)}/passkey`);
  const cred = (await navigator.credentials
    .get({
    publicKey: {
      challenge: fromB64url(c.challenge),
      ...(c.rpId ? { rpId: c.rpId } : {}),
      allowCredentials: c.allowCredentials.map((id) => ({ type: "public-key" as const, id: fromB64url(id) })),
      userVerification: "required",
      timeout: 60_000,
    },
  })
    .catch((e) => {
      throw friendly(e, "Passkey approval");
    })) as PublicKeyCredential | null;
  if (!cred) throw new Error("Passkey approval was cancelled.");
  const r = cred.response as AuthenticatorAssertionResponse;
  return { credentialId: toB64url(cred.rawId), clientDataJSON: toB64url(r.clientDataJSON), authenticatorData: toB64url(r.authenticatorData), signature: toB64url(r.signature) };
}
