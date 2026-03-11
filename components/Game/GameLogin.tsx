import React, { useState } from 'react';
import { Gamepad2, Lock, LogIn } from 'lucide-react';

interface GameLoginProps {
    onLogin: (studentName: string) => void;
    sessionId: string;
}

export const GameLogin: React.FC<GameLoginProps> = ({ onLogin, sessionId }) => {
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!name.trim() || name.trim().split(' ').length < 2) {
            setError('Por favor, insira seu nome completo (nome e sobrenome).');
            return;
        }
        if (password !== '123') {
            setError('Senha incorreta. Tente novamente.');
            return;
        }

        setLoading(true);
        onLogin(name.trim());
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex items-center justify-center"
            style={{
                background: 'radial-gradient(ellipse at top, #0d2e14 0%, #0a1a0d 60%, #050d06 100%)',
            }}>
            {/* Animated background blobs */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-32 -left-32 w-96 h-96 bg-[#8bc34a]/10 rounded-full blur-3xl animate-pulse" />
                <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-[#2e7d32]/10 rounded-full blur-3xl animate-pulse delay-1000" />
            </div>

            <div className="relative z-10 w-full max-w-md px-4">
                {/* Header */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-[#2e7d32] to-[#8bc34a] shadow-[0_0_40px_rgba(139,195,74,0.3)] mb-4">
                        <Gamepad2 size={36} className="text-white" />
                    </div>
                    <h1 className="text-4xl font-black text-white tracking-tight">WetWit Quest</h1>
                    <p className="text-[#8bc34a] font-bold tracking-widest text-sm mt-1 uppercase">COC Paulínia • Competição ao Vivo</p>
                </div>

                {/* Card */}
                <div className="bg-black/40 backdrop-blur-xl border border-[#8bc34a]/20 rounded-2xl p-8 shadow-2xl">
                    <h2 className="text-xl font-bold text-white mb-6 text-center">Entrar na Competição</h2>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-sm font-bold text-[#8bc34a] mb-2">Nome Completo</label>
                            <input
                                type="text"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Ex: João da Silva"
                                className="w-full bg-black/60 border border-[#8bc34a]/30 text-white rounded-xl px-4 py-3 outline-none focus:border-[#8bc34a] focus:ring-1 focus:ring-[#8bc34a]/50 placeholder:text-gray-600 transition"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-[#8bc34a] mb-2">
                                <Lock size={12} className="inline mr-1" />
                                Senha do Jogo
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                placeholder="••••"
                                className="w-full bg-black/60 border border-[#8bc34a]/30 text-white rounded-xl px-4 py-3 outline-none focus:border-[#8bc34a] focus:ring-1 focus:ring-[#8bc34a]/50 placeholder:text-gray-600 transition"
                                required
                            />
                        </div>

                        {error && (
                            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium px-4 py-3 rounded-xl">
                                {error}
                            </div>
                        )}

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#2e7d32] to-[#8bc34a] text-white font-black text-lg py-4 rounded-xl shadow-[0_4px_20px_rgba(139,195,74,0.3)] hover:brightness-110 transition disabled:opacity-50"
                        >
                            <LogIn size={20} />
                            {loading ? 'Entrando...' : 'Entrar na Competição'}
                        </button>
                    </form>

                    <p className="text-center text-gray-600 text-xs mt-6">
                        Código da Sessão: <span className="font-mono text-[#8bc34a] text-xs">{sessionId.slice(0, 8)}...</span>
                    </p>
                </div>
            </div>
        </div>
    );
};
