# Simple Blog System

A blog application built with the MERN stack (MongoDB, Express.js, React.js, Node.js).

## Installation

Requirements: Node.js 18+ and MongoDB.

```bash
git clone https://github.com/Souravkkt0404/Simple_Blog_System.git
cd Simple_Blog_System
npm run install:all
cp server/.env.example server/.env
npm run seed:demo
npm run dev
```

If MongoDB is not installed, run `npm run db` in a separate terminal before seeding.

- Frontend: http://localhost:5173
- Backend: http://localhost:5000/api/v1

Demo accounts:

- Admin: `admin@example.com` / `Admin@12345`
- User: `writer@example.com` / `Writer@12345`

Run tests:

```bash
npm test
```

## Environment Setup

Create `server/.env` from `server/.env.example` and set the values:

```
PORT=5000
CLIENT_URL=http://localhost:5173
SERVER_URL=http://localhost:5000
MONGODB_URI=mongodb://127.0.0.1:27017/simple_blog
JWT_ACCESS_SECRET=your_access_secret_min_32_characters
JWT_REFRESH_SECRET=your_refresh_secret_min_32_characters
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN_DAYS=7
BCRYPT_SALT_ROUNDS=12
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
FACEBOOK_APP_ID=
FACEBOOK_APP_SECRET=
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=Admin@12345
```

Google and Facebook login work only when their keys are set. Use these OAuth callback URLs:

- `http://localhost:5000/api/v1/auth/google/callback`
- `http://localhost:5000/api/v1/auth/facebook/callback`

## Features

- User registration, login and logout
- JWT access tokens and refresh tokens
- Password hashing with bcrypt
- Rate limiting on authentication endpoints
- Google and Facebook login (OAuth 2.0)
- Admin and User roles with role-based access control
- Users can manage only their own posts and comments
- Admins can manage all users, posts and comments
- Post CRUD with title, content, author and timestamps
- URL-friendly slugs for posts
- Soft delete for posts
- Request validation with Joi
- Comments on posts with CRUD operations
- Admin dashboard showing total users, posts and comments
- Activity logging (login, post creation, deletion, etc.)
- Centralized error handling
- Pagination and MongoDB indexes
- Real-time notifications with Socket.io
- Unit and integration tests with Jest

## API Overview

Base URL: `/api/v1`

Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/google`
- `GET /auth/facebook`

Users

- `GET /users/me`
- `PATCH /users/me`
- `PATCH /users/me/password`

Posts

- `GET /posts`
- `GET /posts/:idOrSlug`
- `POST /posts`
- `PATCH /posts/:id`
- `DELETE /posts/:id`

Comments

- `GET /posts/:postId/comments`
- `POST /posts/:postId/comments`
- `PATCH /comments/:id`
- `DELETE /comments/:id`

Admin

- `GET /admin/stats`
- `GET /admin/users`
- `PATCH /admin/users/:id`
- `DELETE /admin/users/:id`
- `GET /admin/posts`
- `PATCH /admin/posts/:id/restore`
- `GET /admin/comments`
- `GET /admin/activity`

Response format:

```json
{ "success": true, "data": {} }
{ "success": false, "error": { "code": "ERROR_CODE", "message": "Error message" } }
```
