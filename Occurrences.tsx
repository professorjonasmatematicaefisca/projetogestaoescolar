import React, { useState } from 'react';
import { Occurrence, OccurrenceType, OccurrenceStatus, Student, ClassRoom, StudentExit } from './types';
import { StorageService } from './services/storageService';
import { SupabaseService } from './services/supabaseService';
import { AlertTriangle, Plus, X, Search, Heart, Shield, AlertCircle, ThumbsUp, Camera, Save, Filter, RefreshCw, Clock, LogOut, LogIn, CheckCircle } from 'lucide-react';
import { useEffect } from 'react';

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

    // Exits State
    const [activeTab, setActiveTab] = useState<'OCCURRENCES' | 'EXITS'>('OCCURRENCES');
    const [openExits, setOpenExits] = useState<StudentExit[]>([]);
    const [exitHistory, setExitHistory] = useState<StudentExit[]>([]);
    const [selectedExitReasons, setSelectedExitReasons] = useState<string[]>([]);
    const EXIT_REASONS = ['Banheiro', 'Água', 'Coordenação', 'Enfermaria', 'Diretoria'];

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                const [obs, sts, open, hist] = await Promise.all([
                    SupabaseService.getOccurrences(),
                    SupabaseService.getStudents(),
                    SupabaseService.getOpenExits(),
                    SupabaseService.getExitHistory()
                ]);
                setOccurrences(obs);
                setStudents(sts);
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

        let successCount = 0;
        for (const studentId of selectedStudentIds) {
            const success = await SupabaseService.registerExit(studentId, selectedExitReasons);
            if (success) successCount++;
        }

        if (successCount > 0) {
            onShowToast(`${successCount} saída(s) registrada(s).`);
            const open = await SupabaseService.getOpenExits();
            setOpenExits(open);
            setSelectedStudentIds([]);
            setSelectedExitReasons([]);
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
                        <span>Gestão Central</span>
                        <span>/</span>
                        <span className="text-emerald-500 font-bold">Controle e Monitoramento</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <h2 className="text-3xl font-bold text-white">Central de Controle</h2>
                        <div className="flex bg-[#1e293b] rounded-lg p-1 border border-gray-700">
                            <button
                                onClick={() => setActiveTab('OCCURRENCES')}
                                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${activeTab === 'OCCURRENCES'
                                    ? 'bg-emerald-500 text-[#0f172a]'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                OCORRÊNCIAS
                            </button>
                            <button
                                onClick={() => setActiveTab('EXITS')}
                                className={`px-4 py-1.5 rounded-md text-sm font-bold transition-colors ${activeTab === 'EXITS'
                                    ? 'bg-emerald-500 text-[#0f172a]'
                                    : 'text-gray-400 hover:text-white'
                                    }`}
                            >
                                SAÍDAS
                            </button>
                        </div>
                    </div>
                    <p className="text-gray-400 mt-1">
                        {activeTab === 'OCCURRENCES'
                            ? "Sistema de alta performance para monitoramento escolar e gestão comportamental."
                            : "Registro e monitoramento de saídas de alunos em tempo real."}
                    </p>
                </div>

                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" size={16} />
                        <input type="text" placeholder="Buscar ID do aluno..." className="bg-[#1e293b] text-white pl-10 pr-4 py-2.5 rounded-lg border border-gray-700 outline-none focus:border-emerald-500 w-64" />
                    </div>
                    <button className="bg-emerald-500 text-[#0f172a] px-4 py-2.5 rounded-lg font-bold flex items-center gap-2 hover:bg-emerald-400 transition-colors">
                        <AlertCircle size={18} />
                        Alerta SOS
                    </button>
                    <div className="w-10 h-10 rounded-full bg-gray-200 overflow-hidden border-2 border-white">
                        <img src="https://i.pravatar.cc/150?u=admin" />
                    </div>
                </div>
            </div>

            {activeTab === 'EXITS' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
                    {/* Exits: New Registration */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-[#0f172a] border border-gray-800 rounded-xl p-6 shadow-lg">
                            <div className="flex items-center gap-2 text-white font-bold mb-4">
                                <div className="text-emerald-500"><LogOut size={20} /></div>
                                <h3>Nova Saída</h3>
                            </div>

                            {/* Student Selection (Simplified Reuse) */}
                            <div className="mb-4">
                                <label className="block text-gray-400 text-xs font-bold uppercase mb-2">Selecione o Aluno</label>
                                <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2 bg-[#1e293b] rounded-lg p-2 border border-gray-700">
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
                                                : 'bg-transparent border-transparent hover:bg-gray-800'
                                                }`}
                                        >
                                            <img src={s.photoUrl} className="w-8 h-8 rounded-full" />
                                            <div className="flex-1">
                                                <p className="text-sm font-bold text-white">{s.name}</p>
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
            ) : (
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
            )}
        </div>
    );
};