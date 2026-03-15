
export enum UserRole {
  COORDINATOR = 'COORDINATOR',
  TEACHER = 'TEACHER',
  MONITOR = 'MONITOR',
  STUDENT = 'STUDENT',
  PARENT = 'PARENT',
  GAME_STUDENT = 'GAME_STUDENT'
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
  disciplineIds?: string[];
}

export interface Discipline {
  id: string;
  name: string; // e.g. "Matemática 9º EFII"
  displayName?: string; // e.g. "Matemática"
}

export interface Student {
  id: string;
  name: string;
  photoUrl: string;
  parentEmail: string;
  className: string; // Links to ClassRoom
  status?: string; // 'ACTIVE' | 'INACTIVE'
  inactiveReason?: string;
  inactiveDate?: string;
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
  present2?: boolean; // New: Support for second attendance call in double classes
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
  topic?: string;
  generalNotes?: string;
  homework?: string;
  photos?: string[]; // URLs (Class generic photos)
  moduleIds?: string[]; // IDs of planning modules used in this session
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
  teacherId?: string;
  classId?: string;
  front: string;
  chapter: string;
  module: string;
  title: string;
  topic: string;
  bimestre: number;
  isUsed?: boolean;
  createdAt?: string;
}

export interface PlanningSchedule {
  id: string;
  moduleId: string;
  plannedDate: string;
  executionStatus?: 'pending' | 'executed' | 'not_executed';
  justification?: string;
  createdAt?: string;
}

export interface StudyGuideItem {
  id: string;
  teacherId: string;
  disciplineId: string;
  classId: string;
  moduleId: string;
  bimestre: number;
  examType: 'P1' | 'P2' | 'SUBSTITUTIVA' | 'RECUPERACAO';
  orientation?: string;
  module?: PlanningModule; // joined
  createdAt?: string;
}

export type ViewState = 'DASHBOARD' | 'ADMIN' | 'SETTINGS' | 'GAME' | 'GRADES' | 'CLASSROOM' | 'FOA' | 'REPORTS' | 'STUDY_GUIDE' | 'MESSAGES' | 'REQUESTS';

export interface RequestItem {
  id: string;
  type: string;
  status: 'pending' | 'approved' | 'rejected';
  teacherId?: string;
  teacherName?: string;
  sessionId?: string;
  sessionInfo?: {
    date: string;
    className: string;
    subject: string;
    block: string;
  };
  reason?: string;
  resolvedBy?: string;
  resolvedAt?: string;
  createdAt: string;
}

export interface MessageItem {
  id: string;
  senderName: string;
  senderEmail?: string;
  senderRole: string;
  subject: string;
  body: string;
  recipients: 'students' | 'parents' | 'both' | 'coordinator' | 'individual_student' | 'individual_parent';
  targetClass?: string;
  targetStudentId?: string; // New: For individual communications
  attachmentType?: string;
  attachmentData?: any;
  directImages?: string[]; // New: For direct photo uploads
  isRead?: boolean;
  createdAt: string;
}

export interface Grade {
  id?: string;
  studentId: string;
  disciplineId: string;
  teacherId?: string;
  bimestre: number;
  year: number;
  p1?: number;
  p2?: number;
  p3?: number;
  p4?: number;
  sub?: number;
  recuperacao?: number;
  atividadesExtras?: number;
  mediaFinal?: number;
  createdAt?: string;
  updatedAt?: string;
}
