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

            // Forçar scroll para o topo para captura correta
            window.scrollTo(0, 0);

            const canvas = await html2canvas(element as HTMLElement, {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff',
                allowTaint: true,
            });

            const imgData = canvas.toDataURL('image/png', 1.0);
            
            // Configuração A4 Retrato
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = pdfWidth / imgWidth;
            const canvasPageHeight = pdfHeight / ratio;
            
            let heightLeft = imgHeight;
            let position = 0;
            let page = 1;

            // Adiciona a primeira página
            pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight * ratio, undefined, 'FAST');
            heightLeft -= canvasPageHeight;

            // Adiciona páginas subsequentes se necessário (evita cortes)
            while (heightLeft > 0) {
                position = heightLeft - imgHeight;
                pdf.addPage();
                pdf.addImage(imgData, 'PNG', 0, position * ratio, pdfWidth, imgHeight * ratio, undefined, 'FAST');
                heightLeft -= canvasPageHeight;
                page++;
            }

            pdf.save(`Relatorio_${reportType}_${selectedStudentId || 'Geral'}_${format(new Date(), 'dd-MM-yyyy')}.pdf`);
            onShowToast("PDF baixado com sucesso!");
        } catch (error) {
            console.error("PDF Generation Error:", error);
            onShowToast("Erro ao gerar PDF.");
        }
    };

    const handleDownloadAttendancePDF = async () => {
        onShowToast("Preparando relatório de frequência mensal (PDF)...");
        try {
            const html2canvas = (await import('html2canvas')).default;
            const jsPDF = (await import('jspdf')).default;

            const container = document.getElementById('attendance-report-container');
            if (!container) {
                onShowToast("Erro: Container do relatório não encontrado.");
                return;
            }

            // Buscar todos os blocos (meses + resumo)
            const monthBlocks = Array.from(container.querySelectorAll('.break-after-page, .break-before-page'));
            
            const pdf = new jsPDF({
                orientation: 'portrait',
                unit: 'mm',
                format: 'a4'
            });

            for (let i = 0; i < monthBlocks.length; i++) {
                const block = monthBlocks[i] as HTMLElement;
                
                // Forçar background branco e padding para o capture
                const canvas = await html2canvas(block, {
                    scale: 2,
                    useCORS: true,
                    backgroundColor: '#ffffff'
                });

                const imgData = canvas.toDataURL('image/png');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const imgHeight = (canvas.height * pdfWidth) / canvas.width;

                if (i > 0) pdf.addPage();
                
                // Centralizar verticalmente se for menor que a página, ou começar do topo
                pdf.addImage(imgData, 'PNG', 0, 10, pdfWidth, Math.min(imgHeight, 280));
            }

            pdf.save(`Frequencia_${selectedClassName}_${format(new Date(), 'MM-yyyy')}.pdf`);
            onShowToast("Relatório de Frequência baixado com sucesso!");
        } catch (error) {
            console.error("Attendance PDF Error:", error);
            onShowToast("Erro ao gerar PDF de frequência.");
        }
    };

    const handleBulkPDF = async () => {
        const studentsToExport = studentFilterClass
            ? students.filter(s => s.className === studentFilterClass)
            : students;

        if (studentsToExport.length === 0) {
            onShowToast('Nenhum aluno encontrado para exportar.');
            return;
        }

        onShowToast(`Gerando PDF premium para ${studentsToExport.length} alunos... Aguarde.`);

        try {
            const html2canvas = (await import('html2canvas')).default;
            const jsPDF = (await import('jspdf')).default;
            const { renderToStaticMarkup } = await import('react-dom/server');

            const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
            
            for (let i = 0; i < studentsToExport.length; i++) {
                const student = studentsToExport[i];
                const { chartData, avgGrade, totalClasses } = getStudentData(student.id);

                // Criar um container temporário para renderizar o relatório do aluno
                // Usaremos um elemento fixo para garantir que o layout 'Retrato' seja forçado
                const printContainer = document.createElement('div');
                printContainer.style.position = 'absolute';
                printContainer.style.left = '-9999px';
                printContainer.style.top = '0';
                printContainer.style.width = '210mm'; // Largura A4 Real
                printContainer.style.background = '#ffffff';
                document.body.appendChild(printContainer);

                // Injetar o design premium original
                // Como não podemos usar hooks dentro de renderToStaticMarkup facilmente para componentes complexos,
                // vamos clonar a estrutura visual do renderStudentReport manualmente mas com estilo inline fixo
                
                const deductionRows = chartData.slice().reverse().map(d => {
                    const r = d.record!;
                    const ded: string[] = [];
                    if (!r.present) {
                        ded.push(r.justifiedAbsence ? 'Falta Justificada' : 'Falta');
                    } else {
                        if (r.counters.prontidao > 0) ded.push(`Prontidão`);
                        if (r.counters.talk > 0) ded.push(`Conversa`);
                        if (r.counters.bathroom > 0) ded.push(`Banheiro`);
                        if (r.counters.sleep > 0) ded.push(`Sono`);
                        if (r.counters.material === 0) ded.push('Sem Mat.');
                        if (r.counters.homework === 0) ded.push('Sem Tarefa');
                        if (r.counters.activity < 3) ded.push(`Ativ. Incomp.`);
                        if (r.phoneConfiscated) ded.push('Celular');
                        if (r.counters.participation > 0) ded.push(`Partic.`);
                    }
                    return `
                        <tr style="border-bottom:1px solid #f1f5f9">
                            <td style="padding:10px 8px; font-size:11px; color:#1e293b">${format(new Date(d.fullDate), "dd/MM/yyyy")}</td>
                            <td style="padding:10px 8px; font-size:11px; color:#64748b">${d.teacherName || '—'}</td>
                            <td style="padding:10px 8px; font-size:11px; color:${r.present ? '#10b981' : '#ef4444'}; font-weight:bold">${r.present ? 'SIM' : 'NÃO'}</td>
                            <td style="padding:10px 8px; font-size:10px; color:#64748b">${ded.join(' | ') || 'Sem ocorrências'}</td>
                            <td style="padding:10px 8px; font-size:13px; color:${Number(d.aluno) >= 7 ? '#10b981' : '#ef4444'}; font-weight:900; text-align:right">${d.aluno?.toFixed(1)}</td>
                        </tr>
                    `;
                }).join('');

                const criteriaHtml = [
                    { label: "Prontidão", desc: "-2,0 p/ ocorr.", val: "-6,0" },
                    { label: "Conversa", desc: "-3,0 p/ ocorr.", val: "-9,0" },
                    { label: "Banheiro", desc: "-3,0 p/ saída", val: "Fixo" },
                    { label: "Dormir", desc: "-3,0 p/ ocorr.", val: "Fixo" },
                    { label: "Material", desc: "Uso Obrigatório", val: "-2,5" },
                    { label: "Tarefas", desc: "Entrega Diária", val: "-2,5" },
                    { label: "Atividade", desc: "Produtividade", val: "-7,5" },
                    { label: "Celular", desc: "Uso Proibido", val: "-5,0" }
                ].map(c => `
                    <div style="display:flex; justify-content:space-between; border-bottom:1px solid #f1f5f9; padding-bottom:6px; margin-bottom:6px">
                        <div>
                            <div style="font-size:11px; font-weight:bold; color:#334155">${c.label}</div>
                            <div style="font-size:9px; color:#94a3b8">${c.desc}</div>
                        </div>
                        <div style="font-size:11px; font-weight:bold; color:#ef4444; background:#fef2f2; padding:2px 6px; border-radius:4px">${c.val}</div>
                    </div>
                `).join('');

                printContainer.innerHTML = `
                    <div style="padding:40px; font-family: sans-serif; background:#ffffff">
                        <!-- Cabeçalho -->
                        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:3px solid #065f46; padding-bottom:15px; margin-bottom:25px">
                            <div style="display:flex; align-items:center; gap:20px">
                                ${schoolLogoUrl ? `<img src="${schoolLogoUrl}" style="height:60px; object-contain" />` : '<div style="width:60px; height:60px; background:#f0fdf4; border-radius:12px; display:flex; align-items:center; justify-content:center; color:#10b981; font-weight:bold">EDU</div>'}
                                <div>
                                    <h1 style="margin:0; font-size:24px; color:#064e3b; text-transform:uppercase; letter-spacing:-0.5px">Relatório Individual</h1>
                                    <div style="font-size:12px; font-weight:bold; color:#334155; margin-top:4px">Ano Letivo ${academicYear} | Período: ${format(new Date(startDate), "dd/MM")} a ${format(new Date(endDate), "dd/MM")}</div>
                                </div>
                            </div>
                            <div style="text-align:right; color:#64748b; font-size:10px; font-weight:bold">EduControl PRO</div>
                        </div>

                        <div style="display:grid; grid-template-columns: 200px 1fr; gap:30px">
                            <!-- Perfil Lateral -->
                            <div>
                                <div style="background:#f8fafc; border:1px solid #f1f5f9; border-radius:16px; padding:20px; text-align:center; margin-bottom:20px">
                                    <img src="${student.photoUrl}" style="width:100px; height:100px; border-radius:50%; object-fit:cover; border:3px solid #10b981; margin:0 auto 15px" />
                                    <h2 style="margin:0 0 5px; font-size:18px; color:#1e293b">${student.name}</h2>
                                    <div style="font-size:13px; color:#64748b; margin-bottom:20px">${student.className}</div>
                                    
                                    <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px">
                                        <div style="background:#ffffff; padding:10px; border-radius:12px; border:1px solid #f1f5f9">
                                            <div style="font-size:9px; font-weight:bold; color:#94a3b8; text-transform:uppercase">Média</div>
                                            <div style="font-size:20px; font-weight:900; color:${Number(avgGrade) >= 7 ? '#10b981' : '#f97316'}">${avgGrade}</div>
                                        </div>
                                        <div style="background:#ffffff; padding:10px; border-radius:12px; border:1px solid #f1f5f9">
                                            <div style="font-size:9px; font-weight:bold; color:#94a3b8; text-transform:uppercase">Aulas</div>
                                            <div style="font-size:20px; font-weight:900; color:#1e293b">${totalClasses}</div>
                                        </div>
                                    </div>
                                </div>

                                <!-- Critérios -->
                                <div style="background:#ffffff; border:1px solid #f1f5f9; border-radius:16px; padding:20px; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.05)">
                                    <h3 style="font-size:13px; font-weight:bold; color:#1e293b; margin:0 0 15px; display:flex; align-items:center; gap:8px">Critérios de Avaliação</h3>
                                    ${criteriaHtml}
                                </div>
                            </div>

                            <!-- Conteúdo Principal -->
                            <div>
                                <h3 style="font-size:16px; font-weight:bold; color:#1e293b; margin:0 0 15px">Histórico Detalhado</h3>
                                <table style="width:100%; border-collapse:collapse">
                                    <thead>
                                        <tr style="background:#f8fafc; border-bottom:2px solid #f1f5f9">
                                            <th style="padding:12px 8px; text-align:left; font-size:10px; color:#64748b; text-transform:uppercase">Data</th>
                                            <th style="padding:12px 8px; text-align:left; font-size:10px; color:#64748b; text-transform:uppercase">Docente</th>
                                            <th style="padding:12px 8px; text-align:left; font-size:10px; color:#64748b; text-transform:uppercase">Pres.</th>
                                            <th style="padding:12px 8px; text-align:left; font-size:10px; color:#64748b; text-transform:uppercase">Ocorrências</th>
                                            <th style="padding:12px 8px; text-align:right; font-size:10px; color:#64748b; text-transform:uppercase">Nota</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${deductionRows || '<tr><td colspan="5" style="padding:30px; text-align:center; color:#94a3b8">Sem registros no período.</td></tr>'}
                                    </tbody>
                                </table>
                                
                                <div style="margin-top:40px; border-top:1px solid #f1f5f9; padding-top:20px; display:flex; justify-content:space-between">
                                    <div style="width:200px; text-align:center">
                                        <div style="border-top:1px solid #cbd5e1; margin-bottom:5px"></div>
                                        <div style="font-size:9px; color:#64748b; font-weight:bold">Assinatura do Responsável</div>
                                    </div>
                                    <div style="width:200px; text-align:center">
                                        <div style="border-top:1px solid #cbd5e1; margin-bottom:5px"></div>
                                        <div style="font-size:9px; color:#64748b; font-weight:bold">Assinatura da Coordenação</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;

                await new Promise(res => setTimeout(res, 100)); // Esperar renderização/imagens
                const canvas = await html2canvas(printContainer, { scale: 2, useCORS: true, backgroundColor: '#ffffff', logging: false });
                document.body.removeChild(printContainer);

                const imgData = canvas.toDataURL('image/png', 1.0);
                if (i > 0) pdf.addPage();
                
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const ratio = pdfWidth / canvas.width;
                const imgHeight = canvas.height * ratio;

                // Adicionar imagem do aluno (se for maior que uma página, precisaremos de um loop igual ao download individual)
                // Mas geralmente 1 aluno cabe em 1 ou 2 páginas. Vamos simplificar adicionando a primeira parte e verificando.
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight, undefined, 'FAST');
                
                // Se o conteúdo for maior que a página, adiciona páginas extras para esse aluno específico
                let heightLeft = imgHeight - pdfHeight;
                let position = -pdfHeight;
                while (heightLeft > 0) {
                    pdf.addPage();
                    pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, imgHeight, undefined, 'FAST');
                    heightLeft -= pdfHeight;
                    position -= pdfHeight;
                }
            }

            pdf.save(`Bulk_Relatorio_${selectedClassName}_${format(new Date(), 'dd-MM-yyyy')}.pdf`);
            onShowToast(`PDF gerado com ${studentsToExport.length} relatórios premium!`);
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

    // --- GRADE DE FREQUÊNCIA MENSAL (PARA PDF E TELA) ---
    const renderAbsencesReport = () => {
        if (!selectedClassName) {
            return (
                <div className="text-center p-12 border-2 border-dashed border-red-200 rounded-xl bg-red-50">
                    <ClipboardList size={48} className="mx-auto text-red-300 mb-4" />
                    <p className="text-red-400 font-bold">Selecione uma turma para visualizar a grade de frequência.</p>
                </div>
            );
        }

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

        // Agrupar por mês
        const sessionsByMonth: { [key: string]: ClassSession[] } = {};
        classSessions.forEach(sess => {
            const month = format(new Date(sess.date), 'MMMM', { locale: ptBR });
            if (!sessionsByMonth[month]) sessionsByMonth[month] = [];
            sessionsByMonth[month].push(sess);
        });

        // Totais Acumulados para o Resumo Final
        const studentSummaries = studentsInClass.map(student => {
            let totalAulas = 0;
            let totalPresencas = 0;
            let totalFaltas = 0;

            classSessions.forEach(sess => {
                const record = sess.records.find(r => r.studentId === student.id);
                if (record) {
                    const bCount = sess.blocksCount || 1;
                    totalAulas += bCount;

                    // 1ª Chamada
                    if (record.present) totalPresencas++;
                    else totalFaltas++;

                    // 2ª Chamada
                    if (bCount > 1) {
                        if (record.present2 !== false) totalPresencas++;
                        else totalFaltas++;
                    }
                }
            });

            return {
                id: student.id,
                name: student.name,
                totalAulas,
                totalPresencas,
                totalFaltas,
                frequency: totalAulas > 0 ? ((totalPresencas / totalAulas) * 100).toFixed(0) : '100'
            };
        });

        return (
            <div id="attendance-report-container" className="space-y-12">
                {/* Botão de Download Exclusivo para Frequência (Apenas Tela) */}
                <div className="flex justify-end no-print">
                    <button
                        onClick={handleDownloadAttendancePDF}
                        className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold flex items-center gap-2 transition-all shadow-lg active:scale-95"
                    >
                        <Download size={20} />
                        Baixar Frequência Mensal (PDF)
                    </button>
                </div>

                {/* Legenda (Apenas Tela) */}
                <div className="flex flex-wrap gap-4 p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold no-print">
                    <span className="flex items-center gap-1.5 font-black uppercase text-gray-500">Legenda:</span>
                    <span className="flex items-center gap-1.5"><span className="w-5 h-5 bg-emerald-100 border border-emerald-300 rounded flex items-center justify-center text-emerald-700">P</span> Presente</span>
                    <span className="flex items-center gap-1.5"><span className="w-5 h-5 bg-red-100 border border-red-300 rounded flex items-center justify-center text-red-700">F</span> Falta</span>
                    <span className="flex items-center gap-1.5"><span className="w-5 h-5 bg-amber-100 border border-amber-300 rounded flex items-center justify-center text-amber-700">FJ</span> Justificada</span>
                    <span className="flex items-center gap-1.5 ml-auto text-gray-400 font-normal italic">* FJ conta como ausência na frequência</span>
                </div>

                {Object.entries(sessionsByMonth).map(([month, monthSessions]) => (
                    <div key={month} className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden break-after-page mb-8">
                        <div className="bg-gray-800 text-white px-6 py-3 flex justify-between items-center">
                            <h3 className="font-bold uppercase tracking-wider">{month} / {academicYear}</h3>
                            <span className="text-[10px] bg-gray-700 px-2 py-1 rounded">{selectedClassName}</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="min-w-full border-collapse text-[10px]">
                                <thead>
                                    <tr className="bg-gray-50 text-gray-600 border-b border-gray-200">
                                        <th className="sticky left-0 z-10 bg-gray-50 text-left px-4 py-2 font-bold min-w-[180px] border-r border-gray-200">Aluno</th>
                                        {monthSessions.map(sess => (
                                            <th key={sess.id} className="px-1 py-1 text-center font-bold min-w-[45px] border-r border-gray-200">
                                                <div className="flex flex-col items-center">
                                                    <span className="text-[8px] opacity-60">{format(new Date(sess.date), 'EEE', { locale: ptBR }).toUpperCase()}</span>
                                                    <span>{format(new Date(sess.date), 'dd')}</span>
                                                    {sess.blocksCount > 1 && <span className="text-[7px] text-blue-500">(2h)</span>}
                                                </div>
                                            </th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {studentsInClass.map((student, sIdx) => (
                                        <tr key={student.id} className={`border-b border-gray-50 ${sIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                            <td className={`sticky left-0 z-10 px-4 py-1.5 font-medium text-gray-800 border-r border-gray-200 ${sIdx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                                                {student.name}
                                            </td>
                                            {monthSessions.map(sess => {
                                                const record = sess.records.find(r => r.studentId === student.id);
                                                if (!record) return <td key={sess.id} className="text-center text-gray-300 border-r border-gray-100">-</td>;
                                                
                                                const bCount = sess.blocksCount || 1;
                                                
                                                return (
                                                    <td key={sess.id} className="px-0.5 py-1 text-center border-r border-gray-100">
                                                        <div className="flex justify-center gap-0.5">
                                                            {/* 1ª Aula */}
                                                            {record.present ? (
                                                                <span className="w-4 h-4 inline-flex items-center justify-center bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9px]">P</span>
                                                            ) : (
                                                                <span className="w-4 h-4 inline-flex items-center justify-center bg-red-50 text-red-600 border border-red-200 rounded text-[9px]">{record.justifiedAbsence ? 'FJ' : 'F'}</span>
                                                            )}
                                                            
                                                            {/* 2ª Aula (Opcional) */}
                                                            {bCount > 1 && (
                                                                <>
                                                                    <span className="text-gray-300">|</span>
                                                                    {record.present2 !== false ? (
                                                                        <span className="w-4 h-4 inline-flex items-center justify-center bg-emerald-50 text-emerald-700 border border-emerald-200 rounded text-[9px]">P</span>
                                                                    ) : (
                                                                        <span className="w-4 h-4 inline-flex items-center justify-center bg-red-50 text-red-600 border border-red-200 rounded text-[9px]">{record.justifiedAbsence ? 'FJ' : 'F'}</span>
                                                                    )}
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                ))}

                {/* RESUMO FINAL ACUMULADO */}
                <div className="bg-white rounded-xl border-2 border-emerald-500 shadow-md overflow-hidden mt-12 break-before-page">
                    <div className="bg-emerald-600 text-white px-6 py-4 flex justify-between items-center">
                        <div className="flex items-center gap-3">
                            <BarChart2 size={24} />
                            <h3 className="font-bold uppercase tracking-widest text-lg">Resumo Geral de Frequência</h3>
                        </div>
                        <span className="text-xs font-bold bg-emerald-700 px-3 py-1 rounded-full">{selectedClassName}</span>
                    </div>
                    <div className="p-1">
                        <table className="min-w-full border-collapse">
                            <thead>
                                <tr className="bg-emerald-50 text-emerald-800 text-xs font-black uppercase">
                                    <th className="text-left px-6 py-4 border-b-2 border-emerald-100">Nome do Aluno</th>
                                    <th className="text-center px-4 py-4 border-b-2 border-emerald-100">Total Aulas</th>
                                    <th className="text-center px-4 py-4 border-b-2 border-emerald-100">Presenças (Qtd)</th>
                                    <th className="text-center px-4 py-4 border-b-2 border-emerald-100">Faltas (Qtd)</th>
                                    <th className="text-center px-6 py-4 border-b-2 border-emerald-100 bg-emerald-100/50">Freq. %</th>
                                </tr>
                            </thead>
                            <tbody className="text-sm">
                                {studentSummaries.map((s, idx) => (
                                    <tr key={s.id} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-emerald-50/20'} hover:bg-emerald-100/30 transition-colors`}>
                                        <td className="px-6 py-3 font-bold text-gray-800 border-b border-emerald-50">{idx + 1}. {s.name}</td>
                                        <td className="px-4 py-3 text-center text-gray-600 border-b border-emerald-50 font-medium">{s.totalAulas}</td>
                                        <td className="px-4 py-3 text-center text-emerald-600 border-b border-emerald-50 font-bold">{s.totalPresencas}</td>
                                        <td className="px-4 py-3 text-center text-red-500 border-b border-emerald-50 font-bold">{s.totalFaltas}</td>
                                        <td className={`px-6 py-3 text-center font-black border-b border-emerald-50 text-lg ${parseInt(s.frequency) >= 75 ? 'text-emerald-600' : 'text-red-600'}`}>
                                            {s.frequency}%
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="bg-gray-50 px-6 py-4 text-[10px] text-gray-500 italic flex justify-between items-center">
                        <span>Gerado em: {format(new Date(), "dd/MM/yyyy HH:mm:ss")}</span>
                        <span>* Faltas justificadas (FJ) são contadas como ausência no cálculo de frequência.</span>
                    </div>
                </div>
            </div>
        );
    };

    const renderStudentReport = () => {
        const { chartData, avgGrade, totalClasses, student } = getStudentData(selectedStudentId);
        if (!student) return <div className="text-gray-400 p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200 mt-10">Selecione um aluno para visualizar o relatório.</div>;

        return (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left Column: Profile & Summary */}
                <div className="space-y-8">
                    <div className="bg-slate-50 rounded-2xl border border-slate-200 p-8 flex flex-col items-center text-center shadow-sm relative break-inside-avoid">
                        <div className="w-28 h-28 rounded-full p-1.5 border-4 border-emerald-500 mb-4 shadow-inner">
                            <img src={student.photoUrl} className="w-full h-full rounded-full object-cover shadow-sm" />
                        </div>
                        <h2 className="text-2xl font-black text-slate-800 tracking-tight">{student.name}</h2>
                        <p className="text-emerald-700 font-bold text-sm mb-6 uppercase tracking-widest">{student.className}</p>

                        <div className="grid grid-cols-2 gap-4 w-full mb-6">
                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">Média Geral</p>
                                <p className={`text-3xl font-black ${Number(avgGrade) >= 7 ? 'text-emerald-600' : 'text-orange-600'}`}>{avgGrade}</p>
                            </div>
                            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
                                <p className="text-[10px] text-slate-400 font-black uppercase tracking-tighter">Total Aulas</p>
                                <p className="text-3xl font-black text-slate-800">{totalClasses}</p>
                            </div>
                        </div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase">Período: {format(new Date(startDate), 'dd/MM')} a {format(new Date(endDate), 'dd/MM')}</div>
                    </div>

                    {/* Criteria Table Legend */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm break-inside-avoid">
                        <h3 className="text-sm font-black text-slate-800 mb-6 flex items-center gap-2 border-b border-slate-100 pb-3 uppercase tracking-wider">
                            <AlertCircle size={18} className="text-emerald-500" /> Critérios Avaliativos
                        </h3>
                        <div className="space-y-4">
                            <CriteriaRow label="Prontidão" desc="Engajamento inicial" val="-2,0" />
                            <CriteriaRow label="Conversa" desc="Interrupções letivas" val="-3,0" />
                            <CriteriaRow label="Banheiro" desc="Saída de sala" val="-3,0" />
                            <CriteriaRow label="Dormir" desc="Apatia em aula" val="-3,0" />
                            <CriteriaRow label="Material" desc="Esquecimento" val="-2,5" />
                            <CriteriaRow label="Tarefas" desc="Pendências" val="-2,5" />
                            <CriteriaRow label="Atividade" desc="Produtividade" val="-2,5" />
                            <CriteriaRow label="Celular" desc="Uso não autorizado" val="-5,0" />
                        </div>
                    </div>
                </div>

                {/* Right Column: Chart & History */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Evolution Chart */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm break-inside-avoid">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h3 className="text-xl font-black text-slate-800 flex items-center gap-3 tracking-tight">
                                    <TrendingUp className="text-emerald-500" size={24} />
                                    Evolução de Desempenho
                                </h3>
                                <p className="text-sm text-slate-400 font-medium mt-1">Comparativo: Aluno vs. Média da Turma no período</p>
                            </div>
                        </div>

                        <div className="h-80 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={chartData}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="date" stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dy={10} fontStyle="bold" />
                                    <YAxis domain={[0, 10]} stroke="#94a3b8" fontSize={11} tickLine={false} axisLine={false} dx={-10} fontStyle="bold" />
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #f1f5f9', color: '#1e293b', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                        itemStyle={{ color: '#1e293b', fontWeight: 'bold' }}
                                        formatter={(value: number) => [value.toFixed(1), 'Nota']}
                                        labelStyle={{ color: '#64748b', marginBottom: '0.5rem', fontWeight: 'bold' }}
                                    />
                                    <Legend wrapperStyle={{ paddingTop: '30px', fontSize: '12px', fontWeight: 'bold', color: '#64748b' }} />
                                    <Line
                                        name="Desempenho do Aluno"
                                        type="monotone"
                                        dataKey="aluno"
                                        stroke="#10b981"
                                        strokeWidth={4}
                                        dot={{ r: 5, fill: '#10b981', strokeWidth: 0 }}
                                        activeDot={{ r: 8, stroke: '#fff', strokeWidth: 2 }}
                                    />
                                    <Line
                                        name="Média da Turma"
                                        type="monotone"
                                        dataKey="mediaTurma"
                                        stroke="#cbd5e1"
                                        strokeWidth={2}
                                        strokeDasharray="6 6"
                                        dot={false}
                                    />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Detailed History Table */}
                    <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm break-inside-avoid">
                        <div className="bg-slate-50 px-8 py-5 border-b border-slate-200">
                            <h3 className="text-lg font-black text-slate-800 tracking-tight">Histórico de Sessões</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-slate-100 text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-slate-200">
                                    <tr>
                                        <th className="px-8 py-4">Data da Aula</th>
                                        <th className="px-6 py-4">Docente</th>
                                        <th className="px-6 py-4">Presença</th>
                                        <th className="px-6 py-4">Deduções / Bônus</th>
                                        <th className="px-8 py-4 text-right">Nota Preliminar</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 text-sm">
                                    {chartData.length === 0 && (
                                        <tr><td colSpan={5} className="p-12 text-center text-slate-400 font-medium italic">Nenhum registro encontrado neste período.</td></tr>
                                    )}
                                    {chartData.slice().reverse().map((d, idx) => {
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
                <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 w-full max-w-[210mm] mx-auto overflow-visible bg-white p-10 shadow-2xl print:shadow-none print:p-0" style={{ minHeight: '297mm' }}>
                    {/* Cabeçalho Institucional Premium */}
                    <div className="flex justify-between items-center border-b-[3px] border-emerald-800 pb-4 mb-8 gap-4">
                        <div className="flex items-center gap-6">
                            {schoolLogoUrl ? (
                                <img src={schoolLogoUrl} alt="Logo" className="h-16 object-contain" />
                            ) : (
                                <div className="p-3 border-2 border-emerald-200 bg-emerald-50 rounded-xl">
                                    <GraduationCap className="text-emerald-500" size={40} />
                                </div>
                            )}
                            <div>
                                <h1 className="text-3xl font-black uppercase text-emerald-900 tracking-tighter leading-none">
                                    {reportType === 'STUDENT' ? 'Relatório Individual do Aluno' :
                                        reportType === 'CLASS' ? 'Desempenho da Turma' :
                                        reportType === 'ABSENCES' ? 'Grade de Frequência' :
                                            'Comparativo Geral'}
                                </h1>
                                <p className="text-xs text-slate-600 font-bold mt-2 flex items-center gap-2">
                                    <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-800">Ano Letivo {academicYear}</span>
                                    {reportType === 'STUDENT' && <span className="bg-emerald-100 px-2 py-0.5 rounded text-emerald-800 tracking-wider">REGISTRO OFICIAL</span>}
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-black text-emerald-950 text-sm tracking-widest">EduControl PRO</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">Sistemas de Gestão Educacional</p>
                        </div>
                    </div>

                    <div className="print-content">
                        {reportType === 'STUDENT' && renderStudentReport()}
                        {reportType === 'CLASS' && renderClassReport()}
                        {reportType === 'COMPARE' && renderComparativeReport()}
                        {reportType === 'ABSENCES' && renderAbsencesReport()}
                    </div>

                    {/* Rodapé de Página de Impressão */}
                    <div className="mt-20 pt-8 border-t border-slate-100 flex justify-between items-end text-[10px] text-slate-400 font-medium">
                        <div>
                            Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")}
                        </div>
                        <div className="flex gap-4">
                            <span>Documento gerado digitalmente</span>
                            <span className="font-bold text-slate-600">Página 1</span>
                        </div>
                    </div>
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
