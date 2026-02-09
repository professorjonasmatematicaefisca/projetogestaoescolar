import { supabase } from '../supabaseClient';
import { Student, ClassRoom, Teacher, Occurrence, ClassSession, SessionRecord, UserRole } from '../types';
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
            // Return empty array or throw error instead of silent fallback to SEED
            // helping user realize connection issues.
            return [];
        }
        return data.map((s: any) => ({
            id: s.id,
            name: s.name,
            photoUrl: s.photo_url,
            parentEmail: s.parent_email,
            className: s.class_name
        }));
    },

    async createStudent(student: Omit<Student, 'id'>): Promise<boolean> {
        const { error } = await supabase.from('students').insert({
            name: student.name,
            photo_url: student.photoUrl,
            parent_email: student.parentEmail,
            class_name: student.className
        });

        if (error) {
            console.error("Error creating student:", error);
            return false;
        }
        return true;
    },

    async getTeachers(): Promise<Teacher[]> {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .in('role', [UserRole.TEACHER, UserRole.COORDINATOR, UserRole.MONITOR]);

        if (error) {
            console.error("Error fetching staff:", error);
            return SEED_TEACHERS.map(t => ({ ...t, role: UserRole.TEACHER }));
        }
        return data.map((t: any) => ({
            id: t.id,
            name: t.name,
            email: t.email,
            role: t.role as UserRole,
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

        // Try to resolve teacher ID from email if it's a mock ID or missing
        if ((!teacherId || teacherId.startsWith('prof-')) && userEmail) {
            const resolvedId = await this.getTeacherIdByEmail(userEmail);
            if (resolvedId) teacherId = resolvedId;
        }

        const { date, subject, className, block, blocksCount, generalNotes, homework, photos } = session;
        const sessionPayload = {
            date,
            teacher_id: teacherId && !teacherId.startsWith('prof-') ? teacherId : null,
            subject,
            class_name: className,
            block,
            blocks_count: blocksCount || 1,
            general_notes: generalNotes,
            homework,
            photos
        };

        let sessionId: string;

        // Check if it's an existing session from Supabase (UUID)
        const isExistingUUID = session.id.length > 20 && !session.id.startsWith('sess-');

        if (isExistingUUID) {
            // Update
            const { error } = await supabase
                .from('sessions')
                .update(sessionPayload)
                .eq('id', session.id);

            if (error) {
                console.error("Error updating session:", error);
                return false;
            }
            sessionId = session.id;

            // Delete existing records to replace them
            const { error: deleteError } = await supabase
                .from('session_records')
                .delete()
                .eq('session_id', sessionId);

            if (deleteError) {
                console.error("Error clearing old records:", deleteError);
                return false;
            }
        } else {
            // Insert
            const { data: sessionData, error: sessionError } = await supabase
                .from('sessions')
                .insert(sessionPayload)
                .select()
                .single();

            if (sessionError || !sessionData) {
                console.error("Error inserting session:", sessionError);
                return false;
            }
            sessionId = sessionData.id;
        }

        // Insert Records
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
                teacher:teacher_id (name),
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
            teacherName: s.teacher?.name || 'Professor Desconhecido',
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
    },

    async getOccurrences(): Promise<Occurrence[]> {
        const { data, error } = await supabase
            .from('occurrences')
            .select('*')
            .order('date', { ascending: false });

        if (error) {
            console.error("Error fetching occurrences:", error);
            return [];
        }
        return data as Occurrence[];
    },

    async saveOccurrence(occurrence: Occurrence): Promise<boolean> {
        const { error } = await supabase
            .from('occurrences')
            .upsert(occurrence);

        if (error) {
            console.error("Error saving occurrence:", error);
            return false;
        }
        return true;
    },

    // --- STUDENT CRUD ---
    async updateStudent(student: Student): Promise<boolean> {
        const { error } = await supabase
            .from('students')
            .update({
                name: student.name,
                photo_url: student.photoUrl,
                parent_email: student.parentEmail,
                class_name: student.className
            })
            .eq('id', student.id);

        if (error) {
            console.error("Error updating student:", error);
            return false;
        }
        return true;
    },

    async deleteStudent(id: string): Promise<boolean> {
        const { error } = await supabase
            .from('students')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Error deleting student:", error);
            return false;
        }
        return true;
    },

    // --- TEACHER/USER CRUD ---
    async createTeacher(teacher: Omit<Teacher, 'id'>, password: string = 'mudar123'): Promise<boolean> {
        const { error } = await supabase.from('users').insert({
            name: teacher.name,
            email: teacher.email,
            password: password,
            role: 'TEACHER',
            subject: teacher.subject || '',
            assignments: teacher.assignments || [],
            photo_url: teacher.photoUrl
        });

        if (error) {
            console.error("Error creating teacher:", error);
            return false;
        }
        return true;
    },

    async updateTeacher(teacher: Teacher): Promise<boolean> {
        const { error } = await supabase
            .from('users')
            .update({
                name: teacher.name,
                email: teacher.email,
                subject: teacher.subject || '',
                assignments: teacher.assignments || [],
                photo_url: teacher.photoUrl
            })
            .eq('id', teacher.id);

        if (error) {
            console.error("Error updating teacher:", error);
            return false;
        }
        return true;
    },

    async deleteTeacher(id: string): Promise<boolean> {
        const { error } = await supabase
            .from('users')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Error deleting teacher:", error);
            return false;
        }
        return true;
    },

    // --- CLASS CRUD ---
    async createClass(classRoom: Omit<ClassRoom, 'id'>): Promise<boolean> {
        const { error } = await supabase.from('classes').insert({
            name: classRoom.name,
            period: classRoom.period
        });

        if (error) {
            console.error("Error creating class:", error);
            return false;
        }
        return true;
    },

    async updateClass(classRoom: ClassRoom): Promise<boolean> {
        const { error } = await supabase
            .from('classes')
            .update({
                name: classRoom.name,
                period: classRoom.period
            })
            .eq('id', classRoom.id);

        if (error) {
            console.error("Error updating class:", error);
            return false;
        }
        return true;
    },

    async deleteClass(id: string): Promise<boolean> {
        const { error } = await supabase
            .from('classes')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Error deleting class:", error);
            return false;
        }
        return true;
    },

    // --- DISCIPLINE CRUD ---
    async getDisciplines(): Promise<any[]> {
        // Note: You may need to create a 'disciplines' table in Supabase
        // For now, returning a hardcoded list as fallback
        const { data, error } = await supabase.from('disciplines').select('*');

        if (error) {
            console.error("Error fetching disciplines:", error);
            // Return common disciplines as fallback
            return [
                { id: 'disc-mat', name: 'Matemática' },
                { id: 'disc-port', name: 'Português' },
                { id: 'disc-hist', name: 'História' },
                { id: 'disc-geo', name: 'Geografia' },
                { id: 'disc-bio', name: 'Biologia' },
                { id: 'disc-fis', name: 'Física' },
                { id: 'disc-quim', name: 'Química' },
                { id: 'disc-ing', name: 'Inglês' }
            ];
        }

        return data.map((d: any) => ({
            id: d.id,
            name: d.name
        }));
    },

    async createDiscipline(discipline: Omit<any, 'id'>): Promise<boolean> {
        const { error } = await supabase.from('disciplines').insert({
            name: discipline.name
        });

        if (error) {
            console.error("Error creating discipline:", error);
            return false;
        }
        return true;
    },

    async updateDiscipline(discipline: any): Promise<boolean> {
        const { error } = await supabase
            .from('disciplines')
            .update({
                name: discipline.name
            })
            .eq('id', discipline.id);

        if (error) {
            console.error("Error updating discipline:", error);
            return false;
        }
        return true;
    },

    async deleteDiscipline(id: string): Promise<boolean> {
        const { error } = await supabase
            .from('disciplines')
            .delete()
            .eq('id', id);

        if (error) {
            console.error("Error deleting discipline:", error);
            return false;
        }
        return true;
    }
};
