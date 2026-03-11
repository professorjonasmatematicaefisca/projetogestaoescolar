import { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../supabaseClient';

export interface GameSession {
    id: string;
    status: 'waiting' | 'active' | 'finished';
    current_question_index: number;
    question_start_time: string | null;
    teacher_id: string | null;
    teacher_name: string | null;
    created_at: string;
    updated_at: string;
}

export interface GameParticipant {
    id: string;
    session_id: string;
    student_name: string;
    score: number;
    answered_current: boolean;
    last_seen: string;
    created_at: string;
    updated_at: string;
}

interface UseGameSessionReturn {
    session: GameSession | null;
    participants: GameParticipant[];
    myParticipant: GameParticipant | null;
    timeLeft: number;
    loading: boolean;
    error: string | null;
    // Teacher actions
    createSession: (teacherName: string) => Promise<GameSession | null>;
    startNextQuestion: () => Promise<void>;
    finishGame: () => Promise<void>;
    // Student actions
    joinSession: (sessionId: string, studentName: string) => Promise<GameParticipant | null>;
    submitAnswer: (isCorrect: boolean, pointsEarned: number) => Promise<void>;
}

const QUESTION_DURATION = 180;

export function useGameSession(
    sessionId: string | null,
    participantId: string | null
): UseGameSessionReturn {
    const [session, setSession] = useState<GameSession | null>(null);
    const [participants, setParticipants] = useState<GameParticipant[]>([]);
    const [myParticipant, setMyParticipant] = useState<GameParticipant | null>(null);
    const [timeLeft, setTimeLeft] = useState(QUESTION_DURATION);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Calcula o tempo restante baseado no timestamp do servidor
    const recalcTimer = useCallback((questionStartTime: string | null, status: string) => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (!questionStartTime || status !== 'active') {
            setTimeLeft(QUESTION_DURATION);
            return;
        }
        const tick = () => {
            const elapsed = Math.floor((Date.now() - new Date(questionStartTime).getTime()) / 1000);
            setTimeLeft(Math.max(0, QUESTION_DURATION - elapsed));
        };
        tick();
        timerRef.current = setInterval(tick, 1000);
    }, []);

    useEffect(() => {
        if (!sessionId) {
            setLoading(false);
            return;
        }

        let isMounted = true;

        const loadInitialData = async () => {
            setLoading(true);
            try {
                const [sessionRes, participantsRes] = await Promise.all([
                    supabase.from('game_sessions').select('*').eq('id', sessionId).single(),
                    supabase.from('game_participants').select('*').eq('session_id', sessionId).order('score', { ascending: false }),
                ]);
                if (!isMounted) return;
                if (sessionRes.error) throw sessionRes.error;

                const loadedSession = sessionRes.data as GameSession;
                setSession(loadedSession);
                setParticipants((participantsRes.data as GameParticipant[]) ?? []);

                if (participantId) {
                    const mine = (participantsRes.data ?? []).find((p: GameParticipant) => p.id === participantId) ?? null;
                    setMyParticipant(mine);
                }
                recalcTimer(loadedSession.question_start_time, loadedSession.status);
            } catch (err: any) {
                if (isMounted) setError(err.message);
            } finally {
                if (isMounted) setLoading(false);
            }
        };

        loadInitialData();

        // ─── Realtime: game_sessions (postgres_changes) ───
        const sessionChannel = supabase
            .channel(`session:${sessionId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${sessionId}` },
                (payload) => {
                    if (!isMounted) return;
                    const updated = payload.new as GameSession;
                    setSession(updated);
                    recalcTimer(updated.question_start_time, updated.status);
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    // Canal ativo — nada a fazer
                }
                if (status === 'CHANNEL_ERROR') {
                    // Fallback: polling a cada 3 s se canal falhar
                    const interval = setInterval(async () => {
                        const { data } = await supabase.from('game_sessions').select('*').eq('id', sessionId).single();
                        if (data && isMounted) {
                            const s = data as GameSession;
                            setSession(prev => {
                                if (prev?.current_question_index !== s.current_question_index || prev?.status !== s.status) {
                                    recalcTimer(s.question_start_time, s.status);
                                    return s;
                                }
                                return prev;
                            });
                        }
                    }, 3000);
                    return () => clearInterval(interval);
                }
            });

        // ─── Realtime: game_participants ───
        const participantsChannel = supabase
            .channel(`participants:${sessionId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'game_participants', filter: `session_id=eq.${sessionId}` },
                (payload) => {
                    if (!isMounted) return;
                    setParticipants((prev) => {
                        let updated: GameParticipant[];
                        if (payload.eventType === 'INSERT') {
                            updated = [...prev, payload.new as GameParticipant];
                        } else if (payload.eventType === 'UPDATE') {
                            updated = prev.map((p) =>
                                p.id === (payload.new as GameParticipant).id ? payload.new as GameParticipant : p
                            );
                            if (participantId && (payload.new as GameParticipant).id === participantId) {
                                setMyParticipant(payload.new as GameParticipant);
                            }
                        } else if (payload.eventType === 'DELETE') {
                            updated = prev.filter((p) => p.id !== (payload.old as GameParticipant).id);
                        } else {
                            updated = prev;
                        }
                        return [...updated].sort((a, b) => b.score - a.score);
                    });
                }
            )
            .subscribe();

        return () => {
            isMounted = false;
            supabase.removeChannel(sessionChannel);
            supabase.removeChannel(participantsChannel);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [sessionId, participantId, recalcTimer]);

    // ─── Ações do Professor ───

    const createSession = async (teacherName: string): Promise<GameSession | null> => {
        const { data, error } = await supabase
            .from('game_sessions')
            .insert({ teacher_name: teacherName, status: 'waiting', current_question_index: -1 })
            .select()
            .single();
        if (error) { setError(error.message); return null; }
        return data as GameSession;
    };

    const startNextQuestion = async () => {
        if (!session) return;
        const nextIndex = session.current_question_index + 1;

        // Atualiza sessão → isso dispara o Realtime para todos
        const { error: sessionErr } = await supabase
            .from('game_sessions')
            .update({
                current_question_index: nextIndex,
                question_start_time: new Date().toISOString(),
                status: 'active',
            })
            .eq('id', session.id);

        if (!sessionErr) {
            // Reseta Flag de resposta de todos os participantes
            await supabase
                .from('game_participants')
                .update({ answered_current: false })
                .eq('session_id', session.id);
        }
    };

    /**
     * Encerra o game:
     * 1. Marca sessão como finished
     * 2. Deleta TODOS os participantes da sessão
     * → Professores voltam à tela "Criar Nova Sessão"
     */
    const finishGame = async () => {
        if (!session) return;

        // 1. Marca finished (Realtime vai notificar alunos)
        await supabase
            .from('game_sessions')
            .update({ status: 'finished' })
            .eq('id', session.id);

        // 2. Aguarda 3 s para os alunos verem o ranking final
        await new Promise(r => setTimeout(r, 3000));

        // 3. Deleta participantes da sessão
        await supabase
            .from('game_participants')
            .delete()
            .eq('session_id', session.id);

        // 4. Remove o ID da sessão do localStorage (professor volta ao início)
        localStorage.removeItem('wetwiquest_session_id');

        // 5. Recarrega a página para resetar o estado local do professor
        //    (estado React vai ser resetado automaticamente junto com sessionId)
        window.location.reload();
    };

    // ─── Ações do Aluno ───

    const joinSession = async (sid: string, studentName: string): Promise<GameParticipant | null> => {
        const { data, error } = await supabase
            .from('game_participants')
            .insert({ session_id: sid, student_name: studentName, score: 0 })
            .select()
            .single();
        if (error) { setError(error.message); return null; }
        return data as GameParticipant;
    };

    const submitAnswer = async (isCorrect: boolean, pointsEarned: number) => {
        if (!myParticipant || myParticipant.answered_current) return;
        const newScore = myParticipant.score + (isCorrect ? pointsEarned : 0);
        await supabase
            .from('game_participants')
            .update({ score: newScore, answered_current: true, last_seen: new Date().toISOString() })
            .eq('id', myParticipant.id);
    };

    return {
        session, participants, myParticipant, timeLeft, loading, error,
        createSession, startNextQuestion, finishGame, joinSession, submitAnswer,
    };
}
