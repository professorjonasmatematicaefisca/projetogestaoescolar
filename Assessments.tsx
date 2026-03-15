import React, { useState, useEffect, useCallback } from 'react';
import { 
    Filter, 
    Save, 
    ChevronRight, 
    BookOpen, 
    GraduationCap, 
    User, 
    Search,
    RefreshCw,
    AlertCircle,
    CheckCircle2,
    Calendar,
    Award,
    FileUp,
    FileText,
    Link,
    Trash2,
    ChevronLeft,
    Download,
    BarChart2,
    TrendingUp,
    CheckCircle,
    AlertTriangle,
    LayoutGrid
} from 'lucide-react';
import { 
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar 
} from 'recharts';
import { SupabaseService } from './services/supabaseService';
import { Student, ClassRoom, Discipline, Grade, UserRole, User as SystemUser } from './types';
import { UserAvatar } from './components/UserAvatar';

interface AssessmentsProps {
    userEmail: string;
    userRole: UserRole;
    onShowToast: (msg: string) => void;
}

const formatGrade = (value: number | undefined): string => {
    if (value === undefined || value === null) return '-';
    // Format to 2 decimal places with comma
    return value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

type AssessmentTab = 'ENTRY' | 'REPORT';

const BIMESTRE_RANGES = {
    1: { start: '-02-01', end: '-04-30', label: '1º Bimestre' },
    2: { start: '-05-01', end: '-07-31', label: '2º Bimestre' },
    3: { start: '-08-01', end: '-09-30', label: '3º Bimestre' },
    4: { start: '-10-01', end: '-12-31', label: '4º Bimestre' }
};

export const Assessments: React.FC<AssessmentsProps> = ({ userEmail, userRole, onShowToast }) => {
    const [activeTab, setActiveTab] = useState<AssessmentTab>('ENTRY');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    
    // Auth User Data
    const [currentUser, setCurrentUser] = useState<SystemUser | null>(null);

    // Filters & Selection
    const [selectedBimestre, setSelectedBimestre] = useState<number>(1);
    const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
    const [selectedClass, setSelectedClass] = useState<string>('');
    const [selectedDiscipline, setSelectedDiscipline] = useState<string>('');

    // Data State
    const [classes, setClasses] = useState<ClassRoom[]>([]);
    const [disciplines, setDisciplines] = useState<Discipline[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [grades, setGrades] = useState<Record<string, Grade>>({}); // studentId -> Grade
    const [participationGrades, setParticipationGrades] = useState<Record<string, number>>({}); // studentId -> avg
    const [absenceGrades, setAbsenceGrades] = useState<Record<string, number>>({}); // studentId -> total

    // Focus & Input Management
    const [focusedCell, setFocusedCell] = useState<{ studentId: string, field: string } | null>(null);
    const [selectedStudentForFullReport, setSelectedStudentForFullReport] = useState<string | null>(null);
    const [allGradesForReport, setAllGradesForReport] = useState<Record<string, Record<string, Grade>>>({}); // studentId -> disciplineId -> Grade
    const [editingValue, setEditingValue] = useState<string>('');
    const [pendingSaves, setPendingSaves] = useState<Set<string>>(new Set());

    useEffect(() => {
        loadInitialData();
    }, []);

    // Debounced Auto-save Effect
    useEffect(() => {
        if (pendingSaves.size === 0) return;
        
        const timeout = setTimeout(async () => {
            const studentIds = Array.from(pendingSaves);
            setPendingSaves(new Set()); // Reset
            
            const toSave = studentIds.map(id => grades[id]).filter(Boolean);
            if (toSave.length > 0) {
                console.log(`Auto-saving ${toSave.length} records...`);
                await SupabaseService.saveGrades(toSave);
            }
        }, 3000); // 3 seconds delay for typing
        
        return () => clearTimeout(timeout);
    }, [pendingSaves, grades]);

    const loadInitialData = async () => {
        setLoading(true);
        try {
            // 1. Get current user profile for assignments
            const users = await SupabaseService.getTeachers(); // For simplicity, teachers are in this list
            const profile = users.find(u => u.email === userEmail);
            setCurrentUser(profile as any);

            // 2. Get All Classes and Disciplines for reference
            const [allClasses, allDisciplines] = await Promise.all([
                SupabaseService.getClasses(),
                SupabaseService.getDisciplines()
            ]);

            setClasses(allClasses);
            setDisciplines(allDisciplines);

            // 3. Set initial filters if teacher
            if (profile && profile.assignments && profile.assignments.length > 0) {
                const first = profile.assignments[0];
                setSelectedClass(first.classId);
                
                // Find discipline ID for the subject name
                const discObj = allDisciplines.find(d => d.name === first.subject);
                if (discObj) setSelectedDiscipline(discObj.id);
            } else if (allClasses.length > 0) {
                setSelectedClass(allClasses[0].name);
            }

        } catch (error) {
            console.error('Error loading initial data:', error);
            onShowToast('Erro ao carregar configurações');
        } finally {
            setLoading(false);
        }
    };

    // Load students and grades when class or discipline changes
    useEffect(() => {
        if (selectedClass && selectedDiscipline) {
            fetchData();
        }
    }, [selectedClass, selectedDiscipline, selectedBimestre, selectedYear]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch students from the class
            const allStudents = await SupabaseService.getStudents();
            const classStudents = allStudents.filter(s => s.className === selectedClass && s.status !== 'INACTIVE');
            setStudents(classStudents);

            // Fetch existing grades
            const fetchedGrades = await SupabaseService.getGrades({
                bimestre: selectedBimestre,
                year: selectedYear,
                disciplineId: selectedDiscipline
            });

            const gradeMap: Record<string, Grade> = {};
            fetchedGrades.forEach(g => {
                gradeMap[g.studentId] = g;
            });
            setGrades(gradeMap);

            // Fetch Participation averages
            const range = BIMESTRE_RANGES[selectedBimestre as keyof typeof BIMESTRE_RANGES];
            const startDate = `${selectedYear}${range.start}`;
            const endDate = `${selectedYear}${range.end}`;

            const partMap: Record<string, number> = {};
            const absMap: Record<string, number> = {};
            await Promise.all(classStudents.map(async (s) => {
                const [avg, abs] = await Promise.all([
                    SupabaseService.getParticipationAverage(s.id, selectedDiscipline, startDate, endDate),
                    SupabaseService.getAbsencesCount(s.id, selectedDiscipline, startDate, endDate)
                ]);
                partMap[s.id] = avg;
                absMap[s.id] = abs;
            }));
            setParticipationGrades(partMap);
            setAbsenceGrades(absMap);

        } finally {
            setLoading(false);
        }
    };

    const removePdf = async (studentId: string, field: string) => {
        if (!confirm('Deseja realmente excluir este PDF?')) return;

        try {
            const pdfField = (field === 'recuperacao' ? 'recPdfUrl' : `${field}PdfUrl`) as keyof Grade;
            setGrades(prev => {
                const current = prev[studentId];
                if (!current) return prev;
                const updated = { ...current };
                delete (updated as any)[pdfField];
                return { ...prev, [studentId]: updated };
            });
            onShowToast("PDF excluído.");
        } catch (error) {
            console.error('Error removing PDF:', error);
            onShowToast("Erro ao excluir PDF.");
        }
    };

    const handleInputChange = (studentId: string, field: keyof Grade, value: string) => {
        // Accept both comma and point
        const sanitizedValue = value.replace(',', '.');
        const numValue = value === '' ? undefined : parseFloat(sanitizedValue);
        
        if (numValue !== undefined && (isNaN(numValue) || numValue < 0 || numValue > 10)) {
            return;
        }

        setGrades(prev => {
            const current = (prev[studentId] || {
                studentId,
                disciplineId: selectedDiscipline,
                bimestre: selectedBimestre,
                year: selectedYear,
                teacherId: currentUser?.id
            }) as Grade;

            const updated = { ...current, [field]: numValue };
            
            // Recalculate Average according to New Rules
            const { p1, p2, sub, recuperacao, atividadesExtras = 0 } = updated;
            const part = participationGrades[studentId] || 0;

            // Rule 1: Only show if at least one grade exists
            const hasAnyGrade = [p1, p2, sub, recuperacao, atividadesExtras].some(v => v !== undefined) || part > 0;
            
            if (!hasAnyGrade) {
                updated.mediaFinal = undefined;
            } else {
                // Rule 2 & 3 & 4: (NOTA1 + NOTA2 + PART) / 3
                let n1 = p1 ?? 0;
                let n2 = p2 ?? 0;

                if (p1 !== undefined && p2 === undefined && sub !== undefined) {
                    n2 = sub;
                } else if (p2 !== undefined && p1 === undefined && sub !== undefined) {
                    n1 = sub;
                } else if (p1 === undefined && p2 === undefined && sub !== undefined) {
                    n1 = sub;
                }

                let media = (n1 + n2 + part) / 3;

                // Rule 5: Recuperação
                if (media < 6 && recuperacao !== undefined) {
                    if (recuperacao >= 6) {
                        media = 6.0;
                    }
                }

                // Rule 6: Extras
                if (media < 10) {
                    media = Math.min(10, media + atividadesExtras);
                }

                updated.mediaFinal = parseFloat(media.toFixed(2));
            }

            const finalUpdated = { ...prev, [studentId]: updated };
            // Trigger auto-save
            setPendingSaves(p => new Set(p).add(studentId));
            
            return finalUpdated;
        });
    };

    const handleInputBlur = async (studentId: string, updatedGrade?: Grade) => {
        const grade = updatedGrade || grades[studentId];
        if (!grade) return;
        
        try {
            const success = await SupabaseService.saveGrades([grade]);
            if (!success) {
                console.error('Auto-save failed');
            }
        } catch (error) {
            console.error('Auto-save error:', error);
        }
    };

    const saveAll = async () => {
        setSaving(true);
        try {
            const gradesToSave = Object.values(grades);
            if (gradesToSave.length === 0) return;

            const success = await SupabaseService.saveGrades(gradesToSave);
            if (success) {
                onShowToast('Notas salvas com sucesso!');
                fetchData(); // Refresh to get IDs for new items
            } else {
                onShowToast('Erro ao salvar notas.');
            }
        } catch (error) {
            onShowToast('Erro na conexão ao salvar.');
        } finally {
            setSaving(false);
        }
    };

    // Derived: Available classes for the teacher
    const availableClasses = userRole === UserRole.COORDINATOR 
        ? classes 
        : classes.filter(c => currentUser?.assignments?.some(a => a.classId === c.name));

    // Derived: Available disciplines for the selected class
    const availableDisciplines = disciplines.filter(d => {
        // Find the selected class object to get its disciplineIds
        const classObj = classes.find(c => c.name === selectedClass);
        
        // If teacher, check assignments PLUS class discipline list
        if (userRole === UserRole.TEACHER) {
            const isAssigned = currentUser?.assignments?.some(a => a.classId === selectedClass && a.subject === d.name);
            return isAssigned && classObj?.disciplineIds?.includes(d.id);
        }
        
        // If coordinator or other, check if discipline belongs to the class
        return classObj?.disciplineIds?.includes(d.id);
    });

    const renderEntryView = () => (
        <div className="space-y-6 animate-in fade-in duration-500">
            {/* Table Header / Actions */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="flex items-center gap-2 text-emerald-400">
                    <CheckCircle2 size={18} />
                    <span className="text-sm font-medium">Lançamento de Notas - {BIMESTRE_RANGES[selectedBimestre as keyof typeof BIMESTRE_RANGES].label}</span>
                </div>
                
                <button
                    onClick={saveAll}
                    disabled={saving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-xl font-bold transition-all shadow-lg hover:shadow-emerald-500/20"
                >
                    {saving ? <RefreshCw size={18} className="animate-spin" /> : <Save size={18} />}
                    Salvar Notas
                </button>
            </div>

            {/* Students Table */}
            <div className="bg-[#1e293b]/50 backdrop-blur-xl border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-[#0f172a]/80 border-b border-gray-800">
                                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Aluno</th>
                                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Faltas</th>
                                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">P1</th>
                                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">P2</th>
                                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Sub</th>
                                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Rec</th>
                                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Extras</th>
                                <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-center">Part.</th>
                                <th className="p-4 text-xs font-bold text-emerald-500 uppercase tracking-wider text-center bg-emerald-500/5">Média</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-800">
                            {students.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="p-12 text-center text-gray-500">
                                        Nenhum aluno encontrado para os filtros selecionados.
                                    </td>
                                </tr>
                            ) : students.map(student => {
                                const g = grades[student.id] || {} as Grade;
                                const part = participationGrades[student.id] || 0;
                                
                                return (
                                    <tr key={student.id} className="hover:bg-white/5 transition-colors group">
                                        <td className="p-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <UserAvatar name={student.name} photoUrl={student.photoUrl} size="sm" />
                                                <span className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">
                                                    {student.name}
                                                </span>
                                            </div>
                                        </td>

                                        <td className="p-2 text-center">
                                            <div className="w-12 h-10 mx-auto flex items-center justify-center bg-red-500/10 border border-red-500/20 rounded-lg text-sm font-bold text-red-400">
                                                {absenceGrades[student.id] || 0}
                                            </div>
                                        </td>
                                        
                                        {[
                                            { field: 'p1', color: 'blue', hasPdf: !!g.p1PdfUrl },
                                            { field: 'p2', color: 'blue', hasPdf: !!g.p2PdfUrl },
                                            { field: 'sub', color: 'orange', hasPdf: !!g.subPdfUrl },
                                            { field: 'recuperacao', color: 'red', hasPdf: !!g.recPdfUrl },
                                            { field: 'atividadesExtras', color: 'purple', noPdf: true }
                                        ].map(col => (
                                            <td key={col.field} className="p-2 text-center">
                                                <div className="flex items-center justify-center gap-1 group/field">
                                                    <input
                                                        type="text"
                                                        placeholder="-"
                                                        data-student={student.id}
                                                        data-field={col.field}
                                                        className={`w-16 h-10 bg-[#0f172a] border border-gray-700 rounded-lg text-center text-sm font-bold text-white outline-none focus:border-${col.color}-500 transition-all`}
                                                        value={focusedCell?.studentId === student.id && focusedCell?.field === col.field 
                                                            ? editingValue 
                                                            : (g[col.field as keyof Grade] !== undefined ? formatGrade(g[col.field as keyof Grade] as number).replace('-', '') : '')}
                                                        onFocus={() => {
                                                            setFocusedCell({ studentId: student.id, field: col.field });
                                                            setEditingValue(g[col.field as keyof Grade] !== undefined ? (g[col.field as keyof Grade] as number).toString().replace('.', ',') : '');
                                                        }}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            setEditingValue(val);
                                                            handleInputChange(student.id, col.field as keyof Grade, val);
                                                        }}
                                                        onBlur={() => {
                                                            handleInputBlur(student.id);
                                                            setFocusedCell(null);
                                                            setEditingValue('');
                                                        }}
                                                        onKeyDown={(e) => {
                                                            if (e.key === 'Tab' && !e.shiftKey) {
                                                                const studentIndex = students.findIndex(s => s.id === student.id);
                                                                if (studentIndex < students.length - 1) {
                                                                    e.preventDefault();
                                                                    const nextStudentId = students[studentIndex + 1].id;
                                                                    const nextInput = document.querySelector(`input[data-student="${nextStudentId}"][data-field="${col.field}"]`) as HTMLInputElement;
                                                                    if (nextInput) nextInput.focus();
                                                                }
                                                            }
                                                        }}
                                                    />
                                                    {!col.noPdf && (
                                                        <div className="flex items-center gap-1 transition-opacity">
                                                            <button 
                                                                onClick={async () => {
                                                                    if (col.hasPdf) {
                                                                        const pdfUrl = (col.field === 'recuperacao' ? g.recPdfUrl : (g as any)[`${col.field}PdfUrl`]);
                                                                        if (pdfUrl) {
                                                                            try {
                                                                                // Fix: Convert DataURL to Blob for reliable opening
                                                                                const res = await fetch(pdfUrl);
                                                                                const blob = await res.blob();
                                                                                const url = URL.createObjectURL(blob);
                                                                                const win = window.open(url, '_blank');
                                                                                if (!win) onShowToast("Bloqueador de popups impediu a abertura.");
                                                                            } catch (e) {
                                                                                console.error("PDF Open error:", e);
                                                                                window.open(pdfUrl, '_blank');
                                                                            }
                                                                        }
                                                                    } else {
                                                                        const input = document.createElement('input');
                                                                        input.type = 'file';
                                                                        input.accept = 'application/pdf';
                                                                        input.onchange = async (e) => {
                                                                            const file = (e.target as HTMLInputElement).files?.[0];
                                                                            if (file) {
                                                                                onShowToast(`Arquivando PDF: ${file.name}...`);
                                                                                const reader = new FileReader();
                                                                                reader.onload = async (event) => {
                                                                                    const dataUrl = event.target?.result as string;
                                                                                    const pdfField = (col.field === 'recuperacao' ? 'recPdfUrl' : `${col.field}PdfUrl`) as keyof Grade;
                                                                                    setGrades(prev => ({
                                                                                        ...prev,
                                                                                        [student.id]: { ...prev[student.id], [pdfField]: dataUrl }
                                                                                    }));
                                                                                    onShowToast("PDF arquivado com sucesso!");
                                                                                    handleInputBlur(student.id);
                                                                                };
                                                                                reader.readAsDataURL(file);
                                                                            }
                                                                        };
                                                                        input.click();
                                                                    }
                                                                }}
                                                                className={`p-1.5 rounded-lg border transition-all ${col.hasPdf ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' : 'bg-gray-800/50 border-gray-700 text-gray-500 hover:text-gray-300'}`}
                                                                title={col.hasPdf ? "Ver PDF" : "Arquivar PDF"}
                                                            >
                                                                {col.hasPdf ? <FileText size={14} /> : <FileUp size={14} />}
                                                            </button>

                                                            {col.hasPdf && (
                                                                <button
                                                                    onClick={() => removePdf(student.id, col.field)}
                                                                    className="p-1.5 rounded-lg border bg-red-500/10 border-red-500/30 text-red-400 hover:bg-red-500 hover:text-white transition-all"
                                                                    title="Remover PDF"
                                                                >
                                                                    <Trash2 size={14} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </td>
                                        ))}

                                        <td className="p-4 text-center">
                                            <div className="w-16 h-10 flex items-center justify-center bg-gray-800/30 rounded-lg text-sm font-bold text-gray-400 border border-gray-800/50">
                                                {formatGrade(part)}
                                            </div>
                                        </td>

                                        <td className="p-4 text-center bg-emerald-500/5">
                                            <div className={`text-sm font-extrabold ${g.mediaFinal && g.mediaFinal < 6 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {formatGrade(g.mediaFinal)}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );

    const fetchAllGradesForStudent = async (studentId: string) => {
        try {
            const data: Record<string, Grade> = {};
            await Promise.all(disciplines.map(async (d) => {
                const g = await SupabaseService.getGrades({
                    disciplineId: d.id,
                    bimestre: selectedBimestre,
                    year: selectedYear
                });
                const studentGrade = g.find(item => item.studentId === studentId);
                if (studentGrade) data[d.id] = studentGrade;
            }));
            setAllGradesForReport(prev => ({ ...prev, [studentId]: data }));
        } catch (error) {
            console.error("Error fetching all grades:", error);
            onShowToast("Erro ao carregar notas de todas as disciplinas.");
        }
    };

    const renderStudentFullReport = () => {
        if (!selectedStudentForFullReport) return null;
        const student = students.find(s => s.id === selectedStudentForFullReport);
        if (!student) return null;

        const studentGrades = allGradesForReport[selectedStudentForFullReport] || {};
        const disciplinesWithGrades = disciplines.map(d => {
            const g = studentGrades[d.id];
            // If the grade exists, we use its mediaFinal or calculate based on our rules
            return {
                id: d.id,
                name: d.displayName,
                grade: g?.mediaFinal || 0,
                participation: participationGrades[selectedStudentForFullReport] || 0,
                g: g
            };
        }).sort((a, b) => b.grade - a.grade);

        const chartData = disciplinesWithGrades.map(d => ({
            name: d.name,
            nota: d.grade,
            mediaTurma: 7.0 // Placeholder for class average
        }));

        const bestDiscipline = disciplinesWithGrades[0];
        const worstDiscipline = disciplinesWithGrades[disciplinesWithGrades.length - 1];

        const generatePDF = async () => {
            onShowToast("Gerando PDF...");
            try {
                const { jsPDF } = await import('jspdf');
                const html2canvas = (await import('html2canvas')).default;
                const element = document.getElementById('report-content');
                if (!element) return;

                const canvas = await html2canvas(element, { scale: 2 });
                const imgData = canvas.toDataURL('image/png');
                const pdf = new jsPDF('p', 'mm', 'a4');
                const imgProps = pdf.getImageProperties(imgData);
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                
                pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                pdf.save(`Relatorio_${student.name.replace(/\s+/g, '_')}_B${selectedBimestre}.pdf`);
                onShowToast("PDF baixado com sucesso!");
            } catch (error) {
                console.error("PDF Export Error:", error);
                onShowToast("Erro ao exportar PDF.");
            }
        };

        return (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <div className="flex justify-between items-center mb-6">
                    <button 
                        onClick={() => setSelectedStudentForFullReport(null)}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-800/50 hover:bg-gray-700 text-gray-300 rounded-xl transition-all border border-gray-700"
                    >
                        <ChevronLeft size={18} /> Voltar
                    </button>
                    <div className="flex gap-3">
                        <button 
                            onClick={generatePDF}
                            className="flex items-center gap-2 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl transition-all shadow-lg"
                        >
                            <Download size={18} /> Exportar PDF
                        </button>
                    </div>
                </div>

                <div id="report-content" className="bg-[#0f172a] p-8 rounded-3xl border border-gray-800 space-y-8 shadow-2xl overflow-hidden relative">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl -mr-32 -mt-32"></div>
                    
                    {/* Header with Photo */}
                    <div className="flex flex-col md:flex-row items-center gap-6 relative">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                            <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-gray-800 shadow-xl">
                                <img 
                                    src={student.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(student.name)}&background=10b981&color=fff&size=128`} 
                                    alt={student.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>
                        <div className="text-center md:text-left">
                            <h2 className="text-4xl font-black text-white tracking-tight">{student.name}</h2>
                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 mt-2">
                                <span className="px-3 py-1 bg-gray-800 text-gray-400 rounded-full text-xs font-bold border border-gray-700">{student.className}</span>
                                <span className="px-3 py-1 bg-emerald-500/20 text-emerald-400 rounded-full text-xs font-bold border border-emerald-500/30">{selectedBimestre}º Bimestre / {selectedYear}</span>
                                <span className="px-3 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-bold border border-blue-500/30">ID: {student.id.slice(0, 8)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Performance Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <div className="bg-[#1e293b]/50 p-6 rounded-2xl border border-gray-800 hover:border-emerald-500/30 transition-all">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-1 tracking-widest">Média Geral</p>
                            <p className="text-3xl font-black text-emerald-400">
                                {(disciplinesWithGrades.reduce((acc, d) => acc + d.grade, 0) / (disciplinesWithGrades.length || 1)).toFixed(2).replace('.', ',')}
                            </p>
                        </div>
                        <div className="bg-[#1e293b]/50 p-6 rounded-2xl border border-gray-800 hover:border-blue-500/30 transition-all">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-1 tracking-widest">Participação</p>
                            <p className="text-3xl font-black text-blue-400">
                                {(participationGrades[student.id] || 0).toFixed(2).replace('.', ',')}
                            </p>
                        </div>
                        <div className="bg-[#1e293b]/50 p-6 rounded-2xl border border-gray-800 hover:border-orange-500/30 transition-all">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-1 tracking-widest">Destaque</p>
                            <p className="text-lg font-black text-orange-400 truncate">{bestDiscipline.name}</p>
                        </div>
                        <div className="bg-[#1e293b]/50 p-6 rounded-2xl border border-gray-800 hover:border-red-500/30 transition-all">
                            <p className="text-xs font-bold text-gray-500 uppercase mb-1 tracking-widest">Atenção</p>
                            <p className="text-lg font-black text-red-400 truncate">{worstDiscipline.name}</p>
                        </div>
                    </div>

                    {/* Charts Section */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                        {/* Bar Chart: Performance per Discipline */}
                        <div className="bg-[#1e293b]/30 p-6 rounded-3xl border border-gray-800 overflow-hidden">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <BarChart2 size={20} className="text-emerald-400" /> Desempenho por Matéria
                            </h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={chartData} layout="vertical" margin={{ left: 20 }}>
                                        <XAxis type="number" domain={[0, 10]} hide />
                                        <YAxis dataKey="name" type="category" width={100} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                        <Tooltip 
                                            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                                        />
                                        <Bar dataKey="nota" fill="url(#colorBar)" radius={[0, 4, 4, 0]}>
                                            <defs>
                                                <linearGradient id="colorBar" x1="0" y1="0" x2="1" y2="0">
                                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                                                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                                </linearGradient>
                                            </defs>
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Line Chart: Student vs Class Average */}
                        <div className="bg-[#1e293b]/30 p-6 rounded-3xl border border-gray-800 overflow-hidden">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <TrendingUp size={20} className="text-blue-400" /> Evolução de Notas
                            </h3>
                            <div className="h-80 w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={chartData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#334155" />
                                        <XAxis dataKey="name" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                                        <YAxis domain={[0, 10]} tick={{ fill: '#94a3b8', fontSize: 12 }} />
                                        <Tooltip 
                                            contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '12px' }}
                                        />
                                        <Legend />
                                        <Line 
                                            name="Aluno" 
                                            type="monotone" 
                                            dataKey="nota" 
                                            stroke="#10b981" 
                                            strokeWidth={4} 
                                            dot={{ r: 6, fill: '#10b981' }} 
                                        />
                                        <Line 
                                            name="Média Turma" 
                                            type="monotone" 
                                            dataKey="mediaTurma" 
                                            stroke="#64748b" 
                                            strokeDasharray="5 5" 
                                            dot={false}
                                        />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Insights & Comparison */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-emerald-500/5 p-6 rounded-3xl border border-emerald-500/20">
                            <h3 className="text-lg font-bold text-emerald-400 mb-4 flex items-center gap-2">
                                <CheckCircle size={20} /> Insights de Desempenho
                            </h3>
                            <ul className="space-y-3 text-sm text-gray-300">
                                <li className="flex gap-2">
                                    <span className="text-emerald-400 font-bold">•</span>
                                    <span>Excelente aproveitamento em **{bestDiscipline.name}**, mantendo-se consistentemente acima de 9,0.</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-emerald-400 font-bold">•</span>
                                    <span>Média geral de **{(disciplinesWithGrades.reduce((acc, d) => acc + d.grade, 0) / (disciplinesWithGrades.length || 1)).toFixed(1)}** supera a média histórica da turma.</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-emerald-400 font-bold">•</span>
                                    <span>Frequência escolar adequada, sem riscos de retenção por falta.</span>
                                </li>
                            </ul>
                        </div>
                        <div className="bg-orange-500/5 p-6 rounded-3xl border border-orange-500/20">
                            <h3 className="text-lg font-bold text-orange-400 mb-4 flex items-center gap-2">
                                <AlertTriangle size={20} /> Pontos de Atenção
                            </h3>
                            <ul className="space-y-3 text-sm text-gray-300">
                                <li className="flex gap-2">
                                    <span className="text-orange-400 font-bold">•</span>
                                    <span>Leve queda de desempenho em **{worstDiscipline.name}** nas últimas semanas. Recomendado reforço.</span>
                                </li>
                                <li className="flex gap-2">
                                    <span className="text-orange-400 font-bold">•</span>
                                    <span>Participação em sala pode ser mais explorada para elevar a média final.</span>
                                </li>
                            </ul>
                        </div>
                    </div>

                    {/* Full Grade Table */}
                    <div className="bg-[#1e293b]/20 rounded-3xl border border-gray-800 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-[#1e293b]/50 border-b border-gray-800">
                                <tr>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest">Disciplina</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">P1</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">P2</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">SUB</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">REC</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Participação</th>
                                    <th className="p-4 text-xs font-bold text-gray-500 uppercase tracking-widest text-center">Média Final</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-800">
                                {disciplines.map(d => {
                                    const g = studentGrades[d.id];
                                    const part = participationGrades[student.id] || 0;
                                    return (
                                        <tr key={d.id} className="hover:bg-white/5 transition-colors">
                                            <td className="p-4 font-bold text-gray-300">{d.displayName}</td>
                                            <td className="p-4 text-center text-gray-400">{formatGrade(g?.p1)}</td>
                                            <td className="p-4 text-center text-gray-400">{formatGrade(g?.p2)}</td>
                                            <td className="p-4 text-center text-gray-400">{formatGrade(g?.sub)}</td>
                                            <td className="p-4 text-center text-gray-400">{formatGrade(g?.recuperacao)}</td>
                                            <td className="p-4 text-center text-emerald-400 font-bold">{formatGrade(part)}</td>
                                            <td className={`p-4 text-center font-black ${g?.mediaFinal && g.mediaFinal < 6 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {formatGrade(g?.mediaFinal)}
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        );
    };

    const renderReportView = () => (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex items-center gap-2 text-blue-400 mb-4">
                <Award size={18} />
                <span className="text-sm font-medium">Boletim Escolar Consolidado</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {students.map(student => {
                    const g = grades[student.id] || {} as Grade;
                    return (
                        <div key={student.id} className="bg-[#1e293b]/50 backdrop-blur-xl border border-gray-800 rounded-2xl p-5 hover:border-blue-500/30 transition-all group overflow-hidden relative">
                            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full -mr-8 -mt-8 transition-all group-hover:scale-110"></div>
                            
                            <div className="flex items-start gap-4 mb-6 relative">
                                <UserAvatar name={student.name} photoUrl={student.photoUrl} size="lg" />
                                <div>
                                    <h3 className="text-white font-bold group-hover:text-blue-400 transition-colors">{student.name}</h3>
                                    <p className="text-xs text-gray-400">{selectedClass} • {selectedYear}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-[#0f172a] p-3 rounded-xl border border-gray-800">
                                    <div className="flex items-center gap-2">
                                        <BookOpen size={14} className="text-blue-400" />
                                        <span className="text-xs font-bold text-gray-300">
                                            {disciplines.find(d => d.id === selectedDiscipline)?.displayName || 'Disciplina'}
                                        </span>
                                    </div>
                                    <div className={`text-sm font-black ${g?.mediaFinal && g.mediaFinal < 6 ? 'text-red-400' : 'text-emerald-400'}`}>
                                        {g?.mediaFinal || 'N/A'}
                                    </div>
                                </div>

                                {/* Mini Grid of individual grades */}
                                <div className="grid grid-cols-4 gap-2">
                                    {[
                                        { label: 'P1', val: g?.p1 },
                                        { label: 'P2', val: g?.p2 },
                                        { label: 'Sub', val: g?.sub },
                                        { label: 'Rec', val: g?.recuperacao }
                                    ].map(item => (
                                        <div key={item.label} className="bg-[#0f172a]/50 p-2 rounded-lg text-center border border-gray-800/50">
                                            <p className="text-[10px] text-gray-500 font-bold mb-1">{item.label}</p>
                                            <p className="text-xs font-bold text-white">{item.val !== undefined ? item.val : '-'}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button 
                                onClick={() => {
                                    setSelectedStudentForFullReport(student.id);
                                    fetchAllGradesForStudent(student.id);
                                }}
                                className="w-full mt-6 py-2 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded-xl text-xs font-bold transition-all border border-blue-500/20 group-hover:border-blue-500/50"
                            >
                                Ver Relatório Completo
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );

    if (loading && students.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-20 space-y-4">
                <div className="relative">
                    <div className="w-16 h-16 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                        <GraduationCap size={24} className="text-emerald-500" />
                    </div>
                </div>
                <p className="text-gray-400 font-medium animate-pulse">Carregando diário de classe...</p>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-8 pb-20">
            {/* Header section with glass effect */}
            <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-blue-500 rounded-3xl blur opacity-10 group-hover:opacity-20 transition duration-1000"></div>
                <div className="relative bg-[#0f172a]/80 backdrop-blur-xl border border-gray-800 rounded-3xl p-6 md:p-8 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-8">
                    <div className="flex items-center gap-5">
                        <div className="w-16 h-16 bg-gradient-to-br from-emerald-400/20 to-blue-500/20 rounded-2xl flex items-center justify-center border border-white/10 shadow-xl">
                            <Award size={32} className="text-emerald-400" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight">Avaliações <span className="text-emerald-500 text-lg uppercase tracking-widest ml-2">PRO</span></h1>
                            <p className="text-gray-400 text-sm font-medium mt-1">Gestão de desempenho e boletins escolares</p>
                        </div>
                    </div>

                    {/* Filter Bar */}
                    <div className="flex flex-wrap items-center gap-4 w-full lg:w-auto">
                        <div className="flex items-center gap-2 bg-[#1e293b]/50 px-4 py-2 rounded-2xl border border-gray-700">
                            <Calendar size={16} className="text-emerald-400" />
                            <select
                                value={selectedBimestre}
                                onChange={(e) => setSelectedBimestre(parseInt(e.target.value))}
                                className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer"
                            >
                                {Object.entries(BIMESTRE_RANGES).map(([val, { label }]) => (
                                    <option key={val} value={val} className="bg-[#1e293b]">{label}</option>
                                ))}
                            </select>
                        </div>

                        <div className="flex items-center gap-2 bg-[#1e293b]/50 px-4 py-2 rounded-2xl border border-gray-700">
                            <GraduationCap size={16} className="text-blue-400" />
                            <select
                                value={selectedClass}
                                onChange={(e) => setSelectedClass(e.target.value)}
                                className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer min-w-[120px]"
                            >
                                {availableClasses.map(c => <option key={c.id} value={c.name} className="bg-[#1e293b]">{c.name}</option>)}
                            </select>
                        </div>

                        <div className="flex items-center gap-2 bg-[#1e293b]/50 px-4 py-2 rounded-2xl border border-gray-700">
                            <BookOpen size={16} className="text-orange-400" />
                            <select
                                value={selectedDiscipline}
                                onChange={(e) => setSelectedDiscipline(e.target.value)}
                                className="bg-transparent text-sm font-bold text-white outline-none cursor-pointer min-w-[150px]"
                            >
                                <option value="" className="bg-[#1e293b]">Selecione Disciplina</option>
                                {availableDisciplines.map(d => <option key={d.id} value={d.id} className="bg-[#1e293b]">{d.displayName || d.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* View Toggle */}
            <div className="flex p-1 bg-[#1e293b]/50 backdrop-blur rounded-2xl border border-gray-800 w-fit mx-auto md:mx-0">
                <button
                    onClick={() => setActiveTab('ENTRY')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
                        activeTab === 'ENTRY' 
                        ? 'bg-emerald-500 text-white shadow-lg' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                >
                    <Save size={18} />
                    Lançamento
                </button>
                <button
                    onClick={() => setActiveTab('REPORT')}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${
                        activeTab === 'REPORT' 
                        ? 'bg-blue-600 text-white shadow-lg' 
                        : 'text-gray-400 hover:text-white'
                    }`}
                >
                    <Award size={18} />
                    Boletins
                </button>
            </div>

            {/* Tabs Content */}
            <div className="animate-in fade-in duration-700">
                {selectedStudentForFullReport ? (
                    renderStudentFullReport()
                ) : (
                    activeTab === 'ENTRY' ? renderEntryView() : renderReportView()
                )}
            </div>
        </div>
    );
};
