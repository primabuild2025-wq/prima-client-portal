# Prima Build Project Portal

A starter bilingual role-based project management portal for Prima Build.

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` with:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

3. Run the Supabase schema:

Use `supabase-schema.sql` in your Supabase SQL editor to create all tables and relationships.

4. Run development server:

```bash
npm run dev
```

## API Routes

### Authentication
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/callback` - OAuth callback

### Users (Admin only)
- `POST /api/users` - Create user
- `GET /api/users` - List all users

### Projects
- `POST /api/projects` - Create project (Admin/Management)
- `GET /api/projects` - List projects (filtered by role)
- `PATCH /api/projects/[id]/activate` - Activate project

### Tasks
- `POST /api/tasks` - Create task
- `GET /api/tasks` - List tasks (filtered by role)
- `PATCH /api/tasks/[id]/status` - Update task status

### Dashboard
- `GET /api/dashboard` - Get dashboard data with stats

### Notifications
- `GET /api/notifications` - List user notifications
- `PATCH /api/notifications/[id]/read` - Mark notification as read

## Role-Based Access Control

### Roles
- **Admin**: Full access, user management
- **Management**: Project creation, task assignment
- **Staff**: Internal dashboard, assigned tasks
- **Client**: External dashboard, limited access
- **Designer**: File/photo upload access
- **Supervisor**: Review and audit access

### Permissions Matrix
See the detailed permissions in the main specification document.

## Database Schema

The `supabase-schema.sql` file contains:
- Users, roles, and user_roles tables
- Projects and project_assignments
- Tasks and task_assignments
- Files, photos, and media transcodes
- Notifications and audit logs
- Full-text search indexes

## Project structure

- `app/` - Next.js application routes and API
- `components/` - Shared UI components
- `lib/` - Supabase clients and utilities
- `public/` - Static assets including `prima-build-04.svg`
- `middleware.ts` - Authentication middleware

## Features

- Bilingual UI (EN/HE) with RTL support
- Role-based dashboards
- Project lifecycle management
- Task management with status tracking
- File upload with red-flag detection
- Real-time notifications
- Audit logging
- Presigned upload URLs
- GPU-accelerated media transcoding (planned)

## Development

The app uses:
- Next.js 14 with App Router
- TypeScript
- Tailwind CSS with custom brand colors
- Supabase for backend and database
- Server-side authentication with middleware