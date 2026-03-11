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

const QUESTION_DURATION = 180; // seconds

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

    // Calcula o tempo restante baseado no horário do servidor (resiliente a recarregamentos)
    const recalcTimer = useCallback((questionStartTime: string | null, status: string) => {
        if (timerRef.current) clearInterval(timerRef.current);
        if (!questionStartTime || status !== 'active') {
            setTimeLeft(QUESTION_DURATION);
            return;
        }

        const tick = () => {
            const elapsed = Math.floor((Date.now() - new Date(questionStartTime).getTime()) / 1000);
            const remaining = Math.max(0, QUESTION_DURATION - elapsed);
            setTimeLeft(remaining);
        };

        tick();
        timerRef.current = setInterval(tick, 1000);
    }, []);

    // Carrega dados iniciais da sessão
    useEffect(() => {
        if (!sessionId) {
            setLoading(false);
            return;
        }

        const loadInitialData = async () => {
            setLoading(true);
            try {
                const [sessionRes, participantsRes] = await Promise.all([
                    supabase.from('game_sessions').select('*').eq('id', sessionId).single(),
                    supabase.from('game_participants').select('*').eq('session_id', sessionId).order('score', { ascending: false }),
                ]);

                if (sessionRes.error) throw sessionRes.error;
                if (participantsRes.error) throw participantsRes.error;

                const loadedSession = sessionRes.data as GameSession;
                setSession(loadedSession);
                setParticipants(participantsRes.data as GameParticipant[]);

                if (participantId) {
                    const mine = participantsRes.data.find((p: GameParticipant) => p.id === participantId) || null;
                    setMyParticipant(mine);
                }

                recalcTimer(loadedSession.question_start_time, loadedSession.status);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setLoading(false);
            }
        };

        loadInitialData();

        // Subscrição Realtime: game_sessions
        const sessionSub = supabase
            .channel(`game_session_${sessionId}`)
            .on(
                'postgres_changes',
                { event: 'UPDATE', schema: 'public', table: 'game_sessions', filter: `id=eq.${sessionId}` },
                (payload) => {
                    const updated = payload.new as GameSession;
                    setSession(updated);
                    recalcTimer(updated.question_start_time, updated.status);
                }
            )
            .subscribe();

        // Subscrição Realtime: game_participants
        const participantsSub = supabase
            .channel(`game_participants_${sessionId}`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'game_participants', filter: `session_id=eq.${sessionId}` },
                (payload) => {
                    setParticipants((prev) => {
                        let updated: GameParticipant[];
                        if (payload.eventType === 'INSERT') {
                            updated = [...prev, payload.new as GameParticipant];
                        } else if (payload.eventType === 'UPDATE') {
                            updated = prev.map((p) => (p.id === (payload.new as GameParticipant).id ? payload.new as GameParticipant : p));
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
            supabase.removeChannel(sessionSub);
            supabase.removeChannel(participantsSub);
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [sessionId, participantId, recalcTimer]);

    // --- Ações do Professor ---
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
        const { error } = await supabase
            .from('game_sessions')
            .update({
                current_question_index: nextIndex,
                question_start_time: new Date().toISOString(),
                status: 'active',
            })
            .eq('id', session.id);

        if (!error) {
            // Resetar answered_current para todos os participantes
            await supabase
                .from('game_participants')
                .update({ answered_current: false })
                .eq('session_id', session.id);
        }
    };

    const finishGame = async () => {
        if (!session) return;
        await supabase
            .from('game_sessions')
            .update({ status: 'finished' })
            .eq('id', session.id);
    };

    // --- Ações do Aluno ---
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
        session,
        participants,
        myParticipant,
        timeLeft,
        loading,
        error,
        createSession,
        startNextQuestion,
        finishGame,
        joinSession,
        submitAnswer,
    };
}
