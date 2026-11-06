# TaskFlow

A clean, modern task manager for teams. Create projects, invite teammates, and track tasks on a
Todo → In Progress → Done board.

## Features (Phase 1)

- Sign up / sign in / sign out with [Clerk](https://clerk.com)
- Create, edit, and delete projects
- Create, edit, and delete tasks with title, description, status, priority, and due date
- Invite project members by email and assign tasks to them
- Dashboard with your projects, progress, task stats, and tasks assigned to you
- Board search and filters (priority, assignee), overdue highlighting, optimistic status updates

## Tech stack

| Layer      | Technology                                         |
| ---------- | -------------------------------------------------- |
| Frontend   | Next.js 15 (App Router), React 19, TypeScript      |
| UI         | Tailwind CSS v4, shadcn/ui, Lucide icons, Sonner   |
| Backend    | Next.js Route Handlers (REST API)                  |
| Database   | MongoDB + Mongoose                                 |
| Auth       | Clerk                                              |
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
├── models/                   # Mongoose schemas: User, Project, Task
├── server/                   # Server-only
│   ├── services/             # Business logic + authorization (projects, tasks)
│   ├── current-user.ts       # Clerk user -> MongoDB user (lazy sync)
│   ├── serializers.ts        # Documents -> DTOs
│   └── api.ts                # Route handler error handling + body parsing
└── types/                    # DTOs shared by server and client
```

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

## Getting started

Requirements: Node.js 20+, and either a MongoDB Atlas cluster or a local MongoDB.

```bash
npm install
cp .env.example .env.local   # then fill in values
npm run dev                  # http://localhost:3000
```

Environment variables (see `.env.example`):

- `MONGODB_URI`: Atlas connection string, or `mongodb://localhost:27017/taskflow` locally
  (`docker run -d -p 27017:27017 mongo:7`)
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY`: from the Clerk dashboard. For local
  development without an account, run `npx clerk@latest init --accountless` to write temporary keys.

Scripts: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`, `npm run typecheck`.

## Deployment

Deploy to Vercel, set the environment variables above, and allow Vercel's IPs (or `0.0.0.0/0`)
in Atlas Network Access.

## Roadmap

- **Phase 2:** real-time updates. Socket.io needs a long-lived server, which Vercel's serverless
  functions don't provide. Options: host Socket.io on Railway or Render, or use a managed service
  like Pusher or Ably.
- Drag-and-drop board, comments, activity log, notifications, Clerk webhooks for profile sync.
