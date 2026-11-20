import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { safeNextPath } from "./safe-next";

describe("safeNextPath", () => {
  it("allows in-app paths and rejects external targets", () => {
    assert.equal(safeNextPath("/admin/protocol-types"), "/admin/protocol-types");
    assert.equal(safeNextPath("https://example.test"), "/account");
    assert.equal(safeNextPath("//example.test"), "/account");
    assert.equal(safeNextPath("/sign-in"), "/account");
    assert.equal(safeNextPath(undefined), "/account");
  });
});
