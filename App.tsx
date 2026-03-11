import React, { useState, useEffect } from 'react';
import { Layout } from './Layout';
import { Login } from './Login';
import { ClassroomMonitor } from './ClassroomMonitor';
import { Dashboard } from './Dashboard';
import { StudentReport } from './StudentReport';
import { Occurrences } from './Occurrences';
import { AdminPanel } from './AdminPanel';
import { Settings as SettingsView } from './Settings';
import { FOA } from './FOA';
import { Planning } from './Planning';
import { StudyGuide } from './StudyGuide';
import { RequestsPanel } from './RequestsPanel';
import { Comunicados } from './Comunicados';
import { PortalDashboard } from './PortalDashboard';
import { UpdatePassword } from './UpdatePassword';
import { GameArena } from './components/Game/GameArena';
import { UserRole, ViewState } from './types';
import { ErrorBoundary } from './ErrorBoundary';

import { supabase } from './supabaseClient';
import { SupabaseService } from './services/supabaseService';
import { offlineService } from './services/offlineService';

function App() {

  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentView, setCurrentView] = useState<ViewState>('MONITORING');
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [userEmail, setUserEmail] = useState<string>('');
  const [userName, setUserName] = useState<string>('');
  const [userPhoto, setUserPhoto] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState(0);
  const [targetStudentId, setTargetStudentId] = useState<string | undefined>(undefined);
  const [isDark, setIsDark] = useState(false);
  const [toast, setToast] = useState<{ msg: string, visible: boolean }>({ msg: '', visible: false });
  const [isRecovering, setIsRecovering] = useState(false);

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
    const storedPhoto = localStorage.getItem('educontrol_photo');
    const storedView = localStorage.getItem('educontrol_view');

    if (storedRole && storedEmail) {
      setUserRole(storedRole as UserRole);
      setUserEmail(storedEmail);
      if (storedName) setUserName(storedName);
      if (storedPhoto) setUserPhoto(storedPhoto);
      setIsAuthenticated(true);

      // Restore view if stored, otherwise use role-based default
      if (storedView) {
        setCurrentView(storedView as ViewState);
      } else {
        if (storedRole === UserRole.COORDINATOR) setCurrentView('DASHBOARD');
        else if (storedRole === UserRole.TEACHER) setCurrentView('MONITORING');
        else if (storedRole === UserRole.STUDENT || storedRole === UserRole.PARENT) setCurrentView('MESSAGES');
        else if (storedRole === UserRole.GAME_STUDENT) setCurrentView('GAME');
        else setCurrentView('OCCURRENCES');
      }
    }

    // 3. Listen for Auth Events (Password Recovery)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecovering(true);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const toggleTheme = () => setIsDark(!isDark);

  const showToast = (msg: string) => {
    setToast({ msg, visible: true });
    setTimeout(() => setToast(prev => ({ ...prev, visible: false })), 5000);
  };

  useEffect(() => {
    if (isAuthenticated && userEmail && userRole) {
      SupabaseService.getUnreadMessagesCount(userEmail, userRole).then(setUnreadCount);
    }
  }, [isAuthenticated, userEmail, userRole, currentView]);

  // Handle Background Sync for Offline actions
  useEffect(() => {
    const processSyncQueue = async () => {
      if (!isAuthenticated || !offlineService.isOnline()) return;

      const queue = await offlineService.getSyncQueue();
      if (queue.length === 0) return;

      let successCount = 0;
      let errorCount = 0;

      for (const item of queue) {
        try {
          if (item.feature === 'occurrence' && item.operation === 'POST') {
            await SupabaseService.saveOccurrence(item.data);
          } else if (item.feature === 'comunicado' && item.operation === 'POST') {
            await SupabaseService.createMessage(item.data);
          } else if (item.feature === 'frequence' && item.operation === 'POST') {
            await SupabaseService.saveSession(item.data.session, item.data.userEmail);
          }
          await offlineService.removeFromSyncQueue(item.id);
          successCount++;
        } catch (error) {
          console.error(`Failed to sync item ${item.id}`, error);
          errorCount++;
        }
      }

      if (successCount > 0) {
        showToast(`Sincronização concluída: ${successCount} item(ns) enviado(s)`);
      }
      if (errorCount > 0) {
        showToast(`Falha ao sincronizar ${errorCount} item(ns). Verifique sua rede.`);
      }
    };

    const handleOnline = () => {
      showToast('Conexão restabelecida. Verificando dados pendentes...');
      processSyncQueue();
    };

    window.addEventListener('online', handleOnline);
    processSyncQueue(); // Attempt on load

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [isAuthenticated]);

  const handleLogin = (role: UserRole, email: string, name?: string, photoUrl?: string) => {
    setUserRole(role);
    setUserEmail(email);
    if (name) setUserName(name);
    if (photoUrl) setUserPhoto(photoUrl);
    setIsAuthenticated(true);

    // Persist Session
    localStorage.setItem('educontrol_role', role);
    localStorage.setItem('educontrol_email', email);
    if (name) localStorage.setItem('educontrol_name', name);
    if (photoUrl) localStorage.setItem('educontrol_photo', photoUrl);

    // Set initial view based on role
    let initialView: ViewState = 'MONITORING';
    if (role === UserRole.COORDINATOR) initialView = 'DASHBOARD';
    else if (role === UserRole.TEACHER) initialView = 'MONITORING';
    else if (role === UserRole.STUDENT || role === UserRole.PARENT) initialView = 'MESSAGES';
    else if (role === UserRole.GAME_STUDENT) initialView = 'GAME';
    else initialView = 'OCCURRENCES';

    setCurrentView(initialView);
    localStorage.setItem('educontrol_view', initialView);
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
    localStorage.setItem('educontrol_view', view);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUserRole(null); // Reset to null
    setUserEmail('');
    setUserName('');
    setUserPhoto(''); // Reset photo

    // Clear Session
    localStorage.removeItem('educontrol_role');
    localStorage.removeItem('educontrol_email');
    localStorage.removeItem('educontrol_name');
    localStorage.removeItem('educontrol_photo');
    localStorage.removeItem('educontrol_view');
  };

  const renderView = () => {
    switch (currentView) {
      case 'MONITORING': return <ClassroomMonitor onShowToast={showToast} userEmail={userEmail} userRole={userRole!} />;
      case 'DASHBOARD':
        if (userRole === UserRole.STUDENT || userRole === UserRole.PARENT) {
          return <PortalDashboard userEmail={userEmail} userRole={userRole} onNavigate={handleViewChange} />;
        }
        return <Dashboard onNavigateToStudent={handleNavigateToStudent} />;
      case 'REPORTS': return <StudentReport onShowToast={showToast} currentUserRole={userRole!} initialStudentId={targetStudentId} />;
      case 'PLANNING': return <Planning userEmail={userEmail} userRole={userRole!} onShowToast={showToast} />;
      case 'STUDY_GUIDE': return <StudyGuide userEmail={userEmail} userRole={userRole!} onShowToast={showToast} />;
      case 'FOA': return <FOA onShowToast={showToast} currentUserRole={userRole!} userEmail={userEmail} userName={userName} />;
      case 'OCCURRENCES': return <Occurrences onShowToast={showToast} />;
      case 'ADMIN': return <AdminPanel onShowToast={showToast} />;
      case 'REQUESTS': return <RequestsPanel onShowToast={showToast} userEmail={userEmail} userRole={userRole!} />;
      case 'MESSAGES': return <Comunicados onShowToast={showToast} userEmail={userEmail} userName={userName} userRole={userRole!} />;
      case 'SETTINGS': return <SettingsView userEmail={userEmail} userRole={userRole!} onShowToast={showToast} />;
      case 'GAME': return <GameArena userRole={userRole!} userName={userName} onShowToast={showToast} />;
      default: return <ClassroomMonitor onShowToast={showToast} userEmail={userEmail} userRole={userRole!} />;
    }
  };

  if (isRecovering) {
    return (
      <ErrorBoundary>
        <UpdatePassword onComplete={() => {
          setIsRecovering(false);
          handleLogout();
        }} />
      </ErrorBoundary>
    );
  }

  if (!isAuthenticated) {
    return (
      <ErrorBoundary>
        <Login onLogin={handleLogin} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className={isDark ? 'dark' : ''}>
        <Layout
          currentView={currentView}
          onViewChange={handleViewChange}
          role={userRole!}
          onRoleChange={setUserRole}
          onLogout={handleLogout}
          isDark={isDark}
          toggleTheme={toggleTheme}
          userPhoto={userPhoto}
          userName={userName}
          unreadMessagesCount={unreadCount}
        >
          {renderView()}
        </Layout>

        {/* Global Toast Notification */}
        <div className={`fixed bottom-6 right-6 bg-emerald-800 text-white px-6 py-3 rounded-lg shadow-xl transition-all duration-300 transform ${toast.visible ? 'translate-y-0 opacity-100' : 'translate-y-10 opacity-0 pointer-events-none'} z-50 flex items-center gap-2`}>
          <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
          {toast.msg}
        </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;