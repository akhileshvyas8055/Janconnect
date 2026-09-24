import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import Login from './pages/Login';
import Register from './pages/Register';
import CitizenDashboard from './pages/CitizenDashboard';
import OfficerDashboard from './pages/OfficerDashboard';
import MapView from './pages/MapView';
import TransparencyDashboard from './pages/TransparencyDashboard';
import GovernmentProjects from './pages/GovernmentProjects';
import IssuesNearYou from './pages/IssuesNearYou';
import WhatsAppBotMock from './components/WhatsAppBotMock';
import AppLayout from './components/AppLayout';

// Full-screen spinner shown while auth is being restored from localStorage
const AuthLoader = () => (
  <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-[#090d16] transition-colors duration-200">
    <div className="flex flex-col items-center gap-3">
      <div className="w-8 h-8 border-3 border-blue-600 border-t-transparent rounded-full animate-spin" />
      <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold tracking-wide">
        Verifying Session...
      </p>
    </div>
  </div>
);

const ProtectedRoute = ({ children, roles }: { children: React.ReactNode, roles?: string[] }) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  if (isLoading) return <AuthLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (roles && user && !roles.includes(user.role)) return <Navigate to="/" replace />;
  return <>{children}</>;
};

const DashboardRedirect = () => {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading) return <AuthLoader />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (user?.role === 'Officer') return <Navigate to="/officer" replace />;
  return <CitizenDashboard />;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/dashboard" element={<ProtectedRoute><DashboardRedirect /></ProtectedRoute>} />
      <Route path="/officer" element={<ProtectedRoute roles={['Officer']}><OfficerDashboard /></ProtectedRoute>} />
      <Route path="/transparency" element={<ProtectedRoute><TransparencyDashboard /></ProtectedRoute>} />
      <Route path="/projects" element={<ProtectedRoute><GovernmentProjects /></ProtectedRoute>} />
      <Route path="/nearby" element={<ProtectedRoute roles={['Citizen']}><IssuesNearYou /></ProtectedRoute>} />
      <Route
        path="/map"
        element={
          <ProtectedRoute>
            <AppLayout>
              <div className="h-[calc(100vh-4rem)] md:h-screen flex flex-col p-4 md:p-6">
                <div className="flex-1 rounded-xl overflow-hidden border border-slate-200 dark:border-white/10 shadow-sm relative">
                  <MapView />
                </div>
              </div>
            </AppLayout>
          </ProtectedRoute>
        }
      />
      <Route path="/" element={<DashboardRedirect />} />
    </Routes>
  );
}

const GlobalWhatsAppBot = () => {
  const { user, isAuthenticated } = useAuth();
  if (isAuthenticated && user?.role === 'Citizen') {
    return <WhatsAppBotMock />;
  }
  return null;
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <Router>
          <div className="min-h-screen">
            <AppRoutes />
            <GlobalWhatsAppBot />
          </div>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
