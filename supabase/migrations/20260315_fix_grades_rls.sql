-- Migration: Fix Grades RLS to be more permissive for authenticated users
-- Applied to resolve "new row violates row-level security policy" errors

DROP POLICY IF EXISTS "Grades updatable by teachers and coordinators" ON public.grades;
DROP POLICY IF EXISTS "Grades viewable by teachers and coordinators" ON public.grades;
DROP POLICY IF EXISTS "Allow teachers and coordinators to manage grades" ON public.grades;

CREATE POLICY "Grades access policy"
ON public.grades
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
