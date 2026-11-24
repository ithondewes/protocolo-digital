import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { DocumentRequirement } from "./domain";
import { checkUploads, documentIssues, inspectUpload } from "./uploads";

const pdf = Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]);
const jpeg = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
const png = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00]);

const documents: DocumentRequirement[] = [
  {
    key: "canopy-photo",
    label: "Photo of the canopy",
    detail: "A daylight photo.",
    required: true,
  },
  {
    key: "location-sketch",
    label: "Location sketch",
    detail: "Optional sketch.",
    required: false,
  },
];

describe("inspectUpload", () => {
  it("accepts a jpeg, a png, and a pdf when the bytes match the name", () => {
    assert.equal(
      inspectUpload({ fileName: "canopy.jpg", byteLength: 120, header: jpeg }).ok,
      true,
    );
    assert.equal(
      inspectUpload({ fileName: "plan.PNG", byteLength: 80, header: png }).ok,
      true,
    );
    const pdfFile = inspectUpload({
      fileName: "notes/survey sheet.pdf",
      byteLength: 40,
      header: pdf,
    });
    assert.deepEqual(pdfFile, {
      ok: true,
      fileName: "survey-sheet.pdf",
      mediaType: "application/pdf",
    });
  });

  it("rejects an empty file, a file over 5 MB, and bytes that are not an allowed type", () => {
    assert.equal(
      inspectUpload({ fileName: "empty.pdf", byteLength: 0, header: pdf }).ok,
      false,
    );
    assert.equal(
      inspectUpload({
        fileName: "large.pdf",
        byteLength: 5 * 1024 * 1024 + 1,
        header: pdf,
      }).ok,
      false,
    );
    const text = inspectUpload({
      fileName: "notes.pdf",
      byteLength: 12,
      header: Uint8Array.from([0x68, 0x65, 0x6c, 0x6c, 0x6f]),
    });
    assert.equal(text.ok, false);
    if (!text.ok) {
      assert.match(text.message, /PDF, JPEG, or PNG/);
    }
  });

  it("rejects a renamed file whose contents do not match the extension", () => {
    const renamed = inspectUpload({
      fileName: "photo.pdf",
      byteLength: jpeg.byteLength,
      header: jpeg,
    });
    assert.equal(renamed.ok, false);
    if (!renamed.ok) {
      assert.match(renamed.message, /do not match/);
    }
  });
});

describe("document requirements", () => {
  it("requires the documents the service marks as required and ignores optional ones", () => {
    const missing = documentIssues(documents, []);
    assert.deepEqual(missing, [
      {
        path: "documents.canopy-photo",
        message: "Photo of the canopy is required.",
      },
    ]);
    assert.deepEqual(documentIssues(documents, ["canopy-photo"]), []);
  });

  it("rejects an unknown document and a second file for the same slot", () => {
    const issues = documentIssues(documents, ["canopy-photo", "canopy-photo", "other"]);
    assert.deepEqual(issues.map((issue) => issue.path).sort(), [
      "documents.canopy-photo",
      "documents.other",
    ]);
  });

  it("combines the catalog rule with the byte check", () => {
    const result = checkUploads(documents, [
      {
        requirementKey: "canopy-photo",
        fileName: "canopy.jpg",
        byteLength: 20,
        header: jpeg,
      },
    ]);
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.files[0]?.mediaType, "image/jpeg");
    }

    const rejected = checkUploads(documents, [
      {
        requirementKey: "canopy-photo",
        fileName: "canopy.txt",
        byteLength: 20,
        header: jpeg,
      },
    ]);
    assert.equal(rejected.ok, false);
  });
});
