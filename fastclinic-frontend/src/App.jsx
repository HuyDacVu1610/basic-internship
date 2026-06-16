import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { PrivateRoute } from './components/layout/PrivateRoute';

// Lazy load route pages to enable route-level code splitting and reduce initial bundle size
const LoginPage = lazy(() => import('./pages/LoginPage').then(m => ({ default: m.LoginPage })));
const QueueDisplay = lazy(() => import('./pages/display/QueueDisplay').then(m => ({ default: m.QueueDisplay })));
const AdminPanel = lazy(() => import('./pages/AdminPanel').then(m => ({ default: m.AdminPanel })));
const ReceptionDashboard = lazy(() => import('./pages/ReceptionDashboard').then(m => ({ default: m.ReceptionDashboard })));
const DoctorDashboard = lazy(() => import('./pages/DoctorDashboard').then(m => ({ default: m.DoctorDashboard })));
const ExaminationPage = lazy(() => import('./pages/ExaminationPage').then(m => ({ default: m.ExaminationPage })));
const NurseDashboard = lazy(() => import('./pages/NurseDashboard').then(m => ({ default: m.NurseDashboard })));
const CashierDashboard = lazy(() => import('./pages/CashierDashboard').then(m => ({ default: m.CashierDashboard })));
const ClsDashboard = lazy(() => import('./pages/ClsDashboard').then(m => ({ default: m.ClsDashboard })));

// Simple loading indicator for Suspense fallback
const PageLoader = () => (
  <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center">
    <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
  </div>
);

// Helper component to redirect authenticated users to their home dashboard
const HomeRedirect = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  const roleRedirects = {
    ADMIN: '/admin',
    LE_TAN: '/reception',
    BAC_SI: '/doctor',
    DIEU_DUONG: '/nurse',
    THU_NGAN: '/cashier',
    NV_CLS: '/cls'
  };

  return <Navigate to={roleRedirects[user?.vai_tro] || '/login'} replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/display" element={<QueueDisplay />} />

          {/* Role-Based Protected Routes */}
          <Route
            path="/admin"
            element={
              <PrivateRoute allowedRoles={['ADMIN']}>
                <AdminPanel />
              </PrivateRoute>
            }
          />
          <Route
            path="/reception"
            element={
              <PrivateRoute allowedRoles={['LE_TAN']}>
                <ReceptionDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/doctor"
            element={
              <PrivateRoute allowedRoles={['BAC_SI']}>
                <DoctorDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/doctor/examine/:maLuotKham"
            element={
              <PrivateRoute allowedRoles={['BAC_SI', 'ADMIN']}>
                <ExaminationPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/nurse"
            element={
              <PrivateRoute allowedRoles={['DIEU_DUONG']}>
                <NurseDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/cashier"
            element={
              <PrivateRoute allowedRoles={['THU_NGAN']}>
                <CashierDashboard />
              </PrivateRoute>
            }
          />
          <Route
            path="/cls"
            element={
              <PrivateRoute allowedRoles={['NV_CLS']}>
                <ClsDashboard />
              </PrivateRoute>
            }
          />

          {/* General Redirect Route */}
          <Route path="/" element={<HomeRedirect />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </Router>
  </AuthProvider>
);
}

export default App;
