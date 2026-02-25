import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { SupabaseService } from './services/supabaseService';
import { StorageService } from './services/storageService';
import { PDFService } from './services/pdfService';
import { generateFOADataForStudent } from './services/foaDataHelper';
import { MessageItem, UserRole, ClassSession, Student, StudyGuideItem, Teacher, Occurrence } from './types';
import {
    Send, Mail, Trash2, Users, User, UserCheck,
    BookOpen, FileText, PlusCircle, X, ChevronDown,
    GraduationCap, MessageSquare, Filter, Camera,
    Calendar, ClipboardList, BarChart3, CheckCircle,
    Download, AlertCircle, Image as ImageIcon, Search,
    UsersRound, Loader2
} from 'lucide-react';

interface ComunicadosProps {
    onShowToast: (msg: string) => void;
    userEmail?: string;
    userName?: string;
    userRole?: string;
}

export const Comunicados: React.FC<ComunicadosProps> = ({ onShowToast, userEmail, userName, userRole }) => {
    const [messages, setMessages] = useState<MessageItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCompose, setShowCompose] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'students' | 'parents' | 'both' | 'coordinator' | 'unread'>('all');
    const [classes, setClasses] = useState<string[]>([]);

    // Compose state
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [recipients, setRecipients] = useState<'students' | 'parents' | 'both' | 'coordinator' | 'individual_student' | 'individual_parent'>('students');
    const [targetClass, setTargetClass] = useState('');
    const [attachmentType, setAttachmentType] = useState('');
    const [sending, setSending] = useState(false);

    // Smart linked data state
    const [sessions, setSessions] = useState<ClassSession[]>([]);
    const [studyGuides, setStudyGuides] = useState<StudyGuideItem[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
    const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
    const [allSessions, setAllSessions] = useState<ClassSession[]>([]);
    const [allOccurrences, setAllOccurrences] = useState<Occurrence[]>([]);
    const [selectedSession, setSelectedSession] = useState<ClassSession | null>(null);
    const [selectedGuide, setSelectedGuide] = useState<StudyGuideItem | null>(null);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [selectedOccurrence, setSelectedOccurrence] = useState<any | null>(null);
    const [foaBimestre, setFoaBimestre] = useState<number>(1);
    const [directImages, setDirectImages] = useState<string[]>([]);
    const [loadingLinked, setLoadingLinked] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [massSending, setMassSending] = useState(false);
    const [massSendProgress, setMassSendProgress] = useState({ current: 0, total: 0 });

    // Student/Parent info
    const [myClassName, setMyClassName] = useState('');

    const isReadOnly = userRole === 'student' || userRole === 'parent' || userRole === 'STUDENT' || userRole === 'PARENT';

    useEffect(() => {
        loadMessages();
        loadClasses();
        loadSharedData();
        if (isReadOnly && userEmail) {
            loadMyClass();
        }
    }, []);

    const loadMessages = async () => {
        setLoading(true);
        const data = await SupabaseService.getMessages();
        setMessages(data);
        setLoading(false);
    };

    const loadClasses = async () => {
        const cls = await SupabaseService.getClasses();
        setClasses(cls.map(c => c.name));
    };

    const loadMyClass = async () => {
        const allStudents = await SupabaseService.getStudents();
        const me = allStudents.find(s => s.parentEmail === userEmail || s.name === userName);
        if (me) setMyClassName(me.className);
    };

    const loadSharedData = async () => {
        const [teachers, sessions, occurrences] = await Promise.all([
            SupabaseService.getTeachers(),
            SupabaseService.getSessions(),
            SupabaseService.getOccurrences()
        ]);
        setAllTeachers(teachers);
        setAllSessions(sessions);
        setAllOccurrences(occurrences);
    };

    // Load linked data when attachment type or class changes
    useEffect(() => {
        if (!attachmentType || !targetClass) {
            setSessions([]);
            setStudyGuides([]);
            setStudents([]);
            return;
        }
        loadLinkedData();
    }, [attachmentType, targetClass]);

    const loadLinkedData = async () => {
        setLoadingLinked(true);
        setSelectedSession(null);
        setSelectedGuide(null);
        setSelectedStudent(null);
        setSelectedOccurrence(null);

        if (attachmentType === 'registro_aula') {
            const allSessions = await SupabaseService.getSessions();
            const filtered = allSessions.filter(s => s.className === targetClass && s.teacherId);
            setSessions(filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
        } else if (attachmentType === 'roteiro_estudos') {
            const allGuides = await SupabaseService.getStudyGuideItems();
            const filtered = allGuides.filter(g => {
                const mod = g.module;
                return mod && mod.classId === targetClass;
            });
            setStudyGuides(filtered);
        } else if (attachmentType === 'relatorio_aluno' || attachmentType === 'foa') {
            const allStudents = await SupabaseService.getStudents();
            const filtered = allStudents.filter(s => s.className === targetClass);
            setStudents(filtered);
            setRecipients(attachmentType === 'foa' ? 'individual_parent' : 'parents');
        } else if (attachmentType === 'ocorrencia') {
            const allOccurrences = await SupabaseService.getOccurrences();
            const allStudents = await SupabaseService.getStudents();
            const classStudents = allStudents.filter(s => s.className === targetClass);
            const classStudentIds = classStudents.map(s => s.id);

            const filtered = allOccurrences.filter(occ =>
                occ.studentIds.some(id => classStudentIds.includes(id))
            );
            setOccurrences(filtered.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            setRecipients('individual_parent');
        }
        setLoadingLinked(false);
    };

    const buildAttachmentData = () => {
        if (attachmentType === 'registro_aula' && selectedSession) {
            return {
                type: 'registro_aula',
                sessionId: selectedSession.id,
                date: selectedSession.date,
                className: selectedSession.className,
                subject: selectedSession.subject,
                block: selectedSession.block,
                generalNotes: selectedSession.generalNotes,
                homework: selectedSession.homework,
                photos: selectedSession.photos || []
            };
        }
        if (attachmentType === 'roteiro_estudos' && selectedGuide) {
            return {
                type: 'roteiro_estudos',
                guideId: selectedGuide.id,
                examType: selectedGuide.examType,
                bimestre: selectedGuide.bimestre,
                orientation: selectedGuide.orientation,
                module: selectedGuide.module ? {
                    title: selectedGuide.module.title,
                    topic: selectedGuide.module.topic,
                    chapter: selectedGuide.module.chapter,
                    front: selectedGuide.module.front,
                    disciplineId: selectedGuide.module.disciplineId
                } : null
            };
        }
        if (attachmentType === 'relatorio_aluno' && selectedStudent) {
            // Generate real report data
            const filteredSessions = allSessions.filter(s => s.className === selectedStudent.className);
            const chartData = filteredSessions
                .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                .map(session => {
                    const studentRecord = session.records.find(r => r.studentId === selectedStudent.id);
                    const studentGrade = studentRecord ? StorageService.calculateGrade(studentRecord) : null;
                    const classTotal = session.records.reduce((acc, r) => acc + StorageService.calculateGrade(r), 0);
                    const classAvg = session.records.length > 0 ? classTotal / session.records.length : 0;
                    return {
                        date: format(new Date(session.date), 'dd/MM', { locale: ptBR }),
                        aluno: studentGrade,
                        mediaTurma: parseFloat(classAvg.toFixed(1)),
                        teacherName: session.teacherName
                    };
                })
                .filter(d => d.aluno !== null);

            const avgGrade = chartData.length > 0
                ? (chartData.reduce((acc, d) => acc + (d.aluno || 0), 0) / chartData.length).toFixed(1)
                : '0.0';

            return {
                type: 'relatorio_aluno',
                studentId: selectedStudent.id,
                studentName: selectedStudent.name,
                className: selectedStudent.className,
                avgGrade,
                totalClasses: filteredSessions.length,
                chartData
            };
        }
        if (attachmentType === 'foa' && selectedStudent) {
            // Generate real FOA data
            const year = new Date().getFullYear();
            const { rows, observations } = generateFOADataForStudent(
                selectedStudent.id, selectedStudent.className, year, allSessions, allTeachers, allOccurrences
            );
            return {
                type: 'foa',
                studentId: selectedStudent.id,
                studentName: selectedStudent.name,
                className: selectedStudent.className,
                bimestre: foaBimestre,
                year,
                rows,
                observations
            };
        }
        if (attachmentType === 'ocorrencia' && selectedOccurrence) {
            return {
                type: 'ocorrencia',
                occurrenceId: selectedOccurrence.id,
                studentName: selectedStudent?.name || 'Aluno',
                className: targetClass || selectedOccurrence.className || 'Turma',
                description: selectedOccurrence.description,
                typeLabel: selectedOccurrence.type,
                date: selectedOccurrence.date,
                photos: selectedOccurrence.photos || []
            };
        }
        return null;
    };

    const handleSelectSession = (sess: ClassSession) => {
        setSelectedSession(sess);
        setSubject(`Registro de Aula — ${sess.subject} (${format(new Date(sess.date), "dd/MM/yyyy")})`);
        const parts: string[] = [];
        if (sess.generalNotes) parts.push(`📚 CONTEÚDO MINISTRADO:\n${sess.generalNotes}`);
        if (sess.homework) parts.push(`📝 LIÇÃO DE CASA / ATIVIDADE:\n${sess.homework}`);
        if (sess.photos && sess.photos.length > 0) parts.push(`📷 ${sess.photos.length} foto(s) da lousa/quadro anexada(s).`);
        setBody(parts.join('\n\n'));
    };

    const handleSelectGuide = (guide: StudyGuideItem) => {
        setSelectedGuide(guide);
        const mod = guide.module;
        const examLabel = guide.examType === 'P1' ? 'P1' : guide.examType === 'P2' ? 'P2' : guide.examType === 'SUBSTITUTIVA' ? 'Substitutiva' : 'Recuperação';
        setSubject(`Roteiro de Estudos — ${examLabel} (${guide.bimestre}º Bimestre)`);
        const parts: string[] = [];
        if (mod) {
            parts.push(`📖 ${mod.title}`);
            parts.push(`Capítulo: ${mod.chapter} | Módulo: ${mod.module}`);
            parts.push(`Tópico: ${mod.topic}`);
            if (mod.front) parts.push(`Frente: ${mod.front}`);
        }
        if (guide.orientation) parts.push(`\n📋 ORIENTAÇÕES:\n${guide.orientation}`);
        setBody(parts.join('\n'));
    };

    const handleSelectStudent = (student: Student) => {
        setSelectedStudent(student);
        if (attachmentType === 'foa') {
            setSubject(`Ficha de Observação (FOA) — ${student.name}`);
            setBody(`Prezado(a) responsável,\n\nSegue a Ficha de Observação do Aluno (FOA) referente ao ${foaBimestre}º Bimestre do(a) aluno(a) ${student.name}.\n\nA FOA contém o detalhamento do comportamento, engajamento e desempenho nas disciplinas.\n\nAtenciosamente,\n${userName || 'Coordenação'}`);
        } else {
            setSubject(`Relatório do Aluno — ${student.name}`);
            setBody(`Prezado(a) responsável,\n\nSegue o relatório detalhado do(a) aluno(a) ${student.name} (${student.className}).\n\nO relatório contém informações sobre presença, desempenho e observações dos professores.\n\nAtenciosamente,\n${userName || 'Coordenação'}`);
        }
    };

    const handleSelectOccurrence = (occ: any) => {
        setSelectedOccurrence(occ);
        setSubject(`Comunicado de Ocorrência — ${format(new Date(occ.date), "dd/MM/yyyy")}`);
        setBody(`Informamos que houve um registro de ocorrência do tipo [${occ.type}] relacionado ao aluno.\n\nDescrição: ${occ.description}\n\nPara mais detalhes, veja o anexo abaixo.\n\nAtenciosamente,\n${userName || 'Coordenação'}`);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.files || e.target.files.length === 0) return;
        setUploading(true);
        const file = e.target.files[0];
        const url = await SupabaseService.uploadPhoto(file, 'communications');
        if (url) {
            setDirectImages([...directImages, url]);
            onShowToast("Foto anexada com sucesso!");
        } else {
            onShowToast("Erro ao fazer upload da foto.");
        }
        setUploading(false);
    };

    const removeDirectImage = (index: number) => {
        setDirectImages(directImages.filter((_, i) => i !== index));
    };

    const handleSend = async () => {
        if (!subject.trim() || !body.trim()) {
            onShowToast("Preencha o assunto e a mensagem.");
            return;
        }
        setSending(true);
        try {
            const attachData = buildAttachmentData();
            // Auto-set recipients to parents for FOA/Report
            const effectiveRecipients = (attachmentType === 'foa' || attachmentType === 'relatorio_aluno')
                ? 'parents' : recipients;

            console.log('📤 Enviando mensagem:', { attachmentType, effectiveRecipients, hasAttachData: !!attachData, studentId: selectedStudent?.id });

            const success = await SupabaseService.createMessage({
                senderName: userName || userEmail || 'Usuário',
                senderEmail: userEmail,
                senderRole: userRole || 'teacher',
                subject: subject.trim(),
                body: body.trim(),
                recipients: effectiveRecipients,
                targetClass: targetClass || undefined,
                targetStudentId: selectedStudent?.id || selectedOccurrence?.studentIds?.[0] || undefined,
                attachmentType: attachmentType || undefined,
                attachmentData: attachData,
                directImages: directImages
            });
            setSending(false);
            if (success) {
                onShowToast("✅ Mensagem enviada com sucesso!");
                setShowCompose(false);
                resetCompose();
                loadMessages();
            } else {
                onShowToast("Erro ao enviar mensagem. Verifique os dados.");
            }
        } catch (err) {
            console.error('❌ Erro no handleSend:', err);
            setSending(false);
            onShowToast("Erro inesperado ao processar o envio.");
        }
    };

    const resetCompose = () => {
        setSubject('');
        setBody('');
        setRecipients('students');
        setTargetClass('');
        setAttachmentType('');
        setSelectedSession(null);
        setSelectedGuide(null);
        setSelectedStudent(null);
        setSelectedOccurrence(null);
        setDirectImages([]);
    };

    // === MASS SEND: Send FOA or Report individually to each parent ===
    const handleMassSend = async () => {
        if (!targetClass || !attachmentType) return;
        if (attachmentType !== 'foa' && attachmentType !== 'relatorio_aluno') {
            onShowToast("Envio em massa disponível apenas para FOA e Relatório.");
            return;
        }

        const classStudents = students.length > 0
            ? students
            : (await SupabaseService.getStudents()).filter(s => s.className === targetClass);

        if (classStudents.length === 0) {
            onShowToast("Nenhum aluno encontrado nesta turma.");
            return;
        }

        if (!window.confirm(`Enviar ${attachmentType === 'foa' ? 'FOA' : 'Relatório'} individualmente para os ${classStudents.length} responsáveis da turma ${targetClass}?`)) return;

        setMassSending(true);
        setMassSendProgress({ current: 0, total: classStudents.length });
        let successCount = 0;
        const year = new Date().getFullYear();

        for (let i = 0; i < classStudents.length; i++) {
            const student = classStudents[i];
            setMassSendProgress({ current: i + 1, total: classStudents.length });

            let attachData: any = null;
            let msgSubject = '';
            let msgBody = '';

            if (attachmentType === 'foa') {
                // Generate real FOA data for this student
                const { rows, observations } = generateFOADataForStudent(
                    student.id, targetClass, year, allSessions, allTeachers, allOccurrences
                );
                attachData = {
                    type: 'foa',
                    studentId: student.id,
                    studentName: student.name,
                    className: targetClass,
                    bimestre: foaBimestre,
                    year,
                    rows,
                    observations
                };
                msgSubject = `Ficha de Observação (FOA) — ${student.name}`;
                msgBody = `Prezado(a) responsável,\n\nSegue a Ficha de Observação do Aluno (FOA) referente ao ${foaBimestre}º Bimestre do(a) aluno(a) ${student.name}.\n\nA FOA contém o detalhamento do comportamento, engajamento e desempenho nas disciplinas.\n\nAtenciosamente,\n${userName || 'Coordenação'}`;
            } else {
                // Generate real Report data for this student
                const filteredSessions = allSessions.filter(s => s.className === targetClass);
                const chartData = filteredSessions
                    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                    .map(session => {
                        const studentRecord = session.records.find(r => r.studentId === student.id);
                        const studentGrade = studentRecord ? StorageService.calculateGrade(studentRecord) : null;
                        const classTotal = session.records.reduce((acc, r) => acc + StorageService.calculateGrade(r), 0);
                        const classAvg = session.records.length > 0 ? classTotal / session.records.length : 0;
                        return {
                            date: format(new Date(session.date), 'dd/MM', { locale: ptBR }),
                            aluno: studentGrade,
                            mediaTurma: parseFloat(classAvg.toFixed(1)),
                            teacherName: session.teacherName
                        };
                    })
                    .filter(d => d.aluno !== null);

                const avgGrade = chartData.length > 0
                    ? (chartData.reduce((acc, d) => acc + (d.aluno || 0), 0) / chartData.length).toFixed(1)
                    : '0.0';
                const totalClasses = filteredSessions.length;

                attachData = {
                    type: 'relatorio_aluno',
                    studentId: student.id,
                    studentName: student.name,
                    className: targetClass,
                    avgGrade,
                    totalClasses,
                    chartData
                };
                msgSubject = `Relatório do Aluno — ${student.name}`;
                msgBody = `Prezado(a) responsável,\n\nSegue o relatório detalhado do(a) aluno(a) ${student.name} (${targetClass}).\n\nO relatório contém informações sobre presença, desempenho e observações dos professores.\n\nAtenciosamente,\n${userName || 'Coordenação'}`;
            }

            const success = await SupabaseService.createMessage({
                senderName: userName || userEmail || 'Coordenação',
                senderEmail: userEmail,
                senderRole: userRole || 'coordinator',
                subject: msgSubject,
                body: msgBody,
                recipients: 'individual_parent' as any,
                targetClass,
                targetStudentId: student.id,
                attachmentType,
                attachmentData: attachData,
                directImages: []
            });

            if (success) successCount++;
        }

        setMassSending(false);
        onShowToast(`✅ Envio em massa concluído: ${successCount}/${classStudents.length} mensagens enviadas.`);
        setShowCompose(false);
        resetCompose();
        loadMessages();
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Excluir esta mensagem?")) return;
        const ok = await SupabaseService.deleteMessage(id);
        if (ok) { onShowToast("Mensagem excluída."); loadMessages(); }
    };

    const getRecipientLabel = (r: string) => {
        switch (r) {
            case 'students': return 'Alunos';
            case 'parents': return 'Pais / Responsáveis';
            case 'both': return 'Alunos e Pais';
            case 'coordinator': return 'Coordenação';
            case 'individual_student': return 'Aluno Individual';
            case 'individual_parent': return 'Responsável Individual';
            default: return r;
        }
    };

    const getRecipientIcon = (r: string) => {
        switch (r) {
            case 'students': return GraduationCap;
            case 'parents': return Users;
            case 'both': return UserCheck;
            case 'coordinator': return User;
            case 'individual_student': return User;
            case 'individual_parent': return UserCheck;
            default: return Users;
        }
    };

    const getRecipientColor = (r: string) => {
        switch (r) {
            case 'students': return 'text-blue-400 bg-blue-500/10';
            case 'parents': return 'text-purple-400 bg-purple-500/10';
            case 'both': return 'text-emerald-400 bg-emerald-500/10';
            case 'coordinator': return 'text-amber-400 bg-amber-500/10';
            case 'individual_student': return 'text-blue-300 bg-blue-500/5';
            case 'individual_parent': return 'text-purple-300 bg-purple-500/5';
            default: return 'text-gray-400 bg-gray-500/10';
        }
    };

    const getAttachLabel = (t: string) => {
        switch (t) {
            case 'registro_aula': return 'Registro de Aula';
            case 'roteiro_estudos': return 'Roteiro de Estudos';
            case 'relatorio_aluno': return 'Relatório do Aluno';
            case 'foa': return 'FOA';
            case 'ocorrencia': return 'Ocorrência';
            default: return t;
        }
    };

    // Filter messages for students/parents by their class
    const filteredMessages = (() => {
        let msgs = messages;
        if (isReadOnly && myClassName) {
            msgs = msgs.filter(m => !m.targetClass || m.targetClass === myClassName);
        }
        if (filter !== 'all') {
            msgs = msgs.filter(m => m.recipients === filter);
        }
        return msgs;
    })();

    // ----- RENDER -----

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                            <MessageSquare className="text-blue-400" size={22} />
                        </div>
                        Comunicados
                    </h2>
                    <p className="text-gray-500 text-sm mt-1 ml-[52px]">
                        {isReadOnly ? 'Acompanhe os comunicados da escola' : 'Envie mensagens para alunos, pais e coordenação'}
                    </p>
                </div>
                {!isReadOnly && (
                    <button
                        onClick={() => setShowCompose(true)}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-500/20"
                    >
                        <PlusCircle size={18} />
                        Novo Comunicado
                    </button>
                )}
            </div>

            {/* ===== COMPOSE MODAL ===== */}
            {showCompose && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowCompose(false); resetCompose(); }}>
                    <div className="bg-[#0f172a] border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-800">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Send size={18} className="text-blue-400" /> Novo Comunicado
                            </h3>
                            <button onClick={() => { setShowCompose(false); resetCompose(); }} className="text-gray-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Recipients */}
                            <div>
                                <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Destinatários</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['students', 'parents', 'both', 'coordinator', 'individual_student', 'individual_parent'] as const).map(r => {
                                        const Icon = getRecipientIcon(r);
                                        return (
                                            <button key={r} onClick={() => setRecipients(r)}
                                                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all border ${recipients === r ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-gray-800 text-gray-500 hover:border-gray-600'}`}
                                            >
                                                <Icon size={14} />
                                                {getRecipientLabel(r)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Target Class */}
                            {recipients !== 'coordinator' && (
                                <div>
                                    <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Turma</label>
                                    <select value={targetClass} onChange={e => setTargetClass(e.target.value)}
                                        className="w-full bg-[#1e293b] text-white px-4 py-2.5 rounded-lg border border-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">Todas as turmas</option>
                                        {classes.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            )}

                            {/* Attachment Type */}
                            <div>
                                <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Tipo de Conteúdo</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { key: '', label: 'Texto Livre', icon: FileText },
                                        { key: 'registro_aula', label: 'Registro de Aula', icon: BookOpen },
                                        { key: 'roteiro_estudos', label: 'Roteiro de Estudos', icon: ClipboardList },
                                        { key: 'relatorio_aluno', label: 'Relatório do Aluno', icon: BarChart3 },
                                        { key: 'foa', label: 'FOA (Ficha Aluno)', icon: UserCheck },
                                        { key: 'ocorrencia', label: 'Ocorrência', icon: AlertCircle },
                                    ].map(opt => (
                                        <button key={opt.key} onClick={() => setAttachmentType(opt.key)}
                                            className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all border ${attachmentType === opt.key ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-gray-800 text-gray-500 hover:border-gray-600'}`}
                                        >
                                            <opt.icon size={14} />
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* ===== SMART LINKED DATA SELECTORS ===== */}

                            {/* Registro de Aula Selector */}
                            {attachmentType === 'registro_aula' && targetClass && (
                                <div>
                                    <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Selecionar Aula</label>
                                    {loadingLinked ? (
                                        <div className="text-center py-4"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
                                    ) : sessions.length === 0 ? (
                                        <p className="text-xs text-gray-600 italic">Nenhum registro de aula encontrado para esta turma.</p>
                                    ) : (
                                        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                                            {sessions.slice(0, 15).map(sess => (
                                                <button key={sess.id} onClick={() => handleSelectSession(sess)}
                                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all border ${selectedSession?.id === sess.id ? 'border-blue-500 bg-blue-500/10 text-blue-400' : 'border-gray-800 text-gray-400 hover:border-gray-600'}`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <Calendar size={12} className="text-emerald-500 shrink-0" />
                                                        <span className="font-bold text-white">{format(new Date(sess.date), "dd/MM/yyyy")}</span>
                                                        <span>•</span>
                                                        <span>{sess.subject}</span>
                                                        <span>•</span>
                                                        <span className="text-gray-500">{sess.block}</span>
                                                    </div>
                                                    {sess.generalNotes && <p className="mt-1 text-[10px] text-gray-500 line-clamp-1 ml-5">{sess.generalNotes}</p>}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Roteiro de Estudos Selector */}
                            {attachmentType === 'roteiro_estudos' && targetClass && (
                                <div>
                                    <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Selecionar Roteiro</label>
                                    {loadingLinked ? (
                                        <div className="text-center py-4"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
                                    ) : studyGuides.length === 0 ? (
                                        <p className="text-xs text-gray-600 italic">Nenhum roteiro encontrado para esta turma.</p>
                                    ) : (
                                        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                                            {studyGuides.map(guide => {
                                                const examLabel = guide.examType === 'P1' ? 'P1' : guide.examType === 'P2' ? 'P2' : guide.examType === 'SUBSTITUTIVA' ? 'Substitutiva' : 'Recuperação';
                                                return (
                                                    <button key={guide.id} onClick={() => handleSelectGuide(guide)}
                                                        className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all border ${selectedGuide?.id === guide.id ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-gray-800 text-gray-400 hover:border-gray-600'}`}
                                                    >
                                                        <div className="flex items-center gap-2">
                                                            <ClipboardList size={12} className="text-purple-500 shrink-0" />
                                                            <span className="font-bold text-white">{examLabel}</span>
                                                            <span>• {guide.bimestre}º Bim</span>
                                                        </div>
                                                        {guide.module && <p className="mt-1 text-[10px] text-gray-500 line-clamp-1 ml-5">{guide.module.title} — {guide.module.topic}</p>}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Relatório do Aluno / FOA Selector */}
                            {(attachmentType === 'relatorio_aluno' || attachmentType === 'foa') && targetClass && (
                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-xs text-gray-400 font-bold uppercase block">Selecionar Aluno</label>
                                        {attachmentType === 'foa' && (
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-gray-500 font-bold">BIMESTRE:</span>
                                                <select value={foaBimestre} onChange={e => setFoaBimestre(parseInt(e.target.value))}
                                                    className="bg-gray-800 text-white text-[10px] rounded px-1 border border-gray-700 outline-none"
                                                >
                                                    {[1, 2, 3, 4].map(b => <option key={b} value={b}>{b}º</option>)}
                                                </select>
                                            </div>
                                        )}
                                    </div>
                                    {loadingLinked ? (
                                        <div className="text-center py-4"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
                                    ) : students.length === 0 ? (
                                        <p className="text-xs text-gray-600 italic">Nenhum aluno encontrado para esta turma.</p>
                                    ) : (
                                        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                                            {students.map(student => (
                                                <button key={student.id} onClick={() => handleSelectStudent(student)}
                                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all border flex items-center gap-3 ${selectedStudent?.id === student.id ? 'border-purple-500 bg-purple-500/10 text-purple-400' : 'border-gray-800 text-gray-400 hover:border-gray-600'}`}
                                                >
                                                    {student.photoUrl ? (
                                                        <img src={student.photoUrl} className="w-7 h-7 rounded-full object-cover shrink-0" />
                                                    ) : (
                                                        <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-[10px] font-bold text-gray-400 shrink-0">
                                                            {student.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                                                        </div>
                                                    )}
                                                    <span className="font-medium text-white">{student.name}</span>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Ocorrência Selector */}
                            {attachmentType === 'ocorrencia' && targetClass && (
                                <div>
                                    <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Selecionar Ocorrência</label>
                                    {loadingLinked ? (
                                        <div className="text-center py-4"><div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div></div>
                                    ) : occurrences.length === 0 ? (
                                        <p className="text-xs text-gray-600 italic">Nenhuma ocorrência encontrada para esta turma.</p>
                                    ) : (
                                        <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1">
                                            {occurrences.map(occ => (
                                                <button key={occ.id} onClick={() => handleSelectOccurrence(occ)}
                                                    className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all border ${selectedOccurrence?.id === occ.id ? 'border-red-500 bg-red-500/10 text-red-400' : 'border-gray-800 text-gray-400 hover:border-gray-600'}`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <AlertCircle size={12} className="text-red-500 shrink-0" />
                                                        <span className="font-bold text-white">{format(new Date(occ.date), "dd/MM/yyyy")}</span>
                                                        <span className="px-1.5 py-0.5 bg-gray-800 text-[9px] rounded uppercase">{occ.type}</span>
                                                    </div>
                                                    <p className="mt-1 text-[10px] text-gray-500 line-clamp-1 ml-5">{occ.description}</p>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Prompt to select class first */}
                            {attachmentType && attachmentType !== '' && !targetClass && (
                                <div className="bg-amber-500/5 border border-amber-500/20 rounded-lg p-3 text-xs text-amber-400 flex items-center gap-2">
                                    <Filter size={14} />
                                    Selecione uma turma para carregar os dados disponíveis.
                                </div>
                            )}

                            {/* Subject */}
                            <div>
                                <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Assunto</label>
                                <input type="text" value={subject} onChange={e => setSubject(e.target.value)}
                                    placeholder="Ex: Lembrete de prova, Registro de aula..."
                                    className="w-full bg-[#1e293b] text-white px-4 py-2.5 rounded-lg border border-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* Body */}
                            <div>
                                <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Mensagem</label>
                                <textarea value={body} onChange={e => setBody(e.target.value)} rows={6}
                                    placeholder="Escreva sua mensagem aqui..."
                                    className="w-full bg-[#1e293b] text-white px-4 py-3 rounded-lg border border-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                />
                            </div>

                            {/* Direct Images Upload */}
                            <div>
                                <label className="text-xs text-gray-400 font-bold uppercase mb-2 block flex items-center justify-between">
                                    <span className="flex items-center gap-1"><ImageIcon size={12} /> Fotos Diretas</span>
                                    <span className="text-[10px] font-normal lowercase italic text-gray-500">Opcional</span>
                                </label>

                                <div className="flex flex-wrap gap-2 mb-3">
                                    {directImages.map((url, i) => (
                                        <div key={i} className="relative w-16 h-16 rounded-lg overflow-hidden border border-gray-700 group">
                                            <img src={url} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                                            <button onClick={() => removeDirectImage(i)}
                                                className="absolute top-0.5 right-0.5 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={10} />
                                            </button>
                                        </div>
                                    ))}
                                    <label className={`w-16 h-16 rounded-lg border-2 border-dashed border-gray-700 flex flex-col items-center justify-center gap-1 cursor-pointer hover:border-blue-500 transition-colors ${uploading ? 'opacity-50 pointer-events-none' : ''}`}>
                                        <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
                                        {uploading ? (
                                            <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                        ) : (
                                            <>
                                                <PlusCircle size={14} className="text-gray-500" />
                                                <span className="text-[9px] text-gray-500 font-bold">ADD</span>
                                            </>
                                        )}
                                    </label>
                                </div>
                            </div>

                            {/* Linked data preview */}
                            {(selectedSession || selectedOccurrence) && (
                                <div>
                                    <label className="text-xs text-gray-400 font-bold uppercase mb-2 block flex items-center gap-1">
                                        <Camera size={12} /> Fotos do Anexo
                                    </label>
                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                        {(selectedSession?.photos || selectedOccurrence?.photos || []).map((url: string, i: number) => (
                                            <img key={i} src={url} className="w-20 h-20 rounded-lg object-cover border border-gray-700 shrink-0" />
                                        ))}
                                        {(selectedSession?.photos || selectedOccurrence?.photos || []).length === 0 && (
                                            <span className="text-[10px] text-gray-600 italic">Nenhuma foto no registro original.</span>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Mass-send progress overlay */}
                        {massSending && (
                            <div className="p-4 bg-emerald-500/10 border-t border-emerald-500/20 flex items-center gap-3">
                                <Loader2 size={18} className="text-emerald-400 animate-spin" />
                                <div className="flex-1">
                                    <p className="text-emerald-400 text-xs font-bold">Enviando em massa...</p>
                                    <p className="text-emerald-300 text-[10px]">{massSendProgress.current} de {massSendProgress.total} mensagens</p>
                                </div>
                                <div className="w-24 bg-gray-800 rounded-full h-2">
                                    <div className="bg-emerald-500 rounded-full h-2 transition-all" style={{ width: `${(massSendProgress.current / massSendProgress.total) * 100}%` }}></div>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex gap-3 p-5 border-t border-gray-800">
                            <button onClick={() => { setShowCompose(false); resetCompose(); }}
                                className="px-4 py-2.5 bg-gray-800 text-gray-400 hover:text-white rounded-lg font-bold text-sm transition-colors"
                                disabled={massSending}
                            >
                                Cancelar
                            </button>

                            {/* Mass Send Button - visible for FOA/Relatório with class selected */}
                            {(attachmentType === 'foa' || attachmentType === 'relatorio_aluno') && targetClass && !selectedStudent && (
                                <button onClick={handleMassSend} disabled={massSending}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 text-white rounded-lg font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    <UsersRound size={16} />
                                    {massSending ? `${massSendProgress.current}/${massSendProgress.total}` : 'Enviar para Toda a Turma'}
                                </button>
                            )}

                            <button onClick={handleSend} disabled={sending || massSending || !subject.trim() || !body.trim()}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send size={16} />
                                {sending ? 'Enviando...' : 'Enviar Individual'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter Tabs */}
            {!isReadOnly && (
                <div className="flex gap-2 bg-[#0f172a] p-1.5 rounded-xl border border-gray-800 overflow-x-auto">
                    {([
                        { key: 'all', label: 'Todos', icon: Filter },
                        { key: 'students', label: 'Alunos', icon: GraduationCap },
                        { key: 'parents', label: 'Pais', icon: Users },
                        { key: 'both', label: 'Alunos + Pais', icon: UserCheck },
                        { key: 'coordinator', label: 'Coordenação', icon: User },
                    ] as const).map(tab => (
                        <button key={tab.key} onClick={() => setFilter(tab.key)}
                            className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filter === tab.key ? 'bg-gray-800 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                        >
                            <tab.icon size={13} />
                            {tab.label}
                        </button>
                    ))}
                    <button onClick={() => setFilter('unread')}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filter === 'unread' ? 'bg-blue-500 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                        <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                        Não Lidas
                    </button>
                </div>
            )}

            {/* Messages List */}
            {loading ? (
                <div className="text-center py-20">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 text-sm">Carregando comunicados...</p>
                </div>
            ) : filteredMessages.length === 0 ? (
                <div className="text-center py-20 bg-[#0f172a] rounded-2xl border border-gray-800">
                    <Mail className="mx-auto text-gray-700 mb-4" size={48} />
                    <p className="text-gray-500 font-medium">Nenhum comunicado encontrado</p>
                    {!isReadOnly && <p className="text-gray-600 text-sm mt-1">Clique em "Novo Comunicado" para enviar o primeiro</p>}
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredMessages.map(msg => {
                        const RecIcon = getRecipientIcon(msg.recipients);
                        const isExpanded = expandedId === msg.id;
                        const att = msg.attachmentData;

                        return (
                            <div key={msg.id}
                                className={`bg-[#0f172a] border border-gray-800 rounded-xl overflow-hidden transition-all hover:border-gray-700 ${isExpanded ? 'shadow-lg shadow-blue-500/5' : ''}`}
                            >
                                {/* Message Header */}
                                <button onClick={() => {
                                    setExpandedId(isExpanded ? null : msg.id);
                                    if (!isExpanded && !msg.isRead) {
                                        SupabaseService.markMessageRead(msg.id);
                                        // Update local state to reflect read immediately
                                        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, isRead: true } : m));
                                    }
                                }}
                                    className="w-full p-4 flex items-center gap-3 text-left relative"
                                >
                                    {!msg.isRead && (
                                        <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" />
                                    )}
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${getRecipientColor(msg.recipients)}`}>
                                        <RecIcon size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            <span className="text-white font-bold text-sm truncate">{msg.subject}</span>
                                            {msg.attachmentType && (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded font-bold uppercase shrink-0">
                                                    {getAttachLabel(msg.attachmentType)}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                                            <span>{msg.senderName}</span>
                                            <span>•</span>
                                            <span>{getRecipientLabel(msg.recipients)}</span>
                                            {msg.targetClass && (<><span>•</span><span className="text-gray-400">{msg.targetClass}</span></>)}
                                            <span>•</span>
                                            <span>{format(new Date(msg.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                                        </div>
                                    </div>
                                    <ChevronDown size={16} className={`text-gray-500 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Expanded Body */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 border-t border-gray-800/50">
                                        <div className="pt-4 text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                                            {msg.body}
                                        </div>

                                        {/* Rich Attachment Preview */}
                                        {att && att.type === 'registro_aula' && (
                                            <div className="mt-4 bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 space-y-3">
                                                <div className="flex items-center gap-2 text-blue-400 text-xs font-bold uppercase">
                                                    <BookOpen size={14} />
                                                    Registro de Aula — {att.subject} ({format(new Date(att.date), "dd/MM/yyyy")})
                                                </div>
                                                {att.generalNotes && (
                                                    <div>
                                                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Conteúdo Ministrado</p>
                                                        <p className="text-sm text-gray-300">{att.generalNotes}</p>
                                                    </div>
                                                )}
                                                {att.homework && (
                                                    <div>
                                                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Lição de Casa / Atividade</p>
                                                        <p className="text-sm text-gray-300">{att.homework}</p>
                                                    </div>
                                                )}
                                                {att.photos && att.photos.length > 0 && (
                                                    <div>
                                                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-2">Fotos da Lousa</p>
                                                        <div className="flex gap-2 overflow-x-auto pb-1">
                                                            {att.photos.map((url: string, i: number) => (
                                                                <img key={i} src={url} className="w-28 h-28 rounded-lg object-cover border border-gray-700 shrink-0 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.open(url, '_blank')} />
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {att && att.type === 'roteiro_estudos' && (
                                            <div className="mt-4 bg-purple-500/5 border border-purple-500/20 rounded-xl p-4 space-y-2">
                                                <div className="flex items-center gap-2 text-purple-400 text-xs font-bold uppercase">
                                                    <ClipboardList size={14} />
                                                    Roteiro de Estudos — {att.examType} ({att.bimestre}º Bim)
                                                </div>
                                                {att.module && (
                                                    <div className="text-sm text-gray-300">
                                                        <p className="font-bold">{att.module.title}</p>
                                                        <p className="text-xs text-gray-500">Cap. {att.module.chapter} | {att.module.topic}</p>
                                                    </div>
                                                )}
                                                {att.orientation && (
                                                    <div>
                                                        <p className="text-[10px] text-gray-500 uppercase font-bold mb-1">Orientações</p>
                                                        <p className="text-sm text-gray-300">{att.orientation}</p>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {att && att.type === 'relatorio_aluno' && (
                                            <div className="mt-4 bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-amber-400 text-xs font-bold uppercase">
                                                        <BarChart3 size={14} />
                                                        Relatório — {att.studentName}
                                                    </div>
                                                    <button onClick={() => PDFService.generateStudentReportPDF(att)}
                                                        className="p-1 px-2.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors"
                                                    >
                                                        <FileText size={12} />
                                                        PDF
                                                    </button>
                                                </div>
                                                {att.avgGrade && (
                                                    <p className="text-xs text-gray-400">Média: <span className="text-amber-300 font-bold">{att.avgGrade}</span> | Aulas: {att.totalClasses || 0}</p>
                                                )}
                                            </div>
                                        )}

                                        {att && att.type === 'foa' && (
                                            <div className="mt-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase">
                                                        <UserCheck size={14} />
                                                        FOA — {att.studentName} ({att.bimestre}º Bim)
                                                    </div>
                                                    <button onClick={() => PDFService.generateFOAPDF(att)}
                                                        className="p-1 px-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors"
                                                    >
                                                        <FileText size={12} />
                                                        PDF
                                                    </button>
                                                </div>
                                                {att.rows && att.rows.length > 0 && (
                                                    <p className="text-xs text-gray-400">{att.rows.length} disciplinas avaliadas</p>
                                                )}
                                            </div>
                                        )}

                                        {att && att.type === 'ocorrencia' && (
                                            <div className="mt-4 bg-red-500/5 border border-red-500/20 rounded-xl p-4 space-y-3">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-2 text-red-400 text-xs font-bold uppercase">
                                                        <AlertCircle size={14} />
                                                        Ocorrência — {att.typeLabel}
                                                    </div>
                                                    <button onClick={() => PDFService.generateOccurrencePDF({ studentName: att.studentName, className: att.className, date: att.date, typeLabel: att.typeLabel, description: att.description })}
                                                        className="p-1 px-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-colors"
                                                    >
                                                        <FileText size={12} />
                                                        PDF
                                                    </button>
                                                </div>
                                                <p className="text-sm text-gray-300 italic">"{att.description}"</p>
                                                {att.photos && att.photos.length > 0 && (
                                                    <div className="flex gap-2 overflow-x-auto pb-1">
                                                        {att.photos.map((url: string, i: number) => (
                                                            <img key={i} src={url} className="w-28 h-28 rounded-lg object-cover border border-gray-700 shrink-0 cursor-pointer hover:opacity-80 transition-opacity" onClick={() => window.open(url, '_blank')} />
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Direct Images Display in Message */}
                                        {msg.directImages && msg.directImages.length > 0 && (
                                            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 gap-2">
                                                {msg.directImages.map((url, i) => (
                                                    <img key={i} src={url} className="w-full aspect-square rounded-xl object-cover border border-gray-800 cursor-pointer hover:border-blue-500/50 transition-all" onClick={() => window.open(url, '_blank')} />
                                                ))}
                                            </div>
                                        )}

                                        {!isReadOnly && (
                                            <div className="flex justify-end mt-4 pt-3 border-t border-gray-800/50">
                                                <button onClick={() => handleDelete(msg.id)}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-red-400 hover:bg-red-500/10 rounded-lg text-xs font-bold transition-colors"
                                                >
                                                    <Trash2 size={13} />
                                                    Excluir
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
