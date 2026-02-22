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
            if (currentTeacher) setCurrentTeacherId(currentTeacher.id);

            // Load planning modules
            const mods = await SupabaseService.getPlanningModules();
            if (userRole === UserRole.TEACHER && currentTeacher) {
                setPlanningModules(mods.filter(m => {
                    return actualAssignments.some(assign => {
                        const matchClass = allClasses.find(c => c.id === assign.classId || c.name === assign.classId);
                        const classMatch = matchClass ? m.classId === matchClass.id : m.classId === assign.classId;
                        const matchDisc = allDisciplines.find(d => d.name === assign.subject || d.id === assign.subject);
                        const discMatch = matchDisc ? m.disciplineId === matchDisc.id : m.disciplineId === assign.subject;
                        return classMatch && discMatch;
                    });
                }));
            } else {
                setPlanningModules(mods);
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
    const getDisciplineName = (discId?: string) => disciplines.find(d => d.id === discId)?.name || discId || '';
    const getTeacherName = (teacherId?: string) => allTeachers.find(t => t.id === teacherId)?.name || '';

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

        let savedCount = 0;
        for (const sel of selectedModules) {
            const mod = planningModules.find(m => m.id === sel.moduleId);
            if (!mod) continue;

            const result = await SupabaseService.saveStudyGuideItem({
                teacherId: currentTeacherId,
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

    // Teacher's own disciplines from assignments
    const myDisciplines = (() => {
        const discIds = new Set<string>();
        teacherAssignments.forEach(a => {
            const disc = disciplines.find(d => d.name === a.subject || d.id === a.subject);
            if (disc) discIds.add(disc.id);
        });
        return disciplines.filter(d => discIds.has(d.id));
    })();

    const myClasses = (() => {
        const classIds = new Set<string>();
        teacherAssignments.forEach(a => {
            const cls = classes.find(c => c.id === a.classId || c.name === a.classId);
            if (cls) classIds.add(cls.id);
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
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1a1a2e; background: #fff; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #1a1a2e; padding-bottom: 15px; }
                    .header h1 { font-size: 22px; font-weight: 900; text-transform: uppercase; letter-spacing: 2px; }
                    .header p { font-size: 11px; color: #666; margin-top: 5px; }
                    .filters-info { font-size: 11px; color: #555; margin-bottom: 20px; text-align: center; }
                    .teacher-section { margin-bottom: 25px; page-break-inside: avoid; border: 2px solid #1a1a2e; border-radius: 8px; overflow: hidden; }
                    .teacher-header { background: #1a1a2e; color: #fff; padding: 12px 20px; display: flex; justify-content: space-between; align-items: center; }
                    .teacher-header .name { font-weight: 800; font-size: 14px; }
                    .teacher-header .discipline { font-size: 11px; opacity: 0.8; }
                    .content-area { padding: 15px 20px; }
                    .content-tag { display: inline-block; background: #f0f4ff; border: 1px solid #c7d2fe; border-radius: 6px; padding: 6px 12px; margin: 4px; font-size: 11px; font-weight: 600; color: #3730a3; }
                    .orientation { font-size: 10px; color: #666; font-style: italic; margin-top: 2px; padding-left: 15px; border-left: 2px solid #c7d2fe; margin-left: 10px; margin-bottom: 8px; display: block; }
                    @media print {
                        body { padding: 15px; }
                        .teacher-section { break-inside: avoid; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <h1>📋 Roteiro de Estudos</h1>
                    <p>${filterBimestre !== 'all' ? filterBimestre + 'º Bimestre' : 'Todos os Bimestres'} • ${filterExamType !== 'all' ? EXAM_LABELS[filterExamType] : 'Todos os Tipos de Prova'} ${filterClassId !== 'all' ? ' • ' + getClassName(filterClassId) : ''}</p>
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
                                    <span class="content-tag">Cap. ${mod?.chapter || '?'} — Mod. ${mod?.module || '?'} — ${mod?.title || 'Sem título'}</span>
                                    ${item.orientation ? `<span class="orientation">📝 ${item.orientation}</span>` : ''}
                                `;
        }).join('')}
                        </div>
                    </div>
                `).join('')}
            </body>
            </html>
        `);
        printWindow.document.close();
        setTimeout(() => { printWindow.print(); }, 500);
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
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
                                    {(userRole === UserRole.TEACHER ? myDisciplines : disciplines).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                                </select>
                            </div>
                        </div>
                    </div>

                    {/* Available content from planning */}
                    {formClassId && formDisciplineId && (
                        <div className="bg-[#0f172a] rounded-3xl border border-gray-800 shadow-2xl p-6">
                            <h3 className="text-xs font-black text-indigo-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <BookOpen size={14} />
                                Conteúdos do Planejamento Disponíveis
                            </h3>
                            {availableModules.length === 0 ? (
                                <p className="text-center text-gray-600 italic text-sm py-6">Nenhum conteúdo disponível para esta seleção.</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {availableModules.map(mod => (
                                        <button
                                            key={mod.id}
                                            onClick={() => handleAddModule(mod.id)}
                                            className="group flex items-center gap-2 bg-gray-800/50 hover:bg-indigo-500/10 border border-gray-700 hover:border-indigo-500/30 rounded-xl px-4 py-2.5 transition-all"
                                        >
                                            <Tag size={12} className="text-indigo-400" />
                                            <span className="text-xs font-bold text-gray-300 group-hover:text-indigo-300">
                                                Cap. {mod.chapter} — Mod. {mod.module} — {mod.title}
                                            </span>
                                            <Plus size={14} className="text-gray-600 group-hover:text-indigo-400" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

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
                                    <div className="p-5 bg-gradient-to-r from-gray-900 to-indigo-950/30 border-b border-gray-800 flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-lg border border-indigo-500/20">
                                            {group.teacherName.charAt(0).toUpperCase()}
                                        </div>
                                        <div>
                                            <p className="text-base font-black text-white">{group.teacherName}</p>
                                            <p className="text-xs text-indigo-400 font-bold">{group.disciplineName}</p>
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
