# AI Meeting Assistant

A collaborative workspace for meeting recordings: upload audio or video into a
shared workspace, and track the transcript, summary and follow-up action items
that belong to each meeting.

> **Status — read this first.**
> The application skeleton is complete: authentication, workspaces with
> role-based membership, meeting upload and file storage, and a full web UI.
> **The AI itself is not implemented yet.** Requesting a transcript or a summary
> records a `PENDING` row and nothing consumes it, so it never completes.
> Full list: [docs/known-gaps.md](docs/known-gaps.md).

## Stack

| Layer | Choice |
| --- | --- |
| API | NestJS 11 · Prisma 7 · PostgreSQL 16 |
| Web | Next.js 16 (App Router) · React 19 · Tailwind 4 · TanStack Query |
| Auth | JWT access token + rotating refresh token in an httpOnly cookie |
| Storage | Local disk, behind a swappable `StorageService` |

## Structure

```
apps/
  api/          NestJS backend — controllers · services · repositories
  web/          Next.js frontend — one folder per feature
  worker/       Reserved for the AI worker (empty)
packages/
  shared-types/ Type-only contracts (not yet consumed)
docs/           Detailed documentation
docker-compose.yml   PostgreSQL 16
```

`apps/api/src/` in more detail:

```
app.routes.ts       Central route table — the whole URL hierarchy in one file
common/             Env validation · exception filter · response interceptor · storage
database/           PrismaModule / PrismaService
modules/
  auth/ users/ workspaces/ meetings/
  transcripts/ summaries/ action-items/
```

Each module follows the same three layers: **controller** (HTTP shape) →
**service** (rules and authorization) → **repository** (the only place that
touches Prisma).

## Quick start

**Prerequisites:** Node ≥ 20.19, pnpm, npm, Docker.

```bash
# 1. Database
docker compose up -d

# 2. API  →  http://localhost:4000
cd apps/api
cp .env.example .env          # set both JWT secrets
pnpm install
pnpm prisma migrate deploy
pnpm prisma generate
pnpm start:dev

# 3. Web  →  http://localhost:3000   (second terminal)
cd apps/web
cp .env.example .env.local
npm install
npm run dev
```

The API refuses to start if a required environment variable is missing or
malformed. See [docs/configuration.md](docs/configuration.md) for every variable,
and [docs/development.md](docs/development.md) for scripts, the Prisma workflow
and common pitfalls.

## Using the app

### Sign in

Register at `/register` (email + password, ≥ 6 characters) or sign in at
`/login`. The access token is held **in memory only** and the refresh token
lives in an httpOnly cookie, so a page reload restores your session without ever
exposing a token to JavaScript. Expired access tokens are refreshed silently and
the failed request is retried.

### Create a workspace

`/dashboard` lists every workspace you belong to. **New workspace** creates one
and makes you its `OWNER`.

Inside a workspace (`/workspaces/[id]`):

- **Members** — add someone by email (they must already have an account) as
  `ADMIN` or `MEMBER`. `OWNER` cannot be assigned, and the owner cannot be
  removed.
- **Settings** — rename or delete the workspace.
- **Upload meeting** — title, optional description, and one audio/video file.

Roles at a glance:

| | OWNER | ADMIN | MEMBER |
| --- | :---: | :---: | :---: |
| Read everything, upload, edit meetings, manage action items | ✅ | ✅ | ✅ |
| Delete a meeting they uploaded | ✅ | ✅ | ✅ |
| Delete anyone's meeting | ✅ | ✅ | — |
| Add / remove members, rename the workspace | ✅ | ✅ | — |
| Delete the workspace | ✅ | — | — |

Details: [docs/architecture/authorization.md](docs/architecture/authorization.md).

### Work with a meeting

A meeting page (`/meetings/[id]`) has three sections:

- **Transcript** — *Transcribe* / *Re-run*
- **Summary** — *Summarize* / *Re-run*
- **Action items** — create, edit and delete, with an optional assignee (must be
  a workspace member), a due date, and status `OPEN` → `IN_PROGRESS` → `DONE`

> ⚠️ **Transcribe** and **Summarize** currently only queue intent. The section
> will sit on "Processing…" forever, because no worker exists yet. Action items
> work fully.

Uploads are restricted to `audio/*` and `video/*` and to `MAX_UPLOAD_SIZE_MB`
(default 1024 MB). The original filename is kept for downloads; the stored file
itself gets an opaque uuid key.

### Talking to the API directly

Every route lives under `/api`. Successful responses are wrapped as
`{ "success": true, "data": … }`; errors carry `statusCode`, `message`, `error`,
`path` and `timestamp`.

```bash
BASE=http://localhost:4000/api

# Register — keeps the refresh cookie in cookies.txt
curl -s -c cookies.txt -X POST $BASE/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"me@example.com","password":"secret123"}'

TOKEN=<accessToken from the response>

# Create a workspace
curl -s -X POST $BASE/workspaces \
  -H "Authorization: Bearer $TOKEN" -H 'Content-Type: application/json' \
  -d '{"name":"Product team"}'

# Upload a meeting (multipart)
curl -s -X POST $BASE/workspaces/<workspaceId>/meetings \
  -H "Authorization: Bearer $TOKEN" \
  -F 'title=Weekly sync' -F 'file=@recording.m4a'

# Request a transcript — returns 202 and a PENDING row
curl -s -X POST $BASE/meetings/<meetingId>/transcript \
  -H "Authorization: Bearer $TOKEN"
```

Full endpoint reference: [docs/api/](docs/api/README.md).

## Documentation

| | |
| --- | --- |
| [Docs index](docs/README.md) | Everything below, in one place |
| [Architecture overview](docs/architecture/overview.md) | System shape, request pipeline, routing |
| [Data model](docs/architecture/data-model.md) | Schema, enums, relations, cascades |
| [Authentication](docs/architecture/authentication.md) | Token flow, rotation, reuse detection |
| [Authorization](docs/architecture/authorization.md) | Membership and the capability policy |
| [File storage](docs/architecture/storage.md) | Keys, validation, traversal guard |
| [Code conventions](docs/architecture/conventions.md) | Module layering and feature folders |
| [API reference](docs/api/README.md) | All endpoints, envelopes, status codes |
| [Configuration](docs/configuration.md) | Every environment variable |
| [Development](docs/development.md) | Setup, scripts, Prisma workflow |
| [Known gaps](docs/known-gaps.md) | Verified limitations |
| [Diagrams](docs/diagrams/system-architecture.md) | Architecture and ER diagrams |

## Caveats worth knowing up front

- **No AI yet** — transcripts and summaries never leave `PENDING`.
- **No tests, no CI** — the only test file is the stock NestJS scaffold, and it fails.
- **Turborepo is not wired up** — there is no root workspace config; run commands per app.
- **Mixed package managers** — `apps/api` uses pnpm, `apps/web` uses npm.
- **Uploads are buffered in memory** — a 1 GB upload costs 1 GB of heap.
- **CORS accepts any origin** — fine locally, needs an allowlist before production.

See [docs/known-gaps.md](docs/known-gaps.md) for the complete, verified list.
