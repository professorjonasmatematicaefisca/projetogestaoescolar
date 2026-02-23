import React, { useState, useEffect } from 'react';
import { MessageItem } from './types';
import { SupabaseService } from './services/supabaseService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
    Send, Mail, MailOpen, Trash2, Users, User, UserCheck,
    BookOpen, FileText, PlusCircle, X, ChevronDown,
    GraduationCap, MessageSquare, Filter, Search
} from 'lucide-react';

interface ComunicadosProps {
    onShowToast: (msg: string) => void;
    userEmail?: string;
    userName?: string;
    userRole?: string;
}

export const Comunicados: React.FC<ComunicadosProps> = ({ onShowToast, userEmail, userName, userRole }) => {
    const [messages, setMessages] = useState<MessageItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [showCompose, setShowCompose] = useState(false);
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const [filter, setFilter] = useState<'all' | 'students' | 'parents' | 'both' | 'coordinator'>('all');
    const [classes, setClasses] = useState<string[]>([]);

    // Compose state
    const [subject, setSubject] = useState('');
    const [body, setBody] = useState('');
    const [recipients, setRecipients] = useState<'students' | 'parents' | 'both' | 'coordinator'>('students');
    const [targetClass, setTargetClass] = useState('');
    const [attachmentType, setAttachmentType] = useState('');
    const [sending, setSending] = useState(false);

    useEffect(() => {
        loadMessages();
        loadClasses();
    }, []);

    const loadMessages = async () => {
        setLoading(true);
        const data = await SupabaseService.getMessages();
        setMessages(data);
        setLoading(false);
    };

    const loadClasses = async () => {
        const cls = await SupabaseService.getClasses();
        setClasses(cls.map(c => c.name));
    };

    const handleSend = async () => {
        if (!subject.trim() || !body.trim()) {
            onShowToast("Preencha o assunto e a mensagem.");
            return;
        }
        setSending(true);
        const success = await SupabaseService.createMessage({
            senderName: userName || userEmail || 'Usuário',
            senderEmail: userEmail,
            senderRole: userRole || 'teacher',
            subject: subject.trim(),
            body: body.trim(),
            recipients,
            targetClass: targetClass || undefined,
            attachmentType: attachmentType || undefined,
        });
        setSending(false);
        if (success) {
            onShowToast("✅ Mensagem enviada com sucesso!");
            setShowCompose(false);
            setSubject('');
            setBody('');
            setRecipients('students');
            setTargetClass('');
            setAttachmentType('');
            loadMessages();
        } else {
            onShowToast("Erro ao enviar mensagem.");
        }
    };

    const handleDelete = async (id: string) => {
        const confirmed = window.confirm("Excluir esta mensagem?");
        if (!confirmed) return;
        const ok = await SupabaseService.deleteMessage(id);
        if (ok) {
            onShowToast("Mensagem excluída.");
            loadMessages();
        }
    };

    const getRecipientLabel = (r: string) => {
        switch (r) {
            case 'students': return 'Alunos';
            case 'parents': return 'Pais / Responsáveis';
            case 'both': return 'Alunos e Pais';
            case 'coordinator': return 'Coordenação';
            default: return r;
        }
    };

    const getRecipientIcon = (r: string) => {
        switch (r) {
            case 'students': return GraduationCap;
            case 'parents': return Users;
            case 'both': return UserCheck;
            case 'coordinator': return User;
            default: return Users;
        }
    };

    const getRecipientColor = (r: string) => {
        switch (r) {
            case 'students': return 'text-blue-400 bg-blue-500/10';
            case 'parents': return 'text-purple-400 bg-purple-500/10';
            case 'both': return 'text-emerald-400 bg-emerald-500/10';
            case 'coordinator': return 'text-amber-400 bg-amber-500/10';
            default: return 'text-gray-400 bg-gray-500/10';
        }
    };

    const filteredMessages = filter === 'all'
        ? messages
        : messages.filter(m => m.recipients === filter);

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-white flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                            <MessageSquare className="text-blue-400" size={22} />
                        </div>
                        Comunicados
                    </h2>
                    <p className="text-gray-500 text-sm mt-1 ml-[52px]">
                        Envie mensagens para alunos, pais e coordenação
                    </p>
                </div>
                <button
                    onClick={() => setShowCompose(true)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl font-bold text-sm transition-all shadow-lg shadow-blue-500/20"
                >
                    <PlusCircle size={18} />
                    Novo Comunicado
                </button>
            </div>

            {/* Compose Modal */}
            {showCompose && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowCompose(false)}>
                    <div className="bg-[#0f172a] border border-gray-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
                        {/* compose header */}
                        <div className="flex items-center justify-between p-5 border-b border-gray-800">
                            <h3 className="text-lg font-bold text-white flex items-center gap-2">
                                <Send size={18} className="text-blue-400" /> Novo Comunicado
                            </h3>
                            <button onClick={() => setShowCompose(false)} className="text-gray-500 hover:text-white transition-colors">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5 space-y-4">
                            {/* Recipients */}
                            <div>
                                <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Destinatários</label>
                                <div className="grid grid-cols-2 gap-2">
                                    {(['students', 'parents', 'both', 'coordinator'] as const).map(r => {
                                        const Icon = getRecipientIcon(r);
                                        return (
                                            <button
                                                key={r}
                                                onClick={() => setRecipients(r)}
                                                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg text-xs font-bold transition-all border ${recipients === r
                                                        ? 'border-blue-500 bg-blue-500/10 text-blue-400'
                                                        : 'border-gray-800 text-gray-500 hover:border-gray-600'
                                                    }`}
                                            >
                                                <Icon size={14} />
                                                {getRecipientLabel(r)}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Target Class */}
                            {recipients !== 'coordinator' && (
                                <div>
                                    <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Turma (opcional — todas se não selecionada)</label>
                                    <select
                                        value={targetClass}
                                        onChange={e => setTargetClass(e.target.value)}
                                        className="w-full bg-[#1e293b] text-white px-4 py-2.5 rounded-lg border border-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                    >
                                        <option value="">Todas as turmas</option>
                                        {classes.map(c => <option key={c} value={c}>{c}</option>)}
                                    </select>
                                </div>
                            )}

                            {/* Subject */}
                            <div>
                                <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Assunto</label>
                                <input
                                    type="text"
                                    value={subject}
                                    onChange={e => setSubject(e.target.value)}
                                    placeholder="Ex: Lembrete de prova, Atividade para casa..."
                                    className="w-full bg-[#1e293b] text-white px-4 py-2.5 rounded-lg border border-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                                />
                            </div>

                            {/* Attachment Type */}
                            <div>
                                <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Tipo de Conteúdo (opcional)</label>
                                <div className="flex gap-2 flex-wrap">
                                    {[
                                        { key: '', label: 'Nenhum', icon: X },
                                        { key: 'atividade', label: 'Atividade', icon: FileText },
                                        { key: 'registro_aula', label: 'Registro de Aula', icon: BookOpen },
                                        { key: 'roteiro_estudos', label: 'Roteiro de Estudos', icon: GraduationCap },
                                    ].map(opt => (
                                        <button
                                            key={opt.key}
                                            onClick={() => setAttachmentType(opt.key)}
                                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all border ${attachmentType === opt.key
                                                    ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400'
                                                    : 'border-gray-800 text-gray-500 hover:border-gray-600'
                                                }`}
                                        >
                                            <opt.icon size={12} />
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Body */}
                            <div>
                                <label className="text-xs text-gray-400 font-bold uppercase mb-2 block">Mensagem</label>
                                <textarea
                                    value={body}
                                    onChange={e => setBody(e.target.value)}
                                    rows={5}
                                    placeholder="Escreva sua mensagem aqui..."
                                    className="w-full bg-[#1e293b] text-white px-4 py-3 rounded-lg border border-gray-700 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3 p-5 border-t border-gray-800">
                            <button
                                onClick={() => setShowCompose(false)}
                                className="flex-1 px-4 py-2.5 bg-gray-800 text-gray-400 hover:text-white rounded-lg font-bold text-sm transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSend}
                                disabled={sending || !subject.trim() || !body.trim()}
                                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Send size={16} />
                                {sending ? 'Enviando...' : 'Enviar'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-2 bg-[#0f172a] p-1.5 rounded-xl border border-gray-800 overflow-x-auto">
                {([
                    { key: 'all', label: 'Todos', icon: Filter },
                    { key: 'students', label: 'Alunos', icon: GraduationCap },
                    { key: 'parents', label: 'Pais', icon: Users },
                    { key: 'both', label: 'Alunos + Pais', icon: UserCheck },
                    { key: 'coordinator', label: 'Coordenação', icon: User },
                ] as const).map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setFilter(tab.key)}
                        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filter === tab.key
                                ? 'bg-gray-800 text-white shadow-sm'
                                : 'text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        <tab.icon size={13} />
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* Messages List */}
            {loading ? (
                <div className="text-center py-20">
                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                    <p className="text-gray-500 text-sm">Carregando comunicados...</p>
                </div>
            ) : filteredMessages.length === 0 ? (
                <div className="text-center py-20 bg-[#0f172a] rounded-2xl border border-gray-800">
                    <Mail className="mx-auto text-gray-700 mb-4" size={48} />
                    <p className="text-gray-500 font-medium">Nenhum comunicado encontrado</p>
                    <p className="text-gray-600 text-sm mt-1">Clique em "Novo Comunicado" para enviar o primeiro</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {filteredMessages.map(msg => {
                        const RecIcon = getRecipientIcon(msg.recipients);
                        const isExpanded = expandedId === msg.id;

                        return (
                            <div
                                key={msg.id}
                                className={`bg-[#0f172a] border border-gray-800 rounded-xl overflow-hidden transition-all hover:border-gray-700 ${isExpanded ? 'shadow-lg shadow-blue-500/5' : ''
                                    }`}
                            >
                                {/* Message Header */}
                                <button
                                    onClick={() => setExpandedId(isExpanded ? null : msg.id)}
                                    className="w-full p-4 flex items-center gap-3 text-left"
                                >
                                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${getRecipientColor(msg.recipients)}`}>
                                        <RecIcon size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2">
                                            <span className="text-white font-bold text-sm truncate">{msg.subject}</span>
                                            {msg.attachmentType && (
                                                <span className="text-[10px] px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded font-bold uppercase shrink-0">
                                                    {msg.attachmentType === 'atividade' ? 'Atividade' :
                                                        msg.attachmentType === 'registro_aula' ? 'Reg. Aula' :
                                                            msg.attachmentType === 'roteiro_estudos' ? 'Roteiro' : msg.attachmentType}
                                                </span>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 text-[11px] text-gray-500 mt-0.5">
                                            <span>{msg.senderName}</span>
                                            <span>•</span>
                                            <span>{getRecipientLabel(msg.recipients)}</span>
                                            {msg.targetClass && (
                                                <>
                                                    <span>•</span>
                                                    <span className="text-gray-400">{msg.targetClass}</span>
                                                </>
                                            )}
                                            <span>•</span>
                                            <span>{format(new Date(msg.createdAt), "dd/MM/yyyy HH:mm", { locale: ptBR })}</span>
                                        </div>
                                    </div>
                                    <ChevronDown size={16} className={`text-gray-500 transition-transform shrink-0 ${isExpanded ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Expanded Body */}
                                {isExpanded && (
                                    <div className="px-4 pb-4 border-t border-gray-800/50">
                                        <div className="pt-4 text-gray-300 text-sm whitespace-pre-wrap leading-relaxed">
                                            {msg.body}
                                        </div>
                                        <div className="flex justify-end mt-4 pt-3 border-t border-gray-800/50">
                                            <button
                                                onClick={() => handleDelete(msg.id)}
                                                className="flex items-center gap-1.5 px-3 py-1.5 text-red-400 hover:bg-red-500/10 rounded-lg text-xs font-bold transition-colors"
                                            >
                                                <Trash2 size={13} />
                                                Excluir
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};
