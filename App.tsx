import React, { useState, useEffect } from 'react';
import { Layout } from './Layout';
import { Login } from './Login';
import { ClassroomMonitor } from './ClassroomMonitor';
import { Dashboard } from './Dashboard';
import { StudentReport } from './StudentReport';
import { Occurrences } from './Occurrences';
import { AdminPanel } from './AdminPanel';
import { ChangePassword } from './ChangePassword';
import { FOA } from './FOA';
import { UserRole, ViewState } from './types';

import { supabase } from './supabaseClient';

function App() {
  console.log('Supabase Client:', supabase);

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('MONITORING');
  const [userRole, setUserRole] = useState<UserRole>(UserRole.COORDINATOR);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [userPhoto, setUserPhoto] = useState<string | undefined>(undefined);
  const [targetStudentId, setTargetStudentId] = useState<string | undefined>(undefined);
  const [isDark, setIsDark] = useState(false);
  const [toast, setToast] = useState<{ msg: string, visible: boolean }>({ msg: '', visible: false });

  // Theme Init
  useEffect(() => {
    // 1. Theme Init
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDark(true);
    }

    // 2. Session Restore from LocalStorage
    const storedRole = localStorage.getItem('educontrol_role');
    const storedEmail = localStorage.getItem('educontrol_email');
    const storedName = localStorage.getItem('educontrol_name');

    if (storedRole && storedEmail) {
      setUserRole(storedRole as UserRole);
      setUserEmail(storedEmail);
      if (storedName) setUserName(storedName);
      setIsAuthenticated(true);
      // Only set default view if not already set (though re-render might reset state, view persistence is optional)
      if (storedRole === UserRole.COORDINATOR) setCurrentView('DASHBOARD');
      else if (storedRole === UserRole.TEACHER) setCurrentView('MONITORING');
      else setCurrentView('OCCURRENCES');
    }
  }, []);

  const toggleTheme = () => setIsDark(!isDark);

  const showToast = (msg: string) => {
    setToast({ msg, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 3000);
  };

  const handleLogin = (role: UserRole, email: string, name?: string) => {
    setUserRole(role);
    setUserEmail(email);
    if (name) setUserName(name);
    setIsAuthenticated(true);

    // Persist Session
    localStorage.setItem('educontrol_role', role);
    localStorage.setItem('educontrol_email', email);
    if (name) localStorage.setItem('educontrol_name', name);

    // Set initial view based on role
    if (role === UserRole.COORDINATOR) setCurrentView('DASHBOARD');
    else if (role === UserRole.TEACHER) setCurrentView('MONITORING');
    else setCurrentView('OCCURRENCES');
  };

  // Helper to switch view and select student
  const handleNavigateToStudent = (studentId: string) => {
    setTargetStudentId(studentId);
    setCurrentView('REPORTS');
  };

  // Reset when changing views manually
  const handleViewChange = (view: ViewState) => {
    if (view !== 'REPORTS') setTargetStudentId(undefined);
    setCurrentView(view);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(UserRole.COORDINATOR); // Reset
    setUserEmail('');
    setUserName('');

    // Clear Session
    localStorage.removeItem('educontrol_role');
    localStorage.removeItem('educontrol_email');
    localStorage.removeItem('educontrol_name');
  };

  const renderView = () => {
    switch (currentView) {
      case 'MONITORING': return <ClassroomMonitor onShowToast={showToast} userEmail={userEmail} userRole={userRole} />;
      case 'DASHBOARD': return <Dashboard onNavigateToStudent={handleNavigateToStudent} />;
      case 'REPORTS': return <StudentReport onShowToast={showToast} currentUserRole={userRole} initialStudentId={targetStudentId} />;
      case 'FOA': return <FOA onShowToast={showToast} currentUserRole={userRole} userEmail={userEmail} userName={userName} />;
      case 'OCCURRENCES': return <Occurrences onShowToast={showToast} />;
      case 'ADMIN': return <AdminPanel onShowToast={showToast} />;
      case 'SETTINGS': return <ChangePassword userEmail={userEmail} onShowToast={showToast} />;
      default: return <ClassroomMonitor onShowToast={showToast} userEmail={userEmail} userRole={userRole} />;
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className={isDark ? 'dark' : ''}>
      <Layout
        currentView={currentView}
        onViewChange={handleViewChange}
        role={userRole}
        onRoleChange={setUserRole}
        onLogout={handleLogout}
        isDark={isDark}
        toggleTheme={toggleTheme}
        userPhoto={userPhoto}
        userName={userName}
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