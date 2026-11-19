import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { assertCatalog, catalog } from "./catalog";

describe("fictitious catalog", () => {
  it("obeys the status machine, routes, and form schemas", () => {
    assert.doesNotThrow(() => assertCatalog(catalog));
  });

  it("sends the building file through three sectors", () => {
    const building = catalog.protocolTypes.find((type) => type.key === "building-file");
    assert.ok(building);
    const workflow = catalog.workflows.find((item) => item.key === building.workflowKey);
    assert.ok(workflow);
    assert.deepEqual(
      workflow.stages.map((stage) => stage.sectorKey),
      ["meio-ambiente", "obras", "tributos"],
    );
    const workKind = building.formSchema.sections
      .flatMap((section) => section.fields)
      .find((field) => field.key === "workKind");
    assert.deepEqual(workKind?.options, [
      "New construction",
      "Occupancy certificate",
      "Demolition",
    ]);
  });

  it("leaves a cleared environment stage waiting at the works desk", () => {
    const protocol = catalog.protocols.find((item) => item.code === "VC-2026-1118");
    assert.ok(protocol);
    assert.equal(protocol.status, "submitted");
    assert.equal(protocol.currentSectorKey, "obras");
    assert.equal(protocol.assigneeEmail, undefined);
  });
});
