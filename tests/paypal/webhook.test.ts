import { describe, it, expect, vi } from "vitest";
import { PayPalWebhookVerifier, PayPalAuth } from "@/lib/paypal/webhook-verifier";

const headers = {
  "paypal-auth-algo": "SHA256withRSA",
  "paypal-cert-url": "https://api.sandbox.paypal.com/v1/notifications/certs/CERT-1",
  "paypal-transmission-id": "tx-1",
  "paypal-transmission-sig": "sig",
  "paypal-transmission-time": "2026-10-21T10:00:00Z",
};
const event = { id: "WH-1", event_type: "CHECKOUT.ORDER.APPROVED", resource: { id: "5O1" } };

function fetchMock(status: string) {
  return vi.fn(async (url: string, _init: RequestInit) => {
    if (url.endsWith("/v1/oauth2/token")) return new Response(JSON.stringify({ access_token: "A21", expires_in: 32400 }));
    return new Response(JSON.stringify({ verification_status: status }));
  });
}

describe("PayPal auth", () => {
  it("gets a client-credentials token from the sandbox and caches it", async () => {
    const f = fetchMock("SUCCESS");
    const auth = new PayPalAuth({ clientId: "id", clientSecret: "secret", fetch: f as unknown as typeof fetch, clock: () => 0 });
    expect(await auth.token()).toBe("A21");
    expect(await auth.token()).toBe("A21");
    expect(f).toHaveBeenCalledTimes(1);
    const [url, init] = f.mock.calls[0]!;
    expect(url).toBe("https://api-m.sandbox.paypal.com/v1/oauth2/token");
    expect((init.headers as Record<string, string>).authorization).toBe(`Basic ${Buffer.from("id:secret").toString("base64")}`);
    expect(String(init.body)).toBe("grant_type=client_credentials");
  });
});

describe("PayPal webhook verifier", () => {
  it("asks PayPal to verify the signature with the configured webhook id", async () => {
    const f = fetchMock("SUCCESS");
    const v = new PayPalWebhookVerifier({ webhookId: "WHID", auth: new PayPalAuth({ clientId: "id", clientSecret: "s", fetch: f as unknown as typeof fetch }), fetch: f as unknown as typeof fetch });
    expect(await v.verify(new Headers(headers), event)).toBe(true);
    const [url, init] = f.mock.calls[1]!;
    expect(url).toBe("https://api-m.sandbox.paypal.com/v1/notifications/verify-webhook-signature");
    expect(JSON.parse(String(init.body))).toEqual({
      auth_algo: "SHA256withRSA",
      cert_url: headers["paypal-cert-url"],
      transmission_id: "tx-1",
      transmission_sig: "sig",
      transmission_time: headers["paypal-transmission-time"],
      webhook_id: "WHID",
      webhook_event: event,
    });
  });

  it("rejects a failed verification", async () => {
    const f = fetchMock("FAILURE");
    const v = new PayPalWebhookVerifier({ webhookId: "WHID", auth: new PayPalAuth({ clientId: "id", clientSecret: "s", fetch: f as unknown as typeof fetch }), fetch: f as unknown as typeof fetch });
    expect(await v.verify(new Headers(headers), event)).toBe(false);
  });

  it("rejects without calling PayPal when signature headers are missing", async () => {
    const f = fetchMock("SUCCESS");
    const v = new PayPalWebhookVerifier({ webhookId: "WHID", auth: new PayPalAuth({ clientId: "id", clientSecret: "s", fetch: f as unknown as typeof fetch }), fetch: f as unknown as typeof fetch });
    expect(await v.verify(new Headers({}), event)).toBe(false);
    expect(f).not.toHaveBeenCalled();
  });

  it("rejects a certificate URL outside PayPal", async () => {
    const f = fetchMock("SUCCESS");
    const v = new PayPalWebhookVerifier({ webhookId: "WHID", auth: new PayPalAuth({ clientId: "id", clientSecret: "s", fetch: f as unknown as typeof fetch }), fetch: f as unknown as typeof fetch });
    expect(await v.verify(new Headers({ ...headers, "paypal-cert-url": "https://evil.example/cert" }), event)).toBe(false);
  });

  it("fails closed when PayPal cannot be reached", async () => {
    const f = vi.fn(async () => {
      throw new Error("network");
    });
    const v = new PayPalWebhookVerifier({ webhookId: "WHID", auth: new PayPalAuth({ clientId: "id", clientSecret: "s", fetch: f as unknown as typeof fetch }), fetch: f as unknown as typeof fetch });
    expect(await v.verify(new Headers(headers), event)).toBe(false);
  });
});
