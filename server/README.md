# Property Manager API

Node.js + Express + PostgreSQL + Prisma + JWT backend for the Property Manager mobile app.

## Setup

1. **Install dependencies**
   ```bash
   cd server && npm install
   ```

2. **Configure environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and set:
   - `DATABASE_URL` – Postgres connection string (**pooled/serverless URL is OK on Vercel/Neon**)
   - `DATABASE_URL_UNPOOLED` – Direct (non-pooled) Postgres URL for Prisma migrations / long transactions
   - `JWT_SECRET` – Secret key for JWT signing (use a strong random string in production)
   - `PORT` – API port (default: 3001)

   If you use **Neon + Vercel**, prefer:
   - `DATABASE_URL`: Neon **pooled** connection string (PgBouncer/pooler host)
   - `DATABASE_URL_UNPOOLED`: Neon **direct** connection string (non-pooler host)

3. **Create database and run migrations**
   ```bash
   npx prisma db push
   npx prisma generate
   ```

4. **Seed (optional)**
   ```bash
   npm run db:seed
   ```
   Creates owner@example.com / password123

5. **Start the server**
   ```bash
   npm run dev
   ```

## Mobile app configuration

In the project root `.env`:
```
EXPO_PUBLIC_API_URL=http://localhost:3001
```

For physical devices, use your machine's LAN IP instead of `localhost` (e.g. `http://192.168.1.100:3001`).

## API overview

- `POST /api/auth/register` – Register (creates OWNER)
- `POST /api/auth/login` – Login (returns user + JWT)
- `GET /api/auth/me` – Current user (requires auth)
- `PATCH /api/auth/profile` – Update profile (requires auth)

- `GET/POST /api/properties` – List / create properties
- `GET/PATCH/DELETE /api/properties/:id` – Property CRUD

- `GET/POST /api/units` – List / create units
- `GET /api/units/by-property/:id` – Units by property
- `GET/PATCH/DELETE /api/units/:id` – Unit CRUD

- `GET/POST /api/tenants` – Tenants
- `GET /api/tenants/by-unit/:id` – Tenant by unit

- `GET/POST /api/payments` – Payments
- `GET /api/payments/by-unit/:id` – Payments by unit

- `GET/POST /api/expenses` – Expenses
- `GET /api/expenses/by-property/:id` – Expenses by property

- `GET/POST /api/maintenance` – Maintenance requests
- `GET /api/maintenance/by-unit/:id` – Maintenance by unit

- `GET /api/dashboard/stats` – Dashboard stats
- `GET /api/dashboard/chart/:year` – Monthly chart data
- `GET /api/dashboard/tax-report/:year` – Tax report

- `GET/POST /api/users` – List / create users (OWNER only)
