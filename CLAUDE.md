# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev      # Start development server (Vite)
npm run build    # TypeScript compile + Vite build
npm run lint     # ESLint
npm run preview  # Preview production build
```

## Architecture

This is XIM App, an exercise database application built with React 19, TypeScript, Vite, and Supabase.

### Tech Stack
- **Frontend**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS 4
- **Backend**: Supabase (PostgreSQL + Auth)
- **Routing**: React Router DOM 7

### Authentication & Authorization
- Two roles: `admin` (full CRUD) and `consulta` (read-only)
- Invitation-based registration with tokens (`invitations` table)
- Auth context in `src/context/AuthContext.tsx` provides `useAuth()` hook
- `ProtectedRoute` component handles route protection with `requireAdmin` prop

### Data Model
Main entities in Supabase:
- **exercises**: Core entity with name, movement pattern, direction, chain type (abierta/cerrada), execution tips
- **movement_patterns**: Exercise classification (Press, Tirón, Sentadilla, etc.)
- **muscles**: Muscle definitions
- **directions**: Movement directions (Empuje horizontal/vertical, Tirón horizontal/vertical)
- **exercise_primary_muscles** / **exercise_synergist_muscles**: Many-to-many relations
- **exercise_videos**: Video references per exercise

### Key Patterns
- Custom hooks in `src/hooks/` for data fetching (useExercises, useMuscles, useMovementPatterns, etc.)
- Hooks return `{ data, loading, error, refetch, create*, update*, delete* }` pattern
- UI components in `src/components/ui/` (Button, Input, Select, Modal, etc.)
- Spanish language UI

### Environment Variables
Required in `.env`:
```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database
- Schema in `supabase/migrations/001_initial_schema.sql`
- Row Level Security (RLS) enabled - admins can write, authenticated users can read
- Profile auto-created on user signup via database trigger
