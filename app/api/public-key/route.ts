import { getContainer } from "@/lib/server/container";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/** Anyone can verify receipts and permits with this Ed25519 public key. */
export async function GET() {
  return new Response(getContainer().signer.publicKey, { headers: { "content-type": "application/x-pem-file" } });
}
