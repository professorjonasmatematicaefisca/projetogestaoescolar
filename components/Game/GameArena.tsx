import React, { useState, useEffect } from 'react';
import { UserRole } from '../../types';
import { TeacherControlPanel } from './TeacherControlPanel';
import { StudentPlayView } from './StudentPlayView';
import { useGameSession } from './useGameSession';
import { supabase } from '../../supabaseClient';
import { Link as ExternalLink } from 'lucide-react';

interface GameArenaProps {
    userRole: UserRole;
    userName: string;
    onShowToast: (msg: string) => void;
}

// ID da sessão armazenado para persistência entre recarregamentos
const SESSION_STORAGE_KEY = 'wetwiquest_session_id';

export const GameArena: React.FC<GameArenaProps> = ({ userRole, userName, onShowToast }) => {
    const isTeacherOrCoordinator =
        userRole === UserRole.TEACHER || userRole === UserRole.COORDINATOR;

    const [sessionId, setSessionId] = useState<string | null>(() => {
        return localStorage.getItem(SESSION_STORAGE_KEY);
    });

    const { session, createSession } = useGameSession(
        isTeacherOrCoordinator ? sessionId : null,
        null
    );

    // Verificar se a sessão salva ainda é válida
    useEffect(() => {
        if (!sessionId) return;
        supabase
            .from('game_sessions')
            .select('id, status')
            .eq('id', sessionId)
            .single()
            .then(({ data, error }) => {
                if (error || !data) {
                    localStorage.removeItem(SESSION_STORAGE_KEY);
                    setSessionId(null);
                }
            });
    }, []);

    const handleCreateSession = async () => {
        const newSession = await createSession(userName);
        if (newSession) {
            localStorage.setItem(SESSION_STORAGE_KEY, newSession.id);
            setSessionId(newSession.id);
            onShowToast('Sessão criada! Compartilhe o código com os alunos.');
        } else {
            onShowToast('Erro ao criar sessão. Tente novamente.');
        }
    };

    // ---- Professores / Coordenadores ----
    if (isTeacherOrCoordinator) {
        return (
            <div className="min-h-full">
                {/* Instruções para alunos */}
                {sessionId && (
                    <div className="mb-4 bg-[#8bc34a]/10 border border-[#8bc34a]/20 rounded-xl px-5 py-3 flex items-center gap-3 flex-wrap">
                        <ExternalLink size={16} className="text-[#8bc34a] shrink-0" />
                        <p className="text-sm text-gray-300 flex-1">
                            Os alunos devem acessar a plataforma e navegar até <span className="text-[#8bc34a] font-bold">Game</span> no menu lateral para entrar na competição.
                        </p>
                        <button
                            onClick={() => { navigator.clipboard.writeText(sessionId); onShowToast('ID da sessão copiado!'); }}
                            className="text-[#8bc34a] border border-[#8bc34a]/30 text-xs font-mono px-3 py-1.5 rounded-lg hover:bg-[#8bc34a]/10 transition shrink-0"
                        >
                            {sessionId.slice(0, 12)}… (copiar)
                        </button>
                    </div>
                )}

                <TeacherControlPanel
                    teacherName={userName}
                    sessionId={sessionId}
                    onCreateSession={handleCreateSession}
                />
            </div>
        );
    }

    // ---- Alunos e outros roles ----
    // Buscar sessão ativa (status waiting ou active)
    return <ActiveStudentGame userName={userName} />;
};

// Componente auxiliar: busca a sessão ativa para alunos
const ActiveStudentGame: React.FC<{ userName: string }> = ({ userName }) => {
    const [sessionId, setSessionId] = useState<string | null>(() => {
        // Verificar sessões salvas no sessionStorage
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key?.startsWith('game_student_name_')) {
                return key.replace('game_student_name_', '');
            }
        }
        return null;
    });
    const [searching, setSearching] = useState(true);
    const [found, setFound] = useState(false);

    useEffect(() => {
        const findActiveSession = async () => {
            if (sessionId) {
                // Verificar se a sessão salva ainda é válida
                const { data } = await supabase
                    .from('game_sessions')
                    .select('id, status')
                    .eq('id', sessionId)
                    .in('status', ['waiting', 'active'])
                    .single();
                if (data) { setFound(true); setSearching(false); return; }
                setSessionId(null);
            }
            // Buscar qualquer sessão ativa
            const { data } = await supabase
                .from('game_sessions')
                .select('id')
                .in('status', ['waiting', 'active'])
                .order('created_at', { ascending: false })
                .limit(1);

            if (data && data.length > 0) {
                setSessionId(data[0].id);
                setFound(true);
            } else {
                setFound(false);
            }
            setSearching(false);
        };

        findActiveSession();
    }, []);

    if (searching) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="w-12 h-12 border-4 border-[#8bc34a]/30 border-t-[#8bc34a] rounded-full animate-spin" />
                <p className="text-gray-400 font-bold">Procurando competição ativa...</p>
            </div>
        );
    }

    if (!found || !sessionId) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
                <div className="text-5xl">🎮</div>
                <h2 className="text-xl font-black text-white">Nenhuma Competição Ativa</h2>
                <p className="text-gray-400 text-center max-w-sm">
                    Aguarde o professor iniciar uma nova sessão do WetWit Quest para participar.
                </p>
            </div>
        );
    }

    return <StudentPlayView sessionId={sessionId} />;
};
