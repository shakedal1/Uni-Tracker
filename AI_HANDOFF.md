# AI Handoff & Progress Log

> **Note to other AI Agents (e.g., Claude, Windsurf, Cursor):** 
> This document maintains the current state, context, and forward plan for the `Uni Tracker` project. Read this file carefully before taking actions to understand what has been implemented and what remains.

## Project Overview
**Uni Tracker** is a web application for tracking academic studies week-by-week (lectures, tutorials, assignments). 
- **Stack:** React 19, Vite, TypeScript, Tailwind CSS v4, React Router v7, Supabase (PostgreSQL + Auth + Realtime), PWA setup.
- **UI/UX Strategy:** RTL (Hebrew, `dir="rtl"`), customized coloring based heavily on variables, with UI/UX Pro Max skill integrated for enhanced designs.

## Implementation Phases

- **[Completed] Phase 1: Project Initialization & Authentication**
- **[Completed] Phase 2: Layout & Core Data Management (Semesters, Courses)**
- **[Completed] Phase 3: Task Management & Scheduling (Weeks, Tasks)**
- **[Completed] Phase 4: Dashboard Logic & State (Progress calculation, Prioritization)**
- **[Pending] Phase 5: Assignments & PWA Polish**
- **[Pending] Phase 6: Deployment & Verification (Vercel)**

## Current State / What's Been Done
1. **Scaffolded Application:** Initialized the Vite + React-TS app in the root directory.
2. **Library Installation:** Installed `react-router`, `@supabase/supabase-js`, `@tailwindcss/vite`, and `tailwindcss` (v4).
3. **Base Layout Implemented:** Ported the initial styling from `design-preview.html` into:
    - `vite.config.ts`: Tailwind v4 plugin configured.
    - `src/index.css`: Loaded CSS variables, themes, and base styling (RTL setup).
    - `index.html`: Loaded Google Fonts (`Heebo` and `Rubik`), forced `lang="he"` and `dir="rtl"`.
    - `src/components/layout/AppShell.tsx`: Created the core responsive layout (Desktop sidebar + Mobile bottom nav) with `react-router` links.
    - `src/App.tsx`: Established the router structure with placeholder routes and a mocked dashboard setup.
4. **Local Environment:** The development server is functioning (`http://localhost:5173`).
5. **Auth Subsystem:** Completed the implementation of:
    - `src/lib/supabase.ts` for database connection mapping to `.env` file variables.
    - `src/contexts/AuthContext.tsx` to handle user/session state and `onAuthStateChange`.
    - `src/components/auth/AuthGuard.tsx` to block unauthenticated access.
    - `src/pages/LoginPage.tsx` for signing in/up (using the project's styling).
6. **AI Skill Installed:** The `ui-ux-pro-max` skill was initialized using the `uipro-cli`. It is available in the `.agent/skills/` directory for design generation tasks.

7. **Layout & Core Data Management (Phase 2):** Completed the creation of:
    - Database typing in `src/lib/types.ts`
    - Hooks `src/hooks/useSemesters.ts` and `src/hooks/useCourses.ts`
    - Pages `src/pages/SemestersPage.tsx` and `src/pages/CoursesPage.tsx`
    - Modified routing in `src/App.tsx`

8. **Task Management & Scheduling (Phase 3):** Completed the creation of:
    - Re-configured `useTasks.ts` hook for week-based fetching and optimistic updates.
    - Created `CourseDetailsPage.tsx` which groups tasks visually by `week_number` allowing toggling completion state and deleting entries seamlessly.
    - Setup navigational linking from `CoursesPage.tsx` to `CourseDetailsPage.tsx`.

9. **Dashboard Logic & State (Phase 4):** Completed the creation of:
    - `DashboardPage.tsx` built to replace the static placeholder.
    - Advanced Supabase query fetching tasks securely with a foreign-key join (`course:courses!inner(id, name, color, semester_id)`) to neatly color-code tasks on the dashboard.
    - Dynamic progress calculation mapping active courses to "Overdue" or "Current Week" sections based on the `start_date` of the active semester.

## Immediate Next Steps (Action Required)
We have completed **Phase 1, Phase 2, Phase 3, and Phase 4**.
The application is ready for **Phase 5: Assignments & PWA Setup**. 
Next, someone should verify everything looks good, build out the standalone `/assignments` page route, and finally execute the `vite-plugin-pwa` installation logic so this acts as a native mobile app.

## Supabase Schema Specification (To be executed soon)
```sql
-- semesters
CREATE TABLE semesters (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id),
    name TEXT NOT NULL,
    start_date DATE NOT NULL,
    num_weeks INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT false
);

-- courses
CREATE TABLE courses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    semester_id UUID REFERENCES semesters(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    course_number TEXT,
    color TEXT
);

-- tasks
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    course_id UUID REFERENCES courses(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    week_number INTEGER NOT NULL,
    type TEXT NOT NULL, -- 'lecture', 'tutorial', 'workshop', 'assignment'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed'
    due_date TIMESTAMP WITH TIME ZONE,
    is_surprise BOOLEAN DEFAULT false
);

-- Note: RLS policies will be strictly enforced locking reading/writing to authenticated user_id.
```
