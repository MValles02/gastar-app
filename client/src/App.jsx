import { lazy, Suspense } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext.jsx';
import { DialogProvider } from './context/DialogContext.jsx';
import AppLayout from './components/layout/AppLayout.jsx';
import Spinner from './components/ui/Spinner.jsx';
import PageErrorState from './components/ui/PageErrorState.jsx';
import { childrenPropType } from './utils/propTypes.js';

const Login = lazy(() => import('./pages/Login.jsx'));
const Register = lazy(() => import('./pages/Register.jsx'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword.jsx'));
const ResetPassword = lazy(() => import('./pages/ResetPassword.jsx'));
const Dashboard = lazy(() => import('./pages/Dashboard.jsx'));
const Transactions = lazy(() => import('./pages/Transactions.jsx'));
const Accounts = lazy(() => import('./pages/Accounts.jsx'));
const Categories = lazy(() => import('./pages/Categories.jsx'));
const Reports = lazy(() => import('./pages/Reports.jsx'));

function RouteFallback() {
  return <Spinner className="min-h-screen" />;
}

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
          <Suspense fallback={<RouteFallback />}>
            <Routes>
              <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
              <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
              <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
              <Route path="/reset-password" element={<GuestRoute><ResetPassword /></GuestRoute>} />
              <Route path="/" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
              <Route path="/transactions" element={<PrivateRoute><Transactions /></PrivateRoute>} />
              <Route path="/accounts" element={<PrivateRoute><Accounts /></PrivateRoute>} />
              <Route path="/categories" element={<PrivateRoute><Categories /></PrivateRoute>} />
              <Route path="/reports" element={<PrivateRoute><Reports /></PrivateRoute>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
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
