# Brannbollsarkivet.se

Node.js/Next.js medlemsplattform for en brannbollsforening med:
- OTP-inloggning via e-postkod (Resend)
- strikt allowlist av tillatna e-postadresser
- skol-IP-saker rate limiting (mjuk IP-throttle, strikt e-postkontroll)
- roller: `member`, `referee`, `admin`
- interaktiv taktikvy, kalender, nyheter, arkiv och profilsidor
- adminpanel for innehall, allowlist, roller, kalender och en live spelplan

## Tech stack
- Next.js 16 (App Router, TypeScript)
- Prisma + PostgreSQL
- Upstash Redis (valfritt, fallback till in-memory limitering)
- Resend (valfritt i dev, krav i produktion for e-postutskick)

## 1. Installera
```bash
npm install
```

## 2. Konfigurera miljo
Kopiera `.env.example` till `.env` och fyll i:
```bash
DATABASE_URL=...
AUTH_SESSION_SECRET=...
OTP_HASH_SECRET=...
AUDIT_HASH_SALT=...
RESEND_API_KEY=...
RESEND_FROM_EMAIL=...
UPSTASH_REDIS_REST_URL=...
UPSTASH_REDIS_REST_TOKEN=...
APP_URL=http://localhost:3000
INITIAL_ADMIN_EMAIL=...
```

## 3. Prisma
```bash
npm run prisma:generate
npm run prisma:migrate
npm run archive:backfill-tabs
```

Viktigt: kor kommandona i exakt ordning ovan.

## 4. Bootstrapa forsta admin
```bash
npm run init:admin
```

Detta:
- lagger till `INITIAL_ADMIN_EMAIL` i allowlist
- skapar/uppdaterar anvandaren med rollen `admin`

## 5. Starta appen
```bash
npm run dev
```

Appen kor pa `http://localhost:3000`.

## Autentisering och skol-IP
- `POST /api/auth/request-code` returnerar alltid generiskt svar.
- Begransning:
  - strikt per e-post (15 min + dygn)
  - medel per e-post+IP
  - mjuk hog troskel per IP med progressiv fordrlojning
- Delad skol-IP ska inte orsaka hard block for legitima medlemmar.

## Viktiga routes
- Publikt: `/`, `/login`
- Medlem: `/dashboard`, `/arkivet`, `/kalender`, `/nyheter`, `/profil`
- Admin: `/admin` + undersidor for allowlist, users, news, archive, calendar, tactics

### Arkivet 2.0
- Arkivet ar nu flikbaserat och styrs via admin.
- Legacy-lankar `/arkivet/[slug]` redirectas permanent till flik + sektion.
- Om Prisma-runtime inte ar redo visas fallback i UI och API returnerar `ARCHIVE_RUNTIME_NOT_READY`.
- Nya API:er for arkivflikar och sektioner:
  - `GET/POST /api/archive-tabs`
  - `PATCH/DELETE /api/archive-tabs/[id]`
  - `POST /api/archive-tabs/[id]/sections`
  - `PATCH/DELETE /api/archive-sections/[id]`
  - `POST /api/archive-tabs/reorder`

## Kvalitetskontroller
```bash
npm run lint
npm run build
```
