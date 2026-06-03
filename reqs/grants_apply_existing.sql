-- Apply explicit table grants required by Supabase for existing projects.
-- Run once in the Supabase SQL Editor.

grant select, insert, update, delete
  on public.routines
  to authenticated;

grant select, insert, update, delete
  on public.routines
  to service_role;

grant select, insert, update, delete
  on public.routine_days
  to authenticated;

grant select, insert, update, delete
  on public.routine_days
  to service_role;

grant select, insert, update, delete
  on public.routine_blocks
  to authenticated;

grant select, insert, update, delete
  on public.routine_blocks
  to service_role;

grant select, insert, update, delete
  on public.block_exercises
  to authenticated;

grant select, insert, update, delete
  on public.block_exercises
  to service_role;

grant select, insert, update, delete
  on public.prescribed_sets
  to authenticated;

grant select, insert, update, delete
  on public.prescribed_sets
  to service_role;

grant select, insert, update, delete
  on public.workout_logs
  to authenticated;

grant select, insert, update, delete
  on public.workout_logs
  to service_role;

grant select, insert, update, delete
  on public.logged_sets
  to authenticated;

grant select, insert, update, delete
  on public.logged_sets
  to service_role;

grant select, insert, update, delete
  on public.workout_exercise_notes
  to authenticated;

grant select, insert, update, delete
  on public.workout_exercise_notes
  to service_role;
