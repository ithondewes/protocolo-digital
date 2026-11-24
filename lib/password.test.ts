import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { hashPassword, verifyPassword } from "./password";

describe("passwords", () => {
  it("accepts the password that was hashed and rejects a different one", async () => {
    const stored = await hashPassword("vale-claro-demo");
    assert.equal(await verifyPassword("vale-claro-demo", stored), true);
    assert.equal(await verifyPassword("wrong-password", stored), false);
    assert.equal(await verifyPassword("vale-claro-demo", "not-a-hash"), false);
  });
});
