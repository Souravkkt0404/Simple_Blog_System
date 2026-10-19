# Simple Blog System (MERN)

A blog web application built with MongoDB, Express.js, React.js and Node.js. It includes user authentication, post and comment management, and an admin panel.

---

## 1. Installation Instructions

### Prerequisites

- Node.js 18 or newer
- MongoDB: a local installation, a MongoDB Atlas cluster, or the bundled development database (`npm run db`)

### Steps

```bash
# Clone the repository
git clone https://github.com/Souravkkt0404/Simple_Blog_System.git
cd Simple_Blog_System

# Install dependencies for the root, server and client
npm run install:all

# Create the environment file (see section 2)
cp server/.env.example server/.env

# Start MongoDB in a separate terminal (skip this if you use your own MongoDB)
npm run db

# Create the admin account and demo content
npm run seed:demo

# Start the API and the React app
npm run dev
```

| Service    | URL                          |
| ---------- | ---------------------------- |
| React app  | http://localhost:5173        |
| REST API   | http://localhost:5000/api/v1 |

### Default accounts (created by `npm run seed:demo`)

| Role  | Email                | Password       |
| ----- | -------------------- | -------------- |
| Admin | `admin@example.com`  | `Admin@12345`  |
| User  | `writer@example.com` | `Writer@12345` |

### Available scripts

| Command             | Description                                    |
| ------------------- | ---------------------------------------------- |
| `npm run dev`       | Start the API and the React app                |
| `npm run dev:local` | Start the bundled MongoDB, the API and the app |
| `npm run db`        | Start the bundled development MongoDB          |
| `npm run seed`      | Create the admin account                       |
| `npm run seed:demo` | Create the admin, a demo user and sample posts |
| `npm test`          | Run the Jest unit and integration tests        |
| `npm run build`     | Build the React app for production             |

---

## 2. Environment Setup

Sensitive settings are stored in `server/.env`, which is excluded from git. Copy `server/.env.example` to create it. The server validates these values at startup and will not start if a required value is missing or invalid.

| Variable                      | Required | Description                                             |
| ----------------------------- | -------- | ------------------------------------------------------- |
| `NODE_ENV`                    |          | `development`, `production` or `test`                   |
| `PORT`                        |          | API port (default `5000`)                               |
| `SERVER_URL`                  |          | Public API URL, used for OAuth callback URLs            |
| `CLIENT_URL`                  |          | React app URL, used for CORS and OAuth redirects        |
| `MONGODB_URI`                 | Yes      | MongoDB connection string                               |
| `JWT_ACCESS_SECRET`           | Yes      | Access token secret (at least 32 characters)            |
| `JWT_REFRESH_SECRET`          | Yes      | Refresh token secret (at least 32 characters, must differ from the access secret) |
| `JWT_ACCESS_EXPIRES_IN`       |          | Access token lifetime (default `15m`)                   |
| `JWT_REFRESH_EXPIRES_IN_DAYS` |          | Refresh token lifetime in days (default `7`)            |
| `BCRYPT_SALT_ROUNDS`          |          | Password hashing cost (default `12`)                    |
| `AUTH_RATE_LIMIT_MAX`         |          | Maximum auth requests per window per IP (default `10`)  |
| `AUTH_RATE_LIMIT_WINDOW_MS`   |          | Auth rate limit window (default 15 minutes)             |
| `API_RATE_LIMIT_MAX`          |          | Maximum API requests per window per IP (default `500`)  |
| `API_RATE_LIMIT_WINDOW_MS`    |          | API rate limit window (default 15 minutes)              |
| `GOOGLE_CLIENT_ID`            |          | Google OAuth client ID                                  |
| `GOOGLE_CLIENT_SECRET`        |          | Google OAuth client secret                              |
| `FACEBOOK_APP_ID`             |          | Facebook OAuth app ID                                   |
| `FACEBOOK_APP_SECRET`         |          | Facebook OAuth app secret                               |
| `ADMIN_NAME`                  |          | Admin account name created by the seed script           |
| `ADMIN_EMAIL`                 |          | Admin account email created by the seed script          |
| `ADMIN_PASSWORD`              |          | Admin account password created by the seed script       |

Generate a strong secret with:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```

### OAuth setup (optional)

Google and Facebook login are enabled only when their credentials are set.

- **Google:** create an OAuth client ID in the [Google Cloud Console](https://console.cloud.google.com/apis/credentials) and add this redirect URI:
  `http://localhost:5000/api/v1/auth/google/callback`
- **Facebook:** create an app on [Meta for Developers](https://developers.facebook.com/apps), add Facebook Login and add this redirect URI:
  `http://localhost:5000/api/v1/auth/facebook/callback`

### Client environment (`client/.env`, optional)

| Variable            | Description                                                  |
| ------------------- | ------------------------------------------------------------ |
| `VITE_PROXY_TARGET` | API address used by the dev server (default `http://localhost:5000`) |
| `VITE_API_ORIGIN`   | API origin when the client is hosted separately from the API |

---

## 3. Feature Explanations

### User Authentication

- Registration, login and logout
- Passwords hashed with bcrypt
- Short-lived JWT access tokens (15 minutes) and JWT refresh tokens (7 days)
- The refresh token is stored in an httpOnly cookie. It is replaced on every use, and if an old token is reused, all of that user's sessions are revoked.
- The client silently gets a new access token when the current one expires
- Rate limiting on the login, register and refresh endpoints
- Google and Facebook login using OAuth 2.0 (Passport.js)

### User Roles and Permissions

- Two roles: **Admin** and **Regular User**
- Admins can manage all users, posts and comments
- Regular users can create, edit and delete only their own posts and comments
- Role-based access control is enforced on the server through middleware (`authorize`, `requirePermission`) and ownership checks in the service layer
- Role changes and deactivated accounts take effect immediately

### Post Management

- Create, read, update and delete blog posts
- Each post includes a title, content, author, tags and timestamps
- Request payloads are validated with Joi
- A unique URL-friendly slug is generated for each post (e.g. `hello-world`)
- Soft delete using the `isDeleted` and `deletedAt` fields; admins can restore deleted posts
- Search, filtering by author and tag, sorting and pagination

### Comments

- Logged-in users can comment on posts
- Create, read, update and delete comments
- Users can edit and delete only their own comments; admins can manage all comments
- Each comment references its post through a Mongoose ObjectId reference

### Admin Panel

A React-based admin area at `/admin`, restricted to admins:

- **Dashboard:** total users, posts and comments, plus recent activity
- **Users:** search, change role, activate or deactivate, delete
- **Posts:** view active and deleted posts, edit, delete, restore
- **Comments:** search and delete any comment
- **Activity log:** a history of user actions

### Routing and Middleware

- Express Router groups routes by resource under the versioned prefix `/api/v1`
- RESTful endpoints with a consistent response format
- Centralised error handling with consistent error responses
- Custom middleware for:
  - JWT validation (`authenticate`)
  - Role and permission checks (`authorize`, `requirePermission`)
  - Request validation (`validate`)
  - Activity logging (`logActivity`), which records actions such as login, post creation and deletion
  - Rate limiting (`authLimiter`, `apiLimiter`)

### Architecture

The code follows this layered structure:

```
server/src/
├── config/        # Environment, database, OAuth and role configuration
├── models/        # Mongoose models
├── routes/v1/     # Express routers
├── middleware/    # Authentication, authorization, validation, logging, errors
├── controllers/   # Request and response handling
├── services/      # Business logic
├── validators/    # Joi schemas
└── utils/         # Shared helpers

client/src/
├── api/           # Axios client and API calls
├── context/       # Global authentication and notification state
├── components/    # Reusable UI components and protected routes
└── pages/         # Application and admin pages
```

### Performance Optimization

- MongoDB indexes on frequently queried fields (email, slug, author, created date, post comments) and a text index for search
- Pagination on all list endpoints
- Lean queries, field projection and selective population to avoid unnecessary data loading
- The number of comments on each post is stored on the post, so post lists don't need an extra count query per post

### Testing

- Unit and integration tests using Jest and Supertest
- An in-memory MongoDB is used for the integration tests
- 107 tests with about 94% line coverage

```bash
npm test
npm run test:coverage
```

### Real-Time Notifications (Bonus)

Socket.io notifies users when:

- someone comments on their post
- an admin edits or removes their post
- a new user registers (admins only)
- a new post is published (shown to everyone)

### Frontend

- Functional components and React Hooks
- Global authentication state with the Context API
- Protected routes for logged-in users and for admins

---

## 4. API Documentation Overview

**Base URL:** `http://localhost:5000/api/v1`

🔒 = requires `Authorization: Bearer <accessToken>`  ·  👑 = admin only

### Response Format

```json
{ "success": true, "message": "Post created", "data": {}, "meta": { "page": 1, "limit": 10, "total": 42, "totalPages": 5 } }
```

```json
{ "success": false, "error": { "code": "VALIDATION_ERROR", "message": "Validation failed", "details": [] } }
```

### Authentication

| Method | Endpoint                 | Description                                      |
| ------ | ------------------------ | ------------------------------------------------ |
| POST   | `/auth/register`         | Register a new user                              |
| POST   | `/auth/login`            | Log in and receive an access token               |
| POST   | `/auth/refresh`          | Get a new access token using the refresh cookie  |
| POST   | `/auth/logout`           | Log out and revoke the refresh token             |
| GET    | `/auth/providers`        | List the enabled OAuth providers                 |
| GET    | `/auth/google`           | Log in with Google                               |
| GET    | `/auth/facebook`         | Log in with Facebook                             |

### Users

| Method | Endpoint             | Description                |
| ------ | -------------------- | -------------------------- |
| GET    | `/users/me` 🔒          | Get the current user's profile |
| PATCH  | `/users/me` 🔒          | Update name or avatar          |
| PATCH  | `/users/me/password` 🔒 | Change the password            |

### Posts

| Method | Endpoint             | Description                                                   |
| ------ | -------------------- | ------------------------------------------------------------- |
| GET    | `/posts`             | List posts (`page`, `limit`, `search`, `author`, `tag`, `sort`) |
| GET    | `/posts/:idOrSlug`   | Get a single post by id or slug                                |
| POST   | `/posts` 🔒          | Create a post                                                  |
| PATCH  | `/posts/:id` 🔒      | Update a post (owner or admin)                                 |
| DELETE | `/posts/:id` 🔒      | Soft-delete a post (owner or admin)                            |

### Comments

| Method | Endpoint                    | Description                          |
| ------ | --------------------------- | ------------------------------------ |
| GET    | `/posts/:postId/comments`   | List a post's comments               |
| POST   | `/posts/:postId/comments` 🔒 | Add a comment                        |
| PATCH  | `/comments/:id` 🔒          | Update a comment (owner or admin)    |
| DELETE | `/comments/:id` 🔒          | Delete a comment (owner or admin)    |

### Admin 🔒👑

| Method | Endpoint                     | Description                         |
| ------ | ---------------------------- | ----------------------------------- |
| GET    | `/admin/stats`               | Dashboard totals                    |
| GET    | `/admin/users`               | List users                          |
| PATCH  | `/admin/users/:id`           | Update a user's role or status      |
| DELETE | `/admin/users/:id`           | Delete a user                       |
| GET    | `/admin/posts`               | List posts, including deleted ones  |
| PATCH  | `/admin/posts/:id/restore`   | Restore a deleted post              |
| GET    | `/admin/comments`            | List all comments                   |
| GET    | `/admin/activity`            | View the activity log               |

### Other

| Method | Endpoint   | Description  |
| ------ | ---------- | ------------ |
| GET    | `/health`  | Health check |

### Common Status Codes

| Code | Meaning                                  |
| ---- | ---------------------------------------- |
| 200  | Success                                  |
| 201  | Resource created                         |
| 204  | Success with no content                  |
| 400  | Bad request                              |
| 401  | Not authenticated or token expired       |
| 403  | Not allowed                              |
| 404  | Resource not found                       |
| 409  | Duplicate resource                       |
| 422  | Validation failed                        |
| 429  | Too many requests                        |
| 500  | Server error                             |
