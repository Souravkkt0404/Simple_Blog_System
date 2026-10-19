# Inkwell — Simple Blog System (MERN)

A full-stack blog platform built with **MongoDB, Express, React and Node.js**.
It has JWT authentication with rotating refresh tokens, Google and Facebook OAuth 2.0 login, role-based access control, soft-deletable posts, comments, an admin panel and real-time notifications over Socket.io.

---

## Table of contents

1. [Tech stack](#tech-stack)
2. [Quick start](#quick-start)
3. [Environment setup](#environment-setup)
4. [Project structure](#project-structure)
5. [Features](#features)
6. [API documentation](#api-documentation)
7. [Testing](#testing)
8. [Design decisions](#design-decisions)

---

## Tech stack

| Layer     | Tools                                                                                  |
| --------- | -------------------------------------------------------------------------------------- |
| Backend   | Node.js ≥ 18, Express 4, Mongoose 8, Joi, jsonwebtoken, bcryptjs, Passport, Socket.io  |
| Security  | helmet, express-rate-limit, httpOnly cookies, CORS allow-list                           |
| Frontend  | React 18 (function components + hooks), React Router 6, Context API, Axios, Vite        |
| Testing   | Jest, Supertest, mongodb-memory-server                                                 |

---

## Quick start

**Prerequisites:** Node.js 18 or newer. MongoDB is optional: you can use an installed `mongod`, a free MongoDB Atlas cluster, or the bundled development database described below.

```bash
# 1. Install dependencies for the root, server and client
npm run install:all

# 2. Configure environment variables
cp server/.env.example server/.env      # then edit the values (see below)
cp client/.env.example client/.env      # optional; the defaults work locally

# 3. No MongoDB installed? Start the bundled dev database in its own terminal and leave it running
npm run db            # real mongod on 127.0.0.1:27017, data kept in server/.mongo-data

# 4. Create the admin account (and optional demo content)
npm run seed          # admin only, using ADMIN_* from server/.env
npm run seed:demo     # admin + demo writer + sample posts and comments

# 5. Run the API (http://localhost:5000) and the React app (http://localhost:5173)
npm run dev
```

> **Without a MongoDB installation:** `npm run dev:local` starts the dev database, the API and the React app in one terminal. The first run downloads a MongoDB binary (about 600 MB). The data is saved in `server/.mongo-data`, which git ignores, so it survives restarts.
>
> **With your own MongoDB:** skip `npm run db` and set `MONGODB_URI` in `server/.env`, for example an Atlas `mongodb+srv://…` string.

Open **http://localhost:5173**. The default seeded accounts are:

| Role  | Email                | Password       |
| ----- | -------------------- | -------------- |
| Admin | `admin@example.com`  | `Admin@12345`  |
| User  | `writer@example.com` | `Writer@12345` (only created by `seed:demo`) |

Change these values before you deploy anywhere.

> You can also run each part on its own: `cd server && npm run dev`, then `cd client && npm run dev`.

---

## Environment setup

All secrets live in `server/.env`, which git ignores. The server validates its configuration at startup with Joi. It refuses to boot if a required variable is missing, if a JWT secret is shorter than 32 characters, or if the two JWT secrets are the same.

| Variable | Required | Description |
| --- | --- | --- |
| `NODE_ENV` | | `development` / `production` / `test` |
| `PORT` | | API port (default `5000`) |
| `SERVER_URL` | | Public URL of the API, used to build the OAuth callback URLs |
| `CLIENT_URL` | | URL of the React app, used as the CORS origin and the post-OAuth redirect |
| `MONGODB_URI` | ✅ | MongoDB connection string |
| `JWT_ACCESS_SECRET` | ✅ | Secret for access tokens (≥ 32 chars) |
| `JWT_REFRESH_SECRET` | ✅ | Secret for refresh tokens (≥ 32 chars, must differ from the access secret) |
| `JWT_ACCESS_EXPIRES_IN` | | Access token lifetime (default `15m`) |
| `JWT_REFRESH_EXPIRES_IN_DAYS` | | Refresh token lifetime in days (default `7`) |
| `BCRYPT_SALT_ROUNDS` | | bcrypt cost factor (default `12`) |
| `AUTH_RATE_LIMIT_WINDOW_MS` / `AUTH_RATE_LIMIT_MAX` | | Limit for login, register, refresh and OAuth start (default 10 requests per 15 min per IP) |
| `API_RATE_LIMIT_WINDOW_MS` / `API_RATE_LIMIT_MAX` | | Global API limit (default 500 requests per 15 min per IP) |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | | Turns on Google login when both are set |
| `FACEBOOK_APP_ID` / `FACEBOOK_APP_SECRET` | | Turns on Facebook login when both are set |
| `ADMIN_NAME` / `ADMIN_EMAIL` / `ADMIN_PASSWORD` | | Account created by `npm run seed` |

To generate a strong secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### Setting up OAuth (optional)

Each provider is only switched on when its credentials are present. Without them, the buttons on the login page appear disabled.

- **Google:** in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials), create an OAuth client ID of type *Web application*. Add the authorised redirect URI `http://localhost:5000/api/v1/auth/google/callback`.
- **Facebook:** on [Meta for Developers](https://developers.facebook.com/apps), create an app and add *Facebook Login*. Set the valid OAuth redirect URI to `http://localhost:5000/api/v1/auth/facebook/callback`, and request the `email` permission.

### Client variables (`client/.env`)

| Variable | Description |
| --- | --- |
| `VITE_PROXY_TARGET` | Where the Vite dev server proxies `/api` and `/socket.io` (default `http://localhost:5000`) |
| `VITE_API_ORIGIN` | Absolute API origin, needed only when the built client is hosted separately from the API |

---

## Project structure

```
Simple_Blog_System/
├── server/
│   ├── src/
│   │   ├── config/         # env validation, DB connection, Passport strategies, RBAC roles & permissions
│   │   ├── models/         # Mongoose schemas: User, Post, Comment, RefreshToken, ActivityLog
│   │   ├── services/       # Business logic (auth, token, post, comment, user, admin, activity, notification)
│   │   ├── controllers/    # Thin HTTP adapters: read the request, call a service, shape the response
│   │   ├── routes/v1/      # Express Routers grouped by resource, mounted under /api/v1
│   │   ├── middleware/     # authenticate, authorize/requirePermission, validate, rate limiters,
│   │   │                   # activity logger, central error handler, 404
│   │   ├── validators/     # Joi request schemas
│   │   ├── socket/         # Socket.io server (JWT handshake, user/admin rooms)
│   │   ├── utils/          # ApiError, response helpers, pagination, slug, policies, logger
│   │   ├── app.js          # Express app factory (used by the server and the tests)
│   │   └── server.js       # HTTP + Socket.io bootstrap and graceful shutdown
│   ├── scripts/seed.js
│   └── tests/{unit,integration,helpers}
└── client/
    └── src/
        ├── api/            # Axios instance (token handling, silent refresh) and endpoint modules
        ├── context/        # AuthContext (global auth state), NotificationContext (socket + toasts)
        ├── components/     # Navbar, ProtectedRoute/GuestRoute, PostCard, PostForm, CommentSection, …
        ├── hooks/          # useAsync data-loading hook
        └── pages/          # Home, PostDetail, PostEditor, MyPosts, Profile, Auth pages, admin/*
```

A request moves through the layers in one direction:
**route → middleware (rate limit → authenticate → authorize → validate → log) → controller → service → model**.
Controllers never touch Mongoose directly, and services never see `req` or `res`.

---

## Features

### 1. Authentication

- **Register, login and logout** with email and password. Passwords are hashed with **bcrypt** (configurable cost) in a Mongoose `pre('save')` hook and are never returned by the API (`select: false` plus a `toJSON` transform).
- **Short-lived JWT access token** (15 min by default). The client keeps it **in memory only** and sends it as `Authorization: Bearer …`.
- **JWT refresh token** (7 days by default) in an **httpOnly, SameSite=Strict cookie** scoped to `/api/v1/auth`, so JavaScript can never read it.
- **Refresh token rotation with reuse detection.** Each refresh token is stored server-side by its `jti` and works exactly once. Presenting a token that was already used is treated as theft: every session belonging to that user is revoked. The token is claimed with an atomic `findOneAndUpdate`, so two concurrent refreshes cannot both succeed.
- **Silent refresh on the client.** When an API call fails with `TOKEN_EXPIRED`, an Axios interceptor refreshes the session once (concurrent calls share the same refresh request) and then retries the original call. The session is also restored on page reload.
- **Rate limiting** on login, register, refresh and OAuth start (strict), plus a global API limit. Responses over the limit return `429` in the standard error format.
- **Google and Facebook OAuth 2.0** through Passport. The callback creates the session cookie and redirects to `/oauth/callback` without putting any token in the URL. The SPA then exchanges the cookie for an access token. If an OAuth email matches an existing account, the provider is linked to that account.
- The same error message is returned for "unknown email" and "wrong password", so the API does not reveal which accounts exist.

### 2. Roles and permissions (RBAC)

- There are two roles, `user` and `admin`, mapped to fine-grained permissions in `server/src/config/roles.js` (for example `post:manage:own` and `post:manage:any`).
- Access is checked in two places, both on the server:
  - **Route level:** `authorize('admin')` checks the role and `requirePermission(...)` checks capabilities.
  - **Resource level:** `assertCanManage(actor, ownerId, …)` in the services lets a user change only their own posts and comments, while admins can change any of them.
- `authenticate` reloads the user on every request. A demotion or deactivation therefore takes effect immediately, even if the user still holds an unexpired token.
- Admins cannot demote, deactivate or delete their own account.

### 3. Posts

- Full CRUD with **title, content, author, tags and timestamps**.
- **Joi validation** on every payload. Unknown fields are stripped, so a client cannot set `author`, `role`, `isDeleted` and similar fields.
- **URL-friendly unique slugs**, such as `hello-mern-world`, with a random suffix added only on a collision. The slug is regenerated when the title changes. Posts can be fetched by slug or by id.
- **Soft delete** using `isDeleted`, `deletedAt` and `deletedBy`. A query hook on the model hides deleted posts from every query unless the query names `isDeleted` explicitly. Admins can list deleted posts and restore them.
- Full-text search (MongoDB text index), filtering by author and tag, sorting by newest, oldest or most discussed, and pagination.

### 4. Comments

- `Comment.post` holds an ObjectId reference to `Post`, and `Post` has a virtual `comments` populate.
- Create and list comments under a post (`/posts/:postId/comments`). Edit and delete them as individual resources (`/comments/:id`).
- Users can edit or delete only their own comments. Admins can manage all comments.
- `Post.commentCount` is a denormalised counter kept up to date with `$inc`, so post lists never run a count query per post.

### 5. Admin panel (React)

Found under `/admin` and protected on the client by `<ProtectedRoute roles={['admin']}>`. The API enforces the same rules independently.

- **Dashboard:** total users, posts and comments, plus a breakdown (admins, inactive users, soft-deleted posts) and recent activity.
- **Users:** search and filter by role, promote or demote, activate or deactivate (which revokes the user's sessions), and delete. Deleting a user soft-deletes their posts, removes their comments and fixes the comment counters.
- **Posts:** filter by active or deleted, edit, soft-delete and restore.
- **Comments:** search and delete any comment.
- **Activity log:** a filterable audit trail of user actions.

### 6. Routing and API design

- Express Routers are grouped by resource and versioned under **`/api/v1`**.
- Routes use resource nouns and the matching HTTP verbs: `PATCH` for partial updates, and `204` for deletes and logout.
- Every successful response uses the same envelope, as does every error:

```jsonc
// success
{ "success": true, "message": "Post created", "data": { … }, "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5, "hasNextPage": true, "hasPrevPage": false } }
// error
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Validation failed", "details": [{ "location": "body", "field": "title", "message": "title is required" }] } }
```

- A **central error handler** converts Mongoose validation, cast and duplicate-key errors, JWT errors and malformed JSON into this format. Unexpected errors never expose internal details in production.

### 7. Middleware

| Middleware | Purpose |
| --- | --- |
| `authenticate` | Verifies the JWT access token and attaches `req.user` |
| `authorize(...roles)` / `requirePermission(...perms)` | Role and permission checks |
| `validate({ body, query, params })` | Joi validation and sanitisation |
| `logActivity(ACTION)` | Records `REGISTER`, `LOGIN`, `LOGIN_OAUTH`, `LOGOUT`, `POST_CREATE/UPDATE/DELETE/RESTORE`, `COMMENT_*`, `USER_UPDATE/DELETE` and `PASSWORD_CHANGE` after a successful response. Writing the log never blocks or breaks the request. Entries expire after 90 days (TTL index). |
| `authLimiter` / `apiLimiter` / `createRateLimiter()` | Configurable rate limiting |
| `errorHandler` / `notFound` | Consistent error responses |

### 8. Performance

- **Indexes:**
  - `User.email` (unique)
  - `Post.slug` (unique)
  - `Post {isDeleted, createdAt}` for the feed
  - `Post {author, isDeleted, createdAt}` for "my posts"
  - `Post.tags`
  - a weighted text index on `title` and `content`
  - `Comment {post, createdAt}`
  - TTL indexes for refresh tokens and activity logs
- **Pagination** on every list, with the page query and the count running in parallel (`Promise.all`). The page size is capped at 50.
- **Lean queries and projections:** list endpoints use `.lean()`, leave out the full `content` (lists use a stored `excerpt`) and populate only the author fields the page shows (`name avatar`).
- **Denormalised `commentCount`** avoids an N+1 count query on post lists.

### 9. Real-time notifications (bonus)

The Socket.io server checks the access token during the handshake. Each signed-in user joins a personal room, and admins also join an `admins` room.

- When someone comments on your post, you get a notification (toast plus a bell badge).
- When an admin edits or removes your post, you get a notification.
- When a new user registers, admins get a notification.
- When a new post is published, every visitor sees a "New posts published" banner.

---

## API documentation

The base URL is `http://localhost:5000/api/v1`. 🔒 means a Bearer access token is required, and 👑 means the admin role is required.

### Auth

| Method | Endpoint | Description |
| --- | --- | --- |
| POST | `/auth/register` | `{ name, email, password }` creates an account, returns `{ user, accessToken }` and sets the refresh cookie |
| POST | `/auth/login` | `{ email, password }` returns `{ user, accessToken }` and sets the refresh cookie |
| POST | `/auth/refresh` | Rotates the refresh cookie and returns a new `{ user, accessToken }` |
| POST | `/auth/logout` | Revokes the refresh token and clears the cookie (`204`) |
| GET | `/auth/providers` | Shows which OAuth providers are enabled, e.g. `{ google, facebook }` |
| GET | `/auth/google`, `/auth/facebook` | Starts the OAuth 2.0 flow (browser redirect) |
| GET | `/auth/{provider}/callback` | OAuth callback; redirects to `CLIENT_URL/oauth/callback` |

### Current user 🔒

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/users/me` | Returns your profile |
| PATCH | `/users/me` | `{ name?, avatar? }` |
| PATCH | `/users/me/password` | `{ currentPassword, newPassword }`; ends your other sessions |

### Posts

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/posts?page&limit&search&author&tag&sort` | Paginated public feed (`sort` is `newest`, `oldest` or `popular`) |
| GET | `/posts/:idOrSlug` | A single post with its full content |
| POST | `/posts` 🔒 | `{ title, content, tags? }` |
| PATCH | `/posts/:id` 🔒 | Owner or admin only. `{ title?, content?, tags? }` |
| DELETE | `/posts/:id` 🔒 | Owner or admin only. Soft delete (`204`) |

### Comments

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/posts/:postId/comments?page&limit` | Paginated, newest first |
| POST | `/posts/:postId/comments` 🔒 | `{ content }` |
| PATCH | `/comments/:id` 🔒 | Author or admin only. `{ content }` |
| DELETE | `/comments/:id` 🔒 | Author or admin only (`204`) |

### Admin 🔒👑

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/admin/stats` | Dashboard totals and recent activity |
| GET | `/admin/users?page&limit&search&role` | List users |
| PATCH | `/admin/users/:id` | `{ role?, isActive?, name? }` |
| DELETE | `/admin/users/:id` | Deletes a user and cleans up their content |
| GET | `/admin/posts?page&limit&search&status` | `status` is `all`, `active` or `deleted` |
| PATCH | `/admin/posts/:id/restore` | Restores a soft-deleted post |
| GET | `/admin/comments?page&limit&search` | All comments, with post and author |
| GET | `/admin/activity?page&limit&action&user` | Activity log |

### Misc

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/health` | Liveness check and DB status |

### Error codes

`VALIDATION_ERROR` (422), `UNAUTHORIZED`, `TOKEN_EXPIRED`, `INVALID_TOKEN`, `INVALID_CREDENTIALS`, `INVALID_REFRESH_TOKEN`, `REFRESH_TOKEN_REUSED` (401), `FORBIDDEN`, `ACCOUNT_DISABLED` (403), `NOT_FOUND` (404), `EMAIL_TAKEN`, `DUPLICATE_KEY` (409), `TOO_MANY_REQUESTS` (429), `INTERNAL_SERVER_ERROR` (500).

### Example

```bash
# Log in (saves the refresh cookie to cookies.txt)
curl -c cookies.txt -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"Admin@12345"}' \
     http://localhost:5000/api/v1/auth/login

# Create a post
curl -H "Authorization: Bearer <accessToken>" -H "Content-Type: application/json" \
     -d '{"title":"My first post","content":"Hello from the API!","tags":["intro"]}' \
     http://localhost:5000/api/v1/posts

# Get a fresh access token
curl -b cookies.txt -c cookies.txt -X POST http://localhost:5000/api/v1/auth/refresh
```

---

## Testing

The tests use Jest and Supertest. Integration tests run against a real MongoDB started by **mongodb-memory-server**, so no database setup is needed. The first run downloads a MongoDB binary.

```bash
npm test                 # all tests
npm run test:coverage    # with a coverage report (thresholds enforced in server/package.json)
cd server && npm run test:unit
cd server && npm run test:integration
```

| Suite | What it covers |
| --- | --- |
| `unit/utils.test.js` | pagination, slug generation, ApiError, regex escaping, RBAC permission map, ownership policies |
| `unit/middleware.test.js` | authorize and requirePermission, Joi validation, error normalisation, rate limiter (429), activity logger |
| `unit/services.test.js` | post service ownership and soft-delete rules (models mocked), JWT signing, notification service |
| `integration/auth.test.js` | register, login, bcrypt hashing, refresh rotation and reuse detection, logout, token validation, OAuth user linking |
| `integration/posts.test.js` | CRUD, slugs, validation, pagination and search, ownership 403s, admin override, soft delete |
| `integration/comments.test.js` | CRUD, ownership, counters, deleted-post handling |
| `integration/admin.test.js` | 401/403 on every admin route, stats, user management, restore, activity log |
| `integration/users.test.js` | profile, password change, health check, 404s, malformed JSON |

Current results: **107 tests passing, about 94% line coverage**.

---

## Design decisions

- **Why the refresh token is a cookie and the access token is in memory:** an XSS attack cannot steal the long-lived credential. CSRF cannot make use of the refresh endpoint either, because the cookie is `SameSite=Strict` and the endpoint only returns a token in its response body.
- **Why `authenticate` hits the database:** it costs one indexed `findById` on a lean, projected query. In return, bans and role changes take effect immediately instead of waiting up to 15 minutes for tokens to expire.
- **Why soft delete is enforced in the model:** a query hook means no service can accidentally forget the `isDeleted: false` filter.
- **Why there is an `app.js` factory:** tests build the Express app without opening a port, connecting to a database or starting Socket.io.
