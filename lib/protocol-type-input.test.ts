import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { protocolTypeInputSchema } from "./protocol-type-input";

const valid = {
  key: "tree-permit",
  name: "Tree permit",
  summary: "Ask Environment to look at a street tree.",
  catalogSectorKey: "environment",
  workflowKey: "environment-only",
  active: true,
  formSchema: {
    sections: [
      {
        key: "place",
        title: "Place",
        fields: [
          { key: "street", label: "Street", kind: "text", required: true },
          {
            key: "action",
            label: "Action",
            kind: "select",
            required: true,
            options: ["Prune", "Inspect"],
          },
        ],
      },
    ],
  },
  documents: [
    {
      key: "photo",
      label: "Photo",
      detail: "A daylight photo of the tree.",
      required: true,
    },
  ],
};

describe("protocol type input", () => {
  it("accepts a form schema and a required document", () => {
    assert.equal(protocolTypeInputSchema.safeParse(valid).success, true);
  });

  it("rejects a select field without options", () => {
    const parsed = protocolTypeInputSchema.safeParse({
      ...valid,
      formSchema: {
        sections: [
          {
            key: "place",
            title: "Place",
            fields: [{ key: "action", label: "Action", kind: "select", required: true }],
          },
        ],
      },
    });
    assert.equal(parsed.success, false);
  });

  it("rejects duplicate section keys", () => {
    const parsed = protocolTypeInputSchema.safeParse({
      ...valid,
      formSchema: {
        sections: [valid.formSchema.sections[0], valid.formSchema.sections[0]],
      },
    });
    assert.equal(parsed.success, false);
  });
});
