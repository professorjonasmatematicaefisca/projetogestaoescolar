import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BookOpen, Plus, Trash2, Filter, FileText, ChevronRight, Download, X, Edit3, Save, CheckCircle2, Tag } from 'lucide-react';
import { SupabaseService } from './services/supabaseService';
import { UserRole, PlanningModule, ClassRoom, Discipline, Teacher, TeacherClassAssignment, StudyGuideItem } from './types';

interface StudyGuideProps {
    userEmail: string;
    userRole: UserRole;
    onShowToast: (msg: string) => void;
}

type Tab = 'LAUNCH' | 'REPORT';

const EXAM_TYPES = ['P1', 'P2', 'SUBSTITUTIVA', 'RECUPERACAO'] as const;
const EXAM_LABELS: Record<string, string> = {
    P1: 'P1',
    P2: 'P2',
    SUBSTITUTIVA: 'Substitutiva',
    RECUPERACAO: 'Recuperação'
};

export const StudyGuide: React.FC<StudyGuideProps> = ({ userEmail, userRole, onShowToast }) => {
    const [activeTab, setActiveTab] = useState<Tab>('LAUNCH');
    const [loading, setLoading] = useState(true);

    // Data
    const [classes, setClasses] = useState<ClassRoom[]>([]);
    const [disciplines, setDisciplines] = useState<Discipline[]>([]);
    const [allTeachers, setAllTeachers] = useState<Teacher[]>([]);
    const [currentTeacherId, setCurrentTeacherId] = useState('');
    const [teacherAssignments, setTeacherAssignments] = useState<TeacherClassAssignment[]>([]);
    const [planningModules, setPlanningModules] = useState<PlanningModule[]>([]);
    const [guideItems, setGuideItems] = useState<StudyGuideItem[]>([]);

    // Launch form
    const [formBimestre, setFormBimestre] = useState('1');
    const [formExamType, setFormExamType] = useState<string>('P1');
    const [formTeacherId, setFormTeacherId] = useState('');
    const [formClassId, setFormClassId] = useState('');
    const [formDisciplineId, setFormDisciplineId] = useState('');
    const [selectedModules, setSelectedModules] = useState<{ moduleId: string; orientation: string }[]>([]);
    const [editingOrientation, setEditingOrientation] = useState<string>('');

    // Report filters
    const [filterBimestre, setFilterBimestre] = useState('all');
    const [filterExamType, setFilterExamType] = useState('all');
    const [filterClassId, setFilterClassId] = useState('all');

    const printRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        loadData();
    }, [userEmail]);

    const loadData = async () => {
        setLoading(true);
        try {
            const [allClasses, allDisciplines, teachers] = await Promise.all([
                SupabaseService.getClasses(),
                SupabaseService.getDisciplines(),
                SupabaseService.getTeachers()
            ]);
            setClasses(allClasses);
            setDisciplines(allDisciplines);
            setAllTeachers(teachers);

            const currentTeacher = teachers.find(t => t.email === userEmail);
            const actualAssignments = currentTeacher?.assignments || [];
            setTeacherAssignments(actualAssignments);
            if (currentTeacher) {
                setCurrentTeacherId(currentTeacher.id);
                setFormTeacherId(currentTeacher.id);
            }

            // Load and sort planning modules
            const mods = await SupabaseService.getPlanningModules();
            const sortedMods = [...mods].sort((a, b) => {
                const chapterComparison = String(a.chapter).localeCompare(String(b.chapter), undefined, { numeric: true });
                if (chapterComparison !== 0) return chapterComparison;
                return String(a.module).localeCompare(String(b.module), undefined, { numeric: true });
            });

            if (userRole === UserRole.TEACHER && currentTeacher) {
                setPlanningModules(sortedMods.filter(m => {
                    return actualAssignments.some(assign => {
                        const matchClass = allClasses.find(c => c.id === assign.classId || c.name === assign.classId);
                        const classMatch = matchClass ? m.classId === matchClass.id : m.classId === assign.classId;
                        const matchDisc = allDisciplines.find(d => d.name === assign.subject || d.id === assign.subject);
                        const discMatch = matchDisc ? m.disciplineId === matchDisc.id : m.disciplineId === assign.subject;
                        return classMatch && discMatch;
                    });
                }));
            } else {
                setPlanningModules(sortedMods);
            }

            // Load guide items
            const items = await SupabaseService.getStudyGuideItems();
            setGuideItems(items);

        } catch (err) {
            console.error('StudyGuide loadData error:', err);
        }
        setLoading(false);
    };

    const getClassName = (classId?: string) => classes.find(c => c.id === classId)?.name || classId || '';
    const getDisciplineName = (discId?: string) => {
        const disc = disciplines.find(d => d.id === discId);
        return disc?.displayName || disc?.name || discId || '';
    };
    const getTeacherName = (teacherId?: string) => allTeachers.find(t => t.id === teacherId)?.name || '';

    const getTeacherColor = (teacherId?: string) => {
        const colors = [
            '#6366f1', // indigo-500
            '#10b981', // emerald-500
            '#f59e0b', // amber-500
            '#ef4444', // red-500
            '#06b6d4', // cyan-500
            '#8b5cf6', // violet-500
            '#ec4899', // pink-500
            '#f97316', // orange-500
            '#14b8a6', // teal-500
        ];
        if (!teacherId) return colors[0];
        // simple hash
        let hash = 0;
        for (let i = 0; i < teacherId.length; i++) {
            hash = teacherId.charCodeAt(i) + ((hash << 5) - hash);
        }
        return colors[Math.abs(hash) % colors.length];
    };

    // Available modules for selection (filtered by form selections, not already added)
    const availableModules = planningModules.filter(m => {
        if (formClassId && m.classId !== formClassId) return false;
        if (formDisciplineId && m.disciplineId !== formDisciplineId) return false;
        if (formBimestre && m.bimestre !== parseInt(formBimestre)) return false;
        // Don't show already selected
        if (selectedModules.some(sm => sm.moduleId === m.id)) return false;
        // Don't show already saved for same bimestre + exam type
        if (guideItems.some(gi => gi.moduleId === m.id && gi.bimestre === parseInt(formBimestre) && gi.examType === formExamType)) return false;
        return true;
    });

    const handleAddModule = (moduleId: string) => {
        setSelectedModules(prev => [...prev, { moduleId, orientation: '' }]);
    };

    const handleRemoveSelected = (moduleId: string) => {
        setSelectedModules(prev => prev.filter(s => s.moduleId !== moduleId));
    };

    const handleOrientationChange = (moduleId: string, text: string) => {
        setSelectedModules(prev => prev.map(s => s.moduleId === moduleId ? { ...s, orientation: text } : s));
    };

    const handleSaveAll = async () => {
        if (selectedModules.length === 0) {
            onShowToast('Selecione pelo menos um conteúdo.');
            return;
        }

        const teacherToSave = userRole === UserRole.COORDINATOR ? formTeacherId : currentTeacherId;
        if (!teacherToSave) {
            onShowToast('Selecione um professor para realizar o lançamento.');
            return;
        }

        let savedCount = 0;
        for (const sel of selectedModules) {
            const mod = planningModules.find(m => m.id === sel.moduleId);
            if (!mod) continue;

            const result = await SupabaseService.saveStudyGuideItem({
                teacherId: teacherToSave,
                disciplineId: mod.disciplineId,
                classId: mod.classId,
                moduleId: sel.moduleId,
                bimestre: parseInt(formBimestre),
                examType: formExamType as StudyGuideItem['examType'],
                orientation: sel.orientation || undefined
            });
            if (result) savedCount++;
        }

        if (savedCount > 0) {
            onShowToast(`${savedCount} conteúdo(s) registrado(s) no roteiro!`);
            setSelectedModules([]);
            loadData();
        }
    };

    const handleDeleteItem = async (id: string) => {
        const ok = await SupabaseService.deleteStudyGuideItem(id);
        if (ok) {
            onShowToast('Conteúdo removido do roteiro.');
            setGuideItems(prev => prev.filter(g => g.id !== id));
        }
    };

    const handleUpdateOrientation = async (id: string, orientation: string) => {
        const ok = await SupabaseService.updateStudyGuideItem(id, { orientation });
        if (ok) {
            onShowToast('Orientação atualizada.');
            setGuideItems(prev => prev.map(g => g.id === id ? { ...g, orientation } : g));
            setEditingOrientation('');
        }
    };

    // Filtered items for report
    const filteredItems = guideItems.filter(item => {
        if (filterBimestre !== 'all' && item.bimestre !== parseInt(filterBimestre)) return false;
        if (filterExamType !== 'all' && item.examType !== filterExamType) return false;
        if (filterClassId !== 'all' && item.classId !== filterClassId) return false;
        return true;
    });

    // Group by teacher+discipline for report
    const groupedReport = (() => {
        const groups: Record<string, { teacherId: string; teacherName: string; disciplineName: string; disciplineId: string; items: StudyGuideItem[] }> = {};
        filteredItems.forEach(item => {
            const key = `${item.teacherId}_${item.disciplineId}`;
            if (!groups[key]) {
                groups[key] = {
                    teacherId: item.teacherId,
                    teacherName: getTeacherName(item.teacherId),
                    disciplineName: getDisciplineName(item.disciplineId),
                    disciplineId: item.disciplineId,
                    items: []
                };
            }
            groups[key].items.push(item);
        });
        return Object.values(groups).sort((a, b) => a.teacherName.localeCompare(b.teacherName));
    })();

    // Teacher's own disciplines from assignments (filtered by selected class)
    const myDisciplines = (() => {
        const discIds = new Set<string>();
        teacherAssignments.forEach(a => {
            const matchClass = classes.find(c => c.id === a.classId || c.name === a.classId);
            const classMatches = !formClassId || (matchClass?.id === formClassId);

            if (classMatches) {
                const disc = disciplines.find(d => d.name === a.subject || d.id === a.subject);
                if (disc) discIds.add(disc.id);
            }
        });
        return disciplines.filter(d => discIds.has(d.id));
    })();

    const myClasses = (() => {
        const classIds = new Set<string>();
        teacherAssignments.forEach(a => {
            const matchDisc = disciplines.find(d => d.id === a.subject || d.name === a.subject);
            const discMatches = !formDisciplineId || (matchDisc?.id === formDisciplineId);

            if (discMatches) {
                const cls = classes.find(c => c.id === a.classId || c.name === a.classId);
                if (cls) classIds.add(cls.id);
            }
        });
        return classes.filter(c => classIds.has(c.id));
    })();

    const handlePrintPDF = () => {
        if (!printRef.current) return;
        const printWindow = window.open('', '_blank');
        if (!printWindow) return;

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Roteiro de Estudos</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;900&display=swap');
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { 
                        font-family: 'Inter', 'Segoe UI', Arial, sans-serif; 
                        padding: 40px; 
                        color: #1e293b; 
                        background: #fff; 
                        line-height: 1.5;
                    }
                    .header { 
                        text-align: center; 
                        margin-bottom: 40px; 
                        border-bottom: 4px solid #059669; 
                        padding-bottom: 20px;
                    }
                    .header h1 { 
                        font-size: 28px; 
                        font-weight: 900; 
                        text-transform: uppercase; 
                        letter-spacing: 3px; 
                        color: #064e3b;
                        margin-bottom: 5px;
                    }
                    .header p { 
                        font-size: 14px; 
                        color: #059669; 
                        font-weight: 700;
                        text-transform: uppercase;
                        letter-spacing: 1px;
                    }
                    .teacher-section { 
                        margin-bottom: 30px; 
                        page-break-inside: avoid; 
                        border: 2px solid #e2e8f0; 
                        border-radius: 12px; 
                        overflow: hidden;
                        box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
                    }
                    .teacher-header { 
                        background: #065f46; 
                        color: #fff; 
                        padding: 15px 25px; 
                        display: flex; 
                        justify-content: space-between; 
                        align-items: center;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .teacher-header .name { font-weight: 800; font-size: 16px; text-transform: uppercase; }
                    .teacher-header .discipline { font-size: 12px; font-weight: 600; opacity: 0.9; }
                    .content-area { padding: 20px 25px; background: #fff; }
                    .item-group { margin-bottom: 15px; }
                    .content-tag { 
                        display: inline-block; 
                        background: #ecfdf5; 
                        border: 1px solid #10b981; 
                        border-radius: 8px; 
                        padding: 8px 16px; 
                        font-size: 13px; 
                        font-weight: 700; 
                        color: #064e3b;
                        margin-bottom: 8px;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .orientation { 
                        font-size: 13px; 
                        color: #334155; 
                        font-weight: 500;
                        margin-top: 4px; 
                        padding: 10px 15px; 
                        background: #f8fafc;
                        border-left: 4px solid #10b981; 
                        border-radius: 4px;
                        display: block;
                        -webkit-print-color-adjust: exact;
                        print-color-adjust: exact;
                    }
                    .footer {
                        margin-top: 50px;
                        text-align: center;
                        font-size: 10px;
                        color: #94a3b8;
                    }
                    @media print {
                        body { padding: 20px; }
                        .teacher-section { border: 2px solid #065f46; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>ROTEIRO DE ESTUDOS</h1>
                    <p>${filterBimestre !== 'all' ? filterBimestre + 'º BIMESTRE' : 'TODOS OS BIMESTRES'} • ${filterExamType !== 'all' ? EXAM_LABELS[filterExamType].toUpperCase() : 'TODOS OS TIPOS DE PROVA'} ${filterClassId !== 'all' ? ' • ' + getClassName(filterClassId).toUpperCase() : ''}</p>
                </div>
                ${groupedReport.map(group => `
                    <div class="teacher-section">
                        <div class="teacher-header">
                            <span class="name">${group.teacherName}</span>
                            <span class="discipline">${group.disciplineName}</span>
                        </div>
                        <div class="content-area">
                            ${group.items.map(item => {
            const mod = item.module;
            return `
                                    <div class="item-group">
                                        <span class="content-tag">Cap. ${mod?.chapter || '?'} — Mod. ${mod?.module || '?'} — ${mod?.title || 'Sem título'}</span>
                                        ${item.orientation ? `<div class="orientation"><strong>📝 Orientação:</strong> ${item.orientation}</div>` : ''}
                                    </div>
                                `;
        }).join('')}
                        </div>
                    </div>
                `).join('')}
                <div class="footer">
                    Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')} • EduControl PRO
                </div>
            </body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); }, 800);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[60vh]">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                    <p className="text-gray-500 text-sm font-bold">Carregando roteiro de estudos...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-black text-white tracking-tight italic flex items-center gap-3">
                        <BookOpen className="text-indigo-500" size={32} />
                        Roteiro de Estudos
                    </h1>
                    <p className="text-sm text-gray-500 mt-1 ml-1">Organize os conteúdos que serão cobrados nas provas.</p>
                </div>
            </div>

            {/* Tab buttons */}
            <div className="flex gap-2 p-1.5 bg-gray-900/50 rounded-2xl border border-gray-800 w-fit">
                <button
                    onClick={() => setActiveTab('LAUNCH')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all text-sm ${activeTab === 'LAUNCH' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-gray-400 hover:text-gray-200'}`}
                >
                    <Plus size={18} />
                    Lançar
                </button>
                <button
                    onClick={() => setActiveTab('REPORT')}
                    className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all text-sm ${activeTab === 'REPORT' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-gray-400 hover:text-gray-200'}`}
                >
                    <FileText size={18} />
                    Relatório
                </button>
            </div>

            {/* ===== ABA LANÇAR ===== */}
            {activeTab === 'LAUNCH' ? (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Config selectors */}
                    <div className="bg-[#0f172a] rounded-3xl border border-gray-800 shadow-2xl p-6">
                        <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4">Configuração da Prova</h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                            {userRole === UserRole.COORDINATOR && (
                                <div>
                                    <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Professor</label>
                                    <select
                                        className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-gray-200 focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none font-bold text-sm"
                                        value={formTeacherId}
                                        onChange={e => {
                                            setFormTeacherId(e.target.value);
                                            setFormClassId('');
                                            setFormDisciplineId('');
                                        }}
                                    >
                                        <option value="">Selecione...</option>
                                        {allTeachers.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                                    </select>
                                </div>
                            )}
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Bimestre</label>
                                <select className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-gray-200 focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none font-bold text-sm" value={formBimestre} onChange={e => setFormBimestre(e.target.value)}>
                                    <option value="1">1º Bimestre</option>
                                    <option value="2">2º Bimestre</option>
                                    <option value="3">3º Bimestre</option>
                                    <option value="4">4º Bimestre</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Tipo de Prova</label>
                                <select className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-gray-200 focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none font-bold text-sm" value={formExamType} onChange={e => setFormExamType(e.target.value)}>
                                    {EXAM_TYPES.map(et => <option key={et} value={et}>{EXAM_LABELS[et]}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Turma</label>
                                <select className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-gray-200 focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none font-bold text-sm" value={formClassId} onChange={e => setFormClassId(e.target.value)}>
                                    <option value="">Selecione...</option>
                                    {(userRole === UserRole.TEACHER ? myClasses : classes).map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] mb-2">Disciplina</label>
                                <select className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-gray-200 focus:ring-2 focus:ring-indigo-500/50 transition-all outline-none font-bold text-sm" value={formDisciplineId} onChange={e => setFormDisciplineId(e.target.value)}>
                                    <option value="">Selecione...</option>
                                    {(userRole === UserRole.TEACHER ? myDisciplines : disciplines).map(d => <option key={d.id} value={d.id}>{d.displayName || d.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Available content from planning */}
                    <div className="bg-[#0f172a] rounded-3xl border border-gray-800 shadow-2xl p-6">
                        <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                            <BookOpen size={14} />
                            Conteúdos do Planejamento Disponíveis
                        </h3>
                        {(!formClassId || !formDisciplineId) ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <Filter size={32} className="text-gray-700 mb-3" />
                                <p className="text-gray-500 font-bold text-sm">Selecione uma Turma e Disciplina acima para visualizar os conteúdos planejados.</p>
                                {userRole === UserRole.COORDINATOR && !formTeacherId && (
                                    <p className="text-indigo-400 text-xs mt-2 font-black uppercase tracking-wider">⚠️ Primeiro selecione o Professor.</p>
                                )}
                            </div>
                        ) : availableModules.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <X size={32} className="text-gray-700 mb-3" />
                                <p className="text-gray-600 italic text-sm">Nenhum conteúdo disponível ou todos já foram registrados para esta seleção.</p>
                            </div>
                        ) : (
                            <div className="flex flex-wrap gap-2">
                                {availableModules.map(mod => (
                                    <button
                                        key={mod.id}
                                        onClick={() => handleAddModule(mod.id)}
                                        className="group flex items-center gap-2 bg-gray-800/50 hover:bg-indigo-500/10 border border-gray-700 hover:border-indigo-500/30 rounded-xl px-4 py-2.5 transition-all text-left"
                                    >
                                        <Tag size={12} className="text-indigo-400 shrink-0" />
                                        <span className="text-xs font-bold text-gray-300 group-hover:text-indigo-300">
                                            Cap. {mod.chapter} — Mod. {mod.module} — {mod.title}
                                        </span>
                                        <Plus size={14} className="text-gray-600 group-hover:text-indigo-400 shrink-0" />
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Selected items with orientation */}
                    {selectedModules.length > 0 && (
                        <div className="bg-[#0f172a] rounded-3xl border border-gray-800 shadow-2xl p-6">
                            <h3 className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <CheckCircle2 size={14} />
                                Conteúdos Selecionados ({selectedModules.length})
                            </h3>
                            <div className="space-y-4">
                                {selectedModules.map(sel => {
                                    const mod = planningModules.find(m => m.id === sel.moduleId);
                                    return (
                                        <div key={sel.moduleId} className="bg-gray-900/50 rounded-2xl border border-gray-800/50 p-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg px-3 py-1.5 text-xs font-black">
                                                        Cap. {mod?.chapter} — Mod. {mod?.module} — {mod?.title}
                                                    </span>
                                                </div>
                                                <button onClick={() => handleRemoveSelected(sel.moduleId)} className="p-1.5 hover:bg-red-500/10 text-gray-600 hover:text-red-400 rounded-lg transition-all">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <input
                                                type="text"
                                                placeholder="Orientação (opcional): Ex: Foco nos exercícios da página 45..."
                                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-2.5 text-gray-300 text-xs focus:ring-2 focus:ring-indigo-500/30 outline-none placeholder:text-gray-700"
                                                value={sel.orientation}
                                                onChange={e => handleOrientationChange(sel.moduleId, e.target.value)}
                                            />
                                        </div>
                                    );
                                })}
                            </div>

                            <button
                                onClick={handleSaveAll}
                                className="mt-6 w-full sm:w-auto px-8 py-3.5 rounded-2xl font-black bg-indigo-600 text-white hover:bg-indigo-500 shadow-lg shadow-indigo-600/20 transition-all text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 mx-auto"
                            >
                                <Save size={16} />
                                Salvar no Roteiro
                            </button>
                        </div>
                    )}

                    {/* My saved items */}
                    {guideItems.filter(g => g.teacherId === currentTeacherId).length > 0 && (
                        <div className="bg-[#0f172a] rounded-3xl border border-gray-800 shadow-2xl overflow-hidden">
                            <div className="p-6 bg-gray-900/40 border-b border-gray-800">
                                <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                                    <FileText size={16} className="text-indigo-400" />
                                    Meus Lançamentos
                                </h3>
                            </div>
                            <div className="divide-y divide-gray-800/50">
                                {guideItems.filter(g => g.teacherId === currentTeacherId).map(item => (
                                    <div key={item.id} className="p-4 flex items-center justify-between gap-4 hover:bg-gray-900/30 transition-colors">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 rounded-lg px-2.5 py-1 text-[10px] font-black">
                                                    Cap. {item.module?.chapter} — Mod. {item.module?.module} — {item.module?.title}
                                                </span>
                                                <span className="text-[9px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-md font-bold">{item.bimestre}º Bim</span>
                                                <span className="text-[9px] bg-amber-500/10 text-amber-400 px-2 py-0.5 rounded-md font-bold">{EXAM_LABELS[item.examType]}</span>
                                                <span className="text-[9px] bg-gray-800 text-gray-400 px-2 py-0.5 rounded-md font-bold">{getClassName(item.classId)}</span>
                                            </div>
                                            {editingOrientation === item.id ? (
                                                <div className="flex items-center gap-2 mt-2">
                                                    <input
                                                        type="text"
                                                        className="flex-1 bg-gray-950 border border-gray-700 rounded-lg px-3 py-1.5 text-xs text-gray-300 outline-none focus:ring-1 focus:ring-indigo-500/30"
                                                        defaultValue={item.orientation || ''}
                                                        onKeyDown={e => { if (e.key === 'Enter') handleUpdateOrientation(item.id, (e.target as HTMLInputElement).value); }}
                                                        autoFocus
                                                    />
                                                    <button onClick={() => setEditingOrientation('')} className="text-gray-600 text-xs">Cancelar</button>
                                                </div>
                                            ) : item.orientation ? (
                                                <p className="text-[10px] text-gray-500 italic mt-1 flex items-center gap-1 cursor-pointer hover:text-gray-400" onClick={() => setEditingOrientation(item.id)}>
                                                    📝 {item.orientation}
                                                    <Edit3 size={10} className="ml-1" />
                                                </p>
                                            ) : (
                                                <button onClick={() => setEditingOrientation(item.id)} className="text-[10px] text-gray-700 hover:text-indigo-400 mt-1">+ Adicionar orientação</button>
                                            )}
                                        </div>
                                        <button onClick={() => handleDeleteItem(item.id)} className="p-2 hover:bg-red-500/10 text-gray-600 hover:text-red-400 rounded-xl transition-all shrink-0">
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                /* ===== ABA RELATÓRIO ===== */
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    {/* Filters + PDF button */}
                    <div className="bg-[#0f172a] rounded-3xl border border-gray-800 shadow-2xl p-6">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                            <div className="flex items-center gap-3 flex-wrap">
                                <Filter size={16} className="text-gray-500" />
                                <select className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-xs font-bold text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500/30" value={filterBimestre} onChange={e => setFilterBimestre(e.target.value)}>
                                    <option value="all">Todos Bimestres</option>
                                    <option value="1">1º Bimestre</option>
                                    <option value="2">2º Bimestre</option>
                                    <option value="3">3º Bimestre</option>
                                    <option value="4">4º Bimestre</option>
                                </select>
                                <select className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-xs font-bold text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500/30" value={filterExamType} onChange={e => setFilterExamType(e.target.value)}>
                                    <option value="all">Todos Tipos</option>
                                    {EXAM_TYPES.map(et => <option key={et} value={et}>{EXAM_LABELS[et]}</option>)}
                                </select>
                                <select className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-xs font-bold text-gray-200 outline-none focus:ring-2 focus:ring-indigo-500/30" value={filterClassId} onChange={e => setFilterClassId(e.target.value)}>
                                    <option value="all">Todas Turmas</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <button onClick={handlePrintPDF} className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-black bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-600/20 transition-all text-[10px] uppercase tracking-widest">
                                <Download size={14} />
                                Gerar PDF
                            </button>
                        </div>
                    </div>

                    {/* Report content */}
                    <div ref={printRef} className="space-y-4">
                        {groupedReport.length === 0 ? (
                            <div className="bg-[#0f172a] rounded-3xl border border-gray-800 p-16 text-center">
                                <FileText size={40} className="text-gray-700 mx-auto mb-4" />
                                <p className="text-gray-600 italic text-sm">Nenhum conteúdo encontrado para os filtros selecionados.</p>
                            </div>
                        ) : (
                            groupedReport.map((group) => (
                                <div key={`${group.teacherId}_${group.disciplineId}`} className="bg-[#0f172a] rounded-3xl border border-gray-800 shadow-2xl overflow-hidden">
                                    {/* Teacher header */}
                                    <div className="p-5 bg-gradient-to-r from-gray-900 to-gray-900/50 border-b border-gray-800 flex items-center gap-4">
                                        <div
                                            className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-lg border border-white/10"
                                            style={{ backgroundColor: getTeacherColor(group.teacherId) }}
                                        >
                                            {group.teacherName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-base font-black text-white">{group.teacherName}</p>
                                            <p className="text-xs font-bold" style={{ color: getTeacherColor(group.teacherId) }}>{group.disciplineName}</p>
                                        </div>
                                    </div>

                                    {/* Content tags */}
                                    <div className="p-5">
                                        <div className="space-y-3">
                                            {group.items.map(item => (
                                                <div key={item.id}>
                                                    <span className="inline-flex items-center gap-1.5 bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 rounded-xl px-4 py-2 text-xs font-black">
                                                        <Tag size={12} />
                                                        Cap. {item.module?.chapter} — Mod. {item.module?.module} — {item.module?.title}
                                                    </span>
                                                    {item.orientation && (
                                                        <p className="text-[10px] text-gray-500 italic mt-1 ml-4 pl-3 border-l-2 border-indigo-500/20">
                                                            📝 {item.orientation}
                                                        </p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
