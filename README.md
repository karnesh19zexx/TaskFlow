# TaskFlow

A real-time collaborative task manager for teams. Create projects, invite teammates, and track
tasks on a drag-and-drop Todo → In Progress → Done board that updates live for everyone.

## Features

- Sign up / sign in / sign out with [Clerk](https://clerk.com)
- Create, edit, and delete projects
- Create, edit, and delete tasks with title, description, status, priority, and due date
- Invite project members by email and assign tasks to them
- Dashboard with your projects, progress, task stats, and tasks assigned to you
- Board search and filters (priority, assignee), overdue highlighting, optimistic status updates
- **Real-time collaboration:** task changes from teammates appear instantly, with toasts, a live
  connection indicator, and presence avatars showing who else is viewing the board
- **Drag-and-drop Kanban** with mouse and touch; keyboard users can move tasks from the card menu
- **Dark mode** (light / dark / system), including Clerk's auth screens
- **Responsive:** swipeable board columns on mobile, three-column grid on desktop

## Tech stack

| Layer      | Technology                                         |
| ---------- | -------------------------------------------------- |
| Frontend   | Next.js 15 (App Router), React 19, TypeScript      |
| UI         | Tailwind CSS v4, shadcn/ui, Lucide icons, Sonner   |
| Backend    | Next.js Route Handlers (REST API)                  |
| Database   | MongoDB + Mongoose                                 |
| Auth       | Clerk                                              |
| Real-time  | Socket.io (standalone Node service), JWT tickets   |
| Drag & drop| dnd-kit                                            |
| Validation | Zod (shared by API and forms)                      |

## Architecture

```
src/
├── app/                      # Routes (App Router)
│   ├── (app)/                # Authenticated area: dashboard, projects/[projectId]
│   ├── api/                  # REST API (thin handlers)
│   └── sign-in, sign-up      # Clerk auth pages
├── components/               # UI: projects/, tasks/, ui/ (shadcn)
├── lib/                      # Shared, client-safe: constants, validation, formatting, API client
├── hooks/                    # use-project-realtime (Socket.io client)
├── models/                   # Mongoose schemas: User, Project, Task
├── server/                   # Server-only
│   ├── services/             # Business logic + authorization (projects, tasks)
│   ├── realtime.ts           # Publish events + issue realtime tickets
│   ├── current-user.ts       # Clerk user -> MongoDB user (lazy sync)
│   ├── serializers.ts        # Documents -> DTOs
│   └── api.ts                # Route handler error handling + body parsing
└── types/                    # DTOs shared by server and client
realtime/
└── server.ts                 # Standalone Socket.io service (deploys separately)
```

### Real-time design

```
 Browser A ──REST──▶ Next.js API (Vercel) ──writes──▶ MongoDB
                         │  after response: POST /publish (shared secret)
                         ▼
 Browser B ◀─ws── Socket.io service (Railway/Render) ── fan-out to room project:<id>
     │
     └── on (re)connect: POST /api/projects/:id/realtime-token ──▶ 2-min JWT ticket
```

- **Why a separate service:** Vercel functions can't hold WebSocket connections, so Socket.io runs
  as a small stateless Node service. The app stays deployable on Vercel.
- **The database is the source of truth.** Writes go through the REST API (validation and
  authorization in one place); the realtime service only fans out events after a successful write.
  It has no database access.
- **Membership-checked tickets.** The Next.js app checks project membership and signs a
  short-lived, project-scoped JWT. The socket server verifies it and joins only that project's
  room. A fresh ticket is fetched on every reconnect, so revoked access can't reconnect.
- **Revocation.** Deleting a project or removing a member evicts the affected sockets from the room
  immediately.
- **Never blocks requests.** Events are published with `after()` and a timeout; if the realtime
  service is down, writes still succeed and clients resync (refetch) when they reconnect.
- **Echo-safe.** The acting client's optimistic update is reconciled by comparing `updatedAt`, so
  late or duplicate events can't overwrite newer state.
- **Scaling out:** run multiple instances behind a load balancer with sticky sessions and the
  Socket.io Redis adapter; the publish endpoint and ticket model don't change.

Key decisions:

- **Service layer.** Route handlers and server components both call the same services, so
  business rules and authorization checks live in one place.
- **Authorization at the data layer.** Every service call checks project membership. Non-members
  get `404` (not `403`) so project ids don't leak. Only owners can edit or delete a project or
  manage its members. Only the task creator or the project owner can delete a task.
- **Lazy user sync.** The first authenticated request creates the MongoDB `User` from the Clerk
  profile, so no webhook is needed to get started.
- **Indexes match the queries:** `members` on projects ("my projects"), `{project, status}` and
  `{assignee, status}` on tasks (board and "assigned to me").
- **Server rendering + optimistic UI.** Pages are rendered on the server with data from the
  services. The board updates locally and rolls back if the API call fails.

## REST API

All endpoints require a signed-in user and return JSON. Errors look like `{ error, details? }`.

| Method   | Endpoint                                    | Description                      |
| -------- | ------------------------------------------- | -------------------------------- |
| `GET`    | `/api/projects`                             | List my projects (with counts)   |
| `POST`   | `/api/projects`                             | Create a project                 |
| `GET`    | `/api/projects/:projectId`                  | Get a project                    |
| `PATCH`  | `/api/projects/:projectId`                  | Update a project (owner)         |
| `DELETE` | `/api/projects/:projectId`                  | Delete a project + tasks (owner) |
| `POST`   | `/api/projects/:projectId/members`          | Add a member by email (owner)    |
| `DELETE` | `/api/projects/:projectId/members/:memberId`| Remove a member (owner)          |
| `GET`    | `/api/projects/:projectId/tasks`            | List tasks in a project          |
| `POST`   | `/api/projects/:projectId/tasks`            | Create a task                    |
| `PATCH`  | `/api/tasks/:taskId`                        | Update a task                    |
| `DELETE` | `/api/tasks/:taskId`                        | Delete a task (creator or owner) |
| `POST`   | `/api/projects/:projectId/realtime-token`   | Short-lived realtime ticket      |

## Getting started

Requirements: Node.js 20+, and either a MongoDB Atlas cluster or a local MongoDB.

```bash
npm install
cp .env.example .env.local   # then fill in values
npm run dev                  # http://localhost:3000
npm run realtime             # Socket.io service on http://localhost:4000 (optional)
```

Environment variables (see `.env.example`):

- `MONGODB_URI`: Atlas connection string, or `mongodb://localhost:27017/taskflow` locally
  (`docker run -d -p 27017:27017 mongo:7`)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`: from the Clerk dashboard. For local
  development without an account, run `npx clerk@latest init --accountless` to write temporary keys.
- `NEXT_PUBLIC_REALTIME_URL` and `REALTIME_SECRET`: URL of the realtime service and a shared secret
  (`openssl rand -hex 32`). Leave the URL empty to run without live updates.
- `REALTIME_CORS_ORIGIN` (realtime service only): comma-separated allowed app origins.

Scripts: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`, `npm run typecheck`,
`npm run realtime` (watch mode), `npm run realtime:start`.

## Deployment

- **App:** deploy to Vercel, set the environment variables above, and allow Vercel's IPs (or
  `0.0.0.0/0`) in Atlas Network Access.
- **Realtime service:** deploy this repo to Railway or Render as a Node service with start command
  `npm run realtime:start`. Set `REALTIME_SECRET` (same value as the app) and
  `REALTIME_CORS_ORIGIN` (your Vercel URL). The platform's `PORT` is used automatically. Health
  check: `GET /health`.

## Roadmap

- Comments and an activity log per task
- Notifications (assigned to you, due soon)
- Clerk webhooks for profile sync
- Redis adapter for horizontally scaled realtime
