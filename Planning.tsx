import React, { useState, useEffect } from 'react';
import { BookOpen, Plus, Search, Calendar, ChevronRight, ChevronLeft, Save, Trash2, Filter, List, CheckCircle2, Clock } from 'lucide-react';
import { SupabaseService } from './services/supabaseService';
import { UserRole, PlanningModule, ClassRoom, Discipline, TeacherClassAssignment, PlanningSchedule } from './types';

interface PlanningProps {
    userEmail: string;
    userRole: UserRole;
    onShowToast: (msg: string) => void;
}

type Tab = 'CONTENT' | 'SCHEDULE';

export const Planning: React.FC<PlanningProps> = ({ userEmail, userRole, onShowToast }) => {
    const [activeTab, setActiveTab] = useState<Tab>('CONTENT');
    const [loading, setLoading] = useState(true);
    const [modules, setModules] = useState<PlanningModule[]>([]);
    const [schedules, setSchedules] = useState<(PlanningSchedule & { module?: PlanningModule })[]>([]);
    const [classes, setClasses] = useState<ClassRoom[]>([]);
    const [disciplines, setDisciplines] = useState<Discipline[]>([]);
    const [teacherAssignments, setTeacherAssignments] = useState<TeacherClassAssignment[]>([]);

    // Content states
    const [showAddForm, setShowAddForm] = useState(false);
    const [selectedClass, setSelectedClass] = useState('');
    const [selectedFront, setSelectedFront] = useState('');
    const [selectedDiscipline, setSelectedDiscipline] = useState('');
    const [formData, setFormData] = useState({ chapter: '', moduleNumber: '', title: '', topic: '' });
    const [filterClass, setFilterClass] = useState('all');

    // Calendar states
    const [currentDate, setCurrentDate] = useState(new Date());
    const [showScheduleModal, setShowScheduleModal] = useState<{ day: number, open: boolean }>({ day: 0, open: false });
    const [selectedModuleForSchedule, setSelectedModuleForSchedule] = useState('');

    useEffect(() => {
        loadData();
    }, [userEmail, activeTab]);

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

            const currentTeacher = teachers.find(t => t.email === userEmail);
            if (currentTeacher?.assignments) {
                setTeacherAssignments(currentTeacher.assignments);
            }

            const mods = await SupabaseService.getPlanningModules();

            // Filter modules locally based on teacher assignments if user is a teacher
            let filteredMods = mods;
            if (userRole === UserRole.TEACHER) {
                filteredMods = mods.filter(m => {
                    return teacherAssignments.some(assign => {
                        const discipline = disciplines.find(d => d.name === assign.subject);
                        return m.classId === assign.classId &&
                            (m.disciplineId === assign.subject || m.disciplineId === discipline?.id) &&
                            (m.front === assign.front || !m.front || m.front === 'Geral');
                    });
                });
            }
            setModules(filteredMods);

            if (activeTab === 'SCHEDULE') {
                const scheds = await SupabaseService.getPlanningSchedule();
                setSchedules(scheds);
            }
        } catch (error) {
            console.error("Error loading planning data:", error);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveModule = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedClass || !selectedFront || !selectedDiscipline) {
            onShowToast("Selecione Turma, Disciplina e Frente");
            return;
        }

        const teachers = await SupabaseService.getTeachers();
        const currentTeacher = teachers.find(t => t.email === userEmail);

        const success = await SupabaseService.savePlanningModule({
            disciplineId: selectedDiscipline,
            teacherId: currentTeacher?.id || '',
            classId: selectedClass,
            front: selectedFront,
            chapter: formData.chapter,
            module: formData.moduleNumber,
            title: formData.title,
            topic: formData.topic
        });

        if (success) {
            onShowToast("Módulo salvo com sucesso!");
            setShowAddForm(false);
            setFormData({ chapter: '', moduleNumber: '', title: '', topic: '' });
            loadData();
        } else {
            onShowToast("Erro ao salvar módulo");
        }
    };

    const handleSaveSchedule = async () => {
        if (!selectedModuleForSchedule || showScheduleModal.day === 0) return;

        const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), showScheduleModal.day);
        const isoDate = date.toISOString().split('T')[0];

        const success = await SupabaseService.savePlanningSchedule({
            moduleId: selectedModuleForSchedule,
            plannedDate: isoDate
        });

        if (success) {
            onShowToast("Aula agendada!");
            setShowScheduleModal({ day: 0, open: false });
            setSelectedModuleForSchedule('');
            loadData();
        } else {
            onShowToast("Erro ao agendar aula");
        }
    };

    const handleDeleteSchedule = async (id: string) => {
        if (confirm("Deseja remover este agendamento?")) {
            const success = await SupabaseService.deletePlanningSchedule(id);
            if (success) {
                onShowToast("Agendamento removido");
                loadData();
            }
        }
    };

    const handleDeleteModule = async (id: string) => {
        if (confirm("Deseja excluir este módulo de planejamento? Todos os agendamentos vinculados também serão removidos.")) {
            const success = await SupabaseService.deletePlanningModule(id);
            if (success) {
                onShowToast("Módulo excluído com sucesso!");
                loadData();
            } else {
                onShowToast("Erro ao excluir módulo");
            }
        }
    };

    const formatModule = (mod: string | undefined) => {
        if (!mod) return '';
        // Remove .0 suffix if present (common when DB returns numeric as float)
        return mod.toString().replace(/\.0$/, '');
    };

    const getClassName = (id: string | unknown) => classes.find(c => c.id === id)?.name || (id as string);
    const getDisciplineName = (id: string | unknown) => disciplines.find(d => d.id === id)?.name || (id as string);

    // Calendar Helpers
    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const days = getDaysInMonth(currentDate.getFullYear(), currentDate.getMonth());
    const firstDay = getFirstDayOfMonth(currentDate.getFullYear(), currentDate.getMonth());

    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

    const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="w-full max-w-7xl mx-auto space-y-6 pb-20">
            {/* Header & Tabs */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-emerald-500/10 rounded-2xl flex items-center justify-center shadow-xl shadow-emerald-500/5 ring-1 ring-emerald-500/20">
                        <BookOpen className="text-emerald-500" size={28} />
                    </div>
                    <div>
                        <h1 className="text-3xl font-extrabold text-white italic tracking-tight uppercase">Planejamento</h1>
                        <p className="text-sm text-gray-400 font-semibold tracking-wide">Gestão Pedagógica e Cronograma Escolar</p>
                    </div>
                </div>

                <div className="flex bg-[#0f172a] p-1.5 rounded-2xl border border-gray-800 shadow-lg">
                    <button
                        onClick={() => setActiveTab('CONTENT')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'CONTENT' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        <List size={20} />
                        Conteúdo
                    </button>
                    <button
                        onClick={() => setActiveTab('SCHEDULE')}
                        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold transition-all ${activeTab === 'SCHEDULE' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/20' : 'text-gray-400 hover:text-gray-200'}`}
                    >
                        <Calendar size={20} />
                        Cronograma
                    </button>
                </div>
            </div>

            {activeTab === 'CONTENT' ? (
                /* Aba de Conteúdo Programático */
                <div className="space-y-6 animate-in fade-in duration-500">
                    <div className="flex justify-end">
                        <button
                            onClick={() => setShowAddForm(!showAddForm)}
                            className="flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-xl font-bold transition-all shadow-xl shadow-emerald-600/20 active:scale-95"
                        >
                            {showAddForm ? <ChevronRight size={20} className="rotate-90" /> : <Plus size={20} />}
                            {showAddForm ? 'Fechar Formulário' : 'Novo Planejamento'}
                        </button>
                    </div>

                    {showAddForm && (
                        <div className="bg-[#0f172a] rounded-3xl border border-gray-800 p-8 shadow-2xl animate-in zoom-in-95 duration-300">
                            <form onSubmit={handleSaveModule} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="space-y-5">
                                    <div className="bg-gray-900/50 p-4 rounded-2xl border border-gray-800/50 space-y-4">
                                        <div>
                                            <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-2 ml-1">Turma Atribuída</label>
                                            <select
                                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-gray-200 focus:ring-2 focus:ring-emerald-500/50 transition-all outline-none font-bold text-sm"
                                                value={selectedClass}
                                                onChange={(e) => setSelectedClass(e.target.value)}
                                                required
                                            >
                                                <option value="">Selecione a Turma</option>
                                                {userRole === UserRole.COORDINATOR ? (
                                                    classes.map(c => <option key={c.id as string} value={c.id as string}>{c.name}</option>)
                                                ) : (
                                                    Array.from(new Set(teacherAssignments.map(a => a.classId))).map(cId => (
                                                        <option key={cId as string} value={cId as string}>{getClassName(cId)}</option>
                                                    ))
                                                )}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-2 ml-1">Disciplina</label>
                                            <select
                                                className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-gray-200 focus:ring-2 focus:ring-emerald-500/50 transition-all outline-none font-bold text-sm"
                                                value={selectedDiscipline}
                                                onChange={(e) => {
                                                    setSelectedDiscipline(e.target.value);
                                                    setSelectedFront(''); // Reset front when discipline changes
                                                }}
                                                required
                                            >
                                                <option value="">Selecione a Disciplina</option>
                                                {userRole === UserRole.COORDINATOR ? (
                                                    disciplines.map(d => <option key={d.id as string} value={d.id as string}>{d.name}</option>)
                                                ) : (
                                                    // Get unique subjects assigned to the current teacher for the selected class
                                                    Array.from(new Set(teacherAssignments
                                                        .filter(a => a.classId === selectedClass)
                                                        .map(a => a.subject)))
                                                        .map((subject, idx) => {
                                                            const disciplineId = disciplines.find(d => d.name === subject)?.id || subject;
                                                            return (
                                                                <option key={`${subject}-${idx}`} value={disciplineId}>
                                                                    {subject}
                                                                </option>
                                                            );
                                                        })
                                                )}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-2 ml-1">Frente</label>
                                            {userRole === UserRole.COORDINATOR ? (
                                                <input
                                                    type="text"
                                                    placeholder="Ex: Frente 1, 11B..."
                                                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-gray-200 focus:ring-2 focus:ring-emerald-500/50 transition-all outline-none font-bold text-sm"
                                                    value={selectedFront}
                                                    onChange={(e) => setSelectedFront(e.target.value)}
                                                    required
                                                />
                                            ) : (
                                                <select
                                                    className="w-full bg-gray-950 border border-gray-800 rounded-xl px-4 py-3 text-gray-200 focus:ring-2 focus:ring-emerald-500/50 transition-all outline-none font-bold text-sm"
                                                    value={selectedFront}
                                                    onChange={(e) => setSelectedFront(e.target.value)}
                                                    required
                                                >
                                                    <option value="">Selecione a Frente</option>
                                                    {teacherAssignments
                                                        .filter(a => {
                                                            const disciplineId = disciplines.find(d => d.name === a.subject)?.id || a.subject;
                                                            return a.classId === selectedClass && disciplineId === selectedDiscipline;
                                                        })
                                                        .map((a, idx) => (
                                                            <option key={`${a.front}-${idx}`} value={a.front || 'Geral'}>{a.front || 'Geral'}</option>
                                                        ))
                                                    }
                                                </select>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="lg:col-span-2 space-y-5">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Capítulo</label>
                                            <input
                                                type="text"
                                                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-gray-200 focus:ring-2 focus:ring-emerald-500/50 transition-all outline-none font-bold"
                                                value={formData.chapter}
                                                onChange={(e) => setFormData({ ...formData, chapter: e.target.value })}
                                                required
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Módulo</label>
                                            <input
                                                type="text"
                                                className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-gray-200 focus:ring-2 focus:ring-emerald-500/50 transition-all outline-none font-bold"
                                                value={formData.moduleNumber}
                                                onChange={(e) => setFormData({ ...formData, moduleNumber: e.target.value })}
                                                required
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Título da Aula</label>
                                        <input
                                            type="text"
                                            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-gray-200 focus:ring-2 focus:ring-emerald-500/50 transition-all outline-none font-bold"
                                            value={formData.title}
                                            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2 ml-1">Assunto / Conteúdo Detalhado</label>
                                        <textarea
                                            className="w-full bg-gray-900 border border-gray-800 rounded-xl px-4 py-3 text-gray-200 focus:ring-2 focus:ring-emerald-500/50 transition-all outline-none min-h-[120px] font-medium leading-relaxed"
                                            value={formData.topic}
                                            onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                                            required
                                        />
                                    </div>
                                    <div className="flex justify-end pt-2">
                                        <button type="submit" className="flex items-center gap-3 bg-emerald-600 hover:bg-emerald-500 text-white px-10 py-3.5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl active:scale-95">
                                            <Save size={20} />
                                            Salvar Planejamento
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                    )}

                    <div className="bg-[#0f172a] rounded-3xl border border-gray-800 overflow-hidden shadow-2xl">
                        <div className="p-6 border-b border-gray-800 bg-gray-900/40 flex flex-col md:flex-row justify-between items-center gap-4">
                            <div className="flex items-center gap-3 text-emerald-500">
                                <Filter size={20} />
                                <span className="text-xs font-black uppercase tracking-[0.2em]">Filtros Rápidos</span>
                            </div>
                            <select
                                className="bg-gray-800 border border-gray-700 rounded-xl px-4 py-2 text-xs font-bold text-gray-200 outline-none focus:ring-2 focus:ring-emerald-500/30"
                                value={filterClass}
                                onChange={(e) => setFilterClass(e.target.value)}
                            >
                                <option value="all">Todas as Turmas</option>
                                {classes.map(c => <option key={c.id as string} value={c.id as string}>{c.name}</option>)}
                            </select>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full border-collapse">
                                <thead>
                                    <tr className="bg-gray-800/30">
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-gray-800">Turma/Disciplina</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-gray-800">Frente/Mod</th>
                                        <th className="px-8 py-5 text-left text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-gray-800">Título/Conteúdo</th>
                                        <th className="px-8 py-5 text-center text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] border-b border-gray-800">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800/50">
                                    {modules.filter(m => filterClass === 'all' || m.classId === filterClass).map((module) => (
                                        <tr key={module.id} className="hover:bg-emerald-500/[0.02] transition-colors group">
                                            <td className="px-8 py-5">
                                                <div className="font-black text-emerald-400 text-sm mb-1">{getClassName(module.classId)}</div>
                                                <div className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{getDisciplineName(module.disciplineId)}</div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="text-sm font-bold text-gray-300">{module.front}</div>
                                                <div className="text-xs text-gray-500 font-medium">Mod. {formatModule(module.module)}</div>
                                            </td>
                                            <td className="px-8 py-5 max-w-md">
                                                <div className="text-sm text-gray-100 font-bold mb-1 leading-tight">{module.title}</div>
                                                <div className="text-xs text-gray-500 line-clamp-2 group-hover:line-clamp-none transition-all leading-relaxed">{module.topic}</div>
                                            </td>
                                            <td className="px-8 py-5">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setActiveTab('SCHEDULE');
                                                            // Logic to pre-select or highlight could be added
                                                        }}
                                                        className="p-2.5 bg-gray-800/50 hover:bg-emerald-500/20 text-emerald-500 rounded-xl transition-all border border-transparent hover:border-emerald-500/30"
                                                        title="Agendar esta aula"
                                                    >
                                                        <Calendar size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteModule(module.id)}
                                                        className="p-2.5 bg-gray-800/50 hover:bg-red-500/20 text-gray-600 hover:text-red-400 rounded-xl transition-all border border-transparent hover:border-red-500/30"
                                                    >
                                                        <Trash2 size={18} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                /* Aba de Cronograma (Calendário) */
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex flex-col lg:flex-row gap-6">
                        {/* Calendário Principal */}
                        <div className="flex-1 bg-[#0f172a] rounded-3xl border border-gray-800 shadow-2xl overflow-hidden">
                            <div className="p-6 bg-gray-900/40 border-b border-gray-800 flex items-center justify-between">
                                <h2 className="text-xl font-bold text-white flex items-center gap-3 italic">
                                    <Calendar className="text-emerald-500" />
                                    {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                                </h2>
                                <div className="flex gap-2">
                                    <button onClick={prevMonth} className="p-2 hover:bg-gray-800 rounded-xl text-gray-400 transition-all border border-gray-800"><ChevronLeft size={20} /></button>
                                    <button onClick={nextMonth} className="p-2 hover:bg-gray-800 rounded-xl text-gray-400 transition-all border border-gray-800"><ChevronRight size={20} /></button>
                                </div>
                            </div>

                            <div className="p-4">
                                <div className="grid grid-cols-7 mb-2">
                                    {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map(d => (
                                        <div key={d} className="text-center text-[10px] font-black text-gray-600 uppercase tracking-widest py-2">{d}</div>
                                    ))}
                                </div>
                                <div className="grid grid-cols-7 gap-1">
                                    {Array.from({ length: firstDay }).map((_, i) => (
                                        <div key={`empty-${i}`} className="aspect-square bg-transparent"></div>
                                    ))}
                                    {Array.from({ length: days }).map((_, i) => {
                                        const day = i + 1;
                                        const fullDate = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                                        const daySchedules = schedules.filter(s => s.plannedDate === fullDate);
                                        const isToday = new Date().toDateString() === new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toDateString();

                                        return (
                                            <div
                                                key={day}
                                                onClick={() => setShowScheduleModal({ day, open: true })}
                                                className={`aspect-square p-2 border border-gray-800/50 rounded-2xl cursor-pointer transition-all hover:bg-emerald-500/5 hover:border-emerald-500/30 relative flex flex-col group ${isToday ? 'bg-emerald-500/5 ring-1 ring-emerald-500/20' : 'bg-gray-900/20'}`}
                                            >
                                                <span className={`text-xs font-black ${isToday ? 'text-emerald-500' : 'text-gray-500'}`}>{day}</span>
                                                <div className="mt-1 space-y-1 overflow-y-auto max-h-[80%] scrollbar-hide">
                                                    {daySchedules.map(sch => (
                                                        <div
                                                            key={sch.id}
                                                            className="text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-md font-bold truncate flex items-center gap-1 group/item"
                                                        >
                                                            <div className="w-1 h-1 rounded-full bg-emerald-500 shrink-0" />
                                                            {sch.module?.front} - {formatModule(sch.module?.chapter)}
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); handleDeleteSchedule(sch.id); }}
                                                                className="ml-auto opacity-0 group-hover/item:opacity-100 hover:text-red-400"
                                                            >
                                                                <Trash2 size={10} />
                                                            </button>
                                                        </div>
                                                    ))}
                                                </div>
                                                <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-5 transition-opacity" />
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Sidebar de Informações do Agendamento */}
                        <div className="w-full lg:w-80 space-y-6">
                            <div className="bg-[#0f172a] rounded-3xl border border-gray-800 p-6 shadow-xl">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Clock size={16} className="text-emerald-500" />
                                    Aulas Agendadas
                                </h3>
                                <div className="space-y-4">
                                    {schedules.length === 0 ? (
                                        <p className="text-xs text-center text-gray-600 italic py-10">Nenhuma aula agendada para este período.</p>
                                    ) : (
                                        schedules.slice(0, 5).map(sch => (
                                            <div key={sch.id} className="bg-gray-900/50 p-3 rounded-xl border border-gray-800/50 flex flex-col gap-2">
                                                <div className="flex justify-between items-start">
                                                    <span className="text-[10px] font-black text-emerald-500 uppercase">{sch.plannedDate.split('-').reverse().join('/')}</span>
                                                    <span className="text-[9px] bg-gray-800 px-1.5 py-0.5 rounded text-gray-400 font-bold">{getClassName(sch.module?.classId)}</span>
                                                </div>
                                                <p className="text-xs font-bold text-gray-200 truncate">{sch.module?.title}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            <div className="bg-gradient-to-br from-emerald-600 to-emerald-800 rounded-3xl p-6 shadow-xl text-white">
                                <CheckCircle2 className="mb-4 text-emerald-200" size={32} />
                                <h4 className="font-bold text-lg mb-2 leading-tight italic">Dica Rápida</h4>
                                <p className="text-emerald-100 text-xs font-medium leading-relaxed">Clique em um dia do calendário para vincular um módulo planejado e organizar seu cronograma semanal.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de Agendamento */}
            {showScheduleModal.open && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-gray-950/80 backdrop-blur-sm" onClick={() => setShowScheduleModal({ day: 0, open: false })} />
                    <div className="relative bg-[#0f172a] w-full max-w-md rounded-3xl border border-gray-800 shadow-2xl p-8 animate-in zoom-in-95 duration-200">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-emerald-500/10 rounded-2xl flex items-center justify-center">
                                <Calendar className="text-emerald-500" />
                            </div>
                            <div>
                                <h3 className="text-xl font-bold text-white italic">Agendar Aula</h3>
                                <p className="text-xs text-gray-500 font-bold tracking-widest uppercase">Dia {showScheduleModal.day} de {monthNames[currentDate.getMonth()]}</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3 ml-1">Módulo Planejado</label>
                                <select
                                    className="w-full bg-gray-900 border border-gray-800 rounded-2xl px-4 py-3 text-sm font-bold text-gray-100 focus:ring-2 focus:ring-emerald-500/50 transition-all outline-none"
                                    value={selectedModuleForSchedule}
                                    onChange={(e) => setSelectedModuleForSchedule(e.target.value)}
                                >
                                    <option value="">Selecione um tópico...</option>
                                    {modules.map(m => (
                                        <option key={m.id as string} value={m.id as string}>
                                            {m.front} - {m.chapter} - {m.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowScheduleModal({ day: 0, open: false })}
                                    className="flex-1 px-6 py-3.5 rounded-2xl font-bold bg-gray-800 text-gray-400 hover:bg-gray-700 transition-all text-sm"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSaveSchedule}
                                    disabled={!selectedModuleForSchedule}
                                    className="flex-1 px-6 py-3.5 rounded-2xl font-black bg-emerald-600 text-white hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed text-[10px] uppercase tracking-widest"
                                >
                                    Confirmar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
