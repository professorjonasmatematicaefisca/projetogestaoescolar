import { supabase } from '../supabaseClient';
import { Student, ClassRoom, Teacher, Occurrence, ClassSession, SessionRecord } from '../types';
import { SEED_STUDENTS, SEED_CLASSES, SEED_TEACHERS, SEED_OCCURRENCES } from './mockData';

export const SupabaseService = {
    // --- MIGRATION UTILS ---
    async migrateMockData() {
        console.log("Starting migration...");

        // 1. Migrate Classes
        const { data: existingClasses } = await supabase.from('classes').select('name');
        const existingClassNames = new Set(existingClasses?.map(c => c.name));

        const classesToInsert = SEED_CLASSES.filter(c => !existingClassNames.has(c.name)).map(c => ({
            name: c.name,
            period: c.period
        }));

        if (classesToInsert.length > 0) {
            const { error: classError } = await supabase.from('classes').insert(classesToInsert);
            if (classError) console.error("Error migrating classes:", classError);
            else console.log("Classes migrated successfully.");
        } else {
            console.log("Classes already exist, skipping.");
        }

        // 2. Migrate Teachers (Users)
        // Check if users exist by email
        const { data: existingUsers } = await supabase.from('users').select('email');
        const existingEmails = new Set(existingUsers?.map(u => u.email));

        const teachersToInsert = SEED_TEACHERS.filter(t => !existingEmails.has(t.email)).map(t => ({
            name: t.name,
            email: t.email,
            password: '123', // Default password for migration
            role: 'TEACHER',
            subject: t.subject,
            assignments: t.assignments,
            photo_url: t.photoUrl
        }));

        if (teachersToInsert.length > 0) {
            const { error: userError } = await supabase.from('users').insert(teachersToInsert);
            if (userError) console.error("Error migrating teachers:", userError);
            else console.log("Teachers migrated successfully.");
        } else {
            console.log("Teachers already exist, skipping.");
        }

        // 3. Migrate Students
        // Check if students exist by name (assuming unique names for now, or fetch all and check)
        const { data: existingStudents } = await supabase.from('students').select('name');
        const existingStudentNames = new Set(existingStudents?.map(s => s.name));

        const studentsToInsert = SEED_STUDENTS.filter(s => !existingStudentNames.has(s.name)).map(s => ({
            name: s.name,
            photo_url: s.photoUrl,
            parent_email: s.parentEmail,
            class_name: s.className
        }));

        if (studentsToInsert.length > 0) {
            const { error: studentError } = await supabase.from('students').insert(studentsToInsert);
            if (studentError) console.error("Error migrating students:", studentError);
            else console.log("Students migrated successfully:", studentsToInsert.length);
        } else {
            console.log("Students already exist, skipping.");
        }

        console.log("Migration completed.");
    },

    // --- DATA FETCHING ---
    async getClasses(): Promise<ClassRoom[]> {
        const { data, error } = await supabase.from('classes').select('*');
        if (error) {
            console.error("Error fetching classes:", error);
            return SEED_CLASSES; // Fallback
        }
        return data.map((c: any) => ({
            id: c.id,
            name: c.name,
            period: c.period
        }));
    },

    async getStudents(): Promise<Student[]> {
        const { data, error } = await supabase.from('students').select('*');
        if (error) {
            console.error("Error fetching students:", error);

            // Try migration if empty? Or just return seed
            // console.log("Attempting migration due to empty/error...");
            // await this.migrateMockData();
            return SEED_STUDENTS; // Fallback
        }
        return data.map((s: any) => ({
            id: s.id,
            name: s.name,
            photoUrl: s.photo_url,
            parentEmail: s.parent_email,
            className: s.class_name
        }));
    },

    async getTeachers(): Promise<Teacher[]> {
        const { data, error } = await supabase.from('users').select('*').eq('role', 'TEACHER');
        if (error) {
            console.error("Error fetching teachers:", error);
            return SEED_TEACHERS;
        }
        return data.map((t: any) => ({
            id: t.id,
            name: t.name,
            email: t.email,
            subject: t.subject || '',
            assignments: t.assignments,
            photoUrl: t.photo_url
        }));
    },

    // --- HELPERS ---
    async getTeacherIdByEmail(email: string): Promise<string | null> {
        const { data, error } = await supabase.from('users').select('id').eq('email', email).single();
        if (error || !data) return null;
        return data.id;
    },

    // --- SESSION MANAGEMENT ---
    async saveSession(session: ClassSession, userEmail?: string): Promise<boolean> {
        let teacherId = session.teacherId;

        // Try to resolve teacher ID from email if not provided or if it's a mock ID
        if ((!teacherId || teacherId.startsWith('prof-')) && userEmail) {
            const resolvedId = await this.getTeacherIdByEmail(userEmail);
            if (resolvedId) teacherId = resolvedId;
        }

        // 1. Insert Session
        const { data: sessionData, error: sessionError } = await supabase
            .from('sessions')
            .insert({
                date: session.date,
                teacher_id: teacherId && !teacherId.startsWith('prof-') ? teacherId : null, // Only use valid UUIDs
                subject: session.subject,
                class_name: session.className,
                block: session.block,
                blocks_count: session.blocksCount || 1,
                general_notes: session.generalNotes,
                homework: session.homework,
                photos: session.photos
            })
            .select()
            .single();

        if (sessionError || !sessionData) {
            console.error("Error saving session:", sessionError);
            return false;
        }

        const sessionId = sessionData.id;

        // 2. Insert Records
        // Need to map student IDs if they are mock IDs. 
        // Strategy: We assume the App has already fetched students FROM SUPABASE, so they have UUIDs.
        // If not, this might fail. We rely on the app switching to Supabase for student list first.

        const recordsToInsert = session.records.map(r => ({
            session_id: sessionId,
            student_id: r.studentId,
            present: r.present,
            justified_absence: r.justifiedAbsence,
            phone_confiscated: r.phoneConfiscated,
            counters: r.counters,
            notes: r.notes,
            photos: r.photos
        }));

        const { error: recordsError } = await supabase.from('session_records').insert(recordsToInsert);

        if (recordsError) {
            console.error("Error saving session records:", recordsError);
            return false;
        }

        return true;
    },

    async getSessions(): Promise<ClassSession[]> {
        const { data: sessions, error } = await supabase
            .from('sessions')
            .select(`
                *,
                session_records (*)
            `)
            .order('date', { ascending: false });

        if (error) {
            console.error("Error fetching sessions:", error);
            return [];
        }

        return sessions.map((s: any) => ({
            id: s.id,
            date: s.date,
            teacherId: s.teacher_id || 'unknown',
            subject: s.subject,
            className: s.class_name,
            block: s.block,
            blocksCount: s.blocks_count,
            generalNotes: s.general_notes,
            homework: s.homework,
            photos: s.photos,
            records: s.session_records.map((r: any) => ({
                studentId: r.student_id,
                present: r.present,
                justifiedAbsence: r.justified_absence,
                phoneConfiscated: r.phone_confiscated,
                counters: r.counters,
                notes: r.notes,
                photos: r.photos
            }))
        }));
    }
};
