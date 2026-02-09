import React, { useState, useEffect } from 'react';
import { UserPlus, Users, School, BookOpen, X, Plus, Camera, Lock, Trash2, GraduationCap } from 'lucide-react';
import { SupabaseService } from './services/supabaseService';
import { Student, Teacher, ClassRoom, Discipline, UserRole, TeacherClassAssignment } from './types';

interface AdminPanelProps {
    onShowToast: (msg: string) => void;
}

type TabType = 'STUDENTS' | 'STAFF' | 'CLASSES' | 'DISCIPLINES';

export const AdminPanel: React.FC<AdminPanelProps> = ({ onShowToast }) => {
    const [activeTab, setActiveTab] = useState<TabType>('STUDENTS');
    const [loading, setLoading] = useState(true);

    // Data State
    const [students, setStudents] = useState<Student[]>([]);
    const [staff, setStaff] = useState<Teacher[]>([]);
    const [classes, setClasses] = useState<ClassRoom[]>([]);
    const [disciplines, setDisciplines] = useState<Discipline[]>([]);

    // Modal State
    const [showStudentModal, setShowStudentModal] = useState(false);
    const [showStaffModal, setShowStaffModal] = useState(false);
    const [showClassModal, setShowClassModal] = useState(false);
    const [showDisciplineModal, setShowDisciplineModal] = useState(false);

    // Filter State
    const [filterClass, setFilterClass] = useState<string>('');

    // Form State
    const [studentForm, setStudentForm] = useState({ name: '', parentEmail: '', className: '', photoUrl: '' });
    const [staffForm, setStaffForm] = useState({
        role: UserRole.TEACHER,
        name: '',
        email: '',
        photoUrl: '',
        assignments: [] as TeacherClassAssignment[]
    });
    const [classForm, setClassForm] = useState({ name: '', period: 'Matutino' });
    const [disciplineForm, setDisciplineForm] = useState({ name: '' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [fetchedStudents, fetchedTeachers, fetchedClasses, fetchedDisciplines] = await Promise.all([
                SupabaseService.getStudents(),
                SupabaseService.getTeachers(),
                SupabaseService.getClasses(),
                SupabaseService.getDisciplines()
            ]);
            setStudents(fetchedStudents);
            setStaff(fetchedTeachers);
            setClasses(fetchedClasses);
            setDisciplines(fetchedDisciplines);
        } catch (error) {
            console.error('Error loading data:', error);
            onShowToast('Erro ao carregar dados');
        } finally {
            setLoading(false);
        }
    };

    // Student Handlers
    const handleStudentSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentForm.name || !studentForm.className) {
            onShowToast('Nome e Turma são obrigatórios');
            return;
        }

        const success = await SupabaseService.createStudent({
            name: studentForm.name,
            parentEmail: studentForm.parentEmail,
            className: studentForm.className,
            photoUrl: studentForm.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentForm.name)}&background=random`
        });

        if (success) {
            onShowToast('Aluno cadastrado com sucesso!');
            setShowStudentModal(false);
            setStudentForm({ name: '', parentEmail: '', className: '', photoUrl: '' });
            loadData();
        } else {
            onShowToast('Erro ao cadastrar aluno');
        }
    };

    const handleDeleteStudent = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este aluno?')) return;
        const success = await SupabaseService.deleteStudent(id);
        if (success) {
            onShowToast('Aluno excluído');
            loadData();
        } else {
            onShowToast('Erro ao excluir aluno');
        }
    };

    // Staff Handlers
    const handleStaffSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!staffForm.name || !staffForm.email) {
            onShowToast('Nome e Email são obrigatórios');
            return;
        }

        const success = await SupabaseService.createTeacher({
            name: staffForm.name,
            email: staffForm.email,
            role: staffForm.role,
            subject: staffForm.assignments.length > 0 ? staffForm.assignments[0].subject : 'Múltiplas',
            assignments: staffForm.assignments,
            photoUrl: staffForm.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(staffForm.name)}&background=random`
        }, 'mudar123');

        if (success) {
            onShowToast('Membro cadastrado com sucesso!');
            setShowStaffModal(false);
            setStaffForm({ role: UserRole.TEACHER, name: '', email: '', photoUrl: '', assignments: [] });
            loadData();
        } else {
            onShowToast('Erro ao cadastrar membro');
        }
    };

    const handleDeleteStaff = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir este membro?')) return;
        const success = await SupabaseService.deleteTeacher(id);
        if (success) {
            onShowToast('Membro excluído');
            loadData();
        } else {
            onShowToast('Erro ao excluir membro');
        }
    };

    const addAssignment = () => {
        if (classes.length === 0 || disciplines.length === 0) {
            onShowToast('Cadastre turmas e disciplinas primeiro');
            return;
        }
        setStaffForm({
            ...staffForm,
            assignments: [...staffForm.assignments, { classId: classes[0].name, subject: disciplines[0].name }]
        });
    };

    const removeAssignment = (index: number) => {
        setStaffForm({
            ...staffForm,
            assignments: staffForm.assignments.filter((_, i) => i !== index)
        });
    };

    const updateAssignment = (index: number, field: 'classId' | 'subject', value: string) => {
        const newAssignments = [...staffForm.assignments];
        newAssignments[index][field] = value;
        setStaffForm({ ...staffForm, assignments: newAssignments });
    };

    // Class Handlers
    const handleClassSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!classForm.name || !classForm.period) {
            onShowToast('Nome e Período são obrigatórios');
            return;
        }

        const success = await SupabaseService.createClass({
            name: classForm.name,
            period: classForm.period
        });

        if (success) {
            onShowToast('Turma cadastrada com sucesso!');
            setShowClassModal(false);
            setClassForm({ name: '', period: 'Matutino' });
            loadData();
        } else {
            onShowToast('Erro ao cadastrar turma');
        }
    };

    const handleDeleteClass = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta turma?')) return;
        const success = await SupabaseService.deleteClass(id);
        if (success) {
            onShowToast('Turma excluída');
            loadData();
        } else {
            onShowToast('Erro ao excluir turma');
        }
    };

    // Discipline Handlers
    const handleDisciplineSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!disciplineForm.name) {
            onShowToast('Nome é obrigatório');
            return;
        }

        const success = await SupabaseService.createDiscipline({
            name: disciplineForm.name
        });

        if (success) {
            onShowToast('Disciplina cadastrada com sucesso!');
            setShowDisciplineModal(false);
            setDisciplineForm({ name: '' });
            loadData();
        } else {
            onShowToast('Erro ao cadastrar disciplina');
        }
    };

    const handleDeleteDiscipline = async (id: string) => {
        if (!confirm('Tem certeza que deseja excluir esta disciplina?')) return;
        const success = await SupabaseService.deleteDiscipline(id);
        if (success) {
            onShowToast('Disciplina excluída');
            loadData();
        } else {
            onShowToast('Erro ao excluir disciplina');
        }
    };

    // Helper Functions
    const getInitials = (name: string) => {
        return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const getAvatarColor = (name: string) => {
        const colors = [
            'bg-blue-500', 'bg-purple-500', 'bg-pink-500', 'bg-green-500',
            'bg-yellow-500', 'bg-red-500', 'bg-indigo-500', 'bg-teal-500'
        ];
        const index = name.charCodeAt(0) % colors.length;
        return colors[index];
    };

    const getRoleBadgeColor = (role: UserRole) => {
        switch (role) {
            case UserRole.COORDINATOR: return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
            case UserRole.TEACHER: return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30';
            case UserRole.MONITOR: return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    // Filtered Students
    const filteredStudents = filterClass
        ? students.filter(s => s.className === filterClass)
        : students;

    if (loading) {
        return (
            <div className="flex items-center justify-center p-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-3xl font-bold text-white">Administração</h1>
                    <p className="text-gray-400 text-sm">Gerencie alunos, equipe e turmas</p>
                </div>

                <button
                    onClick={() => {
                        if (activeTab === 'STUDENTS') setShowStudentModal(true);
                        else if (activeTab === 'STAFF') setShowStaffModal(true);
                        else if (activeTab === 'CLASSES') setShowClassModal(true);
                        else if (activeTab === 'DISCIPLINES') setShowDisciplineModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg font-bold transition-all shadow-lg"
                >
                    <Plus size={20} />
                    {activeTab === 'STUDENTS' && 'Novo Aluno'}
                    {activeTab === 'STAFF' && 'Novo Membro'}
                    {activeTab === 'CLASSES' && 'Nova Turma'}
                    {activeTab === 'DISCIPLINES' && 'Nova Disciplina'}
                </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-6 border-b border-gray-800 pb-2">
                <button
                    onClick={() => setActiveTab('STUDENTS')}
                    className={`flex items-center gap-2 px-4 py-2 font-bold transition-all ${activeTab === 'STUDENTS'
                        ? 'text-emerald-500 border-b-2 border-emerald-500'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <GraduationCap size={20} />
                    Alunos
                </button>
                <button
                    onClick={() => setActiveTab('STAFF')}
                    className={`flex items-center gap-2 px-4 py-2 font-bold transition-all ${activeTab === 'STAFF'
                        ? 'text-emerald-500 border-b-2 border-emerald-500'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <Users size={20} />
                    Equipe
                </button>
                <button
                    onClick={() => setActiveTab('CLASSES')}
                    className={`flex items-center gap-2 px-4 py-2 font-bold transition-all ${activeTab === 'CLASSES'
                        ? 'text-emerald-500 border-b-2 border-emerald-500'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <School size={20} />
                    Turmas
                </button>
                <button
                    onClick={() => setActiveTab('DISCIPLINES')}
                    className={`flex items-center gap-2 px-4 py-2 font-bold transition-all ${activeTab === 'DISCIPLINES'
                        ? 'text-emerald-500 border-b-2 border-emerald-500'
                        : 'text-gray-400 hover:text-white'
                        }`}
                >
                    <BookOpen size={20} />
                    Disciplinas
                </button>
            </div>

            {/* Filter Bar (Students Tab Only) */}
            {activeTab === 'STUDENTS' && (
                <div className="flex items-center gap-4 bg-[#0f172a] p-3 rounded-lg border border-gray-800">
                    <label className="text-sm font-bold text-gray-400 uppercase">Filtrar Turma:</label>
                    <select
                        value={filterClass}
                        onChange={(e) => setFilterClass(e.target.value)}
                        className="bg-[#1e293b] text-white border border-gray-700 rounded px-3 py-1.5 text-sm outline-none focus:border-emerald-500"
                    >
                        <option value="">Todas as Turmas</option>
                        {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                    </select>
                </div>
            )}

            {/* Content */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {/* Students Tab */}
                {activeTab === 'STUDENTS' && filteredStudents.map(student => (
                    <div key={student.id} className="bg-[#1e293b] rounded-xl border border-gray-700 p-4 hover:border-emerald-500/50 transition-all relative group">
                        <div className="absolute top-3 right-3">
                            <span className="text-[10px] font-bold px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                {student.className}
                            </span>
                        </div>

                        <div className="flex flex-col items-center text-center mt-6">
                            <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl mb-3 ${getAvatarColor(student.name)}`}>
                                {getInitials(student.name)}
                            </div>

                            <h3 className="text-white font-bold mb-1">{student.name}</h3>
                            <p className="text-xs text-gray-400 mb-2">{student.parentEmail}</p>
                            <p className="text-[10px] text-gray-500">ID: {student.id.substring(0, 8)}</p>

                            <div className="mt-3">
                                <span className="text-[10px] font-bold px-2 py-1 rounded bg-green-500/20 text-green-400 border border-green-500/30">
                                    Ativo
                                </span>
                            </div>
                        </div>

                        <button
                            onClick={() => handleDeleteStudent(student.id)}
                            className="absolute bottom-3 right-3 p-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded transition-all opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}

                {/* Staff Tab */}
                {activeTab === 'STAFF' && staff.map(member => (
                    <div key={member.id} className="bg-[#1e293b] rounded-xl border border-gray-700 p-4 hover:border-emerald-500/50 transition-all relative group">
                        <div className="absolute top-3 right-3">
                            <span className={`text-[10px] font-bold px-2 py-1 rounded border ${getRoleBadgeColor(member.role)}`}>
                                {member.role}
                            </span>
                        </div>

                        <div className="flex flex-col items-center text-center mt-6">
                            <div className="w-16 h-16 rounded-full bg-gray-700 flex items-center justify-center text-gray-400 mb-3">
                                <Users size={32} />
                            </div>

                            <h3 className="text-white font-bold mb-1">{member.name}</h3>
                            <p className="text-xs text-gray-400 mb-3">{member.email}</p>

                            {member.assignments && member.assignments.length > 0 && (
                                <div className="w-full space-y-1">
                                    {member.assignments.slice(0, 2).map((assignment, idx) => (
                                        <div key={idx} className="flex items-center gap-1 text-[10px] text-gray-400 bg-[#0f172a] px-2 py-1 rounded">
                                            <School size={10} className="text-emerald-500" />
                                            <span>{assignment.classId}</span>
                                            <span className="text-gray-600">•</span>
                                            <BookOpen size={10} className="text-orange-500" />
                                            <span>{assignment.subject}</span>
                                        </div>
                                    ))}
                                    {member.assignments.length > 2 && (
                                        <p className="text-[9px] text-gray-500">+{member.assignments.length - 2} mais</p>
                                    )}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={() => handleDeleteStaff(member.id)}
                            className="absolute bottom-3 right-3 p-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded transition-all opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}

                {/* Classes Tab */}
                {activeTab === 'CLASSES' && classes.map(classRoom => (
                    <div key={classRoom.id} className="bg-[#1e293b] rounded-xl border border-gray-700 p-6 hover:border-emerald-500/50 transition-all relative group">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-full bg-purple-500/20 flex items-center justify-center mb-3">
                                <School size={32} className="text-purple-500" />
                            </div>

                            <h3 className="text-white font-bold text-lg mb-1">{classRoom.name}</h3>
                            <p className="text-sm text-gray-400">Período: {classRoom.period}</p>
                        </div>

                        <button
                            onClick={() => handleDeleteClass(classRoom.id)}
                            className="absolute bottom-3 right-3 p-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded transition-all opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}

                {/* Disciplines Tab */}
                {activeTab === 'DISCIPLINES' && disciplines.map(discipline => (
                    <div key={discipline.id} className="bg-[#1e293b] rounded-xl border border-gray-700 p-6 hover:border-emerald-500/50 transition-all relative group">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-16 h-16 rounded-full bg-orange-500/20 flex items-center justify-center mb-3">
                                <BookOpen size={32} className="text-orange-500" />
                            </div>

                            <h3 className="text-white font-bold text-lg mb-1">{discipline.name}</h3>
                            <p className="text-xs text-gray-500">ID: {discipline.id.substring(0, 8)}</p>
                        </div>

                        <button
                            onClick={() => handleDeleteDiscipline(discipline.id)}
                            className="absolute bottom-3 right-3 p-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded transition-all opacity-0 group-hover:opacity-100"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>

            {/* Student Modal */}
            {showStudentModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1e293b] rounded-xl border border-gray-700 p-6 max-w-md w-full">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">Cadastrar Aluno</h2>
                            <button onClick={() => setShowStudentModal(false)} className="text-gray-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleStudentSubmit} className="space-y-4">
                            <div className="flex justify-center mb-4">
                                <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center relative group cursor-pointer">
                                    <Camera size={32} className="text-gray-500" />
                                    <div className="absolute inset-0 flex items-end justify-end">
                                        <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                                            <Plus size={16} className="text-white" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Nome Completo</label>
                                <input
                                    type="text"
                                    value={studentForm.name}
                                    onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                                    className="w-full bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-emerald-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Email do Responsável</label>
                                <input
                                    type="email"
                                    value={studentForm.parentEmail}
                                    onChange={(e) => setStudentForm({ ...studentForm, parentEmail: e.target.value })}
                                    className="w-full bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-emerald-500"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Turma</label>
                                <select
                                    value={studentForm.className}
                                    onChange={(e) => setStudentForm({ ...studentForm, className: e.target.value })}
                                    className="w-full bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-emerald-500"
                                    required
                                >
                                    <option value="">Selecione uma turma...</option>
                                    {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                            >
                                <BookOpen size={20} />
                                Salvar
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Staff Modal */}
            {showStaffModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
                    <div className="bg-[#1e293b] rounded-xl border border-gray-700 p-6 max-w-md w-full my-8">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">Cadastrar Membro</h2>
                            <button onClick={() => setShowStaffModal(false)} className="text-gray-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleStaffSubmit} className="space-y-4">
                            <div className="flex justify-center mb-4">
                                <div className="w-24 h-24 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center relative group cursor-pointer">
                                    <Camera size={32} className="text-gray-500" />
                                    <div className="absolute inset-0 flex items-end justify-end">
                                        <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                                            <Plus size={16} className="text-white" />
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Cargo</label>
                                <select
                                    value={staffForm.role}
                                    onChange={(e) => setStaffForm({ ...staffForm, role: e.target.value as UserRole })}
                                    className="w-full bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-emerald-500"
                                >
                                    <option value={UserRole.TEACHER}>Professor</option>
                                    <option value={UserRole.COORDINATOR}>Coordenador</option>
                                    <option value={UserRole.MONITOR}>Monitor</option>
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Nome</label>
                                <input
                                    type="text"
                                    value={staffForm.name}
                                    onChange={(e) => setStaffForm({ ...staffForm, name: e.target.value })}
                                    className="w-full bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-emerald-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Email (Login)</label>
                                <input
                                    type="email"
                                    value={staffForm.email}
                                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                                    className="w-full bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-emerald-500"
                                    required
                                />
                            </div>

                            <div className="border border-gray-700 rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-xs font-bold text-emerald-400 uppercase flex items-center gap-2">
                                        <School size={14} />
                                        Atribuições de Aulas
                                    </label>
                                    <button
                                        type="button"
                                        onClick={addAssignment}
                                        className="w-6 h-6 bg-emerald-500 rounded flex items-center justify-center hover:bg-emerald-600 transition-all"
                                    >
                                        <Plus size={14} className="text-white" />
                                    </button>
                                </div>

                                {staffForm.assignments.length === 0 ? (
                                    <p className="text-xs text-gray-500 italic">Nenhuma atribuição.</p>
                                ) : (
                                    <div className="space-y-2">
                                        {staffForm.assignments.map((assignment, idx) => (
                                            <div key={idx} className="flex gap-2">
                                                <select
                                                    value={assignment.classId}
                                                    onChange={(e) => updateAssignment(idx, 'classId', e.target.value)}
                                                    className="flex-1 bg-[#0f172a] border border-gray-700 rounded px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-500"
                                                >
                                                    {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                                </select>
                                                <select
                                                    value={assignment.subject}
                                                    onChange={(e) => updateAssignment(idx, 'subject', e.target.value)}
                                                    className="flex-1 bg-[#0f172a] border border-gray-700 rounded px-2 py-1.5 text-sm text-white outline-none focus:border-emerald-500"
                                                >
                                                    {disciplines.map(d => <option key={d.id} value={d.name}>{d.name}</option>)}
                                                </select>
                                                <button
                                                    type="button"
                                                    onClick={() => removeAssignment(idx)}
                                                    className="p-1.5 bg-red-600/20 hover:bg-red-600 text-red-400 hover:text-white rounded transition-all"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 flex items-start gap-2">
                                <Lock size={16} className="text-yellow-500 mt-0.5" />
                                <p className="text-xs text-yellow-400">Senha padrão será definida como: <strong>mudar123</strong></p>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                            >
                                <BookOpen size={20} />
                                Salvar
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Class Modal */}
            {showClassModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1e293b] rounded-xl border border-gray-700 p-6 max-w-md w-full">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">Cadastrar Turma</h2>
                            <button onClick={() => setShowClassModal(false)} className="text-gray-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleClassSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Nome da Turma (EX: 9º ANO A)</label>
                                <input
                                    type="text"
                                    value={classForm.name}
                                    onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                                    className="w-full bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-emerald-500"
                                    required
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Período</label>
                                <select
                                    value={classForm.period}
                                    onChange={(e) => setClassForm({ ...classForm, period: e.target.value })}
                                    className="w-full bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-emerald-500"
                                >
                                    <option value="Matutino">Matutino</option>
                                    <option value="Vespertino">Vespertino</option>
                                    <option value="Noturno">Noturno</option>
                                </select>
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                            >
                                <BookOpen size={20} />
                                Salvar
                            </button>
                        </form>
                    </div>
                </div>
            )}

            {/* Discipline Modal */}
            {showDisciplineModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-[#1e293b] rounded-xl border border-gray-700 p-6 max-w-md w-full">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">Cadastrar Disciplina</h2>
                            <button onClick={() => setShowDisciplineModal(false)} className="text-gray-400 hover:text-white">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleDisciplineSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-400 uppercase block mb-2">Nome da Disciplina (EX: MATEMÁTICA)</label>
                                <input
                                    type="text"
                                    value={disciplineForm.name}
                                    onChange={(e) => setDisciplineForm({ ...disciplineForm, name: e.target.value })}
                                    className="w-full bg-[#0f172a] border border-gray-700 rounded-lg px-4 py-3 text-white outline-none focus:border-emerald-500"
                                    required
                                />
                            </div>

                            <button
                                type="submit"
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 rounded-lg transition-all flex items-center justify-center gap-2"
                            >
                                <BookOpen size={20} />
                                Salvar
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
