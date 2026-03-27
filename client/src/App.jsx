import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './shared/contexts/AuthContext.jsx';
import { DialogProvider } from './shared/contexts/DialogContext.jsx';
import AppLayout from './shared/components/layout/AppLayout.jsx';
import Spinner from './shared/components/ui/Spinner.jsx';
import PageErrorState from './shared/components/ui/PageErrorState.jsx';
import { childrenPropType } from './shared/utils/propTypes.js';
import Login from './features/auth/pages/Login.jsx';
import Register from './features/auth/pages/Register.jsx';
import ForgotPassword from './features/auth/pages/ForgotPassword.jsx';
import ResetPassword from './features/auth/pages/ResetPassword.jsx';
import Privacy from './features/auth/pages/Privacy.jsx';
import Terms from './features/auth/pages/Terms.jsx';
import Profile from './features/auth/pages/Profile.jsx';
import Dashboard from './features/dashboard/pages/Dashboard.jsx';
import Transactions from './features/transactions/pages/Transactions.jsx';
import Accounts from './features/accounts/pages/Accounts.jsx';
import Categories from './features/categories/pages/Categories.jsx';
import Reports from './features/reports/pages/Reports.jsx';
import Balances from './features/reports/pages/Balances.jsx';
import SpendByCategory from './features/reports/pages/SpendByCategory.jsx';
import Frequency from './features/reports/pages/Frequency.jsx';

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
            <Route
              path="/login"
              element={
                <GuestRoute>
                  <Login />
                </GuestRoute>
              }
            />
            <Route
              path="/register"
              element={
                <GuestRoute>
                  <Register />
                </GuestRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <GuestRoute>
                  <ForgotPassword />
                </GuestRoute>
              }
            />
            <Route
              path="/reset-password"
              element={
                <GuestRoute>
                  <ResetPassword />
                </GuestRoute>
              }
            />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Dashboard />
                </PrivateRoute>
              }
            />
            <Route
              path="/transactions"
              element={
                <PrivateRoute>
                  <Transactions />
                </PrivateRoute>
              }
            />
            <Route
              path="/accounts"
              element={
                <PrivateRoute>
                  <Accounts />
                </PrivateRoute>
              }
            />
            <Route
              path="/categories"
              element={
                <PrivateRoute>
                  <Categories />
                </PrivateRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <PrivateRoute>
                  <Reports />
                </PrivateRoute>
              }
            />
            <Route
              path="/reports/balances"
              element={
                <PrivateRoute>
                  <Balances />
                </PrivateRoute>
              }
            />
            <Route
              path="/reports/gastos-por-categoria"
              element={
                <PrivateRoute>
                  <SpendByCategory />
                </PrivateRoute>
              }
            />
            <Route
              path="/reports/frecuencia"
              element={
                <PrivateRoute>
                  <Frequency />
                </PrivateRoute>
              }
            />
            <Route
              path="/profile"
              element={
                <PrivateRoute>
                  <Profile />
                </PrivateRoute>
              }
            />
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
