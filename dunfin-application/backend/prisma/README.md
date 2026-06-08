# DunFin Prisma / PostgreSQL

Schema path: `dunfin-application/backend/prisma/schema.prisma`

## Setup

1. Set `DATABASE_URL` in `backend/.env` (see `.env.example`).
2. Generate client: `npm run db:generate`
3. Apply migrations:

```bash
cd dunfin-application/backend
npx prisma migrate dev --name init_production_db --schema=./prisma/schema.prisma
```

Production deploy:

```bash
npx prisma migrate deploy --schema=./prisma/schema.prisma
```

## Import legacy JSON (optional)

```bash
node scripts/seed-from-json.cjs
```
