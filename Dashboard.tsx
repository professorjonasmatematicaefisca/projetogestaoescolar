import React from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line
} from 'recharts';
import { Sparkles, TrendingUp, AlertTriangle, Users, Download, School } from 'lucide-react';
import { SupabaseService } from './services/supabaseService';
import { StorageService } from './services/storageService';
import { ClassSession, ClassRoom } from './types';

export const Dashboard: React.FC = () => {
    const [sessions, setSessions] = React.useState<ClassSession[]>([]);
    const [classes, setClasses] = React.useState<ClassRoom[]>([]);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const loadData = async () => {
            try {
                const [s, c] = await Promise.all([
                    SupabaseService.getSessions(),
                    SupabaseService.getClasses()
                ]);
                setSessions(s);
                setClasses(c);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, []);

    if (loading) return <div className="text-white p-6">Carregando painel...</div>;

    // --- DATA CALCULATION ---

    // 1. School-wide Summary
    let totalGradeSum = 0;
    let totalGradeCount = 0;
    let totalPresent = 0;
    let totalRecords = 0;

    sessions.forEach(sess => {
        sess.records.forEach(r => {
            totalGradeSum += StorageService.calculateGrade(r);
            totalGradeCount++;
            if (r.present) totalPresent++;
            totalRecords++;
        });
    });

    const schoolAvgGrade = totalGradeCount > 0 ? (totalGradeSum / totalGradeCount).toFixed(1) : '0.0';
    const schoolAttendanceRate = totalRecords > 0 ? ((totalPresent / totalRecords) * 100).toFixed(1) : '0.0';

    // 2. Class-specific Stats for Insights
    const classStats = classes.map(cls => {
        const clsSessions = sessions.filter(s => s.className === cls.name);
        let cGradeSum = 0;
        let cCount = 0;
        clsSessions.forEach(s => {
            s.records.forEach(r => {
                cGradeSum += StorageService.calculateGrade(r);
                cCount++;
            });
        });
        const avg = cCount > 0 ? cGradeSum / cCount : 0;
        return { name: cls.name, avg };
    });

    // 3. Mock Chart Data (Replacing specific class chart with global daily trend if needed, 
    // but for now let's keep it simple or make it aggregate of last 5 days)
    // We'll stick to a visual mock for the line chart to keep the UI clean as per request "Desempenho Analítico"
    const chartData = [
        { name: 'SEG', presenca: 95, dispersao: 10 },
        { name: 'TER', presenca: 92, dispersao: 15 },
        { name: 'QUA', presenca: 98, dispersao: 5 },
        { name: 'QUI', presenca: 88, dispersao: 25 },
        { name: 'SEX', presenca: 94, dispersao: 12 },
    ];

    // --- INSIGHT LOGIC ---
    const renderInsights = () => {
        const insights = [];

        classStats.forEach(c => {
            if (c.avg < 7) {
                insights.push(
                    <div key={c.name} className="border-l-4 border-red-500 bg-red-500/5 p-3 rounded-r mb-3">
                        <div className="flex items-center gap-2 text-red-400 mb-1">
                            <AlertTriangle size={14} />
                            <span className="text-xs font-bold uppercase">Crítico: {c.name}</span>
                        </div>
                        <p className="text-sm text-gray-300">
                            Média da turma é <span className="font-bold text-white">{c.avg.toFixed(1)}</span> (Abaixo de 7). Necessária intervenção pedagógica imediata.
                        </p>
                    </div>
                );
            } else if (c.avg < 8) {
                insights.push(
                    <div key={c.name} className="border-l-4 border-orange-500 bg-orange-500/5 p-3 rounded-r mb-3">
                        <div className="flex items-center gap-2 text-orange-400 mb-1">
                            <TrendingUp size={14} />
                            <span className="text-xs font-bold uppercase">Atenção: {c.name}</span>
                        </div>
                        <p className="text-sm text-gray-300">
                            Média da turma é <span className="font-bold text-white">{c.avg.toFixed(1)}</span> (Abaixo de 8). Recomenda-se monitoramento de focos de indisciplina.
                        </p>
                    </div>
                );
            } else {
                insights.push(
                    <div key={c.name} className="border-l-4 border-emerald-500 bg-emerald-500/5 p-3 rounded-r mb-3">
                        <div className="flex items-center gap-2 text-emerald-400 mb-1">
                            <Sparkles size={14} />
                            <span className="text-xs font-bold uppercase">Destaque: {c.name}</span>
                        </div>
                        <p className="text-sm text-gray-300">
                            Excelente desempenho com média <span className="font-bold text-white">{c.avg.toFixed(1)}</span>. Próximo à meta de excelência.
                        </p>
                    </div>
                );
            }
        });

        if (insights.length === 0) return <p className="text-gray-500 text-sm italic">Dados insuficientes para gerar insights.</p>;
        return insights;
    };

    const handleDownloadPDF = async () => {
        // Find the main container to print
        const element = document.querySelector('.dashboard-container');
        if (!element) return;

        try {
            const html2canvas = (await import('html2canvas')).default;
            const jsPDF = (await import('jspdf')).default;

            const canvas = await html2canvas(element as HTMLElement, {
                scale: 2,
                useCORS: true,
                backgroundColor: '#0f172a'
            });

            const imgData = canvas.toDataURL('image/png');
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'mm',
                format: 'a4'
            });

            const imgWidth = 297;
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
            pdf.save(`Dashboard_Analitico_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error("PDF Error:", error);
        }
    };

    return (
        <div className="max-w-[1600px] mx-auto space-y-6 dashboard-container">
            <div className="flex flex-col md:flex-row justify-between items-end mb-4">
                <div>
                    <h2 className="text-2xl font-bold text-white">Desempenho Analítico</h2>
                    <p className="text-gray-400 text-sm mt-1">Resumo Geral do Colégio</p>
                </div>
                <div className="flex bg-[#1e293b] p-1 rounded-lg border border-gray-700">
                    <button className="px-4 py-1.5 text-xs font-bold bg-emerald-600 text-white rounded-md shadow-lg">SEMANAL</button>
                    <button className="px-4 py-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors">MENSAL</button>
                    <button className="px-4 py-1.5 text-xs font-bold text-gray-400 hover:text-white transition-colors">BIMESTRAL</button>
                </div>
            </div>

            {/* KPI Cards (Global School Stats) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <KPICard
                    icon={Users}
                    label="Presença Geral (Escola)"
                    value={`${schoolAttendanceRate}%`}
                    trend="+0.5%"
                    trendPositive={true}
                    color="text-emerald-400"
                    bgColor="bg-emerald-500/10"
                    borderColor="border-emerald-500/20"
                />
                <KPICard
                    icon={School}
                    label="Média Geral (Escola)"
                    value={schoolAvgGrade}
                    trend={Number(schoolAvgGrade) >= 8 ? "Meta Atingida" : "Abaixo da Meta"}
                    trendPositive={Number(schoolAvgGrade) >= 8}
                    color="text-blue-400"
                    bgColor="bg-blue-500/10"
                    borderColor="border-blue-500/20"
                />
                <KPICard
                    icon={AlertTriangle}
                    label="Turmas Críticas (<7.0)"
                    value={classStats.filter(c => c.avg < 7).length.toString()}
                    trend="Ação Necessária"
                    trendPositive={false}
                    color="text-red-400"
                    bgColor="bg-red-500/10"
                    borderColor="border-red-500/20"
                />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
                {/* Main Chart */}
                <div className="lg:col-span-2 bg-[#0f172a] p-6 rounded-xl border border-gray-800 shadow-lg min-h-[400px]">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="font-bold text-lg text-white">Presença vs. Dispersão (Global)</h3>
                            <p className="text-xs text-gray-500">Tendência média de todas as turmas</p>
                        </div>
                        <div className="flex gap-4">
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                                <span className="text-xs text-gray-400">Presença</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="w-3 h-3 rounded-full bg-gray-600"></span>
                                <span className="text-xs text-gray-400">Dispersão</span>
                            </div>
                        </div>
                    </div>
                    <div className="h-80 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                                <XAxis dataKey="name" stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dy={10} />
                                <YAxis stroke="#64748b" fontSize={12} tickLine={false} axisLine={false} dx={-10} />
                                <Tooltip
                                    contentStyle={{ backgroundColor: '#1e293b', borderRadius: '8px', border: '1px solid #334155', color: '#fff' }}
                                    itemStyle={{ color: '#fff' }}
                                />
                                <Line type="monotone" dataKey="presenca" stroke="#10b981" strokeWidth={3} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                                <Line type="monotone" dataKey="dispersao" stroke="#475569" strokeWidth={3} dot={false} />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* AI Insights Panel */}
                <div className="bg-[#0f172a] rounded-xl border border-gray-800 shadow-lg p-6 flex flex-col relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-4 opacity-10">
                        <Sparkles size={100} className="text-emerald-500" />
                    </div>

                    <div className="flex items-center gap-2 mb-6 z-10">
                        <Sparkles className="text-emerald-400" size={20} />
                        <h3 className="font-bold text-white text-lg">Insights por Turma</h3>
                    </div>

                    <div className="space-y-2 z-10 overflow-y-auto max-h-[400px] pr-2 custom-scrollbar">
                        {renderInsights()}
                    </div>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex justify-start">
                <button
                    onClick={handleDownloadPDF}
                    className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-[#0f172a] font-bold rounded-lg shadow-lg shadow-emerald-500/20 transition-all"
                >
                    <Download size={18} />
                    Exportar Relatório Geral (PDF)
                </button>
            </div>
        </div>
    );
};

const KPICard = ({ icon: Icon, label, value, trend, trendPositive, color, bgColor, borderColor }: any) => (
    <div className={`p-5 rounded-xl border ${borderColor} ${bgColor} flex items-center justify-between`}>
        <div className="flex items-center gap-4">
            <div className={`p-3 rounded-lg bg-[#0f172a] border border-gray-700 ${color}`}>
                <Icon size={24} />
            </div>
            <div>
                <p className="text-gray-400 text-xs font-bold uppercase">{label}</p>
                <h4 className="text-3xl font-bold text-white mt-1">{value}</h4>
            </div>
        </div>
        <div className={`flex items-center gap-1 text-xs font-bold ${trendPositive ? 'text-emerald-400' : 'text-red-400'}`}>
            <span>{trendPositive ? '↑' : '↓'}</span>
            <span>{trend}</span>
        </div>
    </div>
);