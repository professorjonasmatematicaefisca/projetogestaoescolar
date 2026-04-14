
import React, { useState, useEffect, useRef } from 'react';
import { Student, ClassSession, SessionRecord, Counters, Teacher, ClassRoom, UserRole, PlanningModule, Discipline } from './types';
import { StorageService } from './services/storageService';
import { SupabaseService } from './services/supabaseService';
import {
    MessageSquare, Moon, Smartphone, Book,
    Zap, Save, RefreshCw, Check, X, Tag,
    MoreVertical, Search, Bell, AlertCircle, Clock, ChevronDown, Calendar, FileText, Hand, Plus, Camera, Trash2, BookOpen, History, ArrowRight, Upload, Users, LogOut
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UserAvatar } from './components/UserAvatar';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Occurrence, OccurrenceType, OccurrenceStatus } from './types';

interface ClassroomMonitorProps {
    onShowToast: (msg: string) => void;
    userEmail?: string;
    userRole?: UserRole;
}

const normalize = (s: string) => s.replace(/[º°]/g, 'o').trim().toLowerCase();

const MORNING_BLOCKS = [
    '07h00 - 07h45',
    '07h45 - 08h30',
    '08h45 - 09h30',
    '09h30 - 10h15',
    '10h15 - 11h00',
    '11h15 - 12h00',
    '12h00 - 12h45',
    '12h45 - 13h30'
];

const AFTERNOON_BLOCKS = [
    '13h00 - 13h45',
    '13h45 - 14h30',
    '14h30 - 15h15',
    '15h30 - 16h15',
    '16h15 - 17h00',
    '17h15 - 18h00',
    '18h00 - 18h45'
];

export const ClassroomMonitor: React.FC<ClassroomMonitorProps> = ({ onShowToast, userEmail, userRole }) => {
    const [allStudents, setAllStudents] = useState<Student[]>([]);
    const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);

    // All Data for Dropdowns
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [allClasses, setAllClasses] = useState<ClassRoom[]>([]);

    // Derived Options based on selection
    const [availableClasses, setAvailableClasses] = useState<ClassRoom[]>([]);
    const [availableSubjects, setAvailableSubjects] = useState<string[]>([]);
    const [availableBlocks, setAvailableBlocks] = useState<string[]>(MORNING_BLOCKS);

    // Selection State
    const [selectedTeacherId, setSelectedTeacherId] = useState('');
    const [selectedClassId, setSelectedClassId] = useState('');
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]); // YYYY-MM-DD

    // Multi-Select Time Blocks State
    const [selectedBlocks, setSelectedBlocks] = useState<string[]>([]);
    const [isTimeDropdownOpen, setIsTimeDropdownOpen] = useState(false);
    const timeDropdownRef = useRef<HTMLDivElement>(null);

    const [session, setSession] = useState<ClassSession | null>(null);

    // --- Modal State for Student Observations ---
    const [obsModalOpen, setObsModalOpen] = useState(false);
    const [activeStudentId, setActiveStudentId] = useState<string | null>(null);
    const [tempNote, setTempNote] = useState('');
    const [tempPhotos, setTempPhotos] = useState<string[]>([]);

    // --- Modal State for Class Register (General) ---
    const [classModalOpen, setClassModalOpen] = useState(false);
    const [classTopic, setClassTopic] = useState(''); // Deprecated logic, now used as derived string
    const [classGeneralNotes, setClassGeneralNotes] = useState('');
    const [classHomework, setClassHomework] = useState('');
    const [classPhotos, setClassPhotos] = useState<string[]>([]);

    // --- Planning Modules for Content Selection ---
    const [allDisciplines, setAllDisciplines] = useState<Discipline[]>([]);
    const [contentModules, setContentModules] = useState<PlanningModule[]>([]);
    const [selectedContentIds, setSelectedContentIds] = useState<string[]>([]);
    const [loadingModules, setLoadingModules] = useState(false);

    // Camera State
    const [isCameraActive, setIsCameraActive] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // --- Modal State for History (Load Previous) ---
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [historySessions, setHistorySessions] = useState<ClassSession[]>([]);
    const [expandedHistoryGroups, setExpandedHistoryGroups] = useState<Set<string>>(new Set());

    // --- Blocked Time Slots ---
    const [blockedSlots, setBlockedSlots] = useState<string[]>([]);

    // --- Unsaved Changes State ---
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

    // --- Classroom Occurrence State ---
    const [occurrenceModalOpen, setOccurrenceModalOpen] = useState(false);
    const [occurrenceStudentId, setOccurrenceStudentId] = useState('');
    const [occurrenceReason, setOccurrenceReason] = useState('');
    const [occurrenceNotes, setOccurrenceNotes] = useState('');
    const [isSavingOccurrence, setIsSavingOccurrence] = useState(false);

    const OCCURRENCE_REASONS = [
        'Dormir',
        'Celular',
        'Falta de respeito',
        'Sair da sala sem autorização'
    ];

    // Ref to skip the useEffect fetch when session was loaded directly
    const skipNextFetchRef = useRef(false);

    // Draft persistence key
    const DRAFT_KEY = 'educontrol_classroom_draft';

    // Close time dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (timeDropdownRef.current && !timeDropdownRef.current.contains(event.target as Node)) {
                setIsTimeDropdownOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Load initial data
    useEffect(() => {
        const loadInitialData = async () => {
            try {
                const [loadedStudents, loadedTeachers, loadedClasses, loadedDisciplines] = await Promise.all([
                    SupabaseService.getStudents(),
                    SupabaseService.getTeachers(),
                    SupabaseService.getClasses(),
                    SupabaseService.getDisciplines()
                ]);

                setAllStudents(loadedStudents);
                setTeachers(loadedTeachers);
                setAllClasses(loadedClasses);
                setAllDisciplines(loadedDisciplines);

                if (loadedTeachers.length > 0) {
                    let initialTeacher = loadedTeachers[0];

                    // Se o usuário for um professor, forçar a seleção dele
                    if (userRole === UserRole.TEACHER && userEmail) {
                        const loggedTeacher = loadedTeachers.find(t => t.email === userEmail);
                        if (loggedTeacher) initialTeacher = loggedTeacher;
                    }

                    setSelectedTeacherId(initialTeacher.id);

                    let availCls = loadedClasses;
                    if (initialTeacher.assignments && initialTeacher.assignments.length > 0) {
                        const assignedClassNames = initialTeacher.assignments.map(a => a.classId);
                        availCls = loadedClasses.filter(c => assignedClassNames.includes(c.name));
                    }
                    setAvailableClasses(availCls);

                    // Do NOT auto-select — start clean
                    setSelectedClassId('');
                    setSelectedSubject('');
                }
            } catch (error) {
                onShowToast("Erro ao carregar dados do Supabase.");
                console.error(error);
            }
        };
        loadInitialData();
    }, []);

    // Effect: When TEACHER changes -> Update Available Classes
    useEffect(() => {
        const teacher = teachers.find(t => t.id === selectedTeacherId);
        if (!teacher) return;

        let availCls = allClasses;
        if (teacher.assignments && teacher.assignments.length > 0) {
            const assignedClassNames = teacher.assignments.map(a => a.classId);
            availCls = allClasses.filter(c => assignedClassNames.includes(c.name));
        }

        setAvailableClasses(availCls);

        // Only reset if current selection is not in available classes
        if (availCls.length > 0) {
            if (selectedClassId && !availCls.find(c => c.name === selectedClassId)) {
                setSelectedClassId('');
            }
        } else {
            setSelectedClassId('');
        }

    }, [selectedTeacherId, teachers, allClasses]);

    // Effect: When CLASS changes -> Update Available Subjects & Time Blocks
    useEffect(() => {
        const selectedClass = allClasses.find(c => c.name === selectedClassId);
        const teacher = teachers.find(t => t.id === selectedTeacherId);

        if (selectedClass && teacher) {
            // 1. Update Time Blocks
            const isAfternoon = selectedClass.period.toLowerCase().includes('vespertino') || selectedClass.period.toLowerCase().includes('tarde');
            const newBlocks = isAfternoon ? AFTERNOON_BLOCKS : MORNING_BLOCKS;
            setAvailableBlocks(newBlocks);

            // Reset blocks selection if completely invalid, otherwise try to keep intersection or default
            const validSelected = selectedBlocks.filter(b => newBlocks.includes(b));
            if (validSelected.length > 0) setSelectedBlocks(validSelected);
            else setSelectedBlocks([newBlocks[0]]);

            // 2. Update Subjects based on role
            let subjs: string[] = [];

            if (userRole === UserRole.TEACHER) {
                // Teachers: ONLY show disciplines assigned to them for this class
                if (teacher.assignments && teacher.assignments.length > 0) {
                    subjs = teacher.assignments
                        .filter(a => a.classId === selectedClassId)
                        .map(a => a.subject);
                }
            } else {
                // Coordinators: show all disciplines assigned to this class
                if (selectedClass && selectedClass.disciplineIds && selectedClass.disciplineIds.length > 0) {
                    subjs = allDisciplines
                        .filter(d => selectedClass.disciplineIds?.includes(d.id))
                        .map(d => d.name);
                } else if (teacher.assignments && teacher.assignments.length > 0) {
                    subjs = teacher.assignments
                        .filter(a => a.classId === selectedClassId)
                        .map(a => a.subject);
                }
            }

            subjs = [...new Set(subjs)];
            setAvailableSubjects(subjs);

            if (subjs.length > 0 && selectedSubject && !subjs.includes(selectedSubject)) {
                setSelectedSubject('');
            } else if (subjs.length === 0) {
                setSelectedSubject('');
            }
        }
    }, [selectedClassId, selectedTeacherId, allClasses, teachers]);

    // CORE LOGIC: Check for existing session whenever filters change
    useEffect(() => {
        if (selectedClassId && selectedTeacherId && selectedSubject && selectedDate) {
            const filtered = allStudents.filter(s => s.className === selectedClassId);
            setFilteredStudents(filtered);

            // Skip fetch if session was loaded directly (e.g., from history)
            if (skipNextFetchRef.current) {
                skipNextFetchRef.current = false;
                return;
            }

            // Check Supabase for existing session for this Day/Class/Teacher/Subject combo
            const fetchExistingSession = async () => {
                // Clear current session while fetching to avoid showing old data
                setSession(null);

                // Buscar todos os registros do dia para esta turma (para bloquear horários)
                const allSessionsForDay = await SupabaseService.getSessions();
                const todaySessions = allSessionsForDay.filter(s =>
                    s.className === selectedClassId &&
                    s.teacherId === selectedTeacherId &&
                    s.date.split('T')[0] === selectedDate
                );

                // Coletar os blocos já usados neste dia
                const usedBlocks: string[] = [];
                todaySessions.forEach(s => {
                    // O bloco pode ser composto (ex: "07h00 - 08h30 (2 aulas)")
                    // Vamos tentar descobrir os blocos individuais usados
                    availableBlocks.forEach(b => {
                        const blockStart = b.split(' - ')[0];
                        if (s.block && s.block.includes(blockStart)) {
                            usedBlocks.push(b);
                        }
                    });
                });
                setBlockedSlots(usedBlocks);

                const existingSession = await SupabaseService.findSession({
                    date: selectedDate,
                    className: selectedClassId,
                    teacherId: selectedTeacherId,
                    subject: selectedSubject
                });

                if (existingSession) {
                    setSession(existingSession);
                    // classTopic was used for generalNotes before, so we map it correctly
                    setClassTopic(existingSession.topic || '');
                    setClassGeneralNotes(existingSession.generalNotes || '');
                    setClassHomework(existingSession.homework || '');
                    setClassPhotos(existingSession.photos || []);

                    // Map saved modules to state
                    if (existingSession.moduleIds && existingSession.moduleIds.length > 0) {
                        setSelectedContentIds(existingSession.moduleIds);
                    } else {
                        setSelectedContentIds([]);
                    }
                    // Restore multiple blocks from composite block label
                    if (existingSession.blocksCount && existingSession.blocksCount > 1 && existingSession.block) {
                        const matchingBlocks = availableBlocks.filter(b => {
                            const blockStart = b.split(' - ')[0];
                            const blockEnd = b.split(' - ')[1];
                            return existingSession.block.includes(blockStart) || existingSession.block.includes(blockEnd);
                        });
                        if (matchingBlocks.length > 0) {
                            setSelectedBlocks(matchingBlocks);
                        }
                    } else if (existingSession.block && availableBlocks.includes(existingSession.block)) {
                        setSelectedBlocks([existingSession.block]);
                    }
                    // Limpar rascunho pois sessão já existe
                    localStorage.removeItem(DRAFT_KEY);
                    onShowToast("Registro existente carregado para edição.");
                } else {
                    // Tentar restaurar rascunho salvo
                    const savedDraft = localStorage.getItem(DRAFT_KEY);
                    if (savedDraft) {
                        try {
                            const draft = JSON.parse(savedDraft);
                            // Só restaurar se for para a mesma turma/disciplina/data
                            if (draft.className === selectedClassId &&
                                draft.subject === selectedSubject &&
                                draft.date === selectedDate &&
                                draft.teacherId === selectedTeacherId) {
                                setSession(draft.session);
                                setClassGeneralNotes(draft.generalNotes || '');
                                setClassHomework(draft.homework || '');
                                setSelectedContentIds(draft.contentIds || []);
                                onShowToast("📋 Rascunho restaurado! Seus dados foram recuperados.");
                                return;
                            }
                        } catch (e) {
                            localStorage.removeItem(DRAFT_KEY);
                        }
                    }
                    initializeSession(filtered);
                }
            };
            fetchExistingSession();
        }
    }, [selectedClassId, selectedTeacherId, selectedSubject, selectedDate]);

    // Effect: AUTO-SAVE DRAFT whenever session, notes or content changes
    useEffect(() => {
        if (session && !session.id.startsWith('sess-')) return; // Don't save draft if it's an existing DB session

        if (selectedClassId && selectedTeacherId && selectedSubject && selectedDate && session) {
            const draft = {
                className: selectedClassId,
                subject: selectedSubject,
                date: selectedDate,
                teacherId: selectedTeacherId,
                session: session,
                generalNotes: classGeneralNotes,
                homework: classHomework,
                contentIds: selectedContentIds
            };
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        }
    }, [session, classGeneralNotes, classHomework, selectedContentIds]);

    // Sync Class Register State when session changes
    useEffect(() => {
        if (session) {
            setClassTopic(session.generalNotes || '');
            setClassHomework(session.homework || '');
            setClassPhotos(session.photos || []);
        }
    }, [session]);

    const toggleBlock = (block: string) => {
        let newBlocks;
        if (selectedBlocks.includes(block)) {
            // Prevent deselecting the last one
            if (selectedBlocks.length === 1) return;
            newBlocks = selectedBlocks.filter(b => b !== block);
        } else {
            newBlocks = [...selectedBlocks, block];
        }
        // Sort blocks based on availableBlocks order to keep time consistent
        newBlocks.sort((a, b) => availableBlocks.indexOf(a) - availableBlocks.indexOf(b));
        setSelectedBlocks(newBlocks);
    };

    const getCompositeBlockLabel = () => {
        if (selectedBlocks.length === 0) return 'Selecione o horário...';
        if (selectedBlocks.length === 1) return selectedBlocks[0];

        // Logic to merge "07h00 - 07h45" and "07h45 - 08h30" into "07h00 - 08h30"
        const start = selectedBlocks[0].split(' - ')[0];
        const end = selectedBlocks[selectedBlocks.length - 1].split(' - ')[1];
        return `${start} - ${end} (${selectedBlocks.length} aulas)`;
    };

    const generateOccurrencePDF = (student: Student, reason: string, notes: string) => {
        const doc = new jsPDF();
        const teacher = teachers.find(t => t.id === selectedTeacherId);

        // Header
        doc.setFontSize(22);
        doc.setTextColor(30, 41, 59); // Slate-800
        doc.setFont('helvetica', 'bold');
        doc.text('FICHA DE OCORRÊNCIA DISCIPLINAR', 105, 25, { align: 'center' });

        doc.setDrawColor(226, 232, 240); // Slate-200
        doc.line(14, 32, 196, 32);

        // Identification Section
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // Slate-500
        doc.text('DADOS DE IDENTIFICAÇÃO', 14, 42);

        doc.setFillColor(248, 250, 252); // Slate-50
        doc.rect(14, 45, 182, 45, 'F');
        doc.setDrawColor(203, 213, 225); // Slate-300
        doc.rect(14, 45, 182, 45, 'S');

        doc.setFontSize(11);
        doc.setTextColor(15, 23, 42); // Slate-900
        doc.setFont('helvetica', 'bold');
        doc.text('Aluno:', 20, 55);
        doc.text('Turma:', 20, 65);
        doc.text('Professor:', 20, 75);
        doc.text('Data:', 140, 55);
        doc.text('Disciplina:', 20, 85);

        doc.setFont('helvetica', 'normal');
        doc.text(student.name, 45, 55);
        doc.text(student.className, 45, 65);
        doc.text(teacher?.name || 'Não informado', 45, 75);
        doc.text(format(new Date(), 'dd/MM/yyyy'), 155, 55);
        doc.text(selectedSubject || 'Não informada', 45, 85);

        // Occurrence Section
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // Slate-500
        doc.setFont('helvetica', 'bold');
        doc.text('DETALHES DA OCORRÊNCIA', 14, 105);

        doc.setFillColor(254, 242, 242); // Red-50 (Alert style)
        doc.rect(14, 108, 182, 15, 'F');
        doc.setDrawColor(252, 165, 165); // Red-300
        doc.rect(14, 108, 182, 15, 'S');

        doc.setTextColor(185, 28, 28); // Red-700
        doc.setFontSize(12);
        doc.text(`MOTIVO: ${reason.toUpperCase()}`, 105, 118, { align: 'center' });

        // Notes
        doc.setFontSize(10);
        doc.setTextColor(100, 116, 139); // Slate-500
        doc.setFont('helvetica', 'bold');
        doc.text('RELATO DO PROFESSOR:', 14, 138);

        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85); // Slate-700
        const splitNotes = doc.splitTextToSize(notes || 'Nenhuma observação adicional registrada.', 170);
        doc.text(splitNotes, 20, 148);

        // Signatures Section (at the bottom)
        const footerY = 250;
        doc.setDrawColor(148, 163, 184); // Slate-400
        
        // Professor line
        doc.line(20, footerY, 95, footerY);
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        doc.text('Assinatura do Professor', 57.5, footerY + 5, { align: 'center' });

        // Coordinator line
        doc.line(115, footerY, 190, footerY);
        doc.text('Assinatura do Orientador Pedagógico', 152.5, footerY + 5, { align: 'center' });

        // Save
        const fileName = `Ocorrencia_${student.name.replace(/\s+/g, '_')}_${format(new Date(), 'dd-MM-yyyy')}.pdf`;
        doc.save(fileName);
    };

    const handleSaveOccurrence = async () => {
        if (!occurrenceStudentId || !occurrenceReason) {
            onShowToast("Selecione um aluno e um motivo.");
            return;
        }

        setIsSavingOccurrence(true);
        try {
            const student = allStudents.find(s => s.id === occurrenceStudentId);
            if (!student) throw new Error("Aluno não encontrado");

            const newOccurrence: Occurrence = {
                id: `occ-${Date.now()}`,
                type: OccurrenceType.DISCIPLINE,
                description: `SALA DE AULA: ${occurrenceReason}. ${occurrenceNotes}`,
                studentIds: [occurrenceStudentId],
                date: new Date().toISOString(),
                status: OccurrenceStatus.OPEN,
                reportedBy: teachers.find(t => t.id === selectedTeacherId)?.name || 'Professor'
            };

            const success = await SupabaseService.saveOccurrence(newOccurrence);
            
            if (success) {
                onShowToast("Ocorrência registrada e PDF gerado!");
                generateOccurrencePDF(student, occurrenceReason, occurrenceNotes);
                setOccurrenceModalOpen(false);
                setOccurrenceStudentId('');
                setOccurrenceReason('');
                setOccurrenceNotes('');
            } else {
                onShowToast("Erro ao salvar ocorrência no banco.");
            }
        } catch (error) {
            console.error(error);
            onShowToast("Erro inesperado ao processar ocorrência.");
        } finally {
            setIsSavingOccurrence(false);
        }
    };

    const initializeSession = (studentList: Student[]) => {
        // Generate label and count
        const compositeBlock = selectedBlocks.length > 1
            ? `${selectedBlocks[0].split(' - ')[0]} - ${selectedBlocks[selectedBlocks.length - 1].split(' - ')[1]}`
            : selectedBlocks[0];

        // Use selected date — set to noon to avoid timezone off-by-one issue
        const dateStr = `${selectedDate}T12:00:00`;

        const newSession: ClassSession = {
            id: `sess-${Date.now()}`,
            date: new Date(dateStr).toISOString(),
            teacherId: selectedTeacherId,
            subject: selectedSubject,
            className: selectedClassId,
            block: compositeBlock,
            blocksCount: selectedBlocks.length,
            records: studentList.map(s => ({
                studentId: s.id,
                present: true,
                present2: true,
                phoneConfiscated: false,
                justifiedAbsence: false,
                // Material starts at 1. Activity starts at 3. Homework starts at 1 (Done). Participation starts at 0.
                counters: { talk: 0, bathroom: 0, sleep: 0, material: 1, activity: 3, homework: 1, participation: 0, prontidao: 0 },
                photos: []
            })),
            generalNotes: '',
            homework: '',
            photos: []
        };
        setSession(newSession);
    };

    const updateRecord = (studentId: string, updater: (record: SessionRecord) => SessionRecord) => {
        if (!session) return;
        const newRecords = session.records.map(r =>
            r.studentId === studentId ? updater({ ...r }) : r
        );
        const updatedSession = { ...session, records: newRecords };
        setSession(updatedSession);
        setHasUnsavedChanges(true); // Mark as dirty

        // Salvar rascunho automaticamente
        try {
            const draft = {
                className: selectedClassId,
                subject: selectedSubject,
                date: selectedDate,
                teacherId: selectedTeacherId,
                session: updatedSession,
                generalNotes: classGeneralNotes,
                homework: classHomework,
                contentIds: selectedContentIds
            };
            localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
        } catch (e) {
            // Ignorar erro de quota
        }
    };

    const handleCounter = (studentId: string, type: keyof Counters, delta: number) => {
        updateRecord(studentId, (record) => {
            const currentVal = record.counters[type] || 0;
            let newVal = currentVal + delta;

            // Apply Constraints based on rules
            if (type === 'material' || type === 'homework') {
                newVal = Math.max(0, Math.min(1, newVal)); // 0 or 1 for Toggles
            } else if (type === 'activity' || type === 'talk' || type === 'bathroom' || type === 'sleep') {
                newVal = Math.max(0, Math.min(3, newVal)); // 0 to 3 for Activity, Talk, Bathroom, Sleep
            } else if (type === 'prontidao') {
                newVal = Math.max(0, Math.min(3, newVal)); // 0 to 3 for Prontidão
            } else if (type === 'participation') {
                newVal = Math.max(0, Math.min(10, newVal)); // 0 to 10 for Participation Ticks
            } else {
                newVal = Math.max(0, newVal); // No hard upper limit for other penalties
            }

            return {
                ...record,
                counters: { ...record.counters, [type]: newVal }
            };
        });
    };

    const setAttendance = (studentId: string, isPresent: boolean) => {
        updateRecord(studentId, r => ({ ...r, present: isPresent, justifiedAbsence: false }));
    };

    const setAttendance2 = (studentId: string, isPresent: boolean) => {
        updateRecord(studentId, r => ({ ...r, present2: isPresent }));
    };

    const setJustifiedAbsence = (studentId: string, isJustified: boolean) => {
        updateRecord(studentId, r => ({ ...r, justifiedAbsence: isJustified }));
    };

    const setPhone = (studentId: string, hasPhone: boolean) => {
        updateRecord(studentId, r => ({ ...r, phoneConfiscated: hasPhone }));
    };

    // --- Student Observation Modal Logic ---

    const openObservationModal = (studentId: string) => {
        const record = session?.records.find(r => r.studentId === studentId);
        if (record) {
            setActiveStudentId(studentId);
            setTempNote(record.notes || '');
            setTempPhotos(record.photos || []);
            setObsModalOpen(true);
        }
    };

    const handleSaveObservation = () => {
        if (activeStudentId && session) {
            updateRecord(activeStudentId, r => ({
                ...r,
                notes: tempNote,
                photos: tempPhotos
            }));
            onShowToast("Observação e fotos salvas!");
            setObsModalOpen(false);
            setActiveStudentId(null);
            stopCamera(); // Ensure camera stops
        }
    };

    const handleStudentImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                setTempPhotos([...tempPhotos, base64]);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeStudentPhoto = (index: number) => {
        const newPhotos = [...tempPhotos];
        newPhotos.splice(index, 1);
        setTempPhotos(newPhotos);
    };

    // --- Class Register Modal Logic ---

    const loadContentModules = async () => {
        setLoadingModules(true);
        try {
            const discObj = allDisciplines.find(d => d.name === selectedSubject);
            const targetClassId = allClasses.find(c => normalize(c.name) === normalize(selectedClassId))?.id;

            // 1) Find the week boundaries (Mon-Sun)
            const dDate = new Date(`${selectedDate}T12:00:00`);
            const dayOfWeek = dDate.getDay();
            const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
            const startD = new Date(dDate); startD.setDate(dDate.getDate() + diffToMonday);
            const endD = new Date(startD); endD.setDate(startD.getDate() + 6);
            const startDateStr = startD.toISOString().split('T')[0];
            const endDateStr = endD.toISOString().split('T')[0];

            const [mods, discsList, allSchedules] = await Promise.all([
                SupabaseService.getPlanningModules({
                    unusedOnly: true,
                    classId: targetClassId,
                    disciplineId: discObj?.id
                }),
                SupabaseService.getDisciplines(),
                SupabaseService.getPlanningSchedule()
            ]);
            setAllDisciplines(discsList);

            // 3) Filter the schedules to find which modules are planned for THIS week and THIS class!
            const allowedModuleIds = new Set<string>();
            allSchedules.forEach(s => {
                if (s.plannedDate >= startDateStr && s.plannedDate <= endDateStr) {
                    if (s.module && s.module.classId === targetClassId) {
                        allowedModuleIds.add(s.moduleId.toString());
                    }
                }
            });

            // 4) Intersect unused modules with scheduled modules
            const weekModules = mods.filter(m => allowedModuleIds.has(m.id as string));

            // Numerically sort modules: Chapter first, then Module
            const sorted = [...weekModules].sort((a, b) => {
                const chapterComparison = String(a.chapter).localeCompare(String(b.chapter), undefined, { numeric: true });
                if (chapterComparison !== 0) return chapterComparison;
                return String(a.module).localeCompare(String(b.module), undefined, { numeric: true });
            });

            const genericModules: PlanningModule[] = [
                {
                    id: 'generic-revisao',
                    disciplineId: discObj?.id || 'generic',
                    front: 'Geral',
                    chapter: '-',
                    module: '-',
                    title: 'Revisão - Prova',
                    topic: 'Revisão',
                    bimestre: 1
                },
                {
                    id: 'generic-resolucao',
                    disciplineId: discObj?.id || 'generic',
                    front: 'Geral',
                    chapter: '-',
                    module: '-',
                    title: 'Resolução de exercícios',
                    topic: 'Exercícios',
                    bimestre: 1
                },
                {
                    id: 'generic-correcao',
                    disciplineId: discObj?.id || 'generic',
                    front: 'Geral',
                    chapter: '-',
                    module: '-',
                    title: 'Correção de Prova',
                    topic: 'Correção',
                    bimestre: 1
                }
            ];

            setContentModules([...sorted, ...genericModules]);
        } catch (err) {
            console.error('Error loading planning modules:', err);
        }
        setLoadingModules(false);
    };

    const handleOpenClassModal = () => {
        setClassModalOpen(true);
        setSelectedContentIds([]);
        loadContentModules();
    };

    const toggleContentModule = (moduleId: string) => {
        setSelectedContentIds(prev =>
            prev.includes(moduleId) ? prev.filter(id => id !== moduleId) : [...prev, moduleId]
        );
    };

    const buildContentString = (): string => {
        const parts: string[] = [];
        selectedContentIds.forEach(id => {
            const mod = contentModules.find(m => m.id === id);
            if (mod) {
                if (id.startsWith('generic-')) {
                    parts.push(mod.title);
                } else {
                    parts.push(`Cap. ${mod.chapter} — Mod. ${mod.module} — ${mod.title}`);
                }
            }
        });
        if (classTopic.trim()) parts.push(classTopic.trim());
        return parts.join(' | ');
    };

    const handleSaveClassInfo = async () => {
        if (session) {
            let contentStr = buildContentString();

            // Add coordinator OBS if a coordinator is registering for another teacher
            if (userRole === UserRole.COORDINATOR) {
                const currentUser = teachers.find(t => t.email === userEmail);
                if (!currentUser || currentUser.id !== selectedTeacherId) {
                    contentStr += " | OBS: Lançado pela Coordenação";
                }
            }

            const updatedSession: ClassSession = {
                ...session,
                generalNotes: contentStr,
                homework: classHomework,
                photos: classPhotos,
                moduleIds: selectedContentIds.filter(id => !id.startsWith('generic-'))
            };
            setSession(updatedSession);
            const result = await SupabaseService.saveSession(updatedSession, userEmail);
            if (result.success) {
                // Mark modules as used in the database for the SPECIFIC CLASS
                if (selectedContentIds.length > 0) {
                    const classObj = allClasses.find(c => normalize(c.name) === normalize(selectedClassId));
                    if (classObj) {
                        const realModuleIds = selectedContentIds.filter(id => !id.startsWith('generic-'));
                        if (realModuleIds.length > 0) {
                            await SupabaseService.markModulesAsUsed(realModuleIds, classObj.id);
                        }
                        // Reload modules so they disappear from the list immediately
                        await loadContentModules();
                    }
                }
                onShowToast("Conteúdo de aula salvo no Supabase!");
                setHasUnsavedChanges(false);
            } else {
                onShowToast(`Erro ao salvar: ${result.error || 'Falha no servidor'}. Backup salvo localmente.`);
                StorageService.saveSession(updatedSession);
                setHasUnsavedChanges(false);
            }
            setClassModalOpen(false);
            stopCamera();
        }
    };

    const handleClassImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                setClassPhotos([...classPhotos, base64]);
            };
            reader.readAsDataURL(file);
        }
    };

    const removeClassPhoto = (index: number) => {
        const newPhotos = [...classPhotos];
        newPhotos.splice(index, 1);
        setClassPhotos(newPhotos);
    };

    // Camera Functions
    const startCamera = async () => {
        try {
            setIsCameraActive(true);
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' }
            });
            streamRef.current = stream;
            // Small timeout to allow DOM to render video element
            setTimeout(() => {
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.play();
                }
            }, 100);
        } catch (err) {
            console.error(err);
            onShowToast("Erro ao acessar câmera. Verifique permissões.");
            setIsCameraActive(false);
        }
    };

    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        setIsCameraActive(false);
    };

    const capturePhoto = () => {
        if (videoRef.current) {
            const canvas = document.createElement('canvas');
            canvas.width = videoRef.current.videoWidth;
            canvas.height = videoRef.current.videoHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(videoRef.current, 0, 0);
                const base64 = canvas.toDataURL('image/jpeg');

                // Determine where to save based on which modal is open
                if (obsModalOpen) {
                    setTempPhotos([...tempPhotos, base64]);
                } else if (classModalOpen) {
                    setClassPhotos([...classPhotos, base64]);
                }

                stopCamera();
            }
        }
    };

    useEffect(() => {
        return () => {
            stopCamera(); // Cleanup on unmount
        }
    }, []);

    // --- Delete Session Logic ---

    const handleDeleteSession = async (sess: ClassSession) => {
        const confirmed = window.confirm(`Tem certeza que deseja EXCLUIR o registro de ${format(new Date(sess.date), "dd/MM/yyyy")} — ${sess.className} (${sess.subject})?\n\nEsta ação não pode ser desfeita.`);
        if (!confirmed) return;

        const classObj = allClasses.find(c => normalize(c.name) === normalize(sess.className));
        const success = await SupabaseService.deleteSession(sess.id, classObj?.id);
        if (success) {
            setHistorySessions(prev => prev.filter(s => s.id !== sess.id));
            // If the deleted session is the one currently on screen, clear it
            if (session?.id === sess.id) {
                setSession(null);
                clearScreenData();
            }
            onShowToast("Registro de aula excluído com sucesso.");
        } else {
            onShowToast("Erro ao excluir registro. Tente novamente.");
        }
    };

    const handleRequestDeleteSession = async (sess: ClassSession) => {
        const reason = window.prompt(`Motivo da exclusão do registro de ${format(new Date(sess.date), "dd/MM/yyyy")} — ${sess.className}:`);
        if (reason === null) return; // cancelled

        const teacherName = teachers.find(t => t.id === selectedTeacherId)?.name || userEmail || 'Professor';

        const success = await SupabaseService.createRequest({
            type: 'delete_session',
            status: 'pending',
            teacherId: selectedTeacherId,
            teacherName,
            sessionId: sess.id,
            sessionInfo: {
                date: sess.date,
                className: sess.className,
                subject: sess.subject,
                block: sess.block
            },
            reason: reason || 'Sem motivo informado'
        });

        if (success) {
            onShowToast("✅ Solicitação enviada ao coordenador. Aguarde aprovação.");
        } else {
            onShowToast("Erro ao enviar solicitação. Tente novamente.");
        }
    };

    // --- Load Previous (History) Logic ---

    const handleOpenHistory = async () => {
        checkUnsavedAndProceed(async () => {
            const all = await SupabaseService.getSessions();

            // Filter based on user role and permissions
            let history = all;
            if (userRole === UserRole.TEACHER) {
                // Teachers only see their own sessions
                history = all.filter(s => s.teacherId === selectedTeacherId);
            } else {
                // Coordinators see all but can filter by selected teacher if desired
                // For now, we show all sessions for the history view, sorted by date
                history = all;
            }

            history = history.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            setHistorySessions(history);
            setHistoryModalOpen(true);
        });
    };

    const handleLoadSession = (sess: ClassSession) => {
        // Directly set the session so all data loads immediately
        setSession(sess);

        // Prevent the useEffect from re-fetching and overwriting our loaded session
        skipNextFetchRef.current = true;

        // Sync the filter dropdowns to match the loaded session
        setSelectedDate(sess.date.split('T')[0]);
        setSelectedClassId(sess.className);
        setSelectedSubject(sess.subject);
        setSelectedContentIds(sess.moduleIds || []);

        // Restore block selection from the session's block field
        if (sess.blocksCount && sess.blocksCount > 1 && sess.block) {
            // Try to find matching blocks from available blocks
            const matchingBlocks = availableBlocks.filter(b => {
                const blockStart = b.split(' - ')[0];
                const blockEnd = b.split(' - ')[1];
                return sess.block.includes(blockStart) || sess.block.includes(blockEnd);
            });
            if (matchingBlocks.length > 0) {
                setSelectedBlocks(matchingBlocks);
            } else {
                setSelectedBlocks([sess.block]);
            }
        } else if (sess.block) {
            setSelectedBlocks([sess.block]);
        }

        // Update filtered students for the loaded class
        const filtered = allStudents.filter(s => s.className === sess.className);
        setFilteredStudents(filtered);

        setHistoryModalOpen(false);
        setHasUnsavedChanges(false);
        onShowToast(`Aula de ${format(new Date(sess.date), "dd/MM")} — ${sess.className} carregada.`);
    };

    // --- Clear/Reset Screen Data ---
    const clearScreenData = () => {
        // Keep selectedClassId and selectedSubject for continuity as requested
        // setSelectedClassId('');
        // setSelectedSubject('');
        setSelectedDate(new Date().toISOString().split('T')[0]);
        // setSelectedBlocks stays as is or resets to default

        setSession(null);
        setClassTopic('');
        setClassGeneralNotes('');
        setClassHomework('');
        setClassPhotos([]);
        setSelectedContentIds([]);
        setHasUnsavedChanges(false);

        // Scroll to top for visual feedback
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    // --- Confirmation Helper ---
    const checkUnsavedAndProceed = async (callback: () => void) => {
        if (hasUnsavedChanges) {
            const shouldSave = window.confirm("Você tem alterações não salvas nesta turma. Deseja SALVAR antes de prosseguir?");
            if (shouldSave) {
                const saveResult = await handleSave();
                if (!saveResult) {
                    const proceedAnyway = window.confirm("O salvamento falhou ou foi cancelado. Deseja realmente prosseguir SEM SALVAR as alterações atuais?");
                    if (!proceedAnyway) return;
                }
            } else {
                const proceedAnyway = window.confirm("Deseja realmente prosseguir SEM SALVAR as alterações atuais?");
                if (!proceedAnyway) return;
            }
        }
        setHasUnsavedChanges(false);
        callback();
    };

    // --- New Class Logic ---

    const handleNewClass = async () => {
        if (hasUnsavedChanges) {
            const shouldSave = window.confirm("Você tem alterações não salvas. Deseja SALVAR antes de iniciar um novo registro?");
            if (shouldSave) {
                const saveResult = await handleSave();
                if (saveResult === false) {
                    const discardInstead = window.confirm("O salvamento não foi concluído. Deseja DESCARTAR as alterações e iniciar um novo registro mesmo assim?");
                    if (!discardInstead) return;
                } else {
                    return;
                }
            } else {
                const discard = window.confirm("Deseja realmente DESCARTAR as alterações atuais e iniciar um novo registro?");
                if (!discard) return;
            }
        }

        onShowToast("Iniciando novo registro...");
        clearScreenData();
    };

    // --- Main Save ---

    const handleSave = async (): Promise<boolean> => {
        if (session) {
            // Validation: require content before saving
            if (selectedContentIds.length === 0) {
                onShowToast("⚠️ Você precisa registrar o conteúdo ministrado antes de salvar!");
                return false;
            }

            // Sync the block info with current selected blocks before saving
            const compositeBlock = selectedBlocks.length > 1
                ? `${selectedBlocks[0].split(' - ')[0]} - ${selectedBlocks[selectedBlocks.length - 1].split(' - ')[1]}`
                : selectedBlocks[0];

            // Generate the topic string automatically from selected modules
            const derivedTopic = selectedContentIds.map(id => {
                const mod = contentModules.find(m => m.id === id);
                return mod ? (id.startsWith('generic-') ? mod.title : `Cap. ${mod.chapter} - Mod. ${mod.module} - ${mod.title}`) : '';
            }).filter(Boolean).join('; ');

            const updatedSession: ClassSession = {
                ...session,
                block: compositeBlock,
                blocksCount: selectedBlocks.length,
                moduleIds: selectedContentIds.filter(id => !id.startsWith('generic-')), // Filter generic IDs to avoid UUID errors in DB
                topic: derivedTopic,
                generalNotes: classGeneralNotes,
                homework: classHomework,
                photos: classPhotos
            };

            const result = await SupabaseService.saveSession(updatedSession, userEmail);
            if (result.success) {
                setSession(updatedSession);
                onShowToast("Aula salva no Supabase com sucesso!");
                setHasUnsavedChanges(false);
                // Limpar rascunho após salvar com sucesso
                localStorage.removeItem(DRAFT_KEY);

                // Clear screen to start fresh as requested
                setTimeout(() => {
                    clearScreenData();
                }, 1500); // Small delay to let user see success toast

                return true;
            } else {
                onShowToast(`Erro ao salvar no Supabase: ${result.error || 'Falha no servidor'}. Backup salvo localmente.`);
                StorageService.saveSession(updatedSession);
                setHasUnsavedChanges(false);
                return false;
            }
        }
        return false;
    };

    return (
        <>
            <div className="max-w-[1600px] mx-auto space-y-6 pb-48 lg:pb-24">
                {/* Top Header Filter Bar */}
                <div className="sticky top-0 z-20 bg-[#0f172a] p-4 rounded-xl border border-gray-800 flex flex-col xl:flex-row justify-between items-center gap-4 shadow-lg">
                    <div className="flex flex-wrap gap-4 items-center w-full xl:w-auto">
                        <div className="flex flex-col">
                            <label className="text-[10px] text-gray-500 font-bold uppercase mb-1">Data</label>
                            <div className="relative">
                                <input
                                    type="date"
                                    value={selectedDate}
                                    onChange={(e) => checkUnsavedAndProceed(() => setSelectedDate(e.target.value))}
                                    max={new Date().toISOString().split('T')[0]}
                                    className="bg-[#1e293b] text-white text-sm border border-gray-700 rounded-lg p-2 pl-8 outline-none focus:border-emerald-500"
                                />
                                <Calendar size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400" />
                            </div>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[10px] text-gray-500 font-bold uppercase mb-1">Professor</label>
                            <select
                                value={selectedTeacherId}
                                onChange={(e) => checkUnsavedAndProceed(() => setSelectedTeacherId(e.target.value))}
                                disabled={userRole === UserRole.TEACHER}
                                className={`bg-[#1e293b] text-white text-sm border border-gray-700 rounded-lg p-2 outline-none focus:border-emerald-500 min-w-[150px] ${userRole === UserRole.TEACHER ? 'opacity-70 cursor-not-allowed' : ''}`}
                            >
                                {teachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[10px] text-gray-500 font-bold uppercase mb-1">Turma</label>
                            <select
                                value={selectedClassId}
                                onChange={(e) => checkUnsavedAndProceed(() => setSelectedClassId(e.target.value))}
                                className="bg-[#1e293b] text-white text-sm border border-gray-700 rounded-lg p-2 outline-none focus:border-emerald-500 w-[120px]"
                            >
                                {!selectedClassId && <option value="">Selecione a turma...</option>}
                                {availableClasses.length === 0 && selectedClassId === '' && <option value="" disabled>Sem turmas</option>}
                                {availableClasses.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[10px] text-gray-500 font-bold uppercase mb-1">Disciplina</label>
                            <select
                                value={selectedSubject}
                                onChange={(e) => checkUnsavedAndProceed(() => setSelectedSubject(e.target.value))}
                                className="bg-[#1e293b] text-white text-sm border border-gray-700 rounded-lg p-2 outline-none focus:border-emerald-500 w-[130px]"
                            >
                                {!selectedSubject && <option value="">Selecione a disciplina...</option>}
                                {availableSubjects.map(s => {
                                    const disc = allDisciplines.find(d => d.name === s);
                                    return <option key={s} value={s}>{disc?.displayName || s}</option>;
                                })}
                            </select>
                        </div>
                        <div className="relative" ref={timeDropdownRef}>
                            <button
                                onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
                                className="w-full h-11 bg-[#1e293b] border border-gray-700 rounded-xl px-4 flex items-center justify-between text-white hover:border-gray-600 transition-all shadow-lg"
                            >
                                <div className="flex items-center gap-3">
                                    <Clock size={18} className="text-emerald-500" />
                                    <span className="text-sm font-medium">{getCompositeBlockLabel()}</span>
                                </div>
                                <ChevronDown size={18} className={`text-gray-500 transition-transform duration-200 ${isTimeDropdownOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isTimeDropdownOpen && (
                                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1e293b] border border-gray-700 rounded-xl shadow-2xl z-[100] py-2 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                        {availableBlocks.map(block => {
                                            const isBlocked = blockedSlots.includes(block);
                                            return (
                                                <div
                                                    key={block}
                                                    onClick={() => !isBlocked && toggleBlock(block)}
                                                    className={`
                                                        flex items-center justify-between px-4 py-2.5 cursor-pointer transition-colors
                                                        ${selectedBlocks.includes(block) ? 'bg-emerald-500/10 text-emerald-400' : 'text-gray-300 hover:bg-gray-800'}
                                                        ${isBlocked ? 'opacity-40 cursor-not-allowed bg-gray-900/50' : ''}
                                                    `}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${selectedBlocks.includes(block) ? 'bg-emerald-500 border-emerald-500' : 'border-gray-600'}`}>
                                                            {selectedBlocks.includes(block) && <Check size={10} className="text-[#0f172a]" />}
                                                        </div>
                                                        <span className="text-sm font-medium">{block}</span>
                                                    </div>
                                                    {isBlocked && (
                                                        <span className="text-[10px] bg-red-500/10 text-red-400 px-2 py-0.5 rounded-full font-bold flex items-center gap-1">
                                                            <AlertCircle size={10} /> OCUPADO
                                                        </span>
                                                    )}
                                                </div>
                                            );
                                        })}
                                    </div>
                                    <div className="border-t border-gray-700 p-2 bg-gray-900/40">
                                        <p className="text-[10px] text-gray-500 text-center italic">
                                            Selecione um ou mais horários para aula dupla/tripla.
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-3 w-full xl:w-auto">
                        <div className="relative flex-1 xl:w-64">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                            <input
                                type="text"
                                placeholder="Busca rápida..."
                                className="w-full bg-[#1e293b] border border-gray-700 text-gray-200 text-sm rounded-lg pl-9 pr-3 py-2 focus:ring-1 focus:ring-emerald-500 outline-none"
                            />
                        </div>
                        <button className="relative p-2 text-gray-400 hover:text-white">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-emerald-500 rounded-full"></span>
                        </button>
                    </div>
                </div>

                {/* Grid of Students (unchanged logic, just rendering) */}
                {!selectedClassId ? (
                    <div className="text-center p-12 bg-[#0f172a] rounded-xl border border-gray-800 border-dashed">
                        <Users size={48} className="mx-auto text-gray-700 mb-4 opacity-20" />
                        <p className="text-gray-400 font-medium">Selecione uma turma para carregar os alunos.</p>
                    </div>
                ) : !session ? (
                    <div className="flex items-center justify-center p-12 bg-[#0f172a] rounded-xl border border-gray-800 border-dashed">
                        <div className="text-center">
                            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                            <p className="text-gray-400">Carregando dados da aula...</p>
                        </div>
                    </div>
                ) : filteredStudents.length === 0 ? (
                    <div className="text-center p-12 bg-[#0f172a] rounded-xl border border-gray-800 border-dashed">
                        <p className="text-gray-400">
                            {selectedClassId ? 'Nenhum aluno encontrado nesta turma.' : 'Selecione uma turma para carregar os alunos.'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                        {filteredStudents.map(student => {
                            const record = session.records.find(r => r.studentId === student.id);
                            if (!record) return null;

                            return (
                                <div
                                    key={student.id}
                                    className={`
                    relative rounded-xl border transition-all duration-200 overflow-hidden flex flex-col
                    ${record.present
                                            ? 'bg-[#0f172a] border-gray-700 hover:border-emerald-500/50'
                                            : 'bg-[#0f172a] border-gray-800 opacity-60'}
                `}
                                >
                                    {/* Card Header */}
                                    <div className="p-4 flex items-center justify-between border-b border-gray-800">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <UserAvatar
                                                    name={student.name}
                                                    photoUrl={student.photoUrl}
                                                    size="lg"
                                                />
                                                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0f172a] ${record.present ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-gray-100 text-sm">
                                                    {student.name}
                                                    {record.present && (
                                                        <span className={`ml-2 font-black ${StorageService.calculateGrade(record) <= 5 ? 'text-red-500' : 'text-emerald-400'}`}>
                                                            ({StorageService.calculateGrade(record).toFixed(1)})
                                                        </span>
                                                    )}
                                                </h3>
                                                <p className="text-xs text-gray-500">RA: 4492{student.id.split('-')[1]}</p>
                                            </div>
                                        </div>
                                        {/* Observation Button */}
                                        <button
                                            onClick={() => openObservationModal(student.id)}
                                            className={`hover:bg-gray-700 p-1.5 rounded-full transition-colors ${record.notes || (record.photos && record.photos.length > 0) ? 'text-emerald-500' : 'text-gray-500'}`}
                                            title="Adicionar Observação / Fotos"
                                        >
                                            <Plus size={20} />
                                        </button>
                                    </div>

                                    {/* Status Toggles Row */}
                                    <div className="px-4 py-3 grid grid-cols-2 gap-4 border-b border-gray-800/50">
                                        <div>
                                            <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Presença</label>
                                            <div className="flex bg-[#1e293b] rounded-lg p-0.5">
                                                <button
                                                    onClick={() => setAttendance(student.id, true)}
                                                    className={`flex-1 text-[10px] font-bold py-1.5 rounded-md transition-colors ${record.present ? 'bg-emerald-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                                                >
                                                    SIM
                                                </button>
                                                <button
                                                    onClick={() => setAttendance(student.id, false)}
                                                    className={`flex-1 text-[10px] font-bold py-1.5 rounded-md transition-colors ${!record.present ? 'bg-red-500/20 text-red-500' : 'text-gray-400 hover:text-gray-200'}`}
                                                >
                                                    NÃO
                                                </button>
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-[10px] text-gray-500 font-bold uppercase mb-1 block">Celular</label>
                                            <div className="flex bg-[#1e293b] rounded-lg p-0.5">
                                                <button
                                                    onClick={() => setPhone(student.id, false)}
                                                    className={`flex-1 text-[10px] font-bold py-1.5 rounded-md transition-colors ${!record.phoneConfiscated ? 'bg-emerald-900/40 text-emerald-500 border border-emerald-500/30' : 'text-gray-400'}`}
                                                >
                                                    NÃO
                                                </button>
                                                <button
                                                    onClick={() => setPhone(student.id, true)}
                                                    className={`flex-1 text-[10px] font-bold py-1.5 rounded-md transition-colors ${record.phoneConfiscated ? 'bg-red-500 text-white' : 'text-gray-400'}`}
                                                >
                                                    SIM
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Second Attendance Row (Conditional — uses live selectedBlocks) */}
                                    {selectedBlocks.length > 1 && (
                                        <div className="px-4 py-2 border-b border-gray-800/50 bg-blue-500/5">
                                            <div className="flex items-center justify-between">
                                                <label className="text-[10px] text-blue-400 font-bold uppercase">Presença (2ª Chamada)</label>
                                                <div className="flex bg-[#1e293b] rounded-lg p-0.5 w-[100px]">
                                                    <button
                                                        onClick={() => setAttendance2(student.id, true)}
                                                        className={`flex-1 text-[9px] font-bold py-1 rounded-md transition-colors ${record.present2 !== false ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-400 hover:text-gray-200'}`}
                                                    >
                                                        SIM
                                                    </button>
                                                    <button
                                                        onClick={() => setAttendance2(student.id, false)}
                                                        className={`flex-1 text-[9px] font-bold py-1 rounded-md transition-colors ${record.present2 === false ? 'bg-red-500/20 text-red-500' : 'text-gray-400 hover:text-gray-200'}`}
                                                    >
                                                        NÃO
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {/* Counters Grid */}
                                    <div className="p-4 space-y-3 relative">
                                        {!record.present && (
                                            <div className="absolute inset-0 bg-[#0f172a]/90 z-10 flex flex-col items-center justify-center backdrop-blur-sm p-4 text-center">
                                                <span className="text-gray-400 font-bold text-lg tracking-widest italic mb-2">AUSENTE</span>

                                                {/* Justification Toggle */}
                                                <button
                                                    onClick={() => setJustifiedAbsence(student.id, !record.justifiedAbsence)}
                                                    className={`px-4 py-2 rounded-lg text-xs font-bold border transition-colors ${record.justifiedAbsence
                                                        ? 'bg-emerald-500 text-[#0f172a] border-emerald-500'
                                                        : 'bg-transparent text-gray-400 border-gray-600 hover:border-gray-400'
                                                        }`}
                                                >
                                                    {record.justifiedAbsence ? 'FALTA JUSTIFICADA' : 'JUSTIFICAR FALTA'}
                                                </button>
                                                {record.justifiedAbsence && <span className="text-[10px] text-emerald-400 mt-1">Nota ajustada para 5,0</span>}
                                            </div>
                                        )}

                                        {record.present && StorageService.calculateGrade(record) === 0 && (
                                            <div className="absolute inset-x-0 top-0 h-full bg-red-900/60 z-10 flex flex-col items-center justify-center backdrop-blur-[2px] p-4 text-center">
                                                <div className="bg-red-600 text-white font-black text-xs px-3 py-1.5 rounded-full shadow-lg border border-red-400 animate-pulse">
                                                    ALUNO ZEROU ESTA AULA
                                                </div>
                                                <span className="text-red-200 text-[9px] uppercase font-bold mt-2 tracking-wider">Pontuação mínima atingida</span>
                                            </div>
                                        )}

                                        <CounterRow
                                            label="Prontidão"
                                            icon={() => <span style={{fontSize: '18px'}} title="Prontidão">✍️</span>}
                                            value={record.counters.prontidao ?? 0}
                                            max={3}
                                            customColor={record.counters.prontidao > 0 ? 'text-yellow-400' : 'text-gray-500'}
                                            onMinus={() => handleCounter(student.id, 'prontidao', -1)}
                                            onPlus={() => handleCounter(student.id, 'prontidao', 1)}
                                        />
                                        <CounterRow
                                            label="Conversa"
                                            icon={MessageSquare}
                                            value={record.counters.talk}
                                            onMinus={() => handleCounter(student.id, 'talk', -1)}
                                            onPlus={() => handleCounter(student.id, 'talk', 1)}
                                        />
                                        <CounterRow
                                            label="Banheiro"
                                            icon={AlertCircle}
                                            value={record.counters.bathroom}
                                            onMinus={() => handleCounter(student.id, 'bathroom', -1)}
                                            onPlus={() => handleCounter(student.id, 'bathroom', 1)}
                                        />
                                        <CounterRow
                                            label="Dormir"
                                            icon={Moon}
                                            value={record.counters.sleep}
                                            onMinus={() => handleCounter(student.id, 'sleep', -1)}
                                            onPlus={() => handleCounter(student.id, 'sleep', 1)}
                                        />
                                        <div className="flex flex-col gap-2">
                                            <CounterRow
                                                label="Material"
                                                icon={Book}
                                                value={record.counters.material}
                                                max={1}
                                                // Material: 1 is GOOD, 0 is BAD.
                                                customColor={record.counters.material === 0 ? 'text-red-500' : 'text-emerald-500'}
                                                onMinus={() => handleCounter(student.id, 'material', -1)}
                                                onPlus={() => handleCounter(student.id, 'material', 1)}
                                            />
                                            <CounterRow
                                                label="Tarefas"
                                                icon={FileText}
                                                value={record.counters.homework ?? 1}
                                                max={1}
                                                customColor={record.counters.homework === 0 ? 'text-red-500' : 'text-emerald-500'}
                                                onMinus={() => handleCounter(student.id, 'homework', -1)}
                                                onPlus={() => handleCounter(student.id, 'homework', 1)}
                                            />
                                        </div>

                                        <div className="flex flex-col gap-2">
                                            <CounterRow
                                                label="Atividade"
                                                icon={Zap}
                                                value={record.counters.activity}
                                                max={3}
                                                // Activity: High is Good (Started at 3)
                                                customColor={record.counters.activity < 3 ? 'text-orange-400' : 'text-emerald-400'}
                                                onMinus={() => handleCounter(student.id, 'activity', -1)}
                                                onPlus={() => handleCounter(student.id, 'activity', 1)}
                                            />
                                            <CounterRow
                                                label="Participação"
                                                icon={Hand}
                                                value={record.counters.participation ?? 0}
                                                max={10}
                                                // Participation: 10 ticks = +5.0 points
                                                customColor={record.counters.participation > 0 ? 'text-blue-400' : 'text-gray-500'}
                                                onMinus={() => handleCounter(student.id, 'participation', -1)}
                                                onPlus={() => handleCounter(student.id, 'participation', 1)}
                                            />
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div >
                )}

                <div className="flex flex-wrap gap-2 w-full md:w-auto justify-center sm:justify-end">
                    {/* New Class Register Button */}
                    <button
                        onClick={handleOpenClassModal}
                        className="flex-1 sm:flex-none min-w-[140px] px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                        <Plus size={18} />
                        Registrar Conteúdo
                    </button>

                    <button
                        onClick={handleOpenHistory}
                        className="flex-1 sm:flex-none min-w-[140px] px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                        <History size={18} />
                        Carregar Anterior
                    </button>
                    <button
                        onClick={handleNewClass}
                        className="flex-1 sm:flex-none min-w-[140px] px-4 py-2.5 bg-transparent border border-emerald-500 text-emerald-500 hover:bg-emerald-500/10 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 text-sm"
                    >
                        <RefreshCw size={18} />
                        Nova Aula
                    </button>
                    <button
                        onClick={handleSave}
                        className="flex-1 sm:flex-none min-w-[120px] px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-[#0f172a] rounded-lg font-bold shadow-[0_0_15px_rgba(16,185,129,0.4)] transition-all flex items-center justify-center gap-2"
                    >
                        <Save size={18} />
                        {session && session.id && !session.id.startsWith('sess-') ? "Salvar Alteração" : "Salvar Aula"}
                    </button>
                    <button
                        onClick={() => setOccurrenceModalOpen(true)}
                        disabled={!selectedClassId}
                        className="flex-1 sm:flex-none min-w-[140px] px-4 py-2.5 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white border border-red-600/30 rounded-lg font-bold transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <AlertTriangle size={18} />
                        Ocorrência
                    </button>
                </div>
            </div >

            {/* Student Observation & Photo Modal */}
            {
                obsModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-[#1e293b] w-full max-w-lg rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-[#0f172a]">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <FileText size={18} className="text-emerald-500" />
                                    Registro Individual de Aluno
                                </h3>
                                <button onClick={() => { setObsModalOpen(false); stopCamera(); }} className="text-gray-400 hover:text-white"><X size={20} /></button>
                            </div>

                            <div className="p-6 overflow-y-auto">
                                {!isCameraActive ? (
                                    <>
                                        <div className="mb-4">
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Observações de Aula</label>
                                            <textarea
                                                value={tempNote}
                                                onChange={(e) => setTempNote(e.target.value)}
                                                className="w-full h-32 bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-white placeholder-gray-600 outline-none focus:border-emerald-500"
                                                placeholder="Descreva o comportamento ou observação relevante..."
                                            ></textarea>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Evidências (Fotos)</label>
                                            <div className="flex flex-wrap gap-2">
                                                {tempPhotos.map((photo, idx) => (
                                                    <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-600 group">
                                                        <img src={photo} className="w-full h-full object-cover" />
                                                        <button
                                                            onClick={() => removeStudentPhoto(idx)}
                                                            className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-red-400"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ))}

                                                <button
                                                    onClick={startCamera}
                                                    className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-600 flex flex-col items-center justify-center text-gray-500 hover:border-emerald-500 hover:text-emerald-500 transition-colors"
                                                >
                                                    <Camera size={20} />
                                                    <span className="text-[9px] font-bold mt-1">FOTO</span>
                                                </button>

                                                <label className="w-20 h-20 rounded-lg border-2 border-dashed border-gray-600 flex flex-col items-center justify-center text-gray-500 hover:border-emerald-500 hover:text-emerald-500 cursor-pointer transition-colors">
                                                    <Upload size={20} />
                                                    <span className="text-[9px] font-bold mt-1">UPLOAD</span>
                                                    <input type="file" accept="image/*" className="hidden" onChange={handleStudentImageUpload} />
                                                </label>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden mb-4 border-2 border-gray-700">
                                            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                                            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                                                <button
                                                    onClick={stopCamera}
                                                    className="bg-gray-800/80 hover:bg-gray-700 text-white p-3 rounded-full"
                                                >
                                                    <X size={24} />
                                                </button>
                                                <button
                                                    onClick={capturePhoto}
                                                    className="bg-white p-1 rounded-full border-4 border-gray-300 hover:scale-105 transition-transform"
                                                >
                                                    <div className="w-12 h-12 bg-white rounded-full border-2 border-black"></div>
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-400">Enquadre e clique no botão circular para capturar.</p>
                                    </div>
                                )}
                            </div>

                            {!isCameraActive && (
                                <div className="p-4 border-t border-gray-700 bg-[#0f172a] flex justify-end gap-2">
                                    <button
                                        onClick={() => setObsModalOpen(false)}
                                        className="px-4 py-2 rounded-lg text-sm font-bold text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSaveObservation}
                                        className="px-6 py-2 rounded-lg text-sm font-bold bg-emerald-500 text-[#0f172a] hover:bg-emerald-400 transition-colors flex items-center gap-2"
                                    >
                                        <Save size={16} />
                                        Salvar Registro
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* Class Register Modal (General Content + Board Photo) */}
            {
                classModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-[#1e293b] w-full max-w-xl rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                            <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-[#0f172a]">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <BookOpen size={18} className="text-blue-500" />
                                    Registro de Aula (Turma)
                                </h3>
                                <button onClick={() => { setClassModalOpen(false); stopCamera(); }} className="text-gray-400 hover:text-white"><X size={20} /></button>
                            </div>

                            <div className="p-6 overflow-y-auto space-y-6">
                                {!isCameraActive ? (
                                    <>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="bg-[#0f172a] p-3 rounded-lg border border-gray-700">
                                                <span className="text-xs text-gray-500 uppercase font-bold block mb-1">Turma</span>
                                                <span className="text-white font-bold">{selectedClassId}</span>
                                            </div>
                                            <div className="bg-[#0f172a] p-3 rounded-lg border border-gray-700">
                                                <span className="text-xs text-gray-500 uppercase font-bold block mb-1">Disciplina</span>
                                                <span className="text-white font-bold">
                                                    {allDisciplines.find(d => d.name === selectedSubject)?.displayName || selectedSubject}
                                                </span>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Conteúdo Ministrado</label>
                                            <p className="text-[10px] text-gray-600 mb-3">Selecione os conteúdos do planejamento ministrados nesta aula:</p>
                                            {loadingModules ? (
                                                <div className="flex items-center gap-2 py-4 justify-center">
                                                    <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                                    <span className="text-xs text-gray-500">Carregando conteúdos...</span>
                                                </div>
                                            ) : contentModules.length > 0 ? (
                                                <div className="flex flex-wrap gap-2 mb-3">
                                                    {contentModules.map(mod => (
                                                        <button
                                                            key={mod.id}
                                                            type="button"
                                                            onClick={() => toggleContentModule(mod.id)}
                                                            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${selectedContentIds.includes(mod.id)
                                                                ? 'bg-blue-500/20 text-blue-300 border-blue-500/40 shadow-lg shadow-blue-500/10'
                                                                : 'bg-gray-800/60 text-gray-400 border-gray-700 hover:border-blue-500/30 hover:text-gray-200'
                                                                }`}
                                                        >
                                                            {selectedContentIds.includes(mod.id) ? <Check size={12} /> : <Tag size={12} />}
                                                            {mod.id.startsWith('generic-') ? mod.title : `Cap. ${mod.chapter} — Mod. ${mod.module} — ${mod.title}`}
                                                        </button>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-gray-600 italic py-3 text-center bg-gray-900/30 rounded-lg border border-dashed border-gray-800">
                                                    Nenhum conteúdo planejado encontrado para {selectedClassId} / {selectedSubject}.
                                                </p>
                                            )}
                                            {selectedContentIds.length > 0 && (
                                                <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-3 mb-3">
                                                    <span className="text-[10px] text-blue-400 font-bold uppercase">Selecionados ({selectedContentIds.length})</span>
                                                    <div className="flex flex-wrap gap-1.5 mt-2">
                                                        {selectedContentIds.map(id => {
                                                            const mod = contentModules.find(m => m.id === id);
                                                            return mod ? (
                                                                <span key={id} className="inline-flex items-center gap-1 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-lg px-2 py-1 text-[10px] font-bold">
                                                                    <Check size={10} />
                                                                    {id.startsWith('generic-') ? mod.title : `Cap. ${mod.chapter} — Mod. ${mod.module} — ${mod.title}`}
                                                                    <button onClick={() => toggleContentModule(id)} className="ml-1 hover:text-red-400"><X size={10} /></button>
                                                                </span>
                                                            ) : null;
                                                        })}
                                                    </div>
                                                </div>
                                            )}

                                            <div className="w-full min-h-16 bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-white text-xs whitespace-pre-wrap leading-relaxed opacity-80 cursor-not-allowed">
                                                {selectedContentIds.length > 0 ? (
                                                    selectedContentIds.map((id, index) => {
                                                        const mod = contentModules.find(m => m.id === id);
                                                        return mod ? (
                                                            <div key={id} className="mb-1">
                                                                {index + 1}. {id.startsWith('generic-') ? mod.title : `Cap. ${mod.chapter} — ${allDisciplines.find(d => d.name === selectedSubject)?.displayName || selectedSubject} — Mod. ${mod.module} — ${mod.title}`}
                                                            </div>
                                                        ) : null;
                                                    })
                                                ) : (
                                                    <span className="text-gray-500 italic">Nenhum módulo selecionado... os conteúdos aparecerão aqui automaticamente.</span>
                                                )}
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-emerald-400 uppercase mb-2 mt-4">Observações Gerais (Opcional)</label>
                                            <textarea
                                                value={classGeneralNotes}
                                                onChange={(e) => setClassGeneralNotes(e.target.value)}
                                                className="w-full h-20 bg-[#0f172a] border border-emerald-500/30 rounded-lg p-3 text-white placeholder-gray-600 outline-none focus:border-emerald-500 text-xs"
                                                placeholder="Observações adicionais, problemas técnicos, recados para a coordenação..."
                                            ></textarea>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Lição de Casa / Atividade</label>
                                            <textarea
                                                value={classHomework}
                                                onChange={(e) => setClassHomework(e.target.value)}
                                                className="w-full h-20 bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-white placeholder-gray-600 outline-none focus:border-blue-500"
                                                placeholder="Exercícios, páginas do livro ou trabalhos..."
                                            ></textarea>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Foto da Lousa / Quadro</label>
                                            <div className="flex flex-wrap gap-2">
                                                {classPhotos.map((photo, idx) => (
                                                    <div key={idx} className="relative w-32 h-24 rounded-lg overflow-hidden border border-gray-600 group">
                                                        <img src={photo} className="w-full h-full object-cover" />
                                                        <button
                                                            onClick={() => removeClassPhoto(idx)}
                                                            className="absolute inset-0 bg-black/50 hidden group-hover:flex items-center justify-center text-red-400"
                                                        >
                                                            <Trash2 size={20} />
                                                        </button>
                                                    </div>
                                                ))}

                                                <button
                                                    onClick={startCamera}
                                                    className="w-32 h-24 rounded-lg border-2 border-dashed border-gray-600 flex flex-col items-center justify-center text-gray-500 hover:border-blue-500 hover:text-blue-500 transition-colors"
                                                >
                                                    <Camera size={24} />
                                                    <span className="text-[10px] font-bold mt-1">TIRAR FOTO</span>
                                                </button>

                                                <label className="w-32 h-24 rounded-lg border-2 border-dashed border-gray-600 flex flex-col items-center justify-center text-gray-500 hover:border-blue-500 hover:text-blue-500 cursor-pointer transition-colors">
                                                    <Upload size={24} />
                                                    <span className="text-[10px] font-bold mt-1">UPLOAD</span>
                                                    <input type="file" accept="image/*" className="hidden" onChange={handleClassImageUpload} />
                                                </label>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex flex-col items-center">
                                        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden mb-4 border-2 border-gray-700">
                                            <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
                                            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-4">
                                                <button
                                                    onClick={stopCamera}
                                                    className="bg-gray-800/80 hover:bg-gray-700 text-white p-3 rounded-full"
                                                >
                                                    <X size={24} />
                                                </button>
                                                <button
                                                    onClick={capturePhoto}
                                                    className="bg-white p-1 rounded-full border-4 border-gray-300 hover:scale-105 transition-transform"
                                                >
                                                    <div className="w-12 h-12 bg-white rounded-full border-2 border-black"></div>
                                                </button>
                                            </div>
                                        </div>
                                        <p className="text-xs text-gray-400">Enquadre e clique no botão circular para capturar.</p>
                                    </div>
                                )}
                            </div>

                            {!isCameraActive && (
                                <div className="p-4 border-t border-gray-700 bg-[#0f172a] flex justify-end gap-2">
                                    <button
                                        onClick={() => setClassModalOpen(false)}
                                        className="px-4 py-2 rounded-lg text-sm font-bold text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={handleSaveClassInfo}
                                        className="px-6 py-2 rounded-lg text-sm font-bold bg-blue-600 text-white hover:bg-blue-500 transition-colors flex items-center gap-2"
                                    >
                                        <Save size={16} />
                                        Salvar Dados da Aula
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )
            }

            {/* History Modal (unchanged) */}
            {
                historyModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                        <div className="bg-[#1e293b] w-full max-w-2xl rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
                            <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-[#0f172a]">
                                <h3 className="font-bold text-white flex items-center gap-2">
                                    <History size={18} className="text-gray-400" />
                                    Aulas Anteriores
                                </h3>
                                <button onClick={() => setHistoryModalOpen(false)} className="text-gray-400 hover:text-white"><X size={20} /></button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-2">
                                {historySessions.length === 0 ? (
                                    <div className="text-center p-12">
                                        <p className="text-gray-500">Nenhuma aula registrada por este professor.</p>
                                    </div>
                                ) : (() => {
                                    // Group sessions by className (series)
                                    const grouped: Record<string, ClassSession[]> = {};
                                    historySessions.forEach(sess => {
                                        const key = sess.className || 'Sem turma';
                                        if (!grouped[key]) grouped[key] = [];
                                        grouped[key].push(sess);
                                    });
                                    const classNames = Object.keys(grouped).sort();

                                    return (
                                        <div className="space-y-3">
                                            {classNames.map(className => {
                                                const isExpanded = expandedHistoryGroups.has(className);
                                                return (
                                                <div key={className}>
                                                    {/* Cabeçalho da turma com seta para expandir/recolher */}
                                                    <button
                                                        onClick={() => {
                                                            setExpandedHistoryGroups(prev => {
                                                                const next = new Set(prev);
                                                                if (next.has(className)) next.delete(className);
                                                                else next.add(className);
                                                                return next;
                                                            });
                                                        }}
                                                        className="w-full flex items-center gap-2 px-3 py-2.5 bg-[#0f172a] rounded-lg border border-gray-700 mb-1 hover:border-emerald-500/40 transition-colors"
                                                    >
                                                        <Users size={14} className="text-emerald-500 flex-shrink-0" />
                                                        <span className="font-bold text-emerald-400 text-sm uppercase tracking-wide flex-1 text-left">{className}</span>
                                                        <span className="text-gray-500 text-xs mr-2">{grouped[className].length} aula(s)</span>
                                                        <ChevronDown
                                                            size={16}
                                                            className={`text-gray-400 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
                                                        />
                                                    </button>

                                                    {/* Sessões da turma — só visíveis quando expandida */}
                                                    {isExpanded && (
                                                        <div className="space-y-2 pl-2 mb-2">
                                                            {grouped[className].map(sess => (
                                                                <div
                                                                    key={sess.id}
                                                                    className="bg-[#0f172a] border border-gray-800 p-4 rounded-lg hover:border-emerald-500/50 transition-colors group flex items-center justify-between"
                                                                >
                                                                    <div
                                                                        className="flex flex-col gap-1 flex-1 cursor-pointer"
                                                                        onClick={() => handleLoadSession(sess)}
                                                                    >
                                                                        <div className="flex items-center gap-2">
                                                                            <Calendar size={14} className="text-emerald-500" />
                                                                            <span className="font-bold text-white text-sm">
                                                                                {format(new Date(sess.date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex gap-4 text-xs text-gray-400 ml-6">
                                                                            <span>{sess.subject}</span>
                                                                            <span>•</span>
                                                                            <span>{sess.block}</span>
                                                                        </div>
                                                                        {sess.generalNotes && (
                                                                            <p className="text-[10px] text-gray-500 ml-6 mt-1 truncate max-w-md">
                                                                                "{sess.generalNotes}"
                                                                            </p>
                                                                        )}
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        {userRole === UserRole.COORDINATOR ? (
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); handleDeleteSession(sess); }}
                                                                                className="p-2 rounded-lg text-gray-600 hover:text-red-500 hover:bg-red-500/10 transition-colors"
                                                                                title="Excluir registro"
                                                                            >
                                                                                <Trash2 size={16} />
                                                                            </button>
                                                                        ) : (
                                                                            <button
                                                                                onClick={(e) => { e.stopPropagation(); handleRequestDeleteSession(sess); }}
                                                                                className="p-2 rounded-lg text-gray-600 hover:text-amber-500 hover:bg-amber-500/10 transition-colors"
                                                                                title="Solicitar exclusão ao coordenador"
                                                                            >
                                                                                <Trash2 size={16} />
                                                                            </button>
                                                                        )}
                                                                        <ArrowRight size={18} className="text-gray-600 group-hover:text-emerald-500 transition-colors" />
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                                );
                                            })}
                                        </div>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )
            }
            {/* Classroom Occurrence Modal */}
            {occurrenceModalOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <div className="bg-[#1e293b] w-full max-w-xl rounded-2xl border border-gray-700 shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
                        {/* Header */}
                        <div className="p-5 border-b border-gray-700 flex justify-between items-center bg-[#0f172a]">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-500/10 rounded-lg">
                                    <AlertTriangle size={20} className="text-red-500" />
                                </div>
                                <div>
                                    <h3 className="font-bold text-white uppercase tracking-wider text-sm">Registro de Ocorrência</h3>
                                    <p className="text-[10px] text-gray-500 font-medium">SALA DE AULA • {selectedClassId}</p>
                                </div>
                            </div>
                            <button onClick={() => setOccurrenceModalOpen(false)} className="text-gray-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                            {/* Student Selection */}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-3 tracking-widest">Aluno(a) Envolvido(a)</label>
                                <select
                                    value={occurrenceStudentId}
                                    onChange={(e) => setOccurrenceStudentId(e.target.value)}
                                    className="w-full h-11 bg-[#0f172a] border border-gray-700 rounded-xl px-4 text-white text-sm outline-none focus:border-red-500 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">Selecione o aluno...</option>
                                    {allStudents
                                        .filter(s => s.className === selectedClassId)
                                        .sort((a, b) => a.name.localeCompare(b.name))
                                        .map(s => (
                                            <option key={s.id} value={s.id}>{s.name}</option>
                                        ))
                                    }
                                </select>
                            </div>

                            {/* Reasons Selection */}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-3 tracking-widest">Motivo da Ocorrência</label>
                                <div className="grid grid-cols-2 gap-3">
                                    {OCCURRENCE_REASONS.map(reason => (
                                        <button
                                            key={reason}
                                            onClick={() => setOccurrenceReason(reason)}
                                            className={`p-3 rounded-xl border text-xs font-bold transition-all flex flex-col items-center gap-2 group ${occurrenceReason === reason
                                                ? 'bg-red-500/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.15)]'
                                                : 'bg-[#0f172a]/50 border-gray-700 text-gray-500 hover:border-gray-500 hover:text-gray-300'
                                                }`}
                                        >
                                            <div className={`p-1.5 rounded-lg transition-colors ${occurrenceReason === reason ? 'bg-red-500/20' : 'bg-gray-800'}`}>
                                                {reason === 'Celular' && <Smartphone size={14} />}
                                                {reason === 'Dormir' && <Moon size={14} />}
                                                {reason === 'Falta de respeito' && <AlertCircle size={14} />}
                                                {reason === 'Sair da sala sem autorização' && <LogOut size={14} />}
                                            </div>
                                            <span className="text-center leading-tight">{reason}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Detailed Notes */}
                            <div>
                                <label className="block text-[10px] font-bold text-gray-500 uppercase mb-3 tracking-widest">Relato Detalhado (Opcional)</label>
                                <textarea
                                    value={occurrenceNotes}
                                    onChange={(e) => setOccurrenceNotes(e.target.value)}
                                    placeholder="Descreva brevemente o comportamento do aluno..."
                                    className="w-full h-24 bg-[#0f172a] border border-gray-700 rounded-xl p-4 text-white text-sm outline-none focus:border-red-500 transition-all resize-none placeholder-gray-700"
                                ></textarea>
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="p-4 bg-[#0f172a] border-t border-gray-700 flex justify-end gap-3">
                            <button
                                onClick={() => setOccurrenceModalOpen(false)}
                                className="px-5 py-2 rounded-lg text-sm font-bold text-gray-500 hover:text-white transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSaveOccurrence}
                                disabled={isSavingOccurrence || !occurrenceStudentId || !occurrenceReason}
                                className="px-6 py-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-bold text-sm shadow-xl transition-all flex items-center gap-2 active:scale-95"
                            >
                                {isSavingOccurrence ? (
                                    <>
                                        <RefreshCw size={16} className="animate-spin" />
                                        SALVANDO...
                                    </>
                                ) : (
                                    <>
                                        <Save size={16} />
                                        REGISTRAR E GERAR PDF
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

const CounterRow = ({ label, icon: Icon, value, onMinus, onPlus, customColor, max }: any) => (
    <div className="flex items-center justify-between group">
        <div className="flex items-center gap-2 text-gray-400 group-hover:text-gray-300">
            <Icon size={14} />
            <span className="text-xs font-medium truncate max-w-[70px]">{label}</span>
        </div>
        <div className="flex items-center gap-1">
            <button
                onClick={onMinus}
                disabled={value <= 0}
                className="w-6 h-6 flex items-center justify-center rounded-md bg-[#1e293b] text-gray-400 hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-30"
            >
                -
            </button>
            <div className={`w-6 text-center font-bold text-sm ${customColor || (value > 0 ? 'text-emerald-400' : 'text-gray-500')}`}>
                {value}
            </div>
            <button
                onClick={onPlus}
                disabled={value >= (max || 99)}
                className="w-6 h-6 flex items-center justify-center rounded-md bg-[#1e293b] text-gray-400 hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-30"
            >
                +
            </button>
        </div>
    </div>
);
