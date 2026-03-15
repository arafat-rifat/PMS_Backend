# Backend (Express + Supabase)

Production-ready modular backend for your project management system.

## Tech stack
- Express + TypeScript
- Supabase Postgres
- JWT auth (access + refresh token)
- Zod validation

## Folder structure
```text
backend/
  src/
    api/
      auth/
      users/
      projects/
      tasks/
      todos/
      dashboard/
      health/
    config/
    constants/
    db/
    middlewares/
    types/
    utils/
    app.ts
    routes.ts
    server.ts
  sql/schema.sql
```

## How to run
1. Copy `.env.example` to `.env`
2. Set Supabase values and JWT secrets
3. Run SQL in `sql/schema.sql` in Supabase SQL editor
4. Install dependencies and start

```bash
cd backend
npm install
npm run dev
```

## API summary
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/refresh`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/logout`
- `GET/POST/PATCH /api/v1/users` (admin)
- `GET/POST/PATCH/DELETE /api/v1/projects`
- `GET/POST/PATCH/DELETE /api/v1/tasks`
- `GET/POST/PATCH/DELETE /api/v1/todos`
- `GET /api/v1/dashboard/analytics`

## Extensibility guidelines
- Add each new domain as `api/<domain>/{dto,repository,service,controller,routes}.ts`
- Keep request validation in `dto.ts` using Zod
- Keep business logic in services, not controllers
- Keep DB queries in repository layer only
- Enforce auth and role checks at route level
- Use pagination and filtered queries for list endpoints
