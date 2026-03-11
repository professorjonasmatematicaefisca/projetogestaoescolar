import React from 'react';
import { GameParticipant } from './useGameSession';
import { Trophy } from 'lucide-react';

interface LiveLeaderboardProps {
    participants: GameParticipant[];
    myName?: string;
    compact?: boolean;
    /** Se true, aluno só vê sua própria posição (modo aluno) */
    onlyMe?: boolean;
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
}> = ({ p, rank, isMe, totalCount }) => {
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

            {/* Nome + badge */}
            <div className="flex-1 min-w-0">
                <p className={`font-bold truncate text-sm ${isMe ? 'text-[#8bc34a]' : 'text-white'}`}>
                    {p.student_name}
                    {isMe && totalCount && totalCount > 1 && (
                        <span className="ml-2 text-[10px] bg-[#8bc34a]/20 text-[#8bc34a] px-2 py-0.5 rounded-full font-bold">VOCÊ</span>
                    )}
                </p>
            </div>

            {/* Pontuação */}
            <div className="shrink-0 text-right">
                <span className={`font-black text-xl tabular-nums ${rank === 0 ? 'text-yellow-400' : isMe ? 'text-[#8bc34a]' : 'text-white'}`}>
                    {p.score.toLocaleString()}
                </span>
                <span className="text-gray-500 text-xs ml-1">pts</span>
            </div>

            {/* Já respondeu */}
            {p.answered_current && (
                <span className="text-xs bg-[#8bc34a]/20 text-[#8bc34a] px-2 py-0.5 rounded-full shrink-0 font-bold">✓</span>
            )}
        </div>
    );
};

export const LiveLeaderboard: React.FC<LiveLeaderboardProps> = ({ participants, myName, compact, onlyMe }) => {
    const sorted = [...participants].sort((a, b) => b.score - a.score);

    if (participants.length === 0) {
        return <div className="text-center text-gray-500 py-6 text-sm">Nenhum participante ainda...</div>;
    }

    // Modo aluno — só mostra o próprio aluno com sua posição
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
                />
            ))}
        </div>
    );
};
