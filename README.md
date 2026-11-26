# Digital Protocol

Digital Protocol is an open-source hub where people file a request with a municipality and the file moves between city sectors. The sample city is **Vale Claro**, and every person, parcel, and street in the seed data is fictitious.

A sector publishes services. Each service is a protocol type with its own form and its own list of documents. A workflow says which sectors review the file, and in which order. One protocol number follows the file the whole way. Anyone who has the number can open a public timeline. Form answers, review notes, and files stay off that page.

The sample catalog includes Public Works, Environment, Taxes, Sanitary Inspection, and Street Use. A building file is one service in that catalog, not a separate product. Its form has a work-kind field (new construction, occupancy certificate, or demolition) and its route is Environment, then Public Works, then Taxes. Other services stop at a single desk, or at two. New sectors and new forms are data, not new wizards.

## Features in this version

- Sector, workflow, protocol type, protocol, review, timeline, and user models.
- Protocol types store a form schema (sections and fields) and the documents they require.
- A status machine for `draft`, `submitted`, `in_review`, `corrections_requested`, `approved`, and `rejected`, plus a handoff rule for multi-sector routes.
- Review sections and notes keyed by the form section and the workflow stage.
- A public timeline that can hide internal events later (the assistant and staff audit will use those).
- A seed script with fictitious Vale Claro data, checked against the status machine and the form schemas.
- A landing page, a sector directory, a per-sector protocol list, and a public tracking page.
- A read-only JSON view at `/api/protocols/[code]`.
- Sign-in for applicants, analysts, and admins. Analysts see only the sectors on their account. Admins edit protocol types.
- An admin catalog for protocol types: form sections, fields, and required documents, validated with Zod.
- An applicant form rendered from the chosen protocol type. Zod checks the answers in the browser and again on the server.
- Required-document uploads. The server checks the type and the size, then writes the bytes through a storage interface. The development driver keeps them on local disk.
- Filing assigns the next protocol number, sets the status to `submitted`, and records a public timeline event at the first sector on the route.
- An analyst inbox filtered by status, sector, and service. Claiming a protocol starts the review.
- Section and document review. An analyst can approve an item or request a correction with a comment, then send the file back, hand it to the next sector, issue the final approval, or reject it.
- A corrections loop. The applicant sees the requested changes on the public timeline and in their account, edits those parts, and resubmits. Earlier timeline events stay in place.
- A public tracking page with the status of each sector on the route, pending corrections, and the timeline.
- Admin screens for sectors and protocol types. Protocol types still carry the form schema and the required documents, checked with Zod.
- An optional analyst assistant. It stays off unless `ANALYST_ASSISTANT_URL` and `ANALYST_ASSISTANT_API_KEY` are set. It only writes a summary. It does not file a decision.

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
- Zod for the catalog form schemas and for the answers an applicant submits
- Node's test runner for the status machine, filing rules, upload checks, and the seed catalog

## Setup

Requires Node.js 22+ and a local MongoDB 6 or newer.

```bash
npm install
cp .env.example .env
```

`.env.example` holds a placeholder database URI and a placeholder `SESSION_SECRET`. Replace the secret before any shared deployment. Do not put real credentials in the example file.

Start MongoDB, then load the sample city:

```bash
# example if you use Docker
docker run --name digital-protocol-mongo -p 27017:27017 -d mongo:7

npm run seed
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

`npm run seed` deletes and rewrites the `digital_protocol` database. It refuses to load a catalog that breaks the status machine, the route, or a form schema. Every fictitious account uses the password `vale-claro-demo`.

Uploaded documents go to `data/uploads` unless `UPLOAD_DIR` points somewhere else. That folder is for this machine only. The public timeline never includes the files.

| Role                  | Email                           |
| --------------------- | ------------------------------- |
| Applicant             | `marina.costa@valeclaro.test`   |
| Analyst (Environment) | `helena.duarte@valeclaro.test`  |
| Admin                 | `nara.quinteiro@valeclaro.test` |

Sign in at `/sign-in`. Applicants open `/file` to submit a service. Analysts open `/desk` for the inbox. Admins open `/admin` to edit sectors and protocol types. Track a number at `/track`.

Useful sample numbers:

| Number         | What it shows                                                                         |
| -------------- | ------------------------------------------------------------------------------------- |
| `VC-2026-1077` | Occupancy certificate, in review at Public Works after Environment cleared its stage. |
| `VC-2026-1118` | Building file waiting to be claimed at Public Works.                                  |
| `VC-2026-1014` | Tree-care file that went out for a correction and came back.                          |
| `VC-2026-1124` | Building file approved after all three sectors.                                       |
| `VC-2026-1088` | Draft. The public page says it is not filed yet and hides the answers.                |

## Scripts

```bash
npm run dev        # local app
npm run lint       # eslint
npm test           # status machine, filing, uploads, passwords, and catalog validation
npm run typecheck  # tsc --noEmit
npm run build      # production build
npm run seed       # fictitious Vale Claro data
```

## Layout

```
app/            routes, including /file, /desk, /sectors, /track, and /api/protocols/[code]
components/     header, lists, timeline, review form, applicant form
lib/            status machine, review rules, form schemas, uploads, storage, database, queries
models/         Mongoose models
scripts/        seed catalog and loader
```

## Models

- **Sector** — a city desk. The sample desks are data.
- **User** — `applicant`, `analyst`, or `admin`. Passwords are hashed. Analysts list the sector keys they cover.
- **Session** — a hashed sign-in token. The raw token stays in an http-only cookie.
- **Workflow** — ordered stages. Each stage names the sector that owns it.
- **ProtocolType** — a service: summary, publishing sector, workflow, form schema, and document requirements.
- **Protocol** — one filed (or draft) case: status, current stage, answers, and attachments. A new filing stores a storage key, media type, and size. Seeded samples keep the file name only.
- **ReviewSection / ReviewNote** — a decision and zero or more notes for one form section at one stage. Notes are embedded on the section.
- **TimelineEvent** — a public or internal event. The tracking page shows public events only.

## Roadmap

These are later milestones. Together they are the bulk of the product, well beyond this foundation.

1. **Accounts and roles.** Sign-in for applicants, analysts, and admins is in place. The inbox only lists the sectors on an analyst's account. Still to do: password reset, inviting users, and self-service registration.
2. **Catalog administration.** Admins can create, edit, deactivate, and remove sectors and protocol types. Protocol types include the form schema and required documents. Still to do: editing workflows in the UI, and an audit entry for each catalog change.
3. **Schema-driven filing.** An applicant opens a service and submits the form defined by that protocol type. The section list comes from the schema. Still to do: saving a draft and finishing it later.
4. **Analyst desk.** The inbox, claim, section and document review, handoff, issuance, and rejection are in place for the sectors on the analyst's account. Still to do: reassignment, a shared unclaimed pool separate from "my claimed files", and bulk actions.
5. **Corrections loop.** The applicant can see the open requests, edit those parts, and resubmit. The timeline keeps the earlier events. Still to do: limiting edits to a diff view, and letting the applicant reply without replacing every flagged document.
6. **Document storage.** Uploads are checked for type and size and written through a storage interface. The included driver stores files on local disk for development, and the public timeline does not show them. Reviewers can download a stored file from the desk. Still to do: previews in the page, and a driver other than local disk.
7. **AI analyst assistant.** A provider-agnostic summary is available on the review screen when an assistant URL and API key are configured. It does not file a decision. Still to do: a checklist against the required documents, and suggested notes the analyst can edit before saving.
8. **Fees.** An optional fee on a protocol type and a payment step around submission.
9. **Notifications.** Email the applicant and the next sector when a protocol is filed, returned, advanced, approved, or rejected.
10. **Deadlines.** A due date per stage and a desk view of what is late.
11. **Audit log.** An internal history of claims, edits, and decisions, separate from the public timeline.
12. **Digital signature.** Sign the final decision record.
13. **Tests.** The status machine, claim, handoff, issuance, and correction rules have unit tests. Still to do: route-level tests for the inbox and the resubmit form.
14. **CI.** Run lint, typecheck, test, and build on every pull request.

## License

MIT. See [LICENSE](LICENSE).
