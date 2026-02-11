import React from 'react';
import { BookOpen } from 'lucide-react';

export const Planning: React.FC = () => {
    return (
        <div className="w-full max-w-7xl mx-auto space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                    <BookOpen className="text-emerald-500" size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-gray-100">Planejamento</h1>
                    <p className="text-gray-400">Gerencie seus planos de aula e atividades.</p>
                </div>
            </div>

            <div className="bg-[#0f172a] rounded-xl border border-gray-800 p-8 flex flex-col items-center justify-center text-center min-h-[400px]">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mb-4">
                    <BookOpen className="text-gray-500" size={32} />
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Em Breve</h2>
                <p className="text-gray-400 max-w-md">
                    A funcionalidade de planejamento de aulas estará disponível em breve.
                </p>
            </div>
        </div>
    );
};
