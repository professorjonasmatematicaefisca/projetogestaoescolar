
import React, { useState, useEffect } from 'react';
import { StorageService } from './services/storageService';
import { SupabaseService } from './services/supabaseService';
import { Student, ClassRoom, Teacher, SessionRecord, ClassSession, Occurrence, UserRole } from './types';
import { FileText, Printer, Filter, User, MessageSquare, Edit3, Calendar, Info, Camera } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FOAProps {
    onShowToast: (msg: string) => void;
    currentUserRole?: UserRole;
    userEmail?: string;
    userName?: string;
}

// Concept Types
type Concept = 'O' | 'B' | 'S' | 'I' | '-';

interface DisciplineRowData {
    subject: string;
    teacherName: string;
    comportamento: Concept;
    atencao: Concept;
    tarefas: Concept;
    atividades: Concept;
    material: Concept;
    engajamento: Concept;
    autogestao: Concept;
    participacao: Concept;
    abertura: Concept;
}

interface ObservationLog {
    date: string;
    subject: string;
    teacher: string;
    note: string;
    hasPhotos: boolean;
}

export const FOA: React.FC<FOAProps> = ({ onShowToast, currentUserRole, userEmail, userName }) => {
    const currentYear = new Date().getFullYear();
    const [classes, setClasses] = useState<ClassRoom[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [sessions, setSessions] = useState<ClassSession[]>([]);
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
    const [loading, setLoading] = useState<boolean>(true);

    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedStudentId, setSelectedStudentId] = useState<string>('');
    const [selectedYear, setSelectedYear] = useState<number>(currentYear);
    const [soeConsiderations, setSoeConsiderations] = useState<string>('');
    const [lastSignedBy, setLastSignedBy] = useState<string>('');
    const [saving, setSaving] = useState(false);

    // Generate available years based on session history + current year
    const availableYears = Array.from(new Set([
        currentYear,
        ...sessions.map(s => new Date(s.date).getFullYear())
    ])).sort((a, b) => b - a);

    // Load Data
    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [sc, ss, sl, st, so] = await Promise.all([
                    SupabaseService.getClasses(),
                    SupabaseService.getStudents(),
                    SupabaseService.getSessions(),
                    SupabaseService.getTeachers(),
                    SupabaseService.getOccurrences()
                ]);
                setClasses(sc);
                setStudents(ss);
                setSessions(sl);
                setTeachers(st);
                setOccurrences(so);

                if (sc.length > 0 && !selectedClassId) setSelectedClassId(sc[0].name);
            } catch (error) {
                console.error("Error fetching FOA data:", error);
                onShowToast("Erro ao carregar dados do servidor.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    useEffect(() => {
        const filtered = students.filter(s => s.className === selectedClassId);
        if (filtered.length > 0) setSelectedStudentId(filtered[0].id);
        else setSelectedStudentId('');
    }, [selectedClassId, students]);

    // Load SOE Note when student or year changes
    useEffect(() => {
        if (selectedStudentId) {
            const loadNote = async () => {
                const data = await SupabaseService.getStudentSOENote(selectedStudentId, selectedYear);
                setSoeConsiderations(data.note);
                setLastSignedBy(data.signedBy);
            };
            loadNote();
        } else {
            setSoeConsiderations('');
            setLastSignedBy('');
        }
    }, [selectedStudentId, selectedYear]);

    const handleSaveConsiderations = async () => {
        if (!selectedStudentId) return;
        setSaving(true);
        // Signature: if userName exists, use it.
        const signature = userName || userEmail || "Sistema";
        const success = await SupabaseService.saveStudentSOENote(selectedStudentId, selectedYear, soeConsiderations, signature);
        if (success) {
            onShowToast("Considerações salvas com sucesso!");
            setLastSignedBy(signature);
        } else {
            onShowToast("Erro ao salvar considerações.");
        }
        setSaving(false);
    };

    const handlePrint = () => {
        window.print();
        onShowToast("Preparando impressão...");
    };

    // --- LOGIC CORE ---
    const getConcept = (value: number, type: 'comportamento' | 'atencao' | 'material' | 'atividade' | 'autogestao' | 'tarefas' | 'participacao'): Concept => {
        if (isNaN(value)) return '-';

        switch (type) {
            case 'comportamento': // Conversa + Dormir
                if (value <= 0.5) return 'O';
                if (value <= 1.5) return 'B';
                if (value <= 2.5) return 'S';
                return 'I';

            case 'atencao': // Banheiro
                if (value <= 0.3) return 'O';
                if (value <= 0.8) return 'B';
                if (value <= 1.5) return 'S';
                return 'I';

            case 'material': // Material (1=Good, 0=Bad)
                if (value === 1) return 'O';
                if (value >= 0.8) return 'B';
                if (value >= 0.5) return 'S';
                return 'I';

            case 'tarefas': // Homework (1=Good, 0=Bad)
                if (value >= 0.9) return 'O';
                if (value >= 0.7) return 'B';
                if (value >= 0.5) return 'S';
                return 'I';

            case 'atividade': // 0-3 Scale
                if (value >= 2.8) return 'O';
                if (value >= 2.0) return 'B';
                if (value >= 1.0) return 'S';
                return 'I';

            case 'participacao': // Participation (1=Good, 0=Bad/Neutral)
                if (value >= 0.8) return 'O';
                if (value >= 0.5) return 'B';
                if (value >= 0.2) return 'S';
                return 'I';

            case 'autogestao': // Phone (0=Good, 1=Bad)
                if (value <= 0.1) return 'O';
                if (value <= 0.3) return 'B';
                if (value <= 0.6) return 'S';
                return 'I';

            default: return '-';
        }
    };

    const generateFOAData = (): { rows: DisciplineRowData[], observations: ObservationLog[] } => {
        const rows: DisciplineRowData[] = [];
        const observations: ObservationLog[] = [];

        // 1. Identify all subjects for this class based on Teacher Assignments
        const classCurriculum: { subject: string, teacherId: string, teacherName: string }[] = [];

        teachers.forEach(t => {
            if (t.assignments) {
                t.assignments.forEach(a => {
                    if (a.classId === selectedClassId) {
                        classCurriculum.push({
                            subject: a.subject,
                            teacherId: t.id,
                            teacherName: t.name
                        });
                    }
                });
            }
        });

        const uniqueCurriculum = Array.from(new Map(classCurriculum.map(item => [item.subject, item])).values());
        uniqueCurriculum.sort((a, b) => a.subject.localeCompare(b.subject));

        // 1.5. Add formal occurrences to observations
        occurrences.forEach(occ => {
            if (occ.studentIds.includes(selectedStudentId) && new Date(occ.date).getFullYear() === selectedYear) {
                observations.push({
                    date: occ.date,
                    subject: 'OCORRÊNCIA',
                    teacher: occ.reportedBy,
                    note: `[${occ.type}] ${occ.description}`,
                    hasPhotos: !!(occ.photos && occ.photos.length > 0)
                });
            }
        });

        // 2. Process Stats per Subject
        uniqueCurriculum.forEach(curr => {
            // Filter sessions for this subject, student AND SELECTED YEAR
            const subjectSessions = sessions.filter(s =>
                s.className === selectedClassId &&
                s.subject === curr.subject &&
                new Date(s.date).getFullYear() === selectedYear
            );

            let recordsCount = 0;
            let sumTalk = 0, sumSleep = 0, sumBathroom = 0, sumMaterial = 0, sumActivity = 0, sumPhone = 0, sumHomework = 0, sumParticipation = 0;

            subjectSessions.forEach(sess => {
                const rec = sess.records.find(r => r.studentId === selectedStudentId);
                if (rec) {
                    recordsCount++;
                    sumTalk += rec.counters.talk;
                    sumSleep += rec.counters.sleep;
                    sumBathroom += rec.counters.bathroom;
                    sumMaterial += rec.counters.material;
                    sumActivity += rec.counters.activity;
                    sumPhone += (rec.phoneConfiscated ? 1 : 0);
                    sumHomework += (rec.counters.homework ?? 1); // Default to 1 if missing in old data
                    sumParticipation += (rec.counters.participation ?? 0);

                    // If note exists OR photos exist, add to observations
                    if (rec.notes || (rec.photos && rec.photos.length > 0)) {
                        observations.push({
                            date: sess.date,
                            subject: curr.subject,
                            teacher: sess.teacherName || curr.teacherName.split(' ')[0],
                            note: rec.notes || 'Registro de imagem sem observação escrita.',
                            hasPhotos: !!(rec.photos && rec.photos.length > 0)
                        });
                    }
                }
            });

            // Calculate Averages
            const count = recordsCount || 0;

            // Engagement Calculation: Activity + Participation + Phone(Inverse)
            // Normalized roughly 0-1 then scaled
            const participationScore = count ? sumParticipation / count : 0;

            const stats: DisciplineRowData = {
                subject: curr.subject,
                teacherName: curr.teacherName,

                comportamento: count ? getConcept((sumTalk + sumSleep) / count, 'comportamento') : '-',
                atencao: count ? getConcept(sumBathroom / count, 'atencao') : '-',
                tarefas: count ? getConcept(sumHomework / count, 'tarefas') : '-',
                atividades: count ? getConcept(sumActivity / count, 'atividade') : '-',
                material: count ? getConcept(sumMaterial / count, 'material') : '-',

                // Engajamento improved logic: Needs high activity AND participation
                engajamento: count ? getConcept(((sumActivity / count) + (participationScore * 3)) / 2, 'atividade') : '-',

                autogestao: count ? getConcept(sumPhone / count, 'autogestao') : '-',
                participacao: count ? getConcept(sumParticipation / count, 'participacao') : '-',
                abertura: count ? ((sumTalk / count) < 1 ? 'O' : 'B') : '-'
            };

            rows.push(stats);
        });

        observations.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

        return { rows, observations };
    };

    const { rows: foaRows, observations } = generateFOAData();
    const selectedStudent = students.find(s => s.id === selectedStudentId);

    // Helpers for Cell Styling
    const getCellClass = (concept: Concept) => {
        const base = "border border-gray-900 text-center font-bold text-gray-800 text-xs py-1 px-1 h-10 align-middle ";
        return base;
    };

    const getConceptColor = (concept: Concept) => {
        switch (concept) {
            case 'O': return "#00FF00"; // Bright Green
            case 'B': return "#92D050"; // Light Green
            case 'S': return "#FFFF00"; // Yellow
            case 'I': return "#FF9900"; // Orange
            default: return "#FFFFFF";
        }
    };

    const VerticalHeader = ({ text, subtext }: { text: string, subtext?: string }) => (
        <th className="border border-gray-900 bg-white p-1 font-normal h-40 align-bottom relative min-w-[30px]">
            <div className="flex flex-col items-center justify-end h-full w-full pb-2">
                <div className="transform -rotate-90 whitespace-nowrap text-[10px] leading-tight font-bold w-4 origin-center translate-y-[-20px]">
                    {text}
                </div>
                {subtext && (
                    <div className="text-[9px] text-gray-500 text-center leading-none mt-1 w-full px-0.5 font-bold">
                        {subtext}
                    </div>
                )}
            </div>
        </th>
    );

    return (
        <div className="max-w-[1600px] mx-auto pb-20">
            {/* Controls (Hidden on Print) */}
            <div className="print:hidden bg-[#0f172a] p-4 rounded-xl border border-gray-800 mb-6 flex flex-col md:flex-row justify-between items-center gap-4 shadow-lg">
                <div className="flex items-center gap-2">
                    <div className="bg-emerald-500/10 p-2 rounded-lg text-emerald-500">
                        <FileText size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">FOA Digital</h2>
                        <p className="text-gray-400 text-sm">Ficha de Observação do Aluno</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 items-center">
                    <div className="flex items-center gap-2 bg-[#1e293b] px-3 py-2 rounded-lg border border-gray-700">
                        <Calendar size={16} className="text-gray-400" />
                        <span className="text-xs font-bold text-gray-500 uppercase mr-2">Ano:</span>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                            className="bg-[#0f172a] text-white text-sm border border-gray-700 rounded-md p-1 outline-none focus:border-emerald-500 min-w-[80px]"
                        >
                            {availableYears.map(y => <option key={y} value={y}>{y}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-[#1e293b] px-3 py-2 rounded-lg border border-gray-700">
                        <Filter size={16} className="text-gray-400" />
                        <span className="text-xs font-bold text-gray-500 uppercase mr-2">Turma:</span>
                        <select
                            value={selectedClassId}
                            onChange={(e) => setSelectedClassId(e.target.value)}
                            className="bg-[#0f172a] text-white text-sm border border-gray-700 rounded-md p-1 outline-none focus:border-emerald-500 min-w-[120px]"
                        >
                            {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                        </select>
                    </div>

                    <div className="flex items-center gap-2 bg-[#1e293b] px-3 py-2 rounded-lg border border-gray-700">
                        <User size={16} className="text-gray-400" />
                        <span className="text-xs font-bold text-gray-500 uppercase mr-2">Aluno:</span>
                        <select
                            value={selectedStudentId}
                            onChange={(e) => setSelectedStudentId(e.target.value)}
                            className="bg-[#0f172a] text-white text-sm border border-gray-700 rounded-md p-1 outline-none focus:border-emerald-500 min-w-[200px]"
                        >
                            {(students.filter(s => s.className === selectedClassId)).map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                            ))}
                        </select>
                    </div>

                    <button
                        onClick={handlePrint}
                        className="bg-emerald-500 hover:bg-emerald-600 text-[#0f172a] font-bold px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
                    >
                        <Printer size={18} /> Imprimir / PDF
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex items-center justify-center p-12 bg-[#0f172a] rounded-xl border border-gray-800">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
                        <p className="text-gray-400">Carregando dados...</p>
                    </div>
                </div>
            ) : (
                /* The Sheet - Designed for Print / PDF */
                <div className="bg-white text-black p-6 md:p-8 min-h-[1000px] shadow-2xl print:shadow-none print:p-0 print:m-0 print:w-full print:max-w-none max-w-[210mm] mx-auto overflow-visible">

                    {/* Header Info */}
                    <div className="flex justify-between items-end border-b-2 border-emerald-800 pb-2 mb-4">
                        <div>
                            <h1 className="text-3xl font-bold uppercase text-emerald-900 tracking-tight">Ficha de Observação do Aluno</h1>
                            <div className="flex flex-col md:flex-row md:gap-8 mt-2 text-sm text-gray-800">
                                <p><strong className="text-emerald-800">ALUNO:</strong> {selectedStudent?.name.toUpperCase()}</p>
                                <p><strong className="text-emerald-800">TURMA:</strong> {selectedStudent?.className}</p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="font-bold text-xl text-emerald-900">{selectedYear}</p>
                            <p className="text-xs text-gray-600">EduControl PRO</p>
                        </div>
                    </div>

                    {/* Legend */}
                    <div className="mb-4 flex justify-end">
                        <table className="text-[10px] border-collapse shadow-sm">
                            <thead>
                                <tr>
                                    <td className="border border-gray-400 bg-gray-100 p-1 px-2 font-bold text-gray-700">Legenda:</td>
                                    <td className="border border-gray-400 p-1 px-3 font-bold text-center" style={{ backgroundColor: '#00FF00', WebkitPrintColorAdjust: 'exact' }}>Ótimo (O)</td>
                                    <td className="border border-gray-400 p-1 px-3 font-bold text-center" style={{ backgroundColor: '#92D050', WebkitPrintColorAdjust: 'exact' }}>Bom (B)</td>
                                    <td className="border border-gray-400 p-1 px-3 font-bold text-center" style={{ backgroundColor: '#FFFF00', WebkitPrintColorAdjust: 'exact' }}>Satisfatório (S)</td>
                                    <td className="border border-gray-400 p-1 px-3 font-bold text-center" style={{ backgroundColor: '#FF9900', WebkitPrintColorAdjust: 'exact' }}>Insatisfatório (I)</td>
                                </tr>
                            </thead>
                        </table>
                    </div>

                    {/* Main Table */}
                    <div className="overflow-hidden rounded-t-lg border border-gray-900">
                        <table className="w-full text-xs border-collapse table-fixed">
                            <colgroup><col style={{ width: '100px' }} /><col style={{ width: '100px' }} /><col style={{ width: '40px' }} /><col style={{ width: '40px' }} /><col style={{ width: '40px' }} /><col style={{ width: '40px' }} /><col style={{ width: '40px' }} /><col style={{ width: '40px' }} /><col style={{ width: '40px' }} /><col style={{ width: '40px' }} /><col style={{ width: '40px' }} /></colgroup>
                            <thead>
                                {/* Group Headers */}
                                <tr className="bg-emerald-50">
                                    <th className="bg-white border border-gray-900 text-left pl-2 py-2 text-sm" rowSpan={2}>Disciplina</th>
                                    <th className="bg-white border border-gray-900 text-left pl-2 py-2 text-sm" rowSpan={2}>Professor(a)</th>
                                    <th colSpan={2} className="bg-white border border-gray-900 font-bold border-l-2 text-center py-1 bg-gray-50 uppercase tracking-tight text-[10px]">Aspectos Comportamentais</th>
                                    <th colSpan={3} className="bg-white border border-gray-900 font-bold border-l-2 text-center py-1 bg-gray-50 uppercase tracking-tight text-[10px]">Tarefas/Materiais</th>
                                    <th colSpan={4} className="bg-white border border-gray-900 font-bold border-l-2 text-center py-1 bg-gray-50 uppercase tracking-tight text-[10px]">Competências Socioemocionais</th>
                                </tr>
                                {/* Vertical Headers */}
                                <tr className="bg-gray-50">
                                    <VerticalHeader text="Comportamento" />
                                    <VerticalHeader text="Falta de Atenção" subtext="(Foco)" />

                                    <VerticalHeader text="Tarefas" subtext="(Portal)" />
                                    <VerticalHeader text="Ativ. de Classe" />
                                    <VerticalHeader text="Material" />

                                    <VerticalHeader text="Engajamento" />
                                    <VerticalHeader text="Falta Autogestão" />
                                    <VerticalHeader text="Participação" />
                                    <VerticalHeader text="Abertura ao Novo" />
                                </tr>
                            </thead>
                            <tbody>
                                {foaRows.length === 0 ? (
                                    <tr>
                                        <td colSpan={11} className="p-8 text-center text-gray-500 italic border border-gray-900">
                                            Nenhuma aula registrada para este ano ({selectedYear}).
                                        </td>
                                    </tr>
                                ) : (
                                    foaRows.map((row, index) => (
                                        <tr key={index}>
                                            <td className="border border-gray-900 p-2 pl-3 bg-white font-bold text-gray-800 text-[11px] truncate uppercase">
                                                {row.subject}
                                            </td>
                                            <td className="border border-gray-900 p-2 pl-3 bg-white text-gray-700 text-[11px] truncate">
                                                {row.teacherName}
                                            </td>

                                            {/* Concepts */}
                                            <td className={getCellClass(row.comportamento)} style={{ backgroundColor: getConceptColor(row.comportamento), WebkitPrintColorAdjust: 'exact' }}>{row.comportamento}</td>
                                            <td className={getCellClass(row.atencao)} style={{ backgroundColor: getConceptColor(row.atencao), WebkitPrintColorAdjust: 'exact' }}>{row.atencao}</td>

                                            <td className={getCellClass(row.tarefas)} style={{ backgroundColor: getConceptColor(row.tarefas), WebkitPrintColorAdjust: 'exact' }}>{row.tarefas}</td>
                                            <td className={getCellClass(row.atividades)} style={{ backgroundColor: getConceptColor(row.atividades), WebkitPrintColorAdjust: 'exact' }}>{row.atividades}</td>
                                            <td className={getCellClass(row.material)} style={{ backgroundColor: getConceptColor(row.material), WebkitPrintColorAdjust: 'exact' }}>{row.material}</td>

                                            <td className={getCellClass(row.engajamento)} style={{ backgroundColor: getConceptColor(row.engajamento), WebkitPrintColorAdjust: 'exact' }}>{row.engajamento}</td>
                                            <td className={getCellClass(row.autogestao)} style={{ backgroundColor: getConceptColor(row.autogestao), WebkitPrintColorAdjust: 'exact' }}>{row.autogestao}</td>
                                            <td className={getCellClass(row.participacao)} style={{ backgroundColor: getConceptColor(row.participacao), WebkitPrintColorAdjust: 'exact' }}>{row.participacao}</td>
                                            <td className={getCellClass(row.abertura)} style={{ backgroundColor: getConceptColor(row.abertura), WebkitPrintColorAdjust: 'exact' }}>{row.abertura}</td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    {/* Criteria Details Legend */}
                    <div className="mt-4 border border-gray-900 rounded-lg p-3 bg-gray-50 print:break-inside-avoid">
                        <h3 className="text-xs font-bold text-emerald-900 uppercase border-b border-gray-300 pb-1 mb-2 flex items-center gap-1">
                            <Info size={12} /> Critérios de Avaliação (Legenda)
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-[10px] text-gray-700">
                            <div>
                                <span className="font-bold text-gray-900">Comportamento:</span>
                                <span className="ml-1">Média de ocorrências de 'Conversa' e 'Sono'.</span>
                            </div>
                            <div>
                                <span className="font-bold text-gray-900">Falta de Atenção (Foco):</span>
                                <span className="ml-1">Frequência de saídas (Banheiro) e dispersão.</span>
                            </div>
                            <div>
                                <span className="font-bold text-gray-900">Tarefas (Portal):</span>
                                <span className="ml-1">Entrega de atividades de casa/portal.</span>
                            </div>
                            <div>
                                <span className="font-bold text-gray-900">Ativ. de Classe:</span>
                                <span className="ml-1">Desempenho e produtividade em sala.</span>
                            </div>
                            <div>
                                <span className="font-bold text-gray-900">Material:</span>
                                <span className="ml-1">Registro de porte do material didático.</span>
                            </div>
                            <div>
                                <span className="font-bold text-gray-900">Falta Autogestão:</span>
                                <span className="ml-1">Registro de uso não autorizado de celular (Nota -1,0).</span>
                            </div>
                            <div>
                                <span className="font-bold text-gray-900">Participação:</span>
                                <span className="ml-1">Interação positiva em sala (+0,5 na nota).</span>
                            </div>
                        </div>
                    </div>

                    {/* Observations Section */}
                    <div className="mt-6 border border-gray-900 rounded-lg overflow-hidden break-inside-avoid">
                        <div className="bg-gray-100 p-2 border-b border-gray-900 flex items-center gap-2">
                            <MessageSquare size={16} className="text-gray-600" />
                            <h3 className="font-bold text-sm uppercase text-gray-800">Observações de Aula (Registro Diário)</h3>
                        </div>
                        <div className="min-h-[100px] bg-white p-4">
                            {observations.length === 0 ? (
                                <p className="text-xs text-gray-400 italic">Nenhuma observação registrada em aula até o momento.</p>
                            ) : (
                                <ul className="space-y-2">
                                    {observations.map((obs, i) => (
                                        <li key={i} className="text-xs text-gray-800 border-b border-gray-100 last:border-0 pb-1 flex flex-wrap gap-2 items-center">
                                            <span className="font-bold text-emerald-800">{format(new Date(obs.date), "dd/MM", { locale: ptBR })}</span>
                                            <span className="text-gray-400">|</span>
                                            <span className="font-bold text-gray-700">{obs.subject} ({obs.teacher}):</span>
                                            <span className="italic">{obs.note}</span>
                                            {obs.hasPhotos && (
                                                <span className="flex items-center gap-1 text-[9px] font-bold bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded border border-gray-300">
                                                    <Camera size={10} />
                                                    VER FOTO
                                                </span>
                                            )}
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>

                    {/* Considerations (Editable) */}
                    <div className="mt-6 border border-gray-900 rounded-lg overflow-hidden break-inside-avoid">
                        <div className="bg-gray-100 p-2 border-b border-gray-900 flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Edit3 size={16} className="text-gray-600" />
                                <h3 className="font-bold text-sm uppercase text-gray-800">Considerações Gerais / SOE</h3>
                                {lastSignedBy && (
                                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold">
                                        Assinado por: {lastSignedBy}
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 print:hidden">
                                <span className="text-[10px] text-gray-500 uppercase mr-2">Campo Editável</span>
                                <button
                                    onClick={handleSaveConsiderations}
                                    disabled={saving || !selectedStudentId}
                                    className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-[10px] font-bold px-3 py-1 rounded transition-colors flex items-center gap-1"
                                >
                                    {saving ? 'SALVANDO...' : 'SALVAR NOTA'}
                                </button>
                            </div>
                        </div>
                        <textarea
                            className="w-full h-32 p-4 text-sm text-gray-800 outline-none resize-none bg-white placeholder-gray-300"
                            placeholder="Digite aqui as considerações finais, orientações pedagógicas ou observações da coordenação para impressão..."
                            value={soeConsiderations}
                            onChange={(e) => setSoeConsiderations(e.target.value)}
                        />
                    </div>

                    {/* Signature Lines */}
                    <div className="mt-12 flex justify-around items-end pt-8 pb-4 break-inside-avoid">
                        <div className="text-center">
                            <div className="w-64 border-t border-gray-900 mb-2"></div>
                            <p className="text-xs font-bold text-gray-600 uppercase">Coordenação Pedagógica</p>
                        </div>
                        <div className="text-center">
                            <div className="w-64 border-t border-gray-900 mb-2"></div>
                            <p className="text-xs font-bold text-gray-600 uppercase">Responsável</p>
                        </div>
                    </div>

                    <div className="text-[10px] text-gray-400 mt-4 text-center border-t pt-2">
                        Documento gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm")} pelo sistema EduControl PRO
                    </div>
                </div>
            )}
        </div>
    );
};
