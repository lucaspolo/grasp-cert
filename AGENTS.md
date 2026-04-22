<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# GRASP Cert — Agent Context

## Project Purpose

GRASP Cert is a certificate generation and management system for amateur radio contests. Admins create events, log radio contacts (QSOs), and the system generates personalized PNG participation certificates for radio operators. The UI is in **Portuguese (Brazil)**.

### Domain Glossary

| Term | Meaning |
|------|---------|
| **Callsign** | Unique identifier assigned to a licensed radio amateur (e.g. `PY2ABC`) |
| **QSO** | A completed two-way radio contact between stations |
| **RST** | Readability-Strength-Tone signal report (e.g. `59`, `599`) |
| **Mode** | Transmission mode — SSB, CW, FT8, FM, etc. |
| **Band** | Frequency band — 40m, 20m, 2m, 70cm, etc. |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.2.4 (App Router) |
| Language | TypeScript 5, React 19.2.4 |
| Auth | NextAuth 5 (beta) — credentials provider, JWT sessions, role-based (USER/ADMIN) |
| Database | PostgreSQL 16, Prisma 7.7.0 ORM |
| UI | Tailwind CSS 4, shadcn/ui, Lucide icons, Sonner toasts |
| Validation | Zod 4 |
| Infrastructure | Docker Compose (PostgreSQL only) |

## Data Model

```
User (users)         1─────────────────────────────────────
  id, callsign*, email*, name, city, state, role, passwordHash

Event (events)       1──────┐
  id, name, startDate, endDate, modes[], bands[]
  templateBgUrl?, templateConfig? (JSON), observations?
                            │
QSO (qsos)          ───────*┘  (cascade delete)
  id, eventId (FK), participantCallsign, dateTime
  frequency, mode, rstSent, rstReceived, observations?
```

- Users and QSOs are linked by `callsign` (not a FK — QSOs reference `participantCallsign` as a string).
- `templateConfig` is a JSON column storing field positions/styles for certificate rendering. See `src/lib/template-config.ts` for the `TemplateConfig` type.

## Architecture & Conventions

### Routing
- **App Router** with server components by default.
- Client components use `"use client"` directive.
- Admin pages under `src/app/admin/` — protected by role check in layout.

### Data Mutations
- All mutations use **Server Actions** in `src/app/actions/`.
- Actions validate input with **Zod schemas** before database operations.
- Admin actions check `session.user.role === "ADMIN"`.

### Authentication
- NextAuth credentials provider: login with callsign + password.
- JWT session strategy with `id`, `role`, `callsign` in the token.
- Middleware (`src/middleware.ts`) redirects unauthenticated users to `/login`.

### Certificate Generation
- Route: `GET /api/cert/[qsoId]` → returns a PNG via Next.js `ImageResponse`.
- Renders event name, participant info, QSO details on a configurable template.
- Background: custom uploaded image or default blue gradient.
- Template fields are positioned via `TemplateConfig` JSON (x, y, fontSize, color per field).

### UI Components
- shadcn/ui components in `src/components/ui/`.
- App-level components in `src/components/` (forms, tables, navbar, template editor).

## Project Structure

```
src/
├── auth.ts, auth.config.ts     # NextAuth config & callbacks
├── middleware.ts                # Route protection
├── lib/
│   ├── prisma.ts               # Prisma client singleton
│   ├── template-config.ts      # TemplateConfig type & defaults
│   └── utils.ts                # cn() utility
├── app/
│   ├── page.tsx                # User dashboard — QSOs grouped by event
│   ├── layout.tsx              # Root layout with navbar
│   ├── login/, register/       # Auth pages
│   ├── actions/
│   │   ├── auth.ts             # registerUser()
│   │   ├── event.ts            # CRUD events (admin)
│   │   ├── qso.ts              # CRUD QSOs (admin)
│   │   └── template.ts         # Upload bg image, save config (admin)
│   ├── api/
│   │   ├── auth/[...nextauth]/ # NextAuth route handler
│   │   └── cert/[qsoId]/       # Certificate PNG generation
│   └── admin/
│       └── events/             # Event list, create, edit, QSO management, template editor
├── components/
│   ├── ui/                     # shadcn/ui primitives
│   ├── event-form.tsx          # Event create/edit form
│   ├── event-table.tsx         # Events list table
│   ├── qso-form.tsx            # QSO create form
│   ├── qso-table.tsx           # QSO list table
│   ├── template-editor.tsx     # Visual certificate template editor
│   └── navbar.tsx              # Top navigation bar
├── types/
│   └── next-auth.d.ts          # NextAuth type augmentation
prisma/
├── schema.prisma               # Database schema
└── seed.ts                     # Seeds admin user (PY2ADM / admin123)
```

## Key Files by Area

| Area | Read before changing |
|------|---------------------|
| Auth | `src/auth.ts`, `src/auth.config.ts`, `src/middleware.ts`, `src/types/next-auth.d.ts` |
| Events | `src/app/actions/event.ts`, `src/components/event-form.tsx`, `src/app/admin/events/` |
| QSOs | `src/app/actions/qso.ts`, `src/components/qso-form.tsx`, `src/app/admin/events/[id]/qsos/` |
| Certificates | `src/app/api/cert/[qsoId]/route.tsx`, `src/lib/template-config.ts` |
| Templates | `src/app/actions/template.ts`, `src/components/template-editor.tsx` |
| Database | `prisma/schema.prisma`, `src/lib/prisma.ts` |

## Development Commands

```bash
make start      # Docker up + db push + dev server (full startup)
make dev        # Dev server only
make build      # Production build
make up / down  # Docker Compose control
make db-push    # Sync Prisma schema to DB
make db-seed    # Seed admin user
make db-studio  # Open Prisma Studio
```
