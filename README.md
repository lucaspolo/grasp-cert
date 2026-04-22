# GRASP Cert

Certificate generation and management system for amateur radio contests. Admins create events, log radio contacts (QSOs), and the system generates personalized PNG participation certificates for radio operators.

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | [Next.js](https://nextjs.org) 16.2.4 (App Router) |
| Language | TypeScript 5, React 19.2.4 |
| Auth | [NextAuth](https://authjs.dev) 5 — credentials provider, JWT sessions, role-based (USER / ADMIN) |
| Database | PostgreSQL 16, [Prisma](https://www.prisma.io) 7.7.0 ORM |
| UI | Tailwind CSS 4, [shadcn/ui](https://ui.shadcn.com), Lucide icons, Sonner toasts |
| Validation | Zod 4 |
| Infrastructure | Docker Compose (PostgreSQL) |

## Prerequisites

- **Node.js** ≥ 20
- **pnpm** (package manager)
- **Docker** & Docker Compose

## Getting Started

```bash
# 1. Install dependencies
pnpm install

# 2. Start PostgreSQL, push the schema, and run the dev server
make start

# 3. (Optional) Seed the database with an admin user
make db-seed
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Seeded Admin Account (local dev only)

| Callsign | Password |
|----------|----------|
| `PY2ADM` | `admin123` |

## Available Commands

| Command | Description |
|---------|-------------|
| `make start` | Docker up + DB push + dev server (full startup) |
| `make dev` | Dev server only |
| `make build` | Production build |
| `make install` | Install dependencies (`pnpm install`) |
| `make up` / `make down` | Docker Compose control |
| `make db-push` | Sync Prisma schema to DB |
| `make db-migrate` | Run Prisma migrations |
| `make db-seed` | Seed admin user |
| `make db-studio` | Open Prisma Studio |

## Project Structure

```
src/
├── auth.ts, auth.config.ts     # NextAuth config & callbacks
├── middleware.ts                # Route protection
├── lib/
│   ├── prisma.ts               # Prisma client singleton
│   ├── template-config.ts      # Certificate template types & defaults
│   └── utils.ts                # cn() utility
├── app/
│   ├── page.tsx                # User dashboard — QSOs grouped by event
│   ├── layout.tsx              # Root layout with navbar
│   ├── login/, register/       # Auth pages
│   ├── actions/                # Server Actions (mutations)
│   │   ├── auth.ts             # User registration
│   │   ├── event.ts            # CRUD events (admin)
│   │   ├── qso.ts              # CRUD QSOs (admin)
│   │   └── template.ts         # Upload background image, save config (admin)
│   ├── api/
│   │   ├── auth/[...nextauth]/ # NextAuth route handler
│   │   └── cert/[qsoId]/       # Certificate PNG generation (ImageResponse)
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
└── seed.ts                     # Seeds admin user
```

## Data Model

**User** — registered radio amateur (callsign, email, name, city, state, role).

**Event** — radio contest (name, date range, allowed modes/bands, template config).

**QSO** — a radio contact log entry linked to an event by `eventId`. References the participant by `participantCallsign` (string, not a FK to User).

Events cascade-delete their QSOs.

## Key User Flows

### Radio Amateur (USER role)

1. Register with callsign, name, email, city, state, and password.
2. Log in with callsign + password.
3. View dashboard showing all QSOs grouped by event.
4. Download a personalized PNG certificate for each QSO.

### Admin (ADMIN role)

1. Log in with admin credentials.
2. Create and manage contest events (name, dates, modes, bands).
3. Log QSOs for each event (participant callsign, frequency, mode, RST sent/received).
4. Customize certificate templates — upload a background image and position text fields (event name, callsign, participant name, dates, QSO info) via a visual editor.

## Certificate Generation

Certificates are generated on-the-fly at `GET /api/cert/[qsoId]` using Next.js `ImageResponse`. Each certificate renders:

- Event name and date range
- Participant callsign and name
- QSO details (frequency, mode, RST, date/time)
- Configurable background (uploaded image or default blue gradient)
- Text fields positioned via a JSON `TemplateConfig` stored on the event
