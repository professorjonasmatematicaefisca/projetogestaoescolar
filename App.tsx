import React, { useState, useEffect } from 'react';
import { Layout } from './components/Layout';
import { Login } from './components/Login';
import { ClassroomMonitor } from './components/ClassroomMonitor';
import { Dashboard } from './components/Dashboard';
import { StudentReport } from './components/StudentReport';
import { Occurrences } from './components/Occurrences';
import { AdminPanel } from './components/AdminPanel';
import { ChangePassword } from './components/ChangePassword';
import { FOA } from './components/FOA';
import { UserRole, ViewState } from './types';

import { supabase } from './supabaseClient';

function App() {
  console.log('Supabase Client:', supabase);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('MONITORING');
  const [userRole, setUserRole] = useState<UserRole>(UserRole.COORDINATOR);
  const [userEmail, setUserEmail] = useState<string>('');
  const [isDark, setIsDark] = useState(false);
  const [toast, setToast] = useState<{ msg: string, visible: boolean }>({ msg: '', visible: false });

  // Theme Init
  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true);
    }
  }, []);

  const toggleTheme = () => setIsDark(!isDark);

  const showToast = (msg: string) => {
    setToast({ msg, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };

  const handleLogin = (role: UserRole, email: string) => {
    setUserRole(role);
    setUserEmail(email);
    setIsAuthenticated(true);
    // Set initial view based on role
    if (role === UserRole.COORDINATOR) setCurrentView('DASHBOARD');
    else if (role === UserRole.TEACHER) setCurrentView('MONITORING');
    else setCurrentView('OCCURRENCES');
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(UserRole.COORDINATOR); // Reset
    setUserEmail('');
  };

  const renderView = () => {
    switch (currentView) {
      case 'MONITORING': return <ClassroomMonitor onShowToast={showToast} userEmail={userEmail} />;
      case 'DASHBOARD': return <Dashboard />;
      case 'REPORTS': return <StudentReport onShowToast={showToast} currentUserRole={userRole} />;
      case 'FOA': return <FOA onShowToast={showToast} />;
      case 'OCCURRENCES': return <Occurrences onShowToast={showToast} />;
      case 'ADMIN': return <AdminPanel onShowToast={showToast} />;
      case 'SETTINGS': return <ChangePassword userEmail={userEmail} onShowToast={showToast} />;
      default: return <ClassroomMonitor onShowToast={showToast} userEmail={userEmail} />;
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className={isDark ? 'dark' : ''}>
      <Layout
        currentView={currentView}
        onViewChange={setCurrentView}
        role={userRole}
        onRoleChange={setUserRole}
        onLogout={handleLogout}
        isDark={isDark}
        toggleTheme={toggleTheme}
      >
        {renderView()}
      </Layout>

      {/* Global Toast Notification */}
      <div className={`fixed bottom-6 right-6 bg-emerald-800 text-white px-6 py-3 rounded-lg shadow-xl transition-all duration-300 transform ${toast.visible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'} z-50 flex items-center gap-2`}>
        <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
        {toast.msg}
      </div>
    </div>
  );
}

export default App;