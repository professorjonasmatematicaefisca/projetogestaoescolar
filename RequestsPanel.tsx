import React, { useState, useEffect } from 'react';
import { RequestItem } from './types';
import { SupabaseService } from './services/supabaseService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    ClipboardList, Check, X, Trash2, Clock, Calendar,
    User, BookOpen, AlertTriangle, CheckCircle, XCircle, Filter
} from 'lucide-react';

interface RequestsPanelProps {
    onShowToast: (msg: string) => void;
    userEmail?: string;
}

export const RequestsPanel: React.FC<RequestsPanelProps> = ({ onShowToast, userEmail }) => {
    const [requests, setRequests] = useState<RequestItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');

    useEffect(() => {
        loadRequests();
    }, []);

    const loadRequests = async () => {
        setLoading(true);
        const data = await SupabaseService.getRequests();
        setRequests(data);
        setLoading(false);
    };

    const handleApprove = async (req: RequestItem) => {
        const confirmed = window.confirm(
            `Aprovar solicitação de ${req.teacherName || 'Professor'}?\n\n` +
            `Tipo: ${getTypeLabel(req.type)}\n` +
            (req.sessionInfo ? `Aula: ${req.sessionInfo.className} — ${req.sessionInfo.subject} (${req.sessionInfo.block})` : '')
        );
        if (!confirmed) return;

        // If it's a delete_session request, actually delete the session
        if (req.type === 'delete_session' && req.sessionId) {
            const deleted = await SupabaseService.deleteSession(req.sessionId);
            if (!deleted) {
                onShowToast("Erro ao excluir o registro de aula.");
                return;
            }
        }

        const success = await SupabaseService.updateRequestStatus(req.id, 'approved', userEmail);
        if (success) {
            onShowToast("✅ Solicitação aprovada com sucesso.");
            loadRequests();
        } else {
            onShowToast("Erro ao aprovar solicitação.");
        }
    };

    const handleReject = async (req: RequestItem) => {
        const confirmed = window.confirm(`Rejeitar solicitação de ${req.teacherName || 'Professor'}?`);
        if (!confirmed) return;

        const success = await SupabaseService.updateRequestStatus(req.id, 'rejected', userEmail);
        if (success) {
            onShowToast("Solicitação rejeitada.");
            loadRequests();
        } else {
            onShowToast("Erro ao rejeitar solicitação.");
        }
    };

    const getTypeLabel = (type: string) => {
        switch (type) {
            case 'delete_session': return 'Excluir Registro de Aula';
            default: return type;
        }
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'pending':
                return (
                    <span className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-full text-xs font-bold">
                        <Clock size={12} /> Pendente
                    </span>
                );
            case 'approved':
                return (
                    <span className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full text-xs font-bold">
                        <CheckCircle size={12} /> Aprovada
                    </span>
                );
            case 'rejected':
                return (
                    <span className="flex items-center gap-1 text-red-400 bg-red-500/10 px-2.5 py-1 rounded-full text-xs font-bold">
                        <XCircle size={12} /> Rejeitada
                    </span>
                );
            default: return null;
        }
    };

    const filteredRequests = filter === 'all'
        ? requests
        : requests.filter(r => r.status === filter);

    const pendingCount = requests.filter(r => r.status === 'pending').length;

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
                            <ClipboardList className="text-amber-400" size={22} />
                        </div>
                        Solicitações
                        {pendingCount > 0 && (
                            <span className="bg-amber-500 text-black text-xs font-bold px-2.5 py-1 rounded-full animate-pulse">
                                {pendingCount}
                            </span>
                        )}
                    </h2>
                    <p className="text-gray-500 text-sm mt-1 ml-[52px]">
                        Gerencie solicitações dos professores
                    </p>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 bg-[#0f172a] p-1.5 rounded-xl border border-gray-800">
                {([
                    { key: 'pending', label: 'Pendentes', icon: Clock, count: requests.filter(r => r.status === 'pending').length },
                    { key: 'approved', label: 'Aprovadas', icon: CheckCircle, count: requests.filter(r => r.status === 'approved').length },
                    { key: 'rejected', label: 'Rejeitadas', icon: XCircle, count: requests.filter(r => r.status === 'rejected').length },
                    { key: 'all', label: 'Todas', icon: Filter, count: requests.length },
                ] as const).map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${filter === tab.key
                                ? 'bg-gray-800 text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                        {tab.count > 0 && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${filter === tab.key ? 'bg-gray-600' : 'bg-gray-800'
                                }`}>
                                {tab.count}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Requests List */}
            {loading ? (
                <div className="text-center py-20">
                    <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 text-sm">Carregando solicitações...</p>
                </div>
            ) : filteredRequests.length === 0 ? (
                <div className="text-center py-20 bg-[#0f172a] rounded-2xl border border-gray-800">
                    <ClipboardList className="mx-auto text-gray-700 mb-4" size={48} />
                    <p className="text-gray-500 font-medium">
                        {filter === 'pending' ? 'Nenhuma solicitação pendente' : 'Nenhuma solicitação encontrada'}
                    </p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredRequests.map(req => (
                        <div
                            key={req.id}
                            className={`bg-[#0f172a] border rounded-xl overflow-hidden transition-all ${req.status === 'pending'
                                    ? 'border-amber-500/30 shadow-[0_0_20px_rgba(245,158,11,0.05)]'
                                    : 'border-gray-800'
                                }`}
                        >
                            <div className="p-5">
                                <div className="flex items-start justify-between gap-4">
                                    {/* Left: Request Info */}
                                    <div className="flex-1 space-y-3">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            {getStatusBadge(req.status)}
                                            <span className="text-white font-bold text-sm">
                                                {getTypeLabel(req.type)}
                                            </span>
                                        </div>

                                        {/* Teacher Info */}
                                        <div className="flex items-center gap-2 text-gray-400 text-xs">
                                            <User size={13} />
                                            <span>Professor(a): <strong className="text-gray-300">{req.teacherName || 'Não identificado'}</strong></span>
                                        </div>

                                        {/* Session Info */}
                                        {req.sessionInfo && (
                                            <div className="bg-gray-800/50 rounded-lg p-3 space-y-1.5">
                                                <div className="flex items-center gap-2 text-xs text-gray-400">
                                                    <Calendar size={12} className="text-emerald-500" />
                                                    <span className="text-white font-medium">
                                                        {format(new Date(req.sessionInfo.date), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                                                    </span>
                                                </div>
                                                <div className="flex gap-3 text-xs text-gray-400 ml-5">
                                                    <span>Turma: <strong className="text-gray-300">{req.sessionInfo.className}</strong></span>
                                                    <span>•</span>
                                                    <span>{req.sessionInfo.subject}</span>
                                                    <span>•</span>
                                                    <span>{req.sessionInfo.block}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* Reason */}
                                        {req.reason && (
                                            <div className="flex items-start gap-2 text-xs text-gray-400">
                                                <AlertTriangle size={13} className="text-amber-500 mt-0.5 shrink-0" />
                                                <span>Motivo: <em className="text-gray-300">{req.reason}</em></span>
                                            </div>
                                        )}

                                        {/* Created At */}
                                        <div className="text-[10px] text-gray-600">
                                            Solicitado em {format(new Date(req.createdAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                                            {req.resolvedAt && (
                                                <> · Resolvido em {format(new Date(req.resolvedAt), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}</>
                                            )}
                                        </div>
                                    </div>

                                    {/* Right: Action Buttons */}
                                    {req.status === 'pending' && (
                                        <div className="flex flex-col gap-2 shrink-0">
                                            <button
                                                onClick={() => handleApprove(req)}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white rounded-lg text-xs font-bold transition-all"
                                            >
                                                <Check size={14} />
                                                Aprovar
                                            </button>
                                            <button
                                                onClick={() => handleReject(req)}
                                                className="flex items-center gap-1.5 px-4 py-2 bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white rounded-lg text-xs font-bold transition-all"
                                            >
                                                <X size={14} />
                                                Rejeitar
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
