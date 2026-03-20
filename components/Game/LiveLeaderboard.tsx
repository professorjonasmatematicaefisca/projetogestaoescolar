import React from 'react';
import { GameParticipant } from './useGameSession';
import { Trophy } from 'lucide-react';

interface LiveLeaderboardProps {
    participants: GameParticipant[];
    myName?: string;
    compact?: boolean;
    /** Se true, aluno só vê sua própria posição (modo aluno) */
    onlyMe?: boolean;
    currentQuestionIndex?: number;
    showFeedback?: boolean;
    gameMode?: 'individual' | 'group';
}

function getInitials(name: string): string {
    return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function getAvatarColor(name: string): string {
    const colors = [
        'from-emerald-500 to-green-400', 'from-teal-500 to-cyan-400',
        'from-lime-500 to-green-500', 'from-green-600 to-emerald-400',
        'from-cyan-500 to-teal-400', 'from-sky-500 to-blue-400',
        'from-violet-500 to-purple-400', 'from-amber-500 to-yellow-400',
        'from-rose-500 to-pink-400', 'from-orange-500 to-amber-400',
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
    return colors[hash % colors.length];
}

const medalColors: Record<number, string> = { 0: '🥇', 1: '🥈', 2: '🥉' };

const ParticipantRow: React.FC<{
    p: GameParticipant;
    rank: number;
    isMe: boolean;
    totalCount?: number;
    compact?: boolean;
    currentQuestionIndex?: number;
    showFeedback?: boolean;
    isTeacher?: boolean;
}> = ({ p, rank, isMe, totalCount, compact, currentQuestionIndex = 0, showFeedback = true, isTeacher = false }) => {
    const medal = medalColors[rank];
    const avatarColor = getAvatarColor(p.student_name);

    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500 ${isMe
                ? 'bg-[#8bc34a]/20 border border-[#8bc34a]/50 shadow-[0_0_15px_rgba(139,195,74,0.2)]'
                : rank === 0
                    ? 'bg-yellow-500/10 border border-yellow-500/20'
                    : 'bg-white/5 border border-white/5'
            }`}>
            {/* Posição */}
            <span className="w-8 text-center font-black text-lg shrink-0">
                {medal ?? <span className="text-gray-500 text-sm font-bold">#{rank + 1}</span>}
            </span>

            {/* Avatar */}
            <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${avatarColor} flex items-center justify-center text-white font-black text-sm shrink-0 shadow-md`}>
                {getInitials(p.student_name)}
            </div>

            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={`font-black truncate ${isMe ? 'text-white' : 'text-gray-300'}`}>
                        {p.student_name}
                    </span>
                    {isMe && <span className="text-[10px] bg-[#8bc34a]/20 text-[#8bc34a] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider shrink-0">Você</span>}
                </div>
                {compact && (
                    <div className="text-xs text-gray-400 mt-0.5 truncate flex items-center gap-2">
                        <span>{(showFeedback || isTeacher) ? `${p.score.toLocaleString()} pts` : '??? pts'}</span>
                        <span className="w-1 h-1 rounded-full bg-gray-600" />
                        <span>{(showFeedback || isTeacher) ? `${p.correct_answers || 0} / ${currentQuestionIndex + 1} acertos` : '??? acertos'}</span>
                    </div>
                )}
            </div>
            {!compact && (
                <div className="text-right shrink-0 flex flex-col items-end">
                    <span className={`font-black tracking-tight ${isMe ? 'text-[#8bc34a]' : 'text-emerald-400'}`}>
                        {(showFeedback || isTeacher) ? `${p.score.toLocaleString()} pts` : '??? pts'}
                    </span>
                    <span className="text-xs text-gray-500 font-bold">
                        {(showFeedback || isTeacher) ? `${p.correct_answers || 0} / ${currentQuestionIndex + 1} acertos` : '??? acertos'}
                    </span>
                </div>
            )}

            {/* Já respondeu */}
            {p.answered_current && (
                <span className="text-xs bg-[#8bc34a]/20 text-[#8bc34a] px-2 py-0.5 rounded-full shrink-0 font-bold">✓</span>
            )}
        </div>
    );
};

export const LiveLeaderboard: React.FC<LiveLeaderboardProps> = ({ participants, myName, compact, onlyMe, currentQuestionIndex, showFeedback, gameMode }) => {
    const sorted = [...participants].sort((a, b) => b.score - a.score);

    if (participants.length === 0) {
        return <div className="text-center text-gray-500 py-6 text-sm">Nenhum participante ainda...</div>;
    }

    // Lógica de Modo em Grupo
    if (gameMode === 'group') {
        const groups: Record<string, { 
            id: string; 
            name: string; 
            totalScore: number; 
            count: number; 
            members: { name: string; score: number; answered: boolean; isMe: boolean }[] 
        }> = {};

        participants.forEach(p => {
            const gId = p.group_id || 'sem_grupo';
            const gName = p.group_name || 'Sem Grupo';
            if (!groups[gId]) {
                groups[gId] = { id: gId, name: gName, totalScore: 0, count: 0, members: [] };
            }
            groups[gId].totalScore += p.score;
            groups[gId].count += 1;
            groups[gId].members.push({
                name: p.student_name,
                score: p.score,
                answered: p.answered_current,
                isMe: p.student_name === myName
            });
        });

        const groupList = Object.values(groups).map(g => ({
            id: g.id,
            name: g.name,
            score: Math.round(g.totalScore / g.count),
            members: g.members,
            isMe: g.members.some(m => m.isMe)
        })).sort((a, b) => b.score - a.score);

        // Se onlyMe, filtramos apenas o grupo do aluno
        const displayGroups = onlyMe && myName 
            ? groupList.filter(g => g.isMe) 
            : (compact ? groupList.slice(0, 5) : groupList);

        return (
            <div className="w-full space-y-3">
                {displayGroups.map((g, i) => (
                    <div key={g.id} className={`p-4 rounded-xl border transition-all duration-500 animation-fade-in ${g.isMe ? 'bg-[#8bc34a]/10 border-[#8bc34a]/30 shadow-[0_4px_20px_rgba(139,195,74,0.1)]' : 'bg-white/5 border-white/5'}`}>
                        <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-3">
                                <span className="font-black text-xl text-amber-500 w-6">
                                    {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                                </span>
                                <span className="font-black text-white">{g.name}</span>
                                {g.isMe && <span className="text-[10px] bg-[#8bc34a]/20 text-[#8bc34a] px-1.5 py-0.5 rounded font-bold uppercase">Sua Equipe</span>}
                            </div>
                            <div className="text-right">
                                <span className="text-[#8bc34a] font-black text-lg">{(showFeedback || !myName) ? `${g.score} pts` : '??? pts'}</span>
                                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-tighter">Média do Grupo</p>
                            </div>
                        </div>
                        
                        {/* Detalhamento dos Membros */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-3 border-t border-white/5">
                            {g.members.map(m => (
                                <div key={m.name} className="flex items-center justify-between bg-black/20 px-2.5 py-1.5 rounded-lg border border-white/5">
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${m.answered ? 'bg-emerald-400' : 'bg-gray-600'}`} 
                                             title={m.answered ? 'Já respondeu' : 'Aguardando...'} />
                                        <span className={`text-[10px] font-bold truncate ${m.isMe ? 'text-[#8bc34a]' : 'text-gray-300'}`}>
                                            {m.name}
                                        </span>
                                    </div>
                                    <span className="text-[10px] font-mono text-gray-500 shrink-0">
                                        {(showFeedback || !myName) ? `${m.score} pts` : '—'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        );
    }

    // Modo Aluno Individual
    if (onlyMe && myName) {
        const myRank = sorted.findIndex(p => p.student_name === myName);
        const me = sorted[myRank];
        if (!me) return <div className="text-center text-gray-500 py-4 text-sm">Você ainda não está no ranking.</div>;
        return (
            <div className="space-y-3">
                <div className="text-center text-gray-500 text-xs mb-1">{participants.length} competidores</div>
                <ParticipantRow p={me} rank={myRank} isMe={true} totalCount={participants.length} />
                <div className="text-center text-[#8bc34a] text-xs font-bold mt-1">
                    {myRank === 0 ? '🏆 Você está em 1º lugar!' :
                        myRank === 1 ? '🥈 Você está em 2º lugar!' :
                            myRank === 2 ? '🥉 Você está em 3º lugar!' :
                                `Você está em ${myRank + 1}º de ${participants.length}`}
                </div>
            </div>
        );
    }

    // Modo professor / ranking completo
    const displayList = compact ? sorted.slice(0, 5) : sorted;

    return (
        <div className="w-full space-y-2">
            {displayList.map((p, i) => (
                <ParticipantRow
                    key={p.id}
                    p={p}
                    rank={i}
                    isMe={p.student_name === myName}
                    totalCount={participants.length}
                    showFeedback={showFeedback}
                    isTeacher={!myName} // Se não tem myName, assumimos que é a visão do professor
                    currentQuestionIndex={currentQuestionIndex}
                />
            ))}
        </div>
    );
};
