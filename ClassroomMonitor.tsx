
import React, { useState, useEffect, useRef } from 'react';
import { Student, ClassSession, SessionRecord, Counters, Teacher, ClassRoom, UserRole } from './types';
import { StorageService } from './services/storageService';
import { SupabaseService } from './services/supabaseService';
import {
    MessageSquare, Moon, Smartphone, Book,
    Zap, Save, RefreshCw, Check, X,
    MoreVertical, Search, Bell, AlertCircle, Clock, ChevronDown, Calendar, FileText, Hand, Plus, Camera, Trash2, BookOpen, History, ArrowRight, Upload
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface ClassroomMonitorProps {
    onShowToast: (msg: string) => void;
    userEmail?: string;
    userRole?: UserRole;
}

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
    const [selectedBlocks, setSelectedBlocks] = useState<string[]>([MORNING_BLOCKS[0]]);
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
    const [classTopic, setClassTopic] = useState(''); // General Notes
    const [classHomework, setClassHomework] = useState('');
    const [classPhotos, setClassPhotos] = useState<string[]>([]);

    // Camera State
    const [isCameraActive, setIsCameraActive] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const streamRef = useRef<MediaStream | null>(null);

    // --- Modal State for History (Load Previous) ---
    const [historyModalOpen, setHistoryModalOpen] = useState(false);
    const [historySessions, setHistorySessions] = useState<ClassSession[]>([]);

    // --- Unsaved Changes State ---
    const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
                const [loadedStudents, loadedTeachers, loadedClasses] = await Promise.all([
                    SupabaseService.getStudents(),
                    SupabaseService.getTeachers(),
                    SupabaseService.getClasses()
                ]);

                setAllStudents(loadedStudents);
                setTeachers(loadedTeachers);
                setAllClasses(loadedClasses);

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

                    if (availCls.length > 0) {
                        setSelectedClassId(availCls[0].name);
                    }
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

        // Auto-select first class if current selection is invalid
        if (availCls.length > 0) {
            if (!availCls.find(c => c.name === selectedClassId)) {
                setSelectedClassId(availCls[0].name);
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

            // 2. Update Subjects based on Teacher + Class Assignment
            let subjs: string[] = [];
            if (teacher.assignments && teacher.assignments.length > 0) {
                subjs = teacher.assignments
                    .filter(a => a.classId === selectedClassId)
                    .map(a => a.subject);
            }

            if (subjs.length === 0 && teacher.subject) {
                subjs = [teacher.subject];
            }

            subjs = [...new Set(subjs)];
            setAvailableSubjects(subjs);

            if (subjs.length > 0 && !subjs.includes(selectedSubject)) {
                setSelectedSubject(subjs[0]);
            } else if (subjs.length === 0) {
                setSelectedSubject('Geral');
            }
        }
    }, [selectedClassId, selectedTeacherId, allClasses, teachers]);

    // CORE LOGIC: Check for existing session whenever filters change
    useEffect(() => {
        if (selectedClassId && selectedTeacherId && selectedSubject && selectedDate) {
            const filtered = allStudents.filter(s => s.className === selectedClassId);
            setFilteredStudents(filtered);

            // Check Supabase for existing session for this Day/Class/Teacher/Subject combo
            const fetchExistingSession = async () => {
                const allSessions = await SupabaseService.getSessions();
                const existingSession = allSessions.find(s =>
                    s.date.startsWith(selectedDate) &&
                    s.className === selectedClassId &&
                    s.teacherId === selectedTeacherId &&
                    s.subject === selectedSubject
                );

                if (existingSession) {
                    setSession(existingSession);
                    if (existingSession.block && availableBlocks.includes(existingSession.block)) {
                        setSelectedBlocks([existingSession.block]);
                    }
                } else {
                    initializeSession(filtered);
                }
            };
            fetchExistingSession();
        }
    }, [selectedClassId, allStudents, selectedTeacherId, selectedSubject, selectedDate]); // Removed selectedBlocks dependency to avoid reset loop

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
        if (selectedBlocks.length === 0) return 'Selecione...';
        if (selectedBlocks.length === 1) return selectedBlocks[0];

        // Logic to merge "07h00 - 07h45" and "07h45 - 08h30" into "07h00 - 08h30"
        const start = selectedBlocks[0].split(' - ')[0];
        const end = selectedBlocks[selectedBlocks.length - 1].split(' - ')[1];
        return `${start} - ${end} (${selectedBlocks.length} aulas)`;
    };

    const initializeSession = (studentList: Student[]) => {
        // Generate label and count
        const compositeBlock = selectedBlocks.length > 1
            ? `${selectedBlocks[0].split(' - ')[0]} - ${selectedBlocks[selectedBlocks.length - 1].split(' - ')[1]}`
            : selectedBlocks[0];

        // Use selected date with current time to preserve ordering if needed, or just date
        const dateObj = new Date(selectedDate);
        // Add current time to the date so we don't default to midnight UTC issues in some views
        const now = new Date();
        dateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

        const newSession: ClassSession = {
            id: `sess-${Date.now()}`,
            date: dateObj.toISOString(),
            teacherId: selectedTeacherId,
            subject: selectedSubject,
            className: selectedClassId,
            block: compositeBlock,
            blocksCount: selectedBlocks.length,
            records: studentList.map(s => ({
                studentId: s.id,
                present: true,
                phoneConfiscated: false,
                justifiedAbsence: false,
                // Material starts at 1. Activity starts at 3. Homework starts at 1 (Done). Participation starts at 0.
                counters: { talk: 0, bathroom: 0, sleep: 0, material: 1, activity: 3, homework: 1, participation: 0 },
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
        setSession({ ...session, records: newRecords });
        setHasUnsavedChanges(true); // Mark as dirty
    };

    const handleCounter = (studentId: string, type: keyof Counters, delta: number) => {
        updateRecord(studentId, (record) => {
            const currentVal = record.counters[type] || 0;
            let newVal = currentVal + delta;

            // Apply Constraints based on rules
            if (type === 'material' || type === 'homework' || type === 'participation') {
                newVal = Math.max(0, Math.min(1, newVal)); // 0 or 1 for Toggles
            } else {
                newVal = Math.max(0, Math.min(3, newVal)); // 0 to 3 for others
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

    const handleSaveClassInfo = async () => {
        if (session) {
            const updatedSession = {
                ...session,
                generalNotes: classTopic,
                homework: classHomework,
                photos: classPhotos
            };
            setSession(updatedSession);
            const success = await SupabaseService.saveSession(updatedSession, userEmail);
            if (success) {
                onShowToast("Conteúdo de aula salvo no Supabase!");
                setHasUnsavedChanges(false); // Saved successfully
            } else {
                onShowToast("Aviso: Falha ao salvar no servidor. Verifique sua conexão.");
                // Backup save to Storage anyway
                StorageService.saveSession(updatedSession);
                setHasUnsavedChanges(false); // Consider saved locally
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

    // --- Load Previous (History) Logic ---

    const handleOpenHistory = async () => {
        const all = await SupabaseService.getSessions();
        const history = all.filter(s => s.teacherId === selectedTeacherId)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setHistorySessions(history);
        setHistoryModalOpen(true);
    };

    const handleLoadSession = (sess: ClassSession) => {
        // Set the filters to match the session, this will trigger the useEffect to load it
        setSelectedDate(sess.date.split('T')[0]);
        setSelectedClassId(sess.className);
        setSelectedSubject(sess.subject);
        setHistoryModalOpen(false);
        setHasUnsavedChanges(false); // Loading a session resets dirty state
        onShowToast(`Aula de ${format(new Date(sess.date), "dd/MM")} carregada.`);
    };

    // --- Confirmation Helper ---
    const checkUnsavedAndProceed = async (callback: () => void) => {
        if (hasUnsavedChanges) {
            const shouldSave = window.confirm("Você tem alterações não salvas nesta turma. Deseja SALVAR antes de prosseguir?");
            if (shouldSave) {
                await handleSave();
            } else {
                const proceedAnyway = window.confirm("Deseja realmente prosseguir SEM SALVAR as alterações atuais?");
                if (!proceedAnyway) return;
            }
        }
        setHasUnsavedChanges(false);
        callback();
    };

    // --- New Class Logic ---

    const handleNewClass = () => {
        checkUnsavedAndProceed(() => {
            if (session) {
                StorageService.saveSession(session);
                onShowToast("Iniciando novo registro...");

                // Reset Class Selection to force user to pick a new one, triggering initialization
                setSelectedClassId('');
                // Optional: Reset date to today if it was set to past
                setSelectedDate(new Date().toISOString().split('T')[0]);
            }
        });
    };

    // --- Main Save ---

    const handleSave = async () => {
        if (session) {
            const success = await SupabaseService.saveSession(session, userEmail);
            if (success) {
                onShowToast("Aula salva no Supabase com sucesso!");
                setHasUnsavedChanges(false);
            } else {
                onShowToast("Erro ao salvar no Supabase. Salvando localmente como backup.");
                StorageService.saveSession(session);
                setHasUnsavedChanges(false);
            }
        }
    };

    if (!session) return <div className="text-white p-6">Carregando dados... Certifique-se de que há turmas e alunos cadastrados.</div>;

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 pb-40 lg:pb-24">
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
                            {availableClasses.length === 0 && <option value="">Sem turmas</option>}
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
                            {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="flex flex-col relative" ref={timeDropdownRef}>
                        <label className="text-[10px] text-gray-500 font-bold uppercase mb-1">Horário(s)</label>
                        <button
                            onClick={() => setIsTimeDropdownOpen(!isTimeDropdownOpen)}
                            className="bg-[#1e293b] text-white text-sm border border-gray-700 rounded-lg p-2 outline-none focus:border-emerald-500 min-w-[180px] flex justify-between items-center text-left"
                        >
                            <span className="truncate">{getCompositeBlockLabel()}</span>
                            <ChevronDown size={14} className="text-gray-400" />
                        </button>
                        {isTimeDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 w-64 bg-[#1e293b] border border-gray-700 rounded-lg shadow-xl z-50 p-2 max-h-64 overflow-y-auto">
                                {availableBlocks.map(block => (
                                    <div
                                        key={block}
                                        onClick={() => toggleBlock(block)}
                                        className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm ${selectedBlocks.includes(block) ? 'bg-emerald-500/20 text-emerald-400' : 'text-gray-300 hover:bg-gray-700'}`}
                                    >
                                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedBlocks.includes(block) ? 'bg-emerald-500 border-emerald-500' : 'border-gray-500'}`}>
                                            {selectedBlocks.includes(block) && <Check size={10} className="text-[#0f172a]" />}
                                        </div>
                                        {block}
                                    </div>
                                ))}
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
            {filteredStudents.length === 0 ? (
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
                                            <img src={student.photoUrl} alt={student.name} className="w-12 h-12 rounded-full object-cover ring-2 ring-gray-700" />
                                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#0f172a] ${record.present ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-gray-100 text-sm">{student.name}</h3>
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
                                            {/* Logic: NÃO means No Phone (Good/Green), SIM means Has Phone (Bad/Red) */}
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

                                    <CounterRow
                                        label="Conversa"
                                        icon={MessageSquare}
                                        value={record.counters.talk}
                                        max={3}
                                        onMinus={() => handleCounter(student.id, 'talk', -1)}
                                        onPlus={() => handleCounter(student.id, 'talk', 1)}
                                    />
                                    <CounterRow
                                        label="Banheiro"
                                        icon={AlertCircle}
                                        value={record.counters.bathroom}
                                        max={3}
                                        onMinus={() => handleCounter(student.id, 'bathroom', -1)}
                                        onPlus={() => handleCounter(student.id, 'bathroom', 1)}
                                    />
                                    <CounterRow
                                        label="Dormir"
                                        icon={Moon}
                                        value={record.counters.sleep}
                                        max={3}
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
                                            max={1}
                                            // Participation: 1 is Good
                                            customColor={record.counters.participation > 0 ? 'text-emerald-400' : 'text-gray-500'}
                                            onMinus={() => handleCounter(student.id, 'participation', -1)}
                                            onPlus={() => handleCounter(student.id, 'participation', 1)}
                                        />
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Floating Action Bar */}
            <div className="fixed bottom-0 left-0 lg:left-72 right-0 bg-[#0f172a]/95 backdrop-blur-md border-t border-gray-800 p-4 z-30 px-4 sm:px-6">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 max-w-[1600px] mx-auto">
                    <div className="flex flex-wrap gap-2 w-full md:w-auto justify-center sm:justify-start">
                        <button
                            onClick={handleOpenHistory}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors font-medium text-sm"
                        >
                            <History size={18} />
                            Carregar Anterior
                        </button>
                        <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors font-medium text-sm">
                            <X size={18} />
                            Limpar Notas
                        </button>
                        <button
                            onClick={() => initializeSession(filteredStudents)}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg border border-gray-700 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors font-medium text-sm"
                        >
                            <RefreshCw size={18} />
                            Zerar Contadores
                        </button>
                    </div>

                    <div className="flex flex-wrap gap-2 w-full md:w-auto justify-center sm:justify-end">
                        {/* New Class Register Button */}
                        <button
                            onClick={() => setClassModalOpen(true)}
                            className="flex-1 sm:flex-none min-w-[140px] px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-lg font-bold transition-colors flex items-center justify-center gap-2 text-sm"
                        >
                            <Plus size={18} />
                            Registrar Conteúdo
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
                            Salvar
                        </button>
                    </div>
                </div>
            </div>

            {/* Student Observation & Photo Modal */}
            {obsModalOpen && (
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
            )}

            {/* Class Register Modal (General Content + Board Photo) */}
            {classModalOpen && (
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
                                            <span className="text-white font-bold">{selectedSubject}</span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Conteúdo Ministrado</label>
                                        <textarea
                                            value={classTopic}
                                            onChange={(e) => setClassTopic(e.target.value)}
                                            className="w-full h-24 bg-[#0f172a] border border-gray-700 rounded-lg p-3 text-white placeholder-gray-600 outline-none focus:border-blue-500"
                                            placeholder="Descreva o assunto abordado na aula de hoje..."
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
            )}

            {/* History Modal (unchanged) */}
            {historyModalOpen && (
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
                            ) : (
                                <div className="space-y-2">
                                    {historySessions.map(sess => (
                                        <div
                                            key={sess.id}
                                            onClick={() => handleLoadSession(sess)}
                                            className="bg-[#0f172a] border border-gray-800 p-4 rounded-lg cursor-pointer hover:border-emerald-500/50 transition-colors group flex items-center justify-between"
                                        >
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={14} className="text-emerald-500" />
                                                    <span className="font-bold text-white text-sm">
                                                        {format(new Date(sess.date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                                                    </span>
                                                </div>
                                                <div className="flex gap-4 text-xs text-gray-400 ml-6">
                                                    <span>Turma: <strong className="text-gray-300">{sess.className}</strong></span>
                                                    <span>•</span>
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
                                            <ArrowRight size={18} className="text-gray-600 group-hover:text-emerald-500 transition-colors" />
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

        </div>
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
