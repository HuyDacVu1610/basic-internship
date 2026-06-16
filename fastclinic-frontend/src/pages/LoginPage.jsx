import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import clinicBg from '../assets/clinic-bg.png';

export const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [tenDangNhap, setTenDangNhap] = useState('');
  const [matKhau, setMatKhau] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showDemo, setShowDemo] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Retrieve origin route if redirected, or default based on role
  const from = location.state?.from?.pathname;

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!tenDangNhap.trim() || !matKhau.trim()) {
      setError('Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu.');
      return;
    }

    setLoading(true);
    setError('');

    const result = await login(tenDangNhap, matKhau);
    setLoading(false);

    if (result.success) {
      // Re-read user role to perform redirect
      const storedUser = JSON.parse(localStorage.getItem('fc_user') || '{}');
      const userRole = storedUser.vai_tro;

      if (from) {
        navigate(from, { replace: true });
      } else {
        // Redirect to default page based on role
        const roleRedirects = {
          ADMIN: '/admin',
          LE_TAN: '/reception',
          BAC_SI: '/doctor',
          DIEU_DUONG: '/nurse',
          THU_NGAN: '/cashier',
          NV_CLS: '/cls'
        };
        navigate(roleRedirects[userRole] || '/', { replace: true });
      }
    } else {
      setError(result.message);
    }
  };

  const handleQuickLogin = (user, pass) => {
    setTenDangNhap(user);
    setMatKhau(pass);
    setError('');
  };

  const demoAccounts = [
    { label: 'Bác sĩ (BAC_SI)', user: 'bsnguyenvana', pass: 'BacSi@123' },
    { label: 'Điều dưỡng (DIEU_DUONG)', user: 'ddinhthib', pass: 'DieuDuong@123' },
    { label: 'Lễ tân (LE_TAN)', user: 'letanhoang', pass: 'LeTan@123' },
    { label: 'Thu ngân (THU_NGAN)', user: 'tnlevanc', pass: 'ThuNgan@123' },
    { label: 'Kỹ thuật viên CLS (NV_CLS)', user: 'clstranvand', pass: 'ClsTran@123' },
    { label: 'Quản trị viên (ADMIN)', user: 'admin', pass: 'Admin@123' },
  ];

  return (
    <div className="min-h-[100dvh] grid grid-cols-1 lg:grid-cols-2 bg-[#F7F6F3] text-slate-800 font-sans">
      
      {/* Left Panel: Clinic Image & Brand Info (Hidden on Mobile) */}
      <div className="hidden lg:flex flex-col justify-between p-16 relative overflow-hidden bg-[#0d3b41]">
        
        {/* Background Image */}
        <img 
          src={clinicBg} 
          alt="FastClinic Counter" 
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0"
        />
        
        {/* Teal Overlay Gradient */}
        <div 
          className="absolute inset-0 pointer-events-none z-10" 
          style={{
            background: 'linear-gradient(135deg, rgba(34, 123, 137, 0.82) 0%, rgba(22, 90, 101, 0.76) 50%, rgba(11, 49, 55, 0.88) 100%)'
          }}
        />

        {/* Brand logo header */}
        <div className="relative z-20 flex items-center space-x-2.5 text-white">
          <div className="bg-white/10 backdrop-blur-md p-2 rounded-xl border border-white/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <span className="text-lg font-bold tracking-tight">FastClinic</span>
        </div>

        {/* Title Content */}
        <div className="relative z-20 my-auto max-w-md">
          <span className="text-[10px] font-extrabold tracking-widest text-teal-300 uppercase block mb-3">OUTPATIENT CARE</span>
          <h1 className="text-[44px] font-serif text-white tracking-tight leading-[1.15] font-medium">
            Your health,<br />
            in expert hands.
          </h1>
          <p className="text-teal-100/80 text-sm leading-relaxed mt-5 max-w-sm">
            Truy cập an toàn dành cho nhân viên y tế tới hồ sơ bệnh nhân, hàng đợi khám bệnh và công cụ lâm sàng — tất cả tại một nơi.
          </p>
        </div>

        {/* Bottom Statistics */}
        <div className="relative z-20 grid grid-cols-3 gap-4 pt-8 border-t border-white/15">
          <div>
            <span className="text-2xl font-bold text-white block tracking-tight">12,400+</span>
            <span className="text-[9px] uppercase tracking-wider text-teal-200/70 block mt-1">Active Patients</span>
          </div>
          <div>
            <span className="text-2xl font-bold text-white block tracking-tight">86</span>
            <span className="text-[9px] uppercase tracking-wider text-teal-200/70 block mt-1">Specialists</span>
          </div>
          <div>
            <span className="text-2xl font-bold text-white block tracking-tight">18</span>
            <span className="text-[9px] uppercase tracking-wider text-teal-200/70 block mt-1">Years of Care</span>
          </div>
        </div>

      </div>

      {/* Right Panel: Login Form Screen */}
      <div className="flex flex-col justify-center items-center px-6 py-12 md:px-16 lg:px-24 bg-[#F7F6F3] min-h-screen relative">
        
        {/* Decorative background grid pattern for depth */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(0,0,0,0.015)_1px,transparent_1px),linear-gradient(to_bottom,rgba(0,0,0,0.015)_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_50%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="w-full max-w-[380px] flex flex-col relative z-10">
          
          {/* Welcome header */}
          <div className="flex flex-col mb-8">
            <h2 className="text-3xl font-serif text-slate-900 tracking-tight">Welcome back</h2>
            <p className="text-xs text-slate-400 mt-2 font-medium">
              Sign in with your staff credentials to access the dashboard.
            </p>
          </div>

          {/* Error Notification */}
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start space-x-2">
              <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="font-semibold leading-relaxed">{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Tên đăng nhập
              </label>
              <input
                type="text"
                value={tenDangNhap}
                onChange={(e) => setTenDangNhap(e.target.value)}
                placeholder="Username"
                className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/10 focus:border-[#0b3c43] text-slate-800 placeholder-slate-400 transition text-sm font-medium"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">
                Mật khẩu
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={matKhau}
                  onChange={(e) => setMatKhau(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-600/10 focus:border-[#0b3c43] text-slate-800 placeholder-slate-400 transition text-sm font-medium"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 transition cursor-pointer"
                >
                  {showPassword ? (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" /></svg>
                  ) : (
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                  )}
                </button>
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-[#0b3c43] hover:bg-[#072c32] text-white font-medium py-2.5 px-4 rounded-lg shadow-sm active:scale-[0.98] transition flex items-center justify-center space-x-2 text-sm disabled:opacity-50 cursor-pointer mt-6"
              disabled={loading}
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <span>Sign in</span>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          {/* Collapsible Demo Accounts selector */}
          <div className="mt-8 pt-6 border-t border-slate-200 w-full">
            <button
              type="button"
              onClick={() => setShowDemo(!showDemo)}
              className="w-full flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 hover:text-slate-600 transition focus:outline-none cursor-pointer"
            >
              <span>Sử dụng tài khoản Demo</span>
              <svg
                className={`w-3.5 h-3.5 transform transition-transform duration-200 ${showDemo ? 'rotate-180' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showDemo && (
              <div className="grid grid-cols-2 gap-2 mt-4 animate-fadeIn">
                {demoAccounts.map((account) => (
                  <button
                    key={account.user}
                    onClick={() => handleQuickLogin(account.user, account.pass)}
                    className="flex flex-col p-2.5 rounded-lg bg-white border border-slate-200 hover:border-slate-350 hover:bg-slate-50 text-left transition group cursor-pointer"
                    type="button"
                  >
                    <span className="text-[10px] font-bold text-slate-750 group-hover:text-slate-900 transition">
                      {account.user}
                    </span>
                    <span className="text-[9px] text-slate-500 truncate mt-0.5">
                      {account.label.split(' (')[0]}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Security & Copyright footer */}
          <div className="mt-12 text-center">
            <span className="text-[10px] text-slate-400 block font-medium">
              Protected by 256-bit encryption · HIPAA compliant
            </span>
            <span className="text-[10px] text-slate-400 block mt-1.5 font-medium">
              © 2026 FastClinic. All rights reserved.
            </span>
          </div>

        </div>
      </div>
      
    </div>
  );
};

export default LoginPage;
