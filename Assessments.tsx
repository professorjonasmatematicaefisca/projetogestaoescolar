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
    Trash2
} from 'lucide-react';
import { SupabaseService } from './services/supabaseService';
import { Student, ClassRoom, Discipline, Grade, UserRole, User as SystemUser } from './types';
import { UserAvatar } from './components/UserAvatar';

interface AssessmentsProps {
    userEmail: string;
    userRole: UserRole;
    onShowToast: (msg: string) => void;
}

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

    useEffect(() => {
        loadInitialData();
    }, []);

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
        const numValue = value === '' ? undefined : parseFloat(value.replace(',', '.'));
        
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

                updated.mediaFinal = parseFloat(media.toFixed(1));
            }

            return { ...prev, [studentId]: updated };
        });
    };

    const handleInputBlur = async (studentId: string) => {
        const grade = grades[studentId];
        if (!grade) return;
        
        try {
            await SupabaseService.saveGrades([grade]);
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
    const availableDisciplines = userRole === UserRole.COORDINATOR
        ? disciplines
        : disciplines.filter(d => currentUser?.assignments?.some(a => a.classId === selectedClass && a.subject === d.name));

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
                                                        className={`w-12 h-10 bg-[#0f172a] border border-gray-700 rounded-lg text-center text-sm font-bold text-white outline-none focus:border-${col.color}-500 transition-all`}
                                                        value={g[col.field as keyof Grade] !== undefined ? g[col.field as keyof Grade] : ''}
                                                        onChange={(e) => handleInputChange(student.id, col.field as keyof Grade, e.target.value)}
                                                        onBlur={() => handleInputBlur(student.id)}
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
                                                        <div className="flex items-center gap-1 opacity-0 group-hover/field:opacity-100 transition-opacity">
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
                                            <div className="w-12 h-10 flex items-center justify-center bg-gray-800/30 rounded-lg text-sm font-bold text-gray-400 border border-gray-800/50">
                                                {part}
                                            </div>
                                        </td>

                                        <td className="p-4 text-center bg-emerald-500/5">
                                            <div className={`text-sm font-extrabold ${g.mediaFinal && g.mediaFinal < 6 ? 'text-red-400' : 'text-emerald-400'}`}>
                                                {g.mediaFinal || '-'}
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

                            <button className="w-full mt-6 py-2 bg-blue-500/10 hover:bg-blue-500 text-blue-400 hover:text-white rounded-xl text-xs font-bold transition-all border border-blue-500/20 group-hover:border-blue-500/50">
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
            {activeTab === 'ENTRY' ? renderEntryView() : renderReportView()}
        </div>
    );
};
