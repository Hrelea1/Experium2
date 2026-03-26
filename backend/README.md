# Experium Backend

Self-hosted REST API replacing Supabase. Built with **Node.js + Express + PostgreSQL**.

## Prerequisites

- Node.js 20+
- PostgreSQL 14+
- npm or bun

## Quick Start

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

```bash
copy .env.example .env
# Then edit .env with your database credentials, SMTP settings, etc.
```

### 3. Set up the database

First, create the database in PostgreSQL:

```sql
CREATE DATABASE experium;
```

Then run the schema:

```bash
psql -U postgres -d experium -f db/schema.sql
```

**Important:** After running the schema, update the admin password hash.
Generate a bcrypt hash of your password:

```bash
node -e "require('bcryptjs').hash('YourAdminPassword', 12).then(console.log)"
```

Then update it in the database:

```sql
UPDATE users
SET password_hash = '$2a$12$YOUR_GENERATED_HASH'
WHERE email = 'hrelea001@gmail.com';
```

### 4. Start the server

```bash
# Development (with hot reload)
npm run dev

# Production
npm run build
npm start
```

Server runs at `http://localhost:3001`.

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/auth/signup` | — | Register (sends OTP) |
| POST | `/auth/verify-otp` | — | Verify signup OTP |
| POST | `/auth/login` | — | Password login |
| POST | `/auth/otp/send` | — | Send login OTP |
| POST | `/auth/otp/login` | — | OTP login |
| POST | `/auth/logout` | ✅ | Logout |
| GET | `/auth/me` | ✅ | Current user |
| PUT | `/auth/me` | ✅ | Update profile |
| GET | `/experiences` | — | List (with filters) |
| GET | `/experiences/:id` | — | Detail |
| POST | `/experiences` | Admin | Create |
| PUT | `/experiences/:id` | Admin | Update |
| DELETE | `/experiences/:id` | Admin | Deactivate |
| GET | `/bookings` | ✅ | List bookings |
| POST | `/bookings` | ✅ | Create booking |
| POST | `/bookings/:id/cancel` | ✅ | Cancel |
| POST | `/bookings/:id/reschedule` | ✅ | Reschedule |
| GET | `/vouchers` | ✅ | List vouchers |
| POST | `/vouchers/validate` | ✅ | Validate code |
| POST | `/vouchers/:id/redeem` | ✅ | Redeem voucher |
| GET | `/cart` | ✅ | Get cart |
| POST | `/cart` | ✅ | Add to cart |
| DELETE | `/cart/:id` | ✅ | Remove item |
| GET | `/availability/:exp_id` | — | Available slots |
| POST | `/availability/check` | ✅ | Notify provider |
| POST | `/availability/respond` | — | Provider confirms/declines |
| GET | `/admin/stats` | Admin | Dashboard stats |
| GET | `/admin/users` | Admin | List users |
| DELETE | `/admin/users/:id` | Admin | Delete user |
| POST | `/uploads/experience-image` | Admin | Upload image |
| POST | `/uploads/avatar` | ✅ | Upload avatar |
| GET | `/config/mapbox-token` | — | Get Mapbox token |
| GET | `/health` | — | Health check |

---

## Frontend Integration

In the frontend, update `.env`:

```
VITE_API_URL=http://localhost:3001
```

Then replace Supabase imports:

```ts
// Before:
import { supabase } from '@/integrations/supabase/client';

// After:
import { api } from '@/lib/api';
import { auth, experiences, bookings } from '@/lib/api';
```

See `src/lib/api.ts` for the full typed client.

---

## Replacing Supabase Edge Functions

| Edge Function | Replaced By |
|---|---|
| `create-voucher` | `POST /vouchers` |
| `create-checkout` | `POST /bookings` |
| `delete-user` | `DELETE /admin/users/:id` |
| `initiate-availability-check` | `POST /availability/check` |
| `process-availability-response` | `POST /availability/respond` |
| `send-booking-confirmation` | Internal — called by `POST /bookings` |
| `send-cancellation-confirmation` | Internal — called by `POST /bookings/:id/cancel` |
| `get-mapbox-token` | `GET /config/mapbox-token` |
