import React, { useState } from 'react';
import { StorageService } from './services/storageService';
import { Lock, Save, CheckCircle2 } from 'lucide-react';

interface ChangePasswordProps {
    userEmail: string;
    onShowToast: (msg: string) => void;
}

export const ChangePassword: React.FC<ChangePasswordProps> = ({ userEmail, onShowToast }) => {
    const [currentPass, setCurrentPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');

    const handleChange = (e: React.FormEvent) => {
        e.preventDefault();

        // Basic validation
        if (newPass !== confirmPass) {
            onShowToast("As novas senhas não coincidem!");
            return;
        }

        if (newPass.length < 3) {
            onShowToast("A senha deve ter pelo menos 3 caracteres.");
            return;
        }

        // Validate old password logic (Simulated here since StorageService.validateLogin does exactly this)
        const isValid = StorageService.validateLogin(userEmail, currentPass);
        if (!isValid) {
            onShowToast("Senha atual incorreta.");
            return;
        }

        const success = StorageService.changePassword(userEmail, newPass);
        if (success) {
            onShowToast("Senha alterada com sucesso!");
            setCurrentPass('');
            setNewPass('');
            setConfirmPass('');
        } else {
            onShowToast("Erro ao alterar senha.");
        }
    };

    return (
        <div className="max-w-md mx-auto mt-10">
            <div className="bg-[#0f172a] border border-gray-800 rounded-xl p-8 shadow-lg">
                <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500">
                        <Lock size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Alterar Senha</h2>
                        <p className="text-xs text-gray-400">Mantenha sua conta segura</p>
                    </div>
                </div>

                <form onSubmit={handleChange} className="space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Senha Atual</label>
                        <input
                            type="password"
                            value={currentPass}
                            onChange={e => setCurrentPass(e.target.value)}
                            className="w-full bg-[#1e293b] border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 transition-colors"
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="border-t border-gray-800 pt-2"></div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Nova Senha</label>
                        <input
                            type="password"
                            value={newPass}
                            onChange={e => setNewPass(e.target.value)}
                            className="w-full bg-[#1e293b] border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 transition-colors"
                            placeholder="••••••••"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Confirmar Nova Senha</label>
                        <input
                            type="password"
                            value={confirmPass}
                            onChange={e => setConfirmPass(e.target.value)}
                            className="w-full bg-[#1e293b] border border-gray-700 rounded-lg p-3 text-white outline-none focus:border-emerald-500 transition-colors"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full mt-4 bg-emerald-500 hover:bg-emerald-600 text-[#0f172a] font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20"
                    >
                        <Save size={18} />
                        Atualizar Senha
                    </button>
                </form>
            </div>
        </div>
    );
};