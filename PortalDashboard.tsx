import React, { useState, useEffect } from 'react';
import {
    Activity, Calendar, GraduationCap,
    MessageSquare, FileText, CheckCircle,
    AlertCircle, TrendingUp, Clock, BookOpen
} from 'lucide-react';
import { SupabaseService } from './services/supabaseService';
import { StorageService } from './services/storageService';
import { ClassSession, Student, UserRole } from './types';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UserAvatar } from './components/UserAvatar';

interface PortalDashboardProps {
    userEmail: string;
    userRole: UserRole;
    onNavigate: (view: any) => void;
}

export const PortalDashboard: React.FC<PortalDashboardProps> = ({ userEmail, userRole, onNavigate }) => {
    const [student, setStudent] = useState<Student | null>(null);
    const [sessions, setSessions] = useState<ClassSession[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, [userEmail]);

    const loadData = async () => {
        setLoading(true);
        try {
            const allStudents = await SupabaseService.getStudents();
            // Find student by parent email or direct name/email (simplified for now)
            const me = allStudents.find(s => s.parentEmail === userEmail || s.name === userEmail);

            if (me) {
                setStudent(me);
                const allSessions = await SupabaseService.getSessions();
                const filtered = allSessions.filter(s => s.className === me.className);
                setSessions(filtered);
            }
        } catch (err) {
            console.error("Error loading portal data:", err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    if (!student) {
        return (
            <div className="max-w-md mx-auto mt-20 p-8 bg-[#0f172a] border border-gray-800 rounded-2xl text-center">
                <AlertCircle className="mx-auto text-amber-500 mb-4" size={48} />
                <h3 className="text-xl font-bold text-white mb-2">Dados não encontrados</h3>
                <p className="text-gray-400 text-sm">Não encontramos um aluno vinculado ao seu e-mail ({userEmail}). Por favor, entre em contato com a secretaria.</p>
            </div>
        );
    }

    // --- CALCULATIONS ---
    const myRecords = sessions.map(s => s.records.find(r => r.studentId === student.id)).filter(Boolean);

    // 1. Attendance
    const totalPresences = myRecords.filter(r => r?.present).length;
    const attendanceRate = myRecords.length > 0 ? ((totalPresences / myRecords.length) * 100).toFixed(1) : '0.0';

    // 2. Performance
    const grades = myRecords.map(r => r ? StorageService.calculateGrade(r) : 0);
    const avgGrade = grades.length > 0 ? (grades.reduce((a, b) => a + b, 0) / grades.length).toFixed(1) : '0.0';

    // 3. Recent Activity (Class Registers)
    const recentSessions = sessions.slice(0, 5);

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Welcome Header */}
            <div className="bg-gradient-to-r from-emerald-600/20 to-blue-600/20 border border-emerald-500/20 rounded-2xl p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6">
                <UserAvatar name={student.name} photoUrl={student.photoUrl} size="xl" />
                <div className="flex-1 text-center sm:text-left">
                    <h2 className="text-2xl sm:text-3xl font-bold text-white mb-1">Olá, {student.name.split(' ')[0]}!</h2>
                    <p className="text-emerald-400 font-medium">{student.className} • {userRole === UserRole.PARENT ? 'Espaço do Responsável' : 'Espaço do Aluno'}</p>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-4 mt-4">
                        <button onClick={() => onNavigate('MESSAGES')} className="flex items-center gap-2 px-4 py-2 bg-[#0f172a] border border-gray-800 hover:border-emerald-500/50 rounded-lg text-xs font-bold text-white transition-all">
                            <MessageSquare size={14} className="text-emerald-400" />
                            Ver Comunicados
                        </button>
                        <button onClick={() => onNavigate('FOA')} className="flex items-center gap-2 px-4 py-2 bg-[#0f172a] border border-gray-800 hover:border-emerald-500/50 rounded-lg text-xs font-bold text-white transition-all">
                            <FileText size={14} className="text-emerald-400" />
                            Ver FOA
                        </button>
                    </div>
                </div>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-[#0f172a] border border-gray-800 p-5 rounded-xl flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Presença</p>
                        <h4 className="text-2xl font-bold text-white">{attendanceRate}%</h4>
                    </div>
                    <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                        <CheckCircle size={22} className="text-emerald-400" />
                    </div>
                </div>

                <div className="bg-[#0f172a] border border-gray-800 p-5 rounded-xl flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Média Geral</p>
                        <h4 className="text-2xl font-bold text-white">{avgGrade}</h4>
                    </div>
                    <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
                        <TrendingUp size={22} className="text-blue-400" />
                    </div>
                </div>

                <div className="bg-[#0f172a] border border-gray-800 p-5 rounded-xl flex items-center justify-between">
                    <div>
                        <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-1">Atividades</p>
                        <h4 className="text-2xl font-bold text-white">{sessions.length}</h4>
                    </div>
                    <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
                        <Activity size={22} className="text-purple-400" />
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Recent Activities */}
                <div className="lg:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                            <Clock size={20} className="text-emerald-400" />
                            Atividades Recentes
                        </h3>
                    </div>

                    <div className="space-y-3">
                        {recentSessions.length === 0 ? (
                            <div className="bg-[#0f172a] border border-gray-800 border-dashed p-10 rounded-xl text-center">
                                <p className="text-gray-500 italic">Nenhum registro de aula recente.</p>
                            </div>
                        ) : (
                            recentSessions.map(sess => (
                                <div key={sess.id} className="bg-[#0f172a] border border-gray-800 p-5 rounded-xl hover:border-gray-700 transition-all group">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <div className="bg-gray-800 p-2 rounded-lg text-gray-400">
                                                <BookOpen size={18} />
                                            </div>
                                            <div>
                                                <h4 className="text-sm font-bold text-white group-hover:text-emerald-400 transition-colors">{sess.subject}</h4>
                                                <p className="text-xs text-gray-500">{format(new Date(sess.date), "dd 'de' MMMM", { locale: ptBR })} • {sess.block}</p>
                                            </div>
                                        </div>
                                        <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${sess.records.find(r => r.studentId === student.id)?.present
                                                ? 'bg-emerald-500/10 text-emerald-400'
                                                : 'bg-red-500/10 text-red-400'
                                            }`}>
                                            {sess.records.find(r => r.studentId === student.id)?.present ? 'Presente' : 'Faltou'}
                                        </div>
                                    </div>

                                    {sess.homework && (
                                        <div className="bg-gray-800/50 p-3 rounded-lg border-l-4 border-emerald-500 mt-2">
                                            <p className="text-[10px] text-emerald-400 font-bold uppercase mb-1 flex items-center gap-1">
                                                <AlertCircle size={10} /> Tarefa / Atividade
                                            </p>
                                            <p className="text-xs text-gray-300 leading-relaxed">{sess.homework}</p>
                                        </div>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Right Column: Mini Stats & Actions */}
                <div className="space-y-6">
                    {/* Focus Info */}
                    <div className="bg-[#0f172a] border border-gray-800 rounded-xl p-5">
                        <h3 className="font-bold text-white mb-4 flex items-center gap-2">
                            <GraduationCap size={18} className="text-emerald-400" />
                            Destaques do Semestre
                        </h3>
                        <div className="space-y-4 text-sm">
                            <div className="flex justify-between items-center text-gray-400 uppercase text-[10px] font-bold tracking-widest border-b border-gray-800 pb-2">
                                <span>Disciplina</span>
                                <span>Status</span>
                            </div>
                            {/* We could aggregate grades by subject here, but for now we list placeholders or just icons */}
                            <div className="flex items-center justify-between">
                                <span className="text-gray-300">Presença Geral</span>
                                <span className="text-emerald-400 font-bold">{attendanceRate}%</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-gray-300">Desempenho</span>
                                <span className="text-blue-400 font-bold">{avgGrade}</span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Request */}
                    <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5 text-center">
                        <h4 className="text-sm font-bold text-white mb-2">Precisa de algo?</h4>
                        <p className="text-xs text-gray-500 mb-4 px-2">Solicite justificativas de falta ou documentos diretamente pelo portal.</p>
                        <button onClick={() => onNavigate('REQUESTS')} className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-[#0f172a] rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-2">
                            <Clock size={14} />
                            Fazer Solicitação
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
