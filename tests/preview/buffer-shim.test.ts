import { describe, it, expect } from "vitest";
import { Buffer as Shim } from "../../preview/shims/buffer";

describe("browser Buffer shim", () => {
  it("is the npm package, not Node's built-in", () => {
    expect(Shim).not.toBe(globalThis.Buffer);
  });
  it("encodes and decodes base64url exactly like Node", () => {
    for (const bytes of [[], [0xfb], [0xfb, 0xff], [0xfb, 0xff, 0xbf], [1, 2, 3, 250, 251, 252, 253, 254, 255]]) {
      const node = Buffer.from(bytes).toString("base64url");
      expect(Shim.from(bytes).toString("base64url")).toBe(node);
      expect([...Shim.from(node, "base64url")]).toEqual(bytes);
    }
    expect(Shim.isEncoding("base64url")).toBe(true);
    expect(Shim.from("aGk", "base64url").toString("utf8")).toBe("hi");
  });
});
