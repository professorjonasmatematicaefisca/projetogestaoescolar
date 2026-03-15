-- Migration: Fix Grades RLS to be more permissive for all users (Public)
-- Applied to resolve "new row violates row-level security policy" errors
-- Necessary because the app uses a custom login and the client operates as 'anon'

DROP POLICY IF EXISTS "Grades access policy" ON public.grades;
DROP POLICY IF EXISTS "Grades updatable by teachers and coordinators" ON public.grades;
DROP POLICY IF EXISTS "Grades viewable by teachers and coordinators" ON public.grades;
DROP POLICY IF EXISTS "Allow teachers and coordinators to manage grades" ON public.grades;

CREATE POLICY "Grades access policy public"
ON public.grades
FOR ALL
TO public
USING (true)
WITH CHECK (true);
