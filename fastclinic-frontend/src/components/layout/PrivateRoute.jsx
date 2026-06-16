import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export const PrivateRoute = ({ children, allowedRoles }) => {
  const { user, isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="relative flex items-center justify-center">
          <div className="w-16 h-16 border-4 border-t-blue-500 border-r-indigo-500 border-b-purple-500 border-l-slate-800 rounded-full animate-spin"></div>
          <div className="absolute w-8 h-8 bg-slate-950 rounded-full"></div>
        </div>
        <p className="mt-4 text-slate-400 font-medium animate-pulse tracking-wide">
          Đang tải dữ liệu phiên làm việc...
        </p>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page but save the current location they were trying to access
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user?.vai_tro)) {
    // If authenticated but role not allowed, redirect to respective default dashboard
    const roleRedirects = {
      ADMIN: '/admin',
      LE_TAN: '/reception',
      BAC_SI: '/doctor',
      DIEU_DUONG: '/nurse',
      THU_NGAN: '/cashier',
      NV_CLS: '/cls'
    };
    const destination = roleRedirects[user?.vai_tro] || '/';
    return <Navigate to={destination} replace />;
  }

  return children;
};
