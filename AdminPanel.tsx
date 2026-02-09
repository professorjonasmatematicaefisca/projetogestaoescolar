import React, { useState, useEffect } from 'react';
import { UserPlus, Users, School, BookOpen, Save, Edit, Trash2, X, Plus } from 'lucide-react';
import { StorageService } from './services/storageService';
import { Student, Teacher, ClassRoom, Discipline, UserRole } from './types';

interface AdminPanelProps {
    onShowToast: (msg: string) => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ onShowToast }) => {
    const [activeTab, setActiveTab] = useState<'STUDENTS' | 'TEACHERS' | 'CLASSES' | 'DISCIPLINES'>('STUDENTS');

    // Students State
    const [students, setStudents] = useState<Student[]>([]);
    const [studentForm, setStudentForm] = useState({ id: '', name: '', parentEmail: '', className: '', photoUrl: '' });
    const [editingStudent, setEditingStudent] = useState<string | null>(null);

    // Teachers State
    const [teachers, setTeachers] = useState<Teacher[]>([]);
    const [teacherForm, setTeacherForm] = useState({ id: '', name: '', email: '', subject: '', photoUrl: '' });
    const [editingTeacher, setEditingTeacher] = useState<string | null>(null);

    // Classes State
    const [classes, setClasses] = useState<ClassRoom[]>([]);
    const [classForm, setClassForm] = useState({ id: '', name: '', period: '' });
    const [editingClass, setEditingClass] = useState<string | null>(null);

    // Disciplines State
    const [disciplines, setDisciplines] = useState<Discipline[]>([]);
    const [disciplineForm, setDisciplineForm] = useState({ id: '', name: '' });
    const [editingDiscipline, setEditingDiscipline] = useState<string | null>(null);

    useEffect(() => {
        loadAllData();
    }, []);

    const loadAllData = () => {
        setStudents(StorageService.getStudents());
        setTeachers(StorageService.getTeachers());
        setClasses(StorageService.getClasses());
        setDisciplines(StorageService.getDisciplines());
    };

    // Students CRUD
    const handleStudentSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!studentForm.name || !studentForm.className) {
            onShowToast('Nome e Turma são obrigatórios');
            return;
        }

        if (editingStudent) {
            StorageService.updateStudent({ ...studentForm, id: editingStudent });
            onShowToast('Aluno atualizado com sucesso!');
            setEditingStudent(null);
        } else {
            const newStudent: Student = {
                id: `std-${Date.now()}`,
                name: studentForm.name,
                parentEmail: studentForm.parentEmail,
                className: studentForm.className,
                photoUrl: studentForm.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(studentForm.name)}&background=random`
            };
            StorageService.addStudent(newStudent);
            onShowToast('Aluno cadastrado com sucesso!');
        }

        setStudentForm({ id: '', name: '', parentEmail: '', className: '', photoUrl: '' });
        loadAllData();
    };

    const editStudent = (student: Student) => {
        setStudentForm(student);
        setEditingStudent(student.id);
    };

    const deleteStudent = (id: string) => {
        if (confirm('Tem certeza que deseja excluir este aluno?')) {
            StorageService.deleteStudent(id);
            onShowToast('Aluno excluído');
            loadAllData();
        }
    };

    // Teachers CRUD
    const handleTeacherSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!teacherForm.name || !teacherForm.email) {
            onShowToast('Nome e Email são obrigatórios');
            return;
        }

        if (editingTeacher) {
            StorageService.updateTeacher({ ...teacherForm, id: editingTeacher });
            StorageService.updateUser({
                id: editingTeacher,
                name: teacherForm.name,
                email: teacherForm.email,
                role: UserRole.TEACHER,
                subject: teacherForm.subject,
                photoUrl: teacherForm.photoUrl
            });
            onShowToast('Professor atualizado com sucesso!');
            setEditingTeacher(null);
        } else {
            const newTeacher: Teacher = {
                id: `prof-${Date.now()}`,
                name: teacherForm.name,
                email: teacherForm.email,
                subject: teacherForm.subject,
                photoUrl: teacherForm.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(teacherForm.name)}&background=random`
            };
            StorageService.addTeacher(newTeacher);
            StorageService.addUser({
                id: newTeacher.id,
                name: newTeacher.name,
                email: newTeacher.email,
                role: UserRole.TEACHER,
                subject: newTeacher.subject,
                photoUrl: newTeacher.photoUrl,
                password: 'mudar123'
            });
            onShowToast('Professor cadastrado com sucesso!');
        }

        setTeacherForm({ id: '', name: '', email: '', subject: '', photoUrl: '' });
        loadAllData();
    };

    const editTeacher = (teacher: Teacher) => {
        setTeacherForm(teacher);
        setEditingTeacher(teacher.id);
    };

    const deleteTeacher = (id: string) => {
        if (confirm('Tem certeza que deseja excluir este professor?')) {
            StorageService.deleteTeacher(id);
            StorageService.deleteUser(id);
            onShowToast('Professor excluído');
            loadAllData();
        }
    };

    // Classes CRUD
    const handleClassSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!classForm.name || !classForm.period) {
            onShowToast('Nome e Período são obrigatórios');
            return;
        }

        if (editingClass) {
            StorageService.updateClass({ ...classForm, id: editingClass });
            onShowToast('Turma atualizada com sucesso!');
            setEditingClass(null);
        } else {
            const newClass: ClassRoom = {
                id: `class-${Date.now()}`,
                name: classForm.name,
                period: classForm.period
            };
            StorageService.addClass(newClass);
            onShowToast('Turma cadastrada com sucesso!');
        }

        setClassForm({ id: '', name: '', period: '' });
        loadAllData();
    };

    const editClass = (cls: ClassRoom) => {
        setClassForm(cls);
        setEditingClass(cls.id);
    };

    const deleteClass = (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta turma?')) {
            StorageService.deleteClass(id);
            onShowToast('Turma excluída');
            loadAllData();
        }
    };

    // Disciplines CRUD
    const handleDisciplineSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!disciplineForm.name) {
            onShowToast('Nome é obrigatório');
            return;
        }

        if (editingDiscipline) {
            onShowToast('Edição de disciplinas em breve');
            setEditingDiscipline(null);
        } else {
            const newDiscipline: Discipline = {
                id: `disc-${Date.now()}`,
                name: disciplineForm.name
            };
            StorageService.addDiscipline(newDiscipline);
            onShowToast('Disciplina cadastrada com sucesso!');
        }

        setDisciplineForm({ id: '', name: '' });
        loadAllData();
    };

    const deleteDiscipline = (id: string) => {
        if (confirm('Tem certeza que deseja excluir esta disciplina?')) {
            StorageService.deleteDiscipline(id);
            onShowToast('Disciplina excluída');
            loadAllData();
        }
    };

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                    <UserPlus className="text-emerald-500" />
                    Painel Administrativo
                </h2>
                <div className="flex bg-[#0f172a] rounded-lg p-1 border border-gray-800">
                    <button
                        onClick={() => setActiveTab('STUDENTS')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'STUDENTS' ? 'bg-emerald-500 text-[#0f172a]' : 'text-gray-400 hover:text-white'}`}
                    >
                        Alunos
                    </button>
                    <button
                        onClick={() => setActiveTab('TEACHERS')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'TEACHERS' ? 'bg-emerald-500 text-[#0f172a]' : 'text-gray-400 hover:text-white'}`}
                    >
                        Professores
                    </button>
                    <button
                        onClick={() => setActiveTab('CLASSES')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'CLASSES' ? 'bg-emerald-500 text-[#0f172a]' : 'text-gray-400 hover:text-white'}`}
                    >
                        Turmas
                    </button>
                    <button
                        onClick={() => setActiveTab('DISCIPLINES')}
                        className={`px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'DISCIPLINES' ? 'bg-emerald-500 text-[#0f172a]' : 'text-gray-400 hover:text-white'}`}
                    >
                        Disciplinas
                    </button>
                </div>
            </div>

            {/* STUDENTS TAB */}
            {activeTab === 'STUDENTS' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-[#0f172a] rounded-xl border border-gray-800 p-6 shadow-xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Plus size={20} className="text-emerald-500" />
                            {editingStudent ? 'Editar Aluno' : 'Novo Aluno'}
                        </h3>
                        <form onSubmit={handleStudentSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Nome Completo</label>
                                <input
                                    type="text"
                                    value={studentForm.name}
                                    onChange={e => setStudentForm({ ...studentForm, name: e.target.value })}
                                    className="w-full bg-[#1e293b] border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 outline-none"
                                    placeholder="Ex: João da Silva"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Email do Responsável</label>
                                <input
                                    type="email"
                                    value={studentForm.parentEmail}
                                    onChange={e => setStudentForm({ ...studentForm, parentEmail: e.target.value })}
                                    className="w-full bg-[#1e293b] border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 outline-none"
                                    placeholder="Ex: pais@email.com"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Turma</label>
                                <select
                                    value={studentForm.className}
                                    onChange={e => setStudentForm({ ...studentForm, className: e.target.value })}
                                    className="w-full bg-[#1e293b] border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 outline-none"
                                >
                                    <option value="">Selecione uma turma</option>
                                    {classes.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Foto URL (Opcional)</label>
                                <input
                                    type="text"
                                    value={studentForm.photoUrl}
                                    onChange={e => setStudentForm({ ...studentForm, photoUrl: e.target.value })}
                                    className="w-full bg-[#1e293b] border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 outline-none"
                                    placeholder="https://..."
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
                                >
                                    <Save size={20} />
                                    {editingStudent ? 'Atualizar' : 'Cadastrar'}
                                </button>
                                {editingStudent && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingStudent(null);
                                            setStudentForm({ id: '', name: '', parentEmail: '', className: '', photoUrl: '' });
                                        }}
                                        className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-all"
                                    >
                                        <X size={20} />
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    <div className="bg-[#0f172a] rounded-xl border border-gray-800 p-6 shadow-xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Users size={20} className="text-emerald-500" />
                            Alunos Cadastrados ({students.length})
                        </h3>
                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                            {students.map(student => (
                                <div key={student.id} className="bg-[#1e293b] border border-gray-700 rounded-lg p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <img src={student.photoUrl} className="w-10 h-10 rounded-full" alt={student.name} />
                                        <div>
                                            <p className="text-white font-bold">{student.name}</p>
                                            <p className="text-xs text-gray-400">{student.className}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => editStudent(student)}
                                            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all"
                                        >
                                            <Edit size={16} className="text-white" />
                                        </button>
                                        <button
                                            onClick={() => deleteStudent(student.id)}
                                            className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-all"
                                        >
                                            <Trash2 size={16} className="text-white" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* TEACHERS TAB */}
            {activeTab === 'TEACHERS' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-[#0f172a] rounded-xl border border-gray-800 p-6 shadow-xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Plus size={20} className="text-emerald-500" />
                            {editingTeacher ? 'Editar Professor' : 'Novo Professor'}
                        </h3>
                        <form onSubmit={handleTeacherSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Nome</label>
                                <input
                                    type="text"
                                    value={teacherForm.name}
                                    onChange={e => setTeacherForm({ ...teacherForm, name: e.target.value })}
                                    className="w-full bg-[#1e293b] border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 outline-none"
                                    placeholder="Prof. exemplo"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Email</label>
                                <input
                                    type="email"
                                    value={teacherForm.email}
                                    onChange={e => setTeacherForm({ ...teacherForm, email: e.target.value })}
                                    className="w-full bg-[#1e293b] border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 outline-none"
                                    placeholder="professor@escola.com"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Disciplina Principal</label>
                                <input
                                    type="text"
                                    value={teacherForm.subject}
                                    onChange={e => setTeacherForm({ ...teacherForm, subject: e.target.value })}
                                    className="w-full bg-[#1e293b] border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 outline-none"
                                    placeholder="Matemática, História..."
                                />
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
                                >
                                    <Save size={20} />
                                    {editingTeacher ? 'Atualizar' : 'Cadastrar'}
                                </button>
                                {editingTeacher && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingTeacher(null);
                                            setTeacherForm({ id: '', name: '', email: '', subject: '', photoUrl: '' });
                                        }}
                                        className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-all"
                                    >
                                        <X size={20} />
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    <div className="bg-[#0f172a] rounded-xl border border-gray-800 p-6 shadow-xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Users size={20} className="text-emerald-500" />
                            Professores Cadastrados ({teachers.length})
                        </h3>
                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                            {teachers.map(teacher => (
                                <div key={teacher.id} className="bg-[#1e293b] border border-gray-700 rounded-lg p-4 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <img src={teacher.photoUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(teacher.name)}`} className="w-10 h-10 rounded-full" alt={teacher.name} />
                                        <div>
                                            <p className="text-white font-bold">{teacher.name}</p>
                                            <p className="text-xs text-gray-400">{teacher.subject}</p>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => editTeacher(teacher)}
                                            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all"
                                        >
                                            <Edit size={16} className="text-white" />
                                        </button>
                                        <button
                                            onClick={() => deleteTeacher(teacher.id)}
                                            className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-all"
                                        >
                                            <Trash2 size={16} className="text-white" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* CLASSES TAB */}
            {activeTab === 'CLASSES' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-[#0f172a] rounded-xl border border-gray-800 p-6 shadow-xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Plus size={20} className="text-emerald-500" />
                            {editingClass ? 'Editar Turma' : 'Nova Turma'}
                        </h3>
                        <form onSubmit={handleClassSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Nome da Turma</label>
                                <input
                                    type="text"
                                    value={classForm.name}
                                    onChange={e => setClassForm({ ...classForm, name: e.target.value })}
                                    className="w-full bg-[#1e293b] border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 outline-none"
                                    placeholder="Ex: 1º AEM, 9º Ano A"
                                />
                            </div>
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Período</label>
                                <select
                                    value={classForm.period}
                                    onChange={e => setClassForm({ ...classForm, period: e.target.value })}
                                    className="w-full bg-[#1e293b] border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 outline-none"
                                >
                                    <option value="">Selecione</option>
                                    <option value="Matutino">Matutino</option>
                                    <option value="Vespertino">Vespertino</option>
                                    <option value="Noturno">Noturno</option>
                                </select>
                            </div>
                            <div className="flex gap-2">
                                <button
                                    type="submit"
                                    className="flex-1 bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
                                >
                                    <Save size={20} />
                                    {editingClass ? 'Atualizar' : 'Cadastrar'}
                                </button>
                                {editingClass && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setEditingClass(null);
                                            setClassForm({ id: '', name: '', period: '' });
                                        }}
                                        className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-lg transition-all"
                                    >
                                        <X size={20} />
                                    </button>
                                )}
                            </div>
                        </form>
                    </div>

                    <div className="bg-[#0f172a] rounded-xl border border-gray-800 p-6 shadow-xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <School size={20} className="text-emerald-500" />
                            Turmas Cadastradas ({classes.length})
                        </h3>
                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                            {classes.map(cls => (
                                <div key={cls.id} className="bg-[#1e293b] border border-gray-700 rounded-lg p-4 flex items-center justify-between">
                                    <div>
                                        <p className="text-white font-bold">{cls.name}</p>
                                        <p className="text-xs text-gray-400">{cls.period}</p>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => editClass(cls)}
                                            className="p-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition-all"
                                        >
                                            <Edit size={16} className="text-white" />
                                        </button>
                                        <button
                                            onClick={() => deleteClass(cls.id)}
                                            className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-all"
                                        >
                                            <Trash2 size={16} className="text-white" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* DISCIPLINES TAB */}
            {activeTab === 'DISCIPLINES' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="bg-[#0f172a] rounded-xl border border-gray-800 p-6 shadow-xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <Plus size={20} className="text-emerald-500" />
                            Nova Disciplina
                        </h3>
                        <form onSubmit={handleDisciplineSubmit} className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase">Nome da Disciplina</label>
                                <input
                                    type="text"
                                    value={disciplineForm.name}
                                    onChange={e => setDisciplineForm({ ...disciplineForm, name: e.target.value })}
                                    className="w-full bg-[#1e293b] border border-gray-700 rounded-lg px-4 py-3 text-white focus:border-emerald-500 outline-none"
                                    placeholder="Ex: Matemática, História"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold py-3 px-6 rounded-lg transition-all flex items-center justify-center gap-2"
                            >
                                <Save size={20} />
                                Cadastrar
                            </button>
                        </form>
                    </div>

                    <div className="bg-[#0f172a] rounded-xl border border-gray-800 p-6 shadow-xl">
                        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                            <BookOpen size={20} className="text-emerald-500" />
                            Disciplinas Cadastradas ({disciplines.length})
                        </h3>
                        <div className="space-y-2 max-h-[500px] overflow-y-auto">
                            {disciplines.map(discipline => (
                                <div key={discipline.id} className="bg-[#1e293b] border border-gray-700 rounded-lg p-4 flex items-center justify-between">
                                    <p className="text-white font-bold">{discipline.name}</p>
                                    <button
                                        onClick={() => deleteDiscipline(discipline.id)}
                                        className="p-2 bg-red-600 hover:bg-red-700 rounded-lg transition-all"
                                    >
                                        <Trash2 size={16} className="text-white" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
