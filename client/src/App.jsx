import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { DialogProvider } from './context/DialogContext.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import Spinner from './components/ui/Spinner.jsx';
import PageErrorState from './components/ui/PageErrorState.jsx';
import { childrenPropType } from './utils/propTypes.js';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import ForgotPassword from './pages/ForgotPassword.jsx';
import ResetPassword from './pages/ResetPassword.jsx';
import Privacy from './pages/Privacy.jsx';
import Terms from './pages/Terms.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Transactions from './pages/Transactions.jsx';
import Accounts from './pages/Accounts.jsx';
import Categories from './pages/Categories.jsx';
import Reports from './pages/Reports.jsx';
import Profile from './pages/Profile.jsx';

function PrivateRoute({ children }) {
  const { user, loading, authError, loadSession } = useAuth();

  if (loading) return <Spinner className="min-h-screen" />;

  if (authError) {
    return (
      <div className="min-h-screen bg-canvas p-4 md:p-8">
        <div className="mx-auto max-w-xl pt-10">
          <PageErrorState
            title="No pudimos iniciar la aplicación"
            message={authError}
            onAction={loadSession}
          />
        </div>
      </div>
    );
  }

  return user ? <AppLayout>{children}</AppLayout> : <Navigate to="/login" replace />;
}

function GuestRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Spinner className="min-h-screen" />;
  return user ? <Navigate to="/" replace /> : children;
}

function App() {
  return (
    <DialogProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
            <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
            <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
            <Route path="/reset-password" element={<GuestRoute><ResetPassword /></GuestRoute>} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/transactions" element={<PrivateRoute><Transactions /></PrivateRoute>} />
            <Route path="/accounts" element={<PrivateRoute><Accounts /></PrivateRoute>} />
            <Route path="/categories" element={<PrivateRoute><Categories /></PrivateRoute>} />
            <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </DialogProvider>
  );
}

PrivateRoute.propTypes = {
  children: childrenPropType,
};

GuestRoute.propTypes = {
  children: childrenPropType,
};

export default App;
