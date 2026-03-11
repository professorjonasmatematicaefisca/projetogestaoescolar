import React, { useState } from 'react';
import { questions } from './gameData';
import { useGameSession } from './useGameSession';
import { LiveLeaderboard } from './LiveLeaderboard';
import { Play, SkipForward, Square, Users, Trophy, Clock, AlertTriangle, Loader } from 'lucide-react';

interface TeacherControlPanelProps {
    teacherName: string;
    sessionId: string | null;
    onCreateSession: () => void;
}

export const TeacherControlPanel: React.FC<TeacherControlPanelProps> = ({
    teacherName,
    sessionId,
    onCreateSession,
}) => {
    const { session, participants, timeLeft, loading, startNextQuestion, finishGame } =
        useGameSession(sessionId, null);
    const [confirming, setConfirming] = useState(false);

    const qi = session?.current_question_index ?? -1;
    const isLast = qi >= questions.length - 1;
    const currentQ = qi >= 0 ? questions[qi] : null;
    const answeredCount = participants.filter(p => p.answered_current).length;
    const timerPct = (timeLeft / 180) * 100;
    const timerColor = timeLeft > 60 ? '#8bc34a' : timeLeft > 30 ? '#ffb300' : '#ff4b4b';

    if (!sessionId) {
        return (
            <div className="flex flex-col items-center justify-center gap-6 py-16">
                <div className="text-6xl">🎮</div>
                <div className="text-center">
                    <h2 className="text-2xl font-black text-white mb-2">WetWit Quest — Painel do Professor</h2>
                    <p className="text-gray-400">Crie uma nova sessão para iniciar a competição ao vivo.</p>
                </div>
                <button onClick={onCreateSession}
                    className="flex items-center gap-3 bg-gradient-to-r from-[#2e7d32] to-[#8bc34a] text-white font-black text-xl px-10 py-5 rounded-2xl shadow-[0_4px_30px_rgba(139,195,74,0.3)] hover:brightness-110 transition">
                    <Play size={24} />
                    Criar Nova Sessão
                </button>
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader size={40} className="text-[#8bc34a] animate-spin" />
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-5">
            {/* Header da sessão */}
            <div className="bg-black/40 border border-[#8bc34a]/20 rounded-2xl p-5 flex items-center justify-between flex-wrap gap-4">
                <div>
                    <h2 className="text-xl font-black text-white">🎮 WetWit Quest — Ao Vivo</h2>
                    <p className="text-gray-500 text-sm font-mono mt-1">Sessão: {sessionId?.slice(0, 12)}...</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2 bg-[#8bc34a]/10 border border-[#8bc34a]/20 px-4 py-2 rounded-xl">
                        <Users size={16} className="text-[#8bc34a]" />
                        <span className="text-[#8bc34a] font-black text-lg">{participants.length}</span>
                        <span className="text-gray-500 text-sm">participantes</span>
                    </div>
                    <div className={`px-4 py-2 rounded-xl font-bold text-sm border ${session?.status === 'waiting' ? 'bg-amber-500/10 border-amber-500/20 text-amber-400' :
                            session?.status === 'active' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' :
                                'bg-gray-500/10 border-gray-500/20 text-gray-400'
                        }`}>
                        {session?.status === 'waiting' ? '⏳ Aguardando' :
                            session?.status === 'active' ? '🔴 Ao Vivo' : '✅ Encerrado'}
                    </div>
                </div>
            </div>

            {/* Questão atual + Timer */}
            {session?.status === 'active' && currentQ && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="bg-black/40 border border-[#8bc34a]/20 rounded-2xl p-5">
                        <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Questão Atual ({qi + 1}/{questions.length})</div>
                        <div className="text-4xl mb-3">{currentQ.emoji}</div>
                        <h3 className="text-white font-bold text-lg leading-snug">{currentQ.title}</h3>
                        <p className="text-gray-400 text-sm mt-2 leading-relaxed">{currentQ.text}</p>
                    </div>
                    <div className="bg-black/40 border border-[#8bc34a]/20 rounded-2xl p-5 flex flex-col gap-4">
                        <div className="text-xs text-gray-500 font-bold uppercase tracking-wider">Timer</div>
                        <div className="flex items-center gap-3">
                            <Clock size={20} style={{ color: timerColor }} />
                            <span className="font-black text-4xl tabular-nums" style={{ color: timerColor }}>
                                {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
                            </span>
                        </div>
                        <div className="w-full h-3 bg-black/50 rounded-full overflow-hidden border border-white/10">
                            <div className="h-full rounded-full transition-all duration-1000" style={{ width: `${timerPct}%`, background: timerColor }} />
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                            <div className={`w-2 h-2 rounded-full ${answeredCount === participants.length ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
                            <span className="text-gray-400">
                                <span className="text-white font-bold">{answeredCount}/{participants.length}</span> já responderam
                            </span>
                        </div>
                    </div>
                </div>
            )}

            {/* Controles */}
            <div className="bg-black/40 border border-[#8bc34a]/20 rounded-2xl p-5">
                <div className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-4">Controles da Competição</div>
                <div className="flex flex-wrap gap-3">
                    {session?.status !== 'finished' && !isLast && (
                        <button onClick={startNextQuestion}
                            className="flex items-center gap-2 bg-gradient-to-r from-[#2e7d32] to-[#8bc34a] text-white font-black px-6 py-3 rounded-xl hover:brightness-110 transition shadow-lg">
                            <SkipForward size={18} />
                            {session?.status === 'waiting' ? 'Iniciar Questão 1' : 'Próxima Questão'}
                        </button>
                    )}
                    {session?.status !== 'finished' && (
                        !confirming ? (
                            <button onClick={() => setConfirming(true)}
                                className="flex items-center gap-2 bg-red-500/15 text-red-400 border border-red-500/30 font-bold px-6 py-3 rounded-xl hover:bg-red-500/25 transition">
                                <Square size={18} />
                                Encerrar Jogo
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 bg-red-900/30 border border-red-500/40 px-4 py-3 rounded-xl">
                                <AlertTriangle size={16} className="text-red-400" />
                                <span className="text-red-300 text-sm font-bold">Confirmar encerramento?</span>
                                <button onClick={() => { setConfirming(false); finishGame(); }}
                                    className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm font-bold hover:bg-red-500 transition">Sim</button>
                                <button onClick={() => setConfirming(false)}
                                    className="bg-gray-700 text-white px-3 py-1 rounded-lg text-sm font-bold hover:bg-gray-600 transition">Não</button>
                            </div>
                        )
                    )}
                </div>
                {isLast && session?.status === 'active' && (
                    <p className="text-amber-400 text-sm mt-3 flex items-center gap-2">
                        <AlertTriangle size={14} /> Esta é a última questão. Encerre após o tempo.
                    </p>
                )}
            </div>

            {/* Ranking ao vivo */}
            <div className="bg-black/40 border border-[#8bc34a]/20 rounded-2xl p-5">
                <div className="flex items-center gap-2 mb-4">
                    <Trophy size={18} className="text-yellow-400" />
                    <h3 className="text-white font-black">Ranking Ao Vivo</h3>
                    <span className="ml-auto text-xs text-gray-500">{participants.length} participante(s)</span>
                </div>
                <LiveLeaderboard participants={participants} />
            </div>
        </div>
    );
};
