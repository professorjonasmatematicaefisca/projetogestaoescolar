import React, { useState, useEffect } from 'react';
import { StorageService } from './services/storageService';
import { SupabaseService } from './services/supabaseService';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar
} from 'recharts';
import { Mail, Calendar, GraduationCap, Eye, MoreHorizontal, TrendingUp, AlertCircle, CheckCircle2, Users, BarChart2, Download, Send, Filter, Layers, ClipboardList } from 'lucide-react';
import { format, subDays, isWithinInterval, parseISO, startOfDay, endOfDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UserRole, Student, ClassSession, ClassRoom } from './types';

interface ReportProps {
    onShowToast: (msg: string) => void;
    currentUserRole?: UserRole;
    initialStudentId?: string;
}

type ReportType = 'STUDENT' | 'CLASS' | 'COMPARE' | 'ABSENCES';

export const StudentReport: React.FC<ReportProps> = ({ onShowToast, currentUserRole, initialStudentId }) => {
    const [reportType, setReportType] = useState<ReportType>('STUDENT');

    // Data Sources
    const [students, setStudents] = useState<Student[]>([]);
    const [sessions, setSessions] = useState<ClassSession[]>([]);
    const [classes, setClasses] = useState<ClassRoom[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [academicYear, setAcademicYear] = useState<number>(2026);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // Ao buscar dados para um relatório histórico, usamos o getStudentsByYear
                const [fetchedStudents, fetchedSessions, fetchedClasses] = await Promise.all([
                    SupabaseService.getStudentsByYear(academicYear),
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

    const [schoolLogoUrl, setSchoolLogoUrl] = useState<string | null>(null);

    useEffect(() => {
        const loadLogo = async () => {
            const cachedLogo = localStorage.getItem('educontrol_school_logo');
            if (cachedLogo) setSchoolLogoUrl(cachedLogo);

            const dbLogo = await SupabaseService.getSetting('school_logo');
            if (dbLogo && dbLogo !== cachedLogo) {
                setSchoolLogoUrl(dbLogo);
                localStorage.setItem('educontrol_school_logo', dbLogo);
            }
        };
        loadLogo();
    }, []);

    // -- GLOBAL FILTER STATE (DATE) --
    // Default to last 30 days or ANUAL
    const [selectedBimestre, setSelectedBimestre] = useState<string>('ANUAL');
    const [startDate, setStartDate] = useState<string>(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

    // Update dates when academicYear or Bimestre changes
    useEffect(() => {
        if (selectedBimestre === 'ANUAL') {
            if (academicYear !== new Date().getFullYear()) {
                setStartDate(`${academicYear}-01-01`);
                setEndDate(`${academicYear}-12-31`);
            } else {
                setStartDate(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
                setEndDate(format(new Date(), 'yyyy-MM-dd'));
            }
        } else {
            // Datas reais dos bimestres 2026
            if (selectedBimestre === '1') {
                setStartDate('2026-01-28');
                setEndDate('2026-04-17');
            } else if (selectedBimestre === '2') {
                setStartDate('2026-04-18');
                setEndDate('2026-06-30');
            } else if (selectedBimestre === '3') {
                setStartDate('2026-07-01');
                setEndDate('2026-09-30');
            } else if (selectedBimestre === '4') {
                setStartDate('2026-10-01');
                setEndDate('2026-12-31');
            }
        }
    }, [academicYear, selectedBimestre]);

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
            let sumHomework = 0;

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
                        sumHomework += (rec.counters.homework || 0);
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
                talk: count ? -((sumTalk / count) * 2.5) : 0,
                sleep: count ? -((sumSleep / count) * 2.5) : 0,
                bathroom: count ? -((sumBathroom / count) * 2.5) : 0,
                material: count ? -(((count - sumMaterial) / count) * 1.5) : 0,
                homework: count ? -(((count - sumHomework) / count) * 2.5) : 0,
                activity: count ? -(((count * 3 - sumActivity) / count) * 2.0) : 0,
                phone: count ? -((sumPhone / count) * 5.0) : 0,
                participation: count ? ((sumParticipation / count) * 0.5) : 0
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
                backgroundColor: '#ffffff', // Match background color
                allowTaint: true,
                foreignObjectRendering: false,
                onclone: (clonedDoc) => {
                    const clonedElement = clonedDoc.querySelector('.animate-in') as HTMLElement;
                    if (clonedElement) {
                        clonedElement.style.padding = '20px';
                        clonedElement.style.background = '#ffffff';
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

    const handleBulkPDF = async () => {
        // Get list of students to export
        const studentsToExport = studentFilterClass
            ? students.filter(s => s.className === studentFilterClass)
            : students;

        if (studentsToExport.length === 0) {
            onShowToast('Nenhum aluno encontrado para exportar.');
            return;
        }

        onShowToast(`Gerando PDF para ${studentsToExport.length} alunos... Aguarde.`);

        try {
            const html2canvas = (await import('html2canvas')).default;
            const jsPDF = (await import('jspdf')).default;

            const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
            const imgWidth = 297;
            let firstPage = true;

            for (const student of studentsToExport) {
                // Create a temporary div to render each student report
                const container = document.createElement('div');
                container.style.position = 'absolute';
                container.style.left = '-9999px';
                container.style.top = '0';
                container.style.width = '1122px'; // ~A4 landscape at 96dpi
                container.style.background = '#ffffff';
                container.style.padding = '24px';
                container.style.fontFamily = 'Inter, sans-serif';
                document.body.appendChild(container);

                const { chartData, avgGrade, totalClasses } = getStudentData(student.id);

                const deductionRows = chartData.slice().reverse().map(d => {
                    const r = d.record!;
                    const ded: string[] = [];
                    if (!r.present) {
                        ded.push(r.justifiedAbsence ? 'Falta Justificada (5.0)' : 'Falta (0.0)');
                    } else {
                        if (r.counters.prontidao > 0) ded.push(`${r.counters.prontidao}x Prontidão (-${(r.counters.prontidao * 2.0).toFixed(1)})`);
                        if (r.counters.talk > 0) ded.push(`${r.counters.talk}x Conversa (-${(r.counters.talk * 3.0).toFixed(1)})`);
                        if (r.counters.bathroom > 0) ded.push(`${r.counters.bathroom}x Banheiro (-${(r.counters.bathroom * 3.0).toFixed(1)})`);
                        if (r.counters.sleep > 0) ded.push(`${r.counters.sleep}x Sono (-${(r.counters.sleep * 3.0).toFixed(1)})`);
                        if (r.counters.material === 0) ded.push('Sem Material (-2.5)');
                        if (r.counters.homework === 0) ded.push('Sem Tarefa (-2.5)');
                        if (r.counters.activity < 3) ded.push(`Ativ. Incompleta (-${((3 - r.counters.activity) * 2.5).toFixed(1)})`);
                        if (r.phoneConfiscated) ded.push('Celular (-5.0)');
                        if (r.counters.participation > 0) ded.push(`Participação (+${(r.counters.participation * 0.5).toFixed(1)})`);
                    }
                    return `<tr style="border-bottom:1px solid #e5e7eb">
                        <td style="padding:6px 8px;color:#374151;font-size:11px">${format(new Date(d.fullDate), "dd/MM/yyyy")}</td>
                        <td style="padding:6px 8px;color:#6b7280;font-size:11px">${d.teacherName || '—'}</td>
                        <td style="padding:6px 8px;font-size:11px">${r.present ? '<span style="color:#10b981">✓ SIM</span>' : '<span style="color:#ef4444">✗ NÃO</span>'}</td>
                        <td style="padding:6px 8px;font-size:11px;color:#ef4444">${ded.length > 0 ? ded.join(' | ') : '<span style="color:#9ca3af">Sem deduções</span>'}</td>
                        <td style="padding:6px 8px;text-align:right;font-weight:bold;font-size:13px;color:${Number(d.aluno) >= 7 ? '#10b981' : '#ef4444'}">${d.aluno?.toFixed(1)}</td>
                    </tr>`;
                }).join('');

                container.innerHTML = `
                <div style="display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #065f46;padding-bottom:8px;margin-bottom:16px">
                    <div>
                        <h1 style="font-size:20px;font-weight:bold;color:#065f46;margin:0">Relatório Individual do Aluno</h1>
                        <p style="font-size:11px;color:#374151;margin:4px 0 0">Ano Letivo ${academicYear} &nbsp;|&nbsp; Período: ${startDate} a ${endDate}</p>
                    </div>
                    <span style="font-size:11px;color:#6b7280">EduControl PRO</span>
                </div>
                <div style="display:grid;grid-template-columns:200px 1fr;gap:16px">
                    <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;text-align:center">
                        <img src="${student.photoUrl}" style="width:64px;height:64px;border-radius:50%;object-fit:cover;margin:0 auto 8px;border:2px solid #10b981" />
                        <h2 style="font-size:15px;font-weight:bold;color:#111827;margin:0 0 4px">${student.name}</h2>
                        <p style="font-size:12px;color:#6b7280;margin:0 0 12px">${student.className}</p>
                        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
                            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:8px">
                                <p style="font-size:9px;color:#9ca3af;font-weight:bold;margin:0 0 2px">MÉDIA GERAL</p>
                                <p style="font-size:22px;font-weight:bold;color:${Number(avgGrade) >= 7 ? '#10b981' : '#f97316'};margin:0">${avgGrade}</p>
                            </div>
                            <div style="background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:8px">
                                <p style="font-size:9px;color:#9ca3af;font-weight:bold;margin:0 0 2px">TOTAL AULAS</p>
                                <p style="font-size:22px;font-weight:bold;color:#111827;margin:0">${totalClasses}</p>
                            </div>
                        </div>
                        <div style="margin-top:12px;background:#fff;border:1px solid #e5e7eb;border-radius:6px;padding:8px;text-align:left">
                            <p style="font-size:9px;color:#9ca3af;font-weight:bold;margin:0 0 6px">CRITÉRIOS</p>
                            <p style="font-size:9px;color:#374151;margin:2px 0">✍️ Prontidão: -2,0/ocor.</p>
                            <p style="font-size:9px;color:#374151;margin:2px 0">💬 Conversa: -3,0/ocor.</p>
                            <p style="font-size:9px;color:#374151;margin:2px 0">🚽 Banheiro: -3,0/saída</p>
                            <p style="font-size:9px;color:#374151;margin:2px 0">😴 Dormir: -3,0/ocor.</p>
                            <p style="font-size:9px;color:#374151;margin:2px 0">📚 Material: -2,5</p>
                            <p style="font-size:9px;color:#374151;margin:2px 0">📝 Tarefa: -2,5</p>
                            <p style="font-size:9px;color:#374151;margin:2px 0">⚡ Atividade: -2,5/nível</p>
                            <p style="font-size:9px;color:#374151;margin:2px 0">📱 Celular: -5,0</p>
                        </div>
                    </div>
                    <div style="overflow:auto">
                        <h3 style="font-size:14px;font-weight:bold;color:#111827;margin:0 0 10px">Histórico Detalhado</h3>
                        <table style="width:100%;border-collapse:collapse;font-family:Inter,sans-serif">
                            <thead style="background:#f3f4f6">
                                <tr>
                                    <th style="padding:6px 8px;font-size:10px;color:#6b7280;text-align:left;font-weight:bold">DATA</th>
                                    <th style="padding:6px 8px;font-size:10px;color:#6b7280;text-align:left;font-weight:bold">PROFESSOR</th>
                                    <th style="padding:6px 8px;font-size:10px;color:#6b7280;text-align:left;font-weight:bold">PRESENÇA</th>
                                    <th style="padding:6px 8px;font-size:10px;color:#6b7280;text-align:left;font-weight:bold">OCORRÊNCIAS</th>
                                    <th style="padding:6px 8px;font-size:10px;color:#6b7280;text-align:right;font-weight:bold">NOTA</th>
                                </tr>
                            </thead>
                            <tbody>${deductionRows || '<tr><td colspan="5" style="padding:12px;text-align:center;color:#9ca3af">Nenhum registro no período.</td></tr>'}</tbody>
                        </table>
                    </div>
                </div>`;

                await new Promise(res => setTimeout(res, 50));
                const canvas = await html2canvas(container, { scale: 1.5, useCORS: true, backgroundColor: '#ffffff', logging: false });
                document.body.removeChild(container);

                const imgData = canvas.toDataURL('image/png');
                if (!firstPage) pdf.addPage();
                const pageWidth = 297;
                const pageHeight = (canvas.height * pageWidth) / canvas.width;
                pdf.addImage(imgData, 'PNG', 0, 0, pageWidth, Math.min(pageHeight, 210));
                firstPage = false;
            }

            pdf.save(`Relatorio_Turma_${studentFilterClass || 'Todos'}_${format(new Date(), 'dd-MM-yyyy')}.pdf`);
            onShowToast(`PDF gerado com ${studentsToExport.length} relatórios!`);
        } catch (error) {
            console.error('Bulk PDF Error:', error);
            onShowToast('Erro ao gerar PDF em massa.');
        }
    };

    const handleSendEmail = () => {
        if (currentUserRole !== UserRole.COORDINATOR) return;
        onShowToast("E-mail enviado ao responsável com sucesso!");
    };

    // --- RENDERERS ---

    const renderHeader = () => (
        <div className="flex flex-col gap-4 mb-6 print:hidden">
            {/* Top Row: Report Types */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div className="flex bg-white rounded-lg p-1 border border-gray-200">
                    <button
                        onClick={() => setReportType('STUDENT')}
                        className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${reportType === 'STUDENT' ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:text-gray-800'}`}
                    >
                        <GraduationCap size={14} /> Aluno
                    </button>
                    <button
                        onClick={() => setReportType('CLASS')}
                        className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${reportType === 'CLASS' ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:text-gray-800'}`}
                    >
                        <Users size={14} /> Turma
                    </button>
                    <button
                        onClick={() => setReportType('COMPARE')}
                        className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${reportType === 'COMPARE' ? 'bg-emerald-500 text-white' : 'text-gray-600 hover:text-gray-800'}`}
                    >
                        <BarChart2 size={14} /> Comparativo
                    </button>
                    <button
                        onClick={() => setReportType('ABSENCES')}
                        className={`px-4 py-2 rounded-md text-xs font-bold transition-all flex items-center gap-2 ${reportType === 'ABSENCES' ? 'bg-red-500 text-white' : 'text-gray-600 hover:text-gray-800'}`}
                    >
                        <ClipboardList size={14} /> Frequência
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                    <button
                        onClick={handleDownloadPDF}
                        className="flex items-center gap-2 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 rounded-lg text-xs font-bold border border-gray-200 transition-colors"
                    >
                        <Download size={14} />
                        PDF
                    </button>

                    {reportType === 'STUDENT' && (
                        <button
                            onClick={handleBulkPDF}
                            className="flex items-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200 transition-colors"
                            title="Exportar relatório individual de todos os alunos da turma em um PDF"
                        >
                            <Layers size={14} />
                            Exportar Todos (PDF)
                        </button>
                    )}

                    {reportType === 'STUDENT' && currentUserRole === UserRole.COORDINATOR && (
                        <button
                            onClick={handleSendEmail}
                            className="flex items-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-600 rounded-lg text-xs font-bold border border-emerald-200 transition-colors"
                        >
                            <Send size={14} />
                            Enviar P/ Pais
                        </button>
                    )}
                </div>
            </div>

            {/* Bottom Row: Filters (Date + Specifics) */}
            <div className="bg-white p-3 rounded-lg border border-gray-200 flex flex-wrap items-center gap-4 shadow-sm">
                <div className="flex items-center gap-2 border-r border-gray-200 pr-4 mr-2">
                    <Filter size={16} className="text-emerald-500" />
                    <span className="text-sm font-bold text-gray-800 uppercase">Filtros</span>
                </div>

                {/* Academic Year Selector */}
                <div className="flex flex-col border-r border-gray-200 pr-4 mr-2">
                    <label className="text-[9px] font-bold text-gray-500 uppercase">Ano Letivo</label>
                    <select
                        value={academicYear}
                        onChange={(e) => setAcademicYear(parseInt(e.target.value))}
                        className="bg-gray-50 text-gray-800 border border-gray-200 rounded p-1.5 text-xs outline-none focus:border-emerald-500 font-bold"
                    >
                        <option value={2026}>2026</option>
                    </select>
                </div>

                {/* Quarter/Bimestre Selector */}
                <div className="flex flex-col">
                    <label className="text-[9px] font-bold text-gray-500 uppercase">Filtro de Período</label>
                    <select
                        value={selectedBimestre}
                        onChange={(e) => setSelectedBimestre(e.target.value)}
                        className="bg-gray-50 text-gray-800 text-xs border border-gray-200 rounded p-1.5 outline-none focus:border-emerald-500"
                    >
                        <option value="ANUAL">Personalizado / Anual</option>
                        <option value="1">1º Bimestre</option>
                        <option value="2">2º Bimestre</option>
                        <option value="3">3º Bimestre</option>
                        <option value="4">4º Bimestre</option>
                    </select>
                </div>

                {/* Fallback Date Range Picker for "ANUAL" custom filtering */}
                {selectedBimestre === 'ANUAL' && (
                    <div className="flex items-center gap-2">
                        <div className="flex flex-col">
                            <label className="text-[9px] font-bold text-gray-500 uppercase">De</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-gray-50 text-gray-800 text-xs border border-gray-200 rounded p-1.5 outline-none focus:border-emerald-500"
                            />
                        </div>
                        <div className="flex flex-col">
                            <label className="text-[9px] font-bold text-gray-500 uppercase">Até</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-gray-50 text-gray-800 text-xs border border-gray-200 rounded p-1.5 outline-none focus:border-emerald-500"
                            />
                        </div>
                    </div>
                )}

                <div className="h-8 w-px bg-gray-200 mx-2 hidden md:block"></div>

                {/* Context Specific Filters */}
                {reportType === 'STUDENT' && (
                    <>
                        <div className="flex flex-col">
                            <label className="text-[9px] font-bold text-gray-500 uppercase">Turma</label>
                            <select
                                value={studentFilterClass}
                                onChange={(e) => setStudentFilterClass(e.target.value)}
                                className="bg-white text-gray-800 border border-gray-300 rounded p-1.5 text-xs outline-none focus:border-emerald-500 min-w-[120px]"
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
                                className="bg-white text-gray-800 border border-gray-300 rounded p-1.5 text-xs outline-none focus:border-emerald-500 min-w-[200px]"
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
                            className="bg-white text-gray-800 border border-gray-300 rounded p-1.5 text-xs outline-none focus:border-emerald-500 min-w-[150px]"
                        >
                            {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                )}

                {reportType === 'ABSENCES' && (
                    <div className="flex flex-col">
                        <label className="text-[9px] font-bold text-gray-500 uppercase">Turma</label>
                        <select
                            value={selectedClassName}
                            onChange={(e) => setSelectedClassName(e.target.value)}
                            className="bg-white text-gray-800 border border-gray-300 rounded p-1.5 text-xs outline-none focus:border-red-500 min-w-[150px]"
                        >
                            <option value="">Selecione uma turma...</option>
                            {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>
                )}
            </div>
        </div>
    );

    // --- GRADE DE FREQUÊNCIA (FALTAS) ---
    const renderAbsencesReport = () => {
        if (!selectedClassName) {
            return (
                <div className="text-center p-12 border-2 border-dashed border-red-200 rounded-xl bg-red-50">
                    <ClipboardList size={48} className="mx-auto text-red-300 mb-4" />
                    <p className="text-red-400 font-bold">Selecione uma turma para visualizar a grade de frequência.</p>
                </div>
            );
        }

        // Filtrar sessões da turma no período
        const classSessions = sessions
            .filter(s => s.className === selectedClassName && isSessionInDateRange(s.date))
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        const studentsInClass = students
            .filter(s => s.className === selectedClassName)
            .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

        if (classSessions.length === 0) {
            return (
                <div className="text-center p-12 border-2 border-dashed border-red-200 rounded-xl bg-red-50">
                    <p className="text-red-400 font-bold">Nenhuma aula registrada para esta turma no período selecionado.</p>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {/* Legenda */}
                <div className="flex flex-wrap gap-4 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold">
                    <span className="flex items-center gap-1.5"><span className="w-6 h-6 bg-emerald-100 border border-emerald-300 rounded flex items-center justify-center text-emerald-700 font-black">P</span> Presente</span>
                    <span className="flex items-center gap-1.5"><span className="w-6 h-6 bg-red-100 border border-red-300 rounded flex items-center justify-center text-red-700 font-black">F</span> Falta</span>
                    <span className="flex items-center gap-1.5"><span className="w-6 h-6 bg-amber-100 border border-amber-300 rounded flex items-center justify-center text-amber-700 font-black">FJ</span> Falta Justificada</span>
                    <span className="flex items-center gap-1.5"><span className="w-6 h-6 bg-gray-100 border border-gray-300 rounded flex items-center justify-center text-gray-400 font-black">-</span> Não registrado</span>
                </div>

                {/* Grade horizontal com scroll */}
                <div className="overflow-x-auto rounded-xl border border-gray-200 shadow">
                    <table className="min-w-full border-collapse text-xs">
                        <thead>
                            <tr className="bg-gray-800 text-white">
                                <th className="sticky left-0 z-10 bg-gray-800 text-left px-4 py-3 font-bold min-w-[200px] border-r border-gray-700">Aluno</th>
                                {classSessions.map(sess => (
                                    <th key={sess.id} className="px-2 py-2 text-center font-bold min-w-[60px] border-r border-gray-700">
                                        <div className="flex flex-col items-center">
                                            <span className="text-[10px] text-gray-300">{format(new Date(sess.date), 'EEE', { locale: ptBR }).toUpperCase()}</span>
                                            <span>{format(new Date(sess.date), 'dd/MM')}</span>
                                        </div>
                                    </th>
                                ))}
                                <th className="px-3 py-3 text-center font-bold min-w-[55px] bg-gray-900 text-red-300">FALTAS</th>
                                <th className="px-3 py-3 text-center font-bold min-w-[65px] bg-gray-900 text-emerald-300">FREQ. %</th>
                            </tr>
                        </thead>
                        <tbody>
                            {studentsInClass.map((student, idx) => {
                                let faltasCount = 0;
                                let totalAulas = 0;

                                const cells = classSessions.map(sess => {
                                    const record = sess.records.find(r => r.studentId === student.id);
                                    if (!record) return { type: 'none' };
                                    totalAulas++;
                                    if (record.present) return { type: 'present' };
                                    if (record.justifiedAbsence) return { type: 'justified' };
                                    faltasCount++;
                                    return { type: 'absent' };
                                });

                                const frequency = totalAulas > 0
                                    ? (((totalAulas - faltasCount) / totalAulas) * 100).toFixed(0)
                                    : '100';
                                const freqNum = parseInt(frequency);

                                return (
                                    <tr
                                        key={student.id}
                                        className={`border-b border-gray-100 ${
                                            idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                        } hover:bg-emerald-50 transition-colors`}
                                    >
                                        <td className={`sticky left-0 z-10 px-4 py-2 font-bold text-gray-800 border-r border-gray-200 ${
                                            idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                                        }`}>
                                            {student.name}
                                        </td>
                                        {cells.map((cell, cIdx) => (
                                            <td key={cIdx} className="px-1 py-2 text-center border-r border-gray-100">
                                                {cell.type === 'present' && (
                                                    <span className="w-6 h-6 inline-flex items-center justify-center bg-emerald-100 border border-emerald-300 rounded text-emerald-700 font-black text-[10px]">P</span>
                                                )}
                                                {cell.type === 'absent' && (
                                                    <span className="w-6 h-6 inline-flex items-center justify-center bg-red-100 border border-red-300 rounded text-red-700 font-black text-[10px]">F</span>
                                                )}
                                                {cell.type === 'justified' && (
                                                    <span className="w-6 h-6 inline-flex items-center justify-center bg-amber-100 border border-amber-300 rounded text-amber-700 font-black text-[10px]">FJ</span>
                                                )}
                                                {cell.type === 'none' && (
                                                    <span className="w-6 h-6 inline-flex items-center justify-center bg-gray-100 border border-gray-200 rounded text-gray-400 text-[10px]">-</span>
                                                )}
                                            </td>
                                        ))}
                                        <td className="px-3 py-2 text-center font-black text-red-600 bg-red-50">{faltasCount}</td>
                                        <td className={`px-3 py-2 text-center font-black ${
                                            freqNum >= 75 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'
                                        }`}>{frequency}%</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>

                {/* Resumo */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {(() => {
                        let totalFaltas = 0;
                        let totalComFalta = 0;
                        studentsInClass.forEach(student => {
                            classSessions.forEach(sess => {
                                const rec = sess.records.find(r => r.studentId === student.id);
                                if (rec && !rec.present && !rec.justifiedAbsence) {
                                    totalFaltas++;
                                    totalComFalta++;
                                }
                            });
                        });
                        const aboveAlert = studentsInClass.filter(student => {
                            let f = 0;
                            classSessions.forEach(sess => {
                                const rec = sess.records.find(r => r.studentId === student.id);
                                if (rec && !rec.present && !rec.justifiedAbsence) f++;
                            });
                            return (classSessions.length > 0 && (f / classSessions.length) > 0.25);
                        }).length;

                        return (
                            <>
                                <SummaryCard label="Total de Aulas" value={classSessions.length} color="blue" />
                                <SummaryCard label="Total de Faltas" value={totalFaltas} color="red" />
                                <SummaryCard label="Alunos c/ +25% Faltas" value={aboveAlert} color="orange" />
                                <SummaryCard label="Total de Alunos" value={studentsInClass.length} color="green" />
                            </>
                        );
                    })()}
                </div>
            </div>
        );
    };

    const renderStudentReport = () => {
        const { chartData, avgGrade, totalClasses, student } = getStudentData(selectedStudentId);
        if (!student) return <div className="text-gray-400 p-8 text-center bg-[#0f172a] rounded-xl border border-gray-800 border-dashed">Selecione um aluno para visualizar o relatório.</div>;

        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column: Profile & Summary */}
                <div className="space-y-6">
                    <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center text-center shadow-lg relative break-inside-avoid">
                        <div className="w-24 h-24 rounded-full p-1 border-2 border-emerald-500 mb-3">
                            <img src={student.photoUrl} className="w-full h-full rounded-full object-cover" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">{student.name}</h2>
                        <p className="text-gray-500 text-sm mb-4">{student.className}</p>

                        <div className="grid grid-cols-2 gap-3 w-full mb-4">
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <p className="text-[10px] text-gray-500 font-bold uppercase">Média Geral</p>
                                <p className={`text-2xl font-bold ${Number(avgGrade) >= 7 ? 'text-emerald-500' : 'text-orange-500'}`}>{avgGrade}</p>
                            </div>
                            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <p className="text-[10px] text-gray-500 font-bold uppercase">Total Aulas</p>
                                <p className="text-2xl font-bold text-gray-800">{totalClasses}</p>
                            </div>
                        </div>
                        <div className="text-[10px] text-gray-500">Período: {format(new Date(startDate), 'dd/MM')} a {format(new Date(endDate), 'dd/MM')}</div>
                    </div>

                    {/* Criteria Table Legend */}
                    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-lg break-inside-avoid">
                        <h3 className="text-sm font-bold text-gray-800 mb-4 flex items-center gap-2">
                            <AlertCircle size={16} className="text-emerald-500" /> Critérios de Avaliação
                        </h3>
                        <div className="space-y-3">
                            <CriteriaRow label="Prontidão" desc="-2,0 por ocorrência" val="até -6,0" />
                            <CriteriaRow label="Conversa" desc="-3,0 por ocorrência" val="até -9,0" />
                            <CriteriaRow label="Banheiro" desc="-3,0 por saída" val="Sem teto" />
                            <CriteriaRow label="Dormir" desc="-3,0 por ocorrência" val="Sem teto" />
                            <CriteriaRow label="Material" desc="Sem material (Sim/Não)" val="-2,5" />
                            <CriteriaRow label="Tarefas" desc="Não fez (Sim/Não)" val="-2,5" />
                            <CriteriaRow label="Atividade" desc="-2,5 por nível perdido (0-3)" val="até -7,5" />
                            <CriteriaRow label="Celular" desc="Uso não autorizado" val="-5,0" />
                        </div>
                    </div>
                </div>

                {/* Right Column: Chart & History */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Evolution Chart */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg break-inside-avoid">
                        <div className="flex justify-between items-center mb-6">
                            <div>
                                <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                    <TrendingUp className="text-emerald-500" size={20} />
                                    Evolução de Desempenho
                                </h3>
                                <p className="text-xs text-gray-500">Comparativo: Aluno vs. Média da Turma</p>
                            </div>
                        </div>

                        <div className="h-72 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="date" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                    <YAxis domain={[0, 10]} stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #e5e7eb', color: '#1f2937' }}
                                        itemStyle={{ color: '#1f2937' }}
                                        formatter={(value: number) => [value.toFixed(1), 'Nota']}
                                        labelStyle={{ color: '#6b7280', marginBottom: '0.5rem' }}
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
                                        stroke="#94a3b8"
                                        strokeWidth={2}
                                        strokeDasharray="5 5"
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Detailed History Table */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg break-inside-avoid">
                        <h3 className="text-lg font-bold text-gray-800 mb-4">Histórico Detalhado</h3>
                        <div className="overflow-x-auto -mx-6 px-6">
                            <div className="inline-block min-w-full align-middle">
                                <div className="overflow-hidden border border-gray-200 rounded-lg">
                                    <table className="min-w-full text-left">
                                        <thead className="bg-gray-50 text-xs font-bold text-gray-500 uppercase border-b border-gray-200">
                                            <tr>
                                                <th className="px-4 py-3 sticky left-0 bg-gray-50 z-10 border-r border-gray-200">Data</th>
                                                <th className="px-4 py-3">Professor</th>
                                                <th className="px-4 py-3">Presença</th>
                                                <th className="px-4 py-3">Ocorrências (Deduções)</th>
                                                <th className="px-4 py-3 text-right rounded-tr-lg">Nota Final</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 text-sm">
                                            {chartData.length === 0 && (
                                                <tr><td colSpan={4} className="p-4 text-center text-gray-500">Nenhum registro encontrado neste período.</td></tr>
                                            )}
                                            {chartData.slice().reverse().map((d, idx) => { // Show newest first
                                                const r = d.record!;
                                                const deductions = [];

                                                if (!r.present) {
                                                    deductions.push(r.justifiedAbsence ? "Falta Justificada (Nota 5.0)" : "Falta (Nota 0.0)");
                                                } else {
                                                    if ((r.counters.prontidao || 0) > 0) deductions.push(`${r.counters.prontidao}x Prontidão (-${(r.counters.prontidao * 2.0).toFixed(1)})`);
                                                    if (r.counters.talk > 0) deductions.push(`${r.counters.talk}x Conversa (-${(r.counters.talk * 3.0).toFixed(1)})`);
                                                    if (r.counters.bathroom > 0) deductions.push(`${r.counters.bathroom}x Banheiro (-${(r.counters.bathroom * 3.0).toFixed(1)})`);
                                                    if (r.counters.sleep > 0) deductions.push(`${r.counters.sleep}x Sono (-${(r.counters.sleep * 3.0).toFixed(1)})`);
                                                    if (r.counters.material === 0) deductions.push(`Sem Material (-2.5)`);
                                                    if (r.counters.homework === 0) deductions.push(`Sem Tarefa (-2.5)`);
                                                    if (r.counters.activity < 3) deductions.push(`Ativ. Incompleta (-${((3 - r.counters.activity) * 2.5).toFixed(1)})`);
                                                    if (r.phoneConfiscated) deductions.push(`Celular (-5.0)`);
                                                    if (r.counters.participation > 0) deductions.push(`Participação (+${(r.counters.participation * 0.5).toFixed(1)})`);
                                                }

                                                return (
                                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-4 py-3 text-gray-800 border-r border-gray-200">
                                                            <div>
                                                                {format(new Date(d.fullDate), "dd 'de' MMMM", { locale: ptBR })}
                                                                {d.blocksCount > 1 && <span className="ml-2 text-[10px] bg-emerald-100 text-emerald-600 px-1.5 py-0.5 rounded font-bold border border-emerald-200">{d.blocksCount} aulas</span>}
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-gray-600 text-xs">
                                                            {d.teacherName || '---'}
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {r.present
                                                                ? <span className="text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 size={14} /> SIM</span>
                                                                : <span className="text-red-500 font-bold flex items-center gap-1"><AlertCircle size={14} /> NÃO</span>
                                                            }
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {deductions.length > 0 ? (
                                                                <div className="flex flex-wrap gap-1">
                                                                    {deductions.map((ded, i) => (
                                                                        <span key={i} className={`text-[10px] px-2 py-0.5 rounded border ${ded.includes('+') ? 'bg-emerald-50 text-emerald-600 border-emerald-200' : 'bg-red-50 text-red-500 border-red-200'}`}>
                                                                            {ded}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            ) : (
                                                                <span className="text-gray-400 text-xs italic">Sem deduções</span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-3 text-right">
                                                            <span className={`font-bold text-lg ${Number(d.aluno) >= 10 ? 'text-emerald-500' : Number(d.aluno) >= 6 ? 'text-gray-800' : 'text-red-500'}`}>
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
                    <div className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col items-center text-center shadow-lg break-inside-avoid">
                        <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mb-3">
                            <Users size={32} className="text-emerald-500" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-800">{selectedClassName}</h2>
                        <p className="text-gray-500 text-sm mb-4">{totalSessions} aulas registradas</p>

                        <div className="w-full bg-gray-50 p-4 rounded-lg border border-gray-200">
                            <p className="text-xs text-gray-500 font-bold uppercase mb-1">Média Geral da Turma</p>
                            <p className={`text-3xl font-bold ${Number(globalAvg) >= 7 ? 'text-emerald-500' : 'text-orange-500'}`}>{globalAvg}</p>
                        </div>
                        <div className="mt-2 text-[10px] text-gray-500">Período: {format(new Date(startDate), 'dd/MM')} a {format(new Date(endDate), 'dd/MM')}</div>
                    </div>

                    {/* Performance Chart */}
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg break-inside-avoid">
                        <h3 className="text-sm font-bold text-gray-800 mb-4">Desempenho Diário</h3>
                        <div className="h-48 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={dailyAvgData}>
                                    <XAxis dataKey="date" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                                    <YAxis domain={[0, 10]} stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} width={20} />
                                    <Tooltip contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', fontSize: '12px', color: '#1f2937' }} itemStyle={{ color: '#1f2937' }} />
                                    <Line type="monotone" dataKey="avg" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Right Column: Student List */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-6 shadow-lg break-inside-avoid">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-gray-800">Desempenho Individual</h3>
                        <div className="text-[10px] text-gray-500 italic">Clique nos cabeçalhos para ordenar</div>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-[10px] font-bold text-gray-500 uppercase border-b border-gray-200">
                                <tr>
                                    <th className="px-2 py-3 rounded-tl-lg">Aluno</th>
                                    <SortableHeader label="Nota" sortKey="avg" currentSort={sortConfig} onSort={setSortConfig} />
                                    <SortableHeader label="Pres." sortKey="attendance" currentSort={sortConfig} onSort={setSortConfig} />
                                    <SortableHeader label="Conv." sortKey="talk" currentSort={sortConfig} onSort={setSortConfig} />
                                    <SortableHeader label="Sono" sortKey="sleep" currentSort={sortConfig} onSort={setSortConfig} />
                                    <SortableHeader label="Banh." sortKey="bathroom" currentSort={sortConfig} onSort={setSortConfig} />
                                    <SortableHeader label="Mat." sortKey="material" currentSort={sortConfig} onSort={setSortConfig} />
                                    <SortableHeader label="Tare." sortKey="homework" currentSort={sortConfig} onSort={setSortConfig} />
                                    <SortableHeader label="Ativ." sortKey="activity" currentSort={sortConfig} onSort={setSortConfig} />
                                    <SortableHeader label="Cel." sortKey="phone" currentSort={sortConfig} onSort={setSortConfig} />
                                    <SortableHeader label="Part." sortKey="participation" currentSort={sortConfig} onSort={setSortConfig} rounded />
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 text-xs">
                                {studentPerformances.length === 0 ? (
                                    <tr><td colSpan={10} className="p-4 text-center text-gray-500">Sem dados neste período.</td></tr>
                                ) : (
                                    studentPerformances.map((s, idx) => (
                                        <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-2 py-3 flex items-center gap-2 min-w-[150px]">
                                                <span className="text-gray-500 text-[10px] w-4">{idx + 1}.</span>
                                                <img src={s.photoUrl} className="w-6 h-6 rounded-full" />
                                                <span className="text-gray-800 font-medium truncate">{s.name}</span>
                                            </td>
                                            <td className="px-2 py-3">
                                                <span className={`font-bold ${s.avg >= 7 ? 'text-emerald-500' : 'text-red-500'}`}>
                                                    {s.avg.toFixed(1)}
                                                </span>
                                            </td>
                                            <td className="px-2 py-3">
                                                <span className="text-gray-800">{s.attendance.toFixed(0)}%</span>
                                            </td>
                                            <td className={`px-2 py-3 ${s.talk < 0 ? 'text-red-500' : 'text-gray-500'}`}>{s.talk === 0 ? '0.0' : s.talk.toFixed(1)}</td>
                                            <td className={`px-2 py-3 ${s.sleep < 0 ? 'text-red-500' : 'text-gray-500'}`}>{s.sleep === 0 ? '0.0' : s.sleep.toFixed(1)}</td>
                                            <td className={`px-2 py-3 ${s.bathroom < 0 ? 'text-red-500' : 'text-gray-500'}`}>{s.bathroom === 0 ? '0.0' : s.bathroom.toFixed(1)}</td>
                                            <td className={`px-2 py-3 ${s.material < 0 ? 'text-red-500' : 'text-gray-500'}`}>{s.material === 0 ? '0.0' : s.material.toFixed(1)}</td>
                                            <td className={`px-2 py-3 ${s.homework < 0 ? 'text-red-500' : 'text-gray-500'}`}>{s.homework === 0 ? '0.0' : s.homework.toFixed(1)}</td>
                                            <td className={`px-2 py-3 ${s.activity < 0 ? 'text-red-500' : 'text-gray-500'}`}>{s.activity === 0 ? '0.0' : s.activity.toFixed(1)}</td>
                                            <td className={`px-2 py-3 ${s.phone < 0 ? 'text-red-500' : 'text-gray-500'}`}>{s.phone === 0 ? '0.0' : s.phone.toFixed(1)}</td>
                                            <td className={`px-2 py-3 ${s.participation > 0 ? 'text-emerald-500' : 'text-gray-500'}`}>{s.participation === 0 ? '0.0' : `+${s.participation.toFixed(1)}`}</td>
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
            <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
                <h4 className="text-xs font-bold text-gray-600 uppercase mb-3">{title}</h4>
                <div className="h-40 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                            <XAxis dataKey="name" stroke="#6b7280" fontSize={10} tickLine={false} axisLine={false} />
                            <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', fontSize: '10px', color: '#1f2937' }} itemStyle={{ color: '#1f2937' }} formatter={(val: number) => val + unit} />
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
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg break-inside-avoid">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-800">Média Geral por Turma</h3>
                            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">Período Selecionado</span>
                        </div>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis domain={[0, 10]} stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#1f2937' }} itemStyle={{ color: '#1f2937' }} />
                                    <Bar dataKey="avgGrade" name="Nota Média" fill="#10b981" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg break-inside-avoid">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-lg font-bold text-gray-800">Taxa de Presença por Turma</h3>
                            <span className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">Período Selecionado</span>
                        </div>
                        <div className="h-64 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={data}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                                    <XAxis dataKey="name" stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                                    <YAxis domain={[0, 100]} stroke="#6b7280" fontSize={12} tickLine={false} axisLine={false} />
                                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', color: '#1f2937' }} itemStyle={{ color: '#1f2937' }} />
                                    <Bar dataKey="attendance" name="Presença (%)" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={40} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Criteria Breakdown */}
                <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-lg break-inside-avoid">
                    <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
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
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-[210mm] mx-auto overflow-visible bg-white p-6 shadow-2xl print:shadow-none print:p-0">
                    {/* Header Info for Report */}
                    <div className="flex justify-between items-end border-b-2 border-emerald-800 pb-2 mb-6 gap-4">
                        <div className="flex items-center gap-4">
                            {schoolLogoUrl ? (
                                <img src={schoolLogoUrl} alt="Logo" className="max-h-16 object-contain" />
                            ) : (
                                <div className="p-2 border border-emerald-200 bg-emerald-50 rounded-lg">
                                    <GraduationCap className="text-emerald-500" size={32} />
                                </div>
                            )}
                            <div>
                                <h1 className="text-2xl font-bold uppercase text-emerald-900 tracking-tight">
                                    {reportType === 'STUDENT' ? 'Relatório Individual do Aluno' :
                                        reportType === 'CLASS' ? 'Relatório de Desempenho da Turma' :
                                        reportType === 'ABSENCES' ? 'Grade de Frequência / Chamada' :
                                            'Comparativo Geral'}
                                </h1>
                                <p className="text-xs text-gray-800 font-bold mt-1">
                                    Ano Letivo {academicYear}
                                </p>
                            </div>
                        </div>
                        <div className="text-right hidden sm:block">
                            <p className="font-bold text-gray-800 text-xs mt-2">EduControl PRO</p>
                        </div>
                    </div>

                    {reportType === 'STUDENT' && renderStudentReport()}
                    {reportType === 'CLASS' && renderClassReport()}
                    {reportType === 'COMPARE' && renderComparativeReport()}
                    {reportType === 'ABSENCES' && renderAbsencesReport()}
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

const SummaryCard = ({ label, value, color }: { label: string, value: number, color: 'blue' | 'red' | 'orange' | 'green' }) => {
    const colors = {
        blue: 'bg-blue-50 border-blue-200 text-blue-700',
        red: 'bg-red-50 border-red-200 text-red-700',
        orange: 'bg-orange-50 border-orange-200 text-orange-700',
        green: 'bg-emerald-50 border-emerald-200 text-emerald-700',
    };
    return (
        <div className={`p-4 rounded-xl border ${colors[color]} flex flex-col items-center justify-center`}>
            <span className="text-3xl font-black">{value}</span>
            <span className="text-[10px] font-bold uppercase mt-1 text-center">{label}</span>
        </div>
    );
};
