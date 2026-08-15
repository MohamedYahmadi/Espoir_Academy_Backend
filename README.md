# Espoir Academy — Backend API

REST API + WebSocket (Socket.IO) backend for **Espoir Academy**, a youth sports academy platform in Tunisia. Built with Node.js, TypeScript, Express, and MongoDB.

## Features

- **Auth** — JWT-based register / login, profile management, password reset via email
- **Roles** — `admin` and `parent` (parents manage children + enrollments)
- **Children & enrollments** — register children, upload documents, enroll in sports, admin approval workflow
- **Sports & schedules** — admin CRUD for sports (with image upload) and training schedules
- **Notifications** — real-time in-app notifications via Socket.IO (schedule updates, new sports, contact replies) + unread counters
- **Contact messages** — parents send messages to the academy; admin replies from the backoffice (in-app notification + email to the user)
- **Payments** — offline payment tracking (records, no gateway integration)
- **File uploads** — local disk or S3 object storage
- **Hardening** — Helmet security headers, rate limiting, input sanitization, CORS allow-list, validation

## Tech stack

- Node.js ≥ 18
- TypeScript (ESM)
- Express 5
- MongoDB + Mongoose 9
- Socket.IO (real-time notifications)
- Nodemailer (SMTP email)
- AWS SDK v3 (S3 storage, optional)
- Multer (file uploads)

---

## Getting started

### 1. Prerequisites

- [Node.js](https://nodejs.org) ≥ 18
- MongoDB (local install, [MongoDB Atlas](https://www.mongodb.com/cloud/atlas), or Docker)

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

Copy the template and fill in your values:

```bash
cp .env.example .env
```

### 4. Run locally

```bash
# development (auto-reload)
npm run dev

# production build
npm run build
npm start
```

On first start the server connects to MongoDB and **seeds a default admin account** from `ADMIN_EMAIL` / `ADMIN_PASSWORD` (only if no admin exists with that email).

Health check: `GET http://localhost:5000/api/health`

---

## Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `PORT` | no | `5000` | Server port |
| `NODE_ENV` | yes | `development` | `development` or `production` |
| `MONGO_URI` | yes | — | MongoDB connection string |
| `JWT_SECRET` | yes | — | Secret used to sign JWTs. Use a long random string. |
| `JWT_EXPIRES_IN` | no | `30d` | Token lifetime |
| `ADMIN_EMAIL` | no | `admin@espoir.tn` | Seeded admin email |
| `ADMIN_PASSWORD` | no | `Admin@123` | Seeded admin password. **Change in production.** |
| `SMTP_HOST` | yes (emails) | `smtp.gmail.com` | SMTP server host |
| `SMTP_PORT` | no | `587` | SMTP port |
| `SMTP_USER` | yes (emails) | — | SMTP username |
| `SMTP_PASS` | yes (emails) | — | SMTP password (Gmail: use an app password) |
| `SMTP_FROM` | yes (emails) | — | "From" address. Contact messages are delivered here. |
| `CLIENT_URL` | yes | `http://localhost:3000` | Frontend URL used in email links |
| `CORS_ORIGINS` | **yes in prod** | `http://localhost:3000` | Comma-separated allow-list of frontend origins. Cross-origin requests are **blocked** if unset in production. |
| `RATE_LIMIT_WINDOW_MS` | no | `900000` (15 min) | Rate limit window |
| `RATE_LIMIT_MAX` | no | `300` | Global requests per window |
| `AUTH_RATE_LIMIT_MAX` | no | `15` | Auth endpoint requests per window |
| `STORAGE_DRIVER` | no | `local` | `local` (disk) or `s3` (object storage) |
| `S3_BUCKET` | if S3 | — | S3 bucket name |
| `S3_REGION` | if S3 | `us-east-1` | S3 region |
| `S3_ENDPOINT` | if S3 | — | Custom endpoint (e.g. Scaleway, MinIO) |
| `S3_ACCESS_KEY_ID` | if S3 | — | S3 access key |
| `S3_SECRET_ACCESS_KEY` | if S3 | — | S3 secret key |

> **Note on CORS:** In production the server fails closed — if `CORS_ORIGINS` is empty, all cross-origin requests are blocked.

---

## Scripts

| Script | Description |
| --- | --- |
| `npm run dev` | Run with `tsx watch` (hot reload) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run the compiled `dist/server.js` |
| `npm run seed` | Run the data seeder |

---

## API overview

All endpoints are prefixed with `/api`.

### Auth (`/api/auth`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/register` | public | Register a parent account (sends email verification link) |
| GET | `/verify-email/:token` | public | Verify an email address (valid 24h) |
| POST | `/resend-verification` | public | Resend the verification email |
| POST | `/login` | public | Login, returns JWT + user (unverified accounts are blocked) |
| GET | `/profile` | parent/admin | Get own profile |
| PUT | `/profile` | parent/admin | Update own profile |
| POST | `/profile-picture` | parent/admin | Upload profile picture |
| DELETE | `/profile-picture` | parent/admin | Remove profile picture |
| POST | `/forgot-password` | public | Send password reset email |
| POST | `/reset-password/:token` | public | Reset password with token |

### Sports (`/api/sports`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/` | public | List sports |
| POST | `/` | admin | Create sport (multipart, image optional) |
| PUT | `/:id` | admin | Update sport |
| DELETE | `/:id` | admin | Delete sport |

### Children (`/api/children`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/` | parent | Register a child |
| GET | `/` | parent | List own children |
| GET | `/:id` | parent | Get one child |
| PUT | `/:id` | parent | Update child |
| PATCH | `/:id` | parent | Update documents |
| DELETE | `/:id` | parent | Delete child |

### Enrollments (`/api/enrollments`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/` | parent | Enroll a child in a sport |
| GET | `/my` | parent | Own enrollments |
| GET | `/` | admin | All enrollments |
| GET | `/:id` | admin | One enrollment |
| PATCH | `/:id/status` | admin | Approve / reject / update status |

### Payments (`/api/payments`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/` | admin | All payments (optional `?status=`) |
| GET | `/my` | parent | Own payments |
| POST | `/` | admin | Record a payment |
| PATCH | `/:id` | admin | Update payment |

### Users (`/api/users`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/` | admin | List all users |
| GET | `/:id` | admin | One user |
| PUT | `/:id` | admin | Update user |
| PATCH | `/:id/status` | admin | Activate / deactivate user |
| PATCH | `/:id/password` | admin | Reset a user's password |
| DELETE | `/:id` | admin | Delete user |
| GET | `/stats` | admin | Dashboard stats |

### Schedules (`/api/schedules`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/` | public | List schedules |
| POST | `/` | admin | Create schedule |
| PUT | `/:id` | admin | Update schedule |
| DELETE | `/:id` | admin | Delete schedule |

### Notifications (`/api/notifications`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| GET | `/` | parent/admin | Own notifications (`?limit=`) |
| GET | `/unread-count` | parent/admin | Unread count |
| PATCH | `/read-all` | parent/admin | Mark all as read |
| PATCH | `/:id/read` | parent/admin | Mark one as read |

### Contact (`/api/contact`)

| Method | Endpoint | Access | Description |
| --- | --- | --- | --- |
| POST | `/` | parent | Send a message to the academy |
| GET | `/my` | parent | Own messages and replies |
| GET | `/messages` | admin | All contact messages |
| POST | `/:id/reply` | admin | Reply (in-app notification + email) |

---

## File storage

The API supports two storage backends selected with `STORAGE_DRIVER`:

- **`local` (default)** — files are written to `./uploads` and served from `/uploads`. Do **not** commit this folder (it's gitignored).
- **`s3`** — files are stored in an S3-compatible bucket and streamed through the `/uploads` endpoint. Set `S3_*` vars. Use this for production on multi-instance or ephemeral hosts.

The stored relative path (e.g. `uploads/sports/image-123.png`) is saved in the database and the `/uploads` endpoint serves it identically for both drivers.

---

## Deployment

### Option A — Single VPS (Nginx + Node + MongoDB)

1. **Server**: Deploy with a process manager like [PM2](https://pm2.keymetrics.io/):

   ```bash
   npm ci
   npm run build
   pm2 start dist/server.js --name espoir-api
   pm2 save && pm2 startup
   ```

2. **MongoDB**: install on the same server or use MongoDB Atlas.

3. **Nginx reverse proxy** (with WebSocket support):

   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;

       # larger bodies for file uploads (profile pictures, child documents, sport images)
       client_max_body_size 20m;

       location / {
           proxy_pass http://127.0.0.1:5000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection "upgrade";
           proxy_set_header Host $host;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
       }
   }
   ```

   The `Upgrade` / `Connection` headers are required for Socket.IO to work behind the proxy. `app.set('trust proxy', 1)` is already configured.

4. **TLS**: use [certbot](https://certbot.eff.org/) for HTTPS.

5. **Production env checklist**:
   - `NODE_ENV=production`
   - `CORS_ORIGINS=https://yourfrontend.com`
   - Strong `JWT_SECRET` and `ADMIN_PASSWORD`
   - `STORAGE_DRIVER=s3` if the server is ephemeral or you run multiple instances

### Option B — Containerized (Docker)

Recommended multi-stage setup:

- **Frontend**: build with `npm run build`, serve `dist/` via Nginx, proxy `/api` and Socket.IO to the backend service.
- **Backend**: `npm ci && npm run build && node dist/server.js`, with `mongo` as a sibling service.
- Set the same env vars as above; ensure Socket.IO is proxied with `Upgrade` headers.

### Environment note

- The **backend must be reachable over HTTPS** in production — browsers block mixed content when the frontend is HTTPS but the API is HTTP.
- Socket.IO needs **sticky sessions** when load-balancing across multiple backend instances (or use a single instance / a socket-aware LB).

---

## Project structure

```
src/
├── app.ts                 # Express app: middleware, CORS, routes, error handling
├── server.ts              # Entry point: DB connect, seed admin, Socket.IO, listen
├── config/db.ts           # Mongoose connection
├── controllers/           # Route handlers
├── middleware/            # auth (JWT), sanitize, errorHandler, upload
├── models/                # Mongoose schemas (User, Child, Sport, Enrollment, ...)
├── routes/                # Express routers
├── seeders/               # Admin account seeding
├── services/              # email, storage, notification, socket
└── validators/            # express-validator schemas
```

---

## Security notes

- Passwords are hashed with bcrypt.
- JWT is verified on every protected route; roles are enforced with `authorize(...)`.
- Global + per-endpoint rate limiting protects against abuse.
- NoSQL injection (`$`/`.`) is stripped from request bodies; HTTP parameter pollution is blocked.
- In production, CORS is allow-list only.

## License

MIT