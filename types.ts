
export enum UserRole {
  COORDINATOR = 'COORDINATOR',
  TEACHER = 'TEACHER',
  MONITOR = 'MONITOR'
}

export interface TeacherClassAssignment {
  classId: string; // The name of the class (e.g., "9º Ano A")
  subject: string; // The name of the subject
  front?: string;  // Optional front (e.g., "Frente 1")
}

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Optional because we might not return it in all queries
  role: UserRole;
  photoUrl?: string;
  subject?: string; // Legacy/Simple
  assignments?: TeacherClassAssignment[]; // New: Specific class/subject assignments
}

export interface Teacher {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  subject: string; // Legacy: Primary subject or "Multiple"
  assignments?: TeacherClassAssignment[];
  photoUrl?: string;
}

export interface ClassRoom {
  id: string;
  name: string; // e.g. "9º Ano A"
  period: string; // e.g. "Matutino"
}

export interface Discipline {
  id: string;
  name: string; // e.g. "Matemática", "História"
}

export interface Student {
  id: string;
  name: string;
  photoUrl: string;
  parentEmail: string;
  className: string; // Links to ClassRoom
}

export interface Counters {
  talk: number;
  bathroom: number;
  sleep: number;
  material: number;
  activity: number;
  homework: number; // New: 0 (No) or 1 (Yes)
  participation: number; // New: Total ticks (0-10)
}

export interface SessionRecord {
  studentId: string;
  present: boolean;
  justifiedAbsence?: boolean; // New field for justified absence (Grade 5.0)
  phoneConfiscated: boolean;
  counters: Counters;
  notes?: string;
  photos?: string[]; // New: Specific photos for this student's record
}

export interface ClassSession {
  id: string;
  date: string; // ISO String
  teacherId: string;
  teacherName?: string;
  subject: string;
  className: string;
  block: string;
  blocksCount?: number; // New: Number of time blocks (e.g., 2 for double class)
  records: SessionRecord[];
  generalNotes?: string;
  homework?: string;
  photos?: string[]; // URLs (Class generic photos)
}

export enum OccurrenceStatus {
  OPEN = 'OPEN',
  ANALYZING = 'ANALYZING',
  RESOLVED = 'RESOLVED'
}

export enum OccurrenceType {
  DISCIPLINE = 'DISCIPLINE',
  HEALTH = 'HEALTH',
  CONFLICT = 'CONFLICT',
  PRAISE = 'PRAISE'
}

export interface Occurrence {
  id: string;
  type: OccurrenceType;
  description: string;
  studentIds: string[];
  date: string;
  status: OccurrenceStatus;
  photos?: string[];
  reportedBy: string;
}

export interface StudentExit {
  id: string;
  studentId: string;
  studentName?: string; // For UI convenience
  studentPhoto?: string; // For UI convenience
  className?: string;   // For UI convenience
  reasons: string[];
  exitTime: string;
  returnTime?: string;
  registeredBy?: string; // Who registered this exit
}


export interface PlanningModule {
  id: string;
  disciplineId: string;
  teacherId: string;
  classId: string;
  front: string;
  chapter: string;
  module: string;
  title: string;
  topic: string;
  createdAt?: string;
}

export interface PlanningSchedule {
  id: string;
  moduleId: string;
  plannedDate: string;
  createdAt?: string;
}

export type ViewState = 'MONITORING' | 'DASHBOARD' | 'REPORTS' | 'OCCURRENCES' | 'ADMIN' | 'SETTINGS' | 'FOA' | 'PLANNING';

