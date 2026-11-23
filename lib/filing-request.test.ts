import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { readSubmission } from "./filing-request";
import { MAX_UPLOAD_BYTES } from "./uploads";

const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0]);

describe("readSubmission", () => {
  it("reads the service, the answer JSON, and one file", async () => {
    const form = new FormData();
    form.set("typeKey", "tree-care");
    form.set("answers", JSON.stringify({ place: { nearbyStreet: "Rua dos Exemplos" } }));
    form.set(
      "document.canopy-photo",
      new File([jpeg], "canopy.jpg", { type: "image/jpeg" }),
    );

    const submission = await readSubmission(form);
    assert.deepEqual(submission.issues, []);
    assert.equal(submission.typeKey, "tree-care");
    assert.deepEqual(submission.answers, { place: { nearbyStreet: "Rua dos Exemplos" } });
    assert.equal(submission.files.length, 1);
    assert.equal(submission.files[0]?.requirementKey, "canopy-photo");
    assert.deepEqual(Array.from(submission.files[0]?.bytes ?? []), Array.from(jpeg));
  });

  it("reports a missing service, unreadable answers, and a second file in one slot", async () => {
    const form = new FormData();
    form.set("answers", "{");
    form.append("document.canopy-photo", new File([jpeg], "one.jpg"));
    form.append("document.canopy-photo", new File([jpeg], "two.jpg"));

    const submission = await readSubmission(form);
    const paths = submission.issues.map((issue) => issue.path);
    assert.ok(paths.includes("typeKey"));
    assert.ok(paths.includes("answers"));
    assert.ok(paths.includes("documents.canopy-photo"));
    assert.equal(submission.files.length, 1);
  });

  it("does not read a file that is over the size limit", async () => {
    const form = new FormData();
    form.set("typeKey", "tree-care");
    form.set("answers", "{}");
    form.set(
      "document.canopy-photo",
      new File([new Uint8Array(MAX_UPLOAD_BYTES + 1)], "canopy.jpg"),
    );

    const submission = await readSubmission(form);
    assert.equal(submission.files.length, 0);
    assert.equal(submission.issues[0]?.message, "This file is larger than 5 MB.");
  });
});
