import type {
  DocumentRequirement,
  FormSchema,
  ProtocolStatus,
  ReviewDecision,
  TimelineKind,
  TimelineVisibility,
  UserRole,
} from "../lib/domain";
import { previewAnalyst } from "../lib/demo";
import { answersSchema } from "../lib/form-schema";
import { replayProtocol, visitedStages } from "../lib/protocol-flow";

export type CatalogSector = {
  key: string;
  name: string;
  summary: string;
  order: number;
};

export type CatalogUser = {
  name: string;
  email: string;
  role: UserRole;
  sectorKeys: string[];
};

export type CatalogStage = {
  key: string;
  title: string;
  sectorKey: string;
  order: number;
};

export type CatalogWorkflow = {
  key: string;
  name: string;
  summary: string;
  stages: CatalogStage[];
};

export type CatalogProtocolType = {
  key: string;
  name: string;
  summary: string;
  catalogSectorKey: string;
  workflowKey: string;
  formSchema: FormSchema;
  documents: DocumentRequirement[];
};

export type CatalogEvent = {
  kind: TimelineKind;
  title: string;
  detail: string;
  sectorKey: string;
  at: string;
  visibility: TimelineVisibility;
};

export type CatalogReview = {
  stageKey: string;
  sectionKey: string;
  decision: ReviewDecision;
  notes: { authorEmail: string; body: string; at: string }[];
};

export type CatalogProtocol = {
  code: string;
  typeKey: string;
  applicantEmail: string;
  assigneeEmail?: string;
  status: ProtocolStatus;
  currentStageKey: string;
  currentSectorKey: string;
  answers: Record<string, Record<string, string | number | boolean>>;
  attachments: { requirementKey: string; fileName: string }[];
  events: CatalogEvent[];
  reviews: CatalogReview[];
};

export type Catalog = {
  sectors: CatalogSector[];
  users: CatalogUser[];
  workflows: CatalogWorkflow[];
  protocolTypes: CatalogProtocolType[];
  protocols: CatalogProtocol[];
};

const sectors: CatalogSector[] = [
  {
    key: "public-works",
    name: "Public Works",
    summary:
      "Building and public works desk. Reviews building files once earlier sectors have cleared their stage.",
    order: 1,
  },
  {
    key: "environment",
    name: "Environment",
    summary:
      "Environment desk for trees, permeable ground, and the first screen of multi-sector files.",
    order: 2,
  },
  {
    key: "taxes",
    name: "Taxes",
    summary: "Tax desk for property-tax reviews and the closing note on a building file.",
    order: 3,
  },
  {
    key: "sanitary-inspection",
    name: "Sanitary Inspection",
    summary:
      "Sanitary inspection desk for food-service clearances and similar health services.",
    order: 4,
  },
  {
    key: "street-use",
    name: "Street Use",
    summary:
      "Street-use desk for temporary occupation of sidewalks and other public edges.",
    order: 5,
  },
];

const users: CatalogUser[] = [
  {
    name: "Marina Costa",
    email: "marina.costa@valeclaro.test",
    role: "applicant",
    sectorKeys: [],
  },
  {
    name: "Paulo Neri",
    email: "paulo.neri@valeclaro.test",
    role: "applicant",
    sectorKeys: [],
  },
  {
    name: "Lina Borges",
    email: "lina.borges@valeclaro.test",
    role: "applicant",
    sectorKeys: [],
  },
  {
    name: previewAnalyst.name,
    email: previewAnalyst.email,
    role: previewAnalyst.role,
    sectorKeys: [...previewAnalyst.sectorKeys],
  },
  {
    name: "Caio Mendes",
    email: "caio.mendes@valeclaro.test",
    role: "analyst",
    sectorKeys: ["public-works"],
  },
  {
    name: "Rita Salazar",
    email: "rita.salazar@valeclaro.test",
    role: "analyst",
    sectorKeys: ["taxes"],
  },
  {
    name: "Otto Pires",
    email: "otto.pires@valeclaro.test",
    role: "analyst",
    sectorKeys: ["sanitary-inspection"],
  },
  {
    name: "Vera Lemos",
    email: "vera.lemos@valeclaro.test",
    role: "analyst",
    sectorKeys: ["street-use"],
  },
  {
    name: "Nara Quinteiro",
    email: "nara.quinteiro@valeclaro.test",
    role: "admin",
    sectorKeys: [],
  },
];

const workflows: CatalogWorkflow[] = [
  {
    key: "environment-only",
    name: "Environment desk",
    summary: "Stops only at Environment.",
    stages: [
      {
        key: "review",
        title: "Environment review",
        sectorKey: "environment",
        order: 1,
      },
    ],
  },
  {
    key: "revenue-only",
    name: "Tax desk",
    summary: "Stops only at Taxes.",
    stages: [{ key: "review", title: "Tax review", sectorKey: "taxes", order: 1 }],
  },
  {
    key: "sanitary-only",
    name: "Sanitary desk",
    summary: "Stops only at Sanitary Inspection.",
    stages: [
      {
        key: "review",
        title: "Sanitary review",
        sectorKey: "sanitary-inspection",
        order: 1,
      },
    ],
  },
  {
    key: "street-then-works",
    name: "Street use, then works",
    summary:
      "Street Use checks the occupation, then Public Works checks the physical impact.",
    stages: [
      { key: "street-use", title: "Street-use check", sectorKey: "street-use", order: 1 },
      { key: "works-check", title: "Works check", sectorKey: "public-works", order: 2 },
    ],
  },
  {
    key: "environment-works-revenue",
    name: "Environment, public works, taxes",
    summary:
      "Environment screens the site, Public Works reviews the building, and Taxes records the charge.",
    stages: [
      {
        key: "environment-screen",
        title: "Environment screen",
        sectorKey: "environment",
        order: 1,
      },
      { key: "works-review", title: "Works review", sectorKey: "public-works", order: 2 },
      { key: "tax-note", title: "Tax note", sectorKey: "taxes", order: 3 },
    ],
  },
];

const treeCareForm: FormSchema = {
  sections: [
    {
      key: "place",
      title: "Where the tree is",
      description:
        "A street reference is enough. This service does not ask for a parcel file.",
      fields: [
        { key: "nearbyStreet", label: "Nearby street", kind: "text", required: true },
        { key: "neighborhood", label: "Neighborhood", kind: "text", required: true },
        { key: "landmark", label: "Landmark", kind: "text", required: false },
      ],
    },
    {
      key: "care",
      title: "Care requested",
      fields: [
        {
          key: "action",
          label: "Action",
          kind: "select",
          required: true,
          options: ["Prune", "Remove and replace", "Inspect only"],
        },
        {
          key: "urgency",
          label: "Urgency",
          kind: "select",
          required: true,
          options: ["Planned", "Storm damage"],
        },
        { key: "note", label: "Note", kind: "textarea", required: true },
      ],
    },
  ],
};

const taxForm: FormSchema = {
  sections: [
    {
      key: "bill",
      title: "Bill to review",
      fields: [
        { key: "parcelCode", label: "Demo parcel code", kind: "text", required: true },
        { key: "taxYear", label: "Tax year", kind: "text", required: true },
      ],
    },
    {
      key: "dispute",
      title: "What looks wrong",
      fields: [
        {
          key: "topic",
          label: "Topic",
          kind: "select",
          required: true,
          options: ["Built area", "Use classification", "Exemption"],
        },
        { key: "narrative", label: "Narrative", kind: "textarea", required: true },
      ],
    },
  ],
};

const foodForm: FormSchema = {
  sections: [
    {
      key: "place",
      title: "Establishment",
      fields: [
        { key: "tradeName", label: "Trade name", kind: "text", required: true },
        { key: "activity", label: "Activity", kind: "text", required: true },
        { key: "seats", label: "Seats", kind: "number", required: true },
      ],
    },
    {
      key: "kitchen",
      title: "Food handling",
      fields: [
        {
          key: "cooksOnSite",
          label: "Food is prepared on site",
          kind: "boolean",
          required: true,
        },
        {
          key: "water",
          label: "Water source",
          kind: "select",
          required: true,
          options: ["Public network", "Private well"],
        },
      ],
    },
  ],
};

const sidewalkForm: FormSchema = {
  sections: [
    {
      key: "window",
      title: "Occupation window",
      fields: [
        { key: "startsOn", label: "Starts on", kind: "date", required: true },
        { key: "endsOn", label: "Ends on", kind: "date", required: true },
        {
          key: "frontageMeters",
          label: "Frontage in meters",
          kind: "number",
          required: true,
        },
      ],
    },
    {
      key: "impact",
      title: "Impact",
      fields: [
        { key: "purpose", label: "Purpose", kind: "textarea", required: true },
        {
          key: "blocksVehicles",
          label: "Blocks vehicle access",
          kind: "boolean",
          required: true,
        },
      ],
    },
  ],
};

const buildingForm: FormSchema = {
  sections: [
    {
      key: "proposal",
      title: "Proposal",
      description:
        "New work, an occupancy certificate, and demolition share this service.",
      fields: [
        {
          key: "workKind",
          label: "Work kind",
          kind: "select",
          required: true,
          options: ["New construction", "Occupancy certificate", "Demolition"],
        },
        { key: "summary", label: "Summary", kind: "textarea", required: true },
        {
          key: "floorArea",
          label: "Floor area in square meters",
          kind: "number",
          required: true,
        },
      ],
    },
    {
      key: "parcel",
      title: "Parcel",
      fields: [
        { key: "parcelCode", label: "Demo parcel code", kind: "text", required: true },
        { key: "neighborhood", label: "Neighborhood", kind: "text", required: true },
      ],
    },
    {
      key: "professional",
      title: "Licensed professional",
      description:
        "Name the professional and the technical responsibility record for this file.",
      fields: [
        { key: "fullName", label: "Full name", kind: "text", required: true },
        {
          key: "council",
          label: "Professional council",
          kind: "select",
          required: true,
          options: ["Engineering council", "Architecture council"],
        },
        {
          key: "registration",
          label: "Technical responsibility record",
          kind: "text",
          required: true,
        },
      ],
    },
    {
      key: "site",
      title: "Site conditions",
      fields: [
        {
          key: "treesOnParcel",
          label: "Trees on the parcel",
          kind: "boolean",
          required: true,
        },
        {
          key: "permeableNote",
          label: "Permeable area note",
          kind: "textarea",
          required: false,
        },
      ],
    },
  ],
};

const protocolTypes: CatalogProtocolType[] = [
  {
    key: "tree-care",
    name: "Street tree care",
    summary: "Ask the environment desk to prune, replace, or inspect a street tree.",
    catalogSectorKey: "environment",
    workflowKey: "environment-only",
    formSchema: treeCareForm,
    documents: [
      {
        key: "canopy-photo",
        label: "Photo of the canopy",
        detail: "A daylight photo that shows the whole crown.",
        required: true,
      },
      {
        key: "location-sketch",
        label: "Location sketch",
        detail: "Optional sketch if the street number is hard to see.",
        required: false,
      },
    ],
  },
  {
    key: "tax-review",
    name: "Property tax review",
    summary: "Ask the tax desk to look again at a property-tax bill.",
    catalogSectorKey: "taxes",
    workflowKey: "revenue-only",
    formSchema: taxForm,
    documents: [
      {
        key: "assessment-notice",
        label: "Assessment notice",
        detail: "The bill the applicant wants reviewed.",
        required: true,
      },
    ],
  },
  {
    key: "food-clearance",
    name: "Food-service clearance",
    summary: "Sanitary clearance for a place that prepares or serves food.",
    catalogSectorKey: "sanitary-inspection",
    workflowKey: "sanitary-only",
    formSchema: foodForm,
    documents: [
      {
        key: "layout-sketch",
        label: "Layout sketch",
        detail: "A simple plan of the counter and kitchen.",
        required: true,
      },
      {
        key: "handler-card",
        label: "Food-handler card",
        detail: "Training card for the person in charge.",
        required: true,
      },
    ],
  },
  {
    key: "sidewalk-occupation",
    name: "Temporary sidewalk occupation",
    summary:
      "Occupy a stretch of sidewalk for a few days. Street Use reviews it, then Public Works.",
    catalogSectorKey: "street-use",
    workflowKey: "street-then-works",
    formSchema: sidewalkForm,
    documents: [
      {
        key: "frontage-photo",
        label: "Photo of the frontage",
        detail: "The sidewalk stretch the occupation would use.",
        required: true,
      },
      {
        key: "occupation-sketch",
        label: "Occupation sketch",
        detail: "Where the barrier would sit relative to the curb.",
        required: true,
      },
    ],
  },
  {
    key: "building-file",
    name: "Building file",
    summary:
      "One service for new construction, an occupancy certificate, or demolition. The route is Environment, then Public Works, then Taxes.",
    catalogSectorKey: "public-works",
    workflowKey: "environment-works-revenue",
    formSchema: buildingForm,
    documents: [
      {
        key: "survey-sheet",
        label: "Survey sheet",
        detail: "A measured sketch of the demo parcel.",
        required: true,
      },
      {
        key: "responsibility-record",
        label: "Technical responsibility record",
        detail: "The professional responsibility record for the named professional.",
        required: true,
      },
      {
        key: "site-note",
        label: "Site note",
        detail: "A short note on trees and unpaved ground.",
        required: true,
      },
    ],
  },
];

function event(
  kind: TimelineKind,
  title: string,
  detail: string,
  sectorKey: string,
  at: string,
): CatalogEvent {
  return { kind, title, detail, sectorKey, at, visibility: "public" };
}

function reviewsFor(
  stageKeys: string[],
  sectionKeys: readonly string[],
  decision: ReviewDecision,
  notes: {
    stageKey: string;
    sectionKey: string;
    authorEmail: string;
    body: string;
    at: string;
  }[] = [],
): CatalogReview[] {
  return stageKeys.flatMap((stageKey) =>
    sectionKeys.map((sectionKey) => ({
      stageKey,
      sectionKey,
      decision,
      notes: notes
        .filter((note) => note.stageKey === stageKey && note.sectionKey === sectionKey)
        .map(({ authorEmail, body, at }) => ({ authorEmail, body, at })),
    })),
  );
}

const buildingSections = ["proposal", "parcel", "professional", "site"] as const;
const buildingDocs = [
  { requirementKey: "survey-sheet", fileName: "survey-sheet.pdf" },
  { requirementKey: "responsibility-record", fileName: "responsibility-record.pdf" },
  { requirementKey: "site-note", fileName: "site-note.pdf" },
];

function buildingAnswers(input: {
  workKind: "New construction" | "Occupancy certificate" | "Demolition";
  summary: string;
  floorArea: number;
  parcelCode: string;
  neighborhood: string;
  fullName: string;
  council: "Engineering council" | "Architecture council";
  registration: string;
  treesOnParcel: boolean;
  permeableNote?: string;
}): CatalogProtocol["answers"] {
  return {
    proposal: {
      workKind: input.workKind,
      summary: input.summary,
      floorArea: input.floorArea,
    },
    parcel: { parcelCode: input.parcelCode, neighborhood: input.neighborhood },
    professional: {
      fullName: input.fullName,
      council: input.council,
      registration: input.registration,
    },
    site: {
      treesOnParcel: input.treesOnParcel,
      ...(input.permeableNote ? { permeableNote: input.permeableNote } : {}),
    },
  };
}

const helena = previewAnalyst.email;
const marina = "marina.costa@valeclaro.test";
const paulo = "paulo.neri@valeclaro.test";
const lina = "lina.borges@valeclaro.test";
const caio = "caio.mendes@valeclaro.test";
const rita = "rita.salazar@valeclaro.test";
const otto = "otto.pires@valeclaro.test";
const vera = "vera.lemos@valeclaro.test";

const protocols: CatalogProtocol[] = [
  {
    code: "VC-2026-1008",
    typeKey: "tree-care",
    applicantEmail: marina,
    status: "submitted",
    currentStageKey: "review",
    currentSectorKey: "environment",
    answers: {
      place: {
        nearbyStreet: "Example Street, 40",
        neighborhood: "Imaginary Neighborhood",
        landmark: "Across from the demo square",
      },
      care: {
        action: "Prune",
        urgency: "Planned",
        note: "Lower branches reach the sidewalk on this fictional block.",
      },
    },
    attachments: [{ requirementKey: "canopy-photo", fileName: "canopy-photo.jpg" }],
    events: [
      event(
        "filed",
        "Protocol filed",
        "Marina Costa filed a street tree care request.",
        "environment",
        "2026-11-16T14:00:00.000Z",
      ),
    ],
    reviews: [],
  },
  {
    code: "VC-2026-1014",
    typeKey: "tree-care",
    applicantEmail: paulo,
    assigneeEmail: helena,
    status: "in_review",
    currentStageKey: "review",
    currentSectorKey: "environment",
    answers: {
      place: {
        nearbyStreet: "Model Lane, 12",
        neighborhood: "Imaginary Neighborhood",
      },
      care: {
        action: "Remove and replace",
        urgency: "Storm damage",
        note: "The trunk split in the sample storm story.",
      },
    },
    attachments: [{ requirementKey: "canopy-photo", fileName: "canopy-clear.jpg" }],
    events: [
      event(
        "filed",
        "Protocol filed",
        "Paulo Neri filed a street tree care request.",
        "environment",
        "2026-11-02T13:00:00.000Z",
      ),
      event(
        "claimed",
        "Claimed by the environment desk",
        "Helena Duarte took the protocol.",
        "environment",
        "2026-11-03T11:00:00.000Z",
      ),
      event(
        "correction_requested",
        "Photo sent back",
        "The environment desk needs a clearer photo of the canopy.",
        "environment",
        "2026-11-04T15:30:00.000Z",
      ),
      event(
        "resubmitted",
        "Correction returned",
        "The applicant sent a new canopy photo.",
        "environment",
        "2026-11-06T10:00:00.000Z",
      ),
      event(
        "claimed",
        "Claimed again",
        "Helena Duarte picked the corrected file back up.",
        "environment",
        "2026-11-06T16:00:00.000Z",
      ),
    ],
    reviews: [
      {
        stageKey: "review",
        sectionKey: "place",
        decision: "cleared",
        notes: [
          {
            authorEmail: helena,
            body: "The street reference is specific enough to find the tree.",
            at: "2026-11-06T16:20:00.000Z",
          },
        ],
      },
      { stageKey: "review", sectionKey: "care", decision: "pending", notes: [] },
    ],
  },
  {
    code: "VC-2026-1022",
    typeKey: "tax-review",
    applicantEmail: lina,
    assigneeEmail: rita,
    status: "corrections_requested",
    currentStageKey: "review",
    currentSectorKey: "taxes",
    answers: {
      bill: { parcelCode: "VC-DEMO-220", taxYear: "2025" },
      dispute: {
        topic: "Built area",
        narrative:
          "The billed area counts a covered patio that this demo treats as open.",
      },
    },
    attachments: [
      { requirementKey: "assessment-notice", fileName: "assessment-notice.pdf" },
    ],
    events: [
      event(
        "filed",
        "Protocol filed",
        "Lina Borges asked for a property-tax review.",
        "taxes",
        "2026-11-08T12:00:00.000Z",
      ),
      event(
        "claimed",
        "Claimed by the revenue desk",
        "Rita Salazar took the protocol.",
        "taxes",
        "2026-11-09T09:30:00.000Z",
      ),
      event(
        "correction_requested",
        "Tax year sent back",
        "The tax year on the form does not match the notice.",
        "taxes",
        "2026-11-10T14:10:00.000Z",
      ),
    ],
    reviews: [
      {
        stageKey: "review",
        sectionKey: "bill",
        decision: "changes_requested",
        notes: [
          {
            authorEmail: rita,
            body: "The tax year on the form is 2025 and the notice is 2026. Please align them.",
            at: "2026-11-10T14:10:00.000Z",
          },
        ],
      },
      { stageKey: "review", sectionKey: "dispute", decision: "pending", notes: [] },
    ],
  },
  {
    code: "VC-2026-1030",
    typeKey: "food-clearance",
    applicantEmail: marina,
    assigneeEmail: otto,
    status: "approved",
    currentStageKey: "review",
    currentSectorKey: "sanitary-inspection",
    answers: {
      place: { tradeName: "Model Bakery", activity: "Bakery counter", seats: 18 },
      kitchen: { cooksOnSite: true, water: "Public network" },
    },
    attachments: [
      { requirementKey: "layout-sketch", fileName: "layout-sketch.pdf" },
      { requirementKey: "handler-card", fileName: "handler-card.pdf" },
    ],
    events: [
      event(
        "filed",
        "Protocol filed",
        "Marina Costa filed a food-service clearance.",
        "sanitary-inspection",
        "2026-11-01T11:00:00.000Z",
      ),
      event(
        "claimed",
        "Claimed by sanitary watch",
        "Otto Pires took the protocol.",
        "sanitary-inspection",
        "2026-11-02T10:00:00.000Z",
      ),
      event(
        "approved",
        "Clearance approved",
        "Sanitary watch approved the fictional bakery counter.",
        "sanitary-inspection",
        "2026-11-05T17:00:00.000Z",
      ),
    ],
    reviews: reviewsFor(["review"], ["place", "kitchen"], "cleared", [
      {
        stageKey: "review",
        sectionKey: "kitchen",
        authorEmail: otto,
        body: "The layout sketch matches the seat count in this demo.",
        at: "2026-11-05T16:40:00.000Z",
      },
    ]),
  },
  {
    code: "VC-2026-1041",
    typeKey: "sidewalk-occupation",
    applicantEmail: paulo,
    assigneeEmail: vera,
    status: "in_review",
    currentStageKey: "street-use",
    currentSectorKey: "street-use",
    answers: {
      window: { startsOn: "2026-12-02", endsOn: "2026-12-06", frontageMeters: 8 },
      impact: {
        purpose: "Scaffolding for a fictional facade repair.",
        blocksVehicles: false,
      },
    },
    attachments: [
      { requirementKey: "frontage-photo", fileName: "frontage-photo.jpg" },
      { requirementKey: "occupation-sketch", fileName: "occupation-sketch.pdf" },
    ],
    events: [
      event(
        "filed",
        "Protocol filed",
        "Paulo Neri filed a sidewalk occupation.",
        "street-use",
        "2026-11-12T13:20:00.000Z",
      ),
      event(
        "claimed",
        "Claimed by the street-use desk",
        "Vera Lemos took the protocol.",
        "street-use",
        "2026-11-13T09:00:00.000Z",
      ),
    ],
    reviews: reviewsFor(["street-use"], ["window", "impact"], "pending"),
  },
  {
    code: "VC-2026-1055",
    typeKey: "sidewalk-occupation",
    applicantEmail: lina,
    assigneeEmail: caio,
    status: "in_review",
    currentStageKey: "works-check",
    currentSectorKey: "public-works",
    answers: {
      window: { startsOn: "2026-11-20", endsOn: "2026-11-22", frontageMeters: 4 },
      impact: {
        purpose: "A delivery lift for a fictional shop fit-out.",
        blocksVehicles: true,
      },
    },
    attachments: [
      { requirementKey: "frontage-photo", fileName: "frontage-photo.jpg" },
      { requirementKey: "occupation-sketch", fileName: "occupation-sketch.pdf" },
    ],
    events: [
      event(
        "filed",
        "Protocol filed",
        "Lina Borges filed a sidewalk occupation.",
        "street-use",
        "2026-11-04T12:00:00.000Z",
      ),
      event(
        "claimed",
        "Claimed by the street-use desk",
        "Vera Lemos took the protocol.",
        "street-use",
        "2026-11-05T10:00:00.000Z",
      ),
      event(
        "advanced",
        "Moved to Public Works",
        "Street Use cleared the occupation window. Public Works can now claim the file.",
        "public-works",
        "2026-11-07T15:00:00.000Z",
      ),
      event(
        "claimed",
        "Claimed by the works desk",
        "Caio Mendes took the protocol.",
        "public-works",
        "2026-11-08T11:30:00.000Z",
      ),
    ],
    reviews: [
      ...reviewsFor(["street-use"], ["window", "impact"], "cleared", [
        {
          stageKey: "street-use",
          sectionKey: "window",
          authorEmail: vera,
          body: "The frontage length matches the sketch.",
          at: "2026-11-07T14:40:00.000Z",
        },
      ]),
      ...reviewsFor(["works-check"], ["window", "impact"], "pending"),
    ],
  },
  {
    code: "VC-2026-1062",
    typeKey: "building-file",
    applicantEmail: marina,
    assigneeEmail: helena,
    status: "in_review",
    currentStageKey: "environment-screen",
    currentSectorKey: "environment",
    answers: buildingAnswers({
      workKind: "New construction",
      summary: "Single-storey studio on a demo parcel.",
      floorArea: 64,
      parcelCode: "VC-DEMO-441",
      neighborhood: "Imaginary Neighborhood",
      fullName: "Teo Martins",
      council: "Architecture council",
      registration: "TRR-DEMO-2044",
      treesOnParcel: false,
      permeableNote: "The front setback stays unpaved in this example.",
    }),
    attachments: buildingDocs,
    events: [
      event(
        "filed",
        "Protocol filed",
        "Marina Costa filed a building file for new construction.",
        "environment",
        "2026-11-14T09:00:00.000Z",
      ),
      event(
        "claimed",
        "Claimed by the environment desk",
        "Helena Duarte took the first stage.",
        "environment",
        "2026-11-15T10:30:00.000Z",
      ),
    ],
    reviews: reviewsFor(["environment-screen"], buildingSections, "pending"),
  },
  {
    code: "VC-2026-1077",
    typeKey: "building-file",
    applicantEmail: paulo,
    assigneeEmail: caio,
    status: "in_review",
    currentStageKey: "works-review",
    currentSectorKey: "public-works",
    answers: buildingAnswers({
      workKind: "Occupancy certificate",
      summary: "Occupy a fictional renovation already described in this demo.",
      floorArea: 80,
      parcelCode: "VC-DEMO-455",
      neighborhood: "Sample Village",
      fullName: "Dora Klein",
      council: "Engineering council",
      registration: "TRR-DEMO-1180",
      treesOnParcel: false,
    }),
    attachments: buildingDocs,
    events: [
      event(
        "filed",
        "Protocol filed",
        "Paulo Neri filed a building file for an occupancy certificate.",
        "environment",
        "2026-11-03T09:00:00.000Z",
      ),
      event(
        "claimed",
        "Claimed by the environment desk",
        "Helena Duarte took the first stage.",
        "environment",
        "2026-11-04T09:40:00.000Z",
      ),
      event(
        "advanced",
        "Moved to Public Works",
        "Environment found no mapped constraint on this fictional parcel.",
        "public-works",
        "2026-11-06T13:00:00.000Z",
      ),
      event(
        "claimed",
        "Claimed by the works desk",
        "Caio Mendes took the works stage.",
        "public-works",
        "2026-11-07T11:00:00.000Z",
      ),
    ],
    reviews: [
      ...reviewsFor(["environment-screen"], buildingSections, "cleared", [
        {
          stageKey: "environment-screen",
          sectionKey: "site",
          authorEmail: helena,
          body: "No protected trees are declared on this demo parcel.",
          at: "2026-11-06T12:40:00.000Z",
        },
      ]),
      ...reviewsFor(["works-review"], buildingSections, "pending"),
    ],
  },
  {
    code: "VC-2026-1088",
    typeKey: "building-file",
    applicantEmail: lina,
    status: "draft",
    currentStageKey: "environment-screen",
    currentSectorKey: "environment",
    answers: buildingAnswers({
      workKind: "Demolition",
      summary: "Remove a fictional outbuilding.",
      floorArea: 22,
      parcelCode: "VC-DEMO-470",
      neighborhood: "Sample Village",
      fullName: "Teo Martins",
      council: "Architecture council",
      registration: "TRR-DEMO-2044",
      treesOnParcel: true,
      permeableNote: "One demo tree sits on the side line.",
    }),
    attachments: [{ requirementKey: "survey-sheet", fileName: "survey-sheet.pdf" }],
    events: [],
    reviews: [],
  },
  {
    code: "VC-2026-1094",
    typeKey: "building-file",
    applicantEmail: marina,
    assigneeEmail: helena,
    status: "rejected",
    currentStageKey: "environment-screen",
    currentSectorKey: "environment",
    answers: buildingAnswers({
      workKind: "New construction",
      summary: "A new room on a parcel inside the demo spring buffer.",
      floorArea: 30,
      parcelCode: "VC-DEMO-490",
      neighborhood: "Imaginary Neighborhood",
      fullName: "Dora Klein",
      council: "Engineering council",
      registration: "TRR-DEMO-1180",
      treesOnParcel: true,
    }),
    attachments: buildingDocs,
    events: [
      event(
        "filed",
        "Protocol filed",
        "Marina Costa filed a building file for new construction.",
        "environment",
        "2026-11-09T10:00:00.000Z",
      ),
      event(
        "claimed",
        "Claimed by the environment desk",
        "Helena Duarte took the first stage.",
        "environment",
        "2026-11-10T10:00:00.000Z",
      ),
      event(
        "rejected",
        "Closed by the environment desk",
        "The parcel overlaps the demonstration spring buffer, so the file stops here.",
        "environment",
        "2026-11-11T16:00:00.000Z",
      ),
    ],
    reviews: reviewsFor(["environment-screen"], buildingSections, "pending", [
      {
        stageKey: "environment-screen",
        sectionKey: "site",
        authorEmail: helena,
        body: "Closing the file: the parcel overlaps the demonstration spring buffer.",
        at: "2026-11-11T15:50:00.000Z",
      },
    ]),
  },
  {
    code: "VC-2026-1106",
    typeKey: "food-clearance",
    applicantEmail: paulo,
    status: "submitted",
    currentStageKey: "review",
    currentSectorKey: "sanitary-inspection",
    answers: {
      place: { tradeName: "Sample Snack Counter", activity: "Snack counter", seats: 6 },
      kitchen: { cooksOnSite: false, water: "Public network" },
    },
    attachments: [
      { requirementKey: "layout-sketch", fileName: "layout-sketch.pdf" },
      { requirementKey: "handler-card", fileName: "handler-card.pdf" },
    ],
    events: [
      event(
        "filed",
        "Protocol filed",
        "Paulo Neri filed a food-service clearance.",
        "sanitary-inspection",
        "2026-11-17T18:00:00.000Z",
      ),
    ],
    reviews: [],
  },
  {
    code: "VC-2026-1118",
    typeKey: "building-file",
    applicantEmail: lina,
    status: "submitted",
    currentStageKey: "works-review",
    currentSectorKey: "public-works",
    answers: buildingAnswers({
      workKind: "New construction",
      summary: "A small demo workshop behind an existing house.",
      floorArea: 48,
      parcelCode: "VC-DEMO-512",
      neighborhood: "Sample Village",
      fullName: "Teo Martins",
      council: "Architecture council",
      registration: "TRR-DEMO-2044",
      treesOnParcel: false,
    }),
    attachments: buildingDocs,
    events: [
      event(
        "filed",
        "Protocol filed",
        "Lina Borges filed a building file for new construction.",
        "environment",
        "2026-11-05T09:10:00.000Z",
      ),
      event(
        "claimed",
        "Claimed by the environment desk",
        "Helena Duarte took the first stage.",
        "environment",
        "2026-11-06T09:10:00.000Z",
      ),
      event(
        "advanced",
        "Moved to Public Works",
        "Environment cleared its screen. The file is waiting for Public Works.",
        "public-works",
        "2026-11-08T12:00:00.000Z",
      ),
    ],
    reviews: reviewsFor(["environment-screen"], buildingSections, "cleared"),
  },
  {
    code: "VC-2026-1124",
    typeKey: "building-file",
    applicantEmail: paulo,
    assigneeEmail: rita,
    status: "approved",
    currentStageKey: "tax-note",
    currentSectorKey: "taxes",
    answers: buildingAnswers({
      workKind: "New construction",
      summary: "A fictional porch enclosure with no change to the footprint.",
      floorArea: 12,
      parcelCode: "VC-DEMO-530",
      neighborhood: "Imaginary Neighborhood",
      fullName: "Dora Klein",
      council: "Engineering council",
      registration: "TRR-DEMO-1180",
      treesOnParcel: false,
      permeableNote: "The porch stays over the existing slab.",
    }),
    attachments: buildingDocs,
    events: [
      event(
        "filed",
        "Protocol filed",
        "Paulo Neri filed a building file for new construction.",
        "environment",
        "2026-11-01T08:30:00.000Z",
      ),
      event(
        "claimed",
        "Claimed by the environment desk",
        "Helena Duarte took the first stage.",
        "environment",
        "2026-11-01T15:00:00.000Z",
      ),
      event(
        "advanced",
        "Moved to Public Works",
        "Environment cleared the site screen.",
        "public-works",
        "2026-11-03T15:00:00.000Z",
      ),
      event(
        "claimed",
        "Claimed by the works desk",
        "Caio Mendes took the works stage.",
        "public-works",
        "2026-11-04T15:00:00.000Z",
      ),
      event(
        "advanced",
        "Moved to Taxes",
        "Public Works cleared the proposal. The file is waiting for the tax note.",
        "taxes",
        "2026-11-07T15:00:00.000Z",
      ),
      event(
        "claimed",
        "Claimed by the revenue desk",
        "Rita Salazar took the last stage.",
        "taxes",
        "2026-11-10T15:00:00.000Z",
      ),
      event(
        "approved",
        "Building file approved",
        "Taxes recorded the closing note and approved the protocol.",
        "taxes",
        "2026-11-12T15:00:00.000Z",
      ),
    ],
    reviews: [
      ...reviewsFor(["environment-screen"], buildingSections, "cleared"),
      ...reviewsFor(["works-review"], buildingSections, "cleared"),
      ...reviewsFor(["tax-note"], buildingSections, "cleared", [
        {
          stageKey: "tax-note",
          sectionKey: "proposal",
          authorEmail: rita,
          body: "The floor area matches the sample charge table for this demo.",
          at: "2026-11-12T14:30:00.000Z",
        },
      ]),
    ],
  },
];

export const catalog: Catalog = {
  sectors,
  users,
  workflows,
  protocolTypes,
  protocols,
};

function unique(values: string[], label: string): Set<string> {
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) {
      throw new Error(`Duplicate ${label}: ${value}`);
    }
    seen.add(value);
  }
  return seen;
}

export function assertCatalog(data: Catalog): void {
  const sectorKeys = unique(
    data.sectors.map((sector) => sector.key),
    "sector",
  );
  unique(
    data.users.map((user) => user.email),
    "user",
  );
  const usersByEmail = new Map(data.users.map((user) => [user.email, user]));
  const workflowsByKey = new Map(
    data.workflows.map((workflow) => [workflow.key, workflow]),
  );
  unique(
    data.workflows.map((workflow) => workflow.key),
    "workflow",
  );
  const typesByKey = new Map(data.protocolTypes.map((type) => [type.key, type]));
  unique(
    data.protocolTypes.map((type) => type.key),
    "protocol type",
  );
  unique(
    data.protocols.map((protocol) => protocol.code),
    "protocol",
  );

  for (const user of data.users) {
    if (!user.email.endsWith("@valeclaro.test")) {
      throw new Error(`${user.email} must use the fictitious valeclaro.test domain.`);
    }
    for (const sectorKey of user.sectorKeys) {
      if (!sectorKeys.has(sectorKey)) {
        throw new Error(`${user.email} references unknown sector ${sectorKey}.`);
      }
    }
    if (user.role === "analyst" && user.sectorKeys.length === 0) {
      throw new Error(`${user.email} is an analyst without a sector.`);
    }
    if (user.role !== "analyst" && user.sectorKeys.length > 0) {
      throw new Error(`${user.email} should not be assigned to a sector.`);
    }
  }

  for (const workflow of data.workflows) {
    if (workflow.stages.length === 0) {
      throw new Error(`Workflow ${workflow.key} has no stages.`);
    }
    unique(
      workflow.stages.map((stage) => stage.key),
      `${workflow.key} stage`,
    );
    unique(
      workflow.stages.map((stage) => String(stage.order)),
      `${workflow.key} stage order`,
    );
    for (const stage of workflow.stages) {
      if (!sectorKeys.has(stage.sectorKey)) {
        throw new Error(
          `Workflow ${workflow.key} uses unknown sector ${stage.sectorKey}.`,
        );
      }
    }
  }

  for (const type of data.protocolTypes) {
    if (!sectorKeys.has(type.catalogSectorKey)) {
      throw new Error(`${type.key} is published by an unknown sector.`);
    }
    const workflow = workflowsByKey.get(type.workflowKey);
    if (!workflow) {
      throw new Error(`${type.key} uses unknown workflow ${type.workflowKey}.`);
    }
    if (type.formSchema.sections.length === 0) {
      throw new Error(`${type.key} needs at least one form section.`);
    }
    unique(
      type.formSchema.sections.map((section) => section.key),
      `${type.key} section`,
    );
    unique(
      type.documents.map((document) => document.key),
      `${type.key} document`,
    );
    for (const section of type.formSchema.sections) {
      if (section.fields.length === 0) {
        throw new Error(`${type.key}.${section.key} needs a field.`);
      }
      unique(
        section.fields.map((field) => field.key),
        `${type.key}.${section.key} field`,
      );
      for (const field of section.fields) {
        if (field.kind === "select" && (field.options?.length ?? 0) < 2) {
          throw new Error(
            `${type.key}.${section.key}.${field.key} needs select options.`,
          );
        }
      }
    }
  }

  for (const protocol of data.protocols) {
    if (!/^VC-\d{4}-\d{4}$/.test(protocol.code)) {
      throw new Error(`${protocol.code} is not a Vale Claro protocol number.`);
    }
    const type = typesByKey.get(protocol.typeKey);
    const applicant = usersByEmail.get(protocol.applicantEmail);
    if (!type || !applicant) {
      throw new Error(`${protocol.code} has an unknown type or applicant.`);
    }
    if (applicant.role !== "applicant") {
      throw new Error(`${protocol.code} must be filed by an applicant.`);
    }
    const workflow = workflowsByKey.get(type.workflowKey);
    if (!workflow) {
      throw new Error(`${protocol.code} lost its workflow.`);
    }
    const stage = workflow.stages.find((item) => item.key === protocol.currentStageKey);
    if (!stage || stage.sectorKey !== protocol.currentSectorKey) {
      throw new Error(`${protocol.code} points at a stage outside its workflow.`);
    }

    answersSchema(type.formSchema).parse(protocol.answers);

    const knownDocs = new Set(type.documents.map((document) => document.key));
    for (const attachment of protocol.attachments) {
      if (!knownDocs.has(attachment.requirementKey)) {
        throw new Error(
          `${protocol.code} attaches unknown document ${attachment.requirementKey}.`,
        );
      }
    }
    if (protocol.status !== "draft") {
      for (const document of type.documents.filter((item) => item.required)) {
        if (!protocol.attachments.some((item) => item.requirementKey === document.key)) {
          throw new Error(
            `${protocol.code} is missing required document ${document.key}.`,
          );
        }
      }
    }

    const replay = replayProtocol(protocol.events, workflow.stages);
    if (
      replay.status !== protocol.status ||
      replay.stageKey !== protocol.currentStageKey
    ) {
      throw new Error(
        `${protocol.code} timeline replays to ${replay.status} at ${replay.stageKey}, not ${protocol.status} at ${protocol.currentStageKey}.`,
      );
    }

    const times = protocol.events.map((item) => Date.parse(item.at));
    for (let index = 1; index < times.length; index += 1) {
      const previous = times[index - 1];
      const current = times[index];
      if (previous === undefined || current === undefined || current < previous) {
        throw new Error(`${protocol.code} timeline is out of order.`);
      }
    }

    const waiting = protocol.status === "draft" || protocol.status === "submitted";
    if (waiting && protocol.assigneeEmail) {
      throw new Error(`${protocol.code} is unclaimed and should not have an assignee.`);
    }
    if (!waiting && !protocol.assigneeEmail) {
      throw new Error(`${protocol.code} needs the analyst who holds it.`);
    }
    if (protocol.assigneeEmail) {
      const assignee = usersByEmail.get(protocol.assigneeEmail);
      if (!assignee || assignee.role !== "analyst") {
        throw new Error(`${protocol.code} assignee must be an analyst.`);
      }
      if (!assignee.sectorKeys.includes(protocol.currentSectorKey)) {
        throw new Error(`${protocol.code} is assigned outside the current sector.`);
      }
    }

    const visited = visitedStages(workflow.stages, protocol.currentStageKey);
    const stagesNeedingReviews =
      protocol.status === "draft"
        ? []
        : protocol.status === "submitted"
          ? visited.slice(0, -1)
          : visited;
    const sectionKeys = type.formSchema.sections.map((section) => section.key);
    const expected = new Set(
      stagesNeedingReviews.flatMap((item) =>
        sectionKeys.map((sectionKey) => `${item.key}:${sectionKey}`),
      ),
    );
    const actual = new Set(
      protocol.reviews.map((review) => `${review.stageKey}:${review.sectionKey}`),
    );
    if (expected.size !== actual.size || [...expected].some((key) => !actual.has(key))) {
      throw new Error(
        `${protocol.code} reviews do not match the stages already visited.`,
      );
    }
    for (const review of protocol.reviews) {
      if (!sectionKeys.includes(review.sectionKey)) {
        throw new Error(`${protocol.code} reviews unknown section ${review.sectionKey}.`);
      }
      for (const note of review.notes) {
        const author = usersByEmail.get(note.authorEmail);
        if (!author || author.role === "applicant") {
          throw new Error(`${protocol.code} has a note from someone who cannot review.`);
        }
      }
    }
  }
}
