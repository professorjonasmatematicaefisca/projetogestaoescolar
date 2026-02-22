import React, { useState } from 'react';
import { UserRole } from './types';
import { SupabaseService } from './services/supabaseService';
import { GraduationCap, User, Lock, ArrowRight, Eye, EyeOff, Zap, TrendingUp, Rocket } from 'lucide-react';
import { LoadingSpinner } from './components/LoadingSpinner';

interface LoginProps {
    onLogin: (role: UserRole, email: string, name?: string, photoUrl?: string) => void;
}

export const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const result = await SupabaseService.loginUser(email, password);

            if (result.success && result.role && result.email) {
                onLogin(result.role, result.email, result.name, result.photoUrl);
            } else {
                // Fallback para as credenciais padrão se o login falhar
                if (email === 'coordenador@gmail.com' && password === 'mudar123') {
                    onLogin(UserRole.COORDINATOR, email);
                } else if ((email === 'prof@edu.com' || email === 'mon@edu.com') && password === '123') {
                    onLogin(email === 'prof@edu.com' ? UserRole.TEACHER : UserRole.MONITOR, email);
                } else {
                    setError('Credenciais inválidas ou usuário não encontrado.');
                }
            }
        } catch (err) {
            setError('Erro ao conectar com o servidor.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#0a0f1e] flex items-center justify-center p-4 md:p-8">
            <div className="w-full max-w-6xl bg-[#1a2332] rounded-3xl shadow-2xl overflow-hidden border border-gray-800/50 grid md:grid-cols-2">
                {/* Left Side - Login Form */}
                <div className="p-8 md:p-12 flex flex-col justify-center">
                    {/* Logo and Header */}
                    <div className="mb-8">
                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center">
                                <GraduationCap className="text-white" size={24} />
                            </div>
                            <div>
                                <h1 className="text-xl font-bold text-white">
                                    COC <span className="text-emerald-500">PAULÍNA</span>
                                </h1>
                                <p className="text-xs text-gray-400 italic">Inteligência e valores em cada atitude</p>
                            </div>
                        </div>

                        <h2 className="text-2xl font-bold text-white mb-2">Bem-vindo</h2>
                        <p className="text-sm text-gray-400">Acesse o sistema com suas credenciais para continuar.</p>
                    </div>

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-wide">
                                Usuário
                            </label>
                            <div className="relative">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full bg-[#0f1621] border border-gray-700/50 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-gray-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                                    placeholder="Insira seu e-mail ou usuário"
                                    required
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-gray-400 uppercase mb-2 tracking-wide">
                                Senha
                            </label>
                            <div className="relative">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500" size={18} />
                                <input
                                    type={showPassword ? "text" : "password"}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full bg-[#0f1621] border border-gray-700/50 rounded-xl py-3.5 pl-12 pr-12 text-white placeholder-gray-600 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 outline-none transition-all"
                                    placeholder="••••••••••••"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-xs font-medium text-center">
                                {error}
                            </div>
                        )}

                        <div className="flex items-center justify-between text-sm">
                            <label className="flex items-center gap-2 cursor-pointer group">
                                <input
                                    type="checkbox"
                                    checked={rememberMe}
                                    onChange={(e) => setRememberMe(e.target.checked)}
                                    className="w-4 h-4 rounded border-gray-600 bg-[#0f1621] text-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                                />
                                <span className="text-gray-400 text-xs group-hover:text-gray-300 transition-colors">Lembrar acesso</span>
                            </label>
                            <a href="#" className="text-xs text-emerald-500 hover:text-emerald-400 transition-colors">
                                Esqueci a senha
                            </a>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-3.5 rounded-xl shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 group"
                        >
                            {loading ? (
                                <LoadingSpinner size="sm" text="Autenticando..." />
                            ) : (
                                <>
                                    ENTRAR NO SISTEMA
                                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Support Link */}
                    <div className="mt-8 text-center">
                        <p className="text-xs text-gray-500">
                            Suporte técnico: <a href="#" className="text-emerald-500 hover:underline">Clique aqui</a>
                        </p>
                    </div>
                </div>

                {/* Right Side - Branding */}
                <div className="hidden md:flex bg-gradient-to-br from-[#0f1e2e] via-[#1a2f3f] to-[#0f1e2e] p-12 flex-col items-center justify-center relative overflow-hidden">
                    {/* Decorative Elements */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 rounded-full blur-3xl"></div>
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/5 rounded-full blur-3xl"></div>

                    {/* Geometric Shapes */}
                    <div className="absolute top-20 right-20 w-20 h-20 border-2 border-emerald-500/20 rounded-2xl rotate-12"></div>
                    <div className="absolute bottom-32 right-32 w-16 h-16 border-2 border-blue-500/20 rounded-full"></div>

                    {/* Star Icon */}
                    <div className="absolute top-8 right-8 w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center border border-blue-500/20">
                        <svg className="w-5 h-5 text-blue-400" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                    </div>

                    {/* Lightning Icon */}
                    <div className="absolute bottom-20 left-8 w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center border border-emerald-500/20">
                        <Zap className="w-5 h-5 text-emerald-400" />
                    </div>

                    {/* Main Content */}
                    <div className="relative z-10 text-center">
                        {/* Logo Circle */}
                        <div className="w-32 h-32 bg-emerald-500 rounded-3xl flex items-center justify-center mb-8 mx-auto shadow-2xl shadow-emerald-500/30">
                            <span className="text-6xl font-black text-white">C</span>
                        </div>

                        {/* Title */}
                        <h1 className="text-5xl font-black text-white mb-2 tracking-tight">
                            CONEXÃO
                        </h1>
                        <h2 className="text-5xl font-black text-emerald-500 mb-6">
                            COC
                        </h2>

                        {/* Decorative Line */}
                        <div className="flex items-center justify-center gap-2 mb-8">
                            <div className="h-1 w-16 bg-emerald-500 rounded-full"></div>
                            <div className="h-1 w-2 bg-blue-500 rounded-full"></div>
                            <div className="h-1 w-16 bg-emerald-500 rounded-full"></div>
                        </div>

                        {/* Subtitle */}
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-12">
                            EDUCONTROL ECOSYSTEM
                        </p>

                        {/* Feature Icons */}
                        <div className="flex items-center justify-center gap-6">
                            <div className="w-14 h-14 bg-[#1a2332] rounded-xl flex items-center justify-center border border-gray-700/50 hover:border-emerald-500/50 transition-all group">
                                <Zap className="w-6 h-6 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                            </div>
                            <div className="w-14 h-14 bg-[#1a2332] rounded-xl flex items-center justify-center border border-gray-700/50 hover:border-emerald-500/50 transition-all group">
                                <TrendingUp className="w-6 h-6 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                            </div>
                            <div className="w-14 h-14 bg-[#1a2332] rounded-xl flex items-center justify-center border border-gray-700/50 hover:border-emerald-500/50 transition-all group">
                                <Rocket className="w-6 h-6 text-gray-400 group-hover:text-emerald-500 transition-colors" />
                            </div>
                        </div>
                    </div>

                    {/* Bottom Dots Indicator */}
                    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
                        <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                        <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                        <div className="w-2 h-2 bg-gray-600 rounded-full"></div>
                    </div>
                </div>
            </div>
        </div>
    );
};