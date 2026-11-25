import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { sectorInputSchema } from "./sector-input";

describe("sector input", () => {
  it("accepts a desk and rejects a mixed-case key", () => {
    const ok = sectorInputSchema.safeParse({
      key: "parks",
      name: "Parks",
      summary: "Street trees and public gardens.",
      order: 6,
      active: true,
    });
    assert.equal(ok.success, true);

    const bad = sectorInputSchema.safeParse({
      key: "Parks",
      name: "Parks",
      summary: "Street trees and public gardens.",
      order: 6,
      active: true,
    });
    assert.equal(bad.success, false);
  });
});
