import { describe, it, expect } from "vitest";
import { createContainer } from "@/lib/server/container";

describe("public app URL", () => {
  it("uses APP_URL when set", () => {
    expect(createContainer({ APP_URL: "https://mandate.example/" }).appUrl).toBe("https://mandate.example");
  });
  it("falls back to Render's external URL, so a one-click deploy needs no manual setting", () => {
    expect(createContainer({ RENDER_EXTERNAL_URL: "https://mandate-x.onrender.com" }).appUrl).toBe("https://mandate-x.onrender.com");
  });
  it("defaults to localhost for development", () => {
    expect(createContainer({}).appUrl).toBe("http://localhost:3000");
  });
});
