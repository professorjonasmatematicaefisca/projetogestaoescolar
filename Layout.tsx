import React from 'react';
import { UserRole, ViewState } from './types';
import {
  LayoutDashboard,
  GraduationCap,
  ClipboardList,
  AlertTriangle,
  LogOut,
  Menu,
  X,
  UserCircle,
  Settings,
  Lock,
  FileText
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  currentView: ViewState;
  onViewChange: (view: ViewState) => void;
  role: UserRole;
  onRoleChange: (role: UserRole) => void; // Kept for interface compatibility but won't be used for switching
  onLogout: () => void;
  isDark: boolean;
  toggleTheme: () => void;
  userPhoto?: string;
  userName?: string;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  currentView,
  onViewChange,
  role,
  onLogout,
  userPhoto,
  userName
}) => {
  const [isSidebarOpen, setSidebarOpen] = React.useState(false);

  // Define allowed views per role
  const rolePermissions: Record<UserRole, ViewState[]> = {
    [UserRole.COORDINATOR]: ['MONITORING', 'DASHBOARD', 'REPORTS', 'OCCURRENCES', 'ADMIN', 'SETTINGS', 'FOA'],
    [UserRole.TEACHER]: ['MONITORING', 'REPORTS', 'SETTINGS', 'FOA'],
    [UserRole.MONITOR]: ['OCCURRENCES', 'SETTINGS']
  };

  const menuItems = [
    { view: 'DASHBOARD', icon: LayoutDashboard, label: 'Dashboard' },
    { view: 'MONITORING', icon: ClipboardList, label: 'Sala de Aula' },
    { view: 'REPORTS', icon: GraduationCap, label: 'Relatórios' },
    { view: 'FOA', icon: FileText, label: 'FOA (Observação)' },
    { view: 'OCCURRENCES', icon: AlertTriangle, label: 'Ocorrências' },
  ] as const;

  const allowedViews = rolePermissions[role] || [];

  return (
    <div className="min-h-screen flex bg-gray-900 text-gray-100 font-sans selection:bg-emerald-500 selection:text-white">
      {/* Mobile Overlay */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/80 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-50 w-72 bg-[#0f172a] border-r border-gray-800 
        transform transition-transform duration-300 ease-in-out flex flex-col shadow-2xl
        print:hidden
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between border-b border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <GraduationCap className="text-white" size={24} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-white tracking-tight leading-none">
                EduControl
              </h1>
              <span className="text-xs font-bold text-emerald-400 tracking-wider">PRO</span>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 px-2">
            Menu {role === UserRole.COORDINATOR ? 'Coordenador' : role === UserRole.TEACHER ? 'Professor' : 'Monitor'}
          </div>
          <nav className="space-y-2">
            {menuItems.map((item) => {
              if (!allowedViews.includes(item.view)) return null;
              const active = currentView === item.view;
              return (
                <button
                  key={item.view}
                  onClick={() => {
                    onViewChange(item.view);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${active
                    ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-600/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                    : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200 border border-transparent'
                    }`}
                >
                  <item.icon size={20} className={active ? 'text-emerald-400' : 'text-gray-500 group-hover:text-gray-300'} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}

            {/* Admin Link */}
            {role === UserRole.COORDINATOR && (
              <button
                onClick={() => {
                  onViewChange('ADMIN');
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-xl transition-all duration-200 group ${currentView === 'ADMIN'
                  ? 'bg-emerald-600/10 text-emerald-400 border border-emerald-600/20 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200 border border-transparent'
                  }`}
              >
                <Settings size={20} className={currentView === 'ADMIN' ? 'text-emerald-400' : 'text-gray-500 group-hover:text-gray-300'} />
                <span className="font-medium">Administração</span>
              </button>
            )}
          </nav>
        </div>

        {/* User Profile */}
        <div className="p-4 border-t border-gray-800 bg-[#0b1120]">
          {/* Settings Link */}
          <button
            onClick={() => {
              onViewChange('SETTINGS');
              setSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-4 py-2 mb-2 rounded-lg transition-all duration-200 group ${currentView === 'SETTINGS'
              ? 'bg-gray-700 text-white'
              : 'text-gray-400 hover:bg-gray-800 hover:text-white'
              }`}
          >
            <Lock size={16} />
            <span className="text-xs font-bold">Minha Senha</span>
          </button>

          <div className="flex items-center gap-3 mb-2 p-2">
            {userPhoto ? (
              <img
                src={userPhoto}
                alt="Perfil"
                className="w-10 h-10 rounded-full object-cover border border-gray-600"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center text-gray-300">
                <UserCircle size={24} />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">
                {userName || (role === UserRole.COORDINATOR ? 'Coordenação' : role === UserRole.TEACHER ? 'Professor(a)' : 'Monitor(a)')}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {role === UserRole.COORDINATOR ? 'Coordenador(a)' : role === UserRole.TEACHER ? 'Docente' : 'Monitoria'}
              </p>
            </div>
          </div>

          <button
            onClick={onLogout}
            className="mt-2 flex items-center gap-2 w-full px-4 py-2 rounded-lg text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors text-sm font-medium"
          >
            <LogOut size={16} />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden h-screen bg-gray-900 relative print:h-auto print:overflow-visible print:bg-white">
        <header className="lg:hidden h-16 bg-[#0f172a] border-b border-gray-800 flex items-center px-4 justify-between z-30 shrink-0 print:hidden">
          <div className="flex items-center gap-2">
            <GraduationCap className="text-emerald-500" size={24} />
            <h1 className="text-lg font-bold text-white">EduControl PRO</h1>
          </div>
          <button onClick={() => setSidebarOpen(true)} className="text-gray-400">
            <Menu size={24} />
          </button>
        </header>

        <div className="flex-1 overflow-auto p-4 lg:p-6 relative scroll-smooth print:p-0 print:overflow-visible">
          {children}
        </div>
      </main>
    </div>
  );
};