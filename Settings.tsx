import React, { useState, useEffect, useRef } from 'react';
import { StorageService } from './services/storageService';
import { Lock, Save, ImageIcon, Upload, Trash2 } from 'lucide-react';
import { UserRole } from './types';

interface SettingsProps {
    userEmail: string;
    userRole: UserRole;
    onShowToast: (msg: string) => void;
}

export const Settings: React.FC<SettingsProps> = ({ userEmail, userRole, onShowToast }) => {
    const [currentPass, setCurrentPass] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirmPass, setConfirmPass] = useState('');

    const [logoUrl, setLogoUrl] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const savedLogo = localStorage.getItem('educontrol_school_logo');
        if (savedLogo) {
            setLogoUrl(savedLogo);
        }
    }, []);

    const handleChangePassword = (e: React.FormEvent) => {
        e.preventDefault();

        if (newPass !== confirmPass) {
            onShowToast("As novas senhas não coincidem!");
            return;
        }

        if (newPass.length < 3) {
            onShowToast("A senha deve ter pelo menos 3 caracteres.");
            return;
        }

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

    const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setLogoUrl(base64String);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSaveLogo = () => {
        localStorage.setItem('educontrol_school_logo', logoUrl);
        onShowToast("Logomarca escolar salva com sucesso!");
    };

    const handleRemoveLogo = () => {
        localStorage.removeItem('educontrol_school_logo');
        setLogoUrl('');
        onShowToast("Logomarca removida.");
    };

    return (
        <div className="max-w-4xl mx-auto mt-10 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Change Password Block */}
            <div className="bg-[#0f172a] border border-gray-800 rounded-xl p-8 shadow-lg h-fit">
                <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
                    <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center text-emerald-500">
                        <Lock size={20} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-white">Alterar Senha</h2>
                        <p className="text-xs text-gray-400">Mantenha sua conta segura</p>
                    </div>
                </div>

                <form onSubmit={handleChangePassword} className="space-y-4">
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

            {/* Application Settings (Coordinator Only) */}
            {userRole === UserRole.COORDINATOR && (
                <div className="bg-[#0f172a] border border-gray-800 rounded-xl p-8 shadow-lg h-fit">
                    <div className="flex items-center gap-3 mb-6 border-b border-gray-800 pb-4">
                        <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center text-blue-500">
                            <ImageIcon size={20} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-white">Logomarca da Instituição</h2>
                            <p className="text-xs text-gray-400">Visível no cabeçalho dos Relatórios e FOA</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="flex flex-col items-center justify-center w-full">
                            {logoUrl ? (
                                <div className="relative group w-full flex flex-col items-center gap-4">
                                    <div className="w-full max-w-[200px] bg-white rounded-lg p-4 border border-gray-700 flex justify-center shadow-inner">
                                        <img src={logoUrl} alt="Logo Preview" className="max-h-24 object-contain" />
                                    </div>
                                    <div className="flex gap-2 w-full">
                                        <button
                                            onClick={handleRemoveLogo}
                                            className="flex-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 font-bold py-2 rounded-lg flex justify-center items-center gap-2 transition-colors border border-red-500/30"
                                        >
                                            <Trash2 size={16} /> Remover
                                        </button>
                                        <button
                                            onClick={() => fileInputRef.current?.click()}
                                            className="flex-1 bg-[#1e293b] hover:bg-gray-700 text-white font-bold py-2 rounded-lg flex justify-center items-center gap-2 transition-colors border border-gray-600"
                                        >
                                            Altetar Imagem
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <button
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full h-32 border-2 border-dashed border-gray-700 hover:border-blue-500 bg-[#1e293b]/50 hover:bg-[#1e293b] rounded-xl flex flex-col items-center justify-center gap-2 text-gray-400 hover:text-blue-400 transition-all cursor-pointer"
                                >
                                    <Upload size={28} />
                                    <span className="text-sm font-bold">Clique para carregar a Logomarca</span>
                                    <span className="text-xs font-normal opacity-70">(Recomendado fundo transparente - PNG)</span>
                                </button>
                            )}
                            <input
                                type="file"
                                ref={fileInputRef}
                                onChange={handleLogoUpload}
                                accept="image/*"
                                className="hidden"
                            />
                        </div>

                        {logoUrl && (
                            <button
                                onClick={handleSaveLogo}
                                className="w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 rounded-lg flex items-center justify-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                            >
                                <Save size={18} />
                                Salvar Configuração
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};