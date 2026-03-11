import React, { useState, useEffect } from 'react';
import { UserRole } from '../../types';
import { TeacherControlPanel } from './TeacherControlPanel';
import { StudentPlayView } from './StudentPlayView';
import { supabase } from '../../supabaseClient';
import { Link as ExternalLink } from 'lucide-react';

interface GameArenaProps {
    userRole: UserRole;
    userName: string;
    onShowToast: (msg: string) => void;
}

const SESSION_STORAGE_KEY = 'wetwiquest_session_id';

export const GameArena: React.FC<GameArenaProps> = ({ userRole, userName, onShowToast }) => {
    const isTeacherOrCoordinator = userRole === UserRole.TEACHER || userRole === UserRole.COORDINATOR;
    const isGameStudent = userRole === UserRole.GAME_STUDENT;

    const [sessionId, setSessionId] = useState<string | null>(() =>
        localStorage.getItem(SESSION_STORAGE_KEY)
    );

    // Verifica se a sessão salva ainda é válida (não 'finished' ou inexistente)
    useEffect(() => {
        if (!sessionId) return;
        supabase
            .from('game_sessions')
            .select('id, status')
            .eq('id', sessionId)
            .single()
            .then(({ data, error }) => {
                if (error || !data || data.status === 'finished') {
                    localStorage.removeItem(SESSION_STORAGE_KEY);
                    setSessionId(null);
                }
            });
    }, []);

    const handleCreateSession = async () => {
        const { data, error } = await supabase
            .from('game_sessions')
            .insert({ teacher_name: userName, status: 'waiting', current_question_index: -1 })
            .select()
            .single();
        if (error || !data) {
            onShowToast('Erro ao criar sessão. Tente novamente.');
            return;
        }
        localStorage.setItem(SESSION_STORAGE_KEY, data.id);
        setSessionId(data.id);
        onShowToast('Sessão criada! Alunos entram com email @cocpaulinia.com.br + senha 123.');
    };

    // ---- Professores / Coordenadores ----
    if (isTeacherOrCoordinator) {
        return (
            <div className="min-h-full">
                {sessionId && (
                    <div className="mb-4 bg-[#8bc34a]/10 border border-[#8bc34a]/20 rounded-xl px-5 py-3 flex items-center gap-3 flex-wrap">
                        <ExternalLink size={16} className="text-[#8bc34a] shrink-0" />
                        <p className="text-sm text-gray-300 flex-1">
                            Alunos entram com <span className="font-mono text-[#8bc34a]">joaogomes@cocpaulinia.com.br</span> + senha <b>123</b> e acessam a aba <span className="text-[#8bc34a] font-bold">Game</span>.
                        </p>
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

    // ---- Alunos do Game e outros roles ----
    return <ActiveStudentGame preAuthName={isGameStudent ? userName : undefined} />;
};

// Componente auxiliar: busca a sessão ativa para alunos
const ActiveStudentGame: React.FC<{ preAuthName?: string }> = ({ preAuthName }) => {
    const [sessionId, setSessionId] = useState<string | null>(() => {
        // Verificar sessão salva no sessionStorage
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
                const { data } = await supabase
                    .from('game_sessions')
                    .select('id, status')
                    .eq('id', sessionId)
                    .in('status', ['waiting', 'active'])
                    .single();
                if (data) { setFound(true); setSearching(false); return; }
                // Sessão encerrada — limpa sessionStorage ligado a ela
                sessionStorage.removeItem(`game_student_name_${sessionId}`);
                sessionStorage.removeItem(`game_participant_id_${sessionId}`);
                setSessionId(null);
            }
            // Procura uma sessão ativa aberta
            const { data } = await supabase
                .from('game_sessions')
                .select('id')
                .in('status', ['waiting', 'active'])
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (data) {
                setSessionId(data.id);
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

    return <StudentPlayView sessionId={sessionId} preAuthName={preAuthName} />;
};
