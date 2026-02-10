
import React, { useState, useEffect } from 'react';
import { StorageService } from './services/storageService';
import { SupabaseService } from './services/supabaseService';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar
} from 'recharts';
import { Mail, Calendar, GraduationCap, Eye, MoreHorizontal, TrendingUp, AlertCircle, CheckCircle2, Users, BarChart2, Download, Send, Filter } from 'lucide-react';
import { format, subDays, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UserRole, Student, ClassSession, ClassRoom } from './types';

interface ReportProps {
    onShowToast: (msg: string) => void;
    currentUserRole?: UserRole;
    initialStudentId?: string;
}

type ReportType = 'STUDENT' | 'CLASS' | 'COMPARE';

export const StudentReport: React.FC<ReportProps> = ({ onShowToast, currentUserRole, initialStudentId }) => {
    const [reportType, setReportType] = useState<ReportType>('STUDENT');

    // Data Sources
    const [students, setStudents] = useState<Student[]>([]);
    const [sessions, setSessions] = useState<ClassSession[]>([]);
    const [classes, setClasses] = useState<ClassRoom[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [fetchedStudents, fetchedSessions, fetchedClasses] = await Promise.all([
                    SupabaseService.getStudents(),
                    SupabaseService.getSessions(),
                    SupabaseService.getClasses()
                ]);
                console.log('📊 Dados carregados do Supabase:');
                console.log('  - Alunos:', fetchedStudents.length);
                console.log('  - Sessões:', fetchedSessions.length);
                console.log('  - Turmas:', fetchedClasses.length);
                if (fetchedSessions.length > 0) {
                    console.log('  - Primeira sessão:', fetchedSessions[0]);
                }
                setStudents(fetchedStudents);
                setSessions(fetchedSessions);
                setClasses(fetchedClasses);
            } catch (error) {
                console.error("Error fetching data:", error);
                onShowToast("Erro ao carregar dados do servidor.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // -- GLOBAL FILTER STATE (DATE) --
    // Default to last 30 days
    const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

    // -- STUDENT REPORT STATE --
    // Filter State for Student Report
    const [studentFilterClass, setStudentFilterClass] = useState<string>('');
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');

    // -- CLASS REPORT STATE --
    const [selectedClassName, setSelectedClassName] = useState<string>('');
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' }>({ key: 'avg', direction: 'desc' });

    // Initialize Class Selections when classes load
    useEffect(() => {
        if (classes.length > 0) {
            if (!selectedClassName) setSelectedClassName(classes[0].name);
            if (!studentFilterClass) setStudentFilterClass(classes[0].name);
        }
    }, [classes]);

    // Init Student Selection based on filter OR initialStudentId
    useEffect(() => {
        if (initialStudentId && students.length > 0) {
            const student = students.find(s => s.id === initialStudentId);
            if (student) {
                setStudentFilterClass(student.className);
                setSelectedStudentId(student.id);
                setReportType('STUDENT'); // Force student view
            }
        } else {
            // Only auto-select first student if filtered class changes or no student is selected
            const filtered = studentFilterClass
                ? students.filter(s => s.className === studentFilterClass)
                : students;

            if (filtered.length > 0) {
                // Only force reset if the current selected student is NOT in the new list
                const currentSelectedInList = filtered.find(s => s.id === selectedStudentId);
                if (!currentSelectedInList) {
                    setSelectedStudentId(filtered[0].id);
                }
            } else {
                setSelectedStudentId('');
            }
        }
    }, [studentFilterClass, students, initialStudentId]);


    // --- HELPERS FOR DATA PROCESSING ---

    // Helper to check if a session falls within the selected date range
    const isSessionInDateRange = (sessionDateString: string) => {
        if (!startDate || !endDate) return true;
        const sDate = new Date(sessionDateString).toISOString().split('T')[0];
        return sDate >= startDate && sDate <= endDate;
    };

    // 1. Student Report Data
    const getStudentData = (studentId: string) => {
        const student = students.find(s => s.id === studentId);
        if (!student) return { chartData: [], avgGrade: '0.0', totalClasses: 0, student: null };

        // Filter sessions by date first
        const filteredSessions = sessions.filter(s => isSessionInDateRange(s.date));

        const chartData = filteredSessions
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(session => {
                const studentRecord = session.records.find(r => r.studentId === studentId);
                const studentGrade = studentRecord ? StorageService.calculateGrade(studentRecord) : null;

                // Class Avg for that session
                const classTotal = session.records.reduce((acc, r) => acc + StorageService.calculateGrade(r), 0);
                const classAvg = session.records.length > 0 ? classTotal / session.records.length : 0;

                return {
                    date: format(new Date(session.date), 'dd/MM', { locale: ptBR }),
                    fullDate: session.date,
                    aluno: studentGrade,
                    mediaTurma: parseFloat(classAvg.toFixed(1)),
                    teacherName: session.teacherName,
                    sessionObj: session,
                    record: studentRecord,
                    blocksCount: session.blocksCount || 1
                };
            })
            .filter(d => d.aluno !== null);

        const avgGrade = chartData.length > 0
            ? (chartData.reduce((acc, d) => acc + (d.aluno || 0), 0) / chartData.length).toFixed(1)
            : '0.0';

        const totalClasses = chartData.reduce((acc, d) => acc + d.blocksCount, 0);

        return { chartData, avgGrade, totalClasses, student };
    };

    // 2. Class Report Data
    const getClassData = (className: string) => {
        // Filter sessions by class AND date
        const classSessions = sessions.filter(s => s.className === className && isSessionInDateRange(s.date));
        const studentsInClass = students.filter(s => s.className === className);

        // Daily Avg Grade for Chart
        const dailyAvgData = classSessions
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
            .map(sess => {
                const total = sess.records.reduce((acc, r) => acc + StorageService.calculateGrade(r), 0);
                const avg = sess.records.length ? total / sess.records.length : 0;
                return {
                    date: format(new Date(sess.date), 'dd/MM', { locale: ptBR }),
                    fullDate: sess.date,
                    avg: parseFloat(avg.toFixed(1))
                };
            });

        // Global Class Avg
        const totalSum = dailyAvgData.reduce((acc, d) => acc + d.avg, 0);
        const globalAvg = dailyAvgData.length ? (totalSum / dailyAvgData.length).toFixed(1) : '0.0';

        // Student Rankings in Class
        const studentPerformances = studentsInClass.map(s => {
            // Filtered stats just for this report period logic (Manual calc required as getStudentStats in service is global)
            let gradeSum = 0;
            let count = 0;
            let presentCount = 0;
            let totalClassWeight = 0;

            // NEW: Criteria sums
            let sumTalk = 0;
            let sumSleep = 0;
            let sumBathroom = 0;
            let sumMaterial = 0;
            let sumActivity = 0;
            let sumPhone = 0;
            let sumParticipation = 0;

            classSessions.forEach(cs => {
                const rec = cs.records.find(r => r.studentId === s.id);
                if (rec) {
                    const weight = cs.blocksCount || 1;
                    totalClassWeight += weight;
                    gradeSum += StorageService.calculateGrade(rec);
                    count++;
                    if (rec.present) {
                        presentCount += weight;
                        sumTalk += rec.counters.talk;
                        sumSleep += rec.counters.sleep;
                        sumBathroom += rec.counters.bathroom;
                        sumMaterial += rec.counters.material;
                        sumActivity += rec.counters.activity;
                        sumPhone += (rec.phoneConfiscated ? 1 : 0);
                        sumParticipation += (rec.counters.participation || 0);
                    }
                }
            });

            const avg = count ? (gradeSum / count).toFixed(1) : '0.0';
            const attendance = totalClassWeight ? (presentCount / totalClassWeight) * 100 : 0;

            return {
                ...s,
                avg: parseFloat(avg),
                attendance: attendance,
                // Show as deductions/bonuses
                talk: count ? -(Math.min(3.0, (sumTalk / count) * 1.0)) : 0,
                sleep: count ? -(Math.min(3.0, (sumSleep / count) * 1.0)) : 0,
                bathroom: count ? -(Math.min(1.5, (sumBathroom / count) * 0.5)) : 0,
                material: count ? -(((count - sumMaterial) / count) * 1.5) : 0,
                activity: count ? -(((count * 3 - sumActivity) / count) * 1.0) : 0,
                phone: count ? -(sumPhone / count * 1.0) : 0,
                participation: count ? (sumParticipation / count * 0.5) : 0
            };
        });

        // Apply Sorting
        const sortedPerformances = [...studentPerformances].sort((a: any, b: any) => {
            if (a[sortConfig.key] < b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? -1 : 1;
            }
            if (a[sortConfig.key] > b[sortConfig.key]) {
                return sortConfig.direction === 'asc' ? 1 : -1;
            }
            return 0;
        });

        return { dailyAvgData, globalAvg, studentPerformances: sortedPerformances, totalSessions: classSessions.length };
    };

    // 3. Comparative Data (Detailed)
    const getDetailedComparativeData = () => {
        return classes.map(cls => {
            // Filter by class AND Date
            const classSessions = sessions.filter(s => s.className === cls.name && isSessionInDateRange(s.date));
            const totalRecords = classSessions.reduce((acc, s) => acc + s.records.length, 0);

            // Calculate Averages per record
            let sumGrade = 0;
            let sumAttendance = 0; // Count of presents

            // Counters (Average occurrences per student per class)
            let sumTalk = 0;
            let sumBathroom = 0;
            let sumSleep = 0;
            let sumMaterial = 0; // Count of NO material (0)
            let sumActivity = 0; // Count of activity loss (3 - val)
            let sumPhone = 0;

            classSessions.forEach(s => {
                s.records.forEach(r => {
                    sumGrade += StorageService.calculateGrade(r);
                    if (r.present) sumAttendance++;

                    sumTalk += r.counters.talk;
                    sumBathroom += r.counters.bathroom;
                    sumSleep += r.counters.sleep;
                    if (r.counters.material === 0) sumMaterial++; // 1 is missing
                    if (r.counters.activity < 3) sumActivity += (3 - r.counters.activity);
                    if (r.phoneConfiscated) sumPhone++;
                });
            });

            const count = totalRecords || 1; // Avoid div by zero

            return {
                name: cls.name,
                avgGrade: parseFloat((sumGrade / count).toFixed(1)),
                attendance: parseFloat(((sumAttendance / count) * 100).toFixed(1)),
                avgTalk: parseFloat((sumTalk / count).toFixed(2)),
                avgBathroom: parseFloat((sumBathroom / count).toFixed(2)),
                avgSleep: parseFloat((sumSleep / count).toFixed(2)),
                avgNoMaterial: parseFloat((sumMaterial / count).toFixed(2)), // % of students without material
                avgActivityLoss: parseFloat((sumActivity / count).toFixed(2)),
                avgPhone: parseFloat((sumPhone / count).toFixed(2)),
            };
        });
    };

    // --- ACTIONS ---

    const handleDownloadPDF = async () => {
        onShowToast("Gerando PDF... Aguarde um momento.");

        try {
            const html2canvas = (await import('html2canvas')).default;
            const jsPDF = (await import('jspdf')).default;

            const element = document.querySelector('.animate-in'); // Target the main report container
            if (!element) {
                onShowToast("Erro: Elemento do relatório não encontrado.");
                return;
            }

            // Ensure we are at the top to capture everything correctly
            window.scrollTo(0, 0);

            const canvas = await html2canvas(element as HTMLElement, {
                scale: 2, // Higher scale for better quality
                useCORS: true, // For images
                logging: false,
                backgroundColor: '#0f172a', // Match background color
                allowTaint: true,
                foreignObjectRendering: false,
                onclone: (clonedDoc) => {
                    const clonedElement = clonedDoc.querySelector('.animate-in') as HTMLElement;
                    if (clonedElement) {
                        clonedElement.style.padding = '20px';
                        clonedElement.style.background = '#0f172a';
                    }
                }
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 297; // A4 Width in mm (landscape)
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`Relatorio_${reportType}_${format(new Date(), 'dd-MM-yyyy')}.pdf`);

            onShowToast("PDF baixado com sucesso!");
        } catch (error) {
            console.error("PDF Generation Error:", error);
            onShowToast("Erro ao gerar PDF.");
        }
    };

    const handleSendEmail = () => {
        if (currentUserRole !== UserRole.COORDINATOR) return;
        onShowToast("E-mail enviado ao responsável com sucesso!");
    };

    // --- RENDERERS ---

    const renderHeader = () => (
        <div className="flex flex-col gap-4 mb-6">
            {/* Top Row: Report Types */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div className="flex bg-[#0f172a] rounded-lg p-1 border border-gray-700">
                    <button
                        onClick={() => setReportType('STUDENT')}
                        className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${reportType === 'STUDENT' ? 'bg-emerald-500 text-[#0f172a]' : 'text-gray-400 hover:text-white'}`}
                    >
                        <GraduationCap size={14} /> Aluno
                    </button>
                    <button
                        onClick={() => setReportType('CLASS')}
                        className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${reportType === 'CLASS' ? 'bg-emerald-500 text-[#0f172a]' : 'text-gray-400 hover:text-white'}`}
                    >
                        <Users size={14} /> Turma
                    </button>
                    <button
                        onClick={() => setReportType('COMPARE')}
                        className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${reportType === 'COMPARE' ? 'bg-emerald-500 text-[#0f172a]' : 'text-gray-400 hover:text-white'}`}
                    >
                        <BarChart2 size={14} /> Comparativo
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={handleDownloadPDF}
                        className="flex items-center gap-2 px-3 py-2 bg-[#1e293b] hover:bg-gray-700 text-gray-300 rounded-lg text-xs font-bold border border-gray-600 transition-colors"
                    >
                        <Download size={14} />
                        PDF
                    </button>

                    {reportType === 'STUDENT' && currentUserRole === UserRole.COORDINATOR && (
                        <button
                            onClick={handleSendEmail}
                            className="flex items-center gap-2 px-3 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-xs font-bold border border-emerald-500/30 transition-colors"
                        >
                            <Send size={14} />
                            Enviar P/ Pais
                        </button>
                    )}
                </div>
            </div>

            {/* Bottom Row: Filters (Date + Specifics) */}
            <div className="bg-[#0f172a] p-3 rounded-lg border border-gray-800 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-2 border-r border-gray-700 pr-4 mr-2">
                    <Filter size={16} className="text-emerald-500" />
                    <span className="text-sm font-bold text-white uppercase">Filtros</span>
                </div>

                {/* Date Range Picker */}
                <div className="flex items-center gap-2">
                    <div className="flex flex-col">
                        <label className="text-[9px] font-bold text-gray-500 uppercase">De</label>
                        <input
                            type="date"
                            value={startDate}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="bg-[#1e293b] text-white text-xs border border-gray-700 rounded p-1.5 outline-none focus:border-emerald-500"
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-[9px] font-bold text-gray-500 uppercase">Até</label>
                        <input
                            type="date"
                            value={endDate}
                            onChange={(e) => setEndDate(e.target.value)}
                            className="bg-[#1e293b] text-white text-xs border border-gray-700 rounded p-1.5 outline-none focus:border-emerald-500"
                        />
                    </div>
                </div>

                <div className="h-8 w-px bg-gray-700 mx-2 hidden md:block"></div>

                {/* Context Specific Filters */}
                {reportType === 'STUDENT' && (
                    <>
                        <div className="flex flex-col">
                            <label className="text-[9px] font-bold text-gray-500 uppercase">Turma</label>
                            <select
                                value={studentFilterClass}
                                onChange={(e) => setStudentFilterClass(e.target.value)}
                                className="bg-[#1e293b] text-white border border-gray-700 rounded p-1.5 text-xs outline-none focus:border-emerald-500 min-w-[120px]"
                            >
                                <option value="">Todas as Turmas</option>
                                {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                            </select>
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[9px] font-bold text-gray-500 uppercase">Aluno</label>
                            <select
                                value={selectedStudentId}
                                onChange={(e) => setSelectedStudentId(e.target.value)}
                                className="bg-[#1e293b] text-white border border-gray-700 rounded p-1.5 text-xs outline-none focus:border-emerald-500 min-w-[200px]"
                            >
                                <option value="" disabled>Selecione um aluno</option>
                                {(studentFilterClass ? students.filter(s => s.className === studentFilterClass) : students).map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                        </div>
                    </>
                )}

                {reportType === 'CLASS' && (
                    <div className="flex flex-col">
                        <label className="text-[9px] font-bold text-gray-500 uppercase">Turma</label>
                        <select
                            value={selectedClassName}
                            onChange={(e) => setSelectedClassName(e.target.value)}
                            className="bg-[#1e293b] text-white border border-gray-700 rounded p-1.5 text-xs outline-none focus:border-emerald-500 min-w-[150px]"
                        >
                            {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                )}
            </div>
        </div>
    );

    const renderStudentReport = () => {
        const { chartData, avgGrade, totalClasses, student } = getStudentData(selectedStudentId);
        if (!student) return <div className="text-gray-400 p-8 text-center bg-[#0f172a] rounded-xl border border-gray-800 border-dashed">Selecione um aluno para visualizar o relatório.</div>;

        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Profile & Summary */}
                <div className="space-y-6">
                    <div className="bg-[#0f172a] rounded-xl border border-gray-800 p-6 flex flex-col items-center text-center shadow-lg relative">
                        <div className="w-24 h-24 rounded-full p-1 border-2 border-emerald-500 mb-3">
                            <img src={student.photoUrl} className="w-full h-full rounded-full object-cover" />
                        </div>
                        <h2 className="text-xl font-bold text-white">{student.name}</h2>
                        <p className="text-gray-400 text-sm mb-4">{student.className}</p>

                        <div className="grid grid-cols-2 gap-3 w-full mb-4">
                            <div className="bg-[#1e293b] p-3 rounded-lg border border-gray-700">
                                <p className="text-[10px] text-gray-500 font-bold uppercase">Média Geral</p>
                                <p className={`text-2xl font-bold ${Number(avgGrade) >= 7 ? 'text-emerald-400' : 'text-orange-400'}`}>{avgGrade}</p>
                            </div>
                            <div className="bg-[#1e293b] p-3 rounded-lg border border-gray-700">
                                <p className="text-[10px] text-gray-500 font-bold uppercase">Total Aulas</p>
                                <p className="text-2xl font-bold text-white">{totalClasses}</p>
                            </div>
                        </div>
                        <div className="text-[10px] text-gray-500">Período: {format(new Date(startDate), 'dd/MM')} a {format(new Date(endDate), 'dd/MM')}</div>
                    </div>

                    {/* Criteria Table Legend */}
                    <div className="bg-[#0f172a] rounded-xl border border-gray-800 p-5 shadow-lg">
                        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                            <AlertCircle size={16} className="text-emerald-500" /> Critérios de Avaliação
                        </h3>
                        <div className="space-y-3">
                            <CriteriaRow label="Presença" desc="Falta = 0 (Justif. = 5,0)" val="Zera Nota" />
                            <CriteriaRow label="Participação" desc="Interação em aula" val="+0,5" />
                            <CriteriaRow label="Conversa" desc="-1,0 por ocorrência" val="até -3,0" />
                            <CriteriaRow label="Banheiro" desc="-0,5 por saída" val="até -1,5" />
                            <CriteriaRow label="Dormir" desc="-1,0 por ocorrência" val="até -3,0" />
                            <CriteriaRow label="Material" desc="Sem material" val="-1,5" />
                            <CriteriaRow label="Atividade" desc="-1,0 por nível perdido" val="até -3,0" />
                            <CriteriaRow label="Celular" desc="Uso não autorizado" val="-1,0" />
                        </div>
                    </div>
                </div>

                {/* Right Column: Chart & History */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Evolution Chart */}
                    <div className="bg-[#0f172a] rounded-xl border border-gray-800 p-6 shadow-lg">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                    <TrendingUp className="text-emerald-500" size={20} />
                                    Evolução de Desempenho
                                </h3>
                                <p className="text-xs text-gray-500">Comparativo: Aluno vs. Média da Turma</p>
                            </div>
                        </div>

                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                    <XAxis dataKey="date" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis domain={[0, 10]} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', color: '#fff' }}
                                        itemStyle={{ color: '#fff' }}
                                        formatter={(value: number) => [value.toFixed(1), 'Nota']}
                                        labelStyle={{ color: '#94a3b8', marginBottom: '0.5rem' }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '20px' }} />
                                    <Line
                                        name="Aluno"
                                        type="monotone"
                                        dataKey="aluno"
                                        stroke="#10b981"
                                        strokeWidth={3}
                                        dot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
                                        activeDot={{ r: 6 }}
                                    />
                                    <Line
                                        name="Média da Turma"
                                        type="monotone"
                                        dataKey="mediaTurma"
                                        stroke="#475569"
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Detailed History Table */}
                    <div className="bg-[#0f172a] rounded-xl border border-gray-800 p-6 shadow-lg">
                        <h3 className="text-lg font-bold text-white mb-4">Histórico Detalhado</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-[#1e293b] text-xs font-bold text-gray-400 uppercase">
                                    <tr>
                                        <th className="px-4 py-3 rounded-tl-lg">Data</th>
                                        <th className="px-4 py-3">Professor</th>
                                        <th className="px-4 py-3">Presença</th>
                                        <th className="px-4 py-3">Ocorrências (Deduções)</th>
                                        <th className="px-4 py-3 text-right rounded-tr-lg">Nota Final</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800 text-sm">
                                    {chartData.length === 0 && (
                                        <tr><td colSpan={4} className="p-4 text-center text-gray-500">Nenhum registro encontrado neste período.</td></tr>
                                    )}
                                    {chartData.slice().reverse().map((d, idx) => { // Show newest first
                                        const r = d.record!;
                                        const deductions = [];

                                        if (!r.present) {
                                            deductions.push(r.justifiedAbsence ? "Falta Justificada (Nota 5.0)" : "Falta (Nota 0.0)");
                                        } else {
                                            if (r.counters.talk > 0) deductions.push(`${r.counters.talk}x Conversa`);
                                            if (r.counters.bathroom > 0) deductions.push(`${r.counters.bathroom}x Banheiro`);
                                            if (r.counters.sleep > 0) deductions.push(`${r.counters.sleep}x Sono`);
                                            if (r.counters.material === 0) deductions.push(`Sem Material`);
                                            if (r.counters.activity < 3) deductions.push(`Atividade Incompleta (-${3 - r.counters.activity})`);
                                            if (r.phoneConfiscated) deductions.push(`Celular`);
                                            if (r.counters.participation > 0) deductions.push(`Participação (+0.5)`);
                                        }

                                        return (
                                            <tr key={idx} className="hover:bg-[#1e293b]/50">
                                                <td className="px-4 py-3 text-gray-300">
                                                    <div>
                                                        {format(new Date(d.fullDate), "dd 'de' MMMM", { locale: ptBR })}
                                                        {d.blocksCount > 1 && <span className="ml-2 text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold">{d.blocksCount} aulas</span>}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-gray-400 text-xs">
                                                    {d.teacherName || '---'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {r.present
                                                        ? <span className="text-emerald-500 font-bold flex items-center gap-1"><CheckCircle2 size={14} /> SIM</span>
                                                        : <span className="text-red-500 font-bold flex items-center gap-1"><AlertCircle size={14} /> NÃO</span>
                                                    }
                                                </td>
                                                <td className="px-4 py-3">
                                                    {deductions.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {deductions.map((ded, i) => (
                                                                <span key={i} className={`text-[10px] px-2 py-0.5 rounded border ${ded.includes('+') ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                                                                    {ded}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    ) : (
                                                        <span className="text-gray-500 text-xs italic">Sem deduções</span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <span className={`font-bold text-lg ${Number(d.aluno) >= 10 ? 'text-emerald-400' : Number(d.aluno) >= 6 ? 'text-white' : 'text-red-400'}`}>
                                                        {d.aluno?.toFixed(1)}
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderClassReport = () => {
        const { dailyAvgData, globalAvg, studentPerformances, totalSessions } = getClassData(selectedClassName);

        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Summary */}
                <div className="space-y-6">
                    <div className="bg-[#0f172a] rounded-xl border border-gray-800 p-6 flex flex-col items-center text-center shadow-lg">
                        <div className="w-20 h-20 bg-emerald-500/10 rounded-full flex items-center justify-center mb-3">
                            <Users size={32} className="text-emerald-500" />
                        </div>
                        <h2 className="text-xl font-bold text-white">{selectedClassName}</h2>
                        <p className="text-gray-400 text-sm mb-4">{totalSessions} aulas registradas</p>

                        <div className="w-full bg-[#1e293b] p-4 rounded-lg border border-gray-700">
                            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Média Geral da Turma</p>
                            <p className={`text-3xl font-bold ${Number(globalAvg) >= 7 ? 'text-emerald-400' : 'text-orange-400'}`}>{globalAvg}</p>
                        </div>
                        <div className="mt-2 text-[10px] text-gray-500">Período: {format(new Date(startDate), 'dd/MM')} a {format(new Date(endDate), 'dd/MM')}</div>
                    </div>

                    {/* Performance Chart */}
                    <div className="bg-[#0f172a] rounded-xl border border-gray-800 p-6 shadow-lg">
                        <h3 className="text-sm font-bold text-white mb-4">Desempenho Diário</h3>
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={dailyAvgData}>
                                    <XAxis dataKey="date" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis domain={[0, 10]} stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} width={20} />
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', fontSize: '12px' }} />
                                    <Line type="monotone" dataKey="avg" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Right Column: Student List */}
                <div className="lg:col-span-2 bg-[#0f172a] rounded-xl border border-gray-800 p-6 shadow-lg">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-white">Desempenho Individual</h3>
                        <div className="text-[10px] text-gray-500 italic">Clique nos cabeçalhos para ordenar</div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-[#1e293b] text-[10px] font-bold text-gray-400 uppercase">
                                <tr>
                                    <th className="px-2 py-3 rounded-tl-lg">Aluno</th>
                                    <SortableHeader label="Nota" sortKey="avg" currentSort={sortConfig} onSort={setSortConfig} />
                                    <SortableHeader label="Pres." sortKey="attendance" currentSort={sortConfig} onSort={setSortConfig} />
                                    <SortableHeader label="Conv." sortKey="talk" currentSort={sortConfig} onSort={setSortConfig} />
                                    <SortableHeader label="Sono" sortKey="sleep" currentSort={sortConfig} onSort={setSortConfig} />
                                    <SortableHeader label="Banh." sortKey="bathroom" currentSort={sortConfig} onSort={setSortConfig} />
                                    <SortableHeader label="Mat." sortKey="material" currentSort={sortConfig} onSort={setSortConfig} />
                                    <SortableHeader label="Ativ." sortKey="activity" currentSort={sortConfig} onSort={setSortConfig} />
                                    <SortableHeader label="Cel." sortKey="phone" currentSort={sortConfig} onSort={setSortConfig} />
                                    <SortableHeader label="Part." sortKey="participation" currentSort={sortConfig} onSort={setSortConfig} rounded />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800 text-xs">
                                {studentPerformances.length === 0 ? (
                                    <tr><td colSpan={10} className="p-4 text-center text-gray-500">Sem dados neste período.</td></tr>
                                ) : (
                                    studentPerformances.map((s, idx) => (
                                        <tr key={s.id} className="hover:bg-[#1e293b]/50 transition-colors">
                                            <td className="px-2 py-3 flex items-center gap-2 min-w-[150px]">
                                                <span className="text-gray-600 text-[10px] w-4">{idx + 1}.</span>
                                                <img src={s.photoUrl} className="w-6 h-6 rounded-full" />
                                                <span className="text-gray-200 font-medium truncate">{s.name}</span>
                                            </td>
                                            <td className="px-2 py-3">
                                                <span className={`font-bold ${s.avg >= 7 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                    {s.avg.toFixed(1)}
                                                </span>
                                            </td>
                                            <td className="px-2 py-3">
                                                <span className="text-gray-300">{s.attendance.toFixed(0)}%</span>
                                            </td>
                                            <td className={`px-2 py-3 ${s.talk < 0 ? 'text-red-400' : 'text-gray-500'}`}>{s.talk === 0 ? '0.0' : s.talk.toFixed(1)}</td>
                                            <td className={`px-2 py-3 ${s.sleep < 0 ? 'text-red-400' : 'text-gray-500'}`}>{s.sleep === 0 ? '0.0' : s.sleep.toFixed(1)}</td>
                                            <td className={`px-2 py-3 ${s.bathroom < 0 ? 'text-red-400' : 'text-gray-500'}`}>{s.bathroom === 0 ? '0.0' : s.bathroom.toFixed(1)}</td>
                                            <td className={`px-2 py-3 ${s.material < 0 ? 'text-red-400' : 'text-gray-500'}`}>{s.material === 0 ? '0.0' : s.material.toFixed(1)}</td>
                                            <td className={`px-2 py-3 ${s.activity < 0 ? 'text-red-400' : 'text-gray-500'}`}>{s.activity === 0 ? '0.0' : s.activity.toFixed(1)}</td>
                                            <td className={`px-2 py-3 ${s.phone < 0 ? 'text-red-400' : 'text-gray-500'}`}>{s.phone === 0 ? '0.0' : s.phone.toFixed(1)}</td>
                                            <td className={`px-2 py-3 ${s.participation > 0 ? 'text-emerald-400' : 'text-gray-500'}`}>{s.participation === 0 ? '0.0' : `+${s.participation.toFixed(1)}`}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderComparativeReport = () => {
        const data = getDetailedComparativeData();

        const renderMiniChart = (dataKey: string, title: string, color: string, unit: string = '') => (
            <div className="bg-[#1e293b] rounded-lg border border-gray-700 p-4">
                <h4 className="text-xs font-bold text-gray-400 uppercase mb-3">{title}</h4>
                <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                            <XAxis dataKey="name" stroke="#64748b" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{ fill: '#0f172a' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155', fontSize: '10px' }} formatter={(val: number) => val + unit} />
                            <Bar dataKey={dataKey} fill={color} radius={[2, 2, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>
        );

        return (
            <div className="space-y-6">
                {/* Main Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-[#0f172a] rounded-xl border border-gray-800 p-6 shadow-lg">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white">Média Geral por Turma</h3>
                            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">Período Selecionado</span>
                        </div>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis domain={[0, 10]} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                                    <Bar dataKey="avgGrade" name="Nota Média" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-[#0f172a] rounded-xl border border-gray-800 p-6 shadow-lg">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-white">Taxa de Presença por Turma</h3>
                            <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">Período Selecionado</span>
                        </div>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                    <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis domain={[0, 100]} stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip cursor={{ fill: '#1e293b' }} contentStyle={{ backgroundColor: '#0f172a', border: '1px solid #334155' }} />
                                    <Bar dataKey="attendance" name="Presença (%)" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Criteria Breakdown */}
                <div className="bg-[#0f172a] rounded-xl border border-gray-800 p-6 shadow-lg">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <BarChart2 className="text-emerald-500" />
                        Comparativo por Critério (Média de Ocorrências/Aluno)
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {renderMiniChart("avgTalk", "Conversa", "#f59e0b")}
                        {renderMiniChart("avgPhone", "Celular", "#ef4444")}
                        {renderMiniChart("avgSleep", "Sono", "#8b5cf6")}
                        {renderMiniChart("avgBathroom", "Saídas (Banheiro)", "#3b82f6")}
                        {renderMiniChart("avgNoMaterial", "Sem Material", "#ec4899")}
                        {renderMiniChart("avgActivityLoss", "Déficit de Atividade", "#f97316")}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="max-w-[1400px] mx-auto space-y-6">
            {renderHeader()}

            {loading ? (
                <div className="flex items-center justify-center p-12 bg-[#0f172a] rounded-xl border border-gray-800">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
                        <p className="text-gray-400">Carregando dados...</p>
                    </div>
                </div>
            ) : sessions.length === 0 ? (
                <div className="flex items-center justify-center p-12 bg-[#0f172a] rounded-xl border border-gray-800 border-dashed">
                    <div className="text-center">
                        <AlertCircle size={48} className="text-yellow-500 mx-auto mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">Nenhuma aula registrada</h3>
                        <p className="text-gray-400 mb-4">Não há sessões de aula cadastradas no sistema.</p>
                        <p className="text-sm text-gray-500">Registre aulas na seção "Monitoramento de Sala" para visualizar relatórios.</p>
                    </div>
                </div>
            ) : (
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {reportType === 'STUDENT' && renderStudentReport()}
                    {reportType === 'CLASS' && renderClassReport()}
                    {reportType === 'COMPARE' && renderComparativeReport()}
                </div>
            )}
        </div>
    );
};

const SortableHeader = ({ label, sortKey, currentSort, onSort, rounded }: { label: string, sortKey: string, currentSort: any, onSort: any, rounded?: boolean }) => {
    const isActive = currentSort.key === sortKey;
    return (
        <th
            className={`px-2 py-3 cursor-pointer hover:bg-gray-700 transition-colors ${rounded ? 'rounded-tr-lg' : ''}`}
            onClick={() => onSort({ key: sortKey, direction: isActive && currentSort.direction === 'desc' ? 'asc' : 'desc' })}
        >
            <div className="flex items-center gap-1">
                {label}
                <div className="flex flex-col">
                    <span className={`text-[6px] ${isActive && currentSort.direction === 'asc' ? 'text-emerald-400' : 'text-gray-600'}`}>▲</span>
                    <span className={`text-[6px] ${isActive && currentSort.direction === 'desc' ? 'text-emerald-400' : 'text-gray-600'}`}>▼</span>
                </div>
            </div>
        </th>
    );
};

const CriteriaRow = ({ label, desc, val }: { label: string, desc: string, val: string }) => (
    <div className="flex justify-between items-start text-xs border-b border-gray-800 pb-2 last:border-0 last:pb-0">
        <div>
            <span className="font-bold text-gray-200 block">{label}</span>
            <span className="text-gray-500">{desc}</span>
        </div>
        <span className={`font-bold px-1.5 py-0.5 rounded ${val.includes('+') ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>{val}</span>
    </div>
);
