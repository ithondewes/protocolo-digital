import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, describe, it } from "node:test";
import { LocalDiskStore, assertStorageKey, documentStorageKey } from "./storage";

const roots: string[] = [];

afterEach(async () => {
  await Promise.all(
    roots.splice(0).map((root) => rm(root, { recursive: true, force: true })),
  );
});

describe("storage keys", () => {
  it("builds a key under the protocol number and rejects a path escape", () => {
    assert.equal(
      documentStorageKey("VC-2026-1200", "canopy-photo", "abc123"),
      "vc-2026-1200/canopy-photo/abc123",
    );
    assert.throws(() => assertStorageKey("../secret"), /Invalid storage key/);
    assert.throws(() => assertStorageKey("/etc/passwd"), /Invalid storage key/);
    assert.throws(
      () => documentStorageKey("VC-2026-1200", "../secret", "abc"),
      /Invalid storage key/,
    );
  });
});

describe("local disk store", () => {
  it("writes a file and reads the same bytes back", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "dp-uploads-"));
    roots.push(root);
    const store = new LocalDiskStore(root);
    const key = documentStorageKey("VC-2026-1201", "survey-sheet", "deadbeef");
    const body = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d]);

    await store.put(key, body);
    const stored = await store.read(key);
    assert.deepEqual(stored ? Array.from(stored) : null, Array.from(body));

    await store.remove(key);
    assert.equal(await store.read(key), null);
  });

  it("refuses a key that would leave the store directory", async () => {
    const root = await mkdtemp(path.join(tmpdir(), "dp-uploads-"));
    roots.push(root);
    const store = new LocalDiskStore(root);
    await assert.rejects(
      () => store.put("../outside.txt", Uint8Array.from([1])),
      /Invalid storage key/,
    );
    await assert.rejects(() => store.read("..\\outside.txt"), /Invalid storage key/);
  });
});
