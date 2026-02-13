import React, { useState } from 'react';
import { Occurrence, OccurrenceType, OccurrenceStatus, Student, ClassRoom, StudentExit } from './types';
import { StorageService } from './services/storageService';
import { SupabaseService } from './services/supabaseService';
import { AlertTriangle, Plus, X, Search, Heart, Shield, AlertCircle, ThumbsUp, Camera, Save, Filter, RefreshCw, Clock, LogOut, LogIn, CheckCircle, GraduationCap, BarChart3, Calendar } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useEffect } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface OccurrencesProps {
    onShowToast: (msg: string) => void;
}

export const Occurrences: React.FC<OccurrencesProps> = ({ onShowToast }) => {
    const [occurrences, setOccurrences] = useState<Occurrence[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [loading, setLoading] = useState(true);
    const [isFormOpen, setIsFormOpen] = useState(false);

    // Form State
    const [newType, setNewType] = useState<OccurrenceType>(OccurrenceType.DISCIPLINE);
    const [newDesc, setNewDesc] = useState('');
    const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
    const [status, setStatus] = useState<OccurrenceStatus>(OccurrenceStatus.OPEN);

    // Monitoria State
    const [activeTab, setActiveTab] = useState<'OCCURRENCES' | 'EXITS' | 'REPORTS'>('OCCURRENCES');

    // Data State
    const [openExits, setOpenExits] = useState<StudentExit[]>([]);
    const [exitHistory, setExitHistory] = useState<StudentExit[]>([]);
    const [classes, setClasses] = useState<ClassRoom[]>([]);

    // Filters & Selection
    const [selectedClassId, setSelectedClassId] = useState<string>('');
    const [selectedExitReasons, setSelectedExitReasons] = useState<string[]>([]);

    // Filters & Selection

    // Reports State
    const getTodayDate = () => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    };
    const [reportDateRange, setReportDateRange] = useState({ start: getTodayDate(), end: getTodayDate() });
    const [reportClassId, setReportClassId] = useState('');
    const [reportStudentId, setReportStudentId] = useState('');
    const [selectedStudentForModal, setSelectedStudentForModal] = useState<Student | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const EXIT_REASONS = ['Banheiro', 'Água', 'Coordenação', 'Enfermaria', 'Diretoria', 'Apoio Pedagógico'];
    const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [obs, sts, cls, open, hist] = await Promise.all([
                    SupabaseService.getOccurrences(),
                    SupabaseService.getStudents(),
                    SupabaseService.getClasses(),
                    SupabaseService.getOpenExits(),
                    SupabaseService.getExitHistory()
                ]);
                setOccurrences(obs);
                setStudents(sts);
                setClasses(cls);
                setOpenExits(open);
                setExitHistory(hist);
            } catch (error) {
                console.error("Error fetching data:", error);
                onShowToast("Erro ao carregar dados.");
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    const filteredStudents = selectedClassId
        ? students.filter(s => s.className === classes.find(c => c.id === selectedClassId)?.name)
        : students;

    // Report Data Generation
    const getReportData = () => {
        // Filter history based on date and class
        let filteredHistory = [...exitHistory];

        // Filter by date range
        if (reportDateRange.start) {
            filteredHistory = filteredHistory.filter(h => {
                const exitDate = new Date(h.exitTime).toISOString().split('T')[0];
                return exitDate >= reportDateRange.start && (!reportDateRange.end || exitDate <= reportDateRange.end);
            });
        }

        if (reportClassId) {
            filteredHistory = filteredHistory.filter(h => h.className === classes.find(c => c.id === reportClassId)?.name);
        }

        if (reportStudentId) {
            filteredHistory = filteredHistory.filter(h => h.studentId === reportStudentId);
        }

        // Basic stats
        const totalExits = filteredHistory.length;
        const totalTime = filteredHistory.reduce((acc, curr) => {
            if (!curr.returnTime) return acc;
            const start = new Date(curr.exitTime).getTime();
            const end = new Date(curr.returnTime).getTime();
            return acc + (end - start);
        }, 0);
        const avgTime = totalExits > 0 ? Math.round((totalTime / 60000) / totalExits) : 0;

        // Charts Data
        const reasonCounts = filteredHistory.reduce((acc, curr) => {
            curr.reasons.forEach(r => {
                acc[r] = (acc[r] || 0) + 1;
            });
            return acc;
        }, {} as Record<string, number>);

        const pieData = Object.entries(reasonCounts).map(([name, value]) => ({ name, value }));

        // Ranking de Alunos
        const studentExitCounts = filteredHistory.reduce((acc, curr) => {
            const studentId = curr.studentId;
            if (!acc[studentId]) {
                acc[studentId] = {
                    studentId,
                    studentName: curr.studentName,
                    studentPhoto: curr.studentPhoto,
                    className: curr.className,
                    exitCount: 0,
                    exits: []
                };
            }
            acc[studentId].exitCount++;
            acc[studentId].exits.push(curr);
            return acc;
        }, {} as Record<string, { studentId: string; studentName: string; studentPhoto: string; className: string; exitCount: number; exits: StudentExit[] }>);

        type RankingStudent = { studentId: string; studentName: string; studentPhoto: string; className: string; exitCount: number; exits: StudentExit[] };
        const ranking: RankingStudent[] = (Object.values(studentExitCounts) as RankingStudent[]).sort((a, b) => b.exitCount - a.exitCount);

        return { totalExits, avgTime, pieData, filteredHistory, ranking };
    };

    const reportData = getReportData();

    const handleCreate = async () => {
        if (!newDesc || selectedStudentIds.length === 0) return;

        const newOccurrence: Occurrence = {
            id: `occ-${Date.now()}`,
            type: newType,
            description: newDesc,
            studentIds: selectedStudentIds,
            date: new Date().toISOString(),
            status: status,
            reportedBy: 'Usuário Atual'
        };

        const success = await SupabaseService.saveOccurrence(newOccurrence);
        if (success) {
            const updated = await SupabaseService.getOccurrences();
            setOccurrences(updated);
            setIsFormOpen(false);
            setNewDesc('');
            setSelectedStudentIds([]);
            onShowToast("Ocorrência registrada no banco de dados!");
        } else {
            onShowToast("Erro ao salvar no banco. Tentando localmente...");
            StorageService.saveOccurrence(newOccurrence);
            setOccurrences(StorageService.getOccurrences());
        }
    };

    const handleRegisterExit = async () => {
        if (selectedStudentIds.length === 0 || selectedExitReasons.length === 0) {
            onShowToast("Selecione alunos e motivos.");
            return;
        }

        // Get logged user from localStorage
        const loggedUser = localStorage.getItem('userName') || 'Sistema';

        let successCount = 0;
        let lastError = "";

        for (const studentId of selectedStudentIds) {
            const { success, error } = await SupabaseService.registerExit(studentId, selectedExitReasons, loggedUser);
            if (success) {
                successCount++;
            } else {
                lastError = error || "Erro desconhecido";
            }
        }

        if (successCount > 0) {
            onShowToast(`${successCount} saída(s) registrada(s).`);
            const open = await SupabaseService.getOpenExits();
            setOpenExits(open);
            setSelectedStudentIds([]);
            setSelectedExitReasons([]);
        } else if (lastError) {
            onShowToast(`Erro ao registrar: ${lastError}`);
            console.error("Registration check failed:", lastError);
        }
    };

    const handleRegisterReturn = async (exitId: string) => {
        const success = await SupabaseService.registerReturn(exitId);
        if (success) {
            onShowToast("Retorno registrado.");
            const [open, hist] = await Promise.all([
                SupabaseService.getOpenExits(),
                SupabaseService.getExitHistory()
            ]);
            setOpenExits(open);
            setExitHistory(hist);
        }
    };

    const generateStudentPDF = (student: Student) => {
        const doc = new jsPDF();

        // Header
        doc.setFontSize(18);
        doc.setTextColor(16, 185, 129); // Emerald color
        doc.text('Relatório de Saídas - Monitoria', 14, 20);

        // Student Info
        doc.setFontSize(12);
        doc.setTextColor(0, 0, 0);
        doc.text(`Aluno: ${student.name}`, 14, 35);
        doc.text(`Turma: ${student.className}`, 14, 42);
        doc.text(`Data de Geração: ${new Date().toLocaleDateString('pt-BR')}`, 14, 49);

        // Filter student exits
        const studentExits = exitHistory.filter(exit => exit.studentId === student.id);

        // Table data
        const tableData = studentExits.map(exit => [
            new Date(exit.exitTime).toLocaleDateString('pt-BR'),
            new Date(exit.exitTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
            exit.returnTime ? new Date(exit.returnTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-',
            exit.reasons.join(', '),
            formatDuration(exit.exitTime, exit.returnTime),
            exit.registeredBy || 'Sistema'
        ]);

        // Generate table
        autoTable(doc, {
            head: [['Data', 'Saída', 'Retorno', 'Motivo', 'Tempo', 'Registrado por']],
            body: tableData,
            startY: 60,
            theme: 'grid',
            headStyles: { fillColor: [16, 185, 129] },
            styles: { fontSize: 9 }
        });

        // Save PDF
        doc.save(`relatorio_${student.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.pdf`);
        onShowToast('PDF gerado com sucesso!');
    };

    const formatDuration = (start: string, end?: string) => {
        const startTime = new Date(start).getTime();
        const endTime = end ? new Date(end).getTime() : Date.now();
        const diffMs = endTime - startTime;
        const diffMins = Math.floor(diffMs / 60000);
        return `${diffMins} min`;
    };

    const getTypeIcon = (type: OccurrenceType) => {
        switch (type) {
            case OccurrenceType.DISCIPLINE: return <AlertTriangle size={24} />;
            case OccurrenceType.HEALTH: return <Heart size={24} />;
            case OccurrenceType.CONFLICT: return <Shield size={24} />;
            case OccurrenceType.PRAISE: return <ThumbsUp size={24} />;
        }
    };

    const getTypeLabel = (type: OccurrenceType) => {
        switch (type) {
            case OccurrenceType.DISCIPLINE: return 'Indisciplina';
            case OccurrenceType.HEALTH: return 'Saúde';
            case OccurrenceType.CONFLICT: return 'Conflito';
            case OccurrenceType.PRAISE: return 'Elogio';
        }
    }

    if (loading) return <div className="text-white p-6">Carregando ocorrências...</div>;

    return (
        <div className="max-w-[1600px] mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
                <div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 mb-1">
                        <span>Gestão Escolar</span>
                        <span>/</span>
                        <span className="text-emerald-500 font-bold">Monitoria</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <h2 className="text-3xl font-bold text-white">Central de Monitoria</h2>
                        <div className="flex bg-[#1e293b] rounded-lg p-1 border border-gray-700">
                            {[
                                { id: 'OCCURRENCES', label: 'OCORRÊNCIAS', icon: AlertTriangle },
                                { id: 'EXITS', label: 'SAÍDAS', icon: LogOut },
                                { id: 'REPORTS', label: 'RELATÓRIOS', icon: BarChart3 }
                            ].map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id as any)}
                                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors flex items-center gap-2 ${activeTab === tab.id
                                        ? 'bg-emerald-500 text-[#0f172a]'
                                        : 'text-gray-400 hover:text-white'
                                        }`}
                                >
                                    <tab.icon size={14} />
                                    {tab.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button className="bg-emerald-500 text-[#0f172a] px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-400 transition-colors">
                        <AlertCircle size={18} />
                        Alerta SOS
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border-2 border-white">
                        <img src="https://i.pravatar.cc/150?u=admin" />
                    </div>
                </div>
            </div>

            {activeTab === 'REPORTS' && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    {/* Filters */}
                    <div className="bg-[#0f172a] border border-gray-800 rounded-xl p-6 shadow-lg">
                        <div className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1">
                                <label className="block text-gray-400 text-xs font-bold uppercase mb-2">Filtrar por Turma</label>
                                <select
                                    className="w-full bg-[#1e293b] border border-gray-700 rounded-lg py-2.5 px-4 text-white outline-none focus:border-emerald-500"
                                    value={reportClassId}
                                    onChange={(e) => setReportClassId(e.target.value)}
                                >
                                    <option value="">Todas as Turmas</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="flex-1">
                                <label className="block text-gray-400 text-xs font-bold uppercase mb-2">Período</label>
                                <div className="flex gap-2">
                                    <input
                                        type="date"
                                        className="w-full bg-[#1e293b] border border-gray-700 rounded-lg py-2.5 px-4 text-white"
                                        value={reportDateRange.start}
                                        onChange={(e) => setReportDateRange({ ...reportDateRange, start: e.target.value })}
                                    />
                                    <input
                                        type="date"
                                        className="w-full bg-[#1e293b] border border-gray-700 rounded-lg py-2.5 px-4 text-white"
                                        value={reportDateRange.end}
                                        onChange={(e) => setReportDateRange({ ...reportDateRange, end: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="flex-1">
                                <label className="block text-gray-400 text-xs font-bold uppercase mb-2">Aluno (Opcional)</label>
                                <select
                                    className="w-full bg-[#1e293b] border border-gray-700 rounded-lg py-2.5 px-4 text-white outline-none focus:border-emerald-500"
                                    value={reportStudentId}
                                    onChange={(e) => setReportStudentId(e.target.value)}
                                >
                                    <option value="">Todos os Alunos</option>
                                    {students
                                        .filter(s => !reportClassId || s.className === classes.find(c => c.id === reportClassId)?.name)
                                        .map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                                </select>
                            </div>
                            <button className="px-6 py-2.5 bg-emerald-500 text-[#0f172a] font-bold rounded-lg hover:bg-emerald-400 transition-colors">
                                <Filter size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Dashboard Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-[#1e293b] border border-gray-700 rounded-xl p-6">
                            <h4 className="text-gray-400 text-xs font-bold uppercase mb-2">Total de Saídas</h4>
                            <p className="text-4xl font-bold text-white text-emerald-500">{reportData.totalExits}</p>
                        </div>
                        <div className="bg-[#1e293b] border border-gray-700 rounded-xl p-6">
                            <h4 className="text-gray-400 text-xs font-bold uppercase mb-2">Tempo Médio Fora</h4>
                            <p className="text-4xl font-bold text-white text-blue-500">{reportData.avgTime}<span className="text-lg text-gray-500 ml-1">min</span></p>
                        </div>
                        <div className="bg-[#1e293b] border border-gray-700 rounded-xl p-6">
                            <h4 className="text-gray-400 text-xs font-bold uppercase mb-2">Motivo Principal</h4>
                            <p className="text-4xl font-bold text-white text-orange-500">
                                {reportData.pieData.sort((a, b) => Number(b.value) - Number(a.value))[0]?.name || '-'}
                            </p>
                        </div>
                    </div>

                    {/* Ranking de Alunos */}
                    <div className="bg-[#0f172a] border border-gray-800 rounded-xl p-6 shadow-lg">
                        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                            <GraduationCap className="text-emerald-500" size={20} />
                            Ranking de Alunos
                        </h3>
                        <div className="space-y-3">
                            {reportData.ranking.slice(0, 10).map((student, index) => (
                                <div
                                    key={student.studentId}
                                    onClick={() => {
                                        setSelectedStudentForModal(students.find(s => s.id === student.studentId) || null);
                                        setIsModalOpen(true);
                                    }}
                                    className="flex items-center gap-4 p-4 bg-[#1e293b] border border-gray-700 rounded-lg hover:border-emerald-500 transition-colors cursor-pointer"
                                >
                                    <div className="flex items-center gap-3 flex-1">
                                        <div className="text-2xl font-bold text-gray-500 w-8">{index + 1}°</div>
                                        <img src={student.studentPhoto} className="w-12 h-12 rounded-full border-2 border-emerald-500" />
                                        <div>
                                            <p className="font-bold text-white">{student.studentName}</p>
                                            <p className="text-xs text-gray-400">{student.className}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-2xl font-bold text-emerald-500">{student.exitCount}</p>
                                        <p className="text-xs text-gray-400">saídas</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Charts */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-[#0f172a] border border-gray-800 rounded-xl p-6 shadow-lg h-[400px]">
                            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                                <BarChart3 className="text-emerald-500" size={20} />
                                Motivos de Saída
                            </h3>
                            <ResponsiveContainer width="100%" height="85%">
                                <PieChart>
                                    <Pie
                                        data={reportData.pieData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={100}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {reportData.pieData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#1e293b', borderColor: '#374151', color: '#fff' }} />
                                    <Legend />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>

                        <div className="bg-[#0f172a] border border-gray-800 rounded-xl p-6 shadow-lg">
                            <h3 className="text-lg font-bold text-white mb-6">Histórico Detalhado</h3>
                            <div className="overflow-y-auto max-h-[300px]">
                                <table className="w-full text-left">
                                    <thead className="sticky top-0 bg-[#0f172a]">
                                        <tr className="text-[10px] text-gray-500 font-bold uppercase border-b border-gray-800">
                                            <th className="pb-3 pl-4">Data</th>
                                            <th className="pb-3">Aluno</th>
                                            <th className="pb-3">Turma</th>
                                            <th className="pb-3">Motivo</th>
                                            <th className="pb-3">Tempo</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {reportData.filteredHistory.map(h => (
                                            <tr key={h.id} className="border-b border-gray-800/50">
                                                <td className="py-3 pl-4 text-gray-400 text-xs">
                                                    {new Date(h.exitTime).toLocaleDateString('pt-BR')}
                                                </td>
                                                <td className="py-3 text-gray-300">{h.studentName}</td>
                                                <td className="py-3 text-gray-400 text-xs">{h.className || '-'}</td>
                                                <td className="py-3 text-gray-400 text-xs">{h.reasons.join(', ')}</td>
                                                <td className="py-3 text-emerald-500 font-bold text-xs">
                                                    {formatDuration(h.exitTime, h.returnTime)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'EXITS' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
                    {/* Exits: New Registration */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-[#0f172a] border border-gray-800 rounded-xl p-6 shadow-lg">
                            <div className="flex items-center gap-2 text-white font-bold mb-4">
                                <div className="text-emerald-500"><LogOut size={20} /></div>
                                <h3>Nova Saída</h3>
                            </div>

                            {/* Class Filter */}
                            <div className="mb-4">
                                <label className="block text-gray-400 text-xs font-bold uppercase mb-2">Filtrar Turma</label>
                                <select
                                    className="w-full bg-[#1e293b] border border-gray-700 rounded-lg py-2 px-3 text-white text-sm outline-none focus:border-emerald-500"
                                    value={selectedClassId}
                                    onChange={(e) => {
                                        setSelectedClassId(e.target.value);
                                        setSelectedStudentIds([]); // clear selection on class change
                                    }}
                                >
                                    <option value="">Todas as Turmas</option>
                                    {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>

                            {/* Student Selection (Simplified Reuse) */}
                            <div className="mb-4">
                                <label className="block text-gray-400 text-xs font-bold uppercase mb-2">Selecione o Aluno</label>
                                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 bg-[#1e293b] rounded-lg p-2 border border-gray-700">
                                    {filteredStudents.map(s => (
                                        <div
                                            key={s.id}
                                            onClick={() => {
                                                if (selectedStudentIds.includes(s.id)) {
                                                    setSelectedStudentIds(selectedStudentIds.filter(id => id !== s.id));
                                                } else {
                                                    setSelectedStudentIds([...selectedStudentIds, s.id]);
                                                }
                                            }}
                                            className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-colors ${selectedStudentIds.includes(s.id)
                                                ? 'bg-emerald-500/20 border-emerald-500/50'
                                                : 'bg-transparent border-transparent hover:bg-gray-800'
                                                }`}
                                        >
                                            <img src={s.photoUrl} className="w-8 h-8 rounded-full" />
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-white">{s.name}</p>
                                                <p className="text-[10px] text-gray-500">{s.className}</p>
                                            </div>
                                            {selectedStudentIds.includes(s.id) && <CheckCircle size={14} className="text-emerald-500" />}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Reasons */}
                            <div className="mb-6">
                                <label className="block text-gray-400 text-xs font-bold uppercase mb-2">Motivo</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {EXIT_REASONS.map(reason => (
                                        <button
                                            key={reason}
                                            onClick={() => {
                                                if (selectedExitReasons.includes(reason)) {
                                                    setSelectedExitReasons(selectedExitReasons.filter(r => r !== reason));
                                                } else {
                                                    setSelectedExitReasons([...selectedExitReasons, reason]);
                                                }
                                            }}
                                            className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${selectedExitReasons.includes(reason)
                                                ? 'bg-emerald-500 text-[#0f172a] border-emerald-500'
                                                : 'bg-[#1e293b] text-gray-400 border-gray-700 hover:border-gray-600'
                                                }`}
                                        >
                                            {reason}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <button
                                onClick={handleRegisterExit}
                                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-[#0f172a] rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2"
                            >
                                <LogOut size={18} />
                                REGISTRAR SAÍDA
                            </button>
                        </div>
                    </div>

                    {/* Exits: Active & History */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Active Exits */}
                        <div className="bg-[#0f172a] border border-gray-800 rounded-xl p-6 shadow-lg">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 text-white font-bold">
                                    <div className="text-orange-500 p-1.5 bg-orange-500/10 rounded-lg animate-pulse">
                                        <Clock size={20} />
                                    </div>
                                    <h3>Fora de Sala ({openExits.length})</h3>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {openExits.map(exit => (
                                    <div key={exit.id} className="bg-[#1e293b] border border-gray-700 rounded-xl p-4 flex items-center justify-between group hover:border-orange-500/50 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="relative">
                                                <img src={exit.studentPhoto || "https://i.pravatar.cc/150"} className="w-12 h-12 rounded-full border-2 border-[#0f172a]" />
                                                <div className="absolute -bottom-1 -right-1 bg-orange-500 text-[#0f172a] text-[10px] font-bold px-1.5 rounded-full border border-[#1e293b]">
                                                    OUT
                                                </div>
                                            </div>
                                            <div>
                                                <p className="font-bold text-white leading-tight">{exit.studentName}</p>
                                                <p className="text-xs text-orange-400 font-medium flex items-center gap-1 mt-1">
                                                    <Clock size={10} />
                                                    {formatDuration(exit.exitTime)} fora
                                                </p>
                                                <div className="flex gap-1 mt-1.5">
                                                    {exit.reasons.map(r => (
                                                        <span key={r} className="text-[10px] bg-gray-800 text-gray-400 px-1.5 py-0.5 rounded border border-gray-700">{r}</span>
                                                    ))}
                                                </div>
                                                <p className="text-[10px] text-gray-500 mt-1.5">
                                                    Registrado por: <span className="text-gray-400 font-medium">{exit.registeredBy || 'Sistema'}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleRegisterReturn(exit.id)}
                                            className="h-10 w-10 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center hover:bg-emerald-500 hover:text-[#0f172a] transition-all"
                                            title="Registrar Retorno"
                                        >
                                            <LogIn size={20} />
                                        </button>
                                    </div>
                                ))}
                                {openExits.length === 0 && (
                                    <div className="col-span-full py-8 text-center text-gray-500 flex flex-col items-center gap-2">
                                        <CheckCircle size={32} className="text-gray-700" />
                                        <p>Todos os alunos estão em sala.</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* History */}
                        <div className="bg-[#0f172a] border border-gray-800 rounded-xl p-6 shadow-lg">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 text-white font-bold">
                                    <div className="text-gray-500"><RefreshCw size={18} /></div>
                                    <h3>Histórico de Saídas</h3>
                                </div>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[10px] text-gray-500 font-bold uppercase border-b border-gray-800">
                                            <th className="pb-3 pl-4">Aluno</th>
                                            <th className="pb-3">Motivo</th>
                                            <th className="pb-3">Saída</th>
                                            <th className="pb-3">Retorno</th>
                                            <th className="pb-3 text-right pr-4">Tempo Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {exitHistory.map(exit => (
                                            <tr key={exit.id} className="border-b border-gray-800/50 hover:bg-[#1e293b] transition-colors">
                                                <td className="py-3 pl-4">
                                                    <div className="flex items-center gap-2">
                                                        <img src={exit.studentPhoto} className="w-6 h-6 rounded-full" />
                                                        <span className="text-gray-300 font-bold text-xs">{exit.studentName}</span>
                                                    </div>
                                                </td>
                                                <td className="py-3">
                                                    <span className="text-xs text-gray-400">{exit.reasons.join(', ')}</span>
                                                </td>
                                                <td className="py-3 text-xs text-gray-500">
                                                    {new Date(exit.exitTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="py-3 text-xs text-gray-500">
                                                    {exit.returnTime ? new Date(exit.returnTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                </td>
                                                <td className="py-3 text-right pr-4">
                                                    <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                                                        {formatDuration(exit.exitTime, exit.returnTime)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }

            {
                activeTab === 'OCCURRENCES' && (
                    // Existing Occurrences Layout (Wrapped)
                    <>
                        {/* Existing Occurrences Layout */}
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 animate-in fade-in slide-in-from-bottom-4">
                            {/* Left: Input Form */}
                            <div className="lg:col-span-2 bg-[#0f172a] border border-gray-800 rounded-xl p-6 shadow-lg">
                                <div className="flex items-center gap-2 text-white font-bold mb-4">
                                    <div className="text-emerald-500"><AlertCircle size={20} /></div>
                                    <h3>Detalhes do Incidente</h3>
                                </div>

                                <div className="space-y-6">
                                    <div>
                                        <label className="block text-gray-400 text-xs font-bold uppercase mb-2">Tipo de Ocorrência</label>
                                        <div className="grid grid-cols-4 gap-4">
                                            {Object.values(OccurrenceType).map(t => (
                                                <button
                                                    key={t}
                                                    onClick={() => setNewType(t)}
                                                    className={`flex flex-col items-center justify-center gap-2 py-4 rounded-xl border transition-all ${newType === t
                                                        ? 'bg-emerald-500/10 border-emerald-500 text-emerald-400'
                                                        : 'bg-[#1e293b] border-gray-700 text-gray-500 hover:bg-gray-800'
                                                        }`}
                                                >
                                                    {getTypeIcon(t)}
                                                    <span className="text-xs font-bold uppercase">{getTypeLabel(t)}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-gray-400 text-xs font-bold uppercase mb-2">Descrição Detalhada</label>
                                        <textarea
                                            value={newDesc}
                                            onChange={(e) => setNewDesc(e.target.value)}
                                            className="w-full bg-[#1e293b] border border-gray-700 rounded-xl p-4 text-gray-200 focus:ring-1 focus:ring-emerald-500 outline-none min-h-[120px]"
                                            placeholder="Descreva o comportamento, contexto e ações imediatas tomadas..."
                                        ></textarea>
                                    </div>

                                    <div>
                                        <label className="block text-gray-400 text-xs font-bold uppercase mb-2">Anexar Fotos (Evidências)</label>
                                        <div className="flex gap-4">
                                            <button className="w-24 h-24 rounded-xl border-2 border-dashed border-gray-700 flex flex-col items-center justify-center text-gray-500 hover:border-emerald-500 hover:text-emerald-500 transition-colors">
                                                <Camera size={24} className="mb-1" />
                                                <span className="text-[10px] font-bold">ENVIAR</span>
                                            </button>
                                            <div className="w-24 h-24 rounded-xl bg-[#84cc16]/50 border border-[#84cc16] flex items-center justify-center">
                                                {/* Placeholder for uploaded image */}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Right: Students & Status */}
                            <div className="space-y-6">
                                <div className="bg-[#0f172a] border border-gray-800 rounded-xl p-6 shadow-lg">
                                    <div className="flex justify-between items-center mb-4">
                                        <div className="flex items-center gap-2 text-white font-bold">
                                            <div className="text-emerald-500"><Plus size={20} /></div>
                                            <h3>Alunos Envolvidos</h3>
                                        </div>
                                        <span className="text-xs text-gray-500">{selectedStudentIds.length} Selecionados</span>
                                    </div>

                                    <div className="relative mb-4">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={14} />
                                        <input className="w-full bg-[#1e293b] border border-gray-700 rounded-lg py-2 pl-9 pr-3 text-sm text-white" placeholder="Buscar por nome ou turma..." />
                                    </div>

                                    <div className="space-y-2 max-h-[180px] overflow-y-auto pr-2">
                                        {students.map(s => (
                                            <div
                                                key={s.id}
                                                onClick={() => {
                                                    if (selectedStudentIds.includes(s.id)) {
                                                        setSelectedStudentIds(selectedStudentIds.filter(id => id !== s.id));
                                                    } else {
                                                        setSelectedStudentIds([...selectedStudentIds, s.id]);
                                                    }
                                                }}
                                                className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer border transition-colors ${selectedStudentIds.includes(s.id)
                                                    ? 'bg-emerald-500/20 border-emerald-500/50'
                                                    : 'bg-[#1e293b] border-transparent hover:bg-gray-800'
                                                    }`}
                                            >
                                                <img src={s.photoUrl} className="w-8 h-8 rounded-full" />
                                                <div className="flex-1">
                                                    <p className="text-sm font-bold text-white">{s.name}</p>
                                                    <p className="text-[10px] text-gray-500">TURMA 10-A • ID: {s.id.split('-')[1]}</p>
                                                </div>
                                                {selectedStudentIds.includes(s.id) && <X size={14} className="text-emerald-500" />}
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                <div className="bg-[#0f172a] border border-gray-800 rounded-xl p-6 shadow-lg">
                                    <div className="flex items-center gap-2 text-white font-bold mb-4">
                                        <div className="text-emerald-500"><AlertCircle size={20} /></div>
                                        <h3>Status da Ocorrência</h3>
                                    </div>
                                    <div className="flex bg-[#1e293b] rounded-lg p-1 mb-6">
                                        {[OccurrenceStatus.OPEN, OccurrenceStatus.ANALYZING, OccurrenceStatus.RESOLVED].map(s => (
                                            <button
                                                key={s}
                                                onClick={() => setStatus(s)}
                                                className={`flex-1 py-2 text-[10px] font-bold rounded uppercase transition-colors ${status === s
                                                    ? 'bg-emerald-500 text-[#0f172a]'
                                                    : 'text-gray-400 hover:text-white'
                                                    }`}
                                            >
                                                {s === 'OPEN' ? 'Aberta' : s === 'ANALYZING' ? 'Em Análise' : 'Resolvida'}
                                            </button>
                                        ))}
                                    </div>

                                    <button
                                        onClick={handleCreate}
                                        className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-[#0f172a] rounded-xl font-bold text-sm shadow-[0_0_20px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2"
                                    >
                                        <Save size={18} />
                                        REGISTRAR OCORRÊNCIA
                                    </button>
                                    <p className="text-[10px] text-gray-500 text-center mt-3 uppercase font-bold tracking-wider">Atalho: Ctrl + Enter para salvar</p>
                                </div>
                            </div>
                        </div>

                        {/* Logs List */}
                        <div className="bg-[#0f172a] border border-gray-800 rounded-xl p-6 shadow-lg">
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2 text-white font-bold">
                                    <RefreshCw size={18} className="text-emerald-500" />
                                    <h3>Registros Recentes</h3>
                                </div>
                                <div className="flex gap-2">
                                    <button className="px-3 py-1 bg-[#1e293b] text-white text-xs font-bold rounded hover:bg-gray-700">Todos</button>
                                    <button className="px-3 py-1 bg-[#1e293b] text-gray-400 text-xs font-bold rounded hover:bg-gray-700">Meus Registros</button>
                                    <button className="p-1 bg-[#1e293b] text-gray-400 rounded"><Filter size={14} /></button>
                                </div>
                            </div>

                            <div className="overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead>
                                        <tr className="text-[10px] text-gray-500 font-bold uppercase border-b border-gray-800">
                                            <th className="pb-3 pl-4">ID</th>
                                            <th className="pb-3">Alunos Envolvidos</th>
                                            <th className="pb-3">Tipo</th>
                                            <th className="pb-3">Registrado Em</th>
                                            <th className="pb-3">Status</th>
                                            <th className="pb-3 text-right pr-4">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="text-sm">
                                        {occurrences.slice(0, 3).map(occ => (
                                            <tr key={occ.id} className="border-b border-gray-800/50 hover:bg-[#1e293b] transition-colors">
                                                <td className="py-4 pl-4 text-gray-400">#{occ.id.split('-')[1].toUpperCase()}</td>
                                                <td className="py-4">
                                                    <div className="flex -space-x-2">
                                                        {students.filter(s => occ.studentIds.includes(s.id)).map(s => (
                                                            <img key={s.id} src={s.photoUrl} className="w-8 h-8 rounded-full border-2 border-[#0f172a]" />
                                                        ))}
                                                    </div>
                                                </td>
                                                <td className="py-4">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${occ.type === OccurrenceType.DISCIPLINE ? 'bg-red-500/20 text-red-400' :
                                                        occ.type === OccurrenceType.PRAISE ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'
                                                        }`}>
                                                        {getTypeLabel(occ.type)}
                                                    </span>
                                                </td>
                                                <td className="py-4 text-gray-300">Hoje, 10:45</td>
                                                <td className="py-4">
                                                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${occ.status === OccurrenceStatus.OPEN ? 'bg-gray-700 text-gray-300' : 'bg-emerald-500/20 text-emerald-400'
                                                        }`}>
                                                        {occ.status === OccurrenceStatus.OPEN ? 'ABERTA' : 'RESOLVIDA'}
                                                    </span>
                                                </td>
                                                <td className="py-4 text-right pr-4">
                                                    <button className="text-emerald-500 hover:text-emerald-400 text-xs font-bold">VER</button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4 text-center">
                                <button className="text-emerald-500 text-xs font-bold hover:underline uppercase tracking-wider">Ver Histórico Completo</button>
                            </div>
                        </div>

                        {/* Overlay stat for effect */}
                        <div className="fixed bottom-8 right-8 bg-[#1e293b] border border-gray-700 p-4 rounded-xl shadow-2xl flex items-center gap-4 animate-in fade-in slide-in-from-bottom-4">
                            <div className="bg-emerald-500 rounded-lg p-3">
                                <AlertTriangle className="text-[#0f172a]" size={24} />
                            </div>
                            <div>
                                <p className="text-[10px] text-gray-400 uppercase font-bold">Atividade do Turno</p>
                                <p className="text-2xl font-bold text-white leading-none">14 Registros Hoje</p>
                            </div>
                        </div>
                    </>
                )
            }

            {/* Modal de Ficha Detalhada do Aluno */}
            {isModalOpen && selectedStudentForModal && (
                <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4" onClick={() => setIsModalOpen(false)}>
                    <div className="bg-[#0f172a] border border-gray-800 rounded-xl p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
                        {/* Header */}
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center gap-4">
                                <img src={selectedStudentForModal.photoUrl} className="w-16 h-16 rounded-full border-2 border-emerald-500" />
                                <div>
                                    <h2 className="text-2xl font-bold text-white">{selectedStudentForModal.name}</h2>
                                    <p className="text-gray-400">{selectedStudentForModal.className}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => generateStudentPDF(selectedStudentForModal)}
                                    className="px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 transition-colors flex items-center gap-2 font-bold text-sm"
                                >
                                    <Save size={16} />
                                    Gerar PDF
                                </button>
                                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>
                        </div>

                        {/* Histórico Completo */}
                        <h3 className="text-lg font-bold text-white mb-4">Histórico de Saídas</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="text-[10px] text-gray-500 font-bold uppercase border-b border-gray-800">
                                        <th className="pb-3 pl-4">Data</th>
                                        <th className="pb-3">Horário Saída</th>
                                        <th className="pb-3">Horário Retorno</th>
                                        <th className="pb-3">Motivo</th>
                                        <th className="pb-3">Registrado por</th>
                                        <th className="pb-3 text-right pr-4">Tempo Total</th>
                                    </tr>
                                </thead>
                                <tbody className="text-sm">
                                    {exitHistory
                                        .filter(exit => exit.studentId === selectedStudentForModal.id)
                                        .sort((a, b) => new Date(b.exitTime).getTime() - new Date(a.exitTime).getTime())
                                        .map(exit => (
                                            <tr key={exit.id} className="border-b border-gray-800/50 hover:bg-[#1e293b] transition-colors">
                                                <td className="py-3 pl-4 text-gray-400 text-xs">
                                                    {new Date(exit.exitTime).toLocaleDateString('pt-BR')}
                                                </td>
                                                <td className="py-3 text-gray-300 text-xs">
                                                    {new Date(exit.exitTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                                </td>
                                                <td className="py-3 text-gray-300 text-xs">
                                                    {exit.returnTime ? new Date(exit.returnTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '-'}
                                                </td>
                                                <td className="py-3 text-gray-400 text-xs">{exit.reasons.join(', ')}</td>
                                                <td className="py-3 text-gray-400 text-xs">{exit.registeredBy || 'Sistema'}</td>
                                                <td className="py-3 text-right pr-4">
                                                    <span className="text-xs font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded">
                                                        {formatDuration(exit.exitTime, exit.returnTime)}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}
        </div >
    );
};