# Protocolo Digital

Protocolo Digital is an open-source hub where people file a request with a municipality and the file moves between city sectors. The sample city is **Vale Claro**, and every person, parcel, and street in the seed data is fictitious.

A sector publishes services. Each service is a protocol type with its own form and its own list of documents. A workflow says which sectors review the file, and in which order. One protocol number follows the file the whole way. Anyone who has the number can open a public timeline. Form answers, review notes, and files stay off that page.

The sample catalog includes Obras, Meio Ambiente, Tributos, Vigilância Sanitária, and Posturas. A building file is one service in that catalog, not a separate product. Its form has a work-kind field (new construction, occupancy certificate, or demolition) and its route is Meio Ambiente, then Obras, then Tributos. Other services stop at a single desk, or at two. New sectors and new forms are data, not new wizards.

## Features in this version

- Sector, workflow, protocol type, protocol, review, timeline, and user models.
- Protocol types store a form schema (sections and fields) and the documents they require.
- A status machine for `draft`, `submitted`, `in_review`, `corrections_requested`, `approved`, and `rejected`, plus a handoff rule for multi-sector routes.
- Review sections and notes keyed by the form section and the workflow stage.
- A public timeline that can hide internal events later (the assistant and staff audit will use those).
- A seed script with fictitious Vale Claro data, checked against the status machine and the form schemas.
- A landing page, a sector directory, a per-sector protocol list, and a public tracking page.
- A read-only JSON view at `/api/protocols/[code]`.
- A preview banner for Helena Duarte, an environment-desk analyst. There is no sign-in yet.

## Status machine

The source of truth is `lib/protocol-flow.ts`.

| From                    | To                      | When                                                                                                               |
| ----------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `draft`                 | `submitted`             | The applicant files the protocol.                                                                                  |
| `submitted`             | `in_review`             | An analyst at the current sector claims it.                                                                        |
| `in_review`             | `corrections_requested` | That sector sends the file back.                                                                                   |
| `corrections_requested` | `submitted`             | The applicant returns the correction.                                                                              |
| `in_review`             | `submitted`             | The sector clears its stage and a later sector is still on the route. The file waits, unclaimed, at the next desk. |
| `in_review`             | `approved`              | The sector clears its stage and it is the last one.                                                                |
| `in_review`             | `rejected`              | The sector closes the file.                                                                                        |
| `approved`, `rejected`  | —                       | Terminal.                                                                                                          |

`submitted` means "waiting to be claimed at the current sector". That is true just after filing, after a correction comes back, and after the previous sector hands the file on. Approving is refused while a later stage still exists. `handoffAfterClearance` is the function that encodes that choice.

A section decision (`pending`, `cleared`, `changes_requested`) does not by itself change the protocol status. The analyst still chooses to send the file back, hand it to the next sector, approve it, or reject it.

## Stack

- Next.js 16 (App Router) and React 19
- TypeScript in strict mode
- MongoDB with Mongoose
- Tailwind CSS
- Zod for the catalog form schemas
- Node's test runner for the status machine and the seed catalog

## Setup

Requires Node.js 22+ and a local MongoDB 6 or newer.

```bash
npm install
cp .env.example .env
```

`.env.example` holds a placeholder URI for a database on your own machine. Do not put real credentials in it.

Start MongoDB, then load the sample city:

```bash
# example if you use Docker
docker run --name protocolo-mongo -p 27017:27017 -d mongo:7

npm run seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm run seed` deletes and rewrites the `protocolo_digital` database. It refuses to load a catalog that breaks the status machine, the route, or a form schema.

Useful sample numbers:

| Number         | What it shows                                                                    |
| -------------- | -------------------------------------------------------------------------------- |
| `VC-2026-1077` | Occupancy certificate, in review at Obras after Meio Ambiente cleared its stage. |
| `VC-2026-1118` | Building file waiting to be claimed at Obras.                                    |
| `VC-2026-1014` | Tree-care file that went out for a correction and came back.                     |
| `VC-2026-1124` | Building file approved after all three sectors.                                  |
| `VC-2026-1088` | Draft. The public page says it is not filed yet and hides the answers.           |

## Scripts

```bash
npm run dev        # local app
npm run lint       # eslint
npm test           # status machine and catalog integrity
npm run typecheck  # tsc --noEmit
npm run build      # production build
npm run seed       # fictitious Vale Claro data
```

## Layout

```
app/            routes, including /sectors, /track, and /api/protocols/[code]
components/     header, lists, timeline, service cards
lib/            status machine, form schemas, database, queries
models/         Mongoose models
scripts/        seed catalog and loader
```

## Models

- **Sector** — a city desk. The sample desks are data.
- **User** — `applicant`, `analyst`, or `admin`. Analysts list the sector keys they cover. No passwords yet.
- **Workflow** — ordered stages. Each stage names the sector that owns it.
- **ProtocolType** — a service: summary, publishing sector, workflow, form schema, and document requirements.
- **Protocol** — one filed (or draft) case: status, current stage, answers, and attachment names. Bytes are not stored yet.
- **ReviewSection / ReviewNote** — a decision and zero or more notes for one form section at one stage. Notes are embedded on the section.
- **TimelineEvent** — a public or internal event. The tracking page shows public events only.

## Roadmap

These are later milestones. Together they are the bulk of the product, well beyond this foundation.

1. **Accounts and roles.** Sessions for applicants, analysts, and admins. Protect routes. Limit an analyst to the sectors on their user record. Replace the preview banner.
2. **Catalog administration.** Screens for an admin to add sectors, workflows, protocol types, form fields, and document requirements without a deploy.
3. **Schema-driven filing.** An applicant opens a draft, fills the sections defined by the chosen protocol type, saves progress, and submits. The step list comes from the schema.
4. **Analyst desk.** A queue of protocols waiting at the analyst's sector, claim, section-by-section review, notes, and the four outcomes: send back, hand off, approve, reject.
5. **Corrections loop.** The applicant sees which sections were sent back, edits those answers, resubmits, and the same sector claims the file again. The timeline records the loop.
6. **Document storage.** Upload the files a protocol type requires, keep them on the reviewing sector's screen, and keep them off the public timeline.
7. **AI analyst assistant.** A first-class helper on the review desk. It checks the submission against that protocol type's fields and required documents, writes a short summary of the request, and suggests notes the analyst can edit. It does not file a decision.
8. **Fees.** An optional fee on a protocol type and a payment step around submission.
9. **Notifications.** Email the applicant and the next sector when a protocol is filed, returned, advanced, approved, or rejected.
10. **Deadlines.** A due date per stage and a desk view of what is late.
11. **Audit log.** An internal history of claims, edits, and decisions, separate from the public timeline.
12. **Digital signature.** Sign the final decision record.
13. **Tests.** Cover filing, claim, handoff, corrections, and the public timeline at the route level, on top of the status-machine tests that already exist.
14. **CI.** Run lint, typecheck, test, and build on every pull request.

## License

MIT. See [LICENSE](LICENSE).
