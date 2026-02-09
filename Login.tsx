import React, { useState } from 'react';
import { UserRole } from './types';
import { StorageService } from './services/storageService';
import { GraduationCap, Lock, Mail, ArrowRight } from 'lucide-react';

interface LoginProps {
    onLogin: (role: UserRole, email: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        const user = StorageService.validateLogin(email, password);

        if (user) {
            onLogin(user.role, user.email);
        } else {
            // Fallback for demo instructions to not lock user out if they didn't read docs
            if (email === 'coordenador@gmail.com' && password !== 'mudar123') {
                setError('Dica: A senha do coordenador é "mudar123"');
            } else if ((email === 'prof@edu.com' || email === 'mon@edu.com') && password !== '123') {
                setError('Dica: A senha inicial para professores/monitores é "123"');
            } else {
                setError('Credenciais inválidas.');
            }
        }
    };

    return (
        <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4 relative overflow-hidden">
            {/* Background Decor */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-emerald-500/10 rounded-full blur-3xl"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-500/10 rounded-full blur-3xl"></div>
            </div>

            <div className="w-full max-w-md bg-[#1e293b] border border-gray-800 rounded-2xl shadow-2xl p-8 relative z-10">
                <div className="flex flex-col items-center mb-8">
                    <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20 mb-4">
                        <GraduationCap className="text-white" size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-white tracking-tight">EduControl <span className="text-emerald-500">PRO</span></h1>
                    <p className="text-gray-400 text-sm mt-1">Acesso ao Sistema de Gestão</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">E-mail Institucional</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full bg-[#0f172a] border border-gray-700 rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                                placeholder="coordenador@gmail.com"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Senha</label>
                        <div className="relative">
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full bg-[#0f172a] border border-gray-700 rounded-xl py-3 pl-11 pr-4 text-white placeholder-gray-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs font-bold text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full bg-emerald-500 hover:bg-emerald-600 text-[#0f172a] font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 group"
                    >
                        Entrar no Sistema
                        <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-gray-700 text-center">
                    <p className="text-xs text-gray-500">
                        Problemas com acesso? <a href="#" className="text-emerald-500 hover:underline">Contate o suporte</a>
                    </p>
                </div>
            </div>
        </div>
    );
};