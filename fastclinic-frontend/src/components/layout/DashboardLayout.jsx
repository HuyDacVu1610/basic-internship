import React from 'react';
import { useAuth } from '../../context/AuthContext';

export const DashboardLayout = ({ children, title }) => {
  const { user, logout } = useAuth();

  const roleLabels = {
    ADMIN: 'Quản trị viên',
    LE_TAN: 'Lễ tân phòng khám',
    BAC_SI: 'Bác sĩ lâm sàng',
    DIEU_DUONG: 'Điều dưỡng viên',
    THU_NGAN: 'Thu ngân thanh toán',
    NV_CLS: 'Kỹ thuật viên cận lâm sàng'
  };

  const roleColors = {
    ADMIN: 'bg-amber-50 text-amber-700 border-amber-200',
    LE_TAN: 'bg-blue-50 text-blue-700 border-blue-200',
    BAC_SI: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    DIEU_DUONG: 'bg-pink-50 text-pink-700 border-pink-200',
    THU_NGAN: 'bg-cyan-50 text-cyan-700 border-cyan-200',
    NV_CLS: 'bg-purple-50 text-purple-700 border-purple-200'
  };

  const handleLogout = () => {
    const confirmLogout = window.confirm("Bạn có chắc chắn muốn đăng xuất không?");
    if (confirmLogout) {
      logout();
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="bg-blue-600 text-white p-2 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <span className="text-lg font-bold tracking-tight bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">FastClinic</span>
          </div>

          <div className="flex items-center space-x-4">
            <div className="text-right hidden sm:block">
              <div className="text-xs font-semibold text-slate-400">Đã đăng nhập</div>
              <div className="text-sm font-bold text-slate-800">{user?.ho_ten}</div>
            </div>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${roleColors[user?.vai_tro] || 'bg-slate-100 text-slate-600 border-slate-200'}`}>
              {roleLabels[user?.vai_tro] || user?.vai_tro}
            </span>
            <div className="h-6 w-px bg-slate-200" />
            <button
              onClick={handleLogout}
              className="text-xs font-bold text-slate-600 hover:text-rose-600 px-3 py-1.5 rounded-lg border border-slate-200 hover:border-rose-200 hover:bg-rose-50 transition duration-150"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col">
        {/* Breadcrumbs / Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">{title}</h1>
            <p className="text-xs text-slate-500 mt-1">Phân quyền vai trò: {roleLabels[user?.vai_tro]}</p>
          </div>
          <div className="text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
            Mã nhân viên: <span className="font-mono font-semibold text-slate-700">{user?.ma_nhan_vien}</span>
          </div>
        </div>

        {/* Dashboard Content */}
        <div className="flex-grow bg-white border border-slate-200/80 rounded-2xl p-6 sm:p-8 shadow-sm">
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-slate-100/50 border-t border-slate-200/60 py-4 text-center text-xs text-slate-500">
        <p>&copy; {new Date().getFullYear()} Tất cả quyền được bảo lưu.</p>
      </footer>
    </div>
  );
};
