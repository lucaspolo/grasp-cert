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
| **Grupo** | Clube ou entidade que organiza eventos. Dono dos seus eventos e templates, com admins próprios |

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 16.2.4 (App Router) |
| Language | TypeScript 5, React 19.2.4 |
| Auth | NextAuth 5 (beta) — credentials provider, JWT sessions, cargo global (OWNER/ADMIN/OPERATOR/USER) + cargo por grupo |
| Database | PostgreSQL 16, Prisma 7.7.0 ORM |
| UI | Tailwind CSS 4, shadcn/ui, Lucide icons, Sonner toasts |
| Validation | Zod 4 |
| Infrastructure | Docker Compose (PostgreSQL only) |

## Data Model

```
User (users)         1─────────────────────────────────────
  id, callsign*, email*, name, city, state, role, passwordHash
                            │
GroupMember (group_members) *  (cascade delete dos dois lados)
  id, groupId (FK), userId (FK), role (ADMIN | MEMBER)
                            │
Group (groups)       1──────┴──────┬──────┐
  id, name*, callsign?, description?      │
                            │     │       │
Template (templates) 1──────┤─────┼───────┘
  id, name, groupId? (FK → groups; NULL = global)
  bgImage? (Bytes), bgMimeType?, config? (JSON)
                            │     │
Event (events)       1──────┤─────┘
  id, name, groupId (FK → groups, OBRIGATÓRIO)
  startDate, endDate, modes[], bands[]
  templateId? (FK → templates), observations?
                            │
QSO (qsos)          ───────*┘  (cascade delete)
  id, eventId (FK), participantCallsign, dateTime
  frequency, mode, rstSent, rstReceived, observations?
```

- Users and QSOs are linked by `callsign` (not a FK — QSOs reference `participantCallsign` as a string).
- **Todo evento pertence a um grupo** (`Event.groupId` é NOT NULL). O grupo é o clube/entidade que organiza; é ele que define quem administra o evento e quais templates ele pode usar.
- **`Template.groupId` NULL significa template GLOBAL da plataforma**, disponível a todos os grupos e gerenciado só por OWNER/ADMIN globais. É o caso do "Padrão", usado como fallback por evento sem template — por isso a coluna é opcional. Migrar `Padrão` para um grupo derrubaria o certificado de todo evento sem template próprio.
- Templates carry a `name`, optional background image stored as a binary blob (`bgImage`/`bgMimeType`), and a JSON `config` column storing field positions/styles. See `src/lib/template-config.ts` for the `TemplateConfig` type.
- Events optionally reference a template via `templateId`. If null, the seeded "Padrão" default template is used.
- Background image uploads are validated for resolution (min 800×500, max 1920×1200) and file size (max 5MB) using `sharp`.
- A migração `20260817153000_add_groups` converte uma base pré-grupos: cria o grupo "GRASP" com id fixo, aponta todos os eventos e todos os templates (menos o "Padrão") para ele, e transforma os usuários OWNER/ADMIN em admins desse grupo. As três etapas do backfill de `events.group_id` (INSERT do grupo → UPDATE → SET NOT NULL) dependem da ordem.

## Architecture & Conventions

### Routing
- **App Router** with server components by default.
- Client components use `"use client"` directive.
- Admin pages under `src/app/admin/` — protected by role check in layout.

### Data Mutations
- All mutations use **Server Actions** in `src/app/actions/`.
- Actions validate input with **Zod schemas** before database operations.
- Admin actions check `session.user.role === "ADMIN"`.

### Autorização: dois cargos que convivem

Toda checagem de acesso a evento ou template passa por `src/lib/group-access.ts`. São **duas camadas independentes**, e confundi-las é o erro fácil aqui:

- **Cargo global** (`User.role`): OWNER e ADMIN administram a PLATAFORMA e, por consequência, qualquer grupo (`isPlatformAdmin`). É o comportamento anterior aos grupos e continua valendo.
- **Cargo por grupo** (`GroupMember.role`): um ADMIN de grupo administra só o próprio grupo, **independentemente do cargo global** — um USER global pode ser admin do clube dele.

Helpers, do mais específico ao mais amplo:

| Helper | Use quando |
|---|---|
| `assertGroupAdmin(session, groupId)` | Já tem a sessão e o dono do recurso. `groupId` null = recurso global → só admin da plataforma |
| `requireGroupAdmin(groupId)` | Ação sobre um grupo conhecido |
| `requireAnyGroupAdmin()` | Porteiro de tela administrativa. Devolve `groupIds` (`null` = todos) para escopar a consulta. **Vem antes da leitura da entidade** — quem não pode administrar nada não deve nem disparar a query |
| `requireEventAccess(eventId)` | Trabalho sobre um evento. Devolve `scope`: `platform` / `group` / `operator`. O operador tem poderes menores e quem chama precisa saber disso |
| `requireEventGroupAdmin(eventId)` | Igual, mas recusa o operador |
| `pageRead(() => ...)` | Envolve leitura de **página**: traduz `Forbidden` em 404. Numa action o `throw` é o contrato certo; numa página viraria 500 e ruído no Sentry |

`isPlatformAdmin` é sempre a primeira checagem: é o caminho comum e responde sem ir ao banco.

### Authentication
- NextAuth credentials provider: login with callsign + password.
- JWT session strategy with `id`, `role`, `callsign` e `groupAdmin` in the token.
- `groupAdmin` existe só para o proxy (Edge, sem Prisma) saber que um USER global pode abrir `/admin`. **Nunca é a fonte de verdade da permissão** — a checagem real, por grupo, é sempre refeita no servidor. Como todo claim, é revalidado a cada `JWT_REFRESH_INTERVAL_SECONDS` (10 min): uma promoção a admin de grupo leva até esse tempo para aparecer no menu, o mesmo atraso que já valia para mudança de cargo global.
- Middleware (`src/proxy.ts`) redirects unauthenticated users to `/login`. Regras com `allowGroupAdmin: true` liberam a rota para quem administra um grupo sem ter cargo global.

### Certificate Generation
- Toda a renderização vive em `src/lib/certificate.tsx` (`loadCertificateData` + `renderCertificate` + `renderCertificatePdf`). As quatro rotas — participante/operador × privada (`/api/cert/**`) / pública (`/api/verificar-certificado/**`) — só cuidam de autorização, rate limit e cache; **não duplicar o JSX ali**.
- PNG via `ImageResponse` (Satori); `?format=pdf` embute esse mesmo PNG numa página 800×500pt com `pdf-lib`, então os dois formatos são idênticos por construção.
- Número de série determinístico em `src/lib/certificate-serial.ts`: HMAC de tipo + evento + indicativo com salt fixo. Alterar o salt ou o algoritmo renumera certificados já emitidos — há teste travando o valor.
- Background: template's blob image converted to base64 data URI, or default blue gradient.
- Template fields are positioned via `TemplateConfig` JSON (x, y, fontSize, color per field). Config vinda do banco passa sempre por `mergeTemplateConfig()`, que completa campos ausentes com os defaults (templates salvos antes de um campo novo existir).
- Falls back to the seeded "Padrão" template if the event has no template assigned. Esse fallback é resolvido **por nome**, então `updateTemplateName` e `deleteTemplate` recusam mexer no "Padrão" — renomeá-lo ou excluí-lo derrubaria o certificado de todo evento sem template próprio. `Template.name` não é `@unique`, então a guarda é por código, não pelo banco.

### Template Management
- Templates have dedicated CRUD at `/admin/templates`, escopado por grupo.
- `listTemplates()` traz só o que a sessão pode EDITAR; `listSelectableTemplates()` traz o que os eventos dela podem USAR (grupos administrados + globais). São coisas diferentes de propósito: um grupo escolhe o "Padrão" sem poder mexer nele.
- Background images stored as binary blobs in PostgreSQL (no filesystem).
- Image uploads validated via `sharp`: min 800×500px, max 1920×1200px, max 5MB. A autorização (`loadTemplateForAdmin`) vem **antes** do trabalho com a imagem — decodificar 5MB para depois recusar a gravação seria trabalho à toa.
- Image serving: `GET /api/templates/[id]/image` serves the blob with proper Content-Type.

### Group Management
- CRUD em `/admin/groups` (`src/app/actions/group.ts`).
- **Criar grupo é ato da plataforma** (OWNER/ADMIN), não de um grupo: quem já administra um clube não ganha com isso o direito de abrir outros. O formulário aceita o indicativo do primeiro admin, para o grupo não nascer órfão.
- **Excluir é do OWNER e só para grupo vazio**: eventos e templates sustentam certificados já emitidos.
- **Um grupo nunca fica sem admin**: rebaixar ou remover o último ADMIN é recusado (`wouldLeaveGroupWithoutAdmin`). Sem essa guarda, ninguém de dentro conseguiria mais cadastrar template, criar evento ou chamar membro.

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
│   ├── group-access.ts         # Autorização por grupo (cargo global + cargo no grupo)
│   ├── template-config.ts      # TemplateConfig type & defaults
│   └── utils.ts                # cn() utility
├── app/
│   ├── page.tsx                # User dashboard — QSOs grouped by event
│   ├── layout.tsx              # Root layout with navbar
│   ├── login/, register/       # Auth pages
│   ├── actions/
│   │   ├── auth.ts             # registerUser()
│   │   ├── event.ts            # CRUD events (escopado por grupo)
│   │   ├── group.ts            # CRUD grupos + quadro de membros
│   │   ├── qso.ts              # CRUD QSOs (admin)
│   │   └── template.ts         # Template CRUD, blob upload with sharp validation, config save
│   ├── api/
│   │   ├── auth/[...nextauth]/ # NextAuth route handler
│   │   ├── cert/[qsoId]/       # Certificate PNG generation
│   │   └── templates/[id]/image/ # Serve template background image blob
│   └── admin/
│       ├── events/             # Event list, create, edit, QSO management
│       ├── groups/             # Group list, create, edit + members
│       └── templates/          # Template list, create, edit (bg + config)
├── components/
│   ├── ui/                     # shadcn/ui primitives
│   ├── event-form.tsx          # Event create/edit form (group + template selectors)
│   ├── event-table.tsx         # Events list table
│   ├── group-form.tsx          # Group create/edit form
│   ├── group-members.tsx       # Group member management
│   ├── group-table.tsx         # Groups list table
│   ├── qso-form.tsx            # QSO create form
│   ├── qso-table.tsx           # QSO list table
│   ├── template-editor.tsx     # Visual certificate template editor
│   ├── template-form.tsx       # Template create form (group selector)
│   ├── template-table.tsx      # Templates list table
│   └── navbar.tsx              # Top navigation bar (Eventos + Grupos + Templates)
├── types/
│   └── next-auth.d.ts          # NextAuth type augmentation
prisma/
├── schema.prisma               # Database schema
└── seed.ts                     # Seeds admin user + default "Padrão" template
```

## Key Files by Area

| Area | Read before changing |
|------|---------------------|
| Auth | `src/auth.ts`, `src/auth.config.ts`, `src/proxy.ts`, `src/types/next-auth.d.ts` |
| Autorização por grupo | `src/lib/group-access.ts` (**leia antes de mexer em qualquer action de evento ou template**), `src/lib/auth-utils.ts` |
| Grupos | `src/app/actions/group.ts`, `src/app/admin/groups/`, `src/components/group-{form,table,members}.tsx` |
| Events | `src/app/actions/event.ts`, `src/components/event-form.tsx`, `src/app/admin/events/` |
| QSOs | `src/app/actions/qso.ts`, `src/components/qso-form.tsx`, `src/app/admin/events/[id]/qsos/` |
| Certificates | `src/lib/certificate.tsx`, `src/lib/certificate-serial.ts`, `src/lib/template-config.ts`, `src/app/api/cert/**`, `src/app/api/verificar-certificado/**` |
| Templates | `src/app/actions/template.ts`, `src/components/template-editor.tsx`, `src/components/template-table.tsx`, `src/app/admin/templates/`, `src/app/api/templates/[id]/image/` |
| Auditoria | `src/lib/audit.ts` (helper `recordAudit`), `src/app/actions/audit.ts`, `src/app/admin/audit/`, `src/components/audit-table.tsx` |
| Segurança | `src/lib/rate-limit.ts` (janela fixa no Postgres), `src/lib/jwt-refresh.ts` (revalidação do JWT), `src/lib/second-factor.ts` (verificação 2FA com anti-replay), `src/lib/secret-crypto.ts` (secrets TOTP cifrados, env `TOTP_ENC_KEY`), `next.config.ts` (security headers) |
| Observabilidade | `src/instrumentation.ts` + `src/instrumentation-client.ts` + `sentry.*.config.ts` (Sentry, env `NEXT_PUBLIC_SENTRY_DSN`, só ativo em produção), `src/lib/sentry-scrub.ts` (beforeSend — nunca remover), `src/app/api/health/route.ts` (healthcheck público) |
| Database | `prisma/schema.prisma`, `src/lib/prisma.ts` |
| Tutorial (`/ajuda`) | `src/app/ajuda/content.ts` (conteúdo como dado), `src/app/ajuda/page.tsx`, `src/components/tutorial-section.tsx`, `src/components/role-badge.tsx`, `src/lib/role-labels.ts`, capturas em `public/ajuda/` |
| Testes | `vitest.config.mts`, `src/**/*.test.ts` (Vitest, ambiente node; `server-only` tem stub em `tests/stubs/`) |

## Development Commands

```bash
make start      # Docker up + db push + dev server (full startup)
make dev        # Dev server only
make build      # Production build
make up / down  # Docker Compose control
make db-push    # Sync Prisma schema to DB (dev only — prefer db-migrate for schema changes)
make db-migrate # Create/apply Prisma migrations (keeps history for migrate deploy)
make db-seed    # Seed admin user + default template
make db-seed-demo # Dados fictícios de desenvolvimento (um usuário por papel, evento e QSOs)
make db-studio  # Open Prisma Studio
make test       # Run Vitest suite
```

- `prisma/seed-demo.ts` é **só para desenvolvimento**: cria contas com senha conhecida (`PY1DEM` Admin, `PY2DEM` Operador, `PY3DEM` Usuário, `PY4DEM` Usuário que é admin do grupo "Clube Demo" — senha `demo1234`) para exercitar cada papel, incluindo o admin de grupo sem cargo global. Cria também dois grupos, um evento em cada, para que as telas mostrem a separação. É aditivo e idempotente (upsert com IDs `demo-*`, nunca apaga nada) e aborta se `DATABASE_URL` não apontar para localhost.

- O tutorial em `/ajuda` é rota **pública** (listada em `src/proxy.ts`) e o conteúdo vive numa estrutura de dados tipada, não em JSX solto — `src/app/ajuda/content.test.ts` trava que toda captura referenciada existe em `public/ajuda/`. Ao mexer numa tela, conferir se a seção correspondente e a captura continuam válidas. **O processo de atualização está na skill `manual-ajuda`** (`.claude/skills/manual-ajuda/SKILL.md`): quando recapturar, como configurar o navegador, e as armadilhas de dados de demonstração.
- Rótulos de cargo saem de `src/lib/role-labels.ts` (fonte única compartilhada entre `user-table.tsx` e o tutorial) — não redeclarar em outro lugar. `TutorialAudience` acrescenta `"GROUP_ADMIN"` aos cargos globais: administrar um grupo é ortogonal ao cargo da conta, e o manual precisa poder dizer isso.
- Mutações administrativas devem registrar auditoria via `recordAudit()` de `src/lib/audit.ts` (exceção deliberada: criação de QSO, por volume).
- Toda função exportada em arquivo `"use server"` é um endpoint HTTP público — deve começar com `requireRole(...)`, `requireSession()` ou um dos porteiros de `src/lib/group-access.ts` (exceção deliberada e comentada: `listPublicEvents`). Em ação que toca evento ou template, cargo global sozinho **não basta**: escope por grupo.
- Rate limiting usa `consumeRateLimit()` de `src/lib/rate-limit.ts` (estado no Postgres — nunca em memória, o app roda em serverless). Verificação de OTP/código de recuperação passa sempre por `verifyUserSecondFactor()` de `src/lib/second-factor.ts`, que aplica rate limit, anti-replay e criptografia do secret.
- O build roda migrações via `scripts/migrate-deploy.sh`, que usa a conexão DIRETA (`DATABASE_URL_UNPOOLED`) quando existe: o advisory lock do `prisma migrate deploy` não funciona através do pooler do Neon (lock fica preso → P1002 nos deploys seguintes). Não trocar de volta para o pooler.
