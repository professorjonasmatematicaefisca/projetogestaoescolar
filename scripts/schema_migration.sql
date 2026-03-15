CREATE TABLE IF NOT EXISTS public.users (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" text NOT NULL,
  "email" text NOT NULL UNIQUE,
  "password" text NOT NULL,
  "role" text NOT NULL CHECK (role = ANY (ARRAY['COORDINATOR'::text, 'TEACHER'::text, 'MONITOR'::text, 'STUDENT'::text, 'PARENT'::text])),
  "subject" text,
  "photo_url" text,
  "assignments" jsonb,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY ("id")
);

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.classes (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" text NOT NULL UNIQUE,
  "period" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY ("id")
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.disciplines (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" text NOT NULL UNIQUE,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()),
  "display_name" text,
  PRIMARY KEY ("id")
);

ALTER TABLE public.disciplines ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.students (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "name" text NOT NULL,
  "photo_url" text,
  "parent_email" text,
  "class_name" text,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()),
  "status" text DEFAULT 'ACTIVE'::text,
  "inactive_reason" text,
  "inactive_date" timestamp with time zone,
  PRIMARY KEY ("id")
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.sessions (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "date" timestamp with time zone NOT NULL,
  "teacher_id" uuid,
  "subject" text NOT NULL,
  "class_name" text NOT NULL,
  "block" text NOT NULL,
  "blocks_count" integer DEFAULT 1,
  "general_notes" text,
  "homework" text,
  "photos" text[],
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()),
  "module_ids" uuid[] DEFAULT '{}'::uuid[],
  PRIMARY KEY ("id")
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.session_records (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "session_id" uuid,
  "student_id" uuid,
  "present" boolean DEFAULT true,
  "justified_absence" boolean DEFAULT false,
  "phone_confiscated" boolean DEFAULT false,
  "counters" jsonb NOT NULL DEFAULT '{}'::jsonb,
  "notes" text,
  "photos" text[],
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()),
  "present2" boolean DEFAULT true,
  PRIMARY KEY ("id")
);

ALTER TABLE public.session_records ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.occurrences (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "type" text NOT NULL,
  "description" text NOT NULL,
  "date" timestamp with time zone NOT NULL,
  "status" text NOT NULL,
  "photos" text[],
  "reported_by" text,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY ("id")
);

ALTER TABLE public.occurrences ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.occurrence_students (
  "occurrence_id" uuid NOT NULL,
  "student_id" uuid NOT NULL,
  PRIMARY KEY ("occurrence_id", "student_id")
);

ALTER TABLE public.occurrence_students ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.student_exits (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "student_id" uuid NOT NULL,
  "reasons" text[] NOT NULL,
  "exit_time" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "return_time" timestamp with time zone,
  "created_at" timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  "registered_by" text DEFAULT 'Sistema'::text,
  PRIMARY KEY ("id")
);

ALTER TABLE public.student_exits ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.planning_modules (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "discipline_id" uuid,
  "teacher_id" uuid,
  "class_id" uuid,
  "front" text NOT NULL,
  "chapter" text NOT NULL,
  "module" text NOT NULL,
  "title" text NOT NULL,
  "topic" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()),
  "bimestre" integer DEFAULT 1,
  PRIMARY KEY ("id")
);

ALTER TABLE public.planning_modules ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.planning_schedule (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "module_id" uuid,
  "planned_date" date NOT NULL,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()),
  "execution_status" text DEFAULT 'pending'::text,
  "justification" text,
  PRIMARY KEY ("id")
);

ALTER TABLE public.planning_schedule ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.planning_locks (
  "id" text NOT NULL,
  "locked" boolean NOT NULL DEFAULT false,
  "teacher_id" uuid,
  "locked_by" text,
  "updated_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

ALTER TABLE public.planning_locks ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.study_guide_items (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "teacher_id" text NOT NULL,
  "discipline_id" text NOT NULL,
  "class_id" text NOT NULL,
  "module_id" uuid,
  "bimestre" integer NOT NULL DEFAULT 1,
  "exam_type" text NOT NULL DEFAULT 'P1'::text,
  "orientation" text,
  "created_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

ALTER TABLE public.study_guide_items ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.requests (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "type" text NOT NULL DEFAULT 'delete_session'::text,
  "status" text NOT NULL DEFAULT 'pending'::text,
  "teacher_id" text,
  "teacher_name" text,
  "session_id" text,
  "session_info" jsonb,
  "reason" text,
  "resolved_by" text,
  "resolved_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("id")
);

ALTER TABLE public.requests ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.messages (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "sender_name" text NOT NULL,
  "sender_email" text,
  "sender_role" text NOT NULL DEFAULT 'teacher'::text,
  "subject" text NOT NULL,
  "body" text NOT NULL,
  "recipients" text NOT NULL DEFAULT 'students'::text,
  "target_class" text,
  "attachment_type" text,
  "attachment_data" jsonb,
  "is_read" boolean DEFAULT false,
  "created_at" timestamp with time zone DEFAULT now(),
  "target_student_id" uuid,
  "direct_images" text[] DEFAULT '{}'::text[],
  PRIMARY KEY ("id")
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.enrollments (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "student_id" uuid,
  "class_name" text NOT NULL,
  "academic_year" integer NOT NULL,
  "status" text DEFAULT 'ACTIVE'::text,
  "start_date" timestamp with time zone DEFAULT timezone('utc'::text, now()),
  "end_date" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public.class_disciplines (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "class_id" uuid,
  "discipline_id" uuid,
  "teacher_id" uuid,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public.planning_usage (
  "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
  "class_id" uuid,
  "module_id" uuid,
  "is_used" boolean DEFAULT true,
  "created_at" timestamp with time zone DEFAULT timezone('utc'::text, now()),
  PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS public.settings (
  "key" text NOT NULL,
  "value" text,
  "updated_at" timestamp with time zone DEFAULT now(),
  PRIMARY KEY ("key")
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.game_sessions (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "status" character varying NOT NULL DEFAULT 'waiting'::character varying CHECK (status::text = ANY (ARRAY['waiting'::character varying, 'active'::character varying, 'finished'::character varying]::text[])),
  "current_question_index" integer NOT NULL DEFAULT '-1'::integer,
  "question_start_time" timestamp with time zone,
  "teacher_id" uuid,
  "teacher_name" character varying,
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  PRIMARY KEY ("id")
);

ALTER TABLE public.game_sessions ENABLE ROW LEVEL SECURITY;

CREATE TABLE IF NOT EXISTS public.game_participants (
  "id" uuid NOT NULL DEFAULT gen_random_uuid(),
  "session_id" uuid NOT NULL,
  "student_name" character varying NOT NULL,
  "score" integer NOT NULL DEFAULT 0,
  "answered_current" boolean NOT NULL DEFAULT false,
  "last_seen" timestamp with time zone NOT NULL DEFAULT now(),
  "created_at" timestamp with time zone NOT NULL DEFAULT now(),
  "updated_at" timestamp with time zone NOT NULL DEFAULT now(),
  "status" text NOT NULL DEFAULT 'pending'::text CHECK (status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])),
  "correct_answers" integer DEFAULT 0,
  PRIMARY KEY ("id")
);

ALTER TABLE public.game_participants ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'students_class_name_fkey') THEN
        ALTER TABLE public.students ADD CONSTRAINT students_class_name_fkey FOREIGN KEY ("class_name") REFERENCES public.classes ("name");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'sessions_teacher_id_fkey') THEN
        ALTER TABLE public.sessions ADD CONSTRAINT sessions_teacher_id_fkey FOREIGN KEY ("teacher_id") REFERENCES public.users ("id");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_records_student_id_fkey') THEN
        ALTER TABLE public.session_records ADD CONSTRAINT session_records_student_id_fkey FOREIGN KEY ("student_id") REFERENCES public.students ("id");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_records_session_id_fkey') THEN
        ALTER TABLE public.session_records ADD CONSTRAINT session_records_session_id_fkey FOREIGN KEY ("session_id") REFERENCES public.sessions ("id");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'occurrence_students_student_id_fkey') THEN
        ALTER TABLE public.occurrence_students ADD CONSTRAINT occurrence_students_student_id_fkey FOREIGN KEY ("student_id") REFERENCES public.students ("id");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'occurrence_students_occurrence_id_fkey') THEN
        ALTER TABLE public.occurrence_students ADD CONSTRAINT occurrence_students_occurrence_id_fkey FOREIGN KEY ("occurrence_id") REFERENCES public.occurrences ("id");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'student_exits_student_id_fkey') THEN
        ALTER TABLE public.student_exits ADD CONSTRAINT student_exits_student_id_fkey FOREIGN KEY ("student_id") REFERENCES public.students ("id");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'planning_modules_class_id_fkey') THEN
        ALTER TABLE public.planning_modules ADD CONSTRAINT planning_modules_class_id_fkey FOREIGN KEY ("class_id") REFERENCES public.classes ("id");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'planning_modules_teacher_id_fkey') THEN
        ALTER TABLE public.planning_modules ADD CONSTRAINT planning_modules_teacher_id_fkey FOREIGN KEY ("teacher_id") REFERENCES public.users ("id");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'planning_modules_discipline_id_fkey') THEN
        ALTER TABLE public.planning_modules ADD CONSTRAINT planning_modules_discipline_id_fkey FOREIGN KEY ("discipline_id") REFERENCES public.disciplines ("id");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'planning_schedule_module_id_fkey') THEN
        ALTER TABLE public.planning_schedule ADD CONSTRAINT planning_schedule_module_id_fkey FOREIGN KEY ("module_id") REFERENCES public.planning_modules ("id");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'planning_locks_teacher_id_fkey') THEN
        ALTER TABLE public.planning_locks ADD CONSTRAINT planning_locks_teacher_id_fkey FOREIGN KEY ("teacher_id") REFERENCES public.users ("id");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'study_guide_items_module_id_fkey') THEN
        ALTER TABLE public.study_guide_items ADD CONSTRAINT study_guide_items_module_id_fkey FOREIGN KEY ("module_id") REFERENCES public.planning_modules ("id");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'enrollments_student_id_fkey') THEN
        ALTER TABLE public.enrollments ADD CONSTRAINT enrollments_student_id_fkey FOREIGN KEY ("student_id") REFERENCES public.students ("id");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'class_disciplines_teacher_id_fkey') THEN
        ALTER TABLE public.class_disciplines ADD CONSTRAINT class_disciplines_teacher_id_fkey FOREIGN KEY ("teacher_id") REFERENCES public.users ("id");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'class_disciplines_class_id_fkey') THEN
        ALTER TABLE public.class_disciplines ADD CONSTRAINT class_disciplines_class_id_fkey FOREIGN KEY ("class_id") REFERENCES public.classes ("id");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'class_disciplines_discipline_id_fkey') THEN
        ALTER TABLE public.class_disciplines ADD CONSTRAINT class_disciplines_discipline_id_fkey FOREIGN KEY ("discipline_id") REFERENCES public.disciplines ("id");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'planning_usage_class_id_fkey') THEN
        ALTER TABLE public.planning_usage ADD CONSTRAINT planning_usage_class_id_fkey FOREIGN KEY ("class_id") REFERENCES public.classes ("id");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'planning_usage_module_id_fkey') THEN
        ALTER TABLE public.planning_usage ADD CONSTRAINT planning_usage_module_id_fkey FOREIGN KEY ("module_id") REFERENCES public.planning_modules ("id");
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'game_participants_session_id_fkey') THEN
        ALTER TABLE public.game_participants ADD CONSTRAINT game_participants_session_id_fkey FOREIGN KEY ("session_id") REFERENCES public.game_sessions ("id");
    END IF;
END $$;

